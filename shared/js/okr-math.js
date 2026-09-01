/* ═══════════════════════════════════════════════════════════════════════════
   OKR ARITHMETIC

   How far along a key result is, and how to average several of them. One
   definition, because four places were each doing it slightly differently and
   one of them was producing 158%.

   ── Why averaging `progress` directly is wrong ──

   `progress` is not a percentage. What it means depends on the row's type:

     KPI % - Increase    0.84  → 84% of the way to a 0.9 goal
     Milestone Tracked   0.30  → 30% done, goal is always 1
     KPI # - Decrease    8     → EIGHT of something, against a goal of 5

   That last one is a count, and the live view stores it unscaled while the
   bundled snapshot stores it as 0.08. Summing progress and multiplying by 100
   therefore let a single row contribute 800% to an average, which is how the
   objective card came to claim 158% average progress on a scale that stops at
   100.

   ── What is right ──

   Attainment: how close the row is to its own goal, which is the same question
   for every type and is bounded by construction.

     · increase / milestone   progress ÷ goal
     · decrease               goal ÷ progress   — going down is the achievement,
                              and progress 0 means the target is fully met
     · clamped to 0..1        beating a goal is good news, not 155% of an
                              objective

   Being a ratio, it is also immune to the scale disagreement above: 8 against
   5 reads as 62%, and 0.09 against 0.05 reads as 56% — both sane, both bounded,
   whichever way the data arrives.

   A row with no goal, or no progress, has no attainment and is left out of the
   average rather than counted as zero: "not reported" and "no progress" are
   different facts, and averaging the first as the second quietly punishes a
   team for a blank cell.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SS = (window.SS = window.SS || {});

  function attainment(row) {
    if (!row) return null;
    var p = row.progress, g = row.goal;
    if (typeof p !== "number" || typeof g !== "number" || g === 0) return null;
    var ratio = /decrease/i.test(String(row.type || ""))
      ? (p === 0 ? 1 : g / p)
      : (p / g);
    if (!isFinite(ratio)) return null;
    return Math.max(0, Math.min(1, ratio));
  }

  /** Mean attainment across rows, 0–100, or null when nothing is measurable. */
  function averagePercent(rows) {
    var vals = (rows || []).map(attainment).filter(function (v) { return v !== null; });
    if (!vals.length) return null;
    var sum = vals.reduce(function (a, b) { return a + b; }, 0);
    return Math.round((sum / vals.length) * 100);
  }

  /** What the rows were *aiming* for, on the same 0–100 scale — the "planned"
      marker beside the actual. Goals are already fractions of their own target
      for milestone and percentage rows; a count goal has no meaning as a
      percentage, so those are left out. */
  function averageGoalPercent(rows) {
    var vals = (rows || []).filter(function (r) {
      return typeof r.goal === "number" && r.goal > 0 && r.goal <= 1 && !/#/.test(String(r.type || ""));
    }).map(function (r) { return r.goal; });
    if (!vals.length) return null;
    var sum = vals.reduce(function (a, b) { return a + b; }, 0);
    return Math.round((sum / vals.length) * 100);
  }

  /* ── Showing a value, the way the PM hub shows it ──

     The rule is not ours to invent: pm/js/schema.js renders the Progress
     column with `progressCell`, and that is where these rows are typed and
     edited. It reads:

       isCount = /#/.test(row.type)
       count  -> the bare number, no percent sign      ("8")
       else   -> Math.round(n * 1000) / 10 + "%"       (0.845 -> "84.5%")

     The hub was multiplying counts by 100 as well, so a row reading 8 in the
     PM hub read 800 here. Same rule in both places now, to the same decimal.

     A count's goal is a count too. The PM hub's generic `percent` renderer
     shows "5%" for that cell, which is a quirk of applying one renderer to a
     column holding two kinds of number — not a rule worth copying. */
  function isCount(row) { return !!(row && row.type && /#/.test(String(row.type))); }

  function formatValue(row, v) {
    if (v === null || v === undefined || v === "") return "—";
    var n = Number(v);
    if (!isFinite(n)) return String(v);
    if (isCount(row)) return String(n);
    return (Math.round(n * 1000) / 10) + "%";
  }

  SS.okr = {
    attainment: attainment,
    averagePercent: averagePercent,
    averageGoalPercent: averageGoalPercent,
    isCount: isCount,
    formatValue: formatValue,
  };
})();
