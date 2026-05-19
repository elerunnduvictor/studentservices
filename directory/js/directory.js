/* ═══════════════ SHARED DATA (from employees.js) ═══════════════ */
const EMPLOYEES = window.EMPLOYEES;
const DEPT_COLORS = window.DEPT_COLORS;
const TYPE_COLORS = window.TYPE_COLORS;
const STUDENT_CONTRACTORS = window.STUDENT_CONTRACTORS || {};

/* ═══════════════ STATE ═══════════════ */
const state = {
  dept: "All",
  subDept: "All",
  type: "All",
  search: "",
};

/* ═══════════════ HELPERS ═══════════════ */
function unique(arr) { return Array.from(new Set(arr)); }
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[c]));
}

function getFiltered() {
  const q = state.search.trim().toLowerCase();
  return EMPLOYEES.filter(e => {
    if (state.dept !== "All" && e.dept !== state.dept) return false;
    if (state.subDept !== "All" && e.subDept !== state.subDept) return false;
    if (state.type !== "All" && e.type !== state.type) return false;
    if (q && !e.name.toLowerCase().includes(q) && !e.role.toLowerCase().includes(q)) return false;
    return true;
  });
}

/* Student contractors are aggregate-only — they have no individual records,
   sub-dept, or name to search. Include them only when the active filters
   don't exclude them (no sub-dept narrowing, no search term, and the type
   filter is either "All" or "Student Contractor"). Returns a { dept: count }
   map scoped to the active dept filter. */
function getFilteredStudentContractors() {
  if (state.type !== "All" && state.type !== "Student Contractor") return {};
  if (state.subDept !== "All") return {};
  if (state.search) return {};
  if (state.dept === "All") return Object.assign({}, STUDENT_CONTRACTORS);
  if (STUDENT_CONTRACTORS[state.dept] != null) {
    return { [state.dept]: STUDENT_CONTRACTORS[state.dept] };
  }
  return {};
}

/* ═══════════════ RENDER: FILTERS ═══════════════ */
function renderFilters() {
  const deptSel = document.getElementById("filterDept");
  const subSel = document.getElementById("filterSubDept");
  const typeSel = document.getElementById("filterType");
  const clearBtn = document.getElementById("filterClear");

  const depts = ["All", ...unique(EMPLOYEES.map(e => e.dept)).sort()];
  // Include "Student Contractor" even though no individual employees carry that type —
  // its count is aggregate-only and surfaced via the Student Contractors card / donut.
  const baseTypes = unique(EMPLOYEES.map(e => e.type)).filter(Boolean);
  if (!baseTypes.includes("Student Contractor")) baseTypes.push("Student Contractor");
  const types = ["All", ...baseTypes.sort()];
  const subBase = state.dept === "All" ? EMPLOYEES : EMPLOYEES.filter(e => e.dept === state.dept);
  const subs = ["All", ...unique(subBase.map(e => e.subDept)).filter(Boolean).sort()];

  deptSel.innerHTML = depts.map(d => `<option value="${escapeHtml(d)}"${d===state.dept?" selected":""}>${escapeHtml(d)}</option>`).join("");
  subSel.innerHTML = subs.map(s => `<option value="${escapeHtml(s)}"${s===state.subDept?" selected":""}>${s==="All"?"All Sub-Departments":escapeHtml(s)}</option>`).join("");
  typeSel.innerHTML = types.map(t => `<option value="${escapeHtml(t)}"${t===state.type?" selected":""}>${t==="All"?"All Employment Types":escapeHtml(t)}</option>`).join("");

  const hasFilters = state.dept !== "All" || state.subDept !== "All" || state.type !== "All" || state.search;
  clearBtn.disabled = !hasFilters;
}

/* ═══════════════ RENDER: KPIs ═══════════════ */
function renderKpis(filtered) {
  const scByDept = getFilteredStudentContractors();
  const studentContractors = Object.values(scByDept).reduce((s, n) => s + n, 0);
  const orgTotalSC = Object.values(STUDENT_CONTRACTORS).reduce((s, n) => s + n, 0);
  const orgTotal = EMPLOYEES.length + orgTotalSC;

  const total = filtered.length + studentContractors;
  const fte = filtered.filter(e => e.type === "Full-Time Employee").length;
  const contractors = filtered.filter(e => e.type === "Professional Contractor").length;
  const studentEmployees = filtered.filter(e => e.type === "Student Employee").length;
  const deptCount = new Set([
    ...filtered.map(e => e.dept),
    ...Object.keys(scByDept).filter(d => scByDept[d] > 0),
  ]).size;
  const ftePct = total ? Math.round(fte / total * 100) : 0;
  const contractorPct = total ? Math.round(contractors / total * 100) : 0;
  const studentEmpPct = total ? Math.round(studentEmployees / total * 100) : 0;
  const studentConPct = total ? Math.round(studentContractors / total * 100) : 0;

  document.getElementById("dirKpis").innerHTML = `
    <div class="kpi-card" style="--kpi-color: var(--bp-teal);">
      <div class="kpi-label">Total Employees</div>
      <div class="kpi-value">${total}</div>
      <div class="kpi-sub">of ${orgTotal} in org</div>
    </div>
    <div class="kpi-card" style="--kpi-color: var(--type-fte);">
      <div class="kpi-label">Full-Time</div>
      <div class="kpi-value">${fte}</div>
      <div class="kpi-sub">${ftePct}% of filtered</div>
    </div>
    <div class="kpi-card" style="--kpi-color: var(--type-contractor);">
      <div class="kpi-label">Professional Contractors</div>
      <div class="kpi-value">${contractors}</div>
      <div class="kpi-sub">${contractorPct}% of filtered</div>
    </div>
    <div class="kpi-card" style="--kpi-color: var(--type-student-employee);">
      <div class="kpi-label">Student Employees</div>
      <div class="kpi-value">${studentEmployees}</div>
      <div class="kpi-sub">${studentEmpPct}% of filtered</div>
    </div>
    <div class="kpi-card" style="--kpi-color: var(--type-student-contractor);">
      <div class="kpi-label">Student Contractors</div>
      <div class="kpi-value">${studentContractors}</div>
      <div class="kpi-sub">${studentConPct}% of filtered</div>
    </div>
    <div class="kpi-card" style="--kpi-color: var(--bp-gold);">
      <div class="kpi-label">Departments</div>
      <div class="kpi-value">${deptCount}</div>
      <div class="kpi-sub">represented</div>
    </div>
  `;
}

/* ═══════════════ RENDER: BAR CHART ═══════════════ */
function renderBarChart(filtered) {
  const counts = {};
  filtered.forEach(e => { counts[e.dept] = (counts[e.dept] || 0) + 1; });
  const scByDept = getFilteredStudentContractors();
  Object.entries(scByDept).forEach(([dept, n]) => {
    if (n > 0) counts[dept] = (counts[dept] || 0) + n;
  });
  const rows = Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);
  const max = Math.max(...rows.map(r => r.value), 1);

  const target = document.getElementById("deptBars");
  if (!rows.length) {
    target.innerHTML = `<div class="dir-empty">No data for the current filters.</div>`;
    return;
  }
  target.innerHTML = rows.map(r => {
    const c = DEPT_COLORS[r.label] || { bg: "#065577", light: "#28738A" };
    const pct = (r.value / max) * 100;
    return `
      <div class="bar-row">
        <div class="bar-label" title="${escapeHtml(r.label)}">${escapeHtml(r.label)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%; --bar-color: ${c.bg}; --bar-color-light: ${c.light};">
            <span class="bar-value">${r.value}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* ═══════════════ RENDER: DONUT CHART ═══════════════ */
function renderDonut(filtered) {
  const counts = {};
  filtered.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });

  // Include Student Contractor totals, scoped by all active filters.
  const sc = Object.values(getFilteredStudentContractors()).reduce((s, n) => s + n, 0);
  if (sc > 0) counts["Student Contractor"] = sc;

  const data = Object.entries(counts)
    .map(([label, value]) => ({ label, value, color: TYPE_COLORS[label] || "#7F898A" }))
    .sort((a,b) => b.value - a.value);
  const total = data.reduce((s,d) => s + d.value, 0);

  const target = document.getElementById("typeDonut");
  if (!total) {
    target.innerHTML = `<div class="dir-empty">No data for the current filters.</div>`;
    return;
  }

  const size = 180, cx = size/2, cy = size/2, r = size * 0.36, strokeW = size * 0.14;
  let cumulative = 0;
  const segments = data.map(d => {
    const start = cumulative;
    cumulative += d.value / total;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const largeArc = d.value / total > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}" fill="none" stroke="${d.color}" stroke-width="${strokeW}" stroke-linecap="butt"/>`;
  }).join("");

  target.innerHTML = `
    <div class="donut-wrap">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${segments}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-center-val">${total}</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="donut-center-label">Total</text>
      </svg>
      <div class="donut-legend">
        ${data.map(d => `
          <div class="donut-legend-item">
            <span class="donut-dot" style="background: ${d.color};"></span>
            <span>${escapeHtml(d.label)}: <b>${d.value}</b></span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

/* ═══════════════ RENDER: TABLE ═══════════════ */
function renderTable(filtered) {
  const body = document.getElementById("dirTableBody");
  const count = document.getElementById("dirCount");
  count.textContent = `Showing ${filtered.length} of ${EMPLOYEES.length}`;

  if (!filtered.length) {
    const msg = state.type === "Student Contractor"
      ? "Student contractors are tracked as aggregate counts only — see the KPI card above for the per-department breakdown."
      : "No employees match your filters.";
    body.innerHTML = `<tr><td colspan="6"><div class="dir-empty">${msg}</div></td></tr>`;
    return;
  }

  const sorted = filtered.slice().sort((a, b) => a.name.localeCompare(b.name));

  body.innerHTML = sorted.map(e => {
    const c = DEPT_COLORS[e.dept] || { bg: "#065577", pale: "#e8f4f5" };
    const tc = TYPE_COLORS[e.type] || "#7F898A";
    return `
      <tr>
        <td class="cell-name">${escapeHtml(e.name)}</td>
        <td class="cell-role">${escapeHtml(e.role)}</td>
        <td><span class="dept-badge" style="background: ${c.pale}; color: ${c.bg};">${escapeHtml(e.dept)}</span></td>
        <td class="cell-sub">${escapeHtml(e.subDept)}</td>
        <td>
          <span class="type-indicator" style="color: ${tc};">
            <span class="type-dot" style="background: ${tc};"></span>
            ${escapeHtml(e.type)}
          </span>
        </td>
        <td class="cell-stakeholder">${escapeHtml(e.stakeholder)}</td>
      </tr>
    `;
  }).join("");
}

/* ═══════════════ RENDER: ALL ═══════════════ */
function renderAll() {
  const filtered = getFiltered();
  renderFilters();
  renderKpis(filtered);
  renderBarChart(filtered);
  renderDonut(filtered);
  renderTable(filtered);
}

/* ═══════════════ WIRE EVENTS ═══════════════ */
function initFilters() {
  document.getElementById("filterDept").addEventListener("change", e => {
    state.dept = e.target.value;
    state.subDept = "All";
    renderAll();
  });
  document.getElementById("filterSubDept").addEventListener("change", e => {
    state.subDept = e.target.value;
    renderAll();
  });
  document.getElementById("filterType").addEventListener("change", e => {
    state.type = e.target.value;
    renderAll();
  });
  document.getElementById("filterSearch").addEventListener("input", e => {
    state.search = e.target.value;
    renderAll();
  });
  document.getElementById("filterClear").addEventListener("click", () => {
    state.dept = "All"; state.subDept = "All"; state.type = "All"; state.search = "";
    document.getElementById("filterSearch").value = "";
    renderAll();
  });
}

/* ═══════════════ NAV + THEME ═══════════════ */
function initNav() {
  const hamburger = document.getElementById("navHamburger");
  const links = document.getElementById("navLinks");
  if (hamburger && links) {
    hamburger.addEventListener("click", () => links.classList.toggle("open"));
  }

  const themeBtn = document.getElementById("themeToggle");
  const saved = localStorage.getItem("ss-theme");
  if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";
      if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("ss-theme", next);
    });
  }
}

/* ═══════════════ REVEAL ANIMATIONS ═══════════════ */
function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("revealed"); io.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll("[data-reveal]").forEach(el => io.observe(el));
}

/* ═══════════════ BOOT ═══════════════ */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initFilters();
  renderAll();
  initReveal();
});
