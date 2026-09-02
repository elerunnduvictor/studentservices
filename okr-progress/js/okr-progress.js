/* ═══════════════ OKR PROGRESS — LOGIC ═══════════════ */
const ROWS = window.OKR_PROGRESS_ROWS;
const OKR_COLORS = window.OKR_COLORS;
const STATUS_COLORS = window.STATUS_COLORS;
const SKR_COLORS = window.SKR_COLORS;

/* Resolve effective status — most rows now carry an explicit Status from
   Excel, but a handful are blank. Fall back so visuals never have a
   "missing" bucket. */
function effectiveStatus(r) {
  if (r.status) return r.status;
  if (r.progress == null) return "Not Started";
  return "On Track";
}

/* ═══════════════ STATE ═══════════════ */
const state = {
  okr: "All",
  status: "All",
  stakeholder: "All",
  secondaryStakeholder: "All",
  pm: "All",
  period: "All",
  search: "",
  spotlight: "",
  spotlightIdx: -1,
  spotlightOpen: false,
  /* Which objective card is open below — one at a time, like an accordion.
     Two open at once is most of the way back to the wall of rows this list
     replaced.
  
     Kept here rather than read back from the DOM because renderAll()
     rebuilds that list on every filter change and every search keystroke.
  
     `autoOpenedFor` remembers which objective the filter opened for us, so
     opening one automatically does not fight a reader who then closes it:
     without it the next keystroke in the search box would open it again. */
  openGroup: null,
  /* And which sub-key result is open inside it — the same accordion, one level
     in. Separate from openGroup because they nest: closing an objective should
     not forget which of its sub-groups you had open. */
  openSub: null,
  autoOpenedFor: null,
};

/* ═══════════════ HELPERS (shared via window.SS) ═══════════════ */
const escapeHtml = window.SS.escapeHtml;
const unique = window.SS.unique;
function pct(v) { return Math.round((v || 0) * 100); }
/* Display unit for a row's metric — KPI #-typed rows are raw counts
   (e.g. "9 / 5"), everything else renders as a percentage. */
function unitOf(r) { return r && r.type && /#/.test(r.type) ? "" : "%"; }
function formatValue(v, r) {
  if (v == null) return "—";
  return pct(v) + unitOf(r);
}
/* Stretch goals come in three shapes from Profit.co:
     • a positive number (a real stretch target)
     • null            (no stretch goal recorded)
     • 0               (placeholder when there's no stretch beyond the goal)
   The 0 case is treated as "no stretch goal" for display. */
function hasStretch(r) { return r && r.stretchGoal != null && r.stretchGoal !== 0; }
function initials(name) {
  if (!name) return "—";
  return name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
/* Secondary stakeholders arrive from Profit.co as one comma-separated string
   ("Kari Johnson, Tyson Bell, Anne Owen") — split it into individual people. */
function secondaryList(value) {
  if (!value) return [];
  return String(value).split(/[,;]/).map(s => s.trim()).filter(Boolean);
}
function okrPalette(name) {
  return OKR_COLORS[name] || { bg: "#065577", light: "#28738A", pale: "rgba(6,85,119,0.12)" };
}
function skrPalette(r) {
  return (SKR_COLORS && SKR_COLORS[r.id]) || okrPalette(r.okr);
}
function statusPalette(s) {
  return STATUS_COLORS[s] || STATUS_COLORS["Not Started"];
}
function highlight(text, q) {
  if (!q) return escapeHtml(text);
  const safe = escapeHtml(text);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  return safe.replace(re, '<span class="hl">$1</span>');
}
function darken(hex, amt = 0.18) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0,2), 16), g = parseInt(c.slice(2,4), 16), b = parseInt(c.slice(4,6), 16);
  const f = (n) => Math.max(0, Math.min(255, Math.round(n * (1 - amt))));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}
/* Format an ISO date string (yyyy-mm-dd) as "Mon DD, YYYY". */
function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/* Decide how a row's progress bar should be scaled:
   - "completion" — goal is full completion (1.0) or unset. Bar fills 0→100%
     reading the raw progress fraction; the bar IS the journey to 100%.
   - "target"     — goal is a specific target (< 1.0) and progress is still
     below it (e.g. 69% actual vs 75% goal). Bar fills 0→goal, so "full bar"
     = goal achieved, and you can see how close you are.
   - "exceeded"   — goal is a specific target (< 1.0) and progress is at or
     above it (e.g. 87% actual vs 85% goal). Bar switches to the 0→100 scale
     so the real achievement shows on the bar instead of clamping to "full."
   Returns null if there is no progress value to plot. */
function progressBarInfo(r) {
  if (r.progress == null) return null;
  const isDecrease = r.type && /Decrease/i.test(r.type);
  /* For a count row `progress * 100` is not a percentage of anything, so the
     bar reads its attainment instead. No such row exists today — both count
     rows are decreases, which take the ratio branch below — but a
     "KPI # - Increase" would otherwise fill the bar to 100% whatever it stood
     at, and that is a silent wrong answer rather than a visible one. */
  const attain = window.SS.okr.attainment(r);
  const progressPct = window.SS.okr.isCount(r)
    ? (attain === null ? 0 : Math.round(attain * 100))
    : pct(r.progress);
  const goalPct = r.goal != null ? pct(r.goal) : null;
  const progressDisplay = formatValue(r.progress, r);
  const goalDisplay = goalPct != null ? formatValue(r.goal, r) : null;

  // No goal — straight 0-100 scale showing the raw value.
  if (r.goal == null) {
    return {
      mode: "completion",
      progressPct, goalPct, progressDisplay, goalDisplay,
      barFill: Math.max(0, Math.min(100, progressPct)),
      exceeded: false,
      tooltip: `Progress ${progressDisplay}`
    };
  }

  // Increase-style item with a "full completion" goal (1.0): 0–100 scale.
  if (!isDecrease && r.goal >= 1) {
    return {
      mode: "completion",
      progressPct, goalPct, progressDisplay, goalDisplay,
      barFill: Math.max(0, Math.min(100, progressPct)),
      exceeded: false,
      tooltip: `Progress ${progressDisplay} / Goal ${goalDisplay}`
    };
  }

  // Has the goal been met? Direction depends on whether we want
  // the metric to go up (Increase / Milestone) or down (Decrease).
  const goalMet = isDecrease ? (r.progress <= r.goal) : (r.progress >= r.goal);

  if (goalMet) {
    return {
      mode: "exceeded",
      progressPct, goalPct, progressDisplay, goalDisplay,
      // Increase: show the raw 0-100 value so the achievement is visible.
      // Decrease: meeting/beating a low number → just show the bar full.
      barFill: isDecrease ? 100 : Math.max(0, Math.min(100, progressPct)),
      exceeded: true,
      tooltip: `Progress ${progressDisplay} / Goal ${goalDisplay} · goal met`
    };
  }

  // Goal not met yet — bar tracks "how close to goal":
  //   Increase: progress / goal  (climbing toward goal)
  //   Decrease: goal / progress  (shrinking toward goal)
  const ratio = isDecrease
    ? (r.goal / r.progress) * 100
    : (r.progress / r.goal) * 100;
  return {
    mode: "target",
    progressPct, goalPct, progressDisplay, goalDisplay,
    direction: isDecrease ? "decrease" : "increase",
    barFill: Math.max(0, Math.min(100, ratio)),
    exceeded: false,
    tooltip: `Progress ${progressDisplay} / Goal ${goalDisplay}`
  };
}

/* ═══════════════ FILTER ═══════════════ */
function getFiltered() {
  const q = state.search.trim().toLowerCase();
  return ROWS.filter(r => {
    if (state.okr !== "All" && r.okr !== state.okr) return false;
    if (state.status !== "All" && effectiveStatus(r) !== state.status) return false;
    if (state.stakeholder !== "All" && r.stakeholder !== state.stakeholder) return false;
    if (state.secondaryStakeholder !== "All" && !secondaryList(r.secondaryStakeholders).includes(state.secondaryStakeholder)) return false;
    if (state.pm !== "All" && r.projectManager !== state.pm) return false;
    if (state.period !== "All" && r.period !== state.period) return false;
    if (q) {
      const hay = `${r.okr} ${r.keyResult} ${r.subKeyResult} ${r.stakeholder} ${r.secondaryStakeholders || ""} ${r.projectManager}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ═══════════════ RENDER: FILTERS ═══════════════ */
function renderFilters() {
  const okrs = ["All", ...unique(ROWS.map(r => r.okr))];
  const statuses = ["All", ...unique(ROWS.map(r => effectiveStatus(r))).sort()];
  const stakeholders = ["All", ...unique(ROWS.map(r => r.stakeholder)).sort()];
  const secondaryStakeholders = ["All", ...unique(ROWS.flatMap(r => secondaryList(r.secondaryStakeholders))).sort()];
  const pms = ["All", ...unique(ROWS.map(r => r.projectManager)).sort()];
  const periods = ["All", ...unique(ROWS.map(r => r.period)).sort()];

  const setOpts = (id, list, sel, labelMap) => {
    const el = document.getElementById(id);
    el.innerHTML = list.map(v =>
      `<option value="${escapeHtml(v)}"${v === sel ? " selected" : ""}>${escapeHtml(labelMap ? labelMap(v) : v)}</option>`
    ).join("");
  };
  setOpts("filterOkr", okrs, state.okr, v => v === "All" ? "All OKRs" : v);
  setOpts("filterStatus", statuses, state.status, v => v === "All" ? "All Statuses" : v);
  setOpts("filterStakeholder", stakeholders, state.stakeholder, v => v === "All" ? "All Stakeholders" : v);
  setOpts("filterSecondaryStakeholder", secondaryStakeholders, state.secondaryStakeholder, v => v === "All" ? "All Leads" : v);
  setOpts("filterPm", pms, state.pm, v => v === "All" ? "All Project Managers" : v);
  setOpts("filterPeriod", periods, state.period, v => v === "All" ? "All Periods" : v);

  const dirty = state.okr !== "All" || state.status !== "All" || state.stakeholder !== "All"
             || state.secondaryStakeholder !== "All"
             || state.pm !== "All" || state.period !== "All" || state.search;
  document.getElementById("filterClear").disabled = !dirty;
}

/* ═══════════════ RENDER: KPIs ═══════════════ */
function renderKpis(filtered) {
  const okrCount = unique(filtered.map(r => r.okr)).length;
  const krCount = unique(filtered.map(r => `${r.okr}||${r.keyResult}`)).length;
  const total = filtered.length;
  const onTrack = filtered.filter(r => effectiveStatus(r) === "On Track").length;
  const atRisk = filtered.filter(r => effectiveStatus(r) === "At Risk").length;
  const completed = filtered.filter(r => effectiveStatus(r) === "Completed").length;
  /* Mean attainment, not mean `progress`. Averaging progress directly treats a
     "KPI # - Decrease" row's raw count as a percentage — live data stores that
     one as 8 against a goal of 5 — so one row could contribute 800% and the
     card claimed 158% average progress. See shared/js/okr-math.js. */
  const avgProgress = total
    ? (window.SS.okr.averagePercent(filtered) ?? 0)
    : 0;

  document.getElementById("okrpKpis").innerHTML = `
    <div class="kpi-card" style="--kpi-color: var(--bp-teal);">
      <div class="kpi-label">OKRs</div>
      <div class="kpi-value">${okrCount}</div>
      <div class="kpi-sub">in view</div>
    </div>
    <div class="kpi-card" style="--kpi-color: #3A929D;">
      <div class="kpi-label">Key Results</div>
      <div class="kpi-value">${krCount}</div>
      <div class="kpi-sub">tracked</div>
    </div>
    <div class="kpi-card" style="--kpi-color: #B687AC;">
      <div class="kpi-label">Sub-Key Results</div>
      <div class="kpi-value">${total}</div>
      <div class="kpi-sub">measurable</div>
    </div>
    <div class="kpi-card" style="--kpi-color: var(--status-track);">
      <div class="kpi-label">On Track</div>
      <div class="kpi-value">${onTrack}</div>
      <div class="kpi-sub">${total ? Math.round(onTrack/total*100) : 0}% of view</div>
    </div>
    <div class="kpi-card" style="--kpi-color: var(--status-risk);">
      <div class="kpi-label">At Risk</div>
      <div class="kpi-value">${atRisk}</div>
      <div class="kpi-sub">need attention</div>
    </div>
    <div class="kpi-card" style="--kpi-color: var(--bp-gold);">
      <div class="kpi-label">Avg Progress</div>
      <div class="kpi-value">${avgProgress}%</div>
      <div class="kpi-sub">across view</div>
    </div>
  `;
}

/* ═══════════════ RENDER: OKR CARDS ═══════════════
   Card markup is built by the shared window.OkrCards renderer
   (see /js/okr-cards.js). We only wire up the click-to-filter
   behavior here, since that's specific to this dashboard. */
function renderOkrCards(filtered) {
  const target = document.getElementById("okrpOkrGrid");
  if (!target) return;

  if (!filtered.length) {
    target.innerHTML = `<div class="okrp-empty" style="grid-column: 1/-1;">No objectives in view.</div>`;
    return;
  }

  window.OkrCards.render({
    target: target,
    rows: filtered,
    okrColors: OKR_COLORS,
    statusColors: STATUS_COLORS
  });

  target.querySelectorAll(".okr-card").forEach(el => {
    el.addEventListener("click", () => {
      state.okr = el.dataset.okr;
      renderAll();
      document.querySelector(".okrp-filters").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* ═══════════════ RENDER: DONUT (status) ═══════════════ */
/* A second channel for the donut — see shared/js/hub-texture.js. The slot comes
   from the status's fixed place in STATUS_COLORS, not from its position in the
   sorted chart, so filtering never re-patterns the statuses that remain. */
function tex() {
  return (window.SS && window.SS.texture) ||
         { enabled: () => false, className: () => "", svgDefs: () => "",
           svgFill: (i, c) => c, onChange: () => {} };
}
function statusSlot(label) {
  const keys = Object.keys(window.STATUS_COLORS || {});
  const i = keys.indexOf(label);
  return i < 0 ? keys.length : i;
}

function renderStatusDonut(filtered) {
  const counts = {};
  filtered.forEach(r => { const s = effectiveStatus(r); counts[s] = (counts[s] || 0) + 1; });

  const data = Object.entries(counts)
    .map(([label, value]) => ({ label, value, color: statusPalette(label).bg }))
    .sort((a, b) => b.value - a.value);
  const total = data.reduce((s, d) => s + d.value, 0);

  const target = document.getElementById("statusDonut");
  if (!total) { target.innerHTML = `<div class="okrp-empty">No data.</div>`; return; }

  const size = 260, cx = size/2, cy = size/2, r = size*0.36, sw = size*0.14;
  let cumulative = 0;
  const segs = data.map(d => {
    const start = cumulative; cumulative += d.value/total;
    const sa = start*2*Math.PI - Math.PI/2;
    const ea = cumulative*2*Math.PI - Math.PI/2;
    const large = d.value/total > 0.5 ? 1 : 0;
    const x1 = cx + r*Math.cos(sa), y1 = cy + r*Math.sin(sa);
    const x2 = cx + r*Math.cos(ea), y2 = cy + r*Math.sin(ea);
    return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}" fill="none" stroke="${tex().svgFill(statusSlot(d.label), d.color, "okrtex")}" stroke-width="${sw}"/>`;
  }).join("");

  target.innerHTML = `
    <div class="donut-wrap">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${tex().svgDefs(data.map(d => d.color), "okrtex", data.map(d => statusSlot(d.label)))}
        ${segs}
        <text x="${cx}" y="${cy-6}" text-anchor="middle" class="donut-center-val">${total}</text>
        <text x="${cx}" y="${cy+22}" text-anchor="middle" class="donut-center-label">Sub-KRs</text>
      </svg>
      <div class="donut-legend">
        ${data.map(d => `
          <div class="donut-legend-item">
            <span class="donut-dot ${tex().className(statusSlot(d.label))}" style="background-color:${d.color};"></span>
            <span>${escapeHtml(d.label)}: <b>${d.value}</b></span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

/* ═══════════════ RENDER: STAKEHOLDER BARS ═══════════════ */
function renderStakeholderBars(filtered) {
  const counts = {};
  filtered.forEach(r => { counts[r.stakeholder] = (counts[r.stakeholder] || 0) + 1; });
  const rows = Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);
  const max = Math.max(...rows.map(r => r.value), 1);

  const target = document.getElementById("stakeholderBars");
  if (!rows.length) { target.innerHTML = `<div class="okrp-empty">No data.</div>`; return; }

  target.innerHTML = rows.map(r => {
    const pctW = (r.value / max) * 100;
    return `
      <div class="bar-row">
        <div class="bar-label" title="${escapeHtml(r.label)}">${escapeHtml(r.label)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pctW}%; --bar-color: var(--bp-teal); --bar-color-light: #3A929D;">
            <span class="bar-value">${r.value}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* ═══════════════ RENDER: TABLE ═══════════════ */
/* ═══════════════ RENDER: SUB-KEY RESULTS, BY OBJECTIVE ═══════════════

   Two levels of collapsing, both working the same way.

   The outer level is the objective — one card per objective in view. That
   replaced a flat table of every sub-key result with eleven columns: accurate,
   and unreadable at fifty rows.

   The inner level is the sub-key result itself, where it has more than one row
   under it. "Complete Admissions ITD roadmap of essential features for scale"
   is four quarters; listing all four as siblings of everything else made the
   objective card long again, and repeated that same sentence four times to do
   it. Four parents in the data have several rows (7, 5, 4 and 4); the other
   thirty have exactly one and are drawn as a plain row, because a card you
   have to open to find a single item inside is a step that answers nothing.

   Nothing is hidden that was not hidden before: the same rows carry the same
   fields, and each still opens the same detail modal.

   ── What is open ──

   One objective at a time, and one sub-group at a time, like an accordion —
   two open at once is most of the way back to the wall of rows this replaced.
   Both are held in `state`, not in the DOM, because renderAll() rebuilds this
   list on every filter change and every search keystroke; left in the DOM, a
   card you opened would slam shut the moment you typed in the search box.
   `autoOpenedFor` stops the automatic opening from fighting a reader who has
   deliberately closed something. */
function groupRows(filtered) {
  const map = new Map();
  filtered.forEach((r) => {
    if (!map.has(r.okr)) map.set(r.okr, []);
    map.get(r.okr).push(r);
  });
  // Objective order follows the data, not the alphabet, so these cards keep the
  // same sequence as the overview cards above them.
  return [...map.entries()].map(([okr, rows]) => ({ okr, rows }));
}

/* The rows of one objective, gathered under the sub-key result they belong to.
   Insertion order is kept, so a parent appears where its first row did. */
function groupByParent(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const key = r.subKeyResult || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  return [...map.entries()].map(([parent, kids]) => ({ parent, rows: kids }));
}

function subKey(okr, parent) { return okr + "||" + parent; }

function skrItem(r, opts) {
  const nested = !!(opts && opts.nested);
  const c = okrPalette(r.okr);
  const skr = skrPalette(r);
  const s = effectiveStatus(r);
  const sc = statusPalette(s);
  const info = progressBarInfo(r);
  const showGoal = info && info.goalDisplay != null && info.mode !== "completion";

  const progressHtml = !info
    ? `<span class="cell-dash">—</span>`
    : `<div class="mini-progress is-${info.mode} ${info.exceeded ? "is-exceeded" : ""}" title="${info.tooltip}">
         <div class="mini-progress-actual" style="width:${info.barFill}%; --mp-color: ${c.bg}; --mp-color-light: ${c.light};"></div>
         <div class="mini-progress-label">${info.progressDisplay}${showGoal ? ` <span class="mp-goal">/ ${info.goalDisplay}</span>` : ""}</div>
       </div>`;

  /* Every column the table carried, as a labelled tag. Labelled because a bare
     name among other names says nothing about whether it is the stakeholder, a
     lead or the project manager — the table answered that in a header the
     reader had to look back up at. */
  const tag = (label, value) =>
    value ? `<span class="okrp-tag"><span class="okrp-tag-k">${escapeHtml(label)}</span>${escapeHtml(value)}</span>` : "";

  const leads = secondaryList(r.secondaryStakeholders);
  const tags = [
    tag("Stakeholder", r.stakeholder),
    leads.length
      ? `<span class="okrp-tag"><span class="okrp-tag-k">Leads</span>${leads.map(escapeHtml).join(", ")}</span>`
      : "",
    tag("PM", r.projectManager),
    tag("Period", r.period),
    hasStretch(r)
      ? `<span class="okrp-tag"><span class="okrp-tag-k">Stretch</span>${escapeHtml(formatValue(r.stretchGoal, r))}</span>`
      : "",
  ].filter(Boolean).join("");

  /* Inside a sub-group the parent is already the heading above, so a row is
     identified by its quarter alone — repeating the parent on all four would
     be the same sentence four times.

     Except where there is no quarter. One row in the data ("Achieve 75% PC New
     yield…") sits under a multi-row parent with no child of its own, and
     dropping the parent there would leave a card with no heading at all. It
     falls back to the parent, which is the only name it has. */
  const heading = nested
    ? (r.subKeyResultChild || r.subKeyResult)
    : r.subKeyResult;
  const chip = (!nested && r.subKeyResultChild)
    ? `<div class="okrp-skr-child">${escapeHtml(r.subKeyResultChild)}</div>`
    : "";

  return `
    <article class="okrp-skr" data-id="${r.id}" tabindex="0" role="button"
             aria-label="Open ${escapeHtml(heading)}"
             style="--skr-color:${skr.bg}; --skr-pale:${skr.pale};">
      <div class="okrp-skr-top">
        <div class="okrp-skr-head">
          ${chip}
          <div class="okrp-skr-title">${escapeHtml(heading)}</div>
          ${nested ? "" : `<div class="okrp-skr-kr"><span class="okrp-tag-k">Key result</span>${escapeHtml(r.keyResult)}</div>`}
        </div>
        <div class="okrp-skr-right">
          ${progressHtml}
          <span class="status-pill" style="background:${sc.pale}; color:${sc.bg};"><span class="status-dot" style="background:${sc.bg};"></span>${escapeHtml(s)}</span>
        </div>
      </div>
      ${tags ? `<div class="okrp-skr-tags">${tags}</div>` : ""}
    </article>`;
}

/* A sub-key result with several rows under it.

   Built to the same shape as a plain row — name, key result, a row of tags,
   and a right-hand column — so the two sit at the same height and the list
   reads as one set of cards rather than two. The alternative was padding this
   one out to match, which would have bought the same height with empty space.

   The tags are the fields its rows agree on. Three of the four groups agree on
   every one; the fourth shares its key result and period but spreads across
   several people, and says "Various" rather than picking one of them. A header
   that claimed a single stakeholder for seven rows owned by different people
   would be worse than saying nothing.

/* A sub-key result with several rows under it: a header that summarises them,
   and the rows themselves behind it. Same shape as the objective card above,
   one level in. */
function subGroup(okr, entry) {
  const key = subKey(okr, entry.parent);
  const open = state.openSub === key;
  const skr = skrPalette(entry.rows[0]);
  const avg = window.SS.okr.averagePercent(entry.rows);
  const atRisk = entry.rows.filter((r) => /risk|trouble|behind/i.test(effectiveStatus(r))).length;
  const done = entry.rows.filter((r) => /complet/i.test(effectiveStatus(r))).length;

  return `
    <section class="okrp-sub${open ? " is-open" : ""}" data-sub="${escapeHtml(key)}"
             style="--skr-color:${skr.bg}; --skr-pale:${skr.pale};">
      <button type="button" class="okrp-sub-head" aria-expanded="${open}">
        <span class="okrp-sub-chev" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
        <span class="okrp-sub-text">
          <span class="okrp-sub-name">${escapeHtml(entry.parent)}</span>
          <span class="okrp-sub-meta"><b>${entry.rows.length}</b> item${entry.rows.length === 1 ? "" : "s"}${avg === null ? "" : ` · <b>${avg}%</b> avg`}${done ? ` · ${done} complete` : ""}${atRisk ? ` · <b class="is-risk">${atRisk} at risk</b>` : ""}</span>
        </span>
      </button>
      <div class="okrp-sub-body"${open ? "" : " hidden"}>
        ${entry.rows.map((r) => skrItem(r, { nested: true })).join("")}
      </div>
    </section>`;
}

function renderGroups(filtered) {
  const host = document.getElementById("okrpGroups");
  if (!host) return;

  if (!filtered.length) {
    host.innerHTML = `<div class="okrp-empty">No sub-key results match your filters.</div>`;
    return;
  }

  const groups = groupRows(filtered);

  /* Narrowed to one objective — by a filter, or by clicking a card above —
     open it rather than making the reader ask twice. Only when it differs from
     the one we last opened this way, so a card the reader has deliberately
     closed stays closed. */
  if (groups.length === 1 && state.autoOpenedFor !== groups[0].okr) {
    state.openGroup = groups[0].okr;
    state.autoOpenedFor = groups[0].okr;
  }
  if (groups.length !== 1) state.autoOpenedFor = null;

  host.innerHTML = groups.map((g) => {
    const c = okrPalette(g.okr);
    const open = state.openGroup === g.okr;
    const avg = window.SS.okr.averagePercent(g.rows);
    const atRisk = g.rows.filter((r) => /risk|trouble|behind/i.test(effectiveStatus(r))).length;
    const done = g.rows.filter((r) => /complet/i.test(effectiveStatus(r))).length;

    /* A parent with several rows becomes a group of its own; one with a single
       row is drawn as that row. A collapsible holding one item asks to be
       opened to show what it already said.

       Ordered alphabetically by what the reader sees — the parent's name —
       whether it ends up a group or a single row, so the two kinds interleave
       rather than the groups clumping at one end. Sorting used to key off the
       key result first, which is invisible here: it put "Achieve 75% PC New
       yield" after three parents beginning with "Complete" for a reason
       nothing on screen explained.

       `numeric` so a tenth item sorts after the ninth rather than after the
       first. */
    const byName = (a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

    const entries = groupByParent(g.rows)
      .map((entry) => ({
        parent: entry.parent,
        // Q1 → Q2 → Q3 → Q4 where several children share one parent.
        rows: entry.rows.slice().sort((a, b) =>
          byName(a.subKeyResultChild || a.subKeyResult, b.subKeyResultChild || b.subKeyResult)),
      }))
      .sort((a, b) => byName(a.parent, b.parent));

    const body = entries.map((entry) =>
      entry.rows.length > 1 ? subGroup(g.okr, entry) : skrItem(entry.rows[0])
    ).join("");

    return `
      <section class="okrp-group${open ? " is-open" : ""}" data-okr="${escapeHtml(g.okr)}"
               style="--okr-color:${c.bg}; --okr-pale:${c.pale};">
        <button type="button" class="okrp-group-head" aria-expanded="${open}">
          <span class="okrp-group-chev" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
          <span class="okrp-group-text">
            <span class="okrp-group-name">${escapeHtml(g.okr)}</span>
            <span class="okrp-group-meta"><b>${g.rows.length}</b> sub-key result${g.rows.length === 1 ? "" : "s"}${avg === null ? "" : ` · <b>${avg}%</b> avg`}${done ? ` · ${done} complete` : ""}${atRisk ? ` · <b class="is-risk">${atRisk} at risk</b>` : ""}</span>
          </span>
        </button>
        <div class="okrp-group-body"${open ? "" : " hidden"}>
          ${body}
        </div>
      </section>`;
  }).join("");

  /* One listener on the container rather than one per card: this list is
     rebuilt on every keystroke in the search box, and re-binding fifty
     listeners each time is work nobody asked for. */
  if (!host.dataset.wired) {
    host.dataset.wired = "1";
    host.addEventListener("click", (e) => {
      // Innermost first: a sub-group header sits inside an objective's body, so
      // testing the objective first would swallow every click on a sub.
      const subHead = e.target.closest(".okrp-sub-head");
      if (subHead) {
        const sec = subHead.closest(".okrp-sub");
        const key = sec.dataset.sub;
        const nowOpen = state.openSub !== key;
        state.openSub = nowOpen ? key : null;
        host.querySelectorAll(".okrp-sub").forEach((s2) => {
          const isIt = s2 === sec && nowOpen;
          s2.classList.toggle("is-open", isIt);
          s2.querySelector(".okrp-sub-head").setAttribute("aria-expanded", String(isIt));
          s2.querySelector(".okrp-sub-body").hidden = !isIt;
        });
        return;
      }

      const head = e.target.closest(".okrp-group-head");
      if (head) {
        const sec = head.closest(".okrp-group");
        const okr = sec.dataset.okr;
        const nowOpen = state.openGroup !== okr;
        state.openGroup = nowOpen ? okr : null;
        // Opening one closes the others, without a redraw: the rows are already
        // in the DOM, so this only moves the flags that hide them.
        host.querySelectorAll(".okrp-group").forEach((s2) => {
          const isIt = s2 === sec && nowOpen;
          s2.classList.toggle("is-open", isIt);
          s2.querySelector(".okrp-group-head").setAttribute("aria-expanded", String(isIt));
          s2.querySelector(".okrp-group-body").hidden = !isIt;
        });
        return;
      }

      const item = e.target.closest(".okrp-skr");
      if (item) openDetailById(parseInt(item.dataset.id, 10));
    });
    // A card that behaves like a button has to answer the keyboard like one.
    host.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const item = e.target.closest(".okrp-skr");
      if (!item) return;
      e.preventDefault();
      openDetailById(parseInt(item.dataset.id, 10));
    });
  }
}

/* ═══════════════ RENDER: ALL ═══════════════ */
function renderAll() {
  const filtered = getFiltered();
  renderFilters();
  renderKpis(filtered);
  renderOkrCards(filtered);
  renderStatusDonut(filtered);
  renderStakeholderBars(filtered);
  renderGroups(filtered);
}

/* ═══════════════ SPOTLIGHT SEARCH ═══════════════ */
function buildSpotlightMatches(q) {
  if (!q) return null;
  const lower = q.toLowerCase();

  // Collect distinct OKRs / KRs / SKRs
  const okrMap = {}, krMap = {}, skrItems = [];
  ROWS.forEach(r => {
    if (!okrMap[r.okr]) okrMap[r.okr] = { name: r.okr, rows: [] };
    okrMap[r.okr].rows.push(r);

    const krKey = `${r.okr}||${r.keyResult}`;
    if (!krMap[krKey]) krMap[krKey] = { name: r.keyResult, okr: r.okr, rows: [] };
    krMap[krKey].rows.push(r);

    skrItems.push(r);
  });

  const matchOkr = Object.values(okrMap)
    .filter(o => o.name.toLowerCase().includes(lower))
    .slice(0, 5);
  const matchKr = Object.values(krMap)
    .filter(k => k.name.toLowerCase().includes(lower))
    .slice(0, 6);
  const matchSkr = skrItems
    .filter(r => r.subKeyResult.toLowerCase().includes(lower))
    .slice(0, 8);

  return { okr: matchOkr, kr: matchKr, skr: matchSkr };
}

function positionSpotlightDropdown() {
  const dd = document.getElementById("spotlightDropdown");
  const wrap = document.querySelector(".spotlight-input-wrap");
  if (!dd || !wrap || dd.hidden) return;
  const r = wrap.getBoundingClientRect();
  dd.style.left = r.left + "px";
  dd.style.top = (r.bottom + 8) + "px";
  dd.style.width = r.width + "px";
}

function renderSpotlight() {
  const dd = document.getElementById("spotlightDropdown");
  const q = state.spotlight.trim();
  if (!q) { dd.hidden = true; dd.innerHTML = ""; state.spotlightOpen = false; return; }

  const m = buildSpotlightMatches(q);
  const totalHits = (m.okr.length + m.kr.length + m.skr.length);
  dd.hidden = false; state.spotlightOpen = true;
  positionSpotlightDropdown();

  if (!totalHits) {
    dd.innerHTML = `<div class="sd-empty">No matches for <b>${escapeHtml(q)}</b></div>`;
    return;
  }

  // Build flat index of selectable items (for keyboard nav)
  const flat = [];

  const okrHtml = m.okr.length ? `
    <div class="sd-group">
      <div class="sd-group-label">Objectives <span class="sd-group-count">${m.okr.length}</span></div>
      ${m.okr.map(o => {
        const c = okrPalette(o.name);
        const idx = flat.length;
        flat.push({ kind: "okr", key: o.name });
        const avg = window.SS.okr.averagePercent(o.rows) ?? 0;
        return `
          <div class="sd-item" data-flat="${idx}" style="--sd-color:${c.bg}; --sd-color-pale:${c.pale};">
            <div class="sd-item-icon">OKR</div>
            <div class="sd-item-body">
              <div class="sd-item-title">${highlight(o.name, q)}</div>
              <div class="sd-item-meta"><b>${o.rows.length}</b> sub-KRs · <b>${avg}%</b> avg progress</div>
            </div>
          </div>
        `;
      }).join("")}
    </div>` : "";

  const krHtml = m.kr.length ? `
    <div class="sd-group">
      <div class="sd-group-label">Key Results <span class="sd-group-count">${m.kr.length}</span></div>
      ${m.kr.map(k => {
        const c = okrPalette(k.okr);
        const idx = flat.length;
        flat.push({ kind: "kr", key: `${k.okr}||${k.name}` });
        const avg = window.SS.okr.averagePercent(k.rows) ?? 0;
        return `
          <div class="sd-item" data-flat="${idx}" style="--sd-color:${c.bg}; --sd-color-pale:${c.pale};">
            <div class="sd-item-icon">KR</div>
            <div class="sd-item-body">
              <div class="sd-item-title">${highlight(k.name, q)}</div>
              <div class="sd-item-meta">${escapeHtml(k.okr)} · <b>${k.rows.length}</b> sub-KRs · <b>${avg}%</b></div>
            </div>
          </div>
        `;
      }).join("")}
    </div>` : "";

  const skrHtml = m.skr.length ? `
    <div class="sd-group">
      <div class="sd-group-label">Sub-Key Results <span class="sd-group-count">${m.skr.length}</span></div>
      ${m.skr.map(r => {
        const skr = skrPalette(r);
        const s = effectiveStatus(r);
        const sc = statusPalette(s);
        const idx = flat.length;
        flat.push({ kind: "skr", key: r.id });
        return `
          <div class="sd-item" data-flat="${idx}" style="--sd-color:${skr.bg}; --sd-color-pale:${skr.pale};">
            <div class="sd-item-icon">SKR</div>
            <div class="sd-item-body">
              <div class="sd-item-title">${highlight(r.subKeyResult, q)}</div>
              <div class="sd-item-meta">
                <span>${escapeHtml(r.okr)}</span>
                <span><b>${formatValue(r.progress, r)}</b></span>
                <span style="color:${sc.bg}; font-weight:600;">${escapeHtml(s)}</span>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>` : "";

  dd.innerHTML = okrHtml + krHtml + skrHtml;
  state._spotlightFlat = flat;

  // Wire clicks
  dd.querySelectorAll(".sd-item").forEach(el => {
    el.addEventListener("click", () => {
      const i = parseInt(el.dataset.flat, 10);
      const f = state._spotlightFlat[i];
      handleSpotlightSelect(f);
    });
    el.addEventListener("mouseenter", () => {
      state.spotlightIdx = parseInt(el.dataset.flat, 10);
      highlightSpotlightActive();
    });
  });

  state.spotlightIdx = 0;
  highlightSpotlightActive();
}

function highlightSpotlightActive() {
  const dd = document.getElementById("spotlightDropdown");
  dd.querySelectorAll(".sd-item").forEach(el => {
    el.classList.toggle("is-active", parseInt(el.dataset.flat, 10) === state.spotlightIdx);
  });
  const active = dd.querySelector(".sd-item.is-active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

function handleSpotlightSelect(f) {
  if (!f) return;
  if (f.kind === "okr") openOkrDetail(f.key);
  else if (f.kind === "kr") {
    const [okr, kr] = f.key.split("||");
    openKrDetail(okr, kr);
  } else if (f.kind === "skr") {
    openDetailById(f.key);
  }
  closeSpotlight();
}

function closeSpotlight() {
  document.getElementById("spotlightDropdown").hidden = true;
  state.spotlightOpen = false;
  state.spotlightIdx = -1;
}

function initSpotlight() {
  const input = document.getElementById("spotlightInput");
  const dd = document.getElementById("spotlightDropdown");

  input.addEventListener("input", e => {
    state.spotlight = e.target.value;
    renderSpotlight();
  });
  input.addEventListener("focus", () => { if (state.spotlight.trim()) renderSpotlight(); });
  input.addEventListener("keydown", e => {
    if (!state.spotlightOpen) return;
    const n = (state._spotlightFlat || []).length;
    if (e.key === "ArrowDown") { e.preventDefault(); state.spotlightIdx = (state.spotlightIdx + 1) % n; highlightSpotlightActive(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); state.spotlightIdx = (state.spotlightIdx - 1 + n) % n; highlightSpotlightActive(); }
    else if (e.key === "Enter") { e.preventDefault(); handleSpotlightSelect(state._spotlightFlat[state.spotlightIdx]); }
    else if (e.key === "Escape") { closeSpotlight(); input.blur(); }
  });

  document.addEventListener("click", e => {
    if (!document.getElementById("spotlight").contains(e.target)) closeSpotlight();
  });

  window.addEventListener("scroll", positionSpotlightDropdown, { passive: true });
  window.addEventListener("resize", positionSpotlightDropdown);

  // Cmd/Ctrl-K shortcut
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      input.focus(); input.select();
    }
  });
}

/* ═══════════════ FANCY DETAIL MODAL ═══════════════ */
function openDetailById(id) {
  const r = ROWS.find(x => x.id === id);
  if (!r) return;
  renderSkrDetail(r);
  showModal();
}

function openKrDetail(okr, kr) {
  const rows = ROWS.filter(r => r.okr === okr && r.keyResult === kr);
  if (!rows.length) return;
  renderAggregateDetail({
    kind: "Key Result",
    okr, title: kr, rows
  });
  showModal();
}

function openOkrDetail(okr) {
  const rows = ROWS.filter(r => r.okr === okr);
  if (!rows.length) return;
  renderAggregateDetail({
    kind: "Objective",
    okr, title: okr, rows
  });
  showModal();
}

function showModal() {
  document.getElementById("okrpModal").hidden = false;
  document.body.classList.add("modal-open");
}
function closeModal() {
  document.getElementById("okrpModal").hidden = true;
  document.body.classList.remove("modal-open");
}

function ringSvg(cx, cy, r, sw, pct, color) {
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-card)" stroke-width="${sw}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"
      style="transition: stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1);"/>
  `;
}

function renderSkrDetail(r) {
  const c = okrPalette(r.okr);
  const skr = skrPalette(r);
  const s = effectiveStatus(r);
  const sc = statusPalette(s);
  /* The gap between where this row stands and where it was meant to be, in
     the units the row is measured in.

     It was pct(progress) - pct(goal), which multiplied a count by 100 like
     everything else: a decrease metric at 8 against a goal of 5 reported
     300 pts over. It is 3 over, not 300 — and on a decrease metric being
     over is the bad direction, so the arrow pointed the wrong way too. */
  const rowIsCount = window.SS.okr.isCount(r);
  const delta = (r.progress != null && r.goal != null)
    ? (rowIsCount ? Math.round((r.progress - r.goal) * 100) / 100
                  : pct(r.progress) - pct(r.goal))
    : null;
  const deltaGood = delta == null ? 0
    : (/decrease/i.test(String(r.type || "")) ? -delta : delta);
  const deltaUnit = rowIsCount ? "" : " pts";
  const info = progressBarInfo(r);

  const bannerCss = `--mc-color: ${c.bg}; --mc-color-light: ${c.light}; --mc-color-dark: ${darken(c.bg, 0.25)}; --mc-color-pale: ${c.pale}; --mc-status-color: ${sc.bg}; --mc-status-pale: ${sc.pale}; --mc-skr-color: ${skr.bg}; --mc-skr-pale: ${skr.pale};`;

  // Related SKRs in same KR
  const related = ROWS.filter(x => x.okr === r.okr && x.keyResult === r.keyResult && x.id !== r.id);
  const relatedHtml = related.length ? `
    <div class="mc-related">
      <h5>Other Sub-KRs in this Key Result</h5>
      <div class="mc-related-list">
        ${related.map(rr => {
          const ss = effectiveStatus(rr);
          const ssc = statusPalette(ss);
          const rskr = skrPalette(rr);
          return `
            <div class="mc-related-item" data-id="${rr.id}" style="background:${rskr.pale}; border-left:3px solid ${rskr.bg};">
              <div class="mc-related-skr">${escapeHtml(rr.subKeyResult)}</div>
              <div class="mc-related-meta">
                <span class="status-pill" style="background:${ssc.pale}; color:${ssc.bg};"><span class="status-dot" style="background:${ssc.bg};"></span>${escapeHtml(ss)}</span>
                <span class="mc-related-progress">${formatValue(rr.progress, rr)}</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  ` : "";

  const ringSize = 140, ringR = 56, ringCx = ringSize/2, ringCy = ringSize/2, ringSw = 12;
  const trendUp = r.trend && /up/i.test(r.trend);
  const trendDown = r.trend && /down/i.test(r.trend);
  const trendIcon = trendUp
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>`
    : trendDown
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 7 9 13 13 9 21 17"/><polyline points="14 17 21 17 21 10"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

  /* When a Sub-Key Result (Child) is present, treat the Child as the
     focus (it's the more specific item — e.g. "Q2 Admissions ITD
     roadmap") and demote the Parent into the breadcrumb. Rows without a
     Child show the Parent as the title (current behavior). */
  const titleText = r.subKeyResultChild || r.subKeyResult;
  const breadcrumbHtml = r.subKeyResultChild
    ? `<span>${escapeHtml(r.okr)}</span><span class="mc-breadcrumb-sep">›</span><span>${escapeHtml(r.keyResult)}</span><span class="mc-breadcrumb-sep">›</span><b>${escapeHtml(r.subKeyResult)}</b>`
    : `<span>${escapeHtml(r.okr)}</span><span class="mc-breadcrumb-sep">›</span><b>${escapeHtml(r.keyResult)}</b>`;
  const updatedOn = formatDate(r.updateDate);
  const typeIcon = r.type && /KPI/i.test(r.type)
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><polyline points="7 14 11 10 15 13 21 7"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;

  const body = `
    <div class="mc-banner" style="${bannerCss}">
      <div class="mc-banner-grid"></div>
      <div class="mc-breadcrumb">${breadcrumbHtml}</div>
      <div class="mc-level-badge">${r.subKeyResultChild ? "Quarterly Sub-Key Result" : "Sub-Key Result"}</div>
      <h2 class="mc-title" id="okrpModalTitle">${escapeHtml(titleText)}</h2>
      <div class="mc-banner-meta">
        <span class="mc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(r.period)}</span>
        ${r.type ? `<span class="mc-chip">${typeIcon}${escapeHtml(r.type)}</span>` : ""}
        <span class="mc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>${escapeHtml(r.stakeholder)}</span>
        ${secondaryList(r.secondaryStakeholders).length ? `<span class="mc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>+${secondaryList(r.secondaryStakeholders).length} Secondary</span>` : ""}
        <span class="mc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>PM · ${escapeHtml(r.projectManager)}</span>
      </div>
      <div class="mc-skr-stripe" style="background:${skr.bg};"></div>
    </div>

    <div class="mc-body" style="${bannerCss}">

      <div class="mc-progress-card">
        <div class="mc-ring">
          <svg width="${ringSize}" height="${ringSize}" viewBox="0 0 ${ringSize} ${ringSize}">
            ${ringSvg(ringCx, ringCy, ringR, ringSw, info ? info.barFill : 0, c.bg)}
          </svg>
          <div class="mc-ring-center">
            <div>
              <div class="mc-ring-value">${formatValue(r.progress, r)}</div>
              <div class="mc-ring-label">Progress</div>
            </div>
          </div>
        </div>
        <div class="mc-progress-detail">
          <h4>Performance vs Goal</h4>
          <div class="mc-comparison">
            <div class="mc-comp-block">
              <div class="mc-comp-label">Progress</div>
              <div class="mc-comp-value">${formatValue(r.progress, r)}</div>
            </div>
            <div class="mc-comp-block">
              <div class="mc-comp-label">Goal</div>
              <div class="mc-comp-value">${formatValue(r.goal, r)}</div>
            </div>
            ${hasStretch(r) ? `
              <div class="mc-comp-block">
                <div class="mc-comp-label">Stretch</div>
                <div class="mc-comp-value">${formatValue(r.stretchGoal, r)}</div>
              </div>
            ` : ""}
            ${delta != null ? `
              <div class="mc-comp-block">
                <div class="mc-comp-label">Delta</div>
                <div class="mc-comp-value">
                  <span class="mc-delta ${deltaGood > 0 ? "positive" : deltaGood < 0 ? "negative" : "neutral"}">
                    ${deltaGood > 0 ? "▲" : deltaGood < 0 ? "▼" : "■"} ${Math.abs(delta)}${deltaUnit}
                  </span>
                </div>
              </div>
            ` : ""}
          </div>
          ${info ? `
            <div class="mc-progress-bar-wrap ${info.exceeded ? "is-exceeded" : ""}">
              <div class="mc-progress-bar-actual" style="width:${info.barFill}%;"></div>
            </div>
            <div class="mc-progress-scale-note">
              ${info.mode === "target" && info.direction === "decrease"
                ? `Bar shows reduction toward goal of ${info.goalDisplay} (full = goal reached)`
                : info.mode === "target"
                ? `Scale: 0–${info.goalDisplay} (bar full = goal reached)`
                : info.mode === "exceeded"
                ? `<b>Goal met</b> · ${info.progressDisplay} ${unitOf(r) === "%" ? "achieved" : "(at or below " + info.goalDisplay + ")"}`
                : `Scale: 0–100% (full completion)`}
            </div>
          ` : ""}
        </div>
      </div>

      <div class="mc-info-card">
        <h5>Status</h5>
        <div class="mc-status-display" style="--mc-status-color:${sc.bg}; --mc-status-pale:${sc.pale};">
          <div class="mc-status-pulse"></div>
          <div>
            <div class="mc-status-label">Current</div>
            <div class="mc-status-name">${escapeHtml(s)}</div>
          </div>
        </div>
        ${r.trend ? `
          <div style="margin-top:14px;">
            <div class="mc-info-role" style="margin-bottom:4px;">Trend</div>
            <div class="mc-trend ${trendUp ? "up" : trendDown ? "down" : ""}">${trendIcon}${escapeHtml(r.trend)}</div>
          </div>
        ` : ""}
        ${updatedOn ? `
          <div style="margin-top:14px;">
            <div class="mc-info-role" style="margin-bottom:4px;">Last Update</div>
            <div class="mc-info-name">${escapeHtml(updatedOn)}</div>
          </div>
        ` : ""}
      </div>

      <div class="mc-info-card">
        <h5>People</h5>
        <div class="mc-info-row">
          <div class="mc-avatar" style="--mc-color:${c.bg}; --mc-color-pale:${c.pale};">${initials(r.stakeholder)}</div>
          <div class="mc-info-text">
            <div class="mc-info-role">Stakeholder</div>
            <div class="mc-info-name">${escapeHtml(r.stakeholder)}</div>
          </div>
        </div>
        ${secondaryList(r.secondaryStakeholders).map(p => `
          <div class="mc-info-row">
            <div class="mc-avatar mc-avatar-secondary" style="--mc-color:${c.bg}; --mc-color-pale:${c.pale};">${initials(p)}</div>
            <div class="mc-info-text">
              <div class="mc-info-role">Secondary Stakeholder</div>
              <div class="mc-info-name">${escapeHtml(p)}</div>
            </div>
          </div>
        `).join("")}
        <div class="mc-info-row">
          <div class="mc-avatar" style="--mc-color:${c.bg}; --mc-color-pale:${c.pale};">${initials(r.projectManager)}</div>
          <div class="mc-info-text">
            <div class="mc-info-role">Project Manager</div>
            <div class="mc-info-name">${escapeHtml(r.projectManager)}</div>
          </div>
        </div>
      </div>

      ${r.comment ? `
        <div class="mc-comment-card" style="--mc-color:${c.bg};">
          <div class="mc-comment-head">
            <h5>Latest Update</h5>
            ${updatedOn ? `<span class="mc-comment-date">${escapeHtml(updatedOn)}</span>` : ""}
          </div>
          <div class="mc-comment-body">${escapeHtml(r.comment)}</div>
        </div>
      ` : ""}

      ${relatedHtml}

    </div>
  `;
  document.getElementById("okrpModalBody").innerHTML = body;

  // Wire related-item clicks
  document.querySelectorAll(".mc-related-item").forEach(el => {
    el.addEventListener("click", () => openDetailById(parseInt(el.dataset.id, 10)));
  });
}

function renderAggregateDetail({ kind, okr, title, rows }) {
  const c = okrPalette(okr);
  const avg = window.SS.okr.averagePercent(rows) ?? 0;
  /* `avg` is mean attainment — how close these rows are to their own goals,
     where 100% means every goal met. Comparing that against the average goal,
     as this card used to, asks the question attainment has already answered:
     the goal is the denominator. Replaced with how many goals are actually
     met, which an average hides — three rows at 100% and three at 0% average
     the same as six rows at 50%. */
  const measured = rows.filter(r => window.SS.okr.attainment(r) !== null);
  const metCount = measured.filter(r => window.SS.okr.attainment(r) >= 1).length;

  const bannerCss = `--mc-color: ${c.bg}; --mc-color-light: ${c.light}; --mc-color-dark: ${darken(c.bg, 0.25)}; --mc-color-pale: ${c.pale};`;

  const ringSize = 140, ringR = 56, ringCx = ringSize/2, ringCy = ringSize/2, ringSw = 12;

  const statusCounts = {};
  rows.forEach(r => { const s = effectiveStatus(r); statusCounts[s] = (statusCounts[s] || 0) + 1; });

  const krCount = unique(rows.map(r => r.keyResult)).length;
  const stakeholders = unique(rows.map(r => r.stakeholder));
  const pms = unique(rows.map(r => r.projectManager));
  /* Someone listed as a secondary here may already be a primary on another
     row in this group — show them once, in the more senior role. */
  const secondaries = unique(rows.flatMap(r => secondaryList(r.secondaryStakeholders)))
    .filter(p => !stakeholders.includes(p));

  const breadcrumbHtml = kind === "Objective"
    ? `<b>Objective</b>`
    : `<span>${escapeHtml(okr)}</span><span class="mc-breadcrumb-sep">›</span><b>Key Result</b>`;

  const body = `
    <div class="mc-banner" style="${bannerCss}">
      <div class="mc-banner-grid"></div>
      <div class="mc-breadcrumb">${breadcrumbHtml}</div>
      <div class="mc-level-badge">${escapeHtml(kind)}</div>
      <h2 class="mc-title" id="okrpModalTitle">${escapeHtml(title)}</h2>
      <div class="mc-banner-meta">
        <span class="mc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${rows.length} Sub-KRs</span>
        ${kind === "Objective" ? `<span class="mc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>${krCount} Key Results</span>` : ""}
        <span class="mc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>${stakeholders.length} Stakeholder${stakeholders.length !== 1 ? "s" : ""}</span>
      </div>
    </div>

    <div class="mc-body" style="${bannerCss}">

      <div class="mc-progress-card">
        <div class="mc-ring">
          <svg width="${ringSize}" height="${ringSize}" viewBox="0 0 ${ringSize} ${ringSize}">
            ${ringSvg(ringCx, ringCy, ringR, ringSw, avg, c.bg)}
          </svg>
          <div class="mc-ring-center">
            <div>
              <div class="mc-ring-value">${avg}%</div>
              <div class="mc-ring-label">Avg Progress</div>
            </div>
          </div>
        </div>
        <div class="mc-progress-detail">
          <h4>Aggregate Performance</h4>
          <div class="mc-comparison">
            <div class="mc-comp-block">
              <div class="mc-comp-label">Avg Attainment</div>
              <div class="mc-comp-value">${avg}%</div>
            </div>
            <div class="mc-comp-block">
              <div class="mc-comp-label">Goals Met</div>
              <div class="mc-comp-value">${metCount} of ${measured.length}</div>
            </div>
            <div class="mc-comp-block">
              <div class="mc-comp-label">Not Measured</div>
              <div class="mc-comp-value">${rows.length - measured.length}</div>
            </div>
          </div>
          <div class="mc-progress-bar-wrap">
            <div class="mc-progress-bar-actual" style="width:${avg}%;"></div>
          </div>
          <div class="mc-progress-scale-note">Averaged across ${rows.length} Sub-KR${rows.length !== 1 ? "s" : ""} on a 0–100% scale.</div>
        </div>
      </div>

      <div class="mc-info-card">
        <h5>Status Breakdown</h5>
        ${Object.entries(statusCounts).map(([s, n]) => {
          const ssc = statusPalette(s);
          const pctW = Math.round(n / rows.length * 100);
          return `
            <div style="margin-bottom: 10px;">
              <div style="display:flex; justify-content:space-between; font-size:0.78rem; color: var(--text); margin-bottom:4px;">
                <span><span class="status-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${ssc.bg}; margin-right:6px;"></span>${escapeHtml(s)}</span>
                <b>${n}</b>
              </div>
              <div style="height:6px; background: var(--bg-card); border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:${pctW}%; background:${ssc.bg}; transition: width 0.6s var(--smooth);"></div>
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <div class="mc-info-card">
        <h5>${kind === "Objective" ? "Stakeholders & PMs" : "People"}</h5>
        ${stakeholders.map(p => `
          <div class="mc-info-row">
            <div class="mc-avatar" style="--mc-color:${c.bg}; --mc-color-pale:${c.pale};">${initials(p)}</div>
            <div class="mc-info-text">
              <div class="mc-info-role">Stakeholder</div>
              <div class="mc-info-name">${escapeHtml(p)}</div>
            </div>
          </div>
        `).join("")}
        ${secondaries.map(p => `
          <div class="mc-info-row">
            <div class="mc-avatar mc-avatar-secondary" style="--mc-color:${c.bg}; --mc-color-pale:${c.pale};">${initials(p)}</div>
            <div class="mc-info-text">
              <div class="mc-info-role">Secondary Stakeholder</div>
              <div class="mc-info-name">${escapeHtml(p)}</div>
            </div>
          </div>
        `).join("")}
        ${pms.map(p => `
          <div class="mc-info-row">
            <div class="mc-avatar" style="--mc-color:${c.bg}; --mc-color-pale:${c.pale};">${initials(p)}</div>
            <div class="mc-info-text">
              <div class="mc-info-role">Project Manager</div>
              <div class="mc-info-name">${escapeHtml(p)}</div>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="mc-related">
        <h5>${kind === "Objective" ? "All Sub-Key Results" : "Sub-Key Results"}</h5>
        <div class="mc-related-list">
          ${rows.map(rr => {
            const ss = effectiveStatus(rr);
            const ssc = statusPalette(ss);
            const rskr = skrPalette(rr);
            return `
              <div class="mc-related-item" data-id="${rr.id}" style="background:${rskr.pale}; border-left:3px solid ${rskr.bg};">
                <div class="mc-related-skr">${escapeHtml(rr.subKeyResult)}</div>
                <div class="mc-related-meta">
                  <span class="status-pill" style="background:${ssc.pale}; color:${ssc.bg};"><span class="status-dot" style="background:${ssc.bg};"></span>${escapeHtml(ss)}</span>
                  <span class="mc-related-progress">${formatValue(rr.progress, rr)}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

    </div>
  `;
  document.getElementById("okrpModalBody").innerHTML = body;
  document.querySelectorAll(".mc-related-item").forEach(el => {
    el.addEventListener("click", () => openDetailById(parseInt(el.dataset.id, 10)));
  });
}

function initModal() {
  document.getElementById("okrpModalClose").addEventListener("click", closeModal);
  document.getElementById("okrpModalBackdrop").addEventListener("click", closeModal);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !document.getElementById("okrpModal").hidden) closeModal();
  });
}

/* ═══════════════ FILTER EVENTS ═══════════════ */
function initFilters() {
  document.getElementById("filterOkr").addEventListener("change", e => { state.okr = e.target.value; renderAll(); });
  document.getElementById("filterStatus").addEventListener("change", e => { state.status = e.target.value; renderAll(); });
  document.getElementById("filterStakeholder").addEventListener("change", e => { state.stakeholder = e.target.value; renderAll(); });
  document.getElementById("filterSecondaryStakeholder").addEventListener("change", e => { state.secondaryStakeholder = e.target.value; renderAll(); });
  document.getElementById("filterPm").addEventListener("change", e => { state.pm = e.target.value; renderAll(); });
  document.getElementById("filterPeriod").addEventListener("change", e => { state.period = e.target.value; renderAll(); });
  document.getElementById("filterSearch").addEventListener("input", e => { state.search = e.target.value; renderAll(); });
  document.getElementById("filterClear").addEventListener("click", () => {
    /* openGroup and autoOpenedFor go too. Clearing put every objective back in
       the list while leaving the one the filter had opened standing open
       underneath — the filter that opened it was gone, so the card had no
       reason to still be showing. */
    Object.assign(state, { okr: "All", status: "All", stakeholder: "All",
                           secondaryStakeholder: "All", pm: "All", period: "All",
                           search: "", openGroup: null, openSub: null,
                           autoOpenedFor: null });
    document.getElementById("filterSearch").value = "";
    renderAll();
  });
}

/* ═══════════════ BOOT ═══════════════
   Theme, nav hamburger, and scroll-reveal are auto-initialized by shared.js. */
/* Read deep-link query params (e.g. ?okr=...) and seed the filter state.
   Lets the home-page OKR cards jump straight into a filtered view here. */
function applyUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const okrParam = params.get("okr");
  if (okrParam && ROWS.some(r => r.okr === okrParam)) state.okr = okrParam;
}

/* Start whether this file was loaded with the page or injected afterwards by
   shared/js/hub-boot.js once the database had answered — by then
   DOMContentLoaded has already fired and would never fire again. */
function startPage() {
  applyUrlFilters();
  initFilters();
  initSpotlight();
  initModal();
  renderAll();
  window.SS.initReveal();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startPage, { once: true });
} else {
  startPage();
}

/* Redraw when the patterns preference is toggled from the account menu.
   Registered once at load; the charts are cheap to rebuild from data
   already in memory. */
if (window.SS && window.SS.texture) {
  window.SS.texture.onChange(function () { try { renderAll(); } catch (e) { /* not yet drawn */ } });
}
