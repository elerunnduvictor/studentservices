/* ═══════════════════════════════════════════════════════════════════════════
   PROCESS DOCUMENTATION — THE GATEWAY ON THE HOME PAGE

   A fifth card beside the other four, shown only to people who can do
   something with it: process stewards and reviewers. Everyone else's home page
   is unchanged and shows four.

   The card is written into index.html hidden rather than built here, so it is
   the same markup as its four neighbours and cannot drift away from them. This
   file only decides whether to reveal it, and tells the grid it now holds five.

   The rule is SS.access.canUseProcesses(), shared with the navbar link. None of
   this is a security boundary — row-level security on `processes` is what keeps
   the page empty for anyone who opens the URL directly. This just avoids
   offering a door that leads to an empty room.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  async function start() {
    const card = document.getElementById("gatewayProcesses");
    if (!card) return;                        // not the home page
    if (!window.SS || !SS.access || !SS.access.canUseProcesses) return;

    let allowed = false;
    try { allowed = await SS.access.canUseProcesses(); }
    catch { return; }                         // the card simply stays hidden
    if (!allowed) return;

    card.hidden = false;
    // Four columns is the default; the grid has to be told when there are five,
    // or the fifth card is stranded on a row of its own.
    const grid = card.closest(".home-gateways-grid");
    if (grid) grid.classList.add("has-processes");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
