/* ═══════════════════════════════════════════════════════════════════════════
   HUB ACCESS

   Turns "an email in localStorage" into a real database session, so the server
   can decide what this person is allowed to read.

   Why this exists. The hub used to gate on a list of addresses in JavaScript:
   if you were on it, every row of every table arrived in your browser and the
   page chose what to draw. That is fine when everyone is staff. It is not fine
   now that third-party partners have access, because "the page chose not to
   draw it" is undone by opening the network tab.

   So the browser signs in. The person still types nothing but their email —
   the account behind it uses that same address as its password, which is not a
   secret and is not treated as one. What it buys is a token carrying their
   address, which row-level security reads on every query. A partner's request
   for the KPI table now comes back empty from Postgres rather than being
   filtered on arrival.

   Everything below is a convenience over the answer the server already gave:

     SS.access.ready        resolves once the session and role are known
     SS.access.role         'partner' | 'staff' | 'director' | 'admin' | 'none'
     SS.access.isPartner    shorthand — the common branch in the renderers
     SS.access.isStudentServices  inside the organisation: staff, director, admin
     SS.access.canSeePeople whether individuals may be drilled into at all
     SS.access.scope        { department, person } for staff and directors
     SS.access.track(page)  records a page hit

   None of it is a security boundary. The boundary is in Postgres; this only
   avoids drawing doors that would not open.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = (window.SS = window.SS || {});
  const cfg = window.SS_CONFIG || {};
  const SESSION_KEY = "ss_hub_supabase";
  const EMAIL_KEY = "ss_user_session";

  const state = {
    email: null,
    role: "none",
    title: null,          // the job title shown on the account chip
    fullName: null,
    category: null,
    scope: { department: null, person: null },
    session: null,
  };

  function base() { return (cfg.SUPABASE_URL || "").replace(/\/+$/, ""); }
  function headers(extra) {
    return Object.assign({
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: "Bearer " + (state.session ? state.session.access_token : cfg.SUPABASE_ANON_KEY),
      "Content-Type": "application/json",
    }, extra || {});
  }

  function readStored() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function isFresh(s) {
    // A minute of margin, so a request does not expire mid-flight.
    return !!(s && s.expires_at && Date.now() / 1000 < s.expires_at - 60);
  }

  /**
   * Renew a session without asking for anything.
   *
   * Supabase tokens are short-lived, and the seven PM editors are the only
   * people who cannot simply be signed in again silently — their password is
   * their own and the hub has no way to know it. The refresh token is what
   * spares them a prompt on every visit. It is not forever: signing out drops
   * it, and it eventually expires, so the password is asked for again in time.
   */
  async function refresh(s) {
    if (!s || !s.refresh_token) return null;
    const r = await post("/auth/v1/token?grant_type=refresh_token",
                         { refresh_token: s.refresh_token });
    if (!r.ok || !r.body.access_token) return null;
    return store(r.body, s.email);
  }

  function store(s, email) {
    const session = {
      access_token: s.access_token,
      refresh_token: s.refresh_token || null,
      expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600),
      email: email,
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* private mode */ }
    state.session = session;
    return session;
  }

  async function post(path, body) {
    const res = await fetch(base() + path, {
      method: "POST",
      headers: { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
  }

  /**
   * Sign in, creating the account the first time.
   *
   * The address doubles as the password. Anyone provisioned can therefore be
   * signed in without a password to remember, a link to click, or an email that
   * — as the PM Hub work established — would never be delivered to a
   * churchofjesuschrist.org address anyway.
   */
  async function signIn(email, password) {
    // `password` is only supplied by the login form when the first attempt has
    // already told us this person has one of their own.
    const creds = { email: email, password: password || email };
    let r = await post("/auth/v1/token?grant_type=password", creds);
    if (r.ok) return store(r.body, email);

    const why = (r.body.error_description || r.body.msg || r.body.message || "");
    if (!/invalid login credentials/i.test(why)) throw new Error(why || "Could not sign in.");
    if (password) throw new Error("wrong-password");

    const su = await post("/auth/v1/signup", creds);
    if (su.ok && su.body.access_token) return store(su.body, email);

    const suWhy = (su.body.msg || su.body.error_description || su.body.message || "");
    // The database refuses an account for anyone not provisioned; GoTrue reports
    // that as a generic failure, so it is translated here.
    if (/database error saving new user/i.test(suWhy)) {
      throw new Error("not-provisioned");
    }
    if (/already registered/i.test(suWhy)) {
      // They already have an account with a password of their own — every PM
      // editor does, because the PM Hub asks them to choose one. The hub cannot
      // guess it, so the login form asks. This is the only reason anyone on the
      // hub is ever shown a password field.
      throw new Error("needs-password");
    }
    throw new Error(suWhy || "Could not sign in.");
  }

  /**
   * Pick up a session this device already holds, without asking for anything.
   *
   * The idle timeout in auth-guard.js clears the email marker after an hour and
   * sends the person back to the login screen, but the database session itself
   * survives — and while its refresh token lives, they can be let straight back
   * in. That is invisible for almost everyone, because their email doubles as
   * their password and signing in again costs them nothing. The seven PM
   * editors are the exception: their password is their own, so being unable to
   * reuse the session meant a prompt every single time they came back, however
   * recently they had entered it.
   *
   * Returns the session, or null if there is nothing usable — in which case the
   * caller falls back to a real sign-in. An explicit sign-out removes the stored
   * session, so it correctly asks again.
   */
  async function resume(email) {
    const want = String(email || "").trim().toLowerCase();
    const stored = readStored();
    if (!stored || String(stored.email || "").toLowerCase() !== want) return null;
    if (isFresh(stored)) { state.session = stored; return stored; }
    return await refresh(stored);
  }

  async function rpc(fn, args) {
    const res = await fetch(base() + "/rest/v1/rpc/" + fn, {
      method: "POST", headers: headers(), body: JSON.stringify(args || {}),
    });
    if (!res.ok) return null;
    return res.json().catch(() => null);
  }

  async function loadRole() {
    const me = await rpc("hub_me");
    const row = Array.isArray(me) ? me[0] : me;
    if (row && row.role) {
      state.role = row.role;
      state.scope.department = row.scope_department || null;
      state.scope.person = row.scope_person || null;
      state.fullName = row.full_name || null;
      state.category = row.category || null;
    } else {
      state.role = "none";
    }
  }

  /**
   * The person's actual job title, for the account chip.
   *
   * "Full access" and "Partner view" described the permission rather than the
   * person; what belongs beside someone's name is their job — Senior Manager,
   * Director of Student Records, Project Manager. That lives in the directory,
   * not in `hub_access`, so it is read from there.
   *
   * Deliberately off the critical path: this is a label, and nothing waits for
   * it. It is cached because a job title changes about once a year, so the
   * usual visit paints the right text with no request at all.
   */
  const TITLE_KEY = "ss_hub_title";

  function cachedTitle(email) {
    try {
      const c = JSON.parse(localStorage.getItem(TITLE_KEY) || "null");
      return c && c.email === email ? c.title : null;
    } catch { return null; }
  }

  /** Last resort when the directory has no row: read the title off the category. */
  function titleFromCategory(cat) {
    const low = String(cat || "").toLowerCase();
    if (!low || !low.includes("student services")) return null;
    const tail = low.split("student services")[1].replace(/^[\s-]+/, "").trim();
    if (tail === "vp" || tail === "executive pm") return tail === "vp" ? "VP" : "Executive Project Manager";
    if (/\bpm$/.test(tail)) return "Project Manager";
    if (/\bdirector$/.test(tail)) return "Director";
    return null;
  }

  async function loadTitle() {
    // A partner is outside Student Services: no directory row to read, and no
    // permission to read one. The word itself is the whole answer.
    if (state.role === "partner") { state.title = "Partner"; return; }
    if (state.role === "none") return;

    const cached = cachedTitle(state.email);
    if (cached) state.title = cached;

    // `scope_person` was resolved against the directory when access was
    // provisioned, so it matches a real row; `full_name` came from the
    // spreadsheet and can drift. Prefer the resolved one, fall back to the other.
    const names = [state.scope.person, state.fullName]
      .filter(Boolean).filter((n, i, a) => a.indexOf(n) === i);

    for (const name of names) {
      try {
        const res = await fetch(
          base() + "/rest/v1/v_hub_directory?select=role&limit=1&name=eq." + encodeURIComponent(name),
          { headers: headers() });
        if (!res.ok) continue;
        const row = (await res.json())[0];
        if (row && row.role) {
          state.title = row.role;
          try { localStorage.setItem(TITLE_KEY, JSON.stringify({ email: state.email, title: row.role })); }
          catch { /* private mode */ }
          return;
        }
      } catch { /* offline — the cached title, if any, still stands */ }
    }
    if (!state.title) state.title = titleFromCategory(state.category);
  }

  /** Record a page hit. Never allowed to break the page it is measuring. */
  /** The path a page is counted under, normalised to end in a slash. */
  function pageKey() {
    let p = location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    if (!p.endsWith("/")) p += "/";
    return p || "/";
  }

  function track(event, page) {
    if (!state.session) return Promise.resolve();
    return rpc("hub_track", {
      p_event: event || "page",
      // One key per page whether the URL carries index.html, a trailing slash or
      // neither, so turning on cleanUrls does not split a page's history in two.
      p_page: page || pageKey(),
      p_referrer: document.referrer || null,
      p_agent: navigator.userAgent || null,
    }).catch(() => null);
  }

  // Resolves as soon as a token exists — before the role is known.
  //
  // Fetching data needs the session; it does not need the role. Waiting for
  // both put `hub_me` on the critical path ahead of every query, so the
  // directory sat empty for about 1.7 seconds while two round trips completed
  // one after the other. They now overlap.
  let sessionResolve;
  const sessionReady = new Promise((r) => { sessionResolve = r; });

  // Separate from `ready` on purpose: the scorecard and the scoping layer wait
  // on `ready`, and a cosmetic label must not hold them up.
  let profileResolve;
  const profileReady = new Promise((r) => { profileResolve = r; });

  const ready = (async function start() {
    const email = (localStorage.getItem(EMAIL_KEY) || "").trim().toLowerCase();
    if (!email || !cfg.isConfigured) { sessionResolve(state); profileResolve(state); return state; }
    state.email = email;
    // Painted before any request goes out, so a returning visitor never sees
    // the line fill in. Refreshed below in case the title has since changed.
    state.title = cachedTitle(email);

    const stored = readStored();
    if (stored && stored.email === email && isFresh(stored)) {
      state.session = stored;
    } else if (stored && stored.email === email && await refresh(stored)) {
      // Renewed silently — nobody is asked for anything.
    } else {
      try { await signIn(email); }
      catch (err) {
        console.warn("[hub-access]", err.message);
        // Someone with a password of their own cannot be signed in silently,
        // and without a session every page reads as empty — which looks like
        // the site is broken rather than like they need to sign in again. Send
        // them back to the login screen, which knows how to ask.
        // Matches /login/, /login/index.html and a bare /login. The last one is
        // what Vercel serves once cleanUrls is on, and a pattern that insisted on
        // the trailing slash would decide the login page was not the login page —
        // and bounce it to itself, forever.
        if (err.message === "needs-password" && !/\/login(\/|$)/.test(location.pathname)) {
          const back = location.pathname.replace(/^\//, "");
          const up = back.split("/").length > 1 ? "../" : "";
          localStorage.removeItem(EMAIL_KEY);
          location.replace(up + "login/index.html?again=1");
          profileResolve(state);
          return state;
        }
        return state;
      }
    }
    sessionResolve(state);        // data fetching may begin now
    await loadRole();
    loadTitle().catch(() => {}).then(() => profileResolve(state));
    track("page");
    return state;
  })();

  SS.access = {
    ready,
    sessionReady,
    profileReady,
    signIn,
    resume,
    track,
    /** Department names, blurbs and headcounts — counts only, never a name. */
    rpcSummary: () => rpc("hub_department_summary"),
    /** Anonymised health rows for branches this reader cannot open. */
    rpcRollup: () => rpc("hub_scorecard_rollup"),
    get email() { return state.email; },
    get role() { return state.role; },
    /** Job title for display — "Partner" for anyone outside Student Services. */
    get title() { return state.title; },
    get scope() { return state.scope; },
    get session() { return state.session; },
    get isPartner() { return state.role === "partner"; },
    get isAdmin() { return state.role === "admin"; },
    /** May this person open an individual, rather than only a rolled-up figure? */
    get canSeePeople() { return ["staff", "director", "admin"].indexOf(state.role) !== -1; },
    /** May this person read the directory listing? */
    get canSeeDirectory() { return ["staff", "director", "admin"].indexOf(state.role) !== -1; },
    /**
     * Is this person inside Student Services?
     *
     * The same three roles, named for what they mean rather than for what they
     * may do, because some things — the emerging issues register — are gated on
     * belonging rather than on a permission. Deliberately an allowlist: asking
     * "is this a partner?" answers no for a role of "none" as well, and would
     * let an unprovisioned session through a check meant to keep it out.
     */
    get isStudentServices() { return ["staff", "director", "admin"].indexOf(state.role) !== -1; },
    headers,
  };
})();
