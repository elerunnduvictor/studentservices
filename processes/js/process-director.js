/* ═══════════════════════════════════════════════════════════════════════════
   "MY DEPARTMENT" — a director's read-only view of every process in their
   own scope_department (2026-09-02). Deliberately thin next to Review: no
   tabs, no KPI cards, no filter bar, no status control — a director has no
   write policy on `processes` at all, so there's nothing here to act on,
   only to look at. A plain table + a View button that opens the fully
   read-only PROC.form.openView(row).

   Draft rows are excluded by the same UI-only convention process-review.js
   already applies for admins — RLS's director SELECT policy has no status
   restriction either, so this mirrors that call rather than inventing a new
   one.

   Renders only for PROC.isDirector. Not mutually exclusive with My
   Processes (PROC.isSteward) — all four directors are also stewards of
   their own department, so their own processes can legitimately appear in
   both panels. Accepted as-is (see conversation 2026-09-02): this view is
   read-only, so there's no duplicate action to worry about, and a director
   seeing their own submission in the full department list is expected, not
   a bug.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = window.SS;
  const PROC = window.PROC;
  const escapeHtml = SS.escapeHtml;

  function departmentRows() {
    const dept = PROC.reviewScopeDepartment;
    return PROC.rows.filter((r) => r.department === dept && r.status !== "Draft");
  }

  function render() {
    const panel = document.getElementById("procDirectorView");
    if (!panel) return;

    if (!PROC.isDirector) { panel.hidden = true; return; }
    panel.hidden = false;

    const scopeNote = document.getElementById("procDirectorScope");
    scopeNote.textContent = "Showing processes in " + (PROC.reviewScopeDepartment || "your department") + ".";

    const rows = departmentRows().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    const body = document.getElementById("procDirectorBody");
    const count = document.getElementById("procDirectorCount");
    count.textContent = rows.length + (rows.length === 1 ? " process" : " processes");

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="5"><div class="proc-empty">Nothing here yet.</div></td></tr>`;
      return;
    }

    body.innerHTML = rows.map((r) => `
      <tr>
        <td class="proc-cell-name">${escapeHtml(r.process_name)}</td>
        <td>${escapeHtml(r.steward_name || r.created_by || "—")}</td>
        <td><span class="proc-pill proc-pill-${PROC.statusTone(r.status)}">${escapeHtml(r.status)}</span></td>
        <td class="proc-cell-dim">${PROC.formatDate(r.updated_at)}</td>
        <td><button type="button" class="proc-btn proc-btn-small" data-view="${r.id}">View</button></td>
      </tr>`).join("");

    body.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = PROC.rows.find((r) => String(r.id) === btn.dataset.view);
        if (row) PROC.form.openView(row);
      });
    });
  }

  document.addEventListener("proc:data", render);
  PROC.ready.then(render);
})();
