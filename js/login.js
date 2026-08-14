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
    errorEl.textContent = message;
    errorEl.style.display = "block";
    if (button) { button.disabled = false; button.textContent = "Sign In"; }
  }

  function onAllowList(email) {
    return !!(window.ALLOWED_USERS &&
      window.ALLOWED_USERS.some((u) => String(u).toLowerCase() === email));
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
        await window.SS.access.signIn(email);
        await window.SS.access.track("login", "/login");
      }
    } catch (err) {
      if (err.message === "needs-password") {
        // An account left over from when the PM Hub asked people to invent a
        // password. Nobody should be asked for one here, so this is an admin
        // job, not the reader's problem — and it affects at most seven people.
        localStorage.removeItem("ss_user_session");
        return fail("Your sign-in needs resetting. Ask Jess Swinburne or Victor " +
                    "Elerunndu to remove your account under Authentication → Users; " +
                    "your next sign-in will then just work.");
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

    window.location.replace("../index.html");
  });
})();
