/* ═══════════════════════════════════════════════════════════════════════════
   THE FOUR HOME TILES

   Org chart, directory, KPIs and OKRs, each opening in place instead of
   navigating away. The interaction is the org chart's stakeholder tile: press
   the head, the body grows, press again and it closes.

   Two decisions are worth stating, because both are easy to undo by accident.

   ── Nothing is fetched until a tile is opened.
   The home page loads no data of its own and was worth keeping that way. Each
   panel fills on first expand and is cached for the visit, so opening a tile
   twice costs one round trip and a tile nobody opens costs none.

   ── Permissioning is not reimplemented here.
   Every panel reads through SS.data.load(), the same path the real pages use.
   That already carries the rules: v_hub_kpis is row-level-security filtered to
   the reader's own line, and its `after` hook tops the result up with
   anonymised roll-ups, so a branch someone may not open still shows an honest
   colour with no name attached. A partner therefore sees exactly what the
   scorecard page gives them, because it is the same data by the same route.
   Rewriting any of that here would be a second copy of the access rules, free
   to drift from the first.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var SS = (window.SS = window.SS || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function cls(s) { return String(s || "").toLowerCase().split(" ").join("-"); }

  /* ── the two live bands share a row ─────────────────────────────────────
     Each band is revealed by its own script on its own rule. Whichever reveals
     last makes the row a pair, so both call this and it simply recounts. */
  SS.home = SS.home || {};
  SS.home.syncBands = function () {
    var row = document.getElementById("homeBands");
    if (!row) return;
    var shown = row.querySelectorAll(".home-issues:not([hidden])").length;
    row.classList.toggle("is-pair", shown > 1);
  };

  /* ── data, loaded once per visit ───────────────────────────────────────── */
  var loading = {};
  function dataset(name) {
    if (!loading[name]) {
      if (!SS.data || !SS.data.load) {
        return Promise.reject(new Error("the data service is not available on this page"));
      }
      loading[name] = SS.data.load(name);
      loading[name]["catch"](function () { delete loading[name]; });
    }
    return loading[name];
  }
  function ready() {
    return Promise.resolve(SS.access && SS.access.ready)["catch"](function () {});
  }
  function myDept() { return (SS.access && SS.access.scope && SS.access.scope.department) || null; }
  function myName() {
    var a = SS.access || {};
    return (a.scope && a.scope.person) || a.fullName || null;
  }
  function isPartner() { return !!(SS.access && SS.access.isPartner); }

  /* ═══════════════ ORGANIZATIONAL CHART ═══════════════
     The little tree the home page used to carry, rebuilt from the org chart
     data instead of being typed into the markup. The old one hardcoded names,
     which is why it had to come out: it could not be scoped and went stale the
     moment somebody moved team.

     Three levels is the whole point. The VP, the directors, and a few people
     under each — deeper than that it stops being a glance and becomes the org
     chart, which is one button away. */
  function panelOrg() {
    return dataset("orgchart").then(function () {
      var everyone = (window.OC && window.OC.employees) || window.__ORG_CHART__ || [];
      if (!everyone.length) return "";

      /* Departmental leadership only.
         Project managers sit beside the line rather than in it — they are
         carried on the org chart as `role: "pm"` and drawn there as flankers,
         not as another rung. Including them here put Jess Swinburne in the row
         of directors and her assistant under her, which reads as a department
         that does not exist. The full chart is one button away and still shows
         everyone. */
      var oc = everyone.filter(function (e) { return e.role !== "pm"; });
      if (!oc.length) return "";

      var kids = {};
      oc.forEach(function (e) {
        var key = e.reportsTo == null ? "" : String(e.reportsTo);
        (kids[key] = kids[key] || []).push(e);
      });

      var vp = oc.filter(function (e) { return e.level === 1; })[0]
            || oc.filter(function (e) { return !e.reportsTo; })[0];
      if (!vp) return "";

      /* The org chart stores a department slug; the palette is keyed by the
         full name every other page uses. This is the join between them, and it
         is what gives Ben his gold and each director their department's own
         colour. A slug with no entry simply gets no colour rather than a
         wrong one. */
      var DEPT_OF_SLUG = {
        executive:  "VP - Student Services",
        records:    "Student Records, Registration, and Support",
        enrollment: "Enrollment & Retention",
        dean:       "Dean of Students",
        digital:    "Digital Operations"
      };
      var PALETTE = window.DEPT_COLORS || {};

      function tint(e) {
        var c = PALETTE[DEPT_OF_SLUG[e.dept] || e.dept];
        return c ? "--nc:" + c.bg + ";--nc-r:" + c.r + ";" : "";
      }

      function node(e, extra) {
        return '<div class="ht-node' + (extra ? " " + extra : "") + '" style="' + tint(e) + '">' +
          '<div class="ht-node-name">' + esc(e.name) + "</div>" +
          (e.title ? '<div class="ht-node-role">' + esc(e.title) + "</div>" : "") +
          "</div>";
      }

      var SHOWN = 3;
      var branches = (kids[String(vp.id)] || []).map(function (d) {
        var all = kids[String(d.id)] || [];
        var under = all.slice(0, SHOWN);
        var more = all.length - under.length;
        return '<div class="ht-branch" style="' + tint(d) + '">' + node(d, "is-dir") +
          (under.length
            ? '<div class="ht-sub">' +
                under.map(function (c) { return node(c, ""); }).join("") +
                (more > 0 ? '<div class="ht-more">and ' + more + " more</div>" : "") +
              "</div>"
            : "") +
          "</div>";
      }).join("");

      return '<div class="ht-tree">' +
        '<div class="ht-top">' + node(vp, "is-vp") + "</div>" +
        '<div class="ht-branches">' + branches + "</div>" +
        "</div>";
    });
  }

  /* ═══════════════ DIRECTORY ═══════════════
     The two charts the directory page carries — headcount by department, and
     the split by employment type — drawn from the same numbers by the same
     route, so the tile and the page cannot disagree.

     A partner receives no directory rows at all (the view refuses them), so
     there is nothing to chart and the panel says so rather than drawing an
     empty axis. */
  function panelDirectory() {
    return Promise.all([dataset("directory"), ready()]).then(function () {
      var people = window.EMPLOYEES || [];
      var contractors = window.STUDENT_CONTRACTORS || {};
      var DEPTC = window.DEPT_COLORS || {};
      var TYPEC = window.TYPE_COLORS || {};

      var byDept = {}, byType = {}, scTotal = 0;
      people.forEach(function (e) {
        if (e.dept) byDept[e.dept] = (byDept[e.dept] || 0) + 1;
        if (e.type) byType[e.type] = (byType[e.type] || 0) + 1;
      });
      Object.keys(contractors).forEach(function (d) {
        var n = Number(contractors[d]) || 0;
        if (!n) return;
        byDept[d] = (byDept[d] || 0) + n;
        scTotal += n;
      });
      if (scTotal) byType["Student Contractor"] = scTotal;

      var deptRows = Object.keys(byDept).map(function (k) {
        return { label: k, value: byDept[k] };
      }).sort(function (a, b) { return b.value - a.value; });

      if (!deptRows.length) {
        return '<div class="gw-empty">The directory is not available to your account. ' +
               "The button below opens what you can see.</div>";
      }

      var max = deptRows[0].value || 1;
      var total = people.length + scTotal;
      var bars = deptRows.map(function (r) {
        var c = DEPTC[r.label] || { bg: "#065577", light: "#28738A" };
        return '<div class="ht-bar-row">' +
          '<div class="ht-bar-label" title="' + esc(r.label) + '">' + esc(r.label) + "</div>" +
          '<div class="ht-bar-track"><div class="ht-bar-fill" style="width:' +
            ((r.value / max) * 100).toFixed(1) + "%;background:linear-gradient(90deg," +
            c.bg + "," + (c.light || c.bg) + ');"><span class="ht-bar-value">' +
            r.value + "</span></div></div></div>";
      }).join("");

      var typeRows = Object.keys(byType).map(function (k) {
        return { label: k, value: byType[k], color: TYPEC[k] || "#7F898A" };
      }).sort(function (a, b) { return b.value - a.value; });
      var tTotal = typeRows.reduce(function (s, d) { return s + d.value; }, 0) || 1;

      var size = 168, cx = size / 2, cy = size / 2, rad = size * 0.36, sw = size * 0.15;
      var cum = 0;
      var segs = typeRows.map(function (d) {
        // One slice covering the whole circle cannot be drawn as an arc: its
        // start and end points coincide and the path collapses to nothing.
        if (typeRows.length === 1) {
          return '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad +
            '" fill="none" stroke="' + d.color + '" stroke-width="' + sw + '"/>';
        }
        var a0 = cum * 2 * Math.PI - Math.PI / 2;
        cum += d.value / tTotal;
        var a1 = cum * 2 * Math.PI - Math.PI / 2;
        var large = d.value / tTotal > 0.5 ? 1 : 0;
        return '<path d="M ' + (cx + rad * Math.cos(a0)).toFixed(2) + " " +
          (cy + rad * Math.sin(a0)).toFixed(2) + " A " + rad + " " + rad + " 0 " + large + " 1 " +
          (cx + rad * Math.cos(a1)).toFixed(2) + " " + (cy + rad * Math.sin(a1)).toFixed(2) +
          '" fill="none" stroke="' + d.color + '" stroke-width="' + sw + '"/>';
      }).join("");

      var legend = typeRows.map(function (d) {
        return '<div class="ht-leg"><span class="ht-swatch" style="background:' + d.color +
          '"></span>' + esc(d.label) + "<b>" + d.value + "</b></div>";
      }).join("");

      return '<div class="ht-two">' +
        '<div class="ht-col"><div class="ht-col-title">Employees by department</div>' + bars + "</div>" +
        '<div class="ht-col"><div class="ht-col-title">Employment types</div>' +
          '<div class="ht-donut-wrap">' +
            '<svg class="ht-donut" viewBox="0 0 ' + size + " " + size +
              '" role="img" aria-label="Employment types">' + segs +
              '<text class="ht-donut-n" x="' + cx + '" y="' + (cy - 1) + '" text-anchor="middle">' +
                total + "</text>" +
              '<text class="ht-donut-l" x="' + cx + '" y="' + (cy + 15) + '" text-anchor="middle">total</text>' +
            "</svg>" +
            '<div class="ht-legend">' + legend + "</div>" +
          "</div></div></div>";
    });
  }

  /* ═══════════════ KPI SCORECARD ═══════════════
     Two things, in the order they are useful: the colour of everything this
     reader can see, then the measures that are theirs by name.

     No role branching decides the content — the rows arrived already scoped. A
     partner gets only anonymised roll-ups, so the second half is empty and is
     not drawn; a manager gets their own line, so it lists them and the people
     under them. Both come out of the same code because the server decided. */
  var WORST_FIRST = ["Red", "Yellow", "Manual Review", "No Data", "Green"];
  /* The scorecard's own colours, so a red here is the red there. */
  var STATUS_COLOR = {
    "Red": "#D14545", "Yellow": "#E08A1E", "Green": "#2E9E5C",
    "Manual Review": "#7E8FA6", "No Data": "#5C6B78"
  };

  function panelKpis() {
    return Promise.all([dataset("kpis"), ready()]).then(function () {
      var everything = window.SCORECARD_KPIS || [];
      if (!everything.length) return '<div class="gw-empty">No measures are visible to your account yet.</div>';

      /* The summary must count what its heading claims.
         `everything` spans the whole organisation — the reader's own rows plus
         the anonymised roll-ups that stand in for branches they may not open.
         Titling that block with a department and then counting all of Student
         Services under it said two different things at once, so when the reader
         has a department the block is narrowed to it. A partner has none, and
         theirs stays organisation-wide, which is what their heading says. */
      var dept = myDept();
      var rows = dept
        ? everything.filter(function (r) { return r.dept === dept; })
        : everything;
      if (!rows.length) rows = everything;      // an unmatched department name
                                                // should widen the view, not empty it

      var counts = {}, scored = 0, points = 0;
      rows.forEach(function (r) {
        counts[r.status] = (counts[r.status] || 0) + 1;
        if (r.status === "Green") { scored++; points += 100; }
        else if (r.status === "Yellow") { scored++; points += 50; }
        else if (r.status === "Red") { scored++; }
      });
      var health = scored ? Math.round(points / scored) : null;

      var scopeLabel = dept && rows !== everything ? dept : "Across Student Services";

      /* ── the ring: how everything in scope is scoring ──────────────────
         A health number on its own is a number; the ring shows what it is made
         of. Drawn as five arcs round one circle, worst first, so the size of
         the red arc is the first thing the eye lands on. */
      var size = 176, cx = size / 2, cy = size / 2, rad = size * 0.37, sw = size * 0.13;
      var present = WORST_FIRST.filter(function (st) { return counts[st]; });
      var cum = 0;
      var arcs = present.map(function (st) {
        var frac = counts[st] / rows.length;
        if (present.length === 1) {
          return '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="none" stroke="' +
            STATUS_COLOR[st] + '" stroke-width="' + sw + '"/>';
        }
        var a0 = cum * 2 * Math.PI - Math.PI / 2;
        cum += frac;
        var a1 = cum * 2 * Math.PI - Math.PI / 2;
        return '<path d="M ' + (cx + rad * Math.cos(a0)).toFixed(2) + " " +
          (cy + rad * Math.sin(a0)).toFixed(2) + " A " + rad + " " + rad + " 0 " +
          (frac > 0.5 ? 1 : 0) + " 1 " + (cx + rad * Math.cos(a1)).toFixed(2) + " " +
          (cy + rad * Math.sin(a1)).toFixed(2) + '" fill="none" stroke="' +
          STATUS_COLOR[st] + '" stroke-width="' + sw + '"/>';
      }).join("");

      var legend = present.map(function (st) {
        return '<div class="ht-leg"><span class="ht-swatch" style="background:' +
          STATUS_COLOR[st] + '"></span>' + esc(st) + "<b>" + counts[st] + "</b></div>";
      }).join("");

      var ring = '<div class="ht-col"><div class="ht-col-title">Status of every measure</div>' +
        '<div class="ht-donut-wrap">' +
          '<svg class="ht-donut" viewBox="0 0 ' + size + " " + size +
            '" role="img" aria-label="KPI status split">' + arcs +
            (health === null ? "" :
              '<text class="ht-donut-n" x="' + cx + '" y="' + (cy - 1) +
                '" text-anchor="middle">' + health + "</text>" +
              '<text class="ht-donut-l" x="' + cx + '" y="' + (cy + 15) +
                '" text-anchor="middle">health</text>') +
          "</svg>" +
          '<div class="ht-legend">' + legend + "</div>" +
        "</div></div>";

      /* ── the bars: where the trouble sits ──────────────────────────────
         One stacked bar per sub-department, each segment a status. This is the
         part a list of individual KPIs could not show: which team is carrying
         the reds, at a glance, without reading forty rows. Ordered by how much
         red each holds, so the answer is at the top. */
      /* Grouped by whichever field actually separates these rows.
         Sub-department is the more useful cut, but a partner receives only
         anonymised roll-ups and those carry no sub-department — they all
         default to "Department Leadership", which drew a single bar covering
         everything and said nothing at all. Falling back to department gives
         them four bars that mean something. */
      function groupBy(field) {
        var g = {}, ord = [];
        rows.forEach(function (r) {
          var k = r[field] || "Unassigned";
          if (!g[k]) { g[k] = { label: k, total: 0, by: {} }; ord.push(k); }
          g[k].total++;
          g[k].by[r.status] = (g[k].by[r.status] || 0) + 1;
        });
        return { map: g, order: ord };
      }
      var grouped = groupBy("subDept");
      if (grouped.order.length < 2) grouped = groupBy("dept");
      var groups = grouped.map, order = grouped.order;
      var bars = order.map(function (k) { return groups[k]; })
        .sort(function (a, b) {
          return (b.by.Red || 0) - (a.by.Red || 0) ||
                 (b.by.Yellow || 0) - (a.by.Yellow || 0) ||
                 b.total - a.total;
        })
        .map(function (g) {
          var segs = WORST_FIRST.filter(function (st) { return g.by[st]; }).map(function (st) {
            return '<span class="ht-seg" style="width:' +
              ((g.by[st] / g.total) * 100).toFixed(2) + "%;background:" + STATUS_COLOR[st] +
              '" title="' + esc(st) + ": " + g.by[st] + '"></span>';
          }).join("");
          return '<div class="ht-bar-row">' +
            '<div class="ht-bar-label" title="' + esc(g.label) + '">' + esc(g.label) +
              '<span class="ht-bar-n">' + g.total + "</span></div>" +
            '<div class="ht-stack">' + segs + "</div></div>";
        }).join("");

      var head = '<div class="ht-kpi-head">' +
          '<div><div class="ht-col-title">' + esc(scopeLabel) + "</div>" +
            '<div class="ht-sub">' + rows.length + " tracked measure" +
              (rows.length === 1 ? "" : "s") + " across " + order.length +
              " team" + (order.length === 1 ? "" : "s") + "</div></div>" +
        "</div>";

      return head + '<div class="ht-two">' +
        '<div class="ht-col"><div class="ht-col-title">By team</div>' + bars + "</div>" +
        ring + "</div>";
    });
  }

  /* ═══════════════ OKRs ═══════════════
     Which objectives touch this reader. OKRs carry no department of their own,
     only the names of the people on them, so a department is reached by looking
     each stakeholder up in the directory. A name matching nobody contributes
     nothing, which is why one missing person cannot hide an objective.

     A partner sees all of them — the summary the home page has always shown.
     Everyone else sees the ones naming them or their department, falling back
     to all of them rather than to an empty panel, and the label says which. */
  /**
   * How far one key result has got, as a fraction of its own goal.
   *
   * `progress` is a measured value, not a percentage: a row can read
   * progress 9 against goal 5 and mean "nine of the thing we want five of".
   * Averaging those raw numbers reported one objective at 155% — a count was
   * being read as a completion. Each row is therefore scored against its own
   * goal, and the direction matters: on a "Decrease" measure, being under the
   * goal is the win, so the ratio inverts.
   *
   * Clamped to 0..1, which is what the OKR Progress page does with its own
   * bars — beating a goal is good news, not 155% of an objective.
   */
  function attainment(r) {
    var p = r.progress, g = r.goal;
    if (typeof p !== "number" || typeof g !== "number" || g === 0) return null;
    var ratio = /decrease/i.test(String(r.type || ""))
      ? (p === 0 ? 1 : g / p)
      : (p / g);
    if (!isFinite(ratio)) return null;
    return Math.max(0, Math.min(1, ratio));
  }

  function panelOkrs() {
    return Promise.all([dataset("okrs"), ready()]).then(function () {
      var rows = window.OKR_PROGRESS_ROWS || [];
      if (!rows.length) return "";
      // The directory is only needed to turn names into departments; without it
      // everyone simply sees every objective.
      return dataset("directory")["catch"](function () { return null; }).then(function () {
        var deptOf = {};
        (window.EMPLOYEES || []).forEach(function (e) {
          if (e.name) deptOf[String(e.name).trim().toLowerCase()] = e.dept;
        });

        var groups = {}, order = [];
        rows.forEach(function (r) {
          if (!groups[r.okr]) {
            groups[r.okr] = { okr: r.okr, rows: [], people: {}, depts: {} };
            order.push(r.okr);
          }
          var g = groups[r.okr];
          g.rows.push(r);
          [r.stakeholder, r.projectManager]
            .concat(String(r.secondaryStakeholders || "").split(/[,;]/))
            .forEach(function (n) {
              n = String(n || "").trim();
              if (!n) return;
              g.people[n.toLowerCase()] = true;
              var d = deptOf[n.toLowerCase()];
              if (d) g.depts[d] = true;
            });
        });

        var all = order.map(function (k) { return groups[k]; });
        var dept = myDept(), me = myName(), shown = all, scoped = false;
        if (!isPartner() && (dept || me)) {
          var matched = all.filter(function (g) {
            return (dept && g.depts[dept]) || (me && g.people[String(me).toLowerCase()]);
          });
          if (matched.length) { shown = matched; scoped = true; }
        }

        /* Every key result, not just the objective.
           An objective averaged into one bar says "67%" and nothing about what
           is behind it. These are the rows a person is actually accountable
           for, each with its own attainment, so the one that is stuck is
           visible rather than averaged away.

           Only the rows that name this reader — or somebody in their
           department — are listed. That is a per-row test, not a per-objective
           one: an objective can span four departments while only three of its
           key results are yours. */
        function touchesMe(r) {
          if (isPartner()) return true;
          var names = [r.stakeholder, r.projectManager]
            .concat(String(r.secondaryStakeholders || "").split(/[,;]/))
            .map(function (n) { return String(n || "").trim().toLowerCase(); })
            .filter(Boolean);
          if (me && names.indexOf(String(me).toLowerCase()) !== -1) return true;
          if (!dept) return false;
          return names.some(function (n) { return deptOf[n] === dept; });
        }

        var cards = shown.map(function (g) {
          var scores = g.rows.map(attainment).filter(function (v) { return v !== null; });
          var pct = scores.length
            ? Math.round(scores.reduce(function (s, v) { return s + v; }, 0) / scores.length * 100)
            : null;
          var risk = g.rows.filter(function (r) { return /risk|behind/i.test(String(r.status || "")); }).length;

          var own = g.rows.filter(touchesMe);
          if (!own.length) own = g.rows;          // an objective with no row of
                                                  // yours still shows its whole
                                                  // shape rather than nothing
          // Worst first: the point of listing them is to find the stuck one.
          own = own.slice().sort(function (x, y) {
            var ax = attainment(x), ay = attainment(y);
            if (ax === null) return 1;
            if (ay === null) return -1;
            return ax - ay;
          });

          /* Rolled up to the key result, not the sub-key result.
             The sub-KRs are the working rows — one objective carries thirty of
             them, and listing every one turned a summary into a spreadsheet.
             A key result is the unit somebody is actually accountable for, so
             its sub-rows are averaged into it and the number of them is shown
             beside it. The full breakdown is behind the button. */
          var krMap = {}, krOrder = [];
          own.forEach(function (r) {
            var k = r.keyResult || "Key result";
            if (!krMap[k]) { krMap[k] = { name: k, rows: [] }; krOrder.push(k); }
            krMap[k].rows.push(r);
          });

          var krs = krOrder.map(function (k) { return krMap[k]; })
            .map(function (kr) {
              var vals = kr.rows.map(attainment).filter(function (v) { return v !== null; });
              var kpct = vals.length
                ? Math.round(vals.reduce(function (x, y) { return x + y; }, 0) / vals.length * 100)
                : null;
              kr.pct = kpct;
              return kr;
            })
            .sort(function (x, y) {
              if (x.pct === null) return 1;
              if (y.pct === null) return -1;
              return x.pct - y.pct;
            })
            .map(function (kr) {
              var atRisk = kr.rows.some(function (r) { return /risk|behind/i.test(String(r.status || "")); });
              var allDone = kr.rows.every(function (r) { return /complet/i.test(String(r.status || "")); });
              var tone = allDone ? "is-good" : atRisk ? "is-risk"
                       : (kr.pct !== null && kr.pct >= 80 ? "is-good" : "is-mid");
              var n = kr.rows.length;
              return '<div class="ht-kr">' +
                '<div class="ht-kr-name" title="' + esc(kr.name) + '">' + esc(kr.name) +
                  (n > 1 ? '<span class="ht-kr-n">' + n + "</span>" : "") + "</div>" +
                '<div class="ht-kr-bar"><div class="ht-kr-fill ' + tone + '" style="width:' +
                  (kr.pct === null ? 0 : kr.pct) + '%"></div></div>' +
                '<div class="ht-kr-pct' + (kr.pct === null ? " is-none" : "") + '">' +
                  (kr.pct === null ? "&mdash;" : kr.pct + "%") + "</div>" +
                "</div>";
            }).join("");

          return '<div class="ht-okr">' +
            '<div class="ht-okr-head">' +
              '<div class="ht-okr-name">' + esc(g.okr) + "</div>" +
              (pct === null ? "" : '<div class="ht-okr-pct">' + pct + "%</div>") +
            "</div>" +
            '<div class="ht-okr-meta">' + krOrder.length +
              " key result" + (krOrder.length === 1 ? "" : "s") +
              " &middot; " + own.length + " tracked row" + (own.length === 1 ? "" : "s") +
              (risk ? ' &middot; <b class="is-risk">' + risk + " at risk</b>" : "") + "</div>" +
            '<div class="ht-krs">' + krs + "</div>" +
            "</div>";
        }).join("");

        var label = isPartner() ? "Student Services objectives"
                  : scoped ? "Objectives involving you or " + esc(dept || "your team")
                  : "All Student Services objectives";
        return '<div class="ht-col-title">' + label + "</div>" +
               '<div class="ht-okrs">' + cards + "</div>";
      });
    });
  }

  var PANELS = { org: panelOrg, directory: panelDirectory, kpis: panelKpis, okrs: panelOkrs };

  /* ── expand / collapse ─────────────────────────────────────────────────── */
  var filled = {};

  /* Give an open panel exactly the height its content needs.
     The CSS opens to a fixed max-height, which has to be a guess, and a guess
     that is too small clips the bottom off silently — the partner's OKR panel
     already runs to 1722px and would grow with the data. Measuring after the
     content lands removes the guess. Cleared on close so the stylesheet's
     zero takes over again and it animates shut. */
  function sizeToContent(tile) {
    var body = tile.querySelector(".gw-body");
    var inner = tile.querySelector(".gw-body-inner");
    if (!body || !inner) return;
    body.style.maxHeight = tile.classList.contains("is-open")
      ? inner.scrollHeight + 40 + "px"
      : "";
  }

  function fill(key, panel) {
    if (!panel) return;
    var tile = panel.closest(".gw");
    PANELS[key]().then(function (html) {
      panel.innerHTML = html || '<div class="gw-empty">Nothing to show here.</div>';
      if (tile) sizeToContent(tile);
    })["catch"](function (err) {
      // Never a stack trace on the home page. One sentence, and the button
      // below still takes them to the real page.
      panel.innerHTML = '<div class="gw-empty">Could not load this right now &mdash; ' +
        esc(err && err.message ? err.message : "try the full page below.") + "</div>";
      if (tile) sizeToContent(tile);
      delete filled[key];              // a second press may try again
    });
  }

  function toggle(tile) {
    var head = tile.querySelector(".gw-head");

    if (tile.classList.contains("is-open")) {
      tile.classList.remove("is-open");
      head.setAttribute("aria-expanded", "false");
      sizeToContent(tile);             // clears it, so the stylesheet's 0 wins
      return;
    }

    // The class is all that opens it; CSS handles the height, the fade and
    // taking it out of the accessibility tree once it has closed.
    tile.classList.add("is-open");
    head.setAttribute("aria-expanded", "true");
    sizeToContent(tile);               // for a panel already filled

    var key = tile.dataset.gw;
    if (!filled[key]) {
      filled[key] = true;
      fill(key, tile.querySelector(".gw-panel"));
    }
  }

  /** Shut every tile, without animating — used when leaving the page. */
  function closeAll() {
    document.querySelectorAll(".gw.is-open").forEach(function (tile) {
      tile.classList.remove("is-open");
      var head = tile.querySelector(".gw-head");
      if (head) head.setAttribute("aria-expanded", "false");
      var body = tile.querySelector(".gw-body");
      if (body) body.style.maxHeight = "";
    });
  }

  function start() {
    SS.home.syncBands();
    var grid = document.querySelector(".home-gw-grid");
    if (!grid) return;                 // not the home page
    grid.addEventListener("click", function (e) {
      var head = e.target.closest(".gw-head");
      if (head) toggle(head.closest(".gw"));
    });

    /* Leave the page with the tiles shut.
       Following a tile's button navigates away, and coming back — with the
       Back button, from the browser's cache — restores the DOM exactly as it
       was left, open tile and all. That is not where anyone wants to land:
       the home page should look like the home page. `pagehide` covers the
       journey out, `pageshow` the restore, because a cached page never fires
       its scripts again. */
    window.addEventListener("pagehide", closeAll);
    window.addEventListener("pageshow", function (e) { if (e.persisted) closeAll(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
