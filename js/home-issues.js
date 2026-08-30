/* ═══════════════════════════════════════════════════════════════════════════
   THE EMERGING ISSUES ALERT

   "You'll always be able to go on there and see what the emerging issues are."
                                                              — Ben Packer

   A link that always says the same thing is furniture; people stop seeing it.
   This one reads the register and says what is actually true today — "2 critical
   issues · 3 open over a fortnight" — so the home page changes when the
   situation does, which is the whole argument for people coming back to it.

   It stays hidden until there is something to say. Three reasons, in order of
   importance:

     · Partners must never see it. The database refuses them the rows, so the
       query simply returns nothing and the alert never appears — no separate
       decision to get wrong here.
     · Before the tables exist the query errors, and a broken alert on the front
       page is worse than no alert.
     · An empty register is not worth announcing.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  /** The one line worth reading, chosen by what is most urgent.
      Kept to the same three things the figures beside it count, so the sentence
      and the numbers never tell different stories. Counts that could only ever
      report zero have been dropped as they arose — "overdue" and "due this
      week" when target dates stopped being collected, "no recent update" when
      issues became report-once. An alert that says "0 overdue" every day is a
      fact about the form, not about the work. */
  function headline(b) {
    /* Terse, because the card is 290px wide and the line has perhaps 150px of
       it. "3 critical issues · 2 raised this week." truncated to "…2 raised
       this …", which loses the number — the one part worth reading. Dropping
       the nouns keeps every figure visible: "3 critical · 2 this week". */
    const bits = [];
    if (b.red_open)  bits.push(b.red_open + " critical");
    if (b.raised_7d) bits.push(b.raised_7d + " this week");
    if (!bits.length && b.raised_prev7) bits.push(b.raised_prev7 + " last week");
    if (!bits.length) return "Nothing needs attention.";
    return bits.join(" · ");
  }

  async function start() {
    const card = document.getElementById("homeIssues");
    if (!card || !window.SS || !window.SS.db) return;

    /* Both at once, not one after the other.
       The old order was: wait for the session, then wait for hub_me to say who
       this is, then ask for the counts — three round trips in series, and the
       alert did not appear for about two seconds on a real connection. Nothing
       about the query needs the role: the view withholds its row from anyone
       outside Student Services, so the answer is safe whoever asks.
       The role is still checked, because it is what protects the alert on a
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

    document.getElementById("eiAlertLine").textContent = headline(brief);

    /* The bell badge, and the rule that makes it mean something.
       It is shown only when something is actually critical. At zero the badge
       is not drawn at all — not drawn as "0" — because a badge that is always
       present is decoration rather than a signal, and the whole point of
       putting this in the corner as an alert is that its presence is the
       message. The ringing animation is gated on the same condition. */
    const critical = Number(brief.red_open) || 0;
    const badge = document.getElementById("eiAlertBadge");
    if (badge) {
      if (critical > 0) {
        badge.textContent = critical > 99 ? "99+" : String(critical);
        badge.hidden = false;
        card.classList.add("has-critical");
        // Screen readers get the count in words; the badge alone is a glyph.
        card.setAttribute("aria-label",
          plural(critical, "critical emerging issue", "critical emerging issues"));
      } else {
        badge.hidden = true;
        card.classList.remove("has-critical");
        card.setAttribute("aria-label", "Emerging issues — nothing critical");
      }
    }

    card.hidden = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
