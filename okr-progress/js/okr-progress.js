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
  pm: "All",
  period: "All",
  search: "",
  spotlight: "",
  spotlightIdx: -1,
  spotlightOpen: false,
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
  const progressPct = pct(r.progress);
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
  setOpts("filterPm", pms, state.pm, v => v === "All" ? "All Project Managers" : v);
  setOpts("filterPeriod", periods, state.period, v => v === "All" ? "All Periods" : v);

  const dirty = state.okr !== "All" || state.status !== "All" || state.stakeholder !== "All"
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
  const avgProgress = total
    ? Math.round(filtered.reduce((s, r) => s + (r.progress || 0), 0) / total * 100)
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
    return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}" fill="none" stroke="${d.color}" stroke-width="${sw}"/>`;
  }).join("");

  target.innerHTML = `
    <div class="donut-wrap">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${segs}
        <text x="${cx}" y="${cy-6}" text-anchor="middle" class="donut-center-val">${total}</text>
        <text x="${cx}" y="${cy+22}" text-anchor="middle" class="donut-center-label">Sub-KRs</text>
      </svg>
      <div class="donut-legend">
        ${data.map(d => `
          <div class="donut-legend-item">
            <span class="donut-dot" style="background:${d.color};"></span>
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
function renderTable(filtered) {
  const body = document.getElementById("okrpTableBody");
  const count = document.getElementById("okrpCount");
  count.textContent = `Showing ${filtered.length} of ${ROWS.length}`;

  if (!filtered.length) {
    body.innerHTML = `<tr><td colspan="11"><div class="okrp-empty">No sub-key results match your filters.</div></td></tr>`;
    return;
  }
  const sorted = filtered.slice().sort((a,b) => {
    if (a.okr !== b.okr) return a.okr.localeCompare(b.okr);
    if (a.keyResult !== b.keyResult) return a.keyResult.localeCompare(b.keyResult);
    if (a.subKeyResult !== b.subKeyResult) return a.subKeyResult.localeCompare(b.subKeyResult);
    // Keep Q1 → Q2 → Q3 → Q4 ordering when multiple Children share a Parent.
    return (a.subKeyResultChild || "").localeCompare(b.subKeyResultChild || "");
  });

  body.innerHTML = sorted.map(r => {
    const c = okrPalette(r.okr);
    const skr = skrPalette(r);
    const s = effectiveStatus(r);
    const sc = statusPalette(s);
    const info = progressBarInfo(r);
    const showGoal = info && info.goalDisplay != null && info.mode !== "completion";
    const progressHtml = !info
      ? `<span style="color: var(--text-dim); font-size: 0.74rem;">—</span>`
      : `
        <div class="mini-progress is-${info.mode} ${info.exceeded ? "is-exceeded" : ""}" title="${info.tooltip}">
          <div class="mini-progress-actual" style="width:${info.barFill}%; --mp-color: ${c.bg}; --mp-color-light: ${c.light};"></div>
          <div class="mini-progress-label">${info.progressDisplay}${showGoal ? ` <span class="mp-goal">/ ${info.goalDisplay}</span>` : ""}</div>
        </div>
      `;
    const childHtml = r.subKeyResultChild
      ? `<span class="cell-skr-child-text">${escapeHtml(r.subKeyResultChild)}</span>`
      : `<span class="cell-dash">—</span>`;
    const stretchHtml = hasStretch(r)
      ? `<span class="cell-stretch-val">${formatValue(r.stretchGoal, r)}</span>`
      : `<span class="cell-dash">—</span>`;
    return `
      <tr data-id="${r.id}">
        <td class="cell-okr" data-label="OKR"><span class="okr-badge" style="background:${c.pale}; color:${c.bg};">${escapeHtml(r.okr)}</span></td>
        <td class="cell-kr" data-label="Key Result">${escapeHtml(r.keyResult)}</td>
        <td class="cell-skr" data-label="Sub-Key Result">
          <div class="skr-wrap" style="background:${skr.pale}; border-left-color:${skr.bg};">
            <span class="skr-dot" style="background:${skr.bg};"></span>
            <span class="skr-text">${escapeHtml(r.subKeyResult)}</span>
          </div>
        </td>
        <td class="cell-skr-child" data-label="Quarter">${childHtml}</td>
        <td class="cell-person" data-label="Stakeholder">${escapeHtml(r.stakeholder)}</td>
        <td class="cell-person cell-person-secondary" data-label="Secondary">${
          secondaryList(r.secondaryStakeholders).length
            ? secondaryList(r.secondaryStakeholders).map(p => `<span class="person-tag">${escapeHtml(p)}</span>`).join("")
            : `<span class="cell-dash">—</span>`
        }</td>
        <td class="cell-person" data-label="Project Manager">${escapeHtml(r.projectManager)}</td>
        <td class="cell-period" data-label="Period">${escapeHtml(r.period)}</td>
        <td data-label="Progress">${progressHtml}</td>
        <td class="cell-stretch" data-label="Stretch Goal">${stretchHtml}</td>
        <td data-label="Status"><span class="status-pill" style="background:${sc.pale}; color:${sc.bg};"><span class="status-dot" style="background:${sc.bg};"></span>${escapeHtml(s)}</span></td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("tr[data-id]").forEach(tr => {
    tr.addEventListener("click", () => openDetailById(parseInt(tr.dataset.id, 10)));
  });
}

/* ═══════════════ RENDER: ALL ═══════════════ */
function renderAll() {
  const filtered = getFiltered();
  renderFilters();
  renderKpis(filtered);
  renderOkrCards(filtered);
  renderStatusDonut(filtered);
  renderStakeholderBars(filtered);
  renderTable(filtered);
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
        const avg = Math.round(o.rows.reduce((s,r)=> s + (r.progress||0), 0) / o.rows.length * 100);
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
        const avg = Math.round(k.rows.reduce((s,r)=> s + (r.progress||0), 0) / k.rows.length * 100);
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
                <span><b>${pct(r.progress)}%</b></span>
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
  const p = pct(r.progress);
  const pp = pct(r.goal);
  const delta = (r.progress != null && r.goal != null) ? p - pp : null;
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
                <span class="mc-related-progress">${pct(rr.progress)}%</span>
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
            ${ringSvg(ringCx, ringCy, ringR, ringSw, p, c.bg)}
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
                  <span class="mc-delta ${delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"}">
                    ${delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} ${Math.abs(delta)} pts
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
  const avg = Math.round(rows.reduce((s,r)=> s + (r.progress||0), 0) / rows.length * 100);
  const avgPlan = Math.round(rows.reduce((s,r)=> s + (r.goal||0), 0) / rows.length * 100);
  const delta = avg - avgPlan;

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
              <div class="mc-comp-label">Avg Progress</div>
              <div class="mc-comp-value">${avg}%</div>
            </div>
            <div class="mc-comp-block">
              <div class="mc-comp-label">Avg Goal</div>
              <div class="mc-comp-value">${avgPlan}%</div>
            </div>
            <div class="mc-comp-block">
              <div class="mc-comp-label">Delta</div>
              <div class="mc-comp-value">
                <span class="mc-delta ${delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"}">
                  ${delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} ${Math.abs(delta)} pts
                </span>
              </div>
            </div>
          </div>
          <div class="mc-progress-bar-wrap">
            <div class="mc-progress-bar-actual" style="width:${avg}%;"></div>
            <div class="mc-progress-bar-planned" style="left:${avgPlan}%;"></div>
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
                  <span class="mc-related-progress">${pct(rr.progress)}%</span>
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
  document.getElementById("filterPm").addEventListener("change", e => { state.pm = e.target.value; renderAll(); });
  document.getElementById("filterPeriod").addEventListener("change", e => { state.period = e.target.value; renderAll(); });
  document.getElementById("filterSearch").addEventListener("input", e => { state.search = e.target.value; renderAll(); });
  document.getElementById("filterClear").addEventListener("click", () => {
    Object.assign(state, { okr: "All", status: "All", stakeholder: "All", pm: "All", period: "All", search: "" });
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

document.addEventListener("DOMContentLoaded", () => {
  applyUrlFilters();
  initFilters();
  initSpotlight();
  initModal();
  renderAll();
  window.SS.initReveal();
});
