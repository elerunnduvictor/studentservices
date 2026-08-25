/* ═══════════════════════════════════════════════════════════════════════════
   HUB SIGN-IN

   Still one field: type your work email. What changed is what happens behind
   it — the address is now signed in to the database, so the server knows who is
   asking and returns only the rows that person may see.

   Who may sign in is decided by the database — `hub_access` plus the signup
   trigger — not by the list in js/allowed-users.js. That list drifted 75 names
   behind the moment access moved into Postgres, and every one of those people
   was refused at the door by a file nobody had thought to update.

   It survives as a fallback for one case only: the database being unreachable.
   Then it is better to admit the people it does know than to lock out the whole
   organisation over an outage.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const form = document.getElementById("loginForm");
  const input = document.getElementById("emailInput");
  const errorEl = document.getElementById("errorMsg");
  const button = form ? form.querySelector('button[type="submit"], input[type="submit"]') : null;
  const DENIED =
    "Access denied. Your email is not provisioned. " +
    "Contact Ben Packer and Jess Swinburne for Provisioning Access.";

  function fail(message) {
    errorEl.classList.remove("is-info");
    errorEl.textContent = message;
    errorEl.style.display = "block";
    if (button) { button.disabled = false; button.textContent = "Sign In"; }
  }

  function onAllowList(email) {
    return !!(window.ALLOWED_USERS &&
      window.ALLOWED_USERS.some((u) => String(u).toLowerCase() === email));
  }

  /**
   * Shown to seven people, once.
   *
   * The PM editors chose their own password in the PM Hub, and that password is
   * theirs — it is not being reset or copied. The two sites are separate
   * domains, so a session cannot be carried between them, and the hub has no
   * way to derive a password somebody invented. Asking once is the only honest
   * option left; the refresh token then keeps them signed in, so this should
   * not appear a second time.
   *
   * The other 250-odd people never see this field at all.
   */
  let passwordField = null;
  function revealPassword(message) {
    if (!passwordField) {
      // Built to match the email field exactly — a bare input after its own
      // screen-reader label, which is how this form is written. Wrapping it in
      // a div the stylesheet has never heard of is what made it look bolted on.
      const label = document.createElement("label");
      label.className = "sr-only";
      label.setAttribute("for", "hubPassword");
      label.textContent = "PM Hub password";

      passwordField = document.createElement("input");
      passwordField.type = "password";
      passwordField.id = "hubPassword";
      passwordField.autocomplete = "current-password";
      passwordField.placeholder = "Your PM Hub password";
      passwordField.required = true;

      input.after(label, passwordField);
      input.setAttribute("readonly", "readonly");   // the address is settled
    }
    passwordField.value = "";
    passwordField.focus();
    if (button) button.textContent = "Sign In";
    show(message);
  }

  /* A step in the flow, not a failure — so it does not arrive in red. */
  function show(message) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
    errorEl.classList.add("is-info");
    if (button) { button.disabled = false; }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorEl.style.display = "none";
    const email = input.value.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("Please enter a valid email address.");
    }
    if (button) { button.disabled = true; button.textContent = "Signing in…"; }

    // The email is stored before the sign-in call because hub-access reads it
    // from there, and because a database that is briefly unreachable should not
    // lock out someone who is genuinely on the list.
    localStorage.setItem("ss_user_session", email);
    localStorage.setItem("ss_last_activity", Date.now());

    try {
      if (window.SS && window.SS.access && window.SS_CONFIG && window.SS_CONFIG.isConfigured) {
        const typed = passwordField ? passwordField.value : null;
        // A session this device still holds is enough. Without this the hour-long
        // idle timeout sent everyone back here, and a PM editor — whose password
        // is their own rather than their email — was asked for it on every
        // return, however recently they had entered it.
        const resumed = typed ? null : await window.SS.access.resume(email);
        if (!resumed) {
          await window.SS.access.signIn(email, typed);
        }
        await window.SS.access.track("login", "/login");
      }
    } catch (err) {
      if (err.message === "needs-password" || err.message === "wrong-password") {
        localStorage.removeItem("ss_user_session");
        return revealPassword(err.message === "wrong-password"
          ? "That password was not right — it is the one you set for the PM Hub."
          // No promise about how often this appears. Signing out, a new device
          // or browser, and an expired session all bring it back, so claiming
          // otherwise just made the message look wrong the second time.
          : "Enter the password you set for the PM Hub.");
      }
      if (err.message === "not-provisioned") {
        // The database is the authority on who may be here, and it has said no.
        localStorage.removeItem("ss_user_session");
        return fail(DENIED);
      }
      // Deliberately fail open — but only when the database could not answer.
      //
      // The allow-list above has already said this person may be here. If the
      // database sign-in cannot be completed — the access tables not yet
      // created, an account left over from an earlier scheme, the project
      // asleep, no network — the right outcome is a reader with no role, who
      // sees whatever is public, not a locked door.
      //
      // Failing closed here would have been severe: until access-control.sql is
      // applied, the signup trigger admits only the seven PM editors, so every
      // other person on the hub would have been refused entry by a change that
      // was supposed to be invisible to them.
      // Reaching here means the database could not be asked, not that it
      // refused. Fall back to the shipped list so an outage does not lock out
      // the whole organisation — and refuse anyone not on it either.
      console.warn("[login] continuing without a database session:", err.message);
      if (!onAllowList(email)) {
        localStorage.removeItem("ss_user_session");
        return fail(DENIED);
      }
    }

    window.location.replace("/index.html");
  });
})();
