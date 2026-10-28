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

   ── How rows become the page ──

   Sections by section_key: "timeline" is the strip at the top, "purpose" the
   introduction, "links" the reference links, and anything else (step0 ...
   step5) a step card. A title starting "Step N:" puts N in the card's badge;
   date_label is the chip beside it.

   Items by kind (supabase/cap-guide.sql and docs/sql/2026-10-28-cap-guide-
   round2.sql list them). An item owns the items after it with a deeper indent
   (a card's contents, an agenda line's sub-points), and consecutive items of
   the same kind are drawn together: a run of cards side by side, a run of
   tiles as a grid, a run of list items as one list.

   Every piece of database text goes through escapeHtml; the only markup in a
   body is [label](url), and a URL is only ever linked when it is http(s),
   mailto or a path on this site.

   The internal audience value "leader" is shown as "Supervisor" (direction
   from Ben Packer, 2026-10-28); the value itself, and ?view=leader, stay.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var SS = window.SS;
  var escapeHtml = SS.escapeHtml;
  var TABS = [
    { id: "team_member", label: "Team Member" },
    { id: "leader", label: "Supervisor" },
  ];

  var state = { audience: null, sections: {}, loaded: false };

  function currentAudienceFromUrl() {
    var v = new URLSearchParams(location.search).get("view");
    return TABS.some(function (t) { return t.id === v; }) ? v : "team_member";
  }

  /* ── Links ── */

  var DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="2" aria-hidden="true" focusable="false"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  var ARROW_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
    'stroke-width="2" aria-hidden="true" focusable="false"><path d="M7 17L17 7"/><polyline points="8 7 17 7 17 16"/></svg>';

  /** A URL this page will put in an href, or null. Paths on this site,
   *  http(s) and mailto only — nothing a typo or a paste could turn into
   *  script. */
  function safeUrl(url) {
    var u = String(url || "").trim();
    if (/^\/(?!\/)/.test(u) || /^https?:\/\//i.test(u) || /^mailto:/i.test(u)) return u;
    return null;
  }

  function anchor(label, url, cls) {
    var href = safeUrl(url);
    if (!href) return escapeHtml(label);
    var external = !/^\//.test(href);
    return '<a class="' + cls + '" href="' + escapeHtml(href) + '"' +
      (external ? ' target="_blank" rel="noopener"' : "") + ">" + escapeHtml(label) +
      (external ? '<span class="cap-sr"> (opens in a new tab)</span>' : "") + "</a>";
  }

  /** Body text with its [label](url) links, everything else escaped. */
  function inlineText(text) {
    var out = "", re = /\[([^\]]+)\]\(([^)\s]+)\)/g, last = 0, m;
    text = String(text || "");
    while ((m = re.exec(text))) {
      out += escapeHtml(text.slice(last, m.index)) + anchor(m[1], m[2], "cap-guide-link");
      last = re.lastIndex;
    }
    return out + escapeHtml(text.slice(last));
  }

  /* An item's text and its one link_label/link_url link. When the label is
     in the body, its first occurrence becomes the link ("Visit @work and ...
     navigate @work" links the first @work only, as the source does);
     otherwise the link is a button after the text (the Scribe walkthroughs). */
  function renderText(it) {
    var body = it.body || "";
    if (!it.link_label || !it.link_url) return inlineText(body);
    var at = body.indexOf(it.link_label);
    if (at !== -1) {
      return inlineText(body.slice(0, at)) + anchor(it.link_label, it.link_url, "cap-guide-link") +
        inlineText(body.slice(at + it.link_label.length));
    }
    return (body ? inlineText(body) + " " : "") +
      '<span class="cap-btn-wrap">' + anchor(it.link_label, it.link_url, "cap-btn") + "</span>";
  }

  /* A download item: link_label is the button, body a note under it. */
  function renderDownload(it) {
    var label = it.link_label || it.body || "";
    var url = it.link_url == null ? "" : String(it.link_url).trim();
    var note = it.link_label && it.body ? '<p class="cap-dl-note">' + inlineText(it.body) + "</p>" : "";
    var control;

    if (!url) {
      control = '<span class="cap-dl is-soon" aria-disabled="true">' + DOWNLOAD_ICON +
        "<span>" + escapeHtml(label) + ' <span class="cap-chip">Available soon</span></span></span>';
    } else if (/^cap-form:/i.test(url)) {
      var id = url.slice("cap-form:".length);
      control = window.CAPForms && window.CAPForms.has(id)
        ? '<button type="button" class="cap-dl" data-cap-form="' + escapeHtml(id) + '">' + DOWNLOAD_ICON +
          "<span>" + escapeHtml(label) + '</span></button><p class="cap-form-status" aria-live="polite"></p>'
        : '<span class="cap-dl-plain">' + escapeHtml(label) + "</span>";
    } else if (safeUrl(url)) {
      control = '<a class="cap-dl" href="' + escapeHtml(safeUrl(url)) + '" download>' + DOWNLOAD_ICON +
        "<span>" + escapeHtml(label) + '</span><span class="cap-sr"> (PDF)</span></a>';
    } else {
      control = '<span class="cap-dl-plain">' + escapeHtml(label) + "</span>";
    }
    return '<div class="cap-download">' + control + note + "</div>";
  }

  /* ── Items ── */

  /** Items as a tree: each one owns the items after it with a deeper indent. */
  function nest(items) {
    var nodes = [], i = 0;
    while (i < items.length) {
      var it = items[i], depth = it.indent || 0, kids = [], j = i + 1;
      while (j < items.length && (items[j].indent || 0) > depth) { kids.push(items[j]); j++; }
      nodes.push({ item: it, children: kids });
      i = j;
    }
    return nodes;
  }

  function children(node) {
    return node.children.length ? renderItems(node.children) : "";
  }

  function badge(it) {
    return it.title ? '<span class="cap-badge">' + escapeHtml(it.title) + "</span> " : "";
  }

  function paragraphs(text) {
    return String(text || "").split(/\n\s*\n/).map(function (p) {
      return '<p class="cap-guide-p">' + inlineText(p.trim()) + "</p>";
    }).join("");
  }

  var RUNS = {
    list_item: function (run) {
      return '<ul class="cap-guide-list">' + run.map(function (n) {
        return "<li>" + renderText(n.item) + children(n) + "</li>";
      }).join("") + "</ul>";
    },
    check_item: function (run) {
      return '<ul class="cap-checklist">' + run.map(function (n) {
        return "<li>" + renderText(n.item) + children(n) + "</li>";
      }).join("") + "</ul>";
    },
    numbered_item: function (run) {
      // With titles, the run is a set of numbered cards (the goal types).
      if (run.every(function (n) { return n.item.title; })) {
        return '<ol class="cap-numcards">' + run.map(function (n) {
          return '<li class="cap-numcard"><h4 class="cap-card-title">' + escapeHtml(n.item.title) + "</h4>" +
            (n.item.body ? '<p class="cap-guide-p">' + renderText(n.item) + "</p>" : "") + children(n) + "</li>";
        }).join("") + "</ol>";
      }
      return '<ol class="cap-numlist">' + run.map(function (n) {
        return "<li>" + badge(n.item) + renderText(n.item) + children(n) + "</li>";
      }).join("") + "</ol>";
    },
    card: function (run) {
      return '<div class="cap-cards">' + run.map(function (n) {
        return '<article class="cap-card">' +
          (n.item.title ? '<h4 class="cap-card-title">' + escapeHtml(n.item.title) + "</h4>" : "") +
          (n.item.body ? paragraphs(n.item.body) : "") + children(n) + "</article>";
      }).join("") + "</div>";
    },
    tile: function (run) {
      return '<div class="cap-tiles">' + run.map(function (n) {
        return '<div class="cap-tile">' +
          (n.item.title ? '<h5 class="cap-tile-title">' + escapeHtml(n.item.title) + "</h5>" : "") +
          (n.item.body ? '<p class="cap-tile-body">' + renderText(n.item) + "</p>" : "") + children(n) + "</div>";
      }).join("") + "</div>";
    },
    milestone: function (run) {
      return '<ol class="cap-timeline">' + run.map(function (n) {
        return '<li class="cap-milestone"><span class="cap-milestone-dot" aria-hidden="true"></span>' +
          '<span class="cap-milestone-when">' + escapeHtml(n.item.title || "") + "</span>" +
          '<span class="cap-milestone-what">' + renderText(n.item) + "</span></li>";
      }).join("") + "</ol>";
    },
  };

  function renderSingle(n) {
    var it = n.item;
    switch (it.kind) {
      case "heading":
        return '<h4 class="cap-subhead">' + escapeHtml(it.body || it.title || "") + "</h4>" + children(n);
      case "callout":
        return '<aside class="cap-callout' + (it.title ? " has-title" : "") + '">' +
          (it.title ? '<h4 class="cap-callout-title">' + escapeHtml(it.title) + "</h4>" : "") +
          paragraphs(it.body) + children(n) + "</aside>";
      case "download":
        return renderDownload(it) + children(n);
      default:   // paragraph, and any kind this page does not know yet
        return '<p class="cap-guide-p">' + badge(it) + renderText(it) + "</p>" + children(n);
    }
  }

  function renderItems(items) {
    var nodes = nest(items), html = "", i = 0;
    while (i < nodes.length) {
      var kind = nodes[i].item.kind;
      if (RUNS[kind]) {
        var run = [];
        while (i < nodes.length && nodes[i].item.kind === kind) { run.push(nodes[i]); i++; }
        html += RUNS[kind](run);
      } else {
        html += renderSingle(nodes[i]);
        i++;
      }
    }
    return html;
  }

  /* ── Sections ── */

  function renderTimeline(section) {
    return '<section class="cap-timeline-wrap" aria-labelledby="capTimelineTitle">' +
      '<h2 class="cap-eyebrow" id="capTimelineTitle">' + escapeHtml(section.title) + "</h2>" +
      renderItems(section.items) + "</section>";
  }

  function renderPurpose(section) {
    return '<div class="cap-purpose">' +
      '<h2 class="cap-purpose-title">' + escapeHtml(section.title) + "</h2>" +
      (section.intro ? '<p class="cap-purpose-text">' + inlineText(section.intro) + "</p>" : "") +
      renderItems(section.items) + "</div>";
  }

  function renderLinks(section) {
    return '<nav class="cap-links" aria-label="' + escapeHtml(section.title || "Links") + '">' +
      section.items.map(function (it) {
        var label = it.link_label || it.body || "";
        return safeUrl(it.link_url)
          ? '<a class="cap-link-card" href="' + escapeHtml(safeUrl(it.link_url)) + '"' +
            (/^\//.test(safeUrl(it.link_url)) ? "" : ' target="_blank" rel="noopener"') + ">" +
            "<span>" + escapeHtml(label) + "</span>" + ARROW_ICON + "</a>"
          : '<span class="cap-link-card is-plain">' + escapeHtml(label) + "</span>";
      }).join("") + "</nav>";
  }

  function renderStep(section) {
    var m = /^Step\s+(\d+)\s*:\s*(.*)$/i.exec(section.title || "");
    var id = "cap-" + section.audience + "-" + String(section.section_key).replace(/[^a-z0-9_-]/gi, "");
    return '<section class="cap-step" aria-labelledby="' + id + '">' +
      '<header class="cap-step-head">' +
      (m ? '<span class="cap-step-num" aria-hidden="true">' + escapeHtml(m[1]) + "</span>" : "") +
      '<div class="cap-step-heading">' +
      '<h3 class="cap-step-title" id="' + id + '">' +
      (m ? '<span class="cap-sr">Step ' + escapeHtml(m[1]) + ": </span>" + escapeHtml(m[2]) : escapeHtml(section.title)) +
      "</h3>" +
      (section.date_label ? '<span class="cap-date">' + escapeHtml(section.date_label) + "</span>" : "") +
      "</div></header>" +
      '<div class="cap-step-body">' +
      (section.intro ? '<p class="cap-guide-p">' + inlineText(section.intro) + "</p>" : "") +
      renderItems(section.items) + "</div></section>";
  }

  function renderSection(section) {
    switch (section.section_key) {
      case "timeline": return renderTimeline(section);
      case "purpose": return renderPurpose(section);
      case "links": return renderLinks(section);
      default: return renderStep(section);
    }
  }

  /* ── Tabs ── */

  function selectTab(audience, focus) {
    var url = new URL(location.href);
    url.searchParams.set("view", audience);
    history.replaceState(null, "", url);
    state.audience = audience;
    render();
    if (focus) {
      var tab = document.querySelector('#capGuideTabs [data-view="' + audience + '"]');
      if (tab) tab.focus();
    }
  }

  function renderTabs(tabsEl) {
    tabsEl.setAttribute("role", "tablist");
    tabsEl.setAttribute("aria-label", "Guide version");
    tabsEl.innerHTML = TABS.map(function (t) {
      var on = t.id === state.audience;
      return '<button type="button" role="tab" class="cap-tab' + (on ? " is-on" : "") + '" id="capTab-' + t.id +
        '" data-view="' + t.id + '" aria-selected="' + on + '" aria-controls="capGuideBody" tabindex="' +
        (on ? "0" : "-1") + '">' + escapeHtml(t.label) + "</button>";
    }).join("");
    tabsEl.querySelectorAll("[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () { selectTab(btn.dataset.view, false); });
      btn.addEventListener("keydown", function (e) {
        var i = TABS.findIndex(function (t) { return t.id === btn.dataset.view; });
        var next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 :
          e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : null;
        if (next == null) return;
        e.preventDefault();
        selectTab(TABS[(next + TABS.length) % TABS.length].id, true);
      });
    });
  }

  function render() {
    var body = document.getElementById("capGuideBody");
    var tabsEl = document.getElementById("capGuideTabs");
    if (!body || !tabsEl) return;

    renderTabs(tabsEl);
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", "capTab-" + state.audience);

    var sections = state.sections[state.audience] || [];
    if (!sections.length) {
      body.innerHTML = '<div class="cap-guide-empty">Nothing here yet.</div>';
      return;
    }
    body.innerHTML = sections.map(renderSection).join("");
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
        select: "id,audience,sort_order,section_key,title,intro,date_label",
        order: "audience.asc,sort_order.asc",
      });
    } catch {
      rows = [];
    }
    if (!rows.length) { showGate(); return; }

    var items = [];
    try {
      items = await SS.db.select("cap_guide_items", {
        select: "id,section_id,sort_order,indent,kind,title,body,link_label,link_url",
        order: "section_id.asc,sort_order.asc",
      });
    } catch { items = []; }

    var bySection = {};
    items.forEach(function (it) {
      (bySection[it.section_id] = bySection[it.section_id] || []).push(it);
    });
    rows.forEach(function (s) { s.items = bySection[s.id] || []; });

    state.sections = { team_member: [], leader: [] };
    rows.forEach(function (s) { if (state.sections[s.audience]) state.sections[s.audience].push(s); });
    state.audience = currentAudienceFromUrl();
    state.loaded = true;

    document.getElementById("capLoading").hidden = true;
    document.getElementById("capGate").hidden = true;
    document.getElementById("capMain").hidden = false;
    render();
  }

  load();
})();
