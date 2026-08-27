/* ═══════════════════════════════════════════════════════════════════════════
   THE "MORE TOOLS" MENU

   Reset Zoom, Expand All, Collapse All and Print — used less often than the
   zoom buttons beside them, so they moved out of the toolbar row and into
   here. This file only opens and closes the panel; the buttons inside it
   keep the exact ids org-chart/js/toolbar.js and zoom.js already bind their
   click handlers to, so what happens when one is pressed hasn't changed.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function start() {
    var btn = document.getElementById("toolMenuBtn");
    var panel = document.getElementById("toolMenuPanel");
    if (!btn || !panel) return;

    function close() {
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !panel.hidden;
      panel.hidden = open;
      btn.setAttribute("aria-expanded", String(!open));
    });

    // A click anywhere else closes it — but not one inside the panel itself,
    // which would swallow the item's own click (Print, Expand All, ...)
    // before it fired.
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !e.target.closest("#toolMenu")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) close();
    });

    // Picking an item closes the menu after it acts, rather than leaving it
    // open over whatever just happened (the chart mid-collapse, a print
    // dialog about to appear).
    panel.addEventListener("click", function (e) {
      if (e.target.closest(".tool-menu-item")) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
