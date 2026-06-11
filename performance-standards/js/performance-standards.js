/* ═══════════════ NWCCU STANDARDS — RENDERER + FILTERS ═══════════════
   Renders the 12 sectioned tables from window.NWCCU_SECTIONS and wires
   the search / standard / steward filters on top. Each Key Metric gets
   converted to a clickable link when window.NWCCU_METRIC_LINKS has a URL
   for that exact metric label.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SECTIONS = window.NWCCU_SECTIONS || [];
  var INTRO    = window.NWCCU_INTRO || "";
  var LINKS    = window.NWCCU_METRIC_LINKS || {};
  var esc      = window.SS.escapeHtml;
  var uniq     = window.SS.unique;

  /* ──────── Per-section accent colors ────────
     8 BYU-Pathway HSL anchors × cycled across the 12 sections so adjacent
     sections always get visually distinct colors. Same hex in light + dark
     mode (mirrors the OKR Progress SKR_COLORS pattern). */
  var ANCHORS = [
    { h: 198, s: 90, l: 23 },
    { h: 188, s: 45, l: 42 },
    { h: 175, s: 75, l: 30 },
    { h: 318, s: 25, l: 50 },
    { h:  40, s: 75, l: 40 },
    { h:  71, s: 53, l: 38 },
    { h:  13, s: 67, l: 47 },
    { h: 239, s: 50, l: 50 }
  ];
  function sectionColor(idx /* 1-based */) {
    var a = ANCHORS[(idx - 1) % ANCHORS.length];
    var bg   = "hsl("  + a.h + ", " + a.s + "%, " + a.l + "%)";
    var pale = "hsla(" + a.h + ", " + a.s + "%, " + a.l + "%, 0.10)";
    return { bg: bg, pale: pale };
  }

  /* NWCCU standard family colors — e.g. "1.B.1" → family "1.B" → color.
     Lets every chip with the same family share a visual identity. */
  var STANDARD_COLORS = {
    "1.A": { bg: "#3A929D", pale: "rgba(58,146,157,0.14)" },
    "1.B": { bg: "#065577", pale: "rgba(6,85,119,0.14)"   },
    "1.C": { bg: "#168980", pale: "rgba(22,137,128,0.14)" },
    "1.D": { bg: "#B687AC", pale: "rgba(182,135,172,0.14)"},
    "2.A": { bg: "#D4A020", pale: "rgba(212,160,32,0.14)" },
    "2.B": { bg: "#A2C23D", pale: "rgba(162,194,61,0.14)" },
    "2.C": { bg: "#CB4A27", pale: "rgba(203,74,39,0.14)"  },
    "2.G": { bg: "#5E60CE", pale: "rgba(94,96,206,0.14)"  }
  };
  function standardFamily(code) {
    // "1.B.1" → "1.B"; "1.A" → "1.A"
    var parts = code.split(".");
    return parts.length >= 2 ? parts[0] + "." + parts[1] : code;
  }
  function standardColor(code) {
    return STANDARD_COLORS[standardFamily(code)] || { bg: "#7F898A", pale: "rgba(127,137,138,0.14)" };
  }

  /* Stable case-insensitive lookup for metric → URL. */
  var LINK_INDEX = {};
  Object.keys(LINKS).forEach(function (k) { LINK_INDEX[k.toLowerCase()] = LINKS[k]; });
  function metricLink(text) {
    if (!text) return null;
    return LINK_INDEX[text.toLowerCase()] || null;
  }

  /* Case-insensitive lookup for metrics that should get the
     "(no report for now)" suffix. */
  var NO_REPORT_INDEX = {};
  (window.NWCCU_METRIC_NO_REPORT || []).forEach(function (k) {
    NO_REPORT_INDEX[k.toLowerCase()] = true;
  });
  function isNoReport(text) {
    return !!(text && NO_REPORT_INDEX[text.toLowerCase()]);
  }

  /* ──────── State ──────── */
  var state = {
    standard: "All",
    steward: "All",
    search: ""
  };

  function getMatchingRows() {
    var q = state.search.trim().toLowerCase();
    return SECTIONS.map(function (sec) {
      var matches = sec.services.filter(function (svc) {
        if (state.standard !== "All" && svc.standards.indexOf(state.standard) === -1) return false;
        if (state.steward !== "All" && svc.stewards.indexOf(state.steward) === -1) return false;
        if (q) {
          var hay = (svc.service + " " + svc.evidence + " " + svc.keyMetrics + " " +
                     svc.cadence + " " + svc.standards.join(" ") + " " +
                     svc.stewards.join(" ")).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
      return { section: sec, matches: matches };
    });
  }

  /* ──────── Renderers ──────── */
  function renderIntro() {
    var el = document.getElementById("nwHeroSub");
    if (el) el.textContent = INTRO;
  }

  function renderKpis() {
    var serviceTotal = SECTIONS.reduce(function (n, s) { return n + s.services.length; }, 0);
    var standards = {}, stewards = {};
    SECTIONS.forEach(function (s) {
      s.services.forEach(function (svc) {
        svc.standards.forEach(function (st) { standards[st] = 1; });
        svc.stewards.forEach(function (sw) { stewards[sw] = 1; });
      });
    });
    document.getElementById("nwKpis").innerHTML = ""
      + '<div class="kpi-card" style="--kpi-color: var(--deep-teal);">'
      +   '<div class="kpi-label">Service Categories</div>'
      +   '<div class="kpi-value">' + SECTIONS.length + '</div>'
      +   '<div class="kpi-sub">in this appendix</div>'
      + '</div>'
      + '<div class="kpi-card" style="--kpi-color: #3A929D;">'
      +   '<div class="kpi-label">Services Mapped</div>'
      +   '<div class="kpi-value">' + serviceTotal + '</div>'
      +   '<div class="kpi-sub">to NWCCU standards</div>'
      + '</div>'
      + '<div class="kpi-card" style="--kpi-color: #B687AC;">'
      +   '<div class="kpi-label">NWCCU Standards</div>'
      +   '<div class="kpi-value">' + Object.keys(standards).length + '</div>'
      +   '<div class="kpi-sub">distinct codes referenced</div>'
      + '</div>'
      + '<div class="kpi-card" style="--kpi-color: var(--gold);">'
      +   '<div class="kpi-label">Stewards</div>'
      +   '<div class="kpi-value">' + Object.keys(stewards).length + '</div>'
      +   '<div class="kpi-sub">accountable parties</div>'
      + '</div>';
  }

  function renderFilters() {
    var allStandards = uniq(SECTIONS.reduce(function (acc, s) {
      return acc.concat(s.services.reduce(function (a, svc) { return a.concat(svc.standards); }, []));
    }, [])).sort(naturalStandardSort);
    var allStewards = uniq(SECTIONS.reduce(function (acc, s) {
      return acc.concat(s.services.reduce(function (a, svc) { return a.concat(svc.stewards); }, []));
    }, [])).sort();

    var stdSel = document.getElementById("filterStandard");
    var stwSel = document.getElementById("filterSteward");
    stdSel.innerHTML = '<option value="All">All standards</option>' +
      allStandards.map(function (s) { return '<option value="' + esc(s) + '"' + (s === state.standard ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join("");
    stwSel.innerHTML = '<option value="All">All stewards</option>' +
      allStewards.map(function (s) { return '<option value="' + esc(s) + '"' + (s === state.steward ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join("");

    var dirty = state.standard !== "All" || state.steward !== "All" || state.search;
    document.getElementById("filterClear").disabled = !dirty;
  }

  /* Sort standards naturally: 1.A.1, 1.A.2, 1.B, 1.C.1, 2.A, 2.G.7 */
  function naturalStandardSort(a, b) {
    var pa = a.split("."), pb = b.split(".");
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = pa[i] || "", y = pb[i] || "";
      if (x !== y) {
        var nx = parseInt(x, 10), ny = parseInt(y, 10);
        if (!isNaN(nx) && !isNaN(ny)) return nx - ny;
        return x < y ? -1 : 1;
      }
    }
    return 0;
  }

  function renderToc() {
    var html = SECTIONS.map(function (sec) {
      var c = sectionColor(sec.index);
      return '<a href="#' + esc(sec.id) + '" class="nw-toc-pill" style="--sec-color:' + c.bg + ';--sec-pale:' + c.pale + ';">'
           +   '<span class="nw-toc-num">' + sec.index + '</span>'
           +   '<span class="nw-toc-name">' + esc(sec.title) + '</span>'
           + '</a>';
    }).join("");
    document.getElementById("nwToc").innerHTML = html;
  }

  function highlight(text, q) {
    if (!q) return esc(text);
    var safe = esc(text);
    var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    return safe.replace(re, '<mark>$1</mark>');
  }

  function renderSections() {
    var groups = getMatchingRows();
    var q = state.search.trim().toLowerCase();
    var matchCount = 0;

    var html = groups.map(function (g) {
      var sec = g.section;
      var rows = g.matches;
      matchCount += rows.length;

      var c = sectionColor(sec.index);
      var totalInSection = sec.services.length;
      var headerNote = (rows.length === totalInSection)
        ? totalInSection + ' service' + (totalInSection === 1 ? '' : 's')
        : rows.length + ' of ' + totalInSection + ' services match';

      // Skip rendering empty sections when a filter is active
      var hidden = rows.length === 0 ? ' hidden' : '';

      var rowsHtml = rows.map(function (svc) {
        var stdChips = svc.standards.map(function (st) {
          var sc = standardColor(st);
          return '<span class="nw-std-chip" style="background:' + sc.pale + ';color:' + sc.bg + ';">' + esc(st) + '</span>';
        }).join('');

        var stwHtml = svc.stewards.map(function (sw) {
          return '<span class="nw-steward">' + esc(sw) + '</span>';
        }).join('');

        var metricUrl = metricLink(svc.keyMetrics);
        var metricHtml;
        if (metricUrl) {
          metricHtml = '<a class="nw-metric-link" href="' + esc(metricUrl) + '" target="_blank" rel="noopener" title="Open dashboard for ' + esc(svc.keyMetrics) + '">'
            + '<span>' + highlight(svc.keyMetrics, q) + '</span>'
            + '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>'
            + '</a>';
        } else if (isNoReport(svc.keyMetrics)) {
          metricHtml = '<span class="nw-metric-text">' + highlight(svc.keyMetrics, q) + '</span>'
            + ' <span class="nw-metric-pending">(no report for now)</span>';
        } else {
          metricHtml = '<span class="nw-metric-text">' + highlight(svc.keyMetrics, q) + '</span>';
        }

        return ''
          + '<tr>'
          +   '<td class="nw-cell-service">' + highlight(svc.service, q) + '</td>'
          +   '<td class="nw-cell-standards">' + stdChips + '</td>'
          +   '<td class="nw-cell-stewards">' + stwHtml + '</td>'
          +   '<td class="nw-cell-evidence">' + highlight(svc.evidence, q) + '</td>'
          +   '<td class="nw-cell-metrics">' + metricHtml + '</td>'
          +   '<td class="nw-cell-cadence"><em>' + highlight(svc.cadence, q) + '</em></td>'
          + '</tr>';
      }).join("");

      return ''
        + '<section class="nw-sec" id="' + esc(sec.id) + '" style="--sec-color:' + c.bg + ';--sec-pale:' + c.pale + ';"' + hidden + ' data-reveal>'
        +   '<div class="nw-sec-head">'
        +     '<div class="nw-sec-num">' + sec.index + '</div>'
        +     '<div class="nw-sec-titles">'
        +       '<div class="nw-sec-eyebrow">Service Category ' + sec.index + ' of ' + SECTIONS.length + '</div>'
        +       '<h2 class="nw-sec-title">' + esc(sec.title) + '</h2>'
        +       '<div class="nw-sec-meta">' + headerNote + '</div>'
        +     '</div>'
        +     '<a href="#nwToc" class="nw-sec-totop" title="Back to top">'
        +       '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>'
        +     '</a>'
        +   '</div>'
        +   '<div class="nw-table-wrap">'
        +     '<table class="nw-table">'
        +       '<thead><tr>'
        +         '<th>Service</th>'
        +         '<th>NWCCU Standards</th>'
        +         '<th>Steward(s)</th>'
        +         '<th>Evidence / Artifact</th>'
        +         '<th>Key Metrics</th>'
        +         '<th>Cadence of Review</th>'
        +       '</tr></thead>'
        +       '<tbody>' + rowsHtml + '</tbody>'
        +     '</table>'
        +   '</div>'
        + '</section>';
    }).join("");

    document.getElementById("nwSections").innerHTML = html;
    document.getElementById("nwEmpty").hidden = matchCount > 0;

    var mc = document.getElementById("nwMatchCount");
    var anyFilter = state.standard !== "All" || state.steward !== "All" || state.search;
    if (anyFilter) {
      mc.textContent = matchCount + ' of ' + SECTIONS.reduce(function (n, s) { return n + s.services.length; }, 0) + ' services';
    } else {
      mc.textContent = "";
    }

    // Re-trigger reveal observer on newly-rendered sections
    if (window.SS && window.SS.initReveal) window.SS.initReveal();
  }

  function renderAll() {
    renderFilters();
    renderSections();
  }

  /* ──────── Wire events ──────── */
  function initFilters() {
    document.getElementById("filterStandard").addEventListener("change", function (e) {
      state.standard = e.target.value; renderAll();
    });
    document.getElementById("filterSteward").addEventListener("change", function (e) {
      state.steward = e.target.value; renderAll();
    });
    document.getElementById("filterSearch").addEventListener("input", function (e) {
      state.search = e.target.value; renderAll();
    });
    document.getElementById("filterClear").addEventListener("click", function () {
      state.standard = "All"; state.steward = "All"; state.search = "";
      document.getElementById("filterSearch").value = "";
      renderAll();
    });
  }

  /* ──────── Boot ──────── */
  document.addEventListener("DOMContentLoaded", function () {
    renderIntro();
    renderKpis();
    renderToc();
    initFilters();
    renderAll();
  });
})();
