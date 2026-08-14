/* ═══════════════════════════════════════════════════════════════════════════
   HUB SIGN-IN

   Still one field: type your work email. What changed is what happens behind
   it — the address is now signed in to the database, so the server knows who is
   asking and returns only the rows that person may see.

   The local allow-list is checked first, because it gives an instant answer and
   the wording people already know. It is a courtesy, not the gate: the database
   refuses an account for anyone not provisioned, and refuses the rows too.
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
    errorEl.textContent = message;
    errorEl.style.display = "block";
    if (button) { button.disabled = false; button.textContent = "Sign In"; }
  }

  function onAllowList(email) {
    return !!(window.ALLOWED_USERS &&
      window.ALLOWED_USERS.some((u) => String(u).toLowerCase() === email));
  }

  /* Shown only on demand — see the catch below. */
  let passwordField = null;
  function revealPassword(message) {
    if (!passwordField) {
      const wrap = document.createElement("div");
      wrap.className = "field";
      wrap.innerHTML =
        '<label class="sr-only" for="hubPassword">Password</label>' +
        '<input type="password" id="hubPassword" autocomplete="current-password" ' +
        'placeholder="Your PM Hub password">';
      input.parentNode.after(wrap);
      passwordField = wrap.querySelector("input");
    }
    passwordField.focus();
    fail(message);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorEl.style.display = "none";
    const email = input.value.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("Please enter a valid email address.");
    }
    if (!onAllowList(email)) return fail(DENIED);

    if (button) { button.disabled = true; button.textContent = "Signing in…"; }

    // The email is stored before the sign-in call because hub-access reads it
    // from there, and because a database that is briefly unreachable should not
    // lock out someone who is genuinely on the list.
    localStorage.setItem("ss_user_session", email);
    localStorage.setItem("ss_last_activity", Date.now());

    try {
      if (window.SS && window.SS.access && window.SS_CONFIG && window.SS_CONFIG.isConfigured) {
        await window.SS.access.signIn(email, passwordField ? passwordField.value : null);
        await window.SS.access.track("login", "/login");
      }
    } catch (err) {
      if (err.message === "needs-password" || err.message === "wrong-password") {
        // Only people who set a password in the PM Hub ever reach this. The
        // field appears rather than being on the form from the start, so the
        // 250-odd people who do not have one are never asked for one.
        localStorage.removeItem("ss_user_session");
        revealPassword(err.message === "wrong-password"
          ? "That password was not right. Try again."
          : "You have set a password for the PM Hub — please enter it.");
        return;
      }
      // Deliberately fail open.
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
      console.warn("[login] continuing without a database session:", err.message);
    }

    window.location.replace("../index.html");
  });
})();
