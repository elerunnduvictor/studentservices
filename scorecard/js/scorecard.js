/* ═══════════════ KPI SCORECARD ═══════════════
   One recursive scorecard rendered at five altitudes:

     #/                                     Student Services (whole org)
     #/<dept>                               Department
     #/<dept>/<sub-dept>                    Sub-department
     #/<dept>/<sub-dept>/<person>           Stakeholder's KPI portfolio
     #/kpi/<id>                             A single KPI
     #/area/<autonomy|completion|…>         One student-outcome area

   Every altitude shows the same anatomy — breadcrumb, twin gauges, status
   spectrum, drillable children — so reading one teaches you all of them.
   `?lens=Speed` narrows any altitude to one category type.

   Data comes from scorecard-data.js (built by scripts/build-scorecard-data.py).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var KPIS = window.SCORECARD_KPIS || [];
  var META = window.SCORECARD_META || {};

  /* Colour is computed at build time from each KPI's own green/yellow/red band
     definitions against its current value — never read from the spreadsheet's
     "Performance Status" column, whose formula is wrong. "Manual Review" means
     a value exists but the KPI defines no thresholds to score it against. */
  var SCORE = { Green: 100, Yellow: 50, Red: 0 };
  var STATUS = {
    Green:           { cls: "green",  glyph: "✓", label: "Green" },
    Yellow:          { cls: "yellow", glyph: "▲", label: "Yellow" },
    Red:             { cls: "red",    glyph: "✕", label: "Red" },
    "Manual Review": { cls: "manual", glyph: "◐", label: "Manual Review" },
    "No Data":       { cls: "nodata", glyph: "◌", label: "No Data" }
  };
  var SPECTRUM_ORDER = ["Green", "Yellow", "Red", "Manual Review", "No Data"];
  var SPECTRUM_COLOR = {
    Green: "var(--status-green)",
    Yellow: "var(--status-yellow)",
    Red: "var(--status-red)",
    "Manual Review": "var(--status-manual)",
    "No Data": "var(--status-nodata)"
  };

  var AREAS = ["Autonomy", "Completion", "Satisfaction"];
  var AREA_QUESTION = {
    Autonomy: "Can students navigate the experience without needing the home office?",
    Completion: "Do students stay with us, and finish their credential?",
    Satisfaction: "Are students delighted with the service experience they receive?"
  };

  var state = { path: [], lens: "All" };

  /* ── helpers ─────────────────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function unique(arr) {
    var seen = {}, out = [];
    arr.forEach(function (v) { if (v != null && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }

  /* Health = mean(Green 100 / Yellow 50 / Red 0) over KPIs that report a
     status. Coverage = those scored KPIs / all tracked KPIs in scope. Keeping
     them separate stops a unit from looking healthy by reporting only wins. */
  function rollup(rows) {
    var counts = { Green: 0, Yellow: 0, Red: 0, "No Data": 0 };
    var total = 0;
    rows.forEach(function (r) {
      if (counts[r.status] === undefined) counts[r.status] = 0;
      counts[r.status]++;
      total += SCORE[r.status] === undefined ? 0 : SCORE[r.status];
    });
    var scored = counts.Green + counts.Yellow + counts.Red;
    return {
      tracked: rows.length,
      scored: scored,
      counts: counts,
      health: scored ? Math.round(total / scored) : null,
      coverage: rows.length ? Math.round((100 * scored) / rows.length) : 0
    };
  }

  /* `displayValue` is the current value already lifted onto the same scale as
     the bands (percentages as 0–100), computed at build time. */
  function formatValue(r) {
    if (r.displayValue === null || r.displayValue === undefined) {
      return r.value === null || r.value === undefined || r.value === "" ? null : String(r.value);
    }
    var n = r.displayValue;
    var rounded = Math.round(n * 100) / 100;
    var text = (Math.round(rounded * 10) % 10 === 0 ? Math.round(rounded) : rounded.toFixed(1));
    return r.percent ? text + "%" : String(text);
  }

  function statusChip(status, text) {
    var s = STATUS[status] || STATUS["No Data"];
    return '<span class="sc-status sc-status--' + s.cls + '">' +
      '<span class="sc-status-glyph" aria-hidden="true">' + s.glyph + "</span>" +
      esc(text || s.label) + "</span>";
  }

  function spectrum(counts, mini) {
    var parts = SPECTRUM_ORDER.filter(function (s) { return counts[s]; }).map(function (s) {
      return '<i style="flex:' + counts[s] + ";background:" + SPECTRUM_COLOR[s] + '"></i>';
    }).join("");
    if (!parts) parts = '<i style="flex:1;background:var(--border-subtle)"></i>';
    var total = SPECTRUM_ORDER.reduce(function (a, s) { return a + (counts[s] || 0); }, 0);
    return '<div class="sc-spectrum' + (mini ? " sc-spectrum--mini" : "") + '" role="img" aria-label="' +
      total + ' KPIs by status">' + parts + "</div>";
  }

  function legend(counts) {
    var items = SPECTRUM_ORDER.filter(function (s) { return counts[s]; }).map(function (s) {
      var st = STATUS[s];
      return "<span><i class=\"sc-swatch\" style=\"background:" + SPECTRUM_COLOR[s] + '"></i>' +
        st.glyph + " " + st.label + " " + counts[s] + "</span>";
    }).join("");
    return '<div class="sc-legend">' + items + "</div>";
  }

  /* Twin dials. The value also prints beside the ring, so the reading never
     depends on colour alone. */
  function gauges(roll) {
    var C = 2 * Math.PI * 46;
    function ring(cls, pct, label) {
      var dash = (C * Math.max(0, Math.min(100, pct || 0))) / 100;
      return '<svg width="132" height="132" viewBox="0 0 110 110" role="img" aria-label="' + esc(label) + '">' +
        '<circle class="sc-ring-track" cx="55" cy="55" r="46" fill="none" stroke-width="10"/>' +
        '<circle class="' + cls + '" cx="55" cy="55" r="46" fill="none" stroke-width="10" stroke-linecap="round" ' +
        'stroke-dasharray="' + dash.toFixed(1) + " " + C.toFixed(1) + '" transform="rotate(-90 55 55)"/>' +
        "</svg>";
    }
    var healthTxt = roll.health === null ? "—" : roll.health;
    return '<div class="sc-gauges">' +
      '<div class="sc-gauge">' +
        ring("sc-ring-health", roll.health, "Health index " + healthTxt + " of 100") +
        "<div>" +
          '<div class="sc-gauge-label">Health Index</div>' +
          '<div class="sc-gauge-num">' + healthTxt + (roll.health === null ? "" : "<small>/100</small>") + "</div>" +
          '<div class="sc-gauge-sub">' + (roll.scored
            ? roll.counts.Green + " Green · " + roll.counts.Yellow + " Yellow · " + roll.counts.Red + " Red"
            : "no KPI is reporting yet") + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="sc-gauge">' +
        ring("sc-ring-cov", roll.coverage, "Coverage " + roll.coverage + " percent") +
        "<div>" +
          '<div class="sc-gauge-label">Coverage</div>' +
          '<div class="sc-gauge-num">' + roll.coverage + "%</div>" +
          '<div class="sc-gauge-sub">' + roll.scored + " of " + roll.tracked + " tracked reporting</div>" +
        "</div>" +
      "</div>" +
    "</div>";
  }

  function lensBar(rows) {
    var types = unique(KPIS.map(function (r) { return r.type; })).filter(Boolean).sort();
    var chips = ["All"].concat(types).map(function (t) {
      var on = state.lens === t;
      return '<button type="button" class="sc-chip-btn' + (on ? " is-on" : "") + '" data-lens="' + esc(t) + '"' +
        (on ? ' aria-current="true"' : "") + ">" + esc(t) + "</button>";
    }).join("");
    return '<div class="sc-lens"><span class="sc-lens-label">Lens</span>' + chips + "</div>";
  }

  function head(eyebrow, title, meta) {
    return '<div class="sc-head">' +
      '<div class="sc-head-eyebrow">' + esc(eyebrow) + "</div>" +
      '<h2 class="sc-head-title">' + esc(title) + "</h2>" +
      (meta ? '<div class="sc-head-meta">' + esc(meta) + "</div>" : "") +
      "</div>";
  }

  /* ── drill cards ─────────────────────────────────────────────────────── */

  function kidCard(opts) {
    var roll = opts.roll;
    var score = roll.health === null
      ? '<div class="sc-kid-score is-empty">—</div>'
      : '<div class="sc-kid-score">' + roll.health + "<small>/100</small></div>";
    var cov = roll.health === null
      ? '<div class="sc-kid-cov">' + statusChip("No Data", "Awaiting data") + "</div>"
      : '<div class="sc-kid-cov">Coverage ' + roll.coverage + "%</div>";
    return '<button type="button" class="sc-kid" data-goto="' + esc(opts.href) + '">' +
      '<span class="sc-kid-arrow" aria-hidden="true">›</span>' +
      '<div class="sc-kid-name">' + esc(opts.name) + "</div>" +
      '<div class="sc-kid-role">' + esc(opts.sub) + "</div>" +
      score + cov + spectrum(roll.counts, true) +
      "</button>";
  }

  /* Worst first: every Red, then Yellows, then one line for the silent ones. */
  function watchlist(rows, showOwner) {
    var flagged = rows.filter(function (r) { return r.status === "Red" || r.status === "Yellow"; })
      .sort(function (a, b) { return (a.status === "Red" ? 0 : 1) - (b.status === "Red" ? 0 : 1); });
    var silent = rows.filter(function (r) { return r.status === "No Data"; }).length;
    if (!flagged.length && !silent) return "";

    var rowsHtml = flagged.slice(0, 6).map(function (r) {
      var v = formatValue(r);
      return '<button type="button" class="sc-watch-row" data-goto="#/kpi/' + r.id + '">' +
        statusChip(r.status) +
        '<span class="sc-watch-text">' + esc(r.measure) + (v ? " — " + esc(v) : "") + "</span>" +
        (showOwner ? '<span class="sc-watch-who">' + esc(r.employee) + "</span>" : "") +
        "</button>";
    }).join("");

    var silentHtml = silent
      ? '<div class="sc-watch-row" style="cursor:default">' + statusChip("No Data", "Silent") +
        '<span class="sc-watch-text">' + silent + " tracked KPI" + (silent === 1 ? " is" : "s are") +
        " not reporting a value yet</span></div>"
      : "";

    return '<div class="sc-watch"><h3>Needs attention</h3>' + rowsHtml + silentHtml + "</div>";
  }

  /* ── KPI leaf: threshold runway ───────────────────────────────────────── */

  function buildRunway(r) {
    var g = r.greenCutoff, red = r.redCutoff;
    if (typeof g !== "number" || typeof red !== "number") return null;
    var higher = r.direction === "higher";
    var lower = r.direction === "lower";
    if (!higher && !lower) return null;

    var pct = !!r.percent;
    var val = typeof r.displayValue === "number" ? r.displayValue : null;
    var hi = pct ? 100 : Math.max(g, red, val || 0) * 1.35;
    if (hi <= 0) hi = Math.max(g, red, 1) + 1;

    function toPct(n) { return (n / hi) * 100; }
    function fmt(n) { return (Math.round(n * 100) / 100) + (pct ? "%" : ""); }

    var zones, greenFlex;
    if (higher) {
      // red below the red cutoff, green at or above the green cutoff
      greenFlex = 100 - toPct(g);
      zones = [
        { cls: "sc-zone-red", flex: toPct(red), label: "< " + fmt(red) },
        { cls: "sc-zone-yellow", flex: toPct(g) - toPct(red), label: fmt(red) + " – " + fmt(g) },
        { cls: "sc-zone-green", flex: greenFlex, label: "≥ " + fmt(g) }
      ];
    } else {
      greenFlex = toPct(g);
      zones = [
        { cls: "sc-zone-green", flex: greenFlex, label: "≤ " + fmt(g) },
        { cls: "sc-zone-yellow", flex: toPct(red) - toPct(g), label: fmt(g) + " – " + fmt(red) },
        { cls: "sc-zone-red", flex: 100 - toPct(red), label: "> " + fmt(red) }
      ];
    }
    /* Some KPIs are pass/fail rather than a range — "no audit findings" is green
       only at exactly 0. A linear runway can't show a single-point target, and
       drawing it would put a passing value inside the yellow band. Fall back to
       the green/yellow/red band cards, which state the rule plainly. */
    if (greenFlex < 2) return null;
    zones = zones.filter(function (z) { return z.flex > 0.5; });
    if (zones.length < 2) return null;

    return {
      zones: zones,
      marker: val === null ? null : Math.max(0, Math.min(100, toPct(val))),
      markerLabel: formatValue(r),
      scale: [fmt(0), fmt(hi / 2), fmt(hi)]
    };
  }

  function renderKpi(id) {
    var r = KPIS.filter(function (k) { return k.id === id; })[0];
    if (!r) return '<div class="sc-empty">That KPI is no longer in the scorecard.</div>';

    var v = formatValue(r);
    var runway = buildRunway(r);
    var runwayHtml = "";
    if (runway) {
      runwayHtml = '<div class="sc-runway-wrap"><div class="sc-runway-track"><div class="sc-runway">' +
        runway.zones.map(function (z) {
          return '<i class="' + z.cls + '" style="flex:' + z.flex + '">' + esc(z.label) + "</i>";
        }).join("") +
        "</div>" +
        (runway.marker === null ? "" :
          '<div class="sc-marker" style="left:' + runway.marker + '%" data-value="' + esc(runway.markerLabel) + '"></div>') +
        "</div>" +
        '<div class="sc-runway-scale"><span>' + esc(runway.scale[0]) + "</span><span>" +
        esc(runway.scale[1]) + "</span><span>" + esc(runway.scale[2]) + "</span></div></div>";
    }

    var bands = "";
    if (r.bandGreen || r.bandYellow || r.bandRed) {
      bands = '<div class="sc-bands">' +
        (r.bandGreen ? '<div class="sc-band sc-band--green"><b>Green</b><span>' + esc(r.bandGreen) + "</span></div>" : "") +
        (r.bandYellow ? '<div class="sc-band sc-band--yellow"><b>Yellow</b><span>' + esc(r.bandYellow) + "</span></div>" : "") +
        (r.bandRed ? '<div class="sc-band sc-band--red"><b>Red</b><span>' + esc(r.bandRed) + "</span></div>" : "") +
        "</div>";
    }

    var source = r.source && /^https?:/i.test(r.source)
      ? '<a href="' + esc(r.source) + '" target="_blank" rel="noopener">Open report ↗</a>'
      : esc(r.source || "—");

    var chipText = r.status === "No Data" ? "No data reported yet"
      : r.status === "Manual Review" ? "Manual review — no thresholds set"
      : r.status;

    return head("Key performance indicator", r.measure,
        r.dept + " · " + r.subDept) +
      '<div class="sc-leaf-value">' +
        '<span class="sc-leaf-num' + (v ? "" : " is-empty") + '">' + esc(v || "—") + "</span>" +
        statusChip(r.status, chipText) +
      "</div>" +
      runwayHtml + bands +
      '<div class="sc-meta-grid">' +
        '<div class="sc-meta"><b>Owner</b><span>' + esc(r.employee) + (r.role ? " — " + esc(r.role) : "") + "</span></div>" +
        '<div class="sc-meta"><b>Category</b><span>' + esc(r.category || "—") + (r.type ? " · " + esc(r.type) : "") + "</span></div>" +
        '<div class="sc-meta"><b>Direction</b><span>' +
          (r.direction === "higher" ? "Higher is better ↑"
            : r.direction === "lower" ? "Lower is better ↓" : "—") + "</span></div>" +
        '<div class="sc-meta"><b>Cadence</b><span>' + esc(r.frequency || "—") + "</span></div>" +
        '<div class="sc-meta"><b>Data source</b><span>' + source + "</span></div>" +
      "</div>";
  }

  /* ── KPI list (stakeholder + area levels) ─────────────────────────────── */

  function kpiList(rows, showOwner) {
    if (!rows.length) return '<div class="sc-empty">No KPIs match this lens.</div>';
    var order = { Red: 0, Yellow: 1, "Manual Review": 2, "No Data": 3, Green: 4 };
    var sorted = rows.slice().sort(function (a, b) {
      return (order[a.status] === undefined ? 9 : order[a.status]) -
             (order[b.status] === undefined ? 9 : order[b.status]);
    });
    return '<div class="sc-kpi-list">' + sorted.map(function (r) {
      var v = formatValue(r);
      var goal = r.bandGreen ? "<small>goal " + esc(r.bandGreen) + "</small>" : "";
      var meta = [r.category, r.type, r.frequency].filter(Boolean).join(" · ");
      return '<button type="button" class="sc-kpi-row" data-goto="#/kpi/' + r.id + '">' +
        "<span>" +
          '<span class="sc-kpi-measure">' + esc(r.measure) + "</span>" +
          '<span class="sc-kpi-cat">' + esc(showOwner ? r.employee + " · " + meta : meta) + "</span>" +
        "</span>" +
        statusChip(r.status) +
        '<span class="sc-kpi-val">' + esc(v || "—") + goal + "</span>" +
        "</button>";
    }).join("") + "</div>";
  }

  /* ── altitudes ───────────────────────────────────────────────────────── */

  function inLens(rows) {
    if (state.lens === "All") return rows;
    return rows.filter(function (r) { return r.type === state.lens; });
  }

  function renderRoot() {
    var rows = inLens(KPIS);
    var roll = rollup(rows);
    var depts = unique(rows.map(function (r) { return r.dept; })).sort();

    var kids = depts.map(function (d) {
      var dr = rows.filter(function (r) { return r.dept === d; });
      var sub = unique(dr.map(function (r) { return r.subDept; })).length;
      return kidCard({
        name: d,
        sub: dr.length + " tracked KPI" + (dr.length === 1 ? "" : "s") + " · " + sub + " sub-dept" + (sub === 1 ? "" : "s"),
        roll: rollup(dr),
        href: "#/" + dr[0].deptSlug
      });
    }).join("");

    return head("Student Services", "The whole organization",
        roll.tracked + " tracked KPIs across " + depts.length + " departments") +
      lensBar(rows) + gauges(roll) + spectrum(roll.counts) + legend(roll.counts) +
      '<div class="sc-kids">' + kids + "</div>" +
      watchlist(rows, true);
  }

  function renderDept(deptSlug) {
    var rows = inLens(KPIS.filter(function (r) { return r.deptSlug === deptSlug; }));
    var all = KPIS.filter(function (r) { return r.deptSlug === deptSlug; });
    if (!all.length) return '<div class="sc-empty">Unknown department.</div>';
    var deptName = all[0].dept;
    var roll = rollup(rows);
    var subs = unique(rows.map(function (r) { return r.subDept; })).sort();

    var kids = subs.map(function (s) {
      var sr = rows.filter(function (r) { return r.subDept === s; });
      var people = unique(sr.map(function (r) { return r.employee; })).length;
      return kidCard({
        name: s,
        sub: sr.length + " tracked KPI" + (sr.length === 1 ? "" : "s") + " · " + people + " stakeholder" + (people === 1 ? "" : "s"),
        roll: rollup(sr),
        href: "#/" + deptSlug + "/" + sr[0].subDeptSlug
      });
    }).join("");

    return head("Department", deptName,
        roll.tracked + " tracked KPIs · " + subs.length + " sub-departments") +
      lensBar(rows) + gauges(roll) + spectrum(roll.counts) + legend(roll.counts) +
      (kids ? '<div class="sc-kids">' + kids + "</div>" : '<div class="sc-empty">No KPIs match this lens.</div>') +
      watchlist(rows, true);
  }

  function renderSub(deptSlug, subSlug) {
    var all = KPIS.filter(function (r) { return r.deptSlug === deptSlug && r.subDeptSlug === subSlug; });
    if (!all.length) return '<div class="sc-empty">Unknown sub-department.</div>';
    var rows = inLens(all);
    var roll = rollup(rows);
    var people = unique(rows.map(function (r) { return r.employee; })).sort();

    var kids = people.map(function (p) {
      var pr = rows.filter(function (r) { return r.employee === p; });
      return kidCard({
        name: p,
        sub: (pr[0].role || "—") + " · " + pr.length + " KPI" + (pr.length === 1 ? "" : "s"),
        roll: rollup(pr),
        href: "#/" + deptSlug + "/" + subSlug + "/" + pr[0].personSlug
      });
    }).join("");

    return head(all[0].dept, all[0].subDept,
        roll.tracked + " tracked KPIs · " + people.length + " stakeholder" + (people.length === 1 ? "" : "s")) +
      lensBar(rows) + gauges(roll) + spectrum(roll.counts) + legend(roll.counts) +
      (kids ? '<div class="sc-kids">' + kids + "</div>" : '<div class="sc-empty">No KPIs match this lens.</div>') +
      watchlist(rows, true);
  }

  function renderPerson(deptSlug, subSlug, personSlug) {
    var all = KPIS.filter(function (r) {
      return r.deptSlug === deptSlug && r.subDeptSlug === subSlug && r.personSlug === personSlug;
    });
    if (!all.length) return '<div class="sc-empty">Unknown stakeholder.</div>';
    var rows = inLens(all);
    var roll = rollup(rows);

    return head(all[0].subDept, all[0].employee,
        (all[0].role || "") + " · " + roll.tracked + " tracked KPI" + (roll.tracked === 1 ? "" : "s")) +
      lensBar(rows) + gauges(roll) + spectrum(roll.counts) + legend(roll.counts) +
      kpiList(rows, false);
  }

  function renderArea(areaSlug) {
    var area = AREAS.filter(function (a) { return a.toLowerCase() === areaSlug; })[0];
    if (!area) return '<div class="sc-empty">Unknown outcome area.</div>';
    var rows = inLens(KPIS.filter(function (r) { return r.area === area; }));
    var roll = rollup(rows);
    var depts = unique(rows.map(function (r) { return r.dept; })).length;

    return head("Student outcome", area,
        roll.tracked + " tracked KPIs across " + depts + " department" + (depts === 1 ? "" : "s")) +
      '<p class="sc-area-q">“' + esc(AREA_QUESTION[area]) + "”</p>" +
      lensBar(rows) + gauges(roll) + spectrum(roll.counts) + legend(roll.counts) +
      kpiList(rows, true);
  }

  /* ── student-outcome cards (root only) ────────────────────────────────── */

  function renderAreas() {
    var panel = document.getElementById("scAreasPanel");
    if (state.path.length) { panel.hidden = true; return; }
    panel.hidden = false;

    var C = 2 * Math.PI * 26;
    var totalArea = KPIS.filter(function (r) { return r.area; }).length;
    document.getElementById("scAreaCount").textContent =
      totalArea + " of " + KPIS.length + " tracked KPIs are student-outcome measures";

    document.getElementById("scAreas").innerHTML = AREAS.map(function (a) {
      var rows = KPIS.filter(function (r) { return r.area === a; });
      var roll = rollup(rows);
      var depts = unique(rows.map(function (r) { return r.dept; })).length;
      var dash = (C * (roll.health || 0)) / 100;
      var chips = SPECTRUM_ORDER.filter(function (s) { return roll.counts[s]; }).map(function (s) {
        return statusChip(s, roll.counts[s] + " " + (s === "No Data" ? "Silent" : STATUS[s].label));
      }).join("");

      return '<button type="button" class="sc-area" data-goto="#/area/' + a.toLowerCase() + '">' +
        '<span class="sc-kid-arrow" aria-hidden="true">›</span>' +
        '<div class="sc-area-top">' +
          '<svg width="66" height="66" viewBox="0 0 66 66" role="img" aria-label="' + a + " health " +
            (roll.health === null ? "not yet reported" : roll.health + " of 100") + '">' +
            '<circle class="sc-ring-track" cx="33" cy="33" r="26" fill="none" stroke-width="7"/>' +
            '<circle class="sc-ring-health" cx="33" cy="33" r="26" fill="none" stroke-width="7" stroke-linecap="round" ' +
            'stroke-dasharray="' + dash.toFixed(1) + " " + C.toFixed(1) + '" transform="rotate(-90 33 33)"/>' +
            '<text class="sc-ring-val" x="33" y="40" text-anchor="middle" font-size="19">' +
              (roll.health === null ? "—" : roll.health) + "</text>" +
          "</svg>" +
          "<div>" +
            '<div class="sc-head-eyebrow">Student outcome</div>' +
            '<div class="sc-area-name">' + a + "</div>" +
          "</div>" +
        "</div>" +
        '<p class="sc-area-q">“' + esc(AREA_QUESTION[a]) + "”</p>" +
        spectrum(roll.counts, true) +
        '<div class="sc-area-meta"><span><b>' + roll.tracked + "</b> tracked KPIs</span>" +
          "<span>Coverage <b>" + roll.coverage + "%</b></span>" +
          "<span><b>" + depts + "</b> department" + (depts === 1 ? "" : "s") + "</span></div>" +
        '<div class="sc-area-chips">' + chips + "</div>" +
        "</button>";
    }).join("");
  }

  /* ── breadcrumb ──────────────────────────────────────────────────────── */

  function crumbs() {
    var items = [{ label: "Student Services", href: "#/" }];
    var p = state.path;

    if (p[0] === "kpi") {
      var r = KPIS.filter(function (k) { return k.id === parseInt(p[1], 10); })[0];
      if (r) {
        items.push({ label: r.dept, href: "#/" + r.deptSlug });
        items.push({ label: r.subDept, href: "#/" + r.deptSlug + "/" + r.subDeptSlug });
        items.push({ label: r.employee, href: "#/" + r.deptSlug + "/" + r.subDeptSlug + "/" + r.personSlug });
        items.push({ label: r.measure, href: null });
      }
    } else if (p[0] === "area") {
      var a = AREAS.filter(function (x) { return x.toLowerCase() === p[1]; })[0];
      items.push({ label: a ? a + " (student outcome)" : "Area", href: null });
    } else if (p.length) {
      var row = KPIS.filter(function (r2) { return r2.deptSlug === p[0]; })[0];
      items.push({ label: row ? row.dept : p[0], href: "#/" + p[0] });
      if (p[1]) {
        var s = KPIS.filter(function (r3) { return r3.deptSlug === p[0] && r3.subDeptSlug === p[1]; })[0];
        items.push({ label: s ? s.subDept : p[1], href: "#/" + p[0] + "/" + p[1] });
      }
      if (p[2]) {
        var per = KPIS.filter(function (r4) {
          return r4.deptSlug === p[0] && r4.subDeptSlug === p[1] && r4.personSlug === p[2];
        })[0];
        items.push({ label: per ? per.employee : p[2], href: "#/" + p[0] + "/" + p[1] + "/" + p[2] });
      }
    }

    items[items.length - 1].href = null; // last crumb is where you are

    return items.map(function (it, i) {
      var sep = i ? '<span class="sc-crumb-sep" aria-hidden="true">›</span>' : "";
      return sep + (it.href
        ? '<button type="button" class="sc-crumb" data-goto="' + it.href + '">' + esc(it.label) + "</button>"
        : '<span class="sc-crumb is-current" aria-current="page">' + esc(it.label) + "</span>");
    }).join("");
  }

  /* ── routing ─────────────────────────────────────────────────────────── */

  function parseHash() {
    var raw = (location.hash || "#/").replace(/^#\/?/, "");
    var lens = "All";
    var q = raw.indexOf("?");
    if (q >= 0) {
      var qs = raw.slice(q + 1);
      raw = raw.slice(0, q);
      qs.split("&").forEach(function (pair) {
        var kv = pair.split("=");
        if (kv[0] === "lens" && kv[1]) lens = decodeURIComponent(kv[1]);
      });
    }
    state.path = raw.split("/").filter(Boolean).map(decodeURIComponent);
    state.lens = lens;
  }

  function hashFor(path, lens) {
    var h = "#/" + path.join("/");
    if (lens && lens !== "All") h += "?lens=" + encodeURIComponent(lens);
    return h;
  }

  function render() {
    parseHash();
    var p = state.path;
    var html;

    if (p[0] === "kpi") html = renderKpi(parseInt(p[1], 10));
    else if (p[0] === "area") html = renderArea(p[1]);
    else if (p.length === 0) html = renderRoot();
    else if (p.length === 1) html = renderDept(p[0]);
    else if (p.length === 2) html = renderSub(p[0], p[1]);
    else html = renderPerson(p[0], p[1], p[2]);

    document.getElementById("scView").innerHTML = html;
    document.getElementById("scCrumbs").innerHTML = crumbs();
    renderAreas();

    document.getElementById("scNote").textContent =
      "Showing the " + META.tracked + " KPIs marked “Tracking”. " +
      META.excludedNotTracking + " measures marked “Not Tracking” are excluded. " +
      "Last built " + META.generated + " from " + META.source + ".";

    window.scrollTo({ top: p.length ? document.querySelector(".sc-section").offsetTop - 80 : 0, behavior: "smooth" });
  }

  /* ── events ──────────────────────────────────────────────────────────── */

  document.addEventListener("click", function (e) {
    var goto = e.target.closest("[data-goto]");
    if (goto) {
      var target = goto.getAttribute("data-goto");
      // carry the active lens down with you
      if (state.lens !== "All" && target.indexOf("?") < 0 && target.indexOf("/kpi/") < 0) {
        target += "?lens=" + encodeURIComponent(state.lens);
      }
      location.hash = target;
      return;
    }
    var lens = e.target.closest("[data-lens]");
    if (lens) {
      var value = lens.getAttribute("data-lens");
      location.hash = hashFor(state.path, value);
    }
  });

  window.addEventListener("hashchange", render);

  /* ── spotlight search ────────────────────────────────────────────────── */

  function searchIndex() {
    var out = [];
    unique(KPIS.map(function (r) { return r.dept; })).forEach(function (d) {
      var r = KPIS.filter(function (x) { return x.dept === d; })[0];
      out.push({ label: d, kind: "Department", href: "#/" + r.deptSlug });
    });
    KPIS.forEach(function (r) {
      out.push({ label: r.subDept + " — " + r.dept, kind: "Sub-department", href: "#/" + r.deptSlug + "/" + r.subDeptSlug, key: r.deptSlug + r.subDeptSlug });
      out.push({ label: r.employee, kind: "Stakeholder", href: "#/" + r.deptSlug + "/" + r.subDeptSlug + "/" + r.personSlug, key: r.personSlug });
      out.push({ label: r.measure, kind: "KPI", href: "#/kpi/" + r.id, key: "k" + r.id });
    });
    AREAS.forEach(function (a) { out.push({ label: a, kind: "Student outcome", href: "#/area/" + a.toLowerCase() }); });

    var seen = {}, dedup = [];
    out.forEach(function (o) {
      var k = o.kind + "|" + (o.key || o.label);
      if (!seen[k]) { seen[k] = 1; dedup.push(o); }
    });
    return dedup;
  }

  var INDEX = searchIndex();

  function initSpotlight() {
    var input = document.getElementById("spotlightInput");
    var drop = document.getElementById("spotlightDropdown");
    if (!input || !drop) return;
    var active = -1, results = [];

    function close() { drop.hidden = true; active = -1; }

    function show(q) {
      var needle = q.trim().toLowerCase();
      if (!needle) return close();
      results = INDEX.filter(function (r) { return r.label.toLowerCase().indexOf(needle) >= 0; }).slice(0, 12);
      drop.innerHTML = results.length
        ? results.map(function (r, i) {
            return '<div class="sc-spot-item' + (i === active ? " active" : "") + '" data-goto="' + r.href + '">' +
              '<span class="sc-spot-name">' + esc(r.label) + "</span>" +
              '<span class="sc-spot-kind">' + esc(r.kind) + "</span></div>";
          }).join("")
        : '<div class="sc-spot-empty">Nothing matches “' + esc(q) + "”</div>";
      drop.hidden = false;
    }

    input.addEventListener("input", function () { active = -1; show(input.value); });
    input.addEventListener("keydown", function (e) {
      if (drop.hidden || !results.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
        show(input.value);
      } else if (e.key === "Enter") {
        e.preventDefault();
        location.hash = results[active < 0 ? 0 : active].href;
        input.value = ""; close(); input.blur();
      } else if (e.key === "Escape") { close(); input.blur(); }
    });
    drop.addEventListener("click", function () { input.value = ""; close(); });
    document.addEventListener("click", function (e) {
      if (!e.target.closest("#spotlight")) close();
    });
  }

  /* ── boot ────────────────────────────────────────────────────────────── */

  if (!KPIS.length) {
    document.getElementById("scView").innerHTML =
      '<div class="sc-empty">No scorecard data found. Run <code>python scripts/build-scorecard-data.py</code>.</div>';
  } else {
    initSpotlight();
    render();
  }
})();
