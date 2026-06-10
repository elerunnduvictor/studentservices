/* ═══════════════ STUDENT SERVICES — OKR CARDS ═══════════════
   Shared renderer for the 3 OKR overview cards used on:
     • /index.html              (home page summary section)
     • /okr-progress/index.html (top of the full dashboard)

   Each card shows the OKR title, an SVG progress ring (avg progress
   across its sub-KRs), Key Result + Sub-KR counts, a status segment
   strip, and a status legend.

   Self-contained: includes its own escapeHtml/uniq/effectiveStatus/
   palette helpers so it doesn't need shared.js. Click handling is
   left to the caller — every page wires it differently (home opens
   a modal, OKR Progress filters the table) — so the cards are
   rendered as <div role="button" data-okr="..."> and the caller
   attaches a delegated click listener on the grid container.

   Usage:
     window.OkrCards.render({
       target: document.getElementById('homeOkrGrid'),
       rows: window.OKR_PROGRESS_ROWS,
       okrColors: window.OKR_COLORS,
       statusColors: window.STATUS_COLORS
     });
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function uniq(arr) {
    return Array.from(new Set((arr || []).filter(function (x) { return x != null && x !== ""; })));
  }
  /* Status the row should display — derives a safe value when the
     Excel column is blank. Matches okr-progress.js's effectiveStatus. */
  function effectiveStatus(r) {
    if (r.status) return r.status;
    if (r.progress == null) return "Not Started";
    return "On Track";
  }
  function okrPal(name, OKR_COLORS) {
    return OKR_COLORS[name] || { bg: "#065577", light: "#28738A", pale: "rgba(6,85,119,0.12)" };
  }
  function statusPal(s, STATUS_COLORS) {
    return STATUS_COLORS[s] || STATUS_COLORS["Not Started"];
  }

  /* Canonical left-to-right order for the status segment strip + legend
     on each OKR card. Anything not listed falls to the end. */
  var STATUS_ORDER = [
    "Completed - On time",
    "Completed - Late",
    "On Track",
    "Not Started",
    "Delayed",
    "Canceled",
    "At Risk",
    "In Trouble",
    "Archived"
  ];
  function statusRank(s) {
    var i = STATUS_ORDER.indexOf(s);
    return i === -1 ? STATUS_ORDER.length : i;
  }

  function render(opts) {
    var target = opts.target;
    var ROWS = opts.rows;
    var OKR_COLORS = opts.okrColors;
    var STATUS_COLORS = opts.statusColors;
    if (!target || !ROWS || !OKR_COLORS || !STATUS_COLORS) return;

    /* Bucket rows by OKR name, preserving the order they first appear. */
    var orderedOkrs = [];
    var byOkr = {};
    ROWS.forEach(function (r) {
      if (!byOkr[r.okr]) { byOkr[r.okr] = []; orderedOkrs.push(r.okr); }
      byOkr[r.okr].push(r);
    });

    target.innerHTML = orderedOkrs.map(function (okr) {
      var rows = byOkr[okr];
      var c = okrPal(okr, OKR_COLORS);
      var krCount = uniq(rows.map(function (r) { return r.keyResult; })).length;
      var avg = Math.round(rows.reduce(function (s, r) { return s + (r.progress || 0); }, 0) / rows.length * 100);

      /* Status bucket counts for the segment strip + legend. Sorted by
         STATUS_ORDER so each card reads left→right in the canonical order. */
      var statusBuckets = {};
      rows.forEach(function (r) {
        var s = effectiveStatus(r);
        statusBuckets[s] = (statusBuckets[s] || 0) + 1;
      });
      var statusKeys = Object.keys(statusBuckets).sort(function (a, b) {
        return statusRank(a) - statusRank(b);
      });
      var segHtml = statusKeys.map(function (s) {
        var sc = statusPal(s, STATUS_COLORS).bg;
        var n = statusBuckets[s];
        return '<div class="okr-status-seg" style="flex:' + n + ';background:' + sc + ';" title="' + esc(s) + ': ' + n + '"></div>';
      }).join("");
      var legendHtml = statusKeys.map(function (s) {
        var sc = statusPal(s, STATUS_COLORS).bg;
        var n = statusBuckets[s];
        return '<span class="okr-legend-item"><span class="okr-legend-dot" style="background:' + sc + ';"></span>' + esc(s) + ' <b>' + n + '</b></span>';
      }).join("");

      /* SVG ring geometry. */
      var size = 70, rad = 26, cx = size / 2, cy = size / 2, sw = 7;
      var circ = 2 * Math.PI * rad;
      var dash = circ * (avg / 100);

      /* Note: no data-reveal on the card itself — the grid container
         (#okrpOkrGrid / #homeOkrGrid) carries data-reveal for the entry
         animation. Putting it on each card would re-hide them every time
         we re-render (filter change / Clear button) since the
         IntersectionObserver only runs once per element. */
      return ''
        + '<div class="okr-card" role="button" tabindex="0" data-okr="' + esc(okr) + '" '
        +      'style="--okr-color:' + c.bg + ';" aria-label="Open ' + esc(okr) + '">'
        +   '<div class="okr-card-eyebrow">Objective</div>'
        +   '<div class="okr-card-title">' + esc(okr) + '</div>'
        +   '<div class="okr-card-stats">'
        +     '<div class="okr-ring-wrap">'
        +       '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
        +         '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="none" stroke="var(--bg-elevated)" stroke-width="' + sw + '"/>'
        +         '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="none" stroke="' + c.bg + '" stroke-width="' + sw + '" '
        +           'stroke-dasharray="' + dash + ' ' + circ + '" stroke-linecap="round" '
        +           'transform="rotate(-90 ' + cx + ' ' + cy + ')"/>'
        +       '</svg>'
        +       '<div class="okr-ring-val">' + avg + '%</div>'
        +     '</div>'
        +     '<div class="okr-card-metrics">'
        +       '<div class="okr-metric-row"><span>Key Results</span><b>' + krCount + '</b></div>'
        +       '<div class="okr-metric-row"><span>Sub-KRs</span><b>' + rows.length + '</b></div>'
        +       '<div class="okr-metric-row"><span>Avg Progress</span><b>' + avg + '%</b></div>'
        +     '</div>'
        +   '</div>'
        +   '<div class="okr-card-status-strip">' + (segHtml || '<div class="okr-status-seg" style="flex:1;background:var(--bg-elevated);"></div>') + '</div>'
        +   '<div class="okr-card-legend">' + legendHtml + '</div>'
        + '</div>';
    }).join("");
  }

  window.OkrCards = { render: render };
})();
