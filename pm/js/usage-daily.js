/* ═══════════════════════════════════════════════════════════════════════════
   HUB USAGE — BY DAY, GROUPED INTO MONTHS

   The Analytics "By day" sheet, drawn rather than tabulated.

   It was a spreadsheet with one row per day *per kind of event* — page views,
   sign-ins and refusals each on their own line — newest first, forever. Three
   rows a day is ninety a month, and the three-way repetition of every date made
   the list read as noise long before its length did.

   Now each month is one section, newest open and the rest folded, with the
   month's totals on its heading so a folded month still says something. Inside,
   each day is one row, and each kind of event is a column. Nothing is dropped:
   every count and every "distinct people" figure the old sheet had is still
   here, just in the cell it belongs to rather than on a line of its own.

   ── what a month heading does not say ──

   How many different people used the hub that month. The view counts distinct
   people per day, and adding those up counts someone who came on ten days ten
   times. A wrong number in a heading is worse than no number, so the heading
   carries only figures that can be summed honestly: views, sign-ins, refusals
   and the number of days with any activity.

   ── dates ──

   `day_sort` is a plain date, already in Mountain time — the view converts
   before it truncates. Parsed as UTC and formatted as UTC so that the browser's
   own time zone never gets a say: `new Date("2026-09-09")` formatted in
   Mountain time is the evening of September 8th.

   Export still works: schema.js hands the raw rows back to the toolbar's
   Export button through usageByDayRows(), so the CSV is the same file it was.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* The view spells the events out ("Page view", "Sign in", "Refused"); the
     table underneath stores the short forms. Both are accepted, so a change to
     either end cannot silently empty a column. hub_log_event() refuses any
     event outside these three, but rows older than that check could exist, so
     anything unrecognised is kept in an "Other" column rather than lost — and
     that column only appears if there is something to put in it. */
  const KIND = {
    "page view": "views", "page": "views",
    "sign in": "signins", "sign-in": "signins", "login": "signins",
    "refused": "refused", "login_denied": "refused",
  };
  const COLUMNS = [
    { key: "views",   label: "Page views" },
    { key: "signins", label: "Sign-ins" },
    { key: "refused", label: "Refused", tone: "bad" },
  ];

  const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const DAY   = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

  let lastRows = [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const plural = (n, one, many) => fmt(n) + " " + (n === 1 ? one : many);

  /** "2026-09-09" → a Date at UTC midnight, or null. */
  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }

  /** One entry per day, with a slot for each kind of event. */
  function collectDays(rows) {
    const days = new Map();
    rows.forEach((r) => {
      const date = parseDay(r.day_sort);
      if (!date) return;
      const key = String(r.day_sort).slice(0, 10);
      let d = days.get(key);
      if (!d) {
        d = { key, date, cells: {} };
        days.set(key, d);
      }
      const kind = KIND[String(r.event || "").trim().toLowerCase()] || "other";
      const c = d.cells[kind] || (d.cells[kind] = { hits: 0, people: 0 });
      c.hits += Number(r.hits) || 0;
      // Distinct people per day per kind. Only ever one row per day and kind
      // from the view, so this is a copy, not a sum — max() keeps it honest if
      // that ever stops being true.
      c.people = Math.max(c.people, Number(r.people) || 0);
    });
    return [...days.values()].sort((a, b) => b.date - a.date);
  }

  /** Newest month first, each holding its days newest first. */
  function collectMonths(days) {
    const months = [];
    days.forEach((d) => {
      const key = d.key.slice(0, 7);
      let m = months[months.length - 1];
      if (!m || m.key !== key) {
        m = { key, label: MONTH.format(d.date), days: [], totals: {} };
        months.push(m);
      }
      m.days.push(d);
      Object.keys(d.cells).forEach((k) => { m.totals[k] = (m.totals[k] || 0) + d.cells[k].hits; });
    });
    return months;
  }

  function cell(c, tone) {
    // The dash takes the number's place and the people note stays as an empty
    // slot, so an empty cell's mark lines up with the counts above and below
    // it instead of drifting to the column's far edge.
    if (!c || !c.hits) {
      return `<td class="num um-zero"><span class="um-n">—</span><span class="um-ppl"></span></td>`;
    }
    return `<td class="num${tone ? " um-" + tone : ""}">
              <span class="um-n">${fmt(c.hits)}</span>
              <span class="um-ppl">${plural(c.people, "person", "people")}</span>
            </td>`;
  }

  function monthHtml(m, cols, open) {
    const t = m.totals;
    const bits = [
      `<span class="um-t"><b>${fmt(t.views)}</b> page ${t.views === 1 ? "view" : "views"}</span>`,
      `<span class="um-t"><b>${fmt(t.signins)}</b> sign-${t.signins === 1 ? "in" : "ins"}</span>`,
      // Only when there were any. "0 refused" on every month is the form
      // talking, not the month.
      t.refused ? `<span class="um-t um-t-bad"><b>${fmt(t.refused)}</b> refused</span>` : "",
      t.other ? `<span class="um-t"><b>${fmt(t.other)}</b> other</span>` : "",
      `<span class="um-t um-t-dim">${plural(m.days.length, "active day", "active days")}</span>`,
    ].join("");

    return `
      <details class="um-month"${open ? " open" : ""}>
        <summary class="um-head">
          <svg class="um-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>
          <span class="um-name">${esc(m.label)}</span>
          <span class="um-totals">${bits}</span>
        </summary>
        <div class="um-body">
          <table class="um-table">
            <thead>
              <tr>
                <th scope="col">Day</th>
                ${cols.map((c) => `<th scope="col" class="num">${esc(c.label)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${m.days.map((d) => {
                const dow = d.date.getUTCDay();
                return `<tr${dow === 0 || dow === 6 ? ' class="um-weekend"' : ""}>
                  <th scope="row" class="um-day">${esc(DAY.format(d.date))}</th>
                  ${cols.map((c) => cell(d.cells[c.key], c.tone)).join("")}
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </details>`;
  }

  window.renderUsageByDay = async function renderUsageByDay(host) {
    const rows = await SS.db.select("v_hub_usage_daily", { order: "day_sort.desc" });
    lastRows = Array.isArray(rows) ? rows : [];

    const days = collectDays(lastRows);
    if (!days.length) {
      host.innerHTML =
        `<div class="empty-state"><div><strong>No activity recorded yet</strong>` +
        `<p style="margin-top:8px">Page views and sign-ins appear here as they happen.</p></div></div>`;
      return;
    }

    const cols = COLUMNS.slice();
    if (days.some((d) => d.cells.other)) cols.push({ key: "other", label: "Other" });

    const months = collectMonths(days);
    host.innerHTML = `
      <div class="um">
        <p class="um-lede">
          ${plural(months.length, "month", "months")} of activity, newest first.
          Open a month to see it day by day. Each figure is how many times it
          happened, with how many different people it was underneath.
        </p>
        ${months.map((m, i) => monthHtml(m, cols, i === 0)).join("")}
      </div>`;
  };

  /* For the toolbar's Export button: the rows exactly as the view returned
     them, so the downloaded CSV is the file it always was — one line per day
     per event — whatever shape they are drawn in on screen. */
  window.usageByDayRows = function usageByDayRows() {
    return lastRows.slice();
  };
})();
