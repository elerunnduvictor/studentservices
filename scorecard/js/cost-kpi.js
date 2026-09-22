/* ═══════════════ COST KPI ═══════════════
   The second tab of the KPI Scorecard: what share of each department's annual
   budget has been spent, and where the year is heading.

   ── What the numbers are ──

   Every figure is cumulative: "64%" in August means 64% of the whole year's
   budget has gone, not that August alone cost 64%. That is why the lines only
   ever climb — and why a line that falls is a fact about the spreadsheet
   rather than about spending, which this page says out loud instead of drawing
   through.

   `Total` is the department's own figure. It is NOT the sum of Wages, Travel
   and Contract: those are the large categories, not all of them, so the parts
   will not add up to the whole and are not meant to. Ben's point, and the
   reason the Total is drawn heaviest and everything else is drawn as a thin
   line beneath it.

   ── Where the year ends up ──

   The dotted continuation is a least-squares line through every month on
   record, carried to December. It moves on its own as months are added: no
   figure in this file needs changing when September lands, and the one drawn
   last month is not preserved anywhere — the trend is always the best line
   through everything known today.

   Two months of the same department can disagree about that. Where the recent
   pace points somewhere materially different from the whole-year fit, both are
   drawn and the card says so, rather than picking one and sounding certain.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var YEAR_END = 12;                 // December: the month everything projects to
  var RECENT = 3;                    // months the "recent pace" line reads

  /* Landing near 100% is the target. Under-spending a fifth of a budget is not
     a win — it means the budget was set wrong — so the scale is two-sided.
     One place to retune if Ben and Jess want it wider or narrower. */
  var BANDS = { onLo: 95, onHi: 105, nearLo: 85, nearHi: 110 };

  function statusOf(pct) {
    if (pct === null || pct === undefined || !isFinite(pct)) {
      return { key: "nodata", label: "Not tracked" };
    }
    if (pct >= BANDS.onLo && pct <= BANDS.onHi) return { key: "green", label: "On budget" };
    if (pct >= BANDS.nearLo && pct < BANDS.onLo) return { key: "yellow", label: "Trending under" };
    if (pct > BANDS.onHi && pct <= BANDS.nearHi) return { key: "yellow", label: "Trending over" };
    if (pct < BANDS.nearLo) return { key: "red", label: "Well under" };
    return { key: "red", label: "Over budget" };
  }

  var CAT_VAR = {
    wages: "--ck-wages", travel: "--ck-travel", contract: "--ck-contract",
  };
  function catColor(key, i) {
    return "var(" + (CAT_VAR[key] || "--ck-other") + ")";
  }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function pct(n, dp) {
    if (n === null || n === undefined || !isFinite(n)) return "—";
    return (dp ? n.toFixed(dp) : Math.round(n)) + "%";
  }

  /* ── the arithmetic ────────────────────────────────────────────────────── */

  /** Least squares through [{x, y}]; null when there is nothing to fit. */
  function regress(pts) {
    var n = pts.length;
    if (n < 2) return null;
    var mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += pts[i].x; my += pts[i].y; }
    mx /= n; my /= n;
    var sxy = 0, sxx = 0, dx;
    for (i = 0; i < n; i++) {
      dx = pts[i].x - mx;
      sxy += dx * (pts[i].y - my);
      sxx += dx * dx;
    }
    if (!sxx) return null;
    var slope = sxy / sxx;
    return { slope: slope, at: function (x) { return my + slope * (x - mx); } };
  }

  /** The months of a series, as points a fit can read. */
  function points(byMonth) {
    return Object.keys(byMonth)
      .map(Number).sort(function (a, b) { return a - b; })
      .map(function (m) { return { x: m, y: byMonth[m] }; });
  }

  /** Where a department's Total is heading, and how sure that is. */
  function outlook(total) {
    var pts = points(total);
    if (!pts.length) return { pts: pts, last: null, projected: null, recent: null, diverges: false };
    var last = pts[pts.length - 1];
    var whole = regress(pts);
    var recentFit = pts.length > RECENT ? regress(pts.slice(-RECENT)) : null;
    var projected = whole ? whole.at(YEAR_END) : last.y;
    var recent = recentFit ? recentFit.at(YEAR_END) : null;
    // Already at the last month on the calendar: the trend has nowhere to run.
    if (last.x >= YEAR_END) { projected = last.y; recent = null; }
    return {
      pts: pts, last: last,
      projected: projected,
      recent: recent,
      slope: whole ? whole.slope : 0,
      diverges: recent !== null && Math.abs(recent - projected) >= 8,
    };
  }

  /** Months where a cumulative figure fell, which it cannot honestly do. */
  function dips(byMonth) {
    var pts = points(byMonth), out = [];
    for (var i = 1; i < pts.length; i++) {
      if (pts[i].y < pts[i - 1].y - 0.01) {
        out.push({ from: pts[i - 1], to: pts[i] });
      }
    }
    return out;
  }

  /* ── shaping the rows ──────────────────────────────────────────────────── */

  function build(rows) {
    var byDept = {};
    rows.forEach(function (r) {
      var code = r.dept_code;
      if (!byDept[code]) {
        byDept[code] = {
          code: code,
          label: r.dept_label,
          palette: r.dept_palette,
          order: r.dept_order,
          cats: {}, catOrder: {}, catLabel: {},
          total: {},
        };
      }
      var d = byDept[code];
      var v = Number(r.pct);
      if (!isFinite(v)) return;
      if (r.category_key === "total") {
        d.total[r.month] = v;
      } else {
        if (!d.cats[r.category_key]) d.cats[r.category_key] = {};
        d.cats[r.category_key][r.month] = v;
        d.catOrder[r.category_key] = r.category_order;
        d.catLabel[r.category_key] = r.category_label;
      }
    });

    return Object.keys(byDept)
      .map(function (k) {
        var d = byDept[k];
        d.categories = Object.keys(d.cats).sort(function (a, b) {
          return (d.catOrder[a] - d.catOrder[b]) || a.localeCompare(b);
        });
        d.out = outlook(d.total);
        d.status = statusOf(d.out.projected);
        return d;
      })
      .sort(function (a, b) { return a.order - b.order; });
  }

  function deptColor(d) {
    var c = window.DEPT_COLORS && window.DEPT_COLORS[d.palette];
    return (c && c.bg) || "#7F898A";
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
    s.push('<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H +
           '" role="img" aria-label="' + esc(cfg.alt || "") + '">');

    // gridlines, every 25 points
    for (var g = 0; g <= yMax; g += 25) {
      s.push('<line x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(g) + '" y2="' + Y(g) +
             '" stroke="var(--ck-grid)" stroke-width="1"/>');
      s.push('<text x="' + (x0 - 7) + '" y="' + (Y(g) + 4) + '" text-anchor="end" ' +
             'font-size="10" fill="var(--text-dim)">' + g + '</text>');
    }

    // Spending evenly all year would trace this. It is the honest answer to
    // "should we be worried at 64%?" — which depends entirely on the month.
    s.push('<line x1="' + X(mMin) + '" y1="' + Y((mMin / YEAR_END) * 100) +
           '" x2="' + X(YEAR_END) + '" y2="' + Y(100) +
           '" stroke="var(--ck-pace)" stroke-width="1" stroke-dasharray="2 5" opacity=".85"/>');

    // the budget itself
    s.push('<line x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(100) + '" y2="' + Y(100) +
           '" stroke="var(--ck-budget)" stroke-width="1.25" stroke-dasharray="6 4" opacity=".75"/>');
    s.push('<text x="' + x1 + '" y="' + (Y(100) - 6) + '" text-anchor="end" font-size="9.5" ' +
           'fill="var(--ck-budget)" opacity=".9">budget</text>');

    // month ticks — every month when there is room, otherwise every other one
    var step = (x1 - x0) / (mMax - mMin) < 34 ? 2 : 1;
    for (var m = mMin; m <= mMax; m += step) {
      s.push('<text x="' + X(m) + '" y="' + (y1 + 15) + '" text-anchor="middle" font-size="10" ' +
             'fill="var(--text-dim)">' + MONTHS[m] + '</text>');
    }

    function path(pts) {
      return pts.map(function (p, i) {
        return (i ? "L" : "M") + X(p.x).toFixed(1) + " " + Y(p.y).toFixed(1);
      }).join(" ");
    }

    // the subsets first, so the Total is never drawn under one of its parts
    (cfg.series || []).forEach(function (ser) {
      if (ser.pts.length < 1) return;
      if (ser.pts.length > 1) {
        s.push('<path d="' + path(ser.pts) + '" fill="none" stroke="' + ser.color +
               '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>');
      }
      var e = ser.pts[ser.pts.length - 1];
      s.push('<circle cx="' + X(e.x) + '" cy="' + Y(e.y) + '" r="2.75" fill="' + ser.color + '"/>');
    });

    // the Total: the heaviest thing on the chart
    (cfg.totals || []).forEach(function (t) {
      if (!t.pts.length) return;
      if (t.pts.length > 1) {
        s.push('<path d="' + path(t.pts) + '" fill="none" stroke="' + t.color +
               '" stroke-width="' + (t.width || 2.8) + '" stroke-linejoin="round" stroke-linecap="round"/>');
      }
      var last = t.pts[t.pts.length - 1];

      // where it is heading, dotted, to the end of the year
      if (t.projected !== null && t.projected !== undefined && last.x < YEAR_END) {
        s.push('<path d="M' + X(last.x) + ' ' + Y(last.y) + 'L' + X(YEAR_END) + ' ' +
               Y(t.projected) + '" fill="none" stroke="' + t.color + '" stroke-width="' +
               (t.width || 2.8) + '" stroke-dasharray="1 6" stroke-linecap="round" opacity=".85"/>');
        s.push('<circle cx="' + X(YEAR_END) + '" cy="' + Y(t.projected) + '" r="3.25" fill="' +
               t.color + '" opacity=".9"/>');
        if (t.endLabel !== false) {
          s.push('<text x="' + (X(YEAR_END) + 7) + '" y="' + (Y(t.projected) + 3.5) +
                 '" font-size="11" font-weight="600" fill="' + t.color + '">' +
                 pct(t.projected) + '</text>');
        }
      }
      // and the other reading of the same months, where they disagree
      if (t.recent !== null && t.recent !== undefined && last.x < YEAR_END) {
        s.push('<path d="M' + X(last.x) + ' ' + Y(last.y) + 'L' + X(YEAR_END) + ' ' +
               Y(t.recent) + '" fill="none" stroke="' + t.color + '" stroke-width="1.4" ' +
               'stroke-dasharray="1 5" stroke-linecap="round" opacity=".45"/>');
      }
      s.push('<circle cx="' + X(last.x) + '" cy="' + Y(last.y) + '" r="4" fill="' + t.color + '"/>');
      s.push('<circle cx="' + X(last.x) + '" cy="' + Y(last.y) +
             '" r="4" fill="none" stroke="var(--bg-card)" stroke-width="1.5"/>');
    });

    s.push("</svg>");
    host.innerHTML = s.join("");
  }

  /* Charts are drawn to a measured width, so they have to be drawn again when
     that width changes. One observer for the tab, not one per card. */
  var redraws = [];
  function watch(host, draw) {
    redraws.push(function () { draw(host); });
    draw(host);
  }
  var pending;
  window.addEventListener("resize", function () {
    clearTimeout(pending);
    pending = setTimeout(function () { redraws.forEach(function (f) { f(); }); }, 120);
  });

  /* ── the pieces of the page ────────────────────────────────────────────── */

  function keyHtml(items) {
    return '<div class="ck-key">' + items.map(function (i) {
      return '<span class="ck-key-i" style="color:' + i.color + '">' +
             '<span class="ck-key-s" style="border-top-width:' + (i.weight || 2) + 'px"></span>' +
             '<span style="color:var(--text-muted)">' + esc(i.label) + '</span> ' +
             "<b>" + pct(i.value) + "</b></span>";
    }).join("") + "</div>";
  }

  function noteHtml(html) {
    return '<div class="ck-note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
           'stroke="currentColor" stroke-width="2.2"><path d="M12 9v4M12 17h.01"/>' +
           '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>' +
           "</svg><div>" + html + "</div></div>";
  }

  function tableHtml(d, months) {
    var head = months.map(function (m) { return "<th>" + MONTHS[m] + "</th>"; }).join("");
    var body = d.categories.map(function (k) {
      return "<tr><th>" + esc(d.catLabel[k]) + "</th>" + months.map(function (m) {
        var v = d.cats[k][m];
        return v === undefined ? '<td class="is-empty">—</td>' : "<td>" + pct(v) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    var total = '<tr class="is-total"><th>Total</th>' + months.map(function (m) {
      var v = d.total[m];
      return v === undefined ? '<td class="is-empty">—</td>' : "<td>" + pct(v) + "</td>";
    }).join("") + "</tr>";
    return '<div class="ck-table-wrap" hidden><table class="ck-table">' +
           "<thead><tr><th>Category</th>" + head + "</tr></thead>" +
           "<tbody>" + body + total + "</tbody></table></div>";
  }

  function deptCard(d, months) {
    var colour = deptColor(d);
    var o = d.out;
    var last = o.last;
    var known = d.categories.filter(function (k) { return Object.keys(d.cats[k]).length; });

    var figs =
      '<div class="ck-figs">' +
        '<div class="ck-fig"><span class="ck-fig-l">' + (last ? MONTHS[last.x] : "—") + '</span>' +
          '<span class="ck-fig-n">' + pct(last && last.y) + "</span></div>" +
        '<div class="ck-rule"></div>' +
        '<div class="ck-fig"><span class="ck-fig-l">Trending to Dec</span>' +
          '<span class="ck-fig-n is-proj" style="--ck-fig-color:var(--status-' +
            (d.status.key === "nodata" ? "nodata" : d.status.key) + ')">' +
          pct(o.projected) + "</span></div>" +
      "</div>";

    var notes = "";
    var fell = dips(d.total);
    if (fell.length) {
      var f = fell[0];
      notes += noteHtml(
        "Total fell from <b>" + pct(f.from.y) + "</b> in " + MONTHS[f.from.x] + " to <b>" +
        pct(f.to.y) + "</b> in " + MONTHS[f.to.x] + ". Money already spent cannot come back, " +
        "so either the budget was restated or one of the two figures is wrong — and the " +
        "December projection is drawn through both."
      );
    }
    if (o.diverges) {
      notes += noteHtml(
        "The last " + RECENT + " months point at <b>" + pct(o.recent) + "</b> by December, " +
        "against <b>" + pct(o.projected) + "</b> for the year so far — drawn as the fainter " +
        "dotted line. Worth deciding which months to trust before reading this one as settled."
      );
    }

    return '<div class="ck-card is-dept" style="--ck-dept:' + colour + '" data-dept="' + esc(d.code) + '">' +
      '<div class="ck-card-head"><div>' +
        '<h3 class="ck-card-title">' + esc(d.label) + "</h3>" +
        '<p class="ck-card-sub">' + esc(d.code) + " · " +
          (known.length ? known.length + " categories tracked" : "no categories broken out") +
        "</p></div>" + figs +
      "</div>" +
      '<div class="ck-plot" data-plot="' + esc(d.code) + '"></div>' +
      keyHtml(
        [{ label: "Total", color: "var(--ck-total)", weight: 3, value: last && last.y }].concat(
          known.map(function (k, i) {
            var p = points(d.cats[k]);
            return {
              label: d.catLabel[k], color: catColor(k, i),
              value: p.length ? p[p.length - 1].y : null,
            };
          })
        )
      ) +
      notes +
      '<button class="ck-more" type="button" aria-expanded="false">' +
        '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
        'stroke-width="2"><path d="M5 2l6 6-6 6"/></svg>' +
        "Every month, as a table</button>" +
      tableHtml(d, months) +
      "</div>";
  }

  /* ── the tab ───────────────────────────────────────────────────────────── */

  function render(host) {
    var rows = window.COST_BUDGET || [];
    if (!rows.length) {
      host.innerHTML = '<div class="ck-card"><p class="ck-card-sub">' +
        "The budget figures have not been loaded. Once " +
        "<code>supabase/cost-budget.sql</code> has been run this tab fills itself." +
        "</p></div>";
      return;
    }

    var depts = build(rows);
    var year = rows[0].budget_year;
    var months = [];
    depts.forEach(function (d) {
      points(d.total).forEach(function (p) { if (months.indexOf(p.x) < 0) months.push(p.x); });
    });
    months.sort(function (a, b) { return a - b; });
    var mMin = months[0] || 1, mLast = months[months.length - 1] || 1;
    var elapsed = (mLast / YEAR_END) * 100;

    var strip = depts.map(function (d) {
      var last = d.out.last;
      return '<button class="ck-chip" type="button" data-dept="' + esc(d.code) + '" ' +
        'style="--ck-dept:' + deptColor(d) + '">' +
        '<span class="ck-chip-code">' + esc(d.code) + "</span>" +
        '<span class="ck-chip-name">' + esc(d.label) + "</span>" +
        '<span class="ck-chip-row"><span class="ck-chip-n">' + pct(last && last.y) + "</span>" +
          '<span class="ck-chip-of">spent by ' + MONTHS[mLast] + "</span></span>" +
        '<span class="ck-chip-proj">Trending to <b>' + pct(d.out.projected) + "</b> by December</span>" +
        '<span class="ck-pill ' + d.status.key + '">' + esc(d.status.label) + "</span>" +
        "</button>";
    }).join("");

    var overviewKey = depts.map(function (d) {
      return { label: d.code, color: deptColor(d), weight: 2.5, value: d.out.projected };
    });

    host.innerHTML =
      '<div class="ck-head">' +
        "<h2>Cost KPI · budget year " + year + "</h2>" +
        "<p>The share of each department&rsquo;s annual budget spent so far, month by month. " +
        "Figures are cumulative, so the lines climb across the year and " +
        "<strong>" + pct(elapsed) + "</strong> is where even spending would have you by the end of " +
        MONTHS[mLast] + " &mdash; the faint diagonal on every chart.</p>" +
        '<p class="ck-caveat">A department&rsquo;s Cost KPI is its performance on <strong>Total</strong>, ' +
        "which is its own figure rather than the sum of the categories beneath it: those are the " +
        "largest ones, not all of them, so they will not add up. On budget is " +
        BANDS.onLo + "&ndash;" + BANDS.onHi + "% by December.</p>" +
      "</div>" +
      '<div class="ck-strip">' + strip + "</div>" +
      '<div class="ck-card" data-card="all">' +
        '<div class="ck-card-head"><div>' +
          '<h3 class="ck-card-title">Every department against the budget</h3>' +
          '<p class="ck-card-sub">Each line is one department&rsquo;s Total, solid through ' +
          MONTHS[mLast] + " and dotted to where the year is heading — the figure beside each " +
          "name below is where its December lands. The dashed rule is the budget itself; " +
          "the faint diagonal is even spending.</p>" +
        "</div></div>" +
        '<div class="ck-plot" data-plot="__all"></div>' +
        keyHtml(overviewKey) +
      "</div>" +
      '<div class="ck-grid">' +
        depts.map(function (d) { return deptCard(d, months); }).join("") +
      "</div>" +
      '<p class="ck-foot">The dotted line is a least-squares fit through every month on record, ' +
      "carried to December; it redraws itself as each month is added. Figures are entered in the " +
      "PM Hub.</p>";

    /* ── the charts ── */
    var allMax = 100;
    depts.forEach(function (d) {
      points(d.total).forEach(function (p) { allMax = Math.max(allMax, p.y); });
      allMax = Math.max(allMax, d.out.projected || 0, d.out.recent || 0);
    });

    var allHost = host.querySelector('[data-plot="__all"]');
    if (allHost) {
      watch(allHost, function (el) {
        plot(el, {
          monthMin: mMin, max: allMax, height: 260,
          alt: "Each department's share of its annual budget spent, " +
               MONTHS[mMin] + " to " + MONTHS[mLast] + ", with each trend carried to December.",
          series: [],
          totals: depts.map(function (d) {
            return {
              pts: d.out.pts, color: deptColor(d), width: 2.4,
              projected: d.out.projected, endLabel: false,
            };
          }),
        });
      });
    }

    depts.forEach(function (d) {
      var el = host.querySelector('[data-plot="' + CSS.escape(d.code) + '"]');
      if (!el) return;
      var max = 100;
      points(d.total).forEach(function (p) { max = Math.max(max, p.y); });
      d.categories.forEach(function (k) {
        points(d.cats[k]).forEach(function (p) { max = Math.max(max, p.y); });
      });
      max = Math.max(max, d.out.projected || 0, d.out.recent || 0);

      watch(el, function (node) {
        plot(node, {
          monthMin: mMin, max: max,
          alt: d.label + ": Total at " + pct(d.out.last && d.out.last.y) + " in " +
               MONTHS[mLast] + ", trending to " + pct(d.out.projected) + " by December.",
          series: d.categories.map(function (k, i) {
            return { pts: points(d.cats[k]), color: catColor(k, i) };
          }),
          totals: [{
            pts: d.out.pts, color: "var(--ck-total)", width: 2.8,
            projected: d.out.projected,
            recent: d.out.diverges ? d.out.recent : null,
          }],
        });
      });
    });

    /* ── opening a table, and jumping to a department ── */
    host.addEventListener("click", function (e) {
      var more = e.target.closest(".ck-more");
      if (more) {
        var wrap = more.nextElementSibling;
        var open = more.getAttribute("aria-expanded") === "true";
        more.setAttribute("aria-expanded", String(!open));
        wrap.hidden = open;
        return;
      }
      var chip = e.target.closest(".ck-chip");
      if (chip) {
        var card = host.querySelector('.ck-card[data-dept="' + CSS.escape(chip.dataset.dept) + '"]');
        if (card) {
          host.querySelectorAll(".ck-chip.is-on").forEach(function (c) { c.classList.remove("is-on"); });
          chip.classList.add("is-on");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    });
  }

  /* ── the two tabs ──────────────────────────────────────────────────────── */

  /* Drawn the first time the tab is opened, not on load: a chart measures the
     width of its card, and a card inside a `hidden` panel has none. Every
     later visit only redraws, in case the window changed size meanwhile. */
  var drawn = false;

  function show(which) {
    var cost = which === "cost";
    var costView = document.getElementById("scCostView");
    var scoreView = document.getElementById("scScoreView");
    if (!costView || !scoreView) return;

    scoreView.hidden = cost;
    costView.hidden = !cost;
    document.querySelectorAll("#scTabs .sc-tab").forEach(function (b) {
      var on = (b.dataset.tab === "cost") === cost;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });

    if (cost && !drawn) { render(costView); drawn = true; }
    else if (cost) { redraws.forEach(function (f) { f(); }); }
  }

  function wire() {
    var tabs = document.getElementById("scTabs");
    if (!tabs) return;
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest(".sc-tab");
      if (b) show(b.dataset.tab);
    });
    tabs.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var all = [].slice.call(tabs.querySelectorAll(".sc-tab"));
      var i = all.indexOf(document.activeElement);
      if (i < 0) return;
      var next = all[(i + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
      next.focus();
      show(next.dataset.tab);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire, { once: true });
  } else {
    wire();
  }

  window.SS = window.SS || {};
  window.SS.costKpi = {
    render: render, show: show, build: build,
    outlook: outlook, statusOf: statusOf, regress: regress, dips: dips,
  };
})();
