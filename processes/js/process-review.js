/* ═══════════════════════════════════════════════════════════════════════════
   "REVIEW" — renders only for hub_access role = admin. Directors are not
   reviewers of process documentation (verified against the live RLS policy,
   which checks h.role = 'admin' specifically).

   scope_department set means that department only; null means everything —
   which is already how RLS filtered the rows this panel reads, so the
   department filter below is a UX narrowing on top of an already-narrowed
   set, not a second access boundary. It's hidden entirely for a scoped PM,
   since for them it can only ever have one useful value.

   Built for the eventual volume (200+ rows) this panel is meant to carry:
   summary counts, a filter bar, and a days-waiting column so the oldest
   unresolved submissions don't get lost in a plain chronological list. No
   bulk actions — reviewing one process at a time is deliberate, not a gap.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = window.SS;
  const PROC = window.PROC;
  const escapeHtml = SS.escapeHtml;

  // Matches process-form.js's DECIDABLE_STATUSES — a row only opens the
  // editable status/note form while a decision is actually pending.
  const DECIDABLE = ["Submitted", "Needs Changes"];
  const ALL_STATUSES = ["Draft", "Submitted", "Needs Changes", "Reviewed", "Archived"];
  const WAITING_DAYS_WARN = 7;

  // Newest activity that still needs eyes rises to the top; oldest within
  // that bucket sorts first, since that's the row that's been waiting longest.
  const PRIORITY = { "Submitted": 0, "Needs Changes": 1, "Draft": 2, "Reviewed": 3, "Archived": 4 };

  const state = { department: "", status: "", steward: "" };
  let filtersWired = false;

  function daysWaiting(r) {
    if (DECIDABLE.indexOf(r.status) === -1 || !r.updated_at) return null;
    return Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000);
  }

  function renderKpis(rows) {
    const target = document.getElementById("procReviewKpis");
    if (!target) return;
    const counts = {
      Submitted: 0, "Needs Changes": 0, Reviewed: 0,
      waiting: rows.filter((r) => r.status === "Submitted" && (daysWaiting(r) ?? 0) >= WAITING_DAYS_WARN).length,
    };
    rows.forEach((r) => { if (r.status in counts) counts[r.status]++; });

    const cards = [
      { label: "Submitted", value: counts.Submitted, color: "var(--proc-yellow)" },
      { label: "Needs Changes", value: counts["Needs Changes"], color: "var(--proc-red)" },
      { label: "Reviewed", value: counts.Reviewed, color: "var(--proc-accent)" },
      { label: "Waiting 7+ Days", value: counts.waiting, color: "var(--proc-red)" },
    ];
    target.innerHTML = cards.map((c) => `
      <div class="proc-kpi-card" style="--proc-kpi-color: ${c.color};">
        <div class="proc-kpi-label">${escapeHtml(c.label)}</div>
        <div class="proc-kpi-value">${c.value}</div>
      </div>`).join("");
  }

  function renderFilterOptions() {
    const deptSel = document.getElementById("procFilterDept");
    const statusSel = document.getElementById("procFilterStatus");

    // A scoped PM's department filter can only ever equal their one scope —
    // showing it would be a dropdown with nothing to choose. Only an
    // org-wide admin (null scope) gets it.
    if (PROC.reviewScopeDepartment) {
      deptSel.hidden = true;
    } else {
      deptSel.hidden = false;
      const depts = PROC.departments.map((d) => d.name);
      deptSel.innerHTML = `<option value="">All Departments</option>` +
        depts.map((d) => `<option value="${escapeHtml(d)}"${state.department === d ? " selected" : ""}>${escapeHtml(d)}</option>`).join("");
    }

    statusSel.innerHTML = `<option value="">All Statuses</option>` +
      ALL_STATUSES.map((s) => `<option value="${s}"${state.status === s ? " selected" : ""}>${s}</option>`).join("");
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
    document.getElementById("procFilterSteward").addEventListener("input", (e) => {
      state.steward = e.target.value; render();
    });
    document.getElementById("procFilterClear").addEventListener("click", () => {
      state.department = ""; state.status = ""; state.steward = "";
      document.getElementById("procFilterSteward").value = "";
      render();
    });
  }

  function getFiltered() {
    const q = state.steward.trim().toLowerCase();
    return PROC.rows.filter((r) => {
      if (state.department && r.department !== state.department) return false;
      if (state.status && r.status !== state.status) return false;
      if (q && !String(r.steward_name || r.created_by || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function render() {
    const panel = document.getElementById("procReview");
    if (!panel) return;

    if (!PROC.isReviewer) { panel.hidden = true; return; }
    panel.hidden = false;
    wireFilters();

    const scopeNote = document.getElementById("procReviewScope");
    scopeNote.textContent = PROC.reviewScopeDepartment
      ? "Showing processes in " + PROC.reviewScopeDepartment + "."
      : "Showing processes across every department.";

    renderKpis(PROC.rows);
    renderFilterOptions();
    document.getElementById("procFilterClear").disabled =
      !(state.department || state.status || state.steward);

    const rows = getFiltered().sort((a, b) =>
      (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9) ||
      new Date(a.updated_at) - new Date(b.updated_at));

    const body = document.getElementById("procReviewBody");
    const count = document.getElementById("procReviewCount");
    count.textContent = rows.length + (rows.length === 1 ? " process" : " processes") +
      (rows.length !== PROC.rows.length ? ` (of ${PROC.rows.length})` : "");

    if (!rows.length) {
      const msg = PROC.rows.length ? "Nothing matches these filters." : "Nothing here yet.";
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
        <td class="proc-cell-name">${escapeHtml(r.process_name)}</td>
        <td>${escapeHtml(r.steward_name || r.created_by || "—")}</td>
        <td>${escapeHtml(r.department || "—")}</td>
        <td><span class="proc-pill proc-pill-${PROC.statusTone(r.status)}">${escapeHtml(r.status)}</span></td>
        <td>${waitingCell}</td>
        <td class="proc-cell-dim">${PROC.formatDate(r.updated_at)}</td>
        <td><button type="button" class="proc-btn proc-btn-small" data-review="${r.id}">${DECIDABLE.indexOf(r.status) !== -1 ? "Review" : "View"}</button></td>
      </tr>`;
    }).join("");

    body.querySelectorAll("[data-review]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = PROC.rows.find((r) => String(r.id) === btn.dataset.review);
        if (row) PROC.form.openReview(row);
      });
    });
  }

  document.addEventListener("proc:data", render);
  PROC.ready.then(render);
})();
