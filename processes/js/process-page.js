/* ═══════════════════════════════════════════════════════════════════════════
   PAGE SHELL — the states process-list.js and process-review.js don't own:
   loading, a plain error, and "you don't currently have access".
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const PROC = window.PROC;

  function render() {
    const loading = document.getElementById("procLoading");
    const noAccess = document.getElementById("procNoAccess");
    const errorBox = document.getElementById("procError");

    loading.hidden = true;

    if (PROC.error === "not-signed-in") {
      // auth-guard.js already redirects an unsigned visitor to the login page
      // before this ever runs; this is only the brief window before it does.
      return;
    }
    if (PROC.error) {
      errorBox.hidden = false;
      errorBox.textContent = "Couldn't load process documentation: " + PROC.error;
      noAccess.hidden = true;
      return;
    }
    errorBox.hidden = true;

    if (!PROC.isSteward && !PROC.isReviewer) {
      noAccess.hidden = false;
      return;
    }
    noAccess.hidden = true;
  }

  /* ── the wall ─────────────────────────────────────────────────────────
     Outside Student Services this page is not shown at all — not the hero, not
     the empty table, not the "no access" banner. A partner reaching the URL
     gets told plainly.

     Gated on belonging (staff, director, admin), not on being a steward: a
     Student Services person who documents no processes still belongs here and
     gets the page with the banner. A partner does not.

     Waited for, never read early: at this point the role is still "none", and
     asking now would answer "not in Student Services" for everybody and wall
     the whole organisation out. Failing to resolve leaves the page as it is,
     which row-level security keeps empty anyway. */
  function applyGate() {
    var gate = document.getElementById("procGate");
    var main = document.getElementById("procMain");
    if (!gate || !main || !window.SS || !SS.access) return;
    Promise.resolve(SS.access.ready).then(function () {
      if (SS.access.isStudentServices) return;
      gate.hidden = false;
      main.hidden = true;
    })["catch"](function () { /* leave it be */ });
  }

  applyGate();
  document.addEventListener("proc:data", render);
  PROC.ready.then(render);
})();
