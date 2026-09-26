/* ═══════════════════════════════════════════════════════════════════════════
   "PROCESSES" — the one list for anyone who sees more than their own rows
   (2026-09-25; before this, admins had a separate "Review" section stacked
   under an often-empty "My Processes", and leaders had their own list).
   Someone with no reports and no review rights gets process-list.js's flat
   list instead, and this panel stays hidden.

   Two modes, never both for one person — hub_access.role is admin for one
   and staff/director for the other:

     review   role = admin (Directors are not reviewers of process
              documentation — the live RLS policy checks h.role = 'admin'
              specifically.) Rows: everything RLS returns (scope_department,
              or org-wide when null), Drafts included — the old Review
              section hid Drafts because the admin's own were listed
              separately under "My Processes"; merged into one list, that
              filter hid every Draft from admins entirely (2026-09-25).
              Rows open in the reviewer form (Review), except Drafts, which
              open in the steward form (Edit) — the reviewer form can only
              show a Draft read-only.
     team     PROC.hasTeam — anyone with reports. Rows: their reporting
              subtree's (created_by or steward_email in hub_subtree_emails()),
              Drafts included — fixing a report's process before it's
              submitted is the point (processes_update_team). Rows open in
              the steward form (Edit); process_guard() refuses a
              non-reviewer's move to Reviewed/Archived.

   Same pieces in both: Active/Archived tabs, stat tiles, Status filter, and a
   Steward dropdown (All / Me / each steward — the same list the create
   form's picker offers, so the two never disagree). The Department filter
   is for an org-wide admin only: a scoped PM's could only ever hold one
   value, and a leader's subtree already decides their rows. It's a UX
   narrowing on top of what RLS returned, not a second access boundary.

   The tiles partition the Active tab — Draft + Submitted + Reviewed always
   equals its total — with Waiting 7+ Days as a subset of Submitted, so the
   numbers visibly add up for every account, not just ones with no Drafts.

   Built for the eventual volume (200+ rows): summary counts, two tabs, a
   filter bar, and a days-waiting column so the oldest unresolved submissions
   don't get lost. No bulk actions — one process at a time is deliberate.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = window.SS;
  const PROC = window.PROC;
  const escapeHtml = SS.escapeHtml;

  // "Waiting" only means anything for a row still pending a first decision.
  const DECIDABLE = ["Submitted"];
  // Matches process-form.js's SETTABLE_STATUSES — a row opens with an
  // editable Status control (not just a read-only view) for any of these,
  // since a reviewer can move freely between Reviewed and Archived too.
  const EDITABLE = ["Submitted", "Reviewed", "Archived"];
  const WAITING_DAYS_WARN = 7;

  // What still needs eyes rises to the top; oldest within each bucket sorts
  // first, since that's the row that's been waiting longest.
  const PRIORITY = { "Submitted": 0, "Draft": 1, "Reviewed": 2, "Archived": 3 };

  const TABS = [
    { id: "active", label: "Active", statuses: ["Draft", "Submitted", "Reviewed"] },
    { id: "archived", label: "Archived", statuses: ["Archived"] },
  ];

  const state = { department: "", status: "", steward: "" };
  let TAB = "active";
  let filtersWired = false;
  let stewardOptionsBuilt = false;

  function myEmail() {
    return String(SS.access.email || "").toLowerCase();
  }

  /** "review" for an admin, "team" for anyone with reports, else null. */
  function mode() {
    if (PROC.isReviewer) return "review";
    if (PROC.hasTeam) return "team";
    return null;
  }

  function daysWaiting(r) {
    if (DECIDABLE.indexOf(r.status) === -1 || !r.updated_at) return null;
    return Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000);
  }

  /** Everything this panel lists before filters — see the header. */
  function panelRows() {
    if (mode() === "team") {
      return PROC.rows.filter((r) => PROC.inSubtree(r.created_by) || PROC.inSubtree(r.steward_email));
    }
    return PROC.rows;
  }

  function renderKpis(rows) {
    const target = document.getElementById("procReviewKpis");
    if (!target) return;
    const counts = {
      Draft: 0, Submitted: 0, Reviewed: 0,
      waiting: rows.filter((r) => r.status === "Submitted" && (daysWaiting(r) ?? 0) >= WAITING_DAYS_WARN).length,
    };
    rows.forEach((r) => { if (r.status in counts) counts[r.status]++; });

    const cards = [
      { label: "Draft", value: counts.Draft, color: "var(--text-dim)" },
      { label: "Submitted", value: counts.Submitted, color: "var(--proc-yellow)" },
      { label: "Reviewed", value: counts.Reviewed, color: "var(--proc-accent)" },
      { label: "Waiting 7+ Days", value: counts.waiting, color: "var(--proc-red)" },
    ];
    target.innerHTML = cards.map((c) => `
      <div class="proc-kpi-card" style="--proc-kpi-color: ${c.color};">
        <div class="proc-kpi-label">${escapeHtml(c.label)}</div>
        <div class="proc-kpi-value">${c.value}</div>
      </div>`).join("");
  }

  /** The Steward dropdown — built once, from the same list the create
   *  form's picker uses for this mode, so the two never disagree. */
  async function buildStewardOptions() {
    if (stewardOptionsBuilt) return;
    stewardOptionsBuilt = true;
    const select = document.getElementById("procFilterSteward");
    const me = myEmail();
    let stewards = [];
    try {
      stewards = mode() === "team"
        ? await PROC.stewardsInSubtree()
        : await PROC.stewardsInDepartment(PROC.reviewScopeDepartment);
    } catch {
      // "All Stewards" and "Me" still work without the list.
    }
    select.innerHTML =
      `<option value="">All Stewards</option>` +
      `<option value="${escapeHtml(me)}">Me</option>` +
      stewards
        .filter((s) => String(s.email || "").toLowerCase() !== me)
        .map((s) => `<option value="${escapeHtml(String(s.email).toLowerCase())}">${escapeHtml(s.full_name)}</option>`)
        .join("");
    select.value = state.steward;
  }

  function renderFilterOptions() {
    const deptSel = document.getElementById("procFilterDept");
    const statusSel = document.getElementById("procFilterStatus");

    document.getElementById("procFilterSteward").hidden = false;
    buildStewardOptions();

    if (mode() === "team" || PROC.reviewScopeDepartment) {
      deptSel.hidden = true;
    } else {
      deptSel.hidden = false;
      const depts = PROC.departments.map((d) => d.name);
      deptSel.innerHTML = `<option value="">All Departments</option>` +
        depts.map((d) => `<option value="${escapeHtml(d)}"${state.department === d ? " selected" : ""}>${escapeHtml(d)}</option>`).join("");
    }

    // The current tab decides what's worth filtering by — offering "Reviewed"
    // as a choice while looking at Archived would just be a dead option.
    const statuses = TABS.find((t) => t.id === TAB).statuses;
    if (statuses.length < 2) {
      statusSel.hidden = true;
    } else {
      statusSel.hidden = false;
      statusSel.innerHTML = `<option value="">All Statuses</option>` +
        statuses.map((s) => `<option value="${s}"${state.status === s ? " selected" : ""}>${s}</option>`).join("");
    }
  }

  function wireFilters() {
    if (filtersWired) return;
    filtersWired = true;
    document.getElementById("procFilterDept").addEventListener("change", (e) => {
      state.department = e.target.value; render();
    });
    document.getElementById("procFilterStatus").addEventListener("change", (e) => {
      state.status = e.target.value; render();
    });
    document.getElementById("procFilterSteward").addEventListener("change", (e) => {
      state.steward = e.target.value; render();
    });
    document.getElementById("procFilterClear").addEventListener("click", () => {
      state.department = ""; state.status = ""; state.steward = "";
      document.getElementById("procFilterSteward").value = "";
      render();
    });
    document.getElementById("procTabs").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tab]");
      if (!btn || btn.dataset.tab === TAB) return;
      TAB = btn.dataset.tab;
      state.status = ""; // last tab's status choice rarely applies to this one
      render();
    });
    // Both modes open the picker; it offers the admin's department (or
    // everyone) or the leader's subtree, plus "Me".
    const newBtn = document.getElementById("procReviewNewBtn");
    if (newBtn) newBtn.addEventListener("click", () => PROC.form.openCreateForSteward());
  }

  /** Department + steward filters, before the tab split — tab counts have to
   *  come from this, or each tab would report the number showing on the tab
   *  you are already looking at. */
  function afterFilters() {
    return panelRows().filter((r) => {
      if (state.department && r.department !== state.department) return false;
      if (state.steward && String(r.steward_email || "").toLowerCase() !== state.steward) return false;
      return true;
    });
  }

  function renderTabs(filtered) {
    const host = document.getElementById("procTabs");
    host.innerHTML = TABS.map((t) => {
      const n = filtered.filter((r) => t.statuses.indexOf(r.status) !== -1).length;
      const on = TAB === t.id;
      return `<button type="button" class="proc-tab${on ? " is-on" : ""}"
                role="tab" aria-selected="${on}" data-tab="${t.id}">
                <span class="proc-tab-l">${escapeHtml(t.label)}</span>
                <span class="proc-tab-n${n ? "" : " is-quiet"}">${n}</span>
              </button>`;
    }).join("");
  }

  /** Which form a row opens in, and the button's label for it. */
  function rowAction(r) {
    if (mode() === "team") return { label: "Edit", open: PROC.form.openEdit };
    if (r.status === "Draft") return { label: "Edit", open: PROC.form.openEdit };
    return EDITABLE.indexOf(r.status) !== -1
      ? { label: "Review", open: PROC.form.openReview }
      : { label: "View", open: PROC.form.openReview };
  }

  function render() {
    const panel = document.getElementById("procReview");
    if (!panel) return;

    const m = mode();
    if (!m) { panel.hidden = true; return; }
    panel.hidden = false;
    wireFilters();

    const scopeNote = document.getElementById("procReviewScope");
    scopeNote.textContent = m === "team"
      ? "Showing processes for you and everyone who reports to you."
      : PROC.reviewScopeDepartment
        ? "Showing processes in " + PROC.reviewScopeDepartment + "."
        : "Showing processes across every department.";

    // Every reviewer may create (processes_insert's admin branch). A leader
    // only if they're also a process steward — the insert requires it.
    const newBtn = document.getElementById("procReviewNewBtn");
    if (newBtn) newBtn.hidden = m === "team" && !PROC.isSteward;

    renderKpis(panelRows());

    const filtered = afterFilters();
    renderTabs(filtered);
    renderFilterOptions();
    document.getElementById("procFilterClear").disabled =
      !(state.department || state.status || state.steward);

    const tabStatuses = TABS.find((t) => t.id === TAB).statuses;
    const rows = filtered
      .filter((r) => tabStatuses.indexOf(r.status) !== -1)
      .filter((r) => !state.status || r.status === state.status)
      .sort((a, b) =>
        (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9) ||
        new Date(a.updated_at) - new Date(b.updated_at));

    const body = document.getElementById("procReviewBody");
    const count = document.getElementById("procReviewCount");
    const tabTotal = filtered.filter((r) => tabStatuses.indexOf(r.status) !== -1).length;
    count.textContent = rows.length + (rows.length === 1 ? " process" : " processes") +
      (rows.length !== tabTotal ? ` (of ${tabTotal})` : "");

    if (!rows.length) {
      const msg = tabTotal ? "Nothing matches these filters." : "Nothing here yet.";
      body.innerHTML = `<tr><td colspan="7"><div class="proc-empty">${msg}</div></td></tr>`;
      return;
    }

    body.innerHTML = rows.map((r) => {
      const waiting = daysWaiting(r);
      const waitingCell = waiting === null
        ? `<span class="proc-cell-dim">—</span>`
        : `<span class="proc-waiting${waiting >= WAITING_DAYS_WARN ? " proc-waiting-danger" : ""}">${waiting} ${waiting === 1 ? "day" : "days"}</span>`;
      return `
      <tr>
        <td class="proc-cell-name" data-label="Process">${escapeHtml(r.process_name)}</td>
        <td data-label="Steward">${escapeHtml(r.steward_name || r.created_by || "—")}</td>
        <td data-label="Department">${escapeHtml(r.department || "—")}</td>
        <td data-label="Status"><span class="proc-pill proc-pill-${PROC.statusTone(r.status)}">${escapeHtml(r.status)}</span></td>
        <td data-label="Waiting">${waitingCell}</td>
        <td class="proc-cell-dim" data-label="Updated">${PROC.formatDate(r.updated_at)}</td>
        <td class="proc-cell-action"><button type="button" class="proc-btn proc-btn-small" data-row="${r.id}">${rowAction(r).label}</button></td>
      </tr>`;
    }).join("");

    body.querySelectorAll("[data-row]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = PROC.rows.find((r) => String(r.id) === btn.dataset.row);
        if (row) rowAction(row).open(row);
      });
    });
  }

  document.addEventListener("proc:data", render);
  PROC.ready.then(render);
})();
