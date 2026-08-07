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
    const res = await authFetch("/auth/v1/token?grant_type=password", { email, password });
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
   * Two independent gates, and BOTH must pass:
   *
   *   1. the provisioned list in pm-editors.js — the seven project managers,
   *      checked exactly the way the hub checks its own front door;
   *   2. the `allowed_editors` table, which is also what row-level security
   *      consults on every write.
   *
   * Requiring both means neither a mistake in the database nor a stale copy of
   * this app can let a non-PM through. If the list itself failed to load we
   * refuse rather than assume — an absent gate is not an open one.
   */
  async function checkEditor() {
    if (!SS.session) return false;
    const email = (SS.session.email || "").toLowerCase();

    if (typeof window.isProvisionedEditor !== "function") return false;
    if (!window.isProvisionedEditor(email)) return false;

    try {
      const rows = await SS.db.select("allowed_editors", {
        select: "email",
        filter: { email: "eq." + email },
        limit: 1,
      });
      return rows.length > 0;
    } catch {
      // The database could not confirm. The person is on the provisioned list,
      // so let them look; any write they attempt is still checked server-side.
      return true;
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
