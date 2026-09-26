/* ═══════════════ COST OUTCOMES ═══════════════
   The third outcome on the KPI Scorecard, beside Student and Operational: what
   share of each department's annual budget has been spent, and where the year
   is heading. scorecard/js/scorecard.js draws the section and routes to it;
   this file supplies the figures, the pages behind it, and the charts.

     #/outcome/cost             every department, and the overview chart
     #/outcome/cost/<dept>      one department: its chart, notes and months

   ── What the numbers are ──

   Every figure is cumulative: "64%" in August means 64% of the whole year's
   budget has gone, not that August alone cost 64%. That is why the lines only
   ever climb — and why a line that falls is a fact about the spreadsheet
   rather than about spending, which this page says out loud instead of drawing
   through.

   `Total` is the department's own figure. It is NOT the sum of Wages, Travel
   and Contract: those are the large categories, not all of them, so the parts
   will not add up to the whole and are not meant to. That is why the Total is
   drawn heaviest and everything else as a thin line beneath it.

   ── Where the year ends up ──

   Ben's rule, and the reason it differs by line: wages and contract spending
   burn at a steady rate, so the latest month says the most about the months
   still to come; travel comes in lumps, so its latest month says almost
   nothing. So Wages and Contract carry their most recent month's increase
   forward to December, Travel carries its average monthly increase, and the
   Total — which is mostly wages and contract — follows its most recent month.

   Nothing is stored: each projection is worked out from the months on record
   every time the page is drawn, so it moves on its own as months are added.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
                     "July", "August", "September", "October", "November", "December"];
  var YEAR_END = 12;                 // December: the month everything projects to

  /* Landing near 100% is the target. Under-spending a quarter of a budget is
     not a win — it means the budget was set wrong — so the scale is two-sided:

       Green   85–105%
       Yellow  75–85% under, or 105–110% over
       Red     below 75%, or above 110%

     Yellow was 85–95% at first; widened to 75–85% on 2026-09-25, which made
     85–95% green. The over-budget side is unchanged. One place to retune. */
  var BANDS = { onLo: 85, onHi: 105, nearLo: 75, nearHi: 110 };

  function statusOf(p) {
    if (p === null || p === undefined || !isFinite(p)) return { key: "nodata", label: "Not tracked" };
    if (p >= BANDS.onLo && p <= BANDS.onHi) return { key: "green", label: "On budget" };
    if (p >= BANDS.nearLo && p < BANDS.onLo) return { key: "yellow", label: "Trending under" };
    if (p > BANDS.onHi && p <= BANDS.nearHi) return { key: "yellow", label: "Trending over" };
    if (p < BANDS.nearLo) return { key: "red", label: "Well under" };
    return { key: "red", label: "Over budget" };
  }

  /* How each line is carried to December. Anything not named here — a new
     category added in the PM Hub — is treated like wages and contract, which is
     the rule Ben gave for everything but travel. */
  var METHOD = { travel: "average", wages: "latest", contract: "latest", total: "latest" };
  function methodOf(key) { return METHOD[key] || "latest"; }

  var CAT_VAR = { wages: "--ck-wages", travel: "--ck-travel", contract: "--ck-contract" };
  function catColor(key) { return "var(" + (CAT_VAR[key] || "--ck-other") + ")"; }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pct(n) {
    if (n === null || n === undefined || !isFinite(n)) return "—";
    return Math.round(n) + "%";
  }
  function slugOf(code) {
    return String(code || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /* ── the arithmetic ────────────────────────────────────────────────────── */

  /** The months of a series, as points. */
  function points(byMonth) {
    return Object.keys(byMonth).map(Number).sort(function (a, b) { return a - b; })
      .map(function (m) { return { x: m, y: byMonth[m] }; });
  }

  /** Where one line ends the year, by the method its category is given. */
  function project(byMonth, method) {
    var pts = points(byMonth);
    var last = pts.length ? pts[pts.length - 1] : null;
    if (pts.length < 2) return { pts: pts, last: last, projected: null, step: null, method: method };
    var from = method === "average" ? pts[0] : pts[pts.length - 2];
    // Per month, so a month missing from the record does not double the step.
    var step = (last.y - from.y) / (last.x - from.x);
    var projected = last.x >= YEAR_END ? last.y : last.y + step * (YEAR_END - last.x);
    return { pts: pts, last: last, projected: projected, step: step, method: method };
  }

  /** Months where a cumulative figure fell, which it cannot honestly do. */
  function dips(byMonth) {
    var pts = points(byMonth), out = [];
    for (var i = 1; i < pts.length; i++) {
      if (pts[i].y < pts[i - 1].y - 0.01) out.push({ from: pts[i - 1], to: pts[i] });
    }
    return out;
  }

  /* ── shaping the rows ──────────────────────────────────────────────────── */

  function build(rows) {
    var byDept = {};
    rows.forEach(function (r) {
      var code = r.dept_code;
      if (!byDept[code]) {
        byDept[code] = { code: code, slug: slugOf(code), label: r.dept_label, palette: r.dept_palette,
                         order: r.dept_order, cats: {}, catOrder: {}, catLabel: {}, total: {} };
      }
      var d = byDept[code], v = Number(r.pct);
      if (!isFinite(v)) return;
      if (r.category_key === "total") { d.total[r.month] = v; return; }
      if (!d.cats[r.category_key]) d.cats[r.category_key] = {};
      d.cats[r.category_key][r.month] = v;
      d.catOrder[r.category_key] = r.category_order;
      d.catLabel[r.category_key] = r.category_label;
    });
    return Object.keys(byDept).map(function (k) {
      var d = byDept[k];
      d.categories = Object.keys(d.cats).sort(function (a, b) {
        return (d.catOrder[a] - d.catOrder[b]) || a.localeCompare(b);
      });
      d.out = project(d.total, methodOf("total"));
      d.catOut = {};
      d.categories.forEach(function (c) { d.catOut[c] = project(d.cats[c], methodOf(c)); });
      d.status = statusOf(d.out.projected);
      return d;
    }).sort(function (a, b) { return a.order - b.order; });
  }

  function deptColor(d) {
    var c = window.DEPT_COLORS && window.DEPT_COLORS[d.palette];
    return (c && c.bg) || "#7F898A";
  }

  function load() {
    var rows = window.COST_BUDGET || [];
    if (!rows.length) return null;
    var depts = build(rows);
    var months = [];
    depts.forEach(function (d) {
      points(d.total).forEach(function (p) { if (months.indexOf(p.x) < 0) months.push(p.x); });
    });
    months.sort(function (a, b) { return a - b; });
    return { year: rows[0].budget_year, depts: depts, months: months,
             first: months[0] || 1, last: months[months.length - 1] || 1 };
  }

  /* ── what the scorecard's section shows ────────────────────────────────── */

  /* The same arithmetic as every other outcome's score — Green 100, Yellow 50,
     Red 0, averaged — applied to each department's status. It is shown on the
     section and does not feed the organisation's health index: that index is a
     roll-up of KPIs, and folding budget into it is a separate decision. */
  var SCORE = { green: 100, yellow: 50, red: 0 };
  var SPECTRUM_KEY = { green: "Green", yellow: "Yellow", red: "Red", nodata: "No Data" };

  /* How much each department counts towards the section's score. The VP's
     budget carries half of it on its own; the other departments share the
     other half equally, so with four of them each is an eighth. Set on
     2026-09-25 — it had been a plain average, one fifth each.

     A department with no projection yet is left out and the rest are scaled
     back up to 100, rather than being scored as a zero it has not earned. */
  var LEAD = "VP";
  var LEAD_SHARE = 0.5;

  function weights(depts) {
    var scored = depts.filter(function (d) { return SCORE[d.status.key] !== undefined; });
    var lead = scored.filter(function (d) { return d.code === LEAD; });
    var rest = scored.filter(function (d) { return d.code !== LEAD; });
    var w = {};
    if (lead.length && rest.length) {
      w[LEAD] = LEAD_SHARE;
      rest.forEach(function (d) { w[d.code] = (1 - LEAD_SHARE) / rest.length; });
    } else {
      // Only one side has figures: it is the whole score.
      scored.forEach(function (d) { w[d.code] = 1 / scored.length; });
    }
    return w;
  }

  function summary() {
    var data = load();
    if (!data) return null;
    var counts = { Green: 0, Yellow: 0, Red: 0, "Manual Review": 0, "No Data": 0 };
    var w = weights(data.depts);
    var sum = 0, scored = 0;
    var depts = data.depts.map(function (d) {
      counts[SPECTRUM_KEY[d.status.key]]++;
      if (w[d.code] !== undefined) { sum += SCORE[d.status.key] * w[d.code]; scored += w[d.code]; }
      return { code: d.code, slug: d.slug, label: d.label, color: deptColor(d),
               last: d.out.last ? d.out.last.y : null, projected: d.out.projected,
               status: d.status, spectrum: SPECTRUM_KEY[d.status.key],
               // Its part of the section's score, 0–1 (weights() makes them sum
               // to 1); null when it has no projection to score.
               share: w[d.code] !== undefined ? w[d.code] : null };
    });
    return { year: data.year, lastMonth: data.last, lastMonthName: MONTH_NAMES[data.last],
             elapsed: Math.round((data.last / YEAR_END) * 100),
             depts: depts, counts: counts, health: scored ? Math.round(sum / scored) : null };
  }

  function deptBySlug(slug) {
    var data = load();
    if (!data) return null;
    return data.depts.filter(function (d) { return d.slug === slug; })[0] || null;
  }

  /* ── drawing ───────────────────────────────────────────────────────────── */

  /* Drawn at the width the card actually has, not stretched from a fixed
     viewBox — a 620-wide drawing squeezed into a 420-wide card takes its
     labels down to 8px with it. */
  function plot(host, cfg) {
    var W = Math.max(280, Math.round(host.clientWidth || 620));
    var small = W < 560;
    var H = cfg.height || (small ? 150 : 210);
    var padL = 30, padR = small ? 40 : 52, padT = 14, padB = 24;
    var x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    var mMin = cfg.monthMin, mMax = YEAR_END;
    var yMax = Math.max(110, Math.ceil(cfg.max / 10) * 10);
    var X = function (m) { return x0 + ((m - mMin) / (mMax - mMin)) * (x1 - x0); };
    var Y = function (v) { return y1 - (v / yMax) * (y1 - y0); };

    var s = [];
    s.push('<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H +
           '" role="img" aria-label="' + esc(cfg.alt || "") + '">');

    for (var g = 0; g <= yMax; g += 25) {
      s.push('<line x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(g) + '" y2="' + Y(g) +
             '" stroke="var(--ck-grid)" stroke-width="1"/>');
      s.push('<text x="' + (x0 - 7) + '" y="' + (Y(g) + 4) + '" text-anchor="end" ' +
             'font-size="10" fill="var(--text-dim)">' + g + "</text>");
    }

    // Spending evenly all year would trace this. It is the honest answer to
    // "should we be worried at 64%?" — which depends entirely on the month.
    s.push('<line x1="' + X(mMin) + '" y1="' + Y((mMin / YEAR_END) * 100) +
           '" x2="' + X(YEAR_END) + '" y2="' + Y(100) +
           '" stroke="var(--ck-pace)" stroke-width="1" stroke-dasharray="2 5" opacity=".85"/>');

    s.push('<line x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(100) + '" y2="' + Y(100) +
           '" stroke="var(--ck-budget)" stroke-width="1.25" stroke-dasharray="6 4" opacity=".75"/>');
    s.push('<text x="' + x1 + '" y="' + (Y(100) - 6) + '" text-anchor="end" font-size="9.5" ' +
           'fill="var(--ck-budget)" opacity=".9">budget</text>');

    var tick = (x1 - x0) / (mMax - mMin) < 34 ? 2 : 1;
    for (var m = mMin; m <= mMax; m += tick) {
      s.push('<text x="' + X(m) + '" y="' + (y1 + 15) + '" text-anchor="middle" font-size="10" ' +
             'fill="var(--text-dim)">' + MONTHS[m] + "</text>");
    }

    function path(pts) {
      return pts.map(function (p, i) {
        return (i ? "L" : "M") + X(p.x).toFixed(1) + " " + Y(p.y).toFixed(1);
      }).join(" ");
    }
    function ahead(last, projected, color, width, opacity, dash) {
      if (projected === null || projected === undefined || !last || last.x >= YEAR_END) return;
      s.push('<path d="M' + X(last.x) + " " + Y(last.y) + "L" + X(YEAR_END) + " " + Y(projected) +
             '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-dasharray="' +
             dash + '" stroke-linecap="round" opacity="' + opacity + '"/>');
    }

    // The categories first, so the Total is never drawn under one of its parts.
    (cfg.series || []).forEach(function (ser) {
      if (!ser.pts.length) return;
      if (ser.pts.length > 1) {
        s.push('<path d="' + path(ser.pts) + '" fill="none" stroke="' + ser.color +
               '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>');
      }
      var e = ser.pts[ser.pts.length - 1];
      // Each category's own trend, faint: a subset of the Total's, not a rival.
      ahead(e, ser.projected, ser.color, 1.3, 0.5, "1 5");
      s.push('<circle cx="' + X(e.x) + '" cy="' + Y(e.y) + '" r="2.75" fill="' + ser.color + '"/>');
    });

    (cfg.totals || []).forEach(function (t) {
      if (!t.pts.length) return;
      if (t.pts.length > 1) {
        s.push('<path d="' + path(t.pts) + '" fill="none" stroke="' + t.color + '" stroke-width="' +
               (t.width || 2.8) + '" stroke-linejoin="round" stroke-linecap="round"/>');
      }
      var last = t.pts[t.pts.length - 1];
      ahead(last, t.projected, t.color, t.width || 2.8, 0.85, "1 6");
      if (t.projected !== null && t.projected !== undefined && last.x < YEAR_END) {
        s.push('<circle cx="' + X(YEAR_END) + '" cy="' + Y(t.projected) + '" r="3.25" fill="' +
               t.color + '" opacity=".9"/>');
        if (t.endLabel !== false) {
          s.push('<text x="' + (X(YEAR_END) + 7) + '" y="' + (Y(t.projected) + 3.5) +
                 '" font-size="11" font-weight="600" fill="' + t.color + '">' + pct(t.projected) + "</text>");
        }
      }
      s.push('<circle cx="' + X(last.x) + '" cy="' + Y(last.y) + '" r="4" fill="' + t.color + '"/>');
      s.push('<circle cx="' + X(last.x) + '" cy="' + Y(last.y) +
             '" r="4" fill="none" stroke="var(--bg-card)" stroke-width="1.5"/>');
    });

    s.push("</svg>");
    host.innerHTML = s.join("");
  }

  /* What each chart on the current page draws, by the id on its placeholder.
     Rebuilt whenever a page is, and read by draw(), so the HTML can be written
     first and the charts drawn once it is in the page and has a width. */
  var PLOTS = {};
  var redraws = [];
  var pending;
  window.addEventListener("resize", function () {
    clearTimeout(pending);
    pending = setTimeout(function () { redraws.forEach(function (f) { f(); }); }, 120);
  });

  function maxOf(d) {
    var max = 100;
    points(d.total).forEach(function (p) { max = Math.max(max, p.y); });
    d.categories.forEach(function (k) {
      points(d.cats[k]).forEach(function (p) { max = Math.max(max, p.y); });
      max = Math.max(max, d.catOut[k].projected || 0);
    });
    return Math.max(max, d.out.projected || 0);
  }

  function deptPlot(d, first) {
    return {
      monthMin: first, max: maxOf(d),
      alt: d.label + ": Total at " + pct(d.out.last && d.out.last.y) + " in " +
           MONTHS[d.out.last ? d.out.last.x : first] + ", trending to " + pct(d.out.projected) + " by December.",
      series: d.categories.map(function (k) {
        return { pts: d.catOut[k].pts, color: catColor(k), projected: d.catOut[k].projected };
      }),
      totals: [{ pts: d.out.pts, color: "var(--ck-total)", width: 2.8, projected: d.out.projected }],
    };
  }

  /** Draw every chart the current page holds. */
  function draw(host) {
    redraws = [];
    (host || document).querySelectorAll("[data-ck-plot]").forEach(function (el) {
      var cfg = PLOTS[el.getAttribute("data-ck-plot")];
      if (!cfg) return;
      var go = function () { plot(el, cfg); };
      redraws.push(go);
      go();
    });
  }

  /* ── the pieces of a page ──────────────────────────────────────────────── */

  function keyHtml(items) {
    return '<div class="ck-key">' + items.map(function (i) {
      return '<span class="ck-key-i" style="color:' + i.color + '">' +
             '<span class="ck-key-s" style="border-top-width:' + (i.weight || 2) + 'px"></span>' +
             '<span style="color:var(--text-muted)">' + esc(i.label) + "</span> " +
             "<b>" + pct(i.value) + "</b>" +
             (i.to !== undefined ? ' <span class="ck-key-to">&rarr; ' + pct(i.to) + "</span>" : "") +
             "</span>";
    }).join("") + "</div>";
  }

  function noteHtml(html) {
    return '<div class="ck-note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
           'stroke="currentColor" stroke-width="2.2"><path d="M12 9v4M12 17h.01"/>' +
           '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>' +
           "</svg><div>" + html + "</div></div>";
  }

  function tableHtml(d, months, open) {
    var head = months.map(function (m) { return "<th>" + MONTHS[m] + "</th>"; }).join("");
    var cell = function (v) {
      return v === undefined ? '<td class="is-empty">—</td>' : "<td>" + pct(v) + "</td>";
    };
    var body = d.categories.map(function (k) {
      return "<tr><th>" + esc(d.catLabel[k]) + "</th>" +
        months.map(function (m) { return cell(d.cats[k][m]); }).join("") + "</tr>";
    }).join("");
    var total = '<tr class="is-total"><th>Total</th>' +
      months.map(function (m) { return cell(d.total[m]); }).join("") + "</tr>";
    return '<div class="ck-table-wrap"' + (open ? "" : " hidden") + '><table class="ck-table">' +
      "<thead><tr><th>Category</th>" + head + "</tr></thead>" +
      "<tbody>" + body + total + "</tbody></table></div>";
  }

  /* One department's card: figures, chart, key, notes, table. `open` is the
     department's own page, where the months are what the reader came for, so
     the table starts open; on the overview it waits to be asked for. */
  function deptCard(d, data, open) {
    var id = "dept-" + d.slug;
    PLOTS[id] = deptPlot(d, data.first);
    var last = d.out.last;
    var known = d.categories.filter(function (k) { return Object.keys(d.cats[k]).length; });

    var figs =
      '<div class="ck-figs">' +
        '<div class="ck-fig"><span class="ck-fig-l">' + (last ? MONTHS[last.x] : "—") + "</span>" +
          '<span class="ck-fig-n">' + pct(last && last.y) + "</span></div>" +
        '<div class="ck-rule"></div>' +
        '<div class="ck-fig"><span class="ck-fig-l">Trending to Dec</span>' +
          '<span class="ck-fig-n is-proj" style="--ck-fig-color:var(--status-' + d.status.key + ')">' +
          pct(d.out.projected) + "</span></div>" +
      "</div>";

    var notes = "";
    var fell = dips(d.total);
    if (fell.length) {
      var f = fell[0];
      /* Both figures are right — Ben confirmed April for DigOps, the one case so
         far. Spend already made cannot come back, which leaves two ways a share
         can fall: the budget it is a share of grew, or spending was moved out.
         The projection reads only the latest month, so the fall no longer
         moves it; the note stays because the history still shows it. */
      notes += noteHtml(
        "Total fell from <b>" + pct(f.from.y) + "</b> in " + MONTHS[f.from.x] + " to <b>" +
        pct(f.to.y) + "</b> in " + MONTHS[f.to.x] + ". Spending already made cannot come back, " +
        "so between those months either the budget grew or spending was moved out of this " +
        "department. The December projection reads only the latest month, so it is not affected."
      );
    }

    var title = open
      ? ""   // its own page: the heading above already names it
      : '<h3 class="ck-card-title"><button type="button" class="ck-card-link" data-goto="#/outcome/cost/' +
          esc(d.slug) + '">' + esc(d.label) + ' <span aria-hidden="true">›</span></button></h3>';

    return '<div class="ck-card is-dept" style="--ck-dept:' + deptColor(d) + '" data-dept="' + esc(d.code) + '">' +
      '<div class="ck-card-head"><div>' + title +
        '<p class="ck-card-sub">' + esc(d.code) + " · " +
          (known.length ? known.length + " categories tracked" : "no categories broken out") + "</p>" +
        "</div>" + figs +
      "</div>" +
      '<div class="ck-plot" data-ck-plot="' + id + '"></div>' +
      keyHtml(
        [{ label: "Total", color: "var(--ck-total)", weight: 3, value: last && last.y, to: d.out.projected }]
          .concat(known.map(function (k) {
            var o = d.catOut[k];
            return { label: d.catLabel[k], color: catColor(k), value: o.last ? o.last.y : null, to: o.projected };
          }))
      ) +
      notes +
      '<button class="ck-more" type="button" aria-expanded="' + (open ? "true" : "false") + '">' +
        '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
        'stroke-width="2"><path d="M5 2l6 6-6 6"/></svg>Every month, as a table</button>' +
      tableHtml(d, data.months, open) +
      "</div>";
  }

  /* How the dotted lines are drawn, said once on each page that has them. */
  function methodNote() {
    return '<p class="ck-foot">The dotted lines carry each line on to December. Wages and ' +
      "Contract repeat their latest month&rsquo;s increase every month to the end of the year, " +
      "because they are spent at a steady rate and last month says the most about the next. " +
      "Travel repeats its average monthly increase instead, because it arrives in lumps. The " +
      "Total follows its latest month, like the two it is mostly made of. Each line redraws " +
      "itself as months are added, and the figures are entered in the PM Hub.</p>";
  }

  /* #/outcome/cost — every department, and the overview chart. */
  function overviewHtml(data) {
    PLOTS = {};
    var allMax = 100;
    data.depts.forEach(function (d) {
      points(d.total).forEach(function (p) { allMax = Math.max(allMax, p.y); });
      allMax = Math.max(allMax, d.out.projected || 0);
    });
    PLOTS.all = {
      monthMin: data.first, max: allMax, height: 260,
      alt: "Each department's share of its annual budget spent, " + MONTHS[data.first] + " to " +
           MONTHS[data.last] + ", with each trend carried to December.",
      series: [],
      totals: data.depts.map(function (d) {
        return { pts: d.out.pts, color: deptColor(d), width: 2.4, projected: d.out.projected, endLabel: false };
      }),
    };

    return '<div class="ck-head">' +
        "<p>The share of each department&rsquo;s annual budget spent so far, month by month. Figures " +
        "are cumulative, so the lines climb across the year and <strong>" +
        pct((data.last / YEAR_END) * 100) + "</strong> is where even spending would have you by the end " +
        "of " + MONTHS[data.last] + " &mdash; the faint diagonal on every chart.</p>" +
        '<p class="ck-caveat">A department&rsquo;s Cost KPI is its performance on <strong>Total</strong>, ' +
        "which is its own figure rather than the sum of the categories beneath it: those are the " +
        "largest ones, not all of them, so they will not add up. On budget is " +
        BANDS.onLo + "&ndash;" + BANDS.onHi + "% by December.</p>" +
      "</div>" +
      '<div class="ck-card" data-card="all">' +
        '<div class="ck-card-head"><div>' +
          '<h3 class="ck-card-title">Every department against the budget</h3>' +
          '<p class="ck-card-sub">Each line is one department&rsquo;s Total, solid through ' +
          MONTHS[data.last] + " and dotted to where the year is heading &mdash; the figure beside each " +
          "name below is where its December lands. The dashed rule is the budget itself; the faint " +
          "diagonal is even spending.</p>" +
        "</div></div>" +
        '<div class="ck-plot" data-ck-plot="all"></div>' +
        keyHtml(data.depts.map(function (d) {
          return { label: d.code, color: deptColor(d), weight: 2.5, value: d.out.projected };
        })) +
      "</div>" +
      '<div class="ck-grid">' +
        data.depts.map(function (d) { return deptCard(d, data, false); }).join("") +
      "</div>" +
      methodNote();
  }

  /* #/outcome/cost/<dept> — one department, with its months open. */
  function deptHtml(d, data) {
    PLOTS = {};
    return deptCard(d, data, true) + methodNote();
  }

  /** The body of a Cost page; the scorecard supplies the heading above it. */
  function pageHtml(slug) {
    var data = load();
    if (!data) {
      return '<div class="sc-empty">The budget figures have not been loaded. Once ' +
        "<code>supabase/cost-budget.sql</code> has been run this fills itself.</div>";
    }
    if (!slug) return overviewHtml(data);
    var d = data.depts.filter(function (x) { return x.slug === slug; })[0];
    return d ? deptHtml(d, data) : '<div class="sc-empty">Unknown department.</div>';
  }

  /* Opening a table. One listener for the page, because the cards are rebuilt
     on every visit and a listener bound to one would go with it. */
  document.addEventListener("click", function (e) {
    var more = e.target.closest && e.target.closest(".ck-more");
    if (!more) return;
    var wrap = more.nextElementSibling;
    var open = more.getAttribute("aria-expanded") === "true";
    more.setAttribute("aria-expanded", String(!open));
    if (wrap) wrap.hidden = open;
  });

  window.SS = window.SS || {};
  window.SS.costKpi = {
    summary: summary, pageHtml: pageHtml, draw: draw, deptBySlug: deptBySlug,
    build: build, project: project, statusOf: statusOf, dips: dips, BANDS: BANDS,
  };
})();
