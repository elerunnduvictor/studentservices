/* ═══════════════════════════════════════════════════════════════════════════
   THE HOME PAGE — BOTTOM MENU GATE

   The four cards at the top (Organization, Project Inventory, KPIs, OKRs) are
   plain links now. They used to open in place with a preview of each page —
   an org tree, KPI charts, OKR bars — drawn here through shared/js/gw-tiles.js.
   That was taken out at Ben's request (2026-09-28): each card goes straight to
   its page. What remains is the one job this file still has.

   Nothing to gate on the cards themselves: every signed-in reader may open all
   four pages, and each page's data is scoped by row-level security on arrival.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var SS = (window.SS = window.SS || {});

  /* ═══════════════ THE BOTTOM MENU ═══════════════
     Directory and Process Documentation, at the foot of the page.

     It lives here rather than in js/shared.js — where the rest of the hub's nav
     gating sits — for a concrete reason: the home page does not load
     shared.js. It carries its own inline theme and reveal code, and pulling
     shared.js in alongside would wire the theme toggle twice, so a click would
     toggle and toggle back.

     No access rule is duplicated by that. The rules themselves are
     SS.access.canSeeDirectory and SS.access.canUseProcesses(), which live in
     hub-access.js and are read by the top nav too — this only asks them.

     Links are REMOVED, not hidden. A hidden link is still in the DOM, still
     findable, and still announces that the thing exists; for access control the
     honest form is absence. If nothing survives, the strip goes with it rather
     than leaving a heading over an empty row. */
  function gateBottomMenu() {
    var nav = document.getElementById("homeBottomNav");
    if (!nav || !SS.access) return;
    var wrap = document.getElementById("homeBottomLinks");
    if (!wrap) return;

    function drop(need) {
      var el = wrap.querySelector('.home-bottom-link[data-need="' + need + '"]');
      if (el) el.remove();
    }

    var directoryOK = Promise.resolve(SS.access.ready)
      .then(function () { return !!SS.access.canSeeDirectory; })
      ["catch"](function () { return false; });

    var processesOK = (SS.access.canUseProcesses
      ? SS.access.canUseProcesses() : Promise.resolve(false))
      ["catch"](function () { return false; });

    // Same live query the CAP guide's own page and its contextual nav link
    // already ask (shared/js/cap-guide-link.js) — not a fourth copy of that
    // allow list. "Some rows came back" is the whole check; RLS already did
    // the actual deciding.
    var capGuideOK = (SS.capGuideLink
      ? SS.capGuideLink.checkAccess() : Promise.resolve(false))
      ["catch"](function () { return false; });

    // All three answers before anything is revealed, so the strip appears
    // once in its final shape rather than showing and then losing a link.
    Promise.all([directoryOK, processesOK, capGuideOK]).then(function (ok) {
      if (!ok[0]) drop("directory");
      if (!ok[1]) drop("processes");
      if (!ok[2]) drop("cap-guide");
      if (wrap.querySelector(".home-bottom-link")) nav.hidden = false;
      else nav.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", gateBottomMenu, { once: true });
  } else { gateBottomMenu(); }
})();
