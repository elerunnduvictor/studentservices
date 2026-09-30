/* ═══════════════════════════════════════════════════════════════════════════
   PROJECT INVENTORY

   The status of other important projects: one row each in `projects`, kept
   current by the department's PM in the PM Hub's Projects workbook, read here
   by anyone the OKRs are read by. Row-level security decides who gets rows;
   this page decides nothing about access except whether to show the "Edit in
   the PM Hub" link, and that asks the same allowed_editors table the database
   does.

   What it adds to the design review's version, beyond the list and the panel:

     · a pulse — every active project as one bar split by status, in place of
       four count tiles the reader had to add up — whose segments are filters;
     · "Needs attention": Blocked, At Risk, past its target date, or an update
       older than a month. Worked out here against today, so a project that
       slips past its date shows up without anyone marking it;
     · target dates in words ("in 3 weeks", "12 days overdue"), and a panel
       timeline from start to target with today on it;
     · PM owner as a filter, stakeholders searchable, every column sortable,
       and a #p<id> link that opens straight onto one project.

   Plain status only — no percentages, as asked for in the review.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var SS = window.SS || {};
  var ROWS = Array.isArray(window.PROJECTS) ? window.PROJECTS.slice() : [];

  /* Order is the order a reader scans for trouble in: what is moving, what is
     wobbling, what has stopped, then what is parked, not begun, or done. Each
     has a glyph as well as a colour, so the status never rests on hue alone. */
  var STATUS = [
    { key: "On Track",    v: "--st-track",   g: "✓", rank: 3 },
    { key: "At Risk",     v: "--st-risk",    g: "!",      rank: 1 },
    { key: "Blocked",     v: "--st-blocked", g: "✕", rank: 0 },
    { key: "On Hold",     v: "--st-hold",    g: "‖", rank: 4 },
    { key: "Not Started", v: "--st-not",     g: "–", rank: 5 },
    { key: "Completed",   v: "--st-done",    g: "★", rank: 6 },
    { key: "Archived",    v: "--st-arch",    g: "▪", rank: 7 },
  ];
  var BY_STATUS = {};
  STATUS.forEach(function (s) { BY_STATUS[s.key] = s; });
  var ATTENTION = "__attention";
  var STALE_DAYS = 30;
  var SOON_DAYS = 14;
  var CLOSED = { "Completed": 1, "Archived": 1 };
  // Only a project that is meant to be moving can go quiet. One not yet begun,
  // on hold or finished has nothing new to say.
  var MOVING = { "On Track": 1, "At Risk": 1, "Blocked": 1 };

  var state = {
    tab: "active",
    q: "", dept: "", status: "", owner: "",
    sort: "target", dir: 1,
    open: null,          // id of the project in the panel
    returnFocus: null,
  };

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function clean(s) { return String(s == null ? "" : s).trim(); }

  /* ── dates ──────────────────────────────────────────────────────────────
     Stored as plain dates. Parsed as local midnight: new Date("2026-10-01")
     is UTC midnight, which is still the 30th of September in the Americas. */
  var DAY = 86400000;
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean(s));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function fmtDate(d, withYear) {
    if (!d) return "";
    var o = { month: "short", day: "numeric" };
    if (withYear || d.getFullYear() !== today().getFullYear()) o.year = "numeric";
    return d.toLocaleDateString(undefined, o);
  }
  function daysFrom(d) { return Math.round((d - today()) / DAY); }
  function span(n) {
    n = Math.abs(n);
    if (n < 14) return n + (n === 1 ? " day" : " days");
    if (n < 60) return Math.round(n / 7) + " weeks";
    var mo = Math.round(n / 30.4);
    return mo < 24 ? mo + " months" : Math.round(n / 365) + " years";
  }
  function ago(d) {
    var n = -daysFrom(d);
    if (n <= 0) return "Today";
    if (n === 1) return "Yesterday";
    return span(n) + " ago";
  }

  /* ── what each row means today ─────────────────────────────────────────── */
  function facts(p) {
    var target = parseDate(p.target_date);
    var start = parseDate(p.start_date);
    var updated = parseDate(p.update_date);
    var closed = !!CLOSED[p.status];
    var left = target ? daysFrom(target) : null;
    var late = !!target && !closed && left < 0;
    var soon = !!target && !closed && left >= 0 && left <= SOON_DAYS;
    var quietFor = updated ? -daysFrom(updated) : null;
    var stale = !!MOVING[p.status] && (quietFor === null || quietFor > STALE_DAYS);
    var why = [];
    if (p.status === "Blocked") why.push("Blocked");
    if (late) why.push(span(left) + " past its target date");
    if (p.status === "At Risk") why.push("At risk");
    if (stale) why.push(updated ? "No update in " + span(quietFor) : "No update recorded yet");
    return { target: target, start: start, updated: updated, left: left,
             late: late, soon: soon, stale: stale, why: why };
  }
  // Most urgent first: stopped, then overdue, then wobbling, then quiet.
  function urgency(p, f) {
    return (p.status === "Blocked" ? 0 : f.late ? 1 : p.status === "At Risk" ? 2 : 3) * 10000 +
           (f.left == null ? 5000 : Math.max(-4999, Math.min(4999, f.left)));
  }

  function deptColour(d) {
    var c = window.DEPT_COLORS && window.DEPT_COLORS[d];
    return c ? c.bg : "";
  }
  function pill(status) {
    var s = BY_STATUS[status] || BY_STATUS["Not Started"];
    return '<span class="pi-pill" style="--c:var(' + s.v + ')"><i aria-hidden="true">' + s.g + "</i>" +
           esc(status || "Not Started") + "</span>";
  }
  function dot(d) {
    var c = deptColour(d);
    return '<span class="pi-dot"' + (c ? ' style="--c:' + c + '"' : "") + ' aria-hidden="true"></span>';
  }

  /* ── what is showing ─────────────────────────────────────────────────── */
  function inTab(p) { return state.tab === "archived" ? p.status === "Archived" : p.status !== "Archived"; }
  function haystack(p) {
    return [p.title, p.pm_owner, p.stakeholders, p.department, p.description, p.latest_update]
      .map(clean).join(" • ").toLowerCase();
  }
  function visible() {
    var q = state.q.toLowerCase();
    return ROWS.filter(function (p) {
      if (!inTab(p)) return false;
      if (state.dept && clean(p.department) !== state.dept) return false;
      if (state.owner && clean(p.pm_owner) !== state.owner) return false;
      if (state.status === ATTENTION) { if (!facts(p).why.length) return false; }
      else if (state.status && p.status !== state.status) return false;
      if (q && haystack(p).indexOf(q) === -1) return false;
      return true;
    });
  }

  var SORTS = {
    title:  function (p) { return clean(p.title).toLowerCase(); },
    dept:   function (p) { return clean(p.department).toLowerCase() || "￿"; },
    owner:  function (p) { return clean(p.pm_owner).toLowerCase() || "￿"; },
    status: function (p) { return (BY_STATUS[p.status] || { rank: 9 }).rank; },
    // No date sorts last whichever way round; done work sinks below live work
    // so "soonest due" means soonest due among things still being done.
    target: function (p) {
      var t = parseDate(p.target_date);
      return (CLOSED[p.status] ? 2 : 0) * 1e13 + (t ? t.getTime() : 1e13 - 1);
    },
    updated: function (p) { var u = parseDate(p.update_date); return u ? -u.getTime() : Infinity; },
  };
  function sorted(list) {
    var key = SORTS[state.sort] || SORTS.target;
    return list.slice().sort(function (a, b) {
      var x = key(a), y = key(b);
      if (x < y) return -state.dir;
      if (x > y) return state.dir;
      return (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id;
    });
  }

  /* ══ THE PULSE ═══════════════════════════════════════════════════════════ */
  function renderPulse() {
    var host = $("piPulse");
    var active = ROWS.filter(function (p) { return p.status !== "Archived"; });
    if (!active.length) { host.hidden = true; return; }
    var counts = {};
    active.forEach(function (p) { counts[p.status] = (counts[p.status] || 0) + 1; });
    var shown = STATUS.filter(function (s) { return counts[s.key]; });
    var late = 0, quiet = 0;
    active.forEach(function (p) { var f = facts(p); if (f.late) late++; if (f.stale) quiet++; });
    var flags = [];
    if (late) flags.push(late + " past " + (late === 1 ? "its" : "their") + " target date");
    if (quiet) flags.push(quiet + " not updated in over a month");
    var pick = state.tab === "active" && state.status && state.status !== ATTENTION ? state.status : "";

    host.innerHTML =
      '<div class="pi-pulse-head">' +
        '<span class="pi-pulse-n">' + active.length + "</span>" +
        '<span class="pi-pulse-l">active project' + (active.length === 1 ? "" : "s") + "</span>" +
        (flags.length ? '<span class="pi-pulse-flag">⚠ ' + esc(flags.join(" · ")) + "</span>" : "") +
      "</div>" +
      '<div class="pi-pulse-bar' + (pick ? " has-pick" : "") + '">' +
        shown.map(function (s) {
          return '<button type="button" class="pi-pulse-seg' + (pick === s.key ? " is-on" : "") + '" data-status="' + esc(s.key) +
                 '" style="flex:' + counts[s.key] + ";--c:var(" + s.v + ')" title="' + esc(s.key) + ": " + counts[s.key] +
                 '" aria-label="Show ' + esc(s.key) + " (" + counts[s.key] + ')"></button>';
        }).join("") +
      "</div>" +
      '<div class="pi-pulse-legend">' +
        shown.map(function (s) {
          return '<button type="button" class="pi-leg' + (pick === s.key ? " is-on" : "") + '" data-status="' + esc(s.key) +
                 '" aria-pressed="' + (pick === s.key) + '"><span class="pi-leg-dot" style="--c:var(' + s.v + ')" aria-hidden="true">' +
                 s.g + "</span>" + esc(s.key) + " <b>" + counts[s.key] + "</b></button>";
        }).join("") +
      "</div>";
    host.hidden = false;
  }

  /* ══ NEEDS ATTENTION ═════════════════════════════════════════════════════
     The first thing on the page when there is anything in it, and nothing at
     all when there is not — an empty "all clear" box is one more thing to
     read. Six at most; the rest are one click away through the filter. */
  var ATTN_MAX = 6;
  // The pill already says Blocked or At Risk; the line under it says what the
  // pill cannot — how late, how quiet — or, failing that, the latest update.
  function attnWhy(p, f) {
    var extra = f.why.filter(function (w) { return w !== "Blocked" && w !== "At risk"; });
    return extra.length ? extra.join(" · ") : (clean(p.latest_update) || p.status);
  }
  function renderAttention() {
    var host = $("piAttn");
    if (state.tab !== "active") { host.hidden = true; return; }
    var list = ROWS.filter(function (p) { return p.status !== "Archived"; })
      .map(function (p) { return { p: p, f: facts(p) }; })
      .filter(function (x) { return x.f.why.length; })
      .sort(function (a, b) { return urgency(a.p, a.f) - urgency(b.p, b.f); });
    if (!list.length) { host.hidden = true; return; }
    $("piAttnCount").innerHTML = list.length > ATTN_MAX
      ? "Showing the " + ATTN_MAX + " most urgent of " + list.length + ' · <button type="button" class="pi-clear" data-attn-all>See all ' + list.length + "</button>"
      : list.length + (list.length === 1 ? " project" : " projects");
    $("piAttnList").innerHTML = list.slice(0, ATTN_MAX).map(function (x) {
      var s = BY_STATUS[x.p.status] || BY_STATUS["Not Started"];
      var c = x.p.status === "Blocked" || x.f.late ? "var(--st-blocked)" : "var(" + s.v + ")";
      return '<button type="button" class="pi-attn-card" data-open="' + x.p.id + '" style="--c:' + c + '">' +
               pill(x.p.status) +
               '<div class="pi-attn-name">' + esc(x.p.title) + "</div>" +
               '<div class="pi-attn-why">' + esc(attnWhy(x.p, x.f)) +
                 (clean(x.p.pm_owner) ? " — " + esc(x.p.pm_owner) : "") + "</div>" +
             "</button>";
    }).join("");
    host.hidden = false;
  }

  /* ══ FILTERS ═════════════════════════════════════════════════════════════
     Built from what is in the current tab, so no option leads to nothing. A
     choice that no longer exists after a tab switch is dropped rather than
     leaving the reader filtered by something they cannot see. */
  function fillSelect(el, first, values, current, labels) {
    el.innerHTML = '<option value="">' + esc(first) + "</option>" + values.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === current ? " selected" : "") + ">" +
             esc(labels && labels[v] || v) + "</option>";
    }).join("");
  }
  function renderFilters() {
    var here = ROWS.filter(inTab);
    var uniq = function (f) {
      var seen = {};
      here.forEach(function (p) { var v = clean(f(p)); if (v) seen[v] = 1; });
      return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b); });
    };
    var depts = uniq(function (p) { return p.department; });
    var owners = uniq(function (p) { return p.pm_owner; });
    var statuses = STATUS.map(function (s) { return s.key; })
      .filter(function (k) { return here.some(function (p) { return p.status === k; }); });
    var anyAttn = state.tab === "active" && here.some(function (p) { return facts(p).why.length; });
    if (anyAttn) statuses.unshift(ATTENTION);

    if (depts.indexOf(state.dept) === -1) state.dept = "";
    if (owners.indexOf(state.owner) === -1) state.owner = "";
    if (statuses.indexOf(state.status) === -1) state.status = "";

    fillSelect($("piDept"), "All departments", depts, state.dept);
    fillSelect($("piOwner"), "All PM owners", owners, state.owner);
    var labels = {}; labels[ATTENTION] = "⚠ Needs attention";
    fillSelect($("piStatus"), "All statuses", statuses, state.status, labels);
    $("piCountActive").textContent = ROWS.filter(function (p) { return p.status !== "Archived"; }).length;
    $("piCountArchived").textContent = ROWS.filter(function (p) { return p.status === "Archived"; }).length;
  }

  /* ══ THE LIST ════════════════════════════════════════════════════════════ */
  var COLS = [
    { key: "title", label: "Project" }, { key: "dept", label: "Department" },
    { key: "owner", label: "PM Owner" }, { key: "status", label: "Status" },
    { key: "target", label: "Target" }, { key: "updated", label: "Updated" },
  ];
  function row(p) {
    var f = facts(p);
    var when;
    if (!f.target) when = '<span class="pi-none">No date yet</span>';
    else if (CLOSED[p.status]) when = fmtDate(f.target, true);
    else if (f.late) when = fmtDate(f.target) + '<small class="is-late">' + span(f.left) + " overdue</small>";
    else if (f.soon) when = fmtDate(f.target) + '<small class="is-soon">' + (f.left === 0 ? "Due today" : "in " + span(f.left)) + "</small>";
    else when = fmtDate(f.target) + "<small>in " + span(f.left) + "</small>";
    var fresh = f.updated
      ? '<span class="pi-fresh' + (f.stale ? " is-stale" : "") + '" title="' + esc(fmtDate(f.updated, true)) + '">' + ago(f.updated) + "</span>"
      : '<span class="pi-none">—</span>';
    var blurb = clean(p.latest_update) || clean(p.description);
    return '<button type="button" class="pi-row' + (state.open === p.id ? " is-open" : "") + '" data-open="' + p.id + '">' +
      '<div><div class="pi-title">' + esc(p.title) + "</div>" +
        (blurb ? '<div class="pi-blurb">' + esc(blurb) + "</div>" : "") + "</div>" +
      '<div class="pi-dept" title="' + esc(p.department) + '">' +
        (clean(p.department) ? dot(p.department) + "<span>" + esc(p.department) + "</span>" : '<span class="pi-none">No department</span>') + "</div>" +
      '<div class="pi-owner">' + (clean(p.pm_owner) ? esc(p.pm_owner) : '<span class="pi-none">Unassigned</span>') + "</div>" +
      "<div>" + pill(p.status) + "</div>" +
      '<div class="pi-when">' + when + "</div>" +
      "<div>" + fresh + "</div>" +
    "</button>";
  }

  function renderList() {
    var list = sorted(visible());
    var host = $("piList");
    var filtered = !!(state.q || state.dept || state.status || state.owner);

    var note = $("piFilterNote");
    if (filtered) {
      var total = ROWS.filter(inTab).length;
      note.innerHTML = "Showing " + list.length + " of " + total + " " + (state.tab === "archived" ? "archived" : "active") +
        " project" + (total === 1 ? "" : "s") + ' <button type="button" class="pi-clear" data-clear>Clear filters</button>';
      note.hidden = false;
    } else note.hidden = true;

    if (!ROWS.length) { host.innerHTML = emptyAll(); return; }
    if (!list.length) {
      host.innerHTML = '<div class="pi-empty"><div class="pi-empty-ico">' + ICON_SEARCH + "</div>" +
        (filtered
          ? "<h3>No projects match</h3><p>Nothing in this tab fits those filters.</p>" +
            '<p style="margin-top:12px"><button type="button" class="pi-clear" data-clear>Clear filters</button></p>'
          : state.tab === "archived"
            ? "<h3>Nothing archived yet</h3><p>A project set to Archived in the PM Hub moves here, out of the way but still on record.</p>"
            : "<h3>No active projects</h3><p>Every project on record has been archived.</p>") +
        "</div>";
      return;
    }
    host.innerHTML =
      '<div class="pi-thead" role="row">' + COLS.map(function (c) {
        var on = state.sort === c.key;
        return '<button type="button" class="pi-sort' + (on ? " is-on" : "") + '" data-sort="' + c.key + '"' +
               (on ? ' aria-sort="' + (state.dir > 0 ? "ascending" : "descending") + '"' : "") + ">" + c.label +
               '<span class="arr" aria-hidden="true">' + (on && state.dir < 0 ? "▾" : "▴") + "</span></button>";
      }).join("") + "</div>" +
      list.map(row).join("");
  }

  var ICON_SEARCH = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';
  var ICON_BOARD = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h4M8 17h7"/></svg>';
  function emptyAll() {
    return '<div class="pi-empty"><div class="pi-empty-ico">' + ICON_BOARD + "</div>" +
      "<h3>No projects yet</h3>" +
      (editor
        ? "<p>Projects are added in the PM Hub's Projects workbook. Each one you add appears here straight away.</p>" +
          '<a class="pi-edit" href="' + esc(PM_PROJECTS) + '">Add the first project</a>'
        : "<p>Once the project managers add projects in the PM Hub, each one will appear here with its status, owner and target date.</p>") +
      "</div>";
  }

  /* ══ THE PANEL ═══════════════════════════════════════════════════════════ */
  function timeline(p, f) {
    if (!f.start && !f.target) return "";
    var ends = '<div class="pi-time-ends"><div>Start<b>' + (f.start ? fmtDate(f.start, true) : "—") + "</b></div>" +
               "<div>Target<b>" + (f.target ? fmtDate(f.target, true) : "Not set") + "</b></div></div>";
    var bar = "";
    if (f.start && f.target && f.target > f.start) {
      var t = today();
      var pct = Math.max(0, Math.min(100, (t - f.start) / (f.target - f.start) * 100));
      var showToday = !CLOSED[p.status] && t >= f.start;
      bar = '<div class="pi-time-track' + (f.late ? " is-late" : "") + '">' +
              '<div class="pi-time-fill" style="width:' + (CLOSED[p.status] ? 100 : pct) + '%"></div>' +
              (showToday ? '<span class="pi-time-today" style="left:' + pct + '%">Today</span>' : "") +
            "</div>";
    }
    var note = "";
    if (f.target && !CLOSED[p.status]) {
      note = f.late ? '<div class="pi-time-note is-late">' + span(f.left) + " past the target date</div>"
           : '<div class="pi-time-note">' + (f.left === 0 ? "Due today" : span(f.left) + " to go") + "</div>";
    } else if (f.start && !f.target) {
      note = '<div class="pi-time-note">Started ' + ago(f.start).toLowerCase() + " · no target date yet</div>";
    }
    return '<div class="pi-sec"><div class="pi-sec-label">Timeline</div><div class="pi-time">' + bar + ends + note + "</div></div>";
  }

  function panelHtml(p) {
    var f = facts(p);
    var people = clean(p.stakeholders).split(/\s*[,;]\s*/).filter(Boolean);
    var update = clean(p.latest_update);
    return (
      '<div class="pi-panel-top">' +
        '<button type="button" class="pi-panel-close" data-close aria-label="Close">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>' +
        (clean(p.department) ? '<div class="pi-panel-dept">' + dot(p.department) + esc(p.department) + "</div>" : "") +
        '<h2 id="piPanelTitle">' + esc(p.title) + "</h2>" +
        pill(p.status) +
      "</div>" +
      '<div class="pi-panel-body">' +
        '<div class="pi-sec"><div class="pi-sec-label">Latest update</div>' +
          (update
            ? '<div class="pi-update' + (f.stale ? " is-stale" : "") + '"><p>' + esc(update) + "</p>" +
                (f.updated ? '<div class="pi-update-when">' + (f.stale ? "⚠ " : "") + "Written " + ago(f.updated).toLowerCase() +
                  " · " + fmtDate(f.updated, true) + "</div>" : "") + "</div>"
            : '<p class="pi-none">No update written yet.</p>') +
        "</div>" +
        (clean(p.description) ? '<div class="pi-sec"><div class="pi-sec-label">About this project</div><p>' + esc(p.description) + "</p></div>" : "") +
        timeline(p, f) +
        '<div class="pi-sec"><dl class="pi-facts">' +
          '<div class="pi-fact"><dt>PM Owner</dt><dd>' + (clean(p.pm_owner) ? esc(p.pm_owner) : '<span class="pi-none">Unassigned</span>') + "</dd></div>" +
          '<div class="pi-fact"><dt>Department</dt><dd>' + (clean(p.department) ? esc(p.department) : '<span class="pi-none">None</span>') + "</dd></div>" +
        "</dl></div>" +
        (people.length ? '<div class="pi-sec"><div class="pi-sec-label">Stakeholders</div><div class="pi-chips">' +
          people.map(function (s) { return '<span class="pi-chip">' + esc(s) + "</span>"; }).join("") + "</div></div>" : "") +
      "</div>" +
      '<div class="pi-panel-foot"><span>' +
        (p.updated_at ? "Record last changed " + esc(fmtDate(new Date(p.updated_at), true)) : "") + "</span>" +
        (editor ? '<a class="pi-edit" href="' + esc(PM_PROJECTS) + '">Edit this project</a>' : "") +
      "</div>"
    );
  }

  function openPanel(id, fromEl) {
    var p = ROWS.filter(function (r) { return String(r.id) === String(id); })[0];
    if (!p) return;
    state.open = p.id;
    state.returnFocus = fromEl || document.activeElement;
    var panel = $("piPanel");
    panel.innerHTML = panelHtml(p);
    panel.classList.add("is-open");
    $("piScrim").classList.add("is-open");
    document.body.classList.add("pi-locked");
    markOpenRow();
    try { history.replaceState(null, "", "#p" + p.id); } catch (e) { /* file:// */ }
    setTimeout(function () { panel.focus(); }, 30);
  }
  function closePanel() {
    if (state.open == null) return;
    state.open = null;
    $("piPanel").classList.remove("is-open");
    $("piScrim").classList.remove("is-open");
    document.body.classList.remove("pi-locked");
    markOpenRow();
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* file:// */ }
    var back = state.returnFocus;
    if (back && document.body.contains(back)) back.focus();
  }
  function markOpenRow() {
    document.querySelectorAll(".pi-row").forEach(function (r) {
      r.classList.toggle("is-open", String(r.dataset.open) === String(state.open));
    });
  }

  /* ══ WIRING ══════════════════════════════════════════════════════════════ */
  function render() {
    renderFilters();
    renderPulse();
    renderAttention();
    renderList();
  }
  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".pi-tab").forEach(function (b) {
      var on = b.dataset.tab === tab;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    render();
  }
  function clearFilters() {
    state.q = state.dept = state.status = state.owner = "";
    $("piSearch").value = "";
    render();
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var seg = t.closest("[data-status]");
    if (seg && seg.closest("#piPulse")) {
      var k = seg.dataset.status;
      if (state.tab !== "active") state.tab = "active";
      state.status = state.status === k ? "" : k;
      setTab("active");
      document.querySelector(".pi-board").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (t.closest("[data-attn-all]")) {
      state.status = ATTENTION; setTab("active");
      document.querySelector(".pi-board").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    var opener = t.closest("[data-open]");
    if (opener) { openPanel(opener.dataset.open, opener); return; }
    if (t.closest("[data-close]") || t.id === "piScrim") { closePanel(); return; }
    if (t.closest("[data-clear]")) { clearFilters(); return; }
    var tab = t.closest(".pi-tab");
    if (tab) { setTab(tab.dataset.tab); return; }
    var sort = t.closest("[data-sort]");
    if (sort) {
      var key = sort.dataset.sort;
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = 1; }
      renderList();
      var again = document.querySelector('[data-sort="' + key + '"]');
      if (again) again.focus();
    }
  });

  var typing;
  $("piSearch").addEventListener("input", function (e) {
    clearTimeout(typing);
    typing = setTimeout(function () { state.q = e.target.value.trim(); renderList(); }, 120);
  });
  $("piDept").addEventListener("change", function (e) { state.dept = e.target.value; render(); });
  $("piOwner").addEventListener("change", function (e) { state.owner = e.target.value; render(); });
  $("piStatus").addEventListener("change", function (e) { state.status = e.target.value; render(); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state.open != null) { e.preventDefault(); closePanel(); return; }
    // Keep Tab inside the open panel — it is modal, and the page behind it is
    // under a scrim.
    if (e.key === "Tab" && state.open != null) {
      var panel = $("piPanel");
      var f = panel.querySelectorAll("button, a[href]");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ── who may edit ────────────────────────────────────────────────────────
     The same question the PM Hub asks, of the same table row-level security
     consults. It only decides whether a link is shown: a reader who is not an
     editor and finds the PM Hub anyway is refused by the database.

     Where the link goes. The PM Hub is the same deployment served on its own
     host, and vercel.json sends /pm/* on this host back to the home page — so
     a plain /pm/projects.html link lands on the Bridge, which is the bug this
     replaced (2026-09-30). On the live site the Projects workbook is
     /projects on the PM Hub's host; running locally there is only one host,
     and /pm/projects.html is right.

     shared/js/config.js keeps the PM Hub's address out of the hub on purpose
     ("the hub never links to it"). This is the one exception, and it is kept
     narrow: the address is only put into a link after the reader has been
     confirmed as an editor, who already goes there. */
  var PM_HOST = "https://studentservicespm.vercel.app";
  var PM_PROJECTS = /\.vercel\.app$/.test(location.hostname) ? PM_HOST + "/projects" : "/pm/projects.html";
  var editor = false;
  function checkEditor() {
    var a = SS.access || {};
    return Promise.resolve(a.ready).then(function () {
      if (!a.email || !SS.db || a.isPartner) return false;
      return SS.db.select("allowed_editors", {
        select: "email", filter: { email: "ilike." + a.email }, limit: 1,
      }).then(function (rows) { return rows.length > 0; });
    })["catch"](function () { return false; });
  }

  render();
  var m = /^#p(\d+)$/.exec(location.hash);
  if (m) {
    var target = ROWS.filter(function (r) { return String(r.id) === m[1]; })[0];
    if (target) { if (target.status === "Archived") setTab("archived"); openPanel(m[1]); }
  }
  checkEditor().then(function (ok) {
    editor = ok;
    if (ok) $("piEdit").href = PM_PROJECTS;
    $("piEdit").hidden = !ok;
    if (!ROWS.length) renderList();
    // Redraw an already-open panel so it gains its edit link, without moving
    // the reader's focus.
    if (state.open != null) {
      var p = ROWS.filter(function (r) { return r.id === state.open; })[0];
      if (p) $("piPanel").innerHTML = panelHtml(p);
    }
  });
})();
