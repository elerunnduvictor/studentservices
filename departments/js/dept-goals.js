/* ═══════════════ PER-DEPT KPIs & OKRs ═══════════════

   The department's own slice of the two hub-wide measures, in the shape those
   pages already use: KPI cards per sub-department with a health ring, coverage
   and a status spectrum; OKR cards per objective with average progress and a
   status strip. Two stacked sections, not two columns — each is a subject in
   its own right and the cards need the full width to read.

   ── Where the rows come from ──

   Two datasets, loaded by shared/js/hub-boot.js: `kpis` (window.SCORECARD_KPIS)
   and `okrs` (window.OKR_PROGRESS_ROWS). Live from Postgres where the reader is
   allowed the rows, from the bundled snapshot otherwise, which is why nothing
   here talks to the database directly.

   They are keyed differently, and neither is keyed by the name this page calls
   itself:

     · a KPI carries `deptSlug`
     · an OKR carries `stakeholder`, the director's name

   So DEPTS below maps one to the other. It is written out rather than derived
   because the three spellings genuinely differ — the Dean's OKRs are filed
   under "Steve Thomas" while the scorecard and the org chart both say
   "Steven K. Thomas", and a slugger clever enough to bridge that would be one
   rename away from silently matching nothing.

   ── Arithmetic borrowed, not reinvented ──

   Health, coverage and the progress units are computed exactly as the source
   pages compute them, so a department's number here and the same department's
   number on the scorecard cannot drift apart:

     · health = mean(Green 100 / Yellow 50 / Red 0) over KPIs that report a
       status; coverage = scored / tracked (scorecard/js/scorecard.js)
     · `displayValue` is already on a 0-100 scale, so a percent row only needs
       a "%" appended — never another multiplication
     · OKR progress is a fraction scaled by 100, and a "KPI # -" row is a raw
       count rather than a percentage (okr-progress/js/okr-progress.js)

   ── Access ──

   Follows what the source pages already do rather than inventing a third rule:

     · KPIs: the scorecard shows a partner the roll-ups but locks the drill-down
       into individual people (`canSeePeople`). Same here — a partner gets the
       cards and the department's health, not the per-person measure list.
     · OKRs: the OKR page gates nobody, so neither does this.

   As everywhere in the hub, this is presentation. Row-level security is what
   actually decides which rows arrive.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var DEPTS = {
    "Student Records, Registration, and Support":
      { kpiSlug: "records-registration-support", director: "Mark Gefrom" },
    "Enrollment & Retention":
      { kpiSlug: "enrollment-retention", director: "Alison Cundiff" },
    "Dean of Students":
      { kpiSlug: "dean-of-students", director: "Steve Thomas" },
    "Digital Operations":
      { kpiSlug: "digital-operations", director: "Jacob Adams" },
  };

  /* ── Matching, loosely ──

     The slugs above are the ones the bundled snapshot uses. They are not
     reliable on their own, because a live KPI row's slug is computed from
     whatever that view spells the department:

       bundled   "Records, Registration & Support"          -> records-registration-support
       this page "Student Records, Registration, and Support" -> student-records-registration-and-support

     An exact slug comparison matched the first and missed the second, so a
     signed-in reader — the only kind who gets live rows — saw the whole
     section vanish. Compare a stripped form instead and accept either string
     containing the other, which holds for all four departments across all
     three spellings.

     The same problem, in the same shape, applies to the OKR side: those rows
     are keyed by the director's name, and the Dean is "Steve Thomas" in one
     place and "Steven K. Thomas" in two others. Surname plus first initial is
     what actually identifies them, and there is no collision among the five
     directors. */
  function norm(s) {
    // Split and filter rather than a word-boundary regex: "and" has to go
    // as a whole word ("Registration, and Support" vs "Registration &
    // Support") without touching the "and" inside another word.
    return String(s == null ? "" : s)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(function (w) { return w && w !== "and"; })
      .join("");
  }

  function deptMatches(row, conf, deptName) {
    var want = [conf.kpiSlug, deptName].map(norm);
    var got = [row.deptSlug, row.dept, row.department].filter(Boolean).map(norm);
    return want.some(function (w) {
      return got.some(function (g) {
        return w && g && (w === g || w.indexOf(g) >= 0 || g.indexOf(w) >= 0);
      });
    });
  }

  /* "Steve Thomas" and "Steven K. Thomas" are one person. */
  function personKey(name) {
    var parts = String(name || "").trim().toLowerCase().replace(/[.,]/g, "").split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    return parts[parts.length - 1] + "|" + parts[0].charAt(0);
  }
  function samePerson(a, b) {
    var ka = personKey(a), kb = personKey(b);
    return !!ka && ka === kb;
  }

  var SCORE = { Green: 100, Yellow: 50, Red: 0 };
  var SPECTRUM = ["Green", "Yellow", "Red", "Manual Review", "No Data"];
  var STATUS_COLOR = {
    "Green": "#2E9E5B", "Yellow": "#D89A1E", "Red": "#C0392B",
    "Manual Review": "#7F898A", "No Data": "#BCBEC0",
  };
  var OKR_STATUS_COLOR = {
    "Completed - On time": "#1E6E8C", "Completed - Late": "#8E7CC3",
    "On Track": "#2E9E5B", "Not Started": "#9AA3A5",
    "At Risk": "#D89A1E", "In Trouble": "#C0392B", "Canceled": "#58595B",
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ── scorecard arithmetic ── */
  function rollup(rows) {
    var counts = {}, total = 0;
    rows.forEach(function (r) {
      counts[r.status] = (counts[r.status] || 0) + 1;
      total += SCORE[r.status] === undefined ? 0 : SCORE[r.status];
    });
    var scored = (counts.Green || 0) + (counts.Yellow || 0) + (counts.Red || 0);
    return {
      tracked: rows.length, scored: scored, counts: counts,
      health: scored ? Math.round(total / scored) : null,
      coverage: rows.length ? Math.round((100 * scored) / rows.length) : 0,
    };
  }

  /* `displayValue` arrives already lifted onto the band scale — percentages as
     0-100 — so this appends a unit and never rescales. */
  function kpiValue(r) {
    if (r.displayValue == null) {
      return r.value == null || r.value === "" ? null : String(r.value);
    }
    var rounded = Math.round(r.displayValue * 100) / 100;
    var text = (Math.round(rounded * 10) % 10 === 0 ? Math.round(rounded) : rounded.toFixed(1));
    return r.percent ? text + "%" : String(text);
  }

  function spectrumBar(counts, cls) {
    var parts = SPECTRUM.filter(function (s) { return counts[s]; }).map(function (s) {
      return '<i style="flex:' + counts[s] + ';background:' + STATUS_COLOR[s] +
             '" title="' + esc(s) + ': ' + counts[s] + '"></i>';
    }).join("");
    if (!parts) parts = '<i style="flex:1;background:var(--border)"></i>';
    return '<div class="' + (cls || "dg-spectrum") + '">' + parts + "</div>";
  }

  function ring(value, color, sub) {
    var C = 2 * Math.PI * 26;
    var dash = (C * (value || 0)) / 100;
    return '<svg class="dg-ring" width="66" height="66" viewBox="0 0 66 66" role="img"' +
      ' aria-label="' + esc(sub) + '">' +
      '<circle cx="33" cy="33" r="26" fill="none" stroke="var(--border)" stroke-width="7"/>' +
      '<circle cx="33" cy="33" r="26" fill="none" stroke="' + color + '" stroke-width="7"' +
        ' stroke-linecap="round" stroke-dasharray="' + dash + ' ' + (C - dash) + '"' +
        ' transform="rotate(-90 33 33)"/>' +
      '<text x="33" y="38" text-anchor="middle" class="dg-ring-val">' +
        (value == null ? "—" : value) + "</text>" +
    "</svg>";
  }

  /* ── KPI section: a card per sub-department ── */
  function renderKpiCards(rows, deptColor) {
    var groups = {}, order = [];
    rows.forEach(function (r) {
      var k = r.subDept || "Department-wide";
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(r);
    });

    return order.map(function (name) {
      var roll = rollup(groups[name]);
      return '<div class="dg-card" style="--dg-accent:' + deptColor + '">' +
        '<div class="dg-card-head">' +
          ring(roll.health, deptColor, name + " health " +
               (roll.health == null ? "not reported" : roll.health + " of 100")) +
          '<div>' +
            '<div class="dg-card-eyebrow">Sub-department</div>' +
            '<div class="dg-card-title">' + esc(name) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="dg-card-figs">' +
          '<span><b>' + roll.tracked + '</b> tracked</span>' +
          '<span><b>' + roll.coverage + '%</b> coverage</span>' +
        '</div>' +
        spectrumBar(roll.counts) +
      "</div>";
    }).join("");
  }

  /* The rows worth acting on, in the scorecard's "needs attention" shape. */
  function renderAttention(rows, showPeople) {
    var flagged = rows.filter(function (r) { return r.status === "Red" || r.status === "Yellow"; })
      .sort(function (a, b) { return (a.status === "Red" ? 0 : 1) - (b.status === "Red" ? 0 : 1); });
    var silent = rows.filter(function (r) { return r.status === "No Data"; }).length;
    if (!flagged.length && !silent) return "";

    var list = flagged.map(function (r) {
      var v = kpiValue(r);
      return '<li class="dg-att">' +
        '<span class="dg-att-chip dg-att-chip--' + r.status.toLowerCase() + '">' + esc(r.status) + "</span>" +
        '<span class="dg-att-measure">' + esc(r.measure) + (v ? " — " + esc(v) : "") + "</span>" +
        (showPeople ? '<span class="dg-att-owner">' + esc(r.employee || "Unassigned") + "</span>" : "") +
      "</li>";
    }).join("");

    var quiet = silent
      ? '<li class="dg-att dg-att--silent">' +
          '<span class="dg-att-chip dg-att-chip--silent">Silent</span>' +
          '<span class="dg-att-measure">' + silent +
            ' tracked KPI' + (silent === 1 ? " is" : "s are") + ' not reporting a value yet</span>' +
        "</li>"
      : "";

    return '<div class="dg-att-wrap">' +
      '<div class="dg-att-label">Needs attention</div>' +
      '<ul class="dg-att-list">' + list + quiet + "</ul>" +
    "</div>";
  }

  /* ── OKR section: a card per objective ── */
  /* The PM hub's own display rule — see shared/js/okr-math.js. This used to
     multiply a count by 100 as well as a fraction, so a row reading 8 in the
     PM hub read 800 here. */
  function okrPct(v) { return Math.round((v || 0) * 100); }
  function okrValue(r, v) { return window.SS.okr.formatValue(r, v); }

  function renderOkrCards(rows, deptColor) {
    var groups = {}, order = [];
    rows.forEach(function (r) {
      if (!groups[r.okr]) { groups[r.okr] = []; order.push(r.okr); }
      groups[r.okr].push(r);
    });

    return order.map(function (okr) {
      var krs = groups[okr];
      /* Mean attainment. This used to drop the count rows from the average
         rather than measure them — safe, but it meant an objective's headline
         quietly ignored some of its own work. Attainment asks each row how
         close it is to its own goal, which is answerable for every type, so
         nothing has to be excluded. shared/js/okr-math.js. */
      var avg = window.SS.okr.averagePercent(krs);

      var counts = {};
      krs.forEach(function (r) { var s = r.status || "Not Started"; counts[s] = (counts[s] || 0) + 1; });

      var strip = Object.keys(counts).map(function (s) {
        return '<i style="flex:' + counts[s] + ';background:' + (OKR_STATUS_COLOR[s] || "#9AA3A5") +
               '" title="' + esc(s) + ": " + counts[s] + '"></i>';
      }).join("");

      var legend = Object.keys(counts).map(function (s) {
        return '<span class="dg-legend-item">' +
          '<span class="dg-dot" style="background:' + (OKR_STATUS_COLOR[s] || "#9AA3A5") + '"></span>' +
          esc(s) + " <b>" + counts[s] + "</b></span>";
      }).join("");

      var detail = krs.map(function (r) {
        var p = okrPct(r.progress);
        var goal = r.goal == null ? null : okrPct(r.goal);
        var att = window.SS.okr.attainment(r);
        var fill = att === null ? 0 : Math.round(att * 100);
        return '<li class="dg-kr">' +
          '<div class="dg-kr-head">' +
            '<span class="dg-kr-name">' + esc(r.subKeyResult || r.keyResult) + "</span>" +
            '<span class="dg-kr-status" style="color:' + (OKR_STATUS_COLOR[r.status] || "#7F898A") + '">' +
              esc(r.status || "—") + "</span>" +
          "</div>" +
          '<div class="dg-kr-track"><div class="dg-kr-fill" style="width:' + fill +
            "%;background:" + deptColor + '"></div></div>' +
          '<div class="dg-kr-figures"><span><b>' + okrValue(r, r.progress) + "</b> now</span>" +
            (goal != null ? "<span>" + okrValue(r, r.goal) + " goal</span>" : "") +
            (r.trend ? "<span>" + esc(r.trend) + "</span>" : "") +
          "</div>" +
        "</li>";
      }).join("");

      return '<div class="dg-card dg-card--okr" style="--dg-accent:' + deptColor + '">' +
        '<div class="dg-card-head">' +
          ring(avg, deptColor, "Average progress " + (avg == null ? "not reported" : avg + "%")) +
          '<div>' +
            '<div class="dg-card-eyebrow">Objective</div>' +
            '<div class="dg-card-title">' + esc(okr) + "</div>" +
          "</div>" +
        "</div>" +
        '<div class="dg-card-figs">' +
          "<span><b>" + krs.length + "</b> key result" + (krs.length === 1 ? "" : "s") + "</span>" +
          (avg == null ? "" : "<span><b>" + avg + "%</b> avg progress</span>") +
        "</div>" +
        '<div class="dg-spectrum">' + strip + "</div>" +
        '<div class="dg-legend">' + legend + "</div>" +
        '<ul class="dg-krs">' + detail + "</ul>" +
      "</div>";
    }).join("");
  }

  function start() {
    var kpiHost = document.getElementById("deptKpis");
    var okrHost = document.getElementById("deptOkrs");
    if (!kpiHost || !okrHost) return;

    var conf = DEPTS[window.DEPT_NAME];
    var kpis = conf ? (window.SCORECARD_KPIS || []).filter(function (k) {
      return deptMatches(k, conf, window.DEPT_NAME);
    }) : [];
    var okrs = conf ? (window.OKR_PROGRESS_ROWS || []).filter(function (r) {
      return samePerson(r.stakeholder, conf.director);
    }) : [];

    var deptColor = (window.DEPT_COLORS && window.DEPT_COLORS[window.DEPT_NAME] &&
                     window.DEPT_COLORS[window.DEPT_NAME].bg) || "#065577";

    var access = window.SS && window.SS.access;
    Promise.resolve(access && access.ready)["catch"](function () {})
      .then(function () {
        // Default closed: if the gate could not be asked, show the roll-up only.
        var showPeople = !!(access && access.canSeePeople);

        /* An empty state rather than a hidden section. The section used to
           remove itself when nothing matched, which made a matching bug and a
           department with no KPIs look identical — and the first of those is
           how this went unnoticed. Saying "none tracked" is falsifiable; a
           missing section is not. */
        if (!kpis.length) {
          kpiHost.innerHTML = '<div class="dg-empty">No KPIs are currently tracked for this department.' +
            ' <a class="dg-more" href="/scorecard/index.html">Open the full scorecard &rarr;</a></div>';
        }
        else {
          var roll = rollup(kpis);
          kpiHost.innerHTML =
            '<div class="dg-summary">' +
              '<div class="dg-fig"><div class="dg-fig-val" style="color:' + deptColor + '">' +
                (roll.health == null ? "—" : roll.health) +
                (roll.health == null ? "" : "<small>/100</small>") + "</div>" +
                '<div class="dg-fig-label">health index</div></div>' +
              '<div class="dg-fig"><div class="dg-fig-val">' + roll.coverage + "%</div>" +
                '<div class="dg-fig-label">coverage</div></div>' +
              '<div class="dg-fig"><div class="dg-fig-val">' + roll.tracked + "</div>" +
                '<div class="dg-fig-label">tracked KPIs</div></div>' +
            "</div>" +
            '<div class="dg-cards">' + renderKpiCards(kpis, deptColor) + "</div>" +
            renderAttention(kpis, showPeople) +
            '<a class="dg-more" href="/scorecard/index.html">Open the full scorecard &rarr;</a>';
        }

        if (!okrs.length) {
          okrHost.innerHTML = '<div class="dg-empty">No OKRs are currently assigned to this department.' +
            ' <a class="dg-more" href="/okr-progress/index.html">Open the full OKR tracker &rarr;</a></div>';
        }
        else {
          okrHost.innerHTML =
            '<div class="dg-cards dg-cards--okr">' + renderOkrCards(okrs, deptColor) + "</div>" +
            '<a class="dg-more" href="/okr-progress/index.html">Open the full OKR tracker &rarr;</a>';
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
