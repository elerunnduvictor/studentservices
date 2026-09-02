/* ═══════════════════════════════════════════════════════════════════════════
   SHELL — chrome, theme, toasts, and the session guard

   Auth is ordinary Supabase email and password. A PM sets their own password on
   first use; nothing is ever emailed, because Supabase's built-in mailer only
   delivers to organisation members and churchofjesuschrist.org filters unknown
   senders — a flow that depended on delivery would strand all seven of them.

   Who may *write* is not decided here. The database decides, via the
   `allowed_editors` table and the RLS policies. This file only makes the rule
   visible early, so someone who isn't an editor is told on arrival instead of
   after typing into a grid.

   ── NAMING THESE PAGES ────────────────────────────────────────────────────
   The PM Hub answers on its own host and reaches these files through a rewrite
   in vercel.json: /:path* -> /pm/:path*. Vercel checks the filesystem BEFORE it
   applies a rewrite, so any page here whose name also exists at the repo root
   is shadowed by the root one and never reached.

   That is not hypothetical. pm/directory.html was reached at /directory, which
   collides with the hub's own directory/ folder; once clean URLs were switched
   on, a signed-in PM clicking "Directory" was served the hub's directory page,
   which has its own auth guard and bounced them to the hub's sign-in screen.
   The file is now workforce.html and the tab still reads "Directory".

   So: before adding a page here, check the repo root for a folder or .html of
   the same name. Currently taken — css, departments, directory, docs,
   emerging-issues, js, login, okr-progress, org-chart, performance-standards,
   photos, processes, scorecard, shared, supabase.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = (window.SS = window.SS || {});
  const cfg = window.SS_CONFIG || {};
  const SESSION_KEY = "ss_pm_session";

  /* ── toasts ────────────────────────────────────────────────────────────── */
  function toast(title, body, kind) {
    let host = document.querySelector(".toasts");
    if (!host) {
      host = document.createElement("div");
      host.className = "toasts";
      document.body.append(host);
    }
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.innerHTML =
      `<div><div class="t-title"></div>${body ? '<div class="t-body"></div>' : ""}</div>`;
    el.querySelector(".t-title").textContent = title;
    if (body) el.querySelector(".t-body").textContent = body;
    host.append(el);
    setTimeout(() => {
      el.style.transition = "opacity .25s, transform .25s";
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      setTimeout(() => el.remove(), 260);
    }, kind === "err" ? 7000 : 3200);
    return el;
  }

  /* ── theme ─────────────────────────────────────────────────────────────── */
  function initTheme() {
    const saved = localStorage.getItem("ss-theme");
    if (saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#themeToggle")) return;
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
      localStorage.setItem("ss-theme", dark ? "light" : "dark");
    });
  }

  /* ── session ───────────────────────────────────────────────────────────── */
  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.expires_at && Date.now() / 1000 > s.expires_at) return null;
      return s;
    } catch { return null; }
  }

  function saveSession(s) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    SS.session = s;
  }

  /* ── staying signed in, and knowing when not to ───────────────────────────
     The PM Hub used to notice an expired session only at page load. A tab left
     open overnight still showed the console, and the only way to find out was
     to refresh — the Student Services hub catches it because js/auth-guard.js
     re-checks on a timer and whenever the tab is looked at again. The same two
     checks are added here.

     While fixing that, a second problem: the session carried a refresh token
     and never used one, so it died on a wall clock roughly an hour after
     sign-in whether or not anyone was working. A PM typing into a grid would be
     thrown out mid-edit. So the rule is now the hub's rule — sixty minutes of
     *inactivity* — and an active session renews itself quietly instead. */
  const ACTIVITY_KEY = "ss_pm_last_activity";
  const IDLE_MS = 60 * 60 * 1000;
  const RENEW_MARGIN = 5 * 60;            // seconds before expiry to renew

  function touch() {
    if (document.hidden) return;
    try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())); } catch { /* private mode */ }
  }

  function idleFor() {
    const last = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
    return last ? Date.now() - last : 0;
  }

  /** Renew silently with the stored refresh token. Null if it cannot be done. */
  async function renewSession(s) {
    if (!s || !s.refresh_token || !cfg.isConfigured) return null;
    try {
      const res = await fetch(
        cfg.SUPABASE_URL.replace(/\/+$/, "") + "/auth/v1/token?grant_type=refresh_token",
        { method: "POST",
          headers: { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (!res.ok) return null;
      const d = await res.json();
      if (!d.access_token) return null;
      return storeSession(d, s.email);
    } catch { return null; }
  }

  let guarding = false;
  async function guardSession() {
    if (guarding) return;                 // the timer and the tab can fire together
    guarding = true;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return signOut();

      if (idleFor() > IDLE_MS) {
        // Away too long. Staged edits cannot be saved with a dead session, so
        // the unload prompt is cleared rather than left to ambush whoever
        // comes back to the tab.
        window.onbeforeunload = null;
        localStorage.removeItem(SESSION_KEY);
        SS.session = null;
        location.replace("signin.html?expired=1");
        return;
      }

      let s;
      try { s = JSON.parse(raw); } catch { return signOut(); }
      const secondsLeft = (s.expires_at || 0) - Date.now() / 1000;
      if (secondsLeft > RENEW_MARGIN) { SS.session = s; return; }

      // Still here and still working: renew rather than interrupt.
      const fresh = await renewSession(s);
      if (!fresh) {
        window.onbeforeunload = null;
        localStorage.removeItem(SESSION_KEY);
        SS.session = null;
        location.replace("signin.html?expired=1");
      }
    } finally { guarding = false; }
  }

  function watchSession() {
    if (watchSession.on) return;
    watchSession.on = true;
    touch();
    ["mousemove", "keydown", "click", "scroll"].forEach((e) =>
      window.addEventListener(e, touch, { passive: true }));
    // The timer covers a tab left in the foreground; the visibility check
    // covers one that was in the background, where timers are throttled or
    // stopped altogether.
    setInterval(() => { if (!document.hidden) guardSession(); }, 5000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) guardSession();
    });
    window.addEventListener("focus", guardSession);
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    SS.session = null;
    location.href = "signin.html";
  }

  /** Drop the session without navigating — used when refusing a non-editor. */
  function signOutQuietly() {
    localStorage.removeItem(SESSION_KEY);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function decodeJwt(token) {
    try {
      const body = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(body))));
    } catch { return null; }
  }

  /**
   * Ordinary email-and-password sign-in.
   *
   * Why a real account rather than a client-side check of the address: the PM
   * Hub *writes*, and Postgres will not accept a write carrying only the anon
   * key — row-level security refuses it outright. The browser has to end up
   * holding a genuine token whose email claim RLS can read, or every Save would
   * fail. So the sign-in is real even though the list of who may use it is
   * fixed.
   *
   * Nothing is emailed at any point. That is deliberate: Supabase's built-in
   * mailer only delivers to organisation members, and churchofjesuschrist.org
   * filters unknown senders, so anything depending on delivery would strand all
   * seven PMs.
   */
  async function signIn(email, password) {
    // A blank password means "use my email", which is what the hub does and
    // what everyone signing in here now gets by default. Choosing a password
    // remains possible; it is simply no longer required, so that one person is
    // never asked for one on one site and not the other.
    const res = await authFetch("/auth/v1/token?grant_type=password",
                                { email, password: password || email });
    if (!res.ok) {
      const detail = (res.body.error_description || res.body.msg || res.body.message || "");
      if (/invalid login credentials/i.test(detail)) {
        throw new Error("That email and password do not match. If you have not set a " +
                        "password yet, choose \"First time here?\" below.");
      }
      throw new Error(detail || "Could not sign you in.");
    }
    return storeSession(res.body, email);
  }

  /**
   * First-time setup: the PM chooses their own password.
   *
   * Requires "Confirm email" to be off in Supabase, which is what makes signup
   * return a session immediately instead of posting a confirmation link that
   * would never arrive. Anyone may call this endpoint, but that buys nothing on
   * its own — `allowed_editors` still gates every write.
   */
  async function createAccount(email, password) {
    const res = await authFetch("/auth/v1/signup", { email, password });

    if (!res.ok) {
      const why = (res.body.msg || res.body.error_description || res.body.message || "");
      if (/already( been)? registered/i.test(why)) {
        throw new Error("An account already exists for this address. Sign in with your " +
                        "password, or ask for it to be removed under Authentication → " +
                        "Users in Supabase if you need to start over.");
      }
      // The database refuses to create an account for anyone outside
      // `allowed_editors`. GoTrue does not pass the trigger's own message
      // through — it reports "Database error saving new user" whatever the
      // cause — so it is translated here. Without this a PM who is in
      // pm-editors.js but missing from the table would be told nothing useful.
      if (/database error saving new user/i.test(why)) {
        throw new Error("This address is not provisioned in the database yet. Ask for it " +
                        "to be added to allowed_editors — being listed in the app is not " +
                        "enough on its own.");
      }
      if (/password/i.test(why)) throw new Error(why);
      throw new Error(why || "Could not create your account.");
    }

    // Signup succeeded but returned no session: "Confirm email" is still on, so
    // Supabase has queued a confirmation link that will not be delivered.
    if (!res.body.access_token) {
      throw new Error("Your account was created but is waiting on email confirmation. " +
                      "Turn off Authentication → Sign In / Providers → Email → " +
                      "\"Confirm email\" in Supabase, then sign in.");
    }
    return storeSession(res.body, email);
  }

  /** POST to a GoTrue endpoint and hand back status and parsed body together. */
  async function authFetch(path, payload) {
    const res = await fetch(cfg.SUPABASE_URL.replace(/\/+$/, "") + path, {
      method: "POST",
      headers: { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
  }

  /** Normalise an auth response into the session shape the PM Hub stores. */
  function storeSession(d, email) {
    const session = {
      access_token: d.access_token,
      refresh_token: d.refresh_token || null,
      expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
      email: decodeJwt(d.access_token)?.email || email,
    };
    saveSession(session);
    return session;
  }

  /**
   * Is this signed-in person allowed to edit?
   *
   * The `allowed_editors` table decides, because it is what row-level security
   * consults on every write. Agreeing with it here means the UI shows what the
   * database will actually accept.
   *
   * There used to be a second gate in front of it: a shipped list of the seven
   * provisioned addresses in pm/js/pm-editors.js, on the grounds that requiring
   * both meant neither a database mistake nor a stale copy of this app could
   * let a non-PM through. Half of that was true. A stale copy of the app cannot
   * grant anything — RLS refuses the write regardless — so the list gated the
   * UI, never the data. And it was a public file: seven work email addresses
   * served to anyone who guessed the path. It has moved to
   * supabase/pm-editors.js, which is not deployed, and is now a build-time
   * input for import_sheets.py alone.
   *
   * The catch used to return true — the person was on the list, so let them
   * look. With no list to have passed, that would let anyone look, so it
   * refuses instead. They see the read-only view until the database answers,
   * which is the same thing a failed write would have told them.
   */
  async function checkEditor() {
    if (!SS.session) return false;
    const email = (SS.session.email || "").toLowerCase();
    if (!email) return false;

    try {
      const rows = await SS.db.select("allowed_editors", {
        select: "email",
        filter: { email: "eq." + email },
        limit: 1,
      });
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  /* ── page chrome ───────────────────────────────────────────────────────── */
  function renderChrome(book) {
    const topbar = document.querySelector(".topbar");
    if (topbar) {
      const email = SS.session?.email || "";
      const initials = email
        ? email.split("@")[0].split(/[.\-_]/).slice(0, 2).map((s) => s[0]).join("").toUpperCase()
        : "?";
      topbar.querySelector(".topbar-user").innerHTML =
        `<div class="avatar">${initials}</div><span>${email}</span>` +
        `<button class="btn btn-icon" id="themeToggle" title="Toggle theme" aria-label="Toggle theme">` +
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">` +
        `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>` +
        `<button class="btn" id="signOut">Sign out</button>`;
      topbar.querySelector("#signOut").addEventListener("click", signOut);
    }
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("is-active", t.dataset.book === book);
    });
  }

  /** Guard a workbook page: require config, a session, and editor rights. */
  async function requireEditor(book) {
    initTheme();
    SS.session = readSession();

    if (!cfg.isConfigured) {
      showSetupNotice();
      return false;
    }
    if (!SS.session) {
      location.href = "signin.html?next=" + encodeURIComponent(location.pathname.split("/").pop());
      return false;
    }
    renderChrome(book);
    watchSession();
    const ok = await checkEditor();
    if (!ok) {
      // Same refusal the hub gives, and the session is dropped so a refresh
      // doesn't leave a non-editor sitting on a workbook page.
      signOutQuietly();
      document.querySelector("main").innerHTML =
        `<div class="empty-state"><div>` +
        `<h2 style="font-family:var(--serif);font-size:1.4rem;margin-bottom:8px">Access denied</h2>` +
        `<p style="max-width:46ch;margin:0 auto 16px"><strong>${escapeHtml(SS.session.email || "")}</strong> ` +
        `is not provisioned to edit. Editing is limited to the departmental project managers.</p>` +
        `<p style="max-width:46ch;margin:0 auto 20px">Contact Ben Packer and Jess Swinburne ` +
        `for Provisioning Access.</p>` +
        `<a class="btn" href="signin.html">Back to sign in</a></div></div>`;
      return false;
    }
    return true;
  }

  function showSetupNotice() {
    const main = document.querySelector("main") || document.body;
    main.innerHTML = `
      <div class="setup-notice">
        <h2>Connect the database first</h2>
        <p>The PM Hub has no Supabase project to talk to yet. Two values turn it on:</p>
        <ol>
          <li>Create a project at <code>supabase.com</code>.</li>
          <li>Run <code>supabase/schema.sql</code>, then <code>supabase/seed.sql</code>
              in the SQL editor.</li>
          <li>Copy the Project URL and the <em>anon / public</em> key from
              Project Settings → API into <code>shared/js/config.js</code>.</li>
        </ol>
        <p style="margin-bottom:0">The hub reads the same two values, so filling them in
        once connects both apps.</p>
      </div>`;
  }

  SS.shell = {
    toast, initTheme, readSession, saveSession, signOut,
    signIn, createAccount, checkEditor,
    requireEditor, renderChrome, showSetupNotice, decodeJwt,
  };
})();
