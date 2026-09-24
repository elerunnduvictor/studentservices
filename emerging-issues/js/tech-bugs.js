/* ═══════════════════════════════════════════════════════════════════════════
   TECHNICAL BUGS BACKLOG — the second tab of the Emerging Issues page

   Technical Support's own tracker, not something raised here. Every row comes
   from the TS Product Tracker workbook: tools/build-tech-bugs.py turns it into
   supabase/tech-bugs.sql, and running that replaces this week's list. Nothing
   on this tab writes to the database, and there is no form.

   Two sub-tabs. **Top 10 Tech Bugs** opens first: the ten heaviest open bugs
   across every product, what they are, who has them, and how that ten has
   moved. **Bugs Backlog** is the whole list behind them.

   The ten are ordered by weighted score, because a priority number is given
   per product and says nothing across products — Admissions' 1 and Finance's
   1 are different bugs. Ties go to the bug with no workaround, then the one
   affecting more students, then the longest-standing. The same order is
   written down once more, in tools/build-tech-bugs.py, which snapshots the
   twenty heaviest at each capture so the tab can say what entered the ten,
   what dropped out, and how long each has been up there.

   In the backlog sub-tab, one compartment per tracker tab — Admissions / EE,
   Finance, Canvas, … — the way the OKR page groups its sub-key results: a
   header that says what is inside, and the bugs under it. Opening one closes
   the others, until the reader filters or searches; then every compartment
   with a match opens, since the point of searching is to see what was
   found.

   Each bug carries the ten columns the tracker keeps for it: Priority,
   Discovered, Bug / ADO, Scope, Summary, Owner, Updated ETA, Workaround, Latest
   Status and Weighted Score. The face of the card holds what tells two bugs
   apart at a glance; opening it shows the rest.

   Under the summary, the backlog over time; in each compartment's header,
   that product's own line. Both are drawn by js/tech-bugs-trend.js. The
   points come from tech_bug_trend(grain, since) — supabase/tech-bug-trend.sql
   — which groups tech_bug_history into one row per point, so the page reads a
   hundred rows however long the record grows. Before that function exists the
   page falls back to reading the history table and grouping it here; without
   the table at all, the tab simply has no lines.

   Who may read it is decided by the database, with the same rule as the
   register: tech_bugs' policy calls hub_sees_emerging_issues(). This file
   only waits to be told the page is allowed to draw.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  /* Read before anything else runs: the register replaces the address when it
     arrives on #raise, and this has to know what the reader asked for. */
  const ASKED_FOR_BUGS = location.hash.indexOf("#bugs") === 0;
  const ASKED_FOR_NOTES = location.hash.indexOf("#notes") === 0;
  const ASKED_FOR_SUB = location.hash === "#bugs/backlog" ? "backlog" : "top";

  /* The four sections a tracker sheet keeps, and what each calls two of its
     columns. "Latest Status" becomes the reason a bug left the backlog; the
     score column is headed "Priority Estimator Score" on closed and removed
     bugs, so it is labelled that way here too rather than claiming to be the
     weighted score it is not. */
  const SECTIONS = [
    { id: "active",   label: "Open backlog",       one: "open bug",   many: "open bugs",
      status: "Latest status",         score: "Weighted Score" },
    { id: "resolved", label: "Resolved this week", one: "bug resolved this week", many: "bugs resolved this week",
      status: "Reason for resolution", score: "Weighted Score" },
    { id: "closed",   label: "Closed",             one: "closed bug", many: "closed bugs",
      status: "Reason for closure",    score: "Priority Estimator Score" },
    { id: "removed",  label: "Removed",            one: "removed bug", many: "removed bugs",
      status: "Reason for removal",    score: "Priority Estimator Score" },
  ];
  const sectionOf = (id) => SECTIONS.find((s) => s.id === id) || SECTIONS[0];

  /* What the weighted score is, in the words the TS team gave for it. Shown
     under the total in the band at the top, and beside the score in every
     opened card. */
  const SCORE_NOTE = "Weighted Score is determined by considering each bug's impact based on " +
                     "scope (number of students affected), severity, urgency, risk, and " +
                     "available workarounds.";

  /* Two of these keep the compartments and three set them aside.

     An order that ranks bugs against each other — by score, by date — has to
     rank across trackers, or "highest first" puts Admissions' 140 above
     Finance's 184 because Admissions is the first tab. So those three show one
     list, every card naming its tracker. They used to sort inside each
     compartment only, with every compartment still closed, which on screen
     looked like nothing happening at all.

     The page opens on the first: products from the heaviest total weighted
     score to the lightest, and inside each product its bugs from the highest
     score down. The workbook's own order — tab by tab, by the priority number
     each product gives its bugs — is still there as the second. */
  const SORTS = [
    { id: "total",    label: "Products, highest score first", layout: "groups" },
    { id: "priority", label: "Products, workbook order",      layout: "groups" },
    { id: "score",    label: "All bugs, highest score first", layout: "list",
      heading: "highest weighted score first" },
    { id: "newest",   label: "All bugs, newest first",        layout: "list",
      heading: "most recently discovered first" },
    { id: "oldest",   label: "All bugs, oldest first",        layout: "list",
      heading: "longest-standing first" },
  ];
  const sortOf = (id) => SORTS.find((x) => x.id === id) || SORTS[0];

  /* The teams bugs are handed to. An owner reading "Ellucian & ICS" belongs to
     both, "ICS/Dane Bohman" to ICS, and "Ellucian (Barry Dunphy) / BYU-PW
     (Kari Johnson)" to Ellucian and BYU-PW — so the filter offers teams, never
     the people named in brackets after them. An owner that names no team is
     "Other"; an empty cell is "No owner recorded". */
  const VENDORS = ["ICS", "Ellucian", "Digital Ops", "BYU-PW"];
  const NO_OWNER = "No owner recorded";
  const OTHER_OWNER = "Other";
  const VENDOR_RE = VENDORS.map((v) => new RegExp("\\b" + v.replace(/ /g, "\\s+") + "\\b", "i"));
  function ownersOf(owner) {
    const s = String(owner || "").trim();
    if (!s) return [NO_OWNER];
    const hit = VENDORS.filter((v, i) => VENDOR_RE[i].test(s));
    return hit.length ? hit : [OTHER_OWNER];
  }

  /* "No known workaround.", "None", "N/A", "No current workaround." and an
     empty cell all say the same thing. Anything else is a workaround. */
  function hasWorkaround(w) {
    const t = String(w || "").trim().toLowerCase().replace(/\.+$/, "");
    if (!t) return false;
    return !(t === "none" || t === "n/a" || t === "na" || /^no (known |current )?workaround/.test(t));
  }

  /* ── days ──
     Dates arrive as plain days, "2026-09-14", and are read and printed as UTC
     so the browser's time zone never moves one: formatted in Mountain time,
     midnight on the 14th is the evening of the 13th. "Today" is Mountain,
     because that is where the tracker is kept. */
  const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const isDay = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const fmtDay = (s) => DAY.format(new Date(s + "T00:00:00Z"));
  const TODAY = (function () {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver",
        year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) { return new Date().toISOString().slice(0, 10); }
  })();
  const daysSince = (s) => Math.round((Date.parse(TODAY + "T00:00:00Z") - Date.parse(s + "T00:00:00Z")) / 86400000);

  const oneLine = (s) => String(s || "").replace(/\s*\n\s*/g, " ").trim();

  /* A total is the sum of the scores that are numbers. "N/A" and an empty cell
     are not zero — they are bugs nobody has scored — so they are left out of
     the sum and counted beside it, and a set with none scored has no total
     rather than a 0 that would read as "carries no weight". */
  function scoreTotal(rows) {
    let total = 0, scored = 0;
    rows.forEach((r) => { if (Number.isFinite(r.score)) { total += r.score; scored++; } });
    return { total, scored, unscored: rows.length - scored };
  }
  const fmtNum = (n) => Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  // Only the sections whose score column is the Weighted Score are added up;
  // closed and removed bugs carry a "Priority Estimator Score" there instead.
  const totalsApply = (sec) => sec.score === "Weighted Score";
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);

  /* ── state ───────────────────────────────────────────────────────────── */
  let ROWS = null;              // every bug, all four sections
  let NOTES = [];               // Finance's procedure notes
  let LOADING = null;
  let MAX_SCORE = 1;            // the top weighted score on the open backlog
  const f = { section: "active", product: "", owner: "", workaround: "", eta: "", q: "", sort: "total" };
  let OPEN_GROUP = null;        // accordion, when nothing is filtered
  const COLLAPSED = new Set();  // compartments closed by hand while filtering
  let OPEN_BUG = null;

  /* Which sub-tab is showing, and the captures of the heaviest bugs behind
     the Top 10 tab. The list itself is always ranked from the live rows, so
     it cannot disagree with the backlog; the captures are only for the
     trends, what entered and left, and how long each bug has been up. */
  const TOP_N = 10;
  let SUB = "top";
  let TOP_POINTS = null;
  const TOP_CACHE = new Map();

  let POINTS = null;            // one object per point on the lines; null when none
  let RAW_HISTORY = null;       // the fallback's rows, read once if it is needed
  let DRAWN = false;            // the lines draw themselves in once, not on every filter
  const TREND = window.TBTrend || null;
  const TREND_CACHE = new Map();

  /* How far back the lines reach and how coarse their points are. Remembered
     in this browser; a browser that will not remember it starts on the
     nineties days, a point a week. */
  const RANGE_KEY = "tb-trend-range", GRAIN_KEY = "tb-trend-grain";
  const remembered = (key, fallback, ok) => {
    try { const v = localStorage.getItem(key); return v && ok(v) ? v : fallback; } catch (e) { return fallback; }
  };
  let RANGE = !TREND ? "90d" : remembered(RANGE_KEY, TREND.DEFAULTS.range,
    (v) => TREND.RANGES.some((r) => r.id === v));
  let GRAIN = !TREND ? "week" : remembered(GRAIN_KEY, TREND.DEFAULTS.grain,
    (v) => TREND.rangeOf(RANGE).grains.indexOf(v) >= 0);
  /* What the line in each product follows — its bug count or its weighted
     score. Remembered in this browser; a browser that will not remember it
     just starts on the count. */
  const SPARK_KEY = "tb-spark-metric";
  let SPARK = (function () {
    try { return localStorage.getItem(SPARK_KEY) === "score" ? "score" : "bugs"; } catch (e) { return "bugs"; }
  })();

  const filtering = () => !!(f.product || f.owner || f.workaround || f.eta || f.q.trim());
  // The history is kept per product, so a product filter leaves each line
  // true to its compartment; an owner, a search or the rest do not.
  const narrowedWithin = () => !!(f.owner || f.workaround || f.eta || f.q.trim());
  const keyOf = (r) => r.product + "|" + r.section + "|" + r.row_order;

  /* ── the view switch ─────────────────────────────────────────────────── */
  /* The band at the top names whichever register is showing. The register's
     own words are read from the page at start, so they stay written in one
     place; the tracker's are here. */
  const REGISTER = { eyebrow: "", title: "", lead: "", doc: "" };
  const FIELD_NOTES = {
    eyebrow: "Weekly Notes",
    title: 'Field <span>Notes</span>',
    lead: "What the week held for each of us, what got in the way, and what comes next.",
    doc: "Field Notes — Student Services — BYU-Pathway Worldwide",
  };
  const BUGS = {
    eyebrow: "Technical Support",
    title: 'Technical Bugs <span>Backlog</span>',
    lead: "Open bugs Technical Support is tracking with ICS, Ellucian and Digital Ops, " +
          "from the TS Product Tracker.",
    doc: "Technical Bugs Backlog — Student Services — BYU-Pathway Worldwide",
  };

  function setView(view, fromReader) {
    // Three registers now, so each panel is told whether it is the one showing
    // rather than toggled against a single boolean.
    const bugs = view === "bugs", notes = view === "notes";
    el("eiRegister").hidden = bugs || notes;
    el("tbView").hidden = !bugs;
    if (el("fnView")) el("fnView").hidden = !notes;
    // CSS hides "Raise an issue" off this attribute, rather than this file
    // setting `hidden` on it — the register hides it from partners by that
    // attribute, and switching back must not quietly undo that.
    const main = el("eiMain");
    if (main) main.dataset.view = view;
    document.querySelectorAll("#eiViews .ei-view").forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    const words = bugs ? BUGS : notes ? FIELD_NOTES : REGISTER;
    if (el("eiEyebrow")) el("eiEyebrow").textContent = words.eyebrow;
    // The title is the page's own markup or the constant above, never text
    // from the database, so setting it as HTML carries its gold word safely.
    if (el("eiTitle")) el("eiTitle").innerHTML = words.title;
    if (el("eiLead")) el("eiLead").textContent = words.lead;
    document.title = words.doc;
    // The total belongs to this tab; renderSummary() decides whether there is
    // one to show once the rows are in.
    if (!bugs && el("tbHeroScore")) el("tbHeroScore").hidden = true;
    if (fromReader) {
      history.replaceState(null, "",
        bugs ? "#bugs" : notes ? "#notes" : location.pathname + location.search);
    }
    if (notes && window.SS && window.SS.fieldNotes) window.SS.fieldNotes.show();
    if (bugs) {
      load();
      // Drawn at the width it had; the window may have changed while the
      // register was showing.
      const t = SUB === "top" ? el("tbTopTrend") : el("tbTrend");
      if (t && t._redraw) t._redraw();
    }
  }

  /* ── the two sub-tabs ─────────────────────────────────────────────────── */
  function switchSub(sub, fromReader) {
    SUB = sub === "backlog" ? "backlog" : "top";
    if (el("tbTop")) el("tbTop").hidden = SUB !== "top";
    if (el("tbBacklog")) el("tbBacklog").hidden = SUB !== "backlog";
    document.querySelectorAll("#tbSubs .tb-sub").forEach((b) => {
      const on = b.dataset.sub === SUB;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    // The total in the band belongs to the whole open backlog, which is what
    // both sub-tabs are about, so it stays put.
    if (fromReader) {
      history.replaceState(null, "", SUB === "backlog" ? "#bugs/backlog" : "#bugs");
    }
    // Drawn to the width it has now: a chart in a hidden panel has none.
    const host = SUB === "top" ? el("tbTopTrend") : el("tbTrend");
    if (host && host._redraw) host._redraw();
  }

  function wireSubs() {
    const nav = el("tbSubs");
    if (!nav) return;
    nav.addEventListener("click", (e) => {
      const b = e.target.closest(".tb-sub");
      if (b) switchSub(b.dataset.sub, true);
    });
    nav.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tabs = [...nav.querySelectorAll(".tb-sub")];
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      switchSub(next.dataset.sub, true);
    });
  }

  /* One open card at a time in the Top 10 list, toggled in place. */
  function wireTopList() {
    const host = el("tbTopList");
    if (!host) return;
    host.addEventListener("click", (e) => {
      const head = e.target.closest(".tt-bug-head");
      if (!head) return;
      const card = head.closest(".tt-bug"), key = card.dataset.key;
      const was = OPEN_BUG === key;
      host.querySelectorAll(".tt-bug.is-open").forEach((c) => {
        c.classList.remove("is-open");
        c.querySelector(".tt-bug-head").setAttribute("aria-expanded", "false");
        c.querySelector(".tb-bug-body").hidden = true;
      });
      OPEN_BUG = was ? null : key;
      if (!was) {
        card.classList.add("is-open");
        head.setAttribute("aria-expanded", "true");
        card.querySelector(".tb-bug-body").hidden = false;
      }
    });
  }

  function wireViews() {
    const nav = el("eiViews");
    nav.addEventListener("click", (e) => {
      const b = e.target.closest(".ei-view");
      if (b) setView(b.dataset.view, true);
    });
    // A tab strip answers the arrow keys, not only Tab.
    nav.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tabs = [...nav.querySelectorAll(".ei-view")];
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      setView(next.dataset.view, true);
    });
  }

  /* ── loading ─────────────────────────────────────────────────────────── */

  /* Just the open count, for the tab, so a reader of the register is not sent
     every bug's full text to learn a number. The rows themselves are fetched
     when the tab is first opened. */
  async function loadCount() {
    try {
      const rows = await SS.db.select("tech_bugs", { select: "product", filter: { section: "eq.active" } });
      paintCount((rows || []).length);
    } catch (e) { /* the tab simply shows no number */ }
  }
  function paintCount(n) {
    [el("tbViewCount"), el("tbSubCount")].forEach((c) => {
      if (!c) return;
      c.textContent = n;
      c.hidden = !n;
    });
  }

  function load() {
    if (LOADING) return LOADING;
    LOADING = Promise.all([
      SS.db.select("tech_bugs", { order: "product_order.asc,row_order.asc" }),
      // The notes and the lines are niceties; a missing table or function
      // must not cost the bugs.
      SS.db.select("tech_bug_notes", { order: "note_order.asc" }).catch(() => []),
      loadPoints(),
      loadTopPoints(),
    ]).then(([rows, notes]) => {
      ROWS = (rows || []).map((r) => Object.assign({}, r, {
        score: r.score == null || r.score === "" ? null : Number(r.score),
        bug_refs: Array.isArray(r.bug_refs) ? r.bug_refs : [],
      }));
      NOTES = notes || [];
      const open = ROWS.filter((r) => r.section === "active");
      MAX_SCORE = Math.max(1, ...open.map((r) => r.score).filter((n) => Number.isFinite(n)));
      paintCount(open.length);
      paintSource();
      fillFilters();
      renderTrend();
      render();
      renderTopTab();
      DRAWN = true;
    }).catch((err) => {
      LOADING = null;          // let the next visit to the tab try again
      const missing = /404|PGRST205|does not exist/i.test(err.message || "");
      el("tbGroups").innerHTML = missing
        ? `<div class="ei-empty"><strong>The bug backlog is not available yet.</strong>
             <p>Its table has not been created in the database. Contact Ben Packer or
                Jess Swinburne.</p></div>`
        : `<div class="ei-empty"><strong>Could not load the bug backlog.</strong>
             <p>${esc(err.message)}</p></div>`;
    });
    return LOADING;
  }

  // Where the list comes from. Neither the date the workbook was saved nor how
  // often it is loaded is repeated here: the charts carry the dates, and the
  // cadence changes.
  function paintSource() {
    el("tbSource").textContent = "From the TS Product Tracker.";
  }

  /* ── the points behind the lines ────────────────────────────────────────
     tech_bug_trend() groups the history into one row per point, which keeps
     the read small however many captures pile up. Before that function has
     been created the history table is read once and grouped here instead, so
     a page deployed ahead of the SQL still draws. */
  async function loadPoints() {
    if (!TREND) return;
    const key = GRAIN + "|" + RANGE;
    if (TREND_CACHE.has(key)) { POINTS = TREND_CACHE.get(key); return; }
    const sinceDay = TREND.since(RANGE, TODAY);
    let points = null;
    try {
      const rows = await SS.db.rpc("tech_bug_trend", { p_grain: GRAIN, p_since: sinceDay });
      points = TREND.fromRpc(rows);
    } catch (err) {
      if (RAW_HISTORY === null) {
        RAW_HISTORY = await SS.db.select("tech_bug_history",
          { order: "captured_on.asc,product_order.asc" }).catch(() => false);
      }
      points = RAW_HISTORY ? TREND.fromHistory(RAW_HISTORY, GRAIN, sinceDay) : null;
    }
    // A point a week says nothing about a record three days long: fall back to
    // a point a day rather than drawing one dot.
    if (points && points.length < 2 && GRAIN !== "day") {
      GRAIN = "day";
      TREND_CACHE.set(key, points);
      return loadPoints();
    }
    POINTS = points && points.length ? points : null;
    TREND_CACHE.set(key, POINTS);
  }

  /* The range and the grain belong to the page, not to one card: both tabs
     draw the same window, so switching tab never switches the question. */
  function onPickChange(pick) {
    if (pick.range) {
      RANGE = pick.range;
      // A grain the new range cannot carry steps back to one it can.
      if (TREND.rangeOf(RANGE).grains.indexOf(GRAIN) < 0) GRAIN = TREND.rangeOf(RANGE).grains[0];
    }
    if (pick.grain) GRAIN = pick.grain;
    try {
      localStorage.setItem(RANGE_KEY, RANGE);
      localStorage.setItem(GRAIN_KEY, GRAIN);
    } catch (e) { /* not remembered, still changed */ }
    [el("tbTrend"), el("tbTopTrend")].forEach((h) => h && h.classList.add("is-loading"));
    Promise.all([loadPoints(), loadTopPoints()]).then(() => {
      [el("tbTrend"), el("tbTopTrend")].forEach((h) => h && h.classList.remove("is-loading"));
      renderTrend();
      render();
      renderTopTab();
    });
  }

  function renderTrend() {
    const host = el("tbTrend");
    if (!host) return;
    if (!TREND || !POINTS) { host.hidden = true; return; }
    TREND.renderMain(host, POINTS, {
      grain: GRAIN, range: RANGE, animate: !DRAWN, onChange: onPickChange,
    });
    TREND.wireSparks(el("tbGroups"));
  }

  /* The line in one product's header: that product's weeks in the section
     being read. Its weighted score only where the section has one to add up
     and the reader has asked for it; otherwise its count. */
  function sparkFor(p, sec) {
    if (!TREND || !POINTS || narrowedWithin()) return "";
    const metric = totalsApply(sec) ? SPARK : "bugs";
    return TREND.productSpark(POINTS, p.key, f.section, metric, { animate: !DRAWN });
  }

  /* The switch above the compartments, and the note that stands in for it
     while the list is filtered. Neither shows when there are no lines. */
  function paintSparkBar(layout) {
    const sec = sectionOf(f.section);
    const lines = !!(TREND && POINTS) && layout === "groups";
    const mode = el("tbSparkMode"), note = el("tbSparkNote");
    if (mode) {
      mode.hidden = !(lines && !narrowedWithin() && totalsApply(sec));
      mode.querySelectorAll("[data-spark]").forEach((b) => {
        const on = b.dataset.spark === SPARK;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
    }
    if (note) note.hidden = !(lines && narrowedWithin());
  }

  /* ── the ten heaviest ────────────────────────────────────────────────────
     The order is the one written down in tools/build-tech-bugs.py, and it has
     to stay in step with it: weighted score first, then the bug with no
     workaround, then the larger scope, then the longest-standing, then the
     workbook's own order. */
  const scopeSize = (v) => {
    const m = /\d[\d,]*/.exec(v == null ? "" : String(v));
    return m ? Number(m[0].replace(/,/g, "")) : -1;
  };
  function rankOpen(rows) {
    return rows.filter((r) => r.section === "active" && Number.isFinite(r.score)).slice().sort((a, b) =>
      b.score - a.score ||
      (hasWorkaround(a.workaround) ? 1 : 0) - (hasWorkaround(b.workaround) ? 1 : 0) ||
      scopeSize(b.scope) - scopeSize(a.scope) ||
      String(a.discovered_on || "2100-01-01").localeCompare(String(b.discovered_on || "2100-01-01")) ||
      a.product_order - b.product_order || a.row_order - b.row_order);
  }
  /* What makes this bug the same bug at the next capture — its first ticket
     number, or its title where the tracker gives none. Matches bug_key() in
     the builder. */
  function bugKey(r) {
    if (r.bug_refs && r.bug_refs.length) return String(r.bug_refs[0].id);
    return oneLine(r.bug_title || r.bug || "").toLowerCase().slice(0, 200);
  }

  async function loadTopPoints() {
    if (!TREND) return;
    const key = GRAIN + "|" + RANGE;
    if (TOP_CACHE.has(key)) { TOP_POINTS = TOP_CACHE.get(key); return; }
    let pts = null;
    try {
      const rows = await SS.db.rpc("tech_bug_top_trend",
        { p_grain: GRAIN, p_since: TREND.since(RANGE, TODAY) });
      pts = (rows || []).map((r) => ({ day: String(r.bucket || "").slice(0, 10), top: r.top || [] }))
        .filter((x) => x.day && x.top.length);
    } catch (err) {
      pts = null;      // the snapshot table is not there yet; the list still works
    }
    TOP_POINTS = pts && pts.length ? pts : null;
    TOP_CACHE.set(key, TOP_POINTS);
  }

  /* ── filters ─────────────────────────────────────────────────────────── */
  function products() {
    const seen = new Map();
    ROWS.forEach((r) => { if (!seen.has(r.product)) seen.set(r.product, { key: r.product, label: r.product_label, order: r.product_order }); });
    return [...seen.values()].sort((a, b) => a.order - b.order);
  }

  function fillFilters() {
    const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
    el("tbProduct").innerHTML = opt("", "All products") + products().map((p) => opt(p.key, p.label)).join("");

    fillOwners();

    el("tbWorkaround").innerHTML = opt("", "Any workaround") +
      opt("yes", "Has a workaround") + opt("no", "No workaround listed");
    el("tbEta").innerHTML = opt("", "Any ETA") + opt("dated", "ETA has a date") +
      opt("passed", "ETA date has passed") + opt("none", "No ETA date yet");
    el("tbSection").innerHTML = SECTIONS.map((s) => {
      const n = ROWS.filter((r) => r.section === s.id).length;
      return opt(s.id, `${s.label} (${n})`);
    }).join("");
    el("tbSort").innerHTML = SORTS.map((s) => opt(s.id, s.label)).join("");
    syncControls();
  }

  /* Only the owners of the section being read — the closed list names teams
     the open one never does — each with how many bugs it would show, so no
     choice leads to an empty page. Rebuilt whenever the section changes; a
     choice that does not exist in the new section is let go. */
  function fillOwners() {
    const rows = ROWS.filter((r) => r.section === f.section);
    const count = {};
    rows.forEach((r) => ownersOf(r.owner).forEach((o) => { count[o] = (count[o] || 0) + 1; }));
    const order = VENDORS.concat([OTHER_OWNER, NO_OWNER]).filter((o) => count[o]);
    if (f.owner && !count[f.owner]) f.owner = "";
    el("tbOwner").innerHTML = `<option value="">Any owner</option>` +
      order.map((o) => `<option value="${esc(o)}">${esc(o)} (${count[o]})</option>`).join("");
    el("tbOwner").value = f.owner;
  }

  function syncControls() {
    el("tbProduct").value = f.product;
    el("tbOwner").value = f.owner;
    el("tbWorkaround").value = f.workaround;
    el("tbEta").value = f.eta;
    el("tbSection").value = f.section;
    el("tbSort").value = f.sort;
    if (el("tbQ").value !== f.q) el("tbQ").value = f.q;
    el("tbClear").hidden = !filtering();
  }

  function etaPassed(r) { return r.section === "active" && isDay(r.eta_on) && r.eta_on < TODAY; }

  function matches(r, ignore) {
    if (r.section !== f.section) return false;
    if (f.product && ignore !== "product" && r.product !== f.product) return false;
    if (f.owner && ignore !== "owner" && ownersOf(r.owner).indexOf(f.owner) < 0) return false;
    if (f.workaround && ignore !== "workaround" &&
        hasWorkaround(r.workaround) !== (f.workaround === "yes")) return false;
    if (f.eta && ignore !== "eta") {
      if (f.eta === "dated" && !isDay(r.eta_on)) return false;
      if (f.eta === "none" && isDay(r.eta_on)) return false;
      if (f.eta === "passed" && !etaPassed(r)) return false;
    }
    const q = f.q.trim().toLowerCase();
    if (q) {
      const hay = [r.bug, r.bug_title, r.summary, r.latest_status, r.workaround, r.owner,
                   r.scope, r.product_label, r.updated_eta,
                   r.bug_refs.map((x) => x.id).join(" ")].join(" \n ").toLowerCase();
      if (q.split(/\s+/).some((w) => hay.indexOf(w) < 0)) return false;
    }
    return true;
  }

  function sorter() {
    const pri = (r) => { const n = parseFloat(r.priority); return Number.isFinite(n) ? n : 9999; };
    const byTracker = (a, b) => pri(a) - pri(b) || a.row_order - b.row_order;
    if (f.sort === "score" || f.sort === "total") {
      return (a, b) => ((Number.isFinite(b.score) ? b.score : -1) - (Number.isFinite(a.score) ? a.score : -1)) || byTracker(a, b);
    }
    if (f.sort === "newest" || f.sort === "oldest") {
      const dir = f.sort === "newest" ? -1 : 1;
      return (a, b) => {
        const da = isDay(a.discovered_on), db = isDay(b.discovered_on);
        if (da !== db) return da ? -1 : 1;              // undated sink either way
        if (!da) return byTracker(a, b);
        return dir * a.discovered_on.localeCompare(b.discovered_on) || byTracker(a, b);
      };
    }
    return byTracker;
  }

  /* ── at a glance ─────────────────────────────────────────────────────────
     Counts over the whole section, not the filtered subset — they are the
     shape of the backlog. Each one that can be a filter is a button that sets
     it, and shows it is set. */
  function renderSummary() {
    const sec = sectionOf(f.section);
    const rows = ROWS.filter((r) => r.section === f.section);
    const productCount = new Set(rows.map((r) => r.product)).size;
    const noWork = rows.filter((r) => !hasWorkaround(r.workaround)).length;
    const passed = rows.filter(etaPassed).length;
    const owners = {};
    rows.forEach((r) => ownersOf(r.owner).forEach((o) => { owners[o] = (owners[o] || 0) + 1; }));

    const chip = (kind, value, on, html) =>
      `<button type="button" class="tb-chip${on ? " is-on" : ""}" data-set="${kind}" data-value="${esc(value)}"
               aria-pressed="${on}">${html}</button>`;

    const ownerChips = VENDORS.filter((v) => owners[v]).map((v) =>
      chip("owner", v, f.owner === v, `${esc(v)} <b>${owners[v]}</b>`)).join("");

    /* The total weighted score of the whole section, alone in the top right
       of the band, its description beneath it. Hidden where there is nothing
       to add up: closed and removed bugs carry a Priority Estimator Score in
       that column instead. */
    const tot = scoreTotal(rows);
    const hero = el("tbHeroScore");
    if (hero) {
      const show = totalsApply(sec) && tot.scored > 0;
      hero.hidden = !show;
      if (show) {
        el("tbHeroScoreN").textContent = fmtNum(tot.total);
        hero.title = `The weighted scores of ${plural(tot.scored, "bug", "bugs")} across ` +
          `${plural(productCount, "product", "products")} added together` +
          (tot.unscored ? ` — ${plural(tot.unscored, "bug has", "bugs have")} no score and ` +
                          `${tot.unscored === 1 ? "is" : "are"} not counted` : "");
      }
    }

    el("tbSummary").innerHTML =
      `<div class="tb-total"><b>${rows.length}</b> ${esc(rows.length === 1 ? sec.one : sec.many)}` +
        (productCount ? ` across <b>${productCount}</b> product${productCount === 1 ? "" : "s"}` : "") + `</div>` +
      `<div class="tb-chips">` +
        (noWork ? chip("workaround", "no", f.workaround === "no",
          `<span class="tb-ico" aria-hidden="true">⊘</span><b>${noWork}</b> with no workaround listed`) : "") +
        (passed ? chip("eta", "passed", f.eta === "passed",
          `<span class="tb-ico" aria-hidden="true">⏱</span><b>${passed}</b> past their updated ETA`) : "") +
        (ownerChips ? `<span class="tb-chips-sep" aria-hidden="true"></span>${ownerChips}` : "") +
      `</div>`;
  }

  /* ── the Top 10 tab ──────────────────────────────────────────────────────
     The list is ranked from the rows on screen, so it can never disagree with
     the backlog behind it. The captures only answer what counting cannot:
     what entered the ten, what dropped out, and how long each has been up. */
  function topTen() { return ROWS ? rankOpen(ROWS).slice(0, TOP_N) : []; }

  /** The day a bug has been in the ten since, unbroken, or null. */
  function inTenSince(key) {
    if (!TOP_POINTS || !TREND) return null;
    return TREND.top.tenure(TOP_POINTS, key);
  }

  function renderTopSummary(ten) {
    const host = el("tbTopSummary");
    if (!host) return;
    const allOpen = ROWS.filter((r) => r.section === "active");
    const weight = ten.reduce((a, r) => a + r.score, 0);
    const whole = scoreTotal(allOpen).total;
    const share = whole ? Math.round((weight / whole) * 100) : 0;
    const byProduct = {};
    ten.forEach((r) => { byProduct[r.product_label] = (byProduct[r.product_label] || 0) + 1; });
    const worst = Object.entries(byProduct).sort((a, b) => b[1] - a[1])[0];
    const noWork = ten.filter((r) => !hasWorkaround(r.workaround)).length;
    const passed = ten.filter(etaPassed).length;
    const dated = ten.map((r) => r.discovered_on).filter(isDay).sort();
    const oldest = dated.length ? daysSince(dated[0]) : null;

    host.innerHTML =
      `<div class="tt-weight">
         <div class="tt-weight-n">${fmtNum(weight)}</div>
         <div class="tt-weight-l">Weight the ten carry</div>
         <p class="tt-weight-d">${share}% of the ${fmtNum(whole)} on the whole open backlog,
            from ${plural(ten.length, "bug", "bugs")} of ${allOpen.length}.</p>
       </div>
       <div class="tt-chips">
         ${worst ? `<span class="tt-chip"><b>${worst[1]}</b> in ${esc(worst[0])}</span>` : ""}
         <span class="tt-chip">across <b>${Object.keys(byProduct).length}</b> products</span>
         ${noWork ? `<span class="tt-chip is-warn"><span class="tb-ico" aria-hidden="true">⊘</span>
            <b>${noWork}</b> with no workaround</span>` : ""}
         ${passed ? `<span class="tt-chip is-warn"><span class="tb-ico" aria-hidden="true">⏱</span>
            <b>${passed}</b> past ${passed === 1 ? "its" : "their"} ETA</span>` : ""}
         ${oldest != null ? `<span class="tt-chip">oldest open <b>${fmtNum(oldest)}</b> days</span>` : ""}
       </div>`;
  }

  /* What changed at the top since the capture before: named, not counted. */
  function movementHtml() {
    if (!TOP_POINTS || TOP_POINTS.length < 2 || !TREND) {
      return `<p class="tt-move is-quiet">${TOP_POINTS
        ? "The first capture on record — what enters and leaves the ten shows from the next one."
        : "Once supabase/tech-bugs.sql has recorded a capture of the heaviest bugs, this says what entered the ten and what dropped out."}</p>`;
    }
    const now = TOP_POINTS[TOP_POINTS.length - 1], was = TOP_POINTS[TOP_POINTS.length - 2];
    const inn = TREND.top.entrants(now, was) || [], out = TREND.top.leavers(now, was);
    const list = (bugs) => bugs.map((b) =>
      `<span class="tt-move-b"><i class="tb-trk">${esc(b.label)}</i>${esc(b.title)}
         <b>${fmtNum(Number(b.score))}</b></span>`).join("");
    if (!inn.length && !out.length) {
      return `<p class="tt-move is-quiet">The same ten as ${esc(fmtDay(was.day))} — no changes at the top.</p>`;
    }
    return `<div class="tt-move">
      ${inn.length ? `<div class="tt-move-side"><h4>Into the ten since ${esc(fmtDay(was.day))}</h4>${list(inn)}</div>` : ""}
      ${out.length ? `<div class="tt-move-side is-out"><h4>Out of the ten</h4>${list(out)}</div>` : ""}
    </div>`;
  }

  function topCard(r, rank) {
    const sec = sectionOf("active");
    const key = keyOf(r);
    const open = OPEN_BUG === key;
    const eta = etaText(r), passed = etaPassed(r), disc = discoveredText(r);
    const age = isDay(r.discovered_on) ? daysSince(r.discovered_on) : null;
    const scope = scopeText(r.scope);
    const work = hasWorkaround(r.workaround);
    const since = inTenSince(bugKey(r));
    const dash = '<span class="tb-dash">—</span>';
    const etaFull = r.updated_eta && !isDay(r.updated_eta) ? String(r.updated_eta) : "";

    return `
      <article class="tt-bug${open ? " is-open" : ""}${work ? "" : " no-work"}" data-key="${esc(key)}">
        <button type="button" class="tt-bug-head" aria-expanded="${open}">
          <span class="tt-rank${rank <= 3 ? " is-top" : ""}" aria-label="Number ${rank}">${rank}</span>
          <span class="tt-bug-main">
            <span class="tt-bug-top">
              <span class="tb-trk">${esc(r.product_label)}</span>
              ${r.bug_refs.length ? `<span class="tb-refs">${refsHtml(r)}</span>` : ""}
              ${work ? "" : `<span class="tb-nowork"><span aria-hidden="true">⊘</span> No workaround</span>`}
              ${since ? `<span class="tt-since" title="${esc("In the top ten since " + fmtDay(since))}">in the ten since ${esc(fmtDay(since))}</span>` : ""}
            </span>
            <span class="tb-bug-title">${esc(titleOf(r))}</span>
            <span class="tb-bug-meta">
              <span><em>Owner</em> ${r.owner ? esc(oneLine(r.owner)) : dash}</span>
              <span><em>Scope</em> ${scope ? esc(oneLine(scope)) : dash}</span>
              <span class="tb-eta${passed ? " is-passed" : ""}"${etaFull ? ` title="${esc(oneLine(etaFull))}"` : ""}>
                <em>Updated ETA</em> ${eta ? esc(eta) : dash}
                ${passed ? ` <b class="tb-flag"><span aria-hidden="true">⏱</span> passed</b>` : ""}</span>
              <span><em>Discovered</em> ${disc ? esc(disc) : dash}${age != null && age >= 0 ? ` <small>· ${plural(age, "day", "days")}</small>` : ""}</span>
            </span>
          </span>
          ${scoreBlock(r, sec)}
          <svg class="tb-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="tb-bug-body"${open ? "" : " hidden"}>
          <dl class="tb-fields">
            ${field("Summary", r.summary ? esc(r.summary) : null)}
            ${field("Workaround", r.workaround ? esc(r.workaround) : null, work ? "" : "is-muted")}
            ${field(sec.status, r.latest_status ? esc(r.latest_status) : null)}
            ${etaFull.length > 30 || /\n/.test(etaFull) ? field("Updated ETA", esc(etaFull), passed ? "is-passed" : "") : ""}
            ${field(sec.score, Number.isFinite(r.score) ? String(r.score) : null, "is-score", SCORE_NOTE)}
          </dl>
        </div>
      </article>`;
  }

  function renderTopTab() {
    if (!ROWS || !el("tbTopList")) return;
    const ten = topTen();
    renderTopSummary(ten);
    const host = el("tbTopList");
    host.innerHTML = ten.length
      ? `<p class="tt-note">Ranked by weighted score. Where two bugs score the same, the one with no
           workaround comes first, then the one affecting more students, then the longest-standing.</p>` +
        ten.map((r, i) => topCard(r, i + 1)).join("")
      : `<div class="ei-empty"><strong>No scored bugs on the open backlog.</strong>
           <p>The tracker has no weighted scores to rank this week.</p></div>`;

    const trend = el("tbTopTrend");
    if (trend && TREND && TOP_POINTS) {
      TREND.renderTop(trend, TOP_POINTS, {
        grain: GRAIN, range: RANGE, animate: !DRAWN, after: movementHtml(),
        onChange: onPickChange,
      });
    } else if (trend) {
      trend.hidden = false;
      trend.innerHTML = `<div class="tr-head"><h3 class="tr-title">The top ten over time</h3></div>` + movementHtml();
    }
  }

  /* ── one bug ─────────────────────────────────────────────────────────── */
  function refsHtml(r) {
    return r.bug_refs.map((x) =>
      `<span class="tb-ref">${x.vendor ? `<i>${esc(x.vendor)}</i> ` : "#"}${esc(x.id)}</span>`).join("");
  }

  function titleOf(r) {
    if (r.bug_title) return r.bug_title;
    if (r.bug_refs.length) return "Bug " + r.bug_refs.map((x) => x.id).join(", ");
    return oneLine(r.bug) || "Untitled";
  }

  function scopeText(s) {
    if (s == null || s === "") return null;
    return /^\d+$/.test(String(s)) ? Number(s).toLocaleString("en-US") : String(s);
  }

  function etaText(r) {
    if (!r.updated_eta) return null;
    return isDay(r.updated_eta) ? fmtDay(r.updated_eta) : oneLine(r.updated_eta);
  }

  function discoveredText(r) {
    if (!r.discovered) return null;
    return isDay(r.discovered) ? fmtDay(r.discovered) : r.discovered;
  }

  function scoreBlock(r, sec) {
    if (Number.isFinite(r.score)) {
      const pct = Math.max(3, Math.min(100, (r.score / MAX_SCORE) * 100));
      return `<span class="tb-score" title="${esc(sec.score)} ${r.score}">
                <span class="tb-score-n">${r.score}</span>
                <span class="tb-meter" aria-hidden="true"><i style="width:${pct.toFixed(1)}%"></i></span>
                <span class="tb-score-l">${esc(sec.score === "Weighted Score" ? "Weighted score" : sec.score)}</span>
              </span>`;
    }
    const said = r.weighted_score && r.weighted_score.length <= 12 ? r.weighted_score : null;
    return `<span class="tb-score is-none">
              <span class="tb-score-n">${esc(said || "—")}</span>
              <span class="tb-score-l">${said ? esc(sec.score === "Weighted Score" ? "Weighted score" : sec.score) : "Not scored"}</span>
            </span>`;
  }

  function field(label, value, cls, note) {
    return `<div class="tb-field${cls ? " " + cls : ""}">
              <dt>${esc(label)}${note ? ` <span class="tb-field-note">${esc(note)}</span>` : ""}</dt>
              <dd>${value == null || value === "" ? '<span class="tb-blank">Not recorded</span>' : value}</dd>
            </div>`;
  }

  function bugCard(r, withTracker) {
    const sec = sectionOf(r.section);
    const key = keyOf(r);
    const open = OPEN_BUG === key;
    const eta = etaText(r);
    const passed = etaPassed(r);
    const disc = discoveredText(r);
    const age = r.section === "active" && isDay(r.discovered_on) ? daysSince(r.discovered_on) : null;
    const scope = scopeText(r.scope);
    const work = hasWorkaround(r.workaround);

    const dash = '<span class="tb-dash">—</span>';
    const etaFull = r.updated_eta && !isDay(r.updated_eta) ? String(r.updated_eta) : "";
    const meta = [
      `<span><em>Owner</em> ${r.owner ? esc(oneLine(r.owner)) : dash}</span>`,
      `<span><em>Scope</em> ${scope ? esc(oneLine(scope)) : dash}</span>`,
      `<span class="tb-eta${passed ? " is-passed" : ""}"${etaFull ? ` title="${esc(oneLine(etaFull))}"` : ""}>` +
        `<em>Updated ETA</em> ${eta ? esc(eta) : dash}` +
        (passed ? ` <b class="tb-flag"><span aria-hidden="true">⏱</span> passed</b>` : "") + `</span>`,
      `<span><em>Discovered</em> ${disc ? esc(disc) : dash}` +
        `${age != null && age >= 0 ? ` <small>· ${plural(age, "day", "days")}</small>` : ""}</span>`,
    ].join("");

    // The score's full wording belongs to the Weighted Score column only; the
    // closed and removed sections head that column differently.
    const scoreValue = Number.isFinite(r.score) ? String(r.score)
      : (r.weighted_score ? esc(r.weighted_score) : null);

    return `
      <article class="tb-bug${open ? " is-open" : ""}${work ? "" : " no-work"}" data-key="${esc(key)}">
        <button type="button" class="tb-bug-head" aria-expanded="${open}">
          <span class="tb-pri" title="Priority ${esc(r.priority || "—")}">
            <small>P</small>${esc(r.priority || "—")}
          </span>
          <span class="tb-bug-main">
            <span class="tb-bug-top">
              ${withTracker ? `<span class="tb-trk">${esc(r.product_label)}</span>` : ""}
              ${r.bug_refs.length ? `<span class="tb-refs">${refsHtml(r)}</span>` : ""}
              ${r.section !== "active" ? `<span class="tb-sec">${esc(sec.label)}</span>` : ""}
              ${work ? "" : `<span class="tb-nowork"><span aria-hidden="true">⊘</span> No workaround</span>`}
            </span>
            <span class="tb-bug-title">${esc(titleOf(r))}</span>
            <span class="tb-bug-meta">${meta}</span>
          </span>
          ${scoreBlock(r, sec)}
          <svg class="tb-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="tb-bug-body"${open ? "" : " hidden"}>
          <dl class="tb-fields">
            ${field("Summary", r.summary ? esc(r.summary) : null)}
            ${field("Workaround", r.workaround ? esc(r.workaround) : null, work ? "" : "is-muted")}
            ${field(sec.status, r.latest_status ? esc(r.latest_status) : null)}
            ${etaFull.length > 30 || /\n/.test(etaFull)
              ? field("Updated ETA", esc(etaFull), passed ? "is-passed" : "") : ""}
            ${field(sec.score, scoreValue, "is-score", sec.score === "Weighted Score" ? SCORE_NOTE : null)}
          </dl>
        </div>
      </article>`;
  }

  /* Finance keeps two procedures under its bugs. Folded by default: they are
     for the moment somebody needs them, not for reading past every time. */
  function notesHtml(product) {
    const mine = NOTES.filter((n) => n.product === product);
    if (!mine.length) return "";
    const heading = mine[0].heading || "Notes";
    return `
      <details class="tb-notes">
        <summary><span class="tb-notes-ico" aria-hidden="true">✎</span>${esc(heading)}
          <small>${mine.length}</small></summary>
        <div class="tb-notes-body">
          ${mine.map((n) => `
            <div class="tb-note">
              <h4>${esc(n.title)}</h4>
              ${String(n.body || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
                  .map((p) => `<p>${esc(p)}</p>`).join("")}
            </div>`).join("")}
        </div>
      </details>`;
  }

  /* ── the compartments ────────────────────────────────────────────────── */
  function render() {
    if (!ROWS) return;
    syncControls();
    renderSummary();
    if (TREND) TREND.hideSparkTip();

    const sec = sectionOf(f.section);
    const all = ROWS.filter((r) => r.section === f.section);
    const shown = ROWS.filter((r) => matches(r));
    const host = el("tbGroups");

    const shownTot = scoreTotal(shown), allTot = scoreTotal(all);
    el("tbCountLine").textContent = filtering()
      ? `Showing ${shown.length} of ${plural(all.length, sec.one, sec.many)}` +
        (totalsApply(sec) && allTot.scored ? ` · total score ${fmtNum(shownTot.total)} of ${fmtNum(allTot.total)}` : "")
      : "";

    if (!shown.length) {
      paintSparkBar("none");
      host.innerHTML = all.length
        ? `<div class="ei-empty"><strong>Nothing matches.</strong>
             <p>No ${esc(sec.many)} match these filters. <button type="button" class="tb-link" data-clear>Clear the filters</button></p></div>`
        : `<div class="ei-empty"><strong>No ${esc(sec.many)}.</strong>
             <p>The TS Product Tracker lists none this week.</p></div>`;
      return;
    }

    const sort = sorter();
    const order = sortOf(f.sort);
    paintSparkBar(order.layout);

    if (order.layout === "list") {
      const list = shown.slice().sort(sort);
      const productCount = new Set(list.map((r) => r.product)).size;
      host.innerHTML = `
        <div class="tb-list">
          <p class="tb-list-head"><b>${plural(list.length, sec.one, sec.many)}</b>
            ${productCount > 1 ? `across ${productCount} products, ` : ""}${esc(order.heading)}</p>
          ${list.map((r) => bugCard(r, true)).join("")}
        </div>`;
      return;
    }

    const narrowed = filtering();
    const groups = products()
      .map((p) => ({ p, rows: shown.filter((r) => r.product === p.key).sort(sort) }))
      .filter((g) => g.rows.length);
    if (f.sort === "total") {
      // Heaviest first; a tracker with nothing scored goes last rather than
      // being ranked as though its bugs weighed nothing.
      const weight = (g) => { const t = scoreTotal(g.rows); return t.scored ? t.total : -1; };
      groups.sort((a, b) => weight(b) - weight(a) || a.p.order - b.p.order);
    }
    // Bars are scaled to the heaviest compartment on screen, so the longest
    // one is the tracker carrying the most weight. The number is printed; the
    // bar only makes ten of them quick to compare down the page.
    const heaviest = Math.max(1, ...groups.map((g) => scoreTotal(g.rows).total));

    host.innerHTML = groups.map(({ p, rows }) => {
      const open = narrowed ? !COLLAPSED.has(p.key) : OPEN_GROUP === p.key;
      const scores = rows.map((r) => r.score).filter((n) => Number.isFinite(n));
      const noWork = rows.filter((r) => !hasWorkaround(r.workaround)).length;
      const passed = rows.filter(etaPassed).length;
      const tot = scoreTotal(rows);
      const meta = [
        `<b>${rows.length}</b> ${esc(rows.length === 1 ? sec.one : sec.many)}`,
        f.section === "active" && scores.length ? `top score <b>${Math.max(...scores)}</b>` : "",
        f.section === "active" && noWork ? `<b>${noWork}</b> with no workaround` : "",
        passed ? `<b class="is-passed">${passed}</b> past ${passed === 1 ? "its" : "their"} ETA` : "",
        totalsApply(sec) && tot.unscored && tot.scored ? `<b>${tot.unscored}</b> not scored` : "",
      ].filter(Boolean).join(" · ");

      const total = !totalsApply(sec) ? "" : tot.scored
        ? `<span class="tb-group-total" title="${esc(`The weighted scores of ${plural(tot.scored, "bug", "bugs")} in ${p.label} added together` +
              (tot.unscored ? ` — ${plural(tot.unscored, "bug has", "bugs have")} no score and ${tot.unscored === 1 ? "is" : "are"} not counted` : ""))}">
             <span class="tb-gt-l">Total score</span>
             <span class="tb-gt-n">${fmtNum(tot.total)}</span>
             <span class="tb-gt-bar" aria-hidden="true"><i style="width:${Math.max(2, tot.total / heaviest * 100).toFixed(1)}%"></i></span>
           </span>`
        : `<span class="tb-group-total is-none" title="None of the ${plural(rows.length, "bug", "bugs")} here has a weighted score">
             <span class="tb-gt-l">Total score</span>
             <span class="tb-gt-n">—</span>
             <span class="tb-gt-sub">Not scored</span>
           </span>`;

      return `
        <section class="tb-group${open ? " is-open" : ""}" data-product="${esc(p.key)}">
          <button type="button" class="tb-group-head" aria-expanded="${open}">
            <span class="tb-group-chev" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <polyline points="6 9 12 15 18 9"/></svg>
            </span>
            <span class="tb-group-text">
              <span class="tb-group-name">${esc(p.label)}</span>
              <span class="tb-group-meta">${meta}</span>
            </span>
            ${sparkFor(p, sec)}
            ${total}
          </button>
          <div class="tb-group-body"${open ? "" : " hidden"}>
            ${f.section === "active" ? notesHtml(p.key) : ""}
            ${rows.map(bugCard).join("")}
          </div>
        </section>`;
    }).join("");
  }

  /* ── wiring ──────────────────────────────────────────────────────────── */
  function onFilterChange() {
    COLLAPSED.clear();          // a new search starts with everything it found open
    OPEN_BUG = null;
    render();
  }

  function wireBugs() {
    const bind = (id, key) => el(id).addEventListener("change", () => {
      f[key] = el(id).value;
      if (key === "section") { OPEN_GROUP = null; fillOwners(); }
      onFilterChange();
    });
    bind("tbProduct", "product");
    bind("tbOwner", "owner");
    bind("tbWorkaround", "workaround");
    bind("tbEta", "eta");
    bind("tbSection", "section");
    bind("tbSort", "sort");

    let t = null;
    el("tbQ").addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { f.q = el("tbQ").value; onFilterChange(); }, 140);
    });

    const clear = () => {
      f.product = f.owner = f.workaround = f.eta = f.q = "";
      onFilterChange();
    };
    el("tbClear").addEventListener("click", clear);

    el("tbSummary").addEventListener("click", (e) => {
      const c = e.target.closest("[data-set]");
      if (!c) return;
      const k = c.dataset.set, v = c.dataset.value;
      f[k] = f[k] === v ? "" : v;
      onFilterChange();
    });

    // The line in each product: its count or its weighted score. Redrawing
    // keeps whichever compartment is open, open.
    const mode = el("tbSparkMode");
    if (mode) mode.addEventListener("click", (e) => {
      const b = e.target.closest("[data-spark]");
      if (!b || b.dataset.spark === SPARK) return;
      SPARK = b.dataset.spark;
      try { localStorage.setItem(SPARK_KEY, SPARK); } catch (err) { /* not remembered, still switched */ }
      render();
    });

    // The chart is drawn to its width in pixels, so it is redrawn when that
    // changes — once the resizing has settled, and only while it is showing.
    let rt = null;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const t = SUB === "top" ? el("tbTopTrend") : el("tbTrend");
        if (t && t._redraw && !t.hidden && !el("tbView").hidden) t._redraw();
      }, 160);
    });

    // Delegated: the compartments are redrawn on every filter change.
    el("tbGroups").addEventListener("click", (e) => {
      if (e.target.closest("[data-clear]")) return clear();

      const bh = e.target.closest(".tb-bug-head");
      if (bh) {
        const card = bh.closest(".tb-bug");
        const key = card.dataset.key;
        const was = OPEN_BUG === key;
        // One open at a time, toggled in place — redrawing would lose the
        // reader's scroll position in a long compartment.
        el("tbGroups").querySelectorAll(".tb-bug.is-open").forEach((c) => {
          c.classList.remove("is-open");
          c.querySelector(".tb-bug-head").setAttribute("aria-expanded", "false");
          c.querySelector(".tb-bug-body").hidden = true;
        });
        OPEN_BUG = was ? null : key;
        if (!was) {
          card.classList.add("is-open");
          bh.setAttribute("aria-expanded", "true");
          card.querySelector(".tb-bug-body").hidden = false;
        }
        return;
      }

      const gh = e.target.closest(".tb-group-head");
      if (gh) {
        const sec = gh.closest(".tb-group");
        const key = sec.dataset.product;
        if (filtering()) {
          if (COLLAPSED.has(key)) COLLAPSED.delete(key); else COLLAPSED.add(key);
          const isOpen = !COLLAPSED.has(key);
          sec.classList.toggle("is-open", isOpen);
          gh.setAttribute("aria-expanded", String(isOpen));
          sec.querySelector(".tb-group-body").hidden = !isOpen;
          return;
        }
        OPEN_GROUP = OPEN_GROUP === key ? null : key;
        el("tbGroups").querySelectorAll(".tb-group").forEach((g) => {
          const isIt = g === sec && OPEN_GROUP === key;
          g.classList.toggle("is-open", isIt);
          g.querySelector(".tb-group-head").setAttribute("aria-expanded", String(isIt));
          g.querySelector(".tb-group-body").hidden = !isIt;
        });
      }
    });
  }

  /* ── start ───────────────────────────────────────────────────────────── */
  async function start() {
    if (!el("eiViews") || !el("tbView")) return;
    REGISTER.eyebrow = el("eiEyebrow") ? el("eiEyebrow").textContent.trim() : "";
    REGISTER.title = el("eiTitle") ? el("eiTitle").innerHTML.trim() : "";
    REGISTER.lead = el("eiLead") ? el("eiLead").textContent.trim() : "";
    REGISTER.doc = document.title;
    try { await (window.SS.access && window.SS.access.ready); } catch (e) { /* carry on */ }
    // Nothing is fetched for a reader the page is walled to; the database
    // would refuse them the rows regardless.
    if (!window.SS.access || !window.SS.access.canSeeEmergingIssues) return;

    wireViews();
    wireSubs();
    wireTopList();
    wireBugs();
    switchSub(ASKED_FOR_SUB, false);
    if (ASKED_FOR_BUGS) setView("bugs", false);
    else if (ASKED_FOR_NOTES) setView("notes", false);
    else loadCount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
