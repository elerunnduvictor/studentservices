/* ═══════════════════════════════════════════════════════════════════════════
   CAP WALKTHROUGH GUIDE

   Content lives in Postgres (cap_guide_sections / cap_guide_items), not in
   this file — RLS on those two tables is the actual access boundary (see
   supabase/cap-guide.sql), restricted to exactly: hub_access role='admin'
   (the VP and the 7 PMs), an FTE per employees.employment_type (matched by
   name against hub_access, since employees.email is empty for nearly every
   FTE row), and two named exceptions in hub_access (Jacob Walters, Jake
   McKay Shannon). Nobody else's session gets a single row back, not just a
   hidden UI — verified directly against the database, not assumed from the
   policy text.

   The gate below is the UX layer on top of that, mirroring
   processes/js/process-page.js's applyGate() shape: it hides the page for
   the "not even signed in" case before any query runs, and separately shows
   a plain "no access" state once the query comes back empty. Both exist only
   to avoid drawing a door that does not open — the real boundary already
   answered before either one runs.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var SS = window.SS;
  var escapeHtml = SS.escapeHtml;
  var TABS = [
    { id: "team_member", label: "Team Member" },
    { id: "leader", label: "Leader" },
  ];

  var state = { audience: null, sections: {}, loaded: false };

  function currentAudienceFromUrl() {
    var v = new URLSearchParams(location.search).get("view");
    return TABS.some(function (t) { return t.id === v; }) ? v : "team_member";
  }

  /* One inline link per item, at most — matches the source content, which
     never puts two links in the same line. If link_label appears verbatim in
     body (an inline mention like "the Bridge (/org-chart)"), it's replaced in
     place; otherwise the link is a trailing citation, appended in brackets
     the same way the source document itself writes them ("[Scribe: ...]"). */
  function renderBody(body, linkLabel, linkUrl) {
    var text = escapeHtml(body || "");
    if (!linkLabel || !linkUrl) return text;
    var anchor = '<a class="cap-guide-link" href="' + escapeHtml(linkUrl) + '" target="_blank" rel="noopener">' +
      escapeHtml(linkLabel) + "</a>";
    var needle = escapeHtml(linkLabel);
    if (body && body.indexOf(linkLabel) !== -1) {
      return text.split(needle).join(anchor);
    }
    var bracketed = '<a class="cap-guide-link" href="' + escapeHtml(linkUrl) + '" target="_blank" rel="noopener">[' +
      escapeHtml(linkLabel) + "]</a>";
    return text ? text + " " + bracketed : bracketed;
  }

  /** Groups consecutive list_item rows into <ul> blocks (nested one level by
   *  `indent`), interleaved with plain <p> paragraphs — the same shape the
   *  source Word doc used: numbered/lettered lists broken up by prose. */
  function renderItems(items) {
    var html = "";
    var i = 0;
    while (i < items.length) {
      var it = items[i];
      if (it.kind !== "list_item") {
        html += '<p class="cap-guide-p">' + renderBody(it.body, it.link_label, it.link_url) + "</p>";
        i++;
        continue;
      }
      // A run of list items, closing the run when indent drops back to 0 and
      // the next one is not itself part of the same list.
      var runIndent = it.indent || 0;
      var run = [];
      while (i < items.length && items[i].kind === "list_item" && (items[i].indent || 0) >= runIndent) {
        run.push(items[i]);
        i++;
      }
      html += renderList(run, runIndent);
    }
    return html;
  }

  function renderList(items, baseIndent) {
    var html = '<ul class="cap-guide-list' + (baseIndent > 0 ? " indent-1" : "") + '">';
    var i = 0;
    while (i < items.length) {
      var it = items[i];
      if ((it.indent || 0) > baseIndent) {
        // Shouldn't happen at position 0 of a run, but guard anyway.
        i++;
        continue;
      }
      var sub = [];
      var j = i + 1;
      while (j < items.length && (items[j].indent || 0) > baseIndent) { sub.push(items[j]); j++; }
      html += "<li>" + renderBody(it.body, it.link_label, it.link_url) +
        (sub.length ? renderList(sub, baseIndent + 1) : "") + "</li>";
      i = j;
    }
    return html + "</ul>";
  }

  function renderSection(section) {
    if (section.section_key === "links") {
      return '<div class="cap-guide-links-card">' + renderItems(section.items) + "</div>";
    }
    var html = '<div class="cap-guide-section">' +
      '<div class="cap-guide-section-title">' + escapeHtml(section.title) + "</div>";
    if (section.intro) html += '<div class="cap-guide-intro">' + escapeHtml(section.intro) + "</div>";
    html += renderItems(section.items);
    return html + "</div>";
  }

  function renderPurpose(sections) {
    var purpose = sections.filter(function (s) { return s.section_key === "purpose"; })[0];
    return purpose && purpose.intro ? '<div class="cap-guide-purpose">' + escapeHtml(purpose.intro) + "</div>" : "";
  }

  function render() {
    var body = document.getElementById("capGuideBody");
    var tabsEl = document.getElementById("capGuideTabs");
    if (!body || !tabsEl) return;

    tabsEl.innerHTML = TABS.map(function (t) {
      return '<button type="button" class="cap-tab' + (t.id === state.audience ? " is-on" : "") +
        '" data-view="' + t.id + '">' + escapeHtml(t.label) + "</button>";
    }).join("");
    tabsEl.querySelectorAll("[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var url = new URL(location.href);
        url.searchParams.set("view", btn.dataset.view);
        history.replaceState(null, "", url);
        state.audience = btn.dataset.view;
        render();
      });
    });

    var sections = state.sections[state.audience] || [];
    if (!sections.length) {
      body.innerHTML = '<div class="cap-guide-empty">Nothing here yet.</div>';
      return;
    }
    body.innerHTML = renderPurpose(sections) +
      sections
        .filter(function (s) { return s.section_key !== "purpose"; })
        .map(renderSection)
        .join("");
  }

  function showGate() {
    var gate = document.getElementById("capGate");
    var main = document.getElementById("capMain");
    if (gate) gate.hidden = false;
    if (main) main.hidden = true;
  }

  async function load() {
    try { await SS.access.ready; } catch { /* falls through to the gate below */ }

    var rows;
    try {
      rows = await SS.db.select("cap_guide_sections", {
        select: "id,audience,sort_order,section_key,title,intro",
        order: "audience.asc,sort_order.asc",
      });
    } catch {
      rows = [];
    }
    if (!rows.length) { showGate(); return; }

    var ids = rows.map(function (r) { return r.id; });
    var items = [];
    try {
      items = await SS.db.select("cap_guide_items", {
        select: "id,section_id,sort_order,indent,kind,body,link_label,link_url",
        order: "section_id.asc,sort_order.asc",
      });
    } catch { items = []; }

    var bySection = {};
    items.forEach(function (it) {
      (bySection[it.section_id] = bySection[it.section_id] || []).push(it);
    });
    rows.forEach(function (s) { s.items = bySection[s.id] || []; });

    state.sections = { team_member: [], leader: [] };
    rows.forEach(function (s) { state.sections[s.audience].push(s); });
    state.audience = currentAudienceFromUrl();
    state.loaded = true;

    document.getElementById("capLoading").hidden = true;
    document.getElementById("capGate").hidden = true;
    document.getElementById("capMain").hidden = false;
    render();
  }

  load();
})();
