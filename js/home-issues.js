/* ═══════════════════════════════════════════════════════════════════════════
   THE EMERGING ISSUES BAND

   "You'll always be able to go on there and see what the emerging issues are."
                                                              — Ben Packer

   A link that always says the same thing is furniture; people stop seeing it.
   This one reads the register and says what is actually true today — "2 critical
   issues · 3 open over a fortnight" — so the home page changes when the
   situation does, which is the whole argument for people coming back to it.

   It stays hidden until there is something to say. Three reasons, in order of
   importance:

     · Partners must never see it. The database refuses them the rows, so the
       query simply returns nothing and the band never appears — no separate
       decision to get wrong here.
     · Before the tables exist the query errors, and a broken band on the front
       page is worse than no band.
     · An empty register is not worth a banner.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  /** The one line worth reading, chosen by what is most urgent.
      Kept to the same three things the figures beside it count, so the sentence
      and the numbers never tell different stories. Counts that could only ever
      report zero have been dropped as they arose — "overdue" and "due this
      week" when target dates stopped being collected, "no recent update" when
      issues became report-once. A banner that says "0 overdue" every day is a
      fact about the form, not about the work. */
  function headline(b) {
    const bits = [];
    if (b.red_open)  bits.push(plural(b.red_open, "critical issue", "critical issues"));
    if (b.raised_7d) bits.push(b.raised_7d + " raised this week");
    if (!bits.length && b.raised_prev7) bits.push(b.raised_prev7 + " raised last week");
    if (!bits.length) return "Nothing needs attention right now.";
    return bits.join(" · ") + ".";
  }

  async function start() {
    const band = document.getElementById("homeIssues");
    if (!band || !window.SS || !window.SS.db) return;

    /* Both at once, not one after the other.
       The old order was: wait for the session, then wait for hub_me to say who
       this is, then ask for the counts — three round trips in series, and the
       band did not appear for about two seconds on a real connection. Nothing
       about the query needs the role: the view withholds its row from anyone
       outside Student Services, so the answer is safe whoever asks.
       The role is still checked, because it is what protects the band on a
       database where the guard has not been applied yet — but it is checked
       *alongside* the query rather than in front of it, so the wait is now the
       slower of the two rather than the sum. */
    const access = window.SS.access;
    try { await (access && (access.sessionReady || access.ready)); } catch { /* carry on */ }

    const [role, brief] = await Promise.all([
      (async () => {
        try { await (access && access.ready); } catch { /* unknown */ }
        return access ? access.isStudentServices : false;
      })(),
      (async () => {
        try {
          const rows = await window.SS.db.select("v_emerging_issues_brief", { limit: 1 });
          return (rows || [])[0];
        } catch { return null; }      // not set up yet, or refused: stay hidden
      })(),
    ]);

    if (!role || !brief) return;

    const stat = (n, label, tone) =>
      `<span class="issue-stat${tone ? " is-" + tone : ""}${n ? "" : " is-quiet"}">
         <b>${n}</b>${label}</span>`;

    document.getElementById("issueBandDesc").textContent = headline(brief);
    /* The same three the register itself is organised by: what came in this
       week, what came in the week before, and what is critical. "Open" went
       because it counted everything ever raised and unresolved — a number that
       only grows, and one nobody can act on. These three are each a question
       with an answer. */
    document.getElementById("issueBandStats").innerHTML =
      stat(brief.raised_7d || 0, "this week", null) +
      stat(brief.raised_prev7 || 0, "last week", null) +
      stat(brief.red_open || 0, "critical", "red");

    band.hidden = false;
    // Tell the row it may now hold two bands, so they lay out as a pair.
    if (SS.home && SS.home.syncBands) SS.home.syncBands();
    // Arriving is softened rather than popped — it lands after the rest of the
    // page, and a hard appearance reads as a glitch.
    requestAnimationFrame(() => band.classList.add("is-in"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
