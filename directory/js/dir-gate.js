/* ═══════════════════════════════════════════════════════════════════════════
   ACCESS GATE — the directory wall, for anyone outside Student Services

   Mirrors processes/js/process-page.js's applyGate() exactly. Loaded and run
   directly (not via hub-boot's data-then), so it can hide the page before
   directory/js/directory.js even asks for a row — a partner is refused every
   one of them by row-level security on employees/student_employees anyway,
   but there is no reason to run that query, or to let a bare empty table
   render for a moment, when the answer is already known from the role alone.

   Not a security boundary. Row-level security is what actually keeps the
   page empty for anyone who opens the URL directly; this only avoids
   drawing a door that leads to an empty room.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function applyGate() {
    var gate = document.getElementById("dirGate");
    var main = document.getElementById("dirMain");
    if (!gate || !main || !window.SS || !SS.access) return;
    Promise.resolve(SS.access.ready).then(function () {
      if (SS.access.canSeeDirectory) return;
      gate.hidden = false;
      main.hidden = true;
    })["catch"](function () { /* leave it be */ });
  }

  applyGate();
})();
