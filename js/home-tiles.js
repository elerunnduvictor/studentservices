/* ═══════════════════════════════════════════════════════════════════════════
   THE HOME PAGE TILES

   Org chart, KPIs and OKRs, each opening in place instead of navigating away.
   The click-to-expand mechanics (press the head, the body grows) live in
   shared/js/gw-tiles.js now — the org chart page grew its own pair of these
   tiles (Directory, Process Documentation, moved off this page) and the
   interaction is identical on both, so only the engine is shared; each page
   keeps its own PANELS map.

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
  var esc = SS.gw.esc, dataset = SS.gw.dataset, ready = SS.gw.ready;


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
      /* Group by the level immediately below whatever the reader is looking at.

         Somebody scoped to one department is already inside it, so the useful
         next cut is sub-department — four or five bars.

         Somebody looking at the whole organisation — the VP, an admin, a
         partner — gets one bar per department. Grouping those readers by
         sub-department drew fourteen bars in a tile meant to be read at a
         glance, and it answered a question they had not asked yet: from the
         top the useful first question is which department is carrying the
         reds, and the sub-department underneath it is a second click, not a
         second look. The scorecard page is where that click leads. */
      var scopedToDept = !!dept && rows !== everything;
      var primary = scopedToDept ? "subDept" : "dept";
      var grouped = groupBy(primary);
      // One group is not a comparison. If the chosen cut collapses to a single
      // bar, the other one at least says something.
      if (grouped.order.length < 2) {
        grouped = groupBy(scopedToDept ? "dept" : "subDept");
        primary = scopedToDept ? "dept" : "subDept";
      }
      var groupNoun = primary === "dept" ? "department" : "team";
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
              (rows.length === 1 ? "" : "s") + " across " + order.length + " " +
              groupNoun + (order.length === 1 ? "" : "s") + "</div></div>" +
        "</div>";

      return head + '<div class="ht-two">' +
        '<div class="ht-col"><div class="ht-col-title">By ' + groupNoun + "</div>" + bars + "</div>" +
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
  /* This panel had the right definition first; it now lives in
     shared/js/okr-math.js so the OKR page and the department pages compute the
     same figure rather than three near-copies of it. */
  function attainment(r) { return window.SS.okr.attainment(r); }

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
              var n = kr.rows.length;
              /* How many rows this key result averages, shown by the bar
                 rather than by a number beside the name.

                 It used to be a digit appended straight to the label — no
                 space, no style — so it read as part of the sentence
                 ("...professional development plans2") and, sitting inside a
                 two-line clamp, could be truncated away with the words. Moving
                 it into a chip fixed the collision but was still a number
                 stuck next to a sentence, saying nothing you could act on.

                 One segment per tracked row says the same thing without a
                 numeral, and says more: the segments carry each row's status,
                 so a key result at 82% made of one finished row and three
                 stalled ones no longer looks like four rows all at 82%. The
                 average stays on the right, where it always was.

                 Solid blocks rather than little part-filled bars. Filling each
                 segment to its own percentage worked at two or three rows and
                 turned to noise at twelve, where a partial fill inside an 8px
                 block reads as a smudge. A solid status colour is legible at
                 any count; the exact figure for a row is in its tooltip, and
                 the average is already on the right. */
              var segs = kr.rows.map(function (r) {
                var v = attainment(r);
                var st = String(r.status || "");
                var t = /complet/i.test(st) ? "is-good"
                      : /risk|behind|trouble/i.test(st) ? "is-risk"
                      : (v !== null && v >= 0.8 ? "is-good" : "is-mid");
                return '<span class="ht-kr-seg ' + t + '" title="' +
                  esc(r.subKeyResult || r.keyResult || "") +
                  " — " + (v === null ? "no progress recorded" : Math.round(v * 100) + "%") +
                  (st ? ", " + esc(st) : "") + '"></span>';
              }).join("");

              return '<div class="ht-kr">' +
                '<div class="ht-kr-name">' +
                  '<span class="ht-kr-text" title="' + esc(kr.name) + '">' + esc(kr.name) + "</span>" +
                "</div>" +
                '<div class="ht-kr-bar" title="' + n + " tracked row" + (n === 1 ? "" : "s") +
                  '" aria-label="' + n + " tracked row" + (n === 1 ? "" : "s") +
                  (kr.pct === null ? "" : ", averaging " + kr.pct + "%") + '">' + segs + "</div>" +
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

  var PANELS = { org: panelOrg, kpis: panelKpis, okrs: panelOkrs };

  /* ═══════════════ THE BOTTOM MENU ═══════════════
     Directory and Process Documentation, at the foot of the page.

     It lives here rather than in js/shared.js — where the rest of the hub's nav
     gating sits — for a concrete reason: the home page does not load
     shared.js. It carries its own inline theme and reveal code, and pulling
     shared.js in alongside would wire the theme toggle twice, so a click would
     toggle and toggle back.

     No access rule is duplicated by that. The rules themselves are
     SS.access.canSeeDirectory and SS.access.canUseProcesses(), which live in
     hub-access.js and are read by the top nav too — this only asks them.

     Links are REMOVED, not hidden. A hidden link is still in the DOM, still
     findable, and still announces that the thing exists; for access control the
     honest form is absence. If nothing survives, the strip goes with it rather
     than leaving a heading over an empty row. */
  function gateBottomMenu() {
    var nav = document.getElementById("homeBottomNav");
    if (!nav || !SS.access) return;
    var wrap = document.getElementById("homeBottomLinks");
    if (!wrap) return;

    function drop(need) {
      var el = wrap.querySelector('.home-bottom-link[data-need="' + need + '"]');
      if (el) el.remove();
    }

    var directoryOK = Promise.resolve(SS.access.ready)
      .then(function () { return !!SS.access.canSeeDirectory; })
      ["catch"](function () { return false; });

    var processesOK = (SS.access.canUseProcesses
      ? SS.access.canUseProcesses() : Promise.resolve(false))
      ["catch"](function () { return false; });

    // Both answers before anything is revealed, so the strip appears once in
    // its final shape rather than showing and then losing a link.
    Promise.all([directoryOK, processesOK]).then(function (ok) {
      if (!ok[0]) drop("directory");
      if (!ok[1]) drop("processes");
      if (wrap.querySelector(".home-bottom-link")) nav.hidden = false;
      else nav.remove();
    });
  }

  function start() {
    SS.gw.mount(".home-gw-grid", PANELS);
    gateBottomMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
