/* ═══════════════════════════════════════════════════════════════════════════
   BEYOND THE CHART — the Directory & Process Documentation cards

   Both used to live on the home page. Directory sat beside the org chart
   tile there; Process Documentation shared a band with Emerging Issues.
   Neither question is really about the home page, though — "who is on my
   team" and "how does the work get done" both follow naturally from "who
   reports to whom", which is what this page already answers. So they moved
   here instead, as plain cards straight to each page — no inline preview to
   load or expand, just the door itself.

   Both cards are hidden until this decides they are worth showing:
     - Directory needs SS.access.isStudentServices — a partner is refused
       every row by row-level security on the employees tables, so the card
       would just be a door to an empty table.
     - Process Documentation keeps the gate it already had on the home page —
       SS.access.canUseProcesses(), stewards and reviewers only.
   Neither check is a security boundary; both tables enforce the real rule in
   Postgres regardless of what this script does. This only avoids drawing a
   door that leads to an empty room.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var SS = (window.SS = window.SS || {});

  function revealDirectory() {
    var card = document.getElementById("oc-directory");
    if (!card || !SS.access) return Promise.resolve();
    return Promise.resolve(SS.access.ready).then(function () {
      if (SS.access.isStudentServices) card.hidden = false;
    })["catch"](function () { /* stays hidden */ });
  }

  function revealProcesses() {
    var card = document.getElementById("oc-processes");
    if (!card || !SS.access || !SS.access.canUseProcesses || !SS.db) return Promise.resolve();
    return SS.access.canUseProcesses().then(function (allowed) {
      if (allowed) card.hidden = false;
    })["catch"](function () { /* stays hidden */ });
  }

  /* A partner with no process-steward row clears neither gate — both cards
     stay hidden, and an otherwise-empty "Beyond the Chart" heading over a
     blank grid is worse than no section at all. */
  function hideSectionIfEmpty() {
    var section = document.getElementById("ocRelated");
    if (!section) return;
    var anyVisible = !!section.querySelector(".oc-card:not([hidden])");
    if (!anyVisible) section.hidden = true;
  }

  function start() {
    Promise.all([revealDirectory(), revealProcesses()]).then(hideSectionIfEmpty);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
