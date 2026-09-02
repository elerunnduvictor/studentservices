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

  /* ── what this reader is allowed to open ───────────────────────────────────
     The database already decided what they may *read* — a partner receives no
     named rows at all, a manager only their own reporting line. This decides
     what may be *opened*, so the page does not offer doors that lead nowhere.

     `restricted` rows are the anonymised roll-up: real bands and values, no
     employee and no measure. They exist so a branch someone cannot enter still
     shows an honest colour instead of vanishing. */
  var ACCESS = window.SS && window.SS.access;
  function role() { return (ACCESS && ACCESS.role) || "admin"; }
  function canOpenBelowDept() { return role() !== "partner"; }
  function canOpenPeople() { return ACCESS ? ACCESS.canSeePeople : true; }
  function isRestricted(rows) {
    return rows.length > 0 && rows.every(function (r) { return r.restricted; });
  }
  var META = window.SCORECARD_META || {};

  /* Colour is computed at build time from each KPI's own green/yellow/red band
     definitions against its current value — never read from the spreadsheet's
     "Performance Status" column, whose formula is wrong. "Manual Review" means
     a value exists but the KPI defines no thresholds to score it against. */
  /* The Green/Yellow/Red scale now lives with the rollup that applies it,
     in shared/js/kpi-status.js. */
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

  /* The six category types in the order this page reads them: the three
     operational ones, then the three student ones — the same two groups the
     outcome sections are built from. Sorting alphabetically interleaved them
     (Completion, Quality, Speed, Student Autonomy...) so the lens gave no clue
     that the six are really two sets of three.

     Cost is listed although nothing is filed against it yet: keeping its place
     here means its first KPI lands in the right position rather than being
     appended wherever it happens to sort. */
  var TYPE_ORDER = [
    "Quality", "Speed", "Cost",
    "Completion", "Student Autonomy", "Student Satisfaction",
  ];

  /* What the data calls a type, and what people call it. The "Student " prefix
     is what the database matches on and is redundant on screen — under a
     heading that already says Student Outcomes it is said twice. Display only:
     every filter and lookup still uses the full value. */
  var TYPE_LABEL = {
    "Student Autonomy": "Autonomy",
    "Student Satisfaction": "Satisfaction",
  };
  function typeLabel(t) { return TYPE_LABEL[t] || t; }

  var AREAS = ["Autonomy", "Completion", "Satisfaction"];
  var AREA_QUESTION = {
    Autonomy: "Can students navigate the experience without needing the home office?",
    Completion: "Do students stay with us, and finish their credential?",
    Satisfaction: "Are students delighted with the service experience they receive?"
  };

  /* ── how the KPI list can be ordered ──────────────────────────────────────
     "Stakeholder" is the default and the reason this control exists. The list
     used to be ordered by status alone, which scattered one person's KPIs the
     length of the page — their red near the top, their green forty rows below,
     with no way to see what any single person was accountable for. Grouping by
     owner puts that back together; status still orders the block within each
     person, so the worst thing on someone's plate still leads their section.
     ──────────────────────────────────────────────────────────────────────── */
  var SORTS = [
    { id: "owner",  label: "Stakeholder A–Z" },
    { id: "status", label: "Needs attention" },
    { id: "name",   label: "KPI name A–Z" },
    { id: "recent", label: "Recently added" }
  ];

  /* `sort` is how the KPI list below is ordered. It is remembered rather than
     reset on every navigation: someone who has chosen to read by stakeholder is
     still reading by stakeholder after they drill into the next department. */
  var SORT_KEY = "ss_sc_sort";
  var state = { path: [], lens: "All", sort: readSort() };

  function readSort() {
    try {
      var v = localStorage.getItem(SORT_KEY);
      return SORTS.some(function (s) { return s.id === v; }) ? v : "owner";
    } catch (e) { return "owner"; }
  }

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
  /* Delegated to shared/js/kpi-status.js rather than computed here, so this
     page, the department pages and the PM hub's live preview cannot drift
     apart — and so the priority weighting has exactly one definition.

     While the priority column is empty every weight is 1 and a weighted mean
     is the plain mean, so this reads exactly as it always has. */
  function rollup(rows) { return window.SS.kpiStatus.rollup(rows); }

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

  /* The row every view opens with: the two rings on the left, and the mix of
     colours with its key on the right.

     They used to stack — rings, then a full-width bar, then the key under it —
     which pushed the outcomes and the departments further down the page for no
     gain: the bar is a summary of the same rows the rings count, so the two
     belong side by side and read as one statement. Every view composes this the
     same way, so it is written once. */
  function summaryRow(roll) {
    return '<div class="sc-topline">' +
      gauges(roll) +
      '<div class="sc-mix">' + spectrum(roll.counts) + legend(roll.counts) + "</div>" +
    "</div>";
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
    var present = unique(KPIS.map(function (r) { return r.type; })).filter(Boolean);
    var ordered = TYPE_ORDER.filter(function (t) { return present.indexOf(t) >= 0; });
    // Anything the data carries that TYPE_ORDER has not heard of goes on the
    // end rather than disappearing — a new category type must still be usable
    // before anyone edits this file.
    var extra = present.filter(function (t) { return TYPE_ORDER.indexOf(t) < 0; }).sort();
    var types = ordered.concat(extra);

    var chips = ["All"].concat(types).map(function (t) {
      var on = state.lens === t;
      // The chip shows the short name; `data-lens` keeps the value the rows
      // are actually filtered on.
      return '<button type="button" class="sc-chip-btn' + (on ? " is-on" : "") + '" data-lens="' + esc(t) + '"' +
        (on ? ' aria-current="true"' : "") + ">" + esc(typeLabel(t)) + "</button>";
    }).join("");
    return '<div class="sc-lens"><span class="sc-lens-label">Lens</span>' + chips + "</div>";
  }

  /* ══════════════════════════════════════════════════════════
     OUTCOMES — the scorecard the organisation actually keeps

     Departments answer "who is responsible". Outcomes answer "is it working",
     and that is the question the scorecard exists for. Every KPI is filed
     under one of two, and under one of three parts within it:

       Operational Outcomes — Speed, Quality, Cost      (how the work runs)
       Student Outcomes     — Autonomy, Satisfaction,
                              Completion                (what changes for students)

     Each part is scored, each outcome is the roll-up of its parts, and the two
     together are the organisation's health index at the top of the page. No
     separate arithmetic for the total: it is the same weighted rollup over all
     rows, so the parts cannot add up to something the headline disagrees with.

     A part with nothing under it still appears, greyed, rather than being left
     out. Cost is that case today — no KPI is filed against it — and a missing
     card would read as "we have that covered" rather than "nobody measures
     this", which is the more useful thing to know.
     ══════════════════════════════════════════════════════════ */
  /* Student Outcomes first. Both are scored the same way, but they are not of
     equal standing: the operational three are how the work runs, the student
     three are what the work is for. Leading with Speed and Quality put the
     means above the end, on the page that defines what the organisation
     measures. The leading section carries `lead: true` and is drawn heavier. */
  var OUTCOMES = [
    {
      key: "student",
      lead: true,
      name: "Student Outcomes",
      blurb: "What changes for students.",
      /* `area` rather than a note: these three already have wording, in
         AREA_QUESTION, which the student-outcome section further down the page
         has always used. Referenced rather than copied so the two cannot come
         to describe the same measure differently. */
      parts: [
        { type: "Student Autonomy",     area: "Autonomy" },
        { type: "Student Satisfaction", area: "Satisfaction" },
        { type: "Completion",           area: "Completion" },
      ],
    },
    {
      key: "operational",
      name: "Operational Outcomes",
      blurb: "How well the work runs.",
      parts: [
        { type: "Speed",   note: "Promptness of execution." },
        { type: "Quality", note: "Accuracy and satisfaction." },
        { type: "Cost",    note: "Cost control and scalability." },
      ],
    },
  ];

  /* Rows are filed by `category`, but that column is not always populated, so
     the type is the fallback — and the type is what defines a part anyway. A
     row that matches neither is counted in the page total and in its
     department, and simply appears under no outcome; inventing a home for it
     would be worse than showing it is unfiled. */
  function partRows(rows, type) {
    var want = String(type).toLowerCase();
    return rows.filter(function (r) { return String(r.type || "").toLowerCase() === want; });
  }
  function outcomeRows(rows, outcome) {
    var byCategory = rows.filter(function (r) {
      return String(r.category || "").toLowerCase() === outcome.name.toLowerCase();
    });
    if (byCategory.length) return byCategory;
    return rows.filter(function (r) {
      return outcome.parts.some(function (p) {
        return String(r.type || "").toLowerCase() === p.type.toLowerCase();
      });
    });
  }

  /* A small ring for a part, so six of them read as one family rather than six
     numbers. Same geometry as the department tiles use. */
  function partCard(part, rows) {
    var roll = rollup(rows);
    var has = roll.tracked > 0;
    var score = roll.health === null
      ? '<div class="sc-part-score is-empty">—</div>'
      : '<div class="sc-part-score">' + roll.health + "<small>/100</small></div>";
    var meta = has
      ? roll.tracked + " tracked · " + roll.coverage + "% coverage"
      : "Not measured yet";
    // A question where the organisation has phrased one, otherwise the plain
    // description of what the part covers.
    var question = part.area ? AREA_QUESTION[part.area] : null;
    var caption = question
      ? '<div class="sc-part-note sc-part-note--q">&ldquo;' + esc(question) + '&rdquo;</div>'
      : '<div class="sc-part-note">' + esc(part.note || "") + "</div>";

    return '<div class="sc-part' + (has ? "" : " is-empty") + '">' +
      '<div class="sc-part-name">' + esc(typeLabel(part.type)) + "</div>" +
      score +
      '<div class="sc-part-meta">' + esc(meta) + "</div>" +
      (has ? spectrum(roll.counts, true) : "") +
      caption +
    "</div>";
  }

  function outcomeCard(outcome, rows) {
    var mine = outcomeRows(rows, outcome);
    var roll = rollup(mine);
    // Sorted by TYPE_ORDER rather than written in order, so the cards and the
    // lens chips above them cannot end up in two different sequences.
    var parts = outcome.parts.slice().sort(function (a, b) {
      return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
    }).map(function (p) {
      return partCard(p, partRows(mine, p.type));
    }).join("");

    var score = roll.health === null
      ? '<span class="sc-outcome-score is-empty">—</span>'
      : '<span class="sc-outcome-score">' + roll.health + "<small>/100</small></span>";

    /* Both sections are drawn with the same weight. Student Outcomes still
       leads by position — it is what the work is for — but "less pronounced"
       was never the point of putting Operational second, and the two are
       scored identically. `lead` now only decides which comes first. */
    return '<section class="sc-outcome is-lead" data-outcome="' + outcome.key + '">' +
      '<div class="sc-outcome-head">' +
        '<div>' +
          '<div class="sc-outcome-name">' + esc(outcome.name) + "</div>" +
          '<div class="sc-outcome-blurb">' + esc(outcome.blurb) + "</div>" +
        "</div>" +
        '<div class="sc-outcome-figures">' +
          score +
          '<span class="sc-outcome-cov">' + roll.coverage + "% coverage · " +
            roll.tracked + " tracked</span>" +
        "</div>" +
      "</div>" +
      spectrum(roll.counts) +
      '<div class="sc-parts">' + parts + "</div>" +
    "</section>";
  }

  /* The two sections, plus a line saying which arithmetic produced them —
     because "83" means something different once priorities are filled in, and
     a reader has no other way to tell which they are looking at. */
  /* No heading over these two.

     There was a "The scorecard" label and a line saying whether the figures
     were priority-weighted. The label named the page you are already on, and
     the note answered a question nobody had asked yet — it will matter once
     priorities are filled in, and the sections can say so then. Two sections
     that carry their own titles do not need a title above them. */
  function outcomes(rows) {
    return '<div class="sc-outcomes">' +
      OUTCOMES.map(function (o) { return outcomeCard(o, rows); }).join("") +
    "</div>";
  }

  function head(eyebrow, title, meta) {
    return '<div class="sc-head">' +
      (eyebrow ? '<div class="sc-head-eyebrow">' + esc(eyebrow) + "</div>" : "") +
      '<h2 class="sc-head-title">' + esc(title) + "</h2>" +
      (meta ? '<div class="sc-head-meta">' + esc(meta) + "</div>" : "") +
      "</div>";
  }

  /* ── drill cards ─────────────────────────────────────────────────────── */

  /**
   * A child tile.
   *
   * With `locked`, it still shows the branch and its health but cannot be
   * opened — a partner seeing a department, or a manager seeing a team that is
   * not theirs. The tile is deliberately still *there*: knowing the Registrar's
   * Office is amber is the point; knowing who inside it is amber is not.
   *
   * Rendered as a <div> rather than a disabled <button> so it is not announced
   * as a broken control to a screen reader.
   */
  function kidCard(opts) {
    var roll = opts.roll;
    var score = roll.health === null
      ? '<div class="sc-kid-score is-empty">—</div>'
      : '<div class="sc-kid-score">' + roll.health + "<small>/100</small></div>";
    var cov = roll.health === null
      ? '<div class="sc-kid-cov">' + statusChip("No Data", "Awaiting data") + "</div>"
      : '<div class="sc-kid-cov">Coverage ' + roll.coverage + "%</div>";
    var body =
      '<div class="sc-kid-name">' + esc(opts.name) + "</div>" +
      '<div class="sc-kid-role">' + esc(opts.sub) + "</div>" +
      score + cov + spectrum(roll.counts, true);

    if (opts.locked) {
      return '<div class="sc-kid is-locked" title="Summary only — you do not have access to the detail inside">' +
        '<span class="sc-kid-arrow" aria-hidden="true">·</span>' + body + "</div>";
    }
    return '<button type="button" class="sc-kid" data-goto="' + esc(opts.href) + '">' +
      '<span class="sc-kid-arrow" aria-hidden="true">›</span>' + body + "</button>";
  }

  /* Worst first: every Red, then Yellows, then one line for the silent ones.
   *
   * Roll-up rows are left out entirely. Every line here is a link to
   * `#/kpi/<id>`, and a roll-up has no id to lead to — it is an anonymised
   * summary standing in for measures the reader may not see, so following one
   * lands on "this KPI is no longer in the scorecard". For a partner every row
   * is a roll-up, which empties the list and drops the section: correct, since
   * a partner is not meant to reach a single KPI at all. For a manager it
   * leaves their own reporting line and quietly omits other branches. */
  /* `showOwner` names the person a flagged KPI belongs to. It exists so that
     the name can be withheld, but all three callers passed a literal `true`,
     so a partner — who cannot open the directory, and whose drill-down into a
     person is locked two functions below — was still shown four individuals by
     name beside their red and yellow measures. Wired to the same flag that
     does the locking. */
  function watchlist(rows, showOwner) {
    rows = rows.filter(function (r) { return !r.restricted; });
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

    /* When a band definition in the sheet didn't follow the standard pattern it
       was rebuilt from the yellow range so the colour is right — say so here so
       the correction is visible and can be fixed at source. */
    var bandNote = r.bandNote
      ? '<p class="sc-band-note">Band definition corrected: ' + esc(r.bandNote) +
        '. Update the spreadsheet to match.</p>'
      : "";

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
      runwayHtml + bands + bandNote +
      '<div class="sc-meta-grid">' +
        '<div class="sc-meta"><b>Owner</b><span>' + esc(r.employee) + (r.role ? " — " + esc(r.role) : "") + "</span></div>" +
        '<div class="sc-meta"><b>Category</b><span>' + esc(r.category || "—") + (r.type ? " · " + esc(typeLabel(r.type)) : "") + "</span></div>" +
        '<div class="sc-meta"><b>Direction</b><span>' +
          (r.direction === "higher" ? "Higher is better ↑"
            : r.direction === "lower" ? "Lower is better ↓" : "—") + "</span></div>" +
        '<div class="sc-meta"><b>Cadence</b><span>' + esc(r.frequency || "—") + "</span></div>" +
        '<div class="sc-meta"><b>Data source</b><span>' + source + "</span></div>" +
      "</div>";
  }

  /* ── KPI list (stakeholder + area levels) ─────────────────────────────── */

  var SEVERITY = { Red: 0, Yellow: 1, "Manual Review": 2, "No Data": 3, Green: 4 };

  function bySeverity(a, b) {
    return (SEVERITY[a.status] === undefined ? 9 : SEVERITY[a.status]) -
           (SEVERITY[b.status] === undefined ? 9 : SEVERITY[b.status]);
  }

  /** Order a set of KPI rows by the reader's chosen sort. */
  function sortKpis(rows, how) {
    var out = rows.slice();
    if (how === "status") return out.sort(bySeverity);
    if (how === "name") {
      return out.sort(function (a, b) {
        return String(a.measure).localeCompare(String(b.measure));
      });
    }
    if (how === "recent") {
      // Rows are keyed by a serial, so a higher id is a later addition. No
      // "date added" column has to exist for this to be true.
      return out.sort(function (a, b) { return Number(b.id) - Number(a.id); });
    }
    // owner: alphabetical by person, worst-first inside each person's block.
    // Anonymised roll-up rows carry no name; they sink rather than forming a
    // nameless group at the top.
    return out.sort(function (a, b) {
      var an = String(a.employee || ""), bn = String(b.employee || "");
      if (!an !== !bn) return an ? -1 : 1;
      var c = an.localeCompare(bn);
      if (c) return c;
      return bySeverity(a, b) ||
             String(a.measure).localeCompare(String(b.measure));
    });
  }

  function sortBar(showOwner) {
    // Grouping by stakeholder means nothing on one person's own page, nor on a
    // list where every row is anonymised — a partner would be offered a way to
    // group by a name they are never shown. Not offered rather than inert.
    var opts = SORTS.filter(function (o) { return showOwner || o.id !== "owner"; });
    if (opts.length < 2) return "";
    var chips = opts.map(function (o) {
      var on = effectiveSort(showOwner) === o.id;
      return '<button type="button" class="sc-chip-btn' + (on ? " is-on" : "") +
        '" data-sort="' + esc(o.id) + '"' + (on ? ' aria-current="true"' : "") +
        ">" + esc(o.label) + "</button>";
    }).join("");
    return '<div class="sc-lens sc-sort"><span class="sc-lens-label">Sort</span>' +
      chips + "</div>";
  }

  /** The sort actually in force here — "owner" collapses to status on a page
      that only ever shows one person. */
  function effectiveSort(showOwner) {
    return (!showOwner && state.sort === "owner") ? "status" : state.sort;
  }

  function kpiList(rows, showOwner) {
    if (!rows.length) return '<div class="sc-empty">No KPIs match this lens.</div>';
    // A list of rows with no names is not a list "showing owners", whatever the
    // caller believed. Deciding that here keeps the grouping, the chip and the
    // per-row byline from disagreeing with each other.
    showOwner = showOwner && rows.some(function (r) { return r.employee; });
    var how = effectiveSort(showOwner);
    var sorted = sortKpis(rows, how);
    // Grouped under a heading per person, not merely adjacent. Sorting alone
    // would put someone's KPIs next to each other; a heading is what makes it
    // readable as "here is what this person is accountable for".
    // With everything under a single heading, the heading says nothing that the
    // page title has not already said.
    var distinct = unique(rows.map(function (r) { return r.employee || ""; })).length;
    var grouped = showOwner && how === "owner" && distinct > 1;
    var seen = null;

    return sortBar(showOwner) + '<div class="sc-kpi-list">' + sorted.map(function (r) {
      var v = formatValue(r);
      var goal = r.bandGreen ? "<small>goal " + esc(r.bandGreen) + "</small>" : "";
      var meta = [r.category, r.type, r.frequency].filter(Boolean).join(" · ");
      var header = "";
      if (grouped) {
        var who = r.employee || "Not attributed";
        if (who !== seen) {
          seen = who;
          var n = sorted.filter(function (x) {
            return (x.employee || "Not attributed") === who;
          }).length;
          header = '<div class="sc-kpi-group">' +
            '<span class="sc-kpi-group-name">' + esc(who) + "</span>" +
            '<span class="sc-kpi-group-count">' + n + " KPI" + (n === 1 ? "" : "s") +
            "</span></div>";
        }
      }
      // A roll-up row has no KPI behind it to open. Rendering it as a button
      // produced "#/kpi/rollup-40" and a page saying that KPI is no longer in
      // the scorecard — a door drawn on a wall. It stays, because the colour
      // and value are real, but it is not something you can press.
      var open = !r.restricted;
      return header +
        (open
          ? '<button type="button" class="sc-kpi-row" data-goto="#/kpi/' + r.id + '">'
          : '<div class="sc-kpi-row is-locked" aria-disabled="true">') +
        "<span>" +
          '<span class="sc-kpi-measure">' + esc(r.measure) + "</span>" +
          '<span class="sc-kpi-cat">' +
            esc(showOwner && !grouped ? r.employee + " · " + meta : meta) + "</span>" +
        "</span>" +
        statusChip(r.status) +
        '<span class="sc-kpi-val">' + esc(v || "—") + goal + "</span>" +
        (open ? "</button>" : "</div>");
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
        href: "#/" + dr[0].deptSlug,
        // a partner sees each department's health and stops there
        locked: !canOpenBelowDept()
      });
    }).join("");

    /* Departments are the second half of this page now, not the first, and a
       partner does not get them at all.

       The outcome sections above already answer what a partner is here for —
       is the organisation delivering — and they answer it across the whole of
       Student Services rather than one department at a time. A grid of
       locked-open department tiles underneath added no fact they could act on,
       only the shape of an internal structure and an invitation to click into
       eight doors that do not open. */
    var showDepts = canOpenBelowDept();

    /* No eyebrow here. It read "Student Services" directly under a breadcrumb
       that already says Student Services — the same words twice, three lines
       apart. The eyebrow still earns its place on the views below, where it
       says "Department" or "Student outcome" and the breadcrumb does not. */
    return head("", "The whole organization",
        roll.tracked + " tracked KPIs across " + depts.length + " departments") +
      lensBar(rows) + summaryRow(roll) +
      outcomes(rows) +
      (showDepts
        ? '<div class="sc-kids-head">By department</div>' +
          '<div class="sc-kids">' + kids + "</div>"
        : "") +
      watchlist(rows, canOpenPeople());
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
        href: "#/" + deptSlug + "/" + sr[0].subDeptSlug,
        // a team outside this reader's line: health yes, detail no
        locked: !canOpenPeople() || isRestricted(sr)
      });
    }).join("");

    return head("Department", deptName,
        roll.tracked + " tracked KPIs · " + subs.length + " sub-departments") +
      lensBar(rows) + summaryRow(roll) +
      (kids ? '<div class="sc-kids">' + kids + "</div>" : '<div class="sc-empty">No KPIs match this lens.</div>') +
      watchlist(rows, canOpenPeople());
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
        href: "#/" + deptSlug + "/" + subSlug + "/" + pr[0].personSlug,
        locked: !canOpenPeople() || isRestricted(pr)
      });
    }).join("");

    return head(all[0].dept, all[0].subDept,
        roll.tracked + " tracked KPIs · " + people.length + " stakeholder" + (people.length === 1 ? "" : "s")) +
      lensBar(rows) + summaryRow(roll) +
      (kids ? '<div class="sc-kids">' + kids + "</div>" : '<div class="sc-empty">No KPIs match this lens.</div>') +
      watchlist(rows, canOpenPeople());
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
      lensBar(rows) + summaryRow(roll) +
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
      lensBar(rows) + summaryRow(roll) +
      kpiList(rows, true);
  }

  /* ── student-outcome cards (root only) ────────────────────────────────── */

  /* renderAreas() filled the "Sort by student outcome" panel that stood
     below the departments. Both are gone: those three areas are half of
     the scorecard at the top of the page now. renderArea() below is kept —
     #/area/<name> is still a valid address, and the breadcrumb still names
     it, so an existing link lands somewhere real. */

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
    // state.sort is deliberately untouched here — it survives navigation.
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

    /* A footnote used to sit here reciting how many KPIs were tracked, how many
       were excluded, and where the data was read from. That is provenance for
       the page's own build rather than a reading anyone came for — and the
       figures it quoted are already on the page, in the coverage ring and the
       tracked counts. META still carries all of it for anything that wants it. */

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
      return;
    }
    // Sort is a reading preference, not a place. It stays out of the URL so it
    // does not travel in a shared link, and re-renders in place rather than
    // pushing a history entry someone has to press Back through.
    var sort = e.target.closest("[data-sort]");
    if (sort) {
      state.sort = sort.getAttribute("data-sort");
      try { localStorage.setItem(SORT_KEY, state.sort); } catch (err) { /* private mode */ }
      render();
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
      // A roll-up carries no name and no measure, and its id opens nothing.
      // Indexing one would put a blank row in the results.
      if (r.restricted) return;
      out.push({ label: r.subDept + " — " + r.dept, kind: "Sub-department", href: "#/" + r.deptSlug + "/" + r.subDeptSlug, key: r.deptSlug + r.subDeptSlug });
      if (r.employee) out.push({ label: r.employee, kind: "Stakeholder", href: "#/" + r.deptSlug + "/" + r.subDeptSlug + "/" + r.personSlug, key: r.personSlug });
      if (r.measure) out.push({ label: r.measure, kind: "KPI", href: "#/kpi/" + r.id, key: "k" + r.id });
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

    /* A partner is offered no search, because there is nothing it could find.
       Every row they receive is an anonymised roll-up: no employee, no measure,
       and an id like "rollup-40" that opens to "that KPI is no longer in the
       scorecard". Departments and sub-departments are not openable to them
       either. So the index would be a list of blank labels leading to dead
       ends — a box that looks like it works and never does. Removing it says
       the true thing: this view is a summary, not something to search.
       Waited for, not read here: this runs at boot, when the role is still
       "none", and asking early would answer "not a partner" for everybody. */
    var box = document.getElementById("spotlight");
    if (box && window.SS && SS.access) {
      Promise.resolve(SS.access.ready).then(function () {
        if (SS.access.isPartner) box.hidden = true;
      })["catch"](function () { /* leave the search in place */ });
    }
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
