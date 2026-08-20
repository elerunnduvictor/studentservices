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

  document.addEventListener("proc:data", render);
  PROC.ready.then(render);
})();
