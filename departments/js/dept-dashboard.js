/* ═══════════════ PER-DEPT MINI DASHBOARD ═══════════════
   Requires window.EMPLOYEES, window.DEPT_COLORS, window.TYPE_COLORS
   (loaded from directory/js/employees.js), and window.DEPT_NAME
   set inline on the dept page. */
(function() {
  var DEPT = window.DEPT_NAME;
  if (!DEPT || !window.EMPLOYEES) return;

  var container = document.getElementById('deptDashboard');
  if (!container) return;

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function(c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  var filtered = window.EMPLOYEES.filter(function(e) { return e.dept === DEPT; });
  var total = filtered.length;
  var fte = filtered.filter(function(e) { return e.type === "Full-Time Employee"; }).length;
  var ftt = filtered.filter(function(e) { return e.type === "Full-Time Temporary"; }).length;
  var ptt = filtered.filter(function(e) { return e.type === "Part-Time Temporary"; }).length;
  var contractors = filtered.filter(function(e) { return e.type === "Contractor"; }).length;
  var subSet = {};
  filtered.forEach(function(e) { if (e.subDept) subSet[e.subDept] = true; });
  var subCount = Object.keys(subSet).length;
  var ftePct = total ? Math.round(fte / total * 100) : 0;
  var contractorPct = total ? Math.round(contractors / total * 100) : 0;

  var deptC = (window.DEPT_COLORS && window.DEPT_COLORS[DEPT]) || { bg: "#065577", light: "#28738A" };
  var typeC = window.TYPE_COLORS || {};

  // KPI cards
  var kpiHtml = ''
    + '<div class="dd-kpi" style="--kpi-color:' + deptC.bg + ';">'
    +   '<div class="dd-kpi-label">Total Employees</div>'
    +   '<div class="dd-kpi-value">' + total + '</div>'
    +   '<div class="dd-kpi-sub">across ' + subCount + ' sub-dept' + (subCount === 1 ? '' : 's') + '</div>'
    + '</div>'
    + '<div class="dd-kpi" style="--kpi-color:#065577;">'
    +   '<div class="dd-kpi-label">Full-Time</div>'
    +   '<div class="dd-kpi-value">' + fte + '</div>'
    +   '<div class="dd-kpi-sub">' + ftePct + '% of dept</div>'
    + '</div>'
    + '<div class="dd-kpi" style="--kpi-color:#7F898A;">'
    +   '<div class="dd-kpi-label">Contractors</div>'
    +   '<div class="dd-kpi-value">' + contractors + '</div>'
    +   '<div class="dd-kpi-sub">' + contractorPct + '% of dept</div>'
    + '</div>'
    + '<div class="dd-kpi" style="--kpi-color:#FFC328;">'
    +   '<div class="dd-kpi-label">Sub-Departments</div>'
    +   '<div class="dd-kpi-value">' + subCount + '</div>'
    +   '<div class="dd-kpi-sub">functional areas</div>'
    + '</div>';

  // Sub-dept bar chart
  var subCounts = {};
  filtered.forEach(function(e) {
    if (!e.subDept) return;
    subCounts[e.subDept] = (subCounts[e.subDept] || 0) + 1;
  });
  var subRows = Object.keys(subCounts)
    .map(function(k) { return { label: k, value: subCounts[k] }; })
    .sort(function(a, b) { return b.value - a.value; });
  var maxSub = subRows.reduce(function(m, r) { return Math.max(m, r.value); }, 1);

  var barHtml = '';
  if (subRows.length) {
    barHtml = subRows.map(function(r) {
      var pct = (r.value / maxSub) * 100;
      return ''
        + '<div class="dd-bar-row">'
        +   '<div class="dd-bar-label" title="' + esc(r.label) + '">' + esc(r.label) + '</div>'
        +   '<div class="dd-bar-track">'
        +     '<div class="dd-bar-fill" style="width:' + pct + '%; --bar-color:' + deptC.bg + '; --bar-color-light:' + deptC.light + ';">'
        +       '<span class="dd-bar-value">' + r.value + '</span>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    }).join('');
  } else {
    barHtml = '<div class="dd-empty">No sub-department data.</div>';
  }

  // Employment-type donut
  var typeBreakdown = [
    { label: "Full-Time Employee",  value: fte,         color: typeC["Full-Time Employee"]  || "#065577" },
    { label: "Full-Time Temporary", value: ftt,         color: typeC["Full-Time Temporary"] || "#28738A" },
    { label: "Part-Time Temporary", value: ptt,         color: typeC["Part-Time Temporary"] || "#FFC328" },
    { label: "Contractor",          value: contractors, color: typeC["Contractor"]          || "#7F898A" },
  ].filter(function(d) { return d.value > 0; });

  var donutHtml;
  if (!total) {
    donutHtml = '<div class="dd-empty">No data.</div>';
  } else {
    var size = 180, cx = size / 2, cy = size / 2, r = size * 0.36, strokeW = size * 0.14;
    var cumulative = 0;
    var segs = typeBreakdown.map(function(d) {
      var start = cumulative;
      cumulative += d.value / total;
      var startA = start * 2 * Math.PI - Math.PI / 2;
      var endA = cumulative * 2 * Math.PI - Math.PI / 2;
      var largeArc = d.value / total > 0.5 ? 1 : 0;
      var x1 = cx + r * Math.cos(startA);
      var y1 = cy + r * Math.sin(startA);
      var x2 = cx + r * Math.cos(endA);
      var y2 = cy + r * Math.sin(endA);
      if (typeBreakdown.length === 1) {
        // full circle
        return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + d.color + '" stroke-width="' + strokeW + '"/>';
      }
      return '<path d="M ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + '" fill="none" stroke="' + d.color + '" stroke-width="' + strokeW + '" stroke-linecap="butt"/>';
    }).join('');

    var legend = typeBreakdown.map(function(d) {
      return ''
        + '<div class="dd-legend-item">'
        +   '<span class="dd-dot" style="background:' + d.color + ';"></span>'
        +   '<span>' + esc(d.label) + ': <b>' + d.value + '</b></span>'
        + '</div>';
    }).join('');

    donutHtml = ''
      + '<div class="dd-donut-wrap">'
      +   '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      +     segs
      +     '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" class="dd-donut-center-val">' + total + '</text>'
      +     '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" class="dd-donut-center-label">Total</text>'
      +   '</svg>'
      +   '<div class="dd-legend">' + legend + '</div>'
      + '</div>';
  }

  container.innerHTML = ''
    + '<div class="dd-kpis">' + kpiHtml + '</div>'
    + '<div class="dd-charts">'
    +   '<div class="dd-card">'
    +     '<div class="dd-card-title">Team by Sub-Department</div>'
    +     '<div class="dd-bars">' + barHtml + '</div>'
    +   '</div>'
    +   '<div class="dd-card">'
    +     '<div class="dd-card-title">Employment Type Mix</div>'
    +     donutHtml
    +   '</div>'
    + '</div>';
})();
