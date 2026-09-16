/* ═══════════════════════════════════════════════════════════════════════════
   TECHNICAL BUGS BACKLOG — the second tab of the Emerging Issues page

   Technical Support's own tracker, not something raised here. Every row comes
   from the TS Product Tracker workbook: tools/build-tech-bugs.py turns it into
   supabase/tech-bugs.sql, and running that replaces this week's list. Nothing
   on this tab writes to the database, and there is no form.

   One compartment per tracker tab — Admissions / EE, Finance, Canvas, … — the
   way the OKR page groups its sub-key results: a header that says what is
   inside, and the bugs under it. Opening one closes the others, until the
   reader filters or searches; then every compartment with a match opens, since
   the point of searching is to see what was found.

   Each bug carries the ten columns the tracker keeps for it: Priority,
   Discovered, Bug / ADO, Scope, Summary, Owner, Updated ETA, Workaround, Latest
   Status and Weighted Score. The face of the card holds what tells two bugs
   apart at a glance; opening it shows the rest.

   Under the summary, the backlog week by week; in each compartment's header,
   that product's own line. Both are drawn by js/tech-bugs-trend.js from
   tech_bug_history, which each weekly run of the SQL adds a week to. Without
   that table, or before its first week, the tab simply has no lines.

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
  const ASKED_FOR_BUGS = location.hash === "#bugs";

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

  let HISTORY = null;           // one row per week, product and section; null when none
  let DRAWN = false;            // the lines draw themselves in once, not on every filter
  const TREND = window.TBTrend || null;
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
  const BUGS = {
    eyebrow: "Technical Support",
    title: 'Technical Bugs <span>Backlog</span>',
    lead: "Open bugs Technical Support is tracking with ICS, Ellucian and Digital Ops, " +
          "from the TS Product Tracker.",
    doc: "Technical Bugs Backlog — Student Services — BYU-Pathway Worldwide",
  };

  function setView(view, fromReader) {
    const bugs = view === "bugs";
    el("eiRegister").hidden = bugs;
    el("tbView").hidden = !bugs;
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
    const words = bugs ? BUGS : REGISTER;
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
      history.replaceState(null, "", bugs ? "#bugs" : location.pathname + location.search);
    }
    if (bugs) {
      load();
      // Drawn at the width it had; the window may have changed while the
      // register was showing.
      const t = el("tbTrend");
      if (t && t._redraw) t._redraw();
    }
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
    const c = el("tbViewCount");
    if (!c) return;
    c.textContent = n;
    c.hidden = !n;
  }

  function load() {
    if (LOADING) return LOADING;
    LOADING = Promise.all([
      SS.db.select("tech_bugs", { order: "product_order.asc,row_order.asc" }),
      // The notes and the history are niceties; a missing table must not
      // cost the bugs.
      SS.db.select("tech_bug_notes", { order: "note_order.asc" }).catch(() => []),
      TREND ? SS.db.select("tech_bug_history", { order: "captured_on.asc,product_order.asc" }).catch(() => null)
            : Promise.resolve(null),
    ]).then(([rows, notes, hist]) => {
      ROWS = (rows || []).map((r) => Object.assign({}, r, {
        score: r.score == null || r.score === "" ? null : Number(r.score),
        bug_refs: Array.isArray(r.bug_refs) ? r.bug_refs : [],
      }));
      NOTES = notes || [];
      HISTORY = Array.isArray(hist) && hist.length ? hist : null;
      const open = ROWS.filter((r) => r.section === "active");
      MAX_SCORE = Math.max(1, ...open.map((r) => r.score).filter((n) => Number.isFinite(n)));
      paintCount(open.length);
      paintSource();
      fillFilters();
      renderTrend();
      render();
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

  // Where the list comes from and how often. The date the workbook was saved
  // is not repeated here: the chart under the summary already shows it.
  function paintSource() {
    el("tbSource").textContent = "From the TS Product Tracker, updated weekly.";
  }

  /* ── the weeks behind it ─────────────────────────────────────────────── */
  function renderTrend() {
    const host = el("tbTrend");
    if (!host) return;
    if (!TREND || !HISTORY) { host.hidden = true; return; }
    TREND.renderMain(host, HISTORY, { animate: !DRAWN });
    TREND.wireSparks(el("tbGroups"));
  }

  /* The line in one product's header: that product's weeks in the section
     being read. Its weighted score only where the section has one to add up
     and the reader has asked for it; otherwise its count. */
  function sparkFor(p, sec) {
    if (!TREND || !HISTORY || narrowedWithin()) return "";
    const metric = totalsApply(sec) ? SPARK : "bugs";
    return TREND.productSpark(HISTORY, p.key, f.section, metric, { animate: !DRAWN });
  }

  /* The switch above the compartments, and the note that stands in for it
     while the list is filtered. Neither shows when there are no lines. */
  function paintSparkBar(layout) {
    const sec = sectionOf(f.section);
    const lines = !!(TREND && HISTORY) && layout === "groups";
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
        const t = el("tbTrend");
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
    wireBugs();
    if (ASKED_FOR_BUGS) setView("bugs", false);
    else loadCount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
