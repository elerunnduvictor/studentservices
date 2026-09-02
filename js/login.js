/* ═══════════════════════════════════════════════════════════════════════════
   HUB SIGN-IN

   Still one field: type your work email. What changed is what happens behind
   it — the address is now signed in to the database, so the server knows who is
   asking and returns only the rows that person may see.

   Who may sign in is decided by the database — `hub_access` plus the signup
   trigger. Nothing else, now.

   There used to be a second answer: js/allowed-users.js, a shipped list of 258
   addresses, consulted when the sign-in call could not be completed so that an
   outage did not lock out the organisation. Two things killed it.

   It was a public file on a public site — every work email address in Student
   Services, fetchable by anyone who guessed the path, which is a spam and
   phishing list handed over for free.

   And it had stopped buying anything. It admitted people as readers with no
   role, which was worth something when the hub still served rows to a caller
   with no session. Since supabase/rls-lockdown.sql it is worth nothing: every
   dataset refuses a request without one, so that branch let people in to a hub
   with no data in it.

   So the database is asked, and if it cannot be reached, sign-in fails and says
   so. A door that opens onto an empty room is not kinder than a locked one.
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
        // A cookie left by whoever used this browser last would still
        // satisfy the gate, so a refused sign-in drops it too.
        try { window.SS_CONFIG.clearSessionCookie(); } catch (e) { /* no cookies */ }
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
        // A cookie left by whoever used this browser last would still
        // satisfy the gate, so a refused sign-in drops it too.
        try { window.SS_CONFIG.clearSessionCookie(); } catch (e) { /* no cookies */ }
        return fail(DENIED);
      }
      /* Reaching here means the database could not be asked, not that it
         refused — a refusal is "not-provisioned" above.

         This used to fail open: anyone on the shipped allow-list was let in as
         a reader with no role. That made sense while the hub still answered a
         caller with no session, and it stopped making sense the moment it
         didn't. Every dataset now refuses a request without one, so the branch
         admitted people to a hub with nothing in it — and the price was
         publishing all 258 addresses to anyone who asked for the file.

         Failing closed costs nothing it did not already cost: without the
         database there is no data to read, whichever side of the door you are
         on. Say so plainly rather than opening an empty room. */
      console.warn("[login] sign-in could not be completed:", err.message);
      localStorage.removeItem("ss_user_session");
        // A cookie left by whoever used this browser last would still
        // satisfy the gate, so a refused sign-in drops it too.
        try { window.SS_CONFIG.clearSessionCookie(); } catch (e) { /* no cookies */ }
      return fail(
        "Could not reach the sign-in service. Check your connection and try " +
        "again — if it keeps failing, the database may be down.");
    }

    window.location.replace("/index.html");
  });
})();
