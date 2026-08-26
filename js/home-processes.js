/* ═══════════════════════════════════════════════════════════════════════════
   PROCESS DOCUMENTATION — THE BAND ON THE HOME PAGE

   The twin of the Emerging Issues band beside it. Both are the parts of the hub
   that change daily and that somebody is expected to act on, so they share one
   design and sit in one row.

   Shown only to people who can do something with it — process stewards and
   reviewers — via SS.access.canUseProcesses(), the same rule the navbar link
   uses. Everyone else's home page simply has one band instead of two, and the
   row copes with that on its own.

   None of this is a security boundary. Row-level security on `processes` keeps
   the page empty for anyone who opens the URL directly; this only avoids
   offering a door that leads to an empty room.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  /** The one line worth reading, chosen by what most needs doing. */
  function headline(counts) {
    if (counts.submitted) return plural(counts.submitted, "process awaiting review", "processes awaiting review");
    if (counts.draft) return plural(counts.draft, "process still in draft", "processes still in draft");
    if (counts.reviewed) return plural(counts.reviewed, "process documented", "processes documented");
    return "Nothing documented yet — start with one you know well.";
  }

  async function start() {
    const band = document.getElementById("homeProcs");
    if (!band || !window.SS || !SS.access || !SS.db) return;

    let allowed = false;
    try { allowed = await SS.access.canUseProcesses(); }
    catch { return; }                      // the band simply stays hidden
    if (!allowed) return;

    // Counted here rather than in a view: there is no aggregate for this table
    // and one small select is cheaper than adding one. Status is a short fixed
    // vocabulary, so counting client-side cannot drift from the database.
    let rows = [];
    try { rows = await SS.db.select("processes", { select: "id,status" }); }
    catch { return; }                      // not built yet, or not readable

    const counts = {
      total: rows.length,
      draft: rows.filter((r) => r.status === "Draft").length,
      submitted: rows.filter((r) => r.status === "Submitted").length,
      reviewed: rows.filter((r) => r.status === "Reviewed").length,
    };

    const stat = (n, label, tone) =>
      `<span class="issue-stat${tone ? " is-" + tone : ""}${n ? "" : " is-quiet"}">` +
      `<b>${n}</b>${label}</span>`;

    document.getElementById("procBandDesc").textContent = headline(counts);
    document.getElementById("procBandStats").innerHTML =
      stat(counts.reviewed, "documented", null) +
      stat(counts.submitted, "in review", "amber");

    band.hidden = false;
    // Tell the row it now holds two bands, so they lay out as a pair.
    if (SS.home && SS.home.syncBands) SS.home.syncBands();
    // Arriving is softened rather than popped — it lands after the rest of the
    // page, and a hard appearance reads as a glitch.
    requestAnimationFrame(() => band.classList.add("is-in"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
