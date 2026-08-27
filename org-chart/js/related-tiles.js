/* ═══════════════════════════════════════════════════════════════════════════
   BEYOND THE CHART — the Directory & Process Documentation cards

   Both used to live on the home page. Directory sat beside the org chart
   tile there; Process Documentation shared a band with Emerging Issues.
   Neither question is really about the home page, though — "who is on my
   team" and "how does the work get done" both follow naturally from "who
   reports to whom", which is what this page already answers. So they moved
   here instead, as plain cards straight to each page — no inline preview to
   load or expand, just the door itself.

   The only thing left to do in script is decide whether the Process
   Documentation card is worth showing at all. It keeps the gate it already
   had on the home page — visible only to process stewards and reviewers,
   SS.access.canUseProcesses(), the same rule the navbar link uses. Directory
   carries no such gate; it never had one there either. Not a security
   boundary either way: row-level security on `processes` is what actually
   keeps the data out of reach, this only avoids drawing a door that leads to
   an empty room.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var SS = (window.SS = window.SS || {});

  function revealProcesses() {
    var card = document.getElementById("oc-processes");
    if (!card || !SS.access || !SS.access.canUseProcesses || !SS.db) return;
    SS.access.canUseProcesses().then(function (allowed) {
      if (allowed) card.hidden = false;
    })["catch"](function () { /* stays hidden */ });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", revealProcesses, { once: true });
  } else { revealProcesses(); }
})();
