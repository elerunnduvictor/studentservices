/* ═══════════════════════════════════════════════════════════════════════════
   "PROCESSES" — the flat list for a steward with no reports and no review
   rights: rows where they're the steward, no tabs, no tiles, no filters.

   Anyone with reports (PROC.hasTeam) or review rights (PROC.isReviewer) gets
   their "Processes" from process-review.js instead (2026-09-25): tabs, stat
   tiles, Status/Steward filters, fed their subtree's or their review scope's
   rows. Their own rows are in there too, so this list hides for them rather
   than stacking a second, often-empty section above it.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = window.SS;
  const PROC = window.PROC;
  const escapeHtml = SS.escapeHtml;

  function render() {
    const panel = document.getElementById("procMine");
    if (!panel) return;

    if (!PROC.isSteward || PROC.hasTeam || PROC.isReviewer) { panel.hidden = true; return; }
    panel.hidden = false;

    // steward_email exclusively — it's who the row is actually for, always.
    // created_by is who wrote the row, which for a PM-created-on-behalf-of
    // row is the PM, not the steward: OR'ing it in here would wrongly also
    // list that row under the PM's own list (2026-09-02 fix). For a
    // self-created row created_by and steward_email are always the same
    // person (create() defaults steward_email to the caller), so this is a
    // no-op for steward-only users.
    const email = String(SS.access.email || "").toLowerCase();
    const mine = PROC.rows
      .filter((r) => String(r.steward_email || "").toLowerCase() === email)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    const body = document.getElementById("procMineBody");
    const count = document.getElementById("procMineCount");
    count.textContent = mine.length + (mine.length === 1 ? " process" : " processes");

    if (!mine.length) {
      body.innerHTML = `<tr><td colspan="5"><div class="proc-empty">You haven't documented any processes yet.</div></td></tr>`;
      return;
    }

    // A steward's own row is editable at any status now (widened 2026-09-02),
    // so this is always "Edit" — never a locked "View".
    body.innerHTML = mine.map((r) => `
        <tr>
          <td class="proc-cell-name" data-label="Process">${escapeHtml(r.process_name)}</td>
          <td data-label="Department">${escapeHtml(r.department || "—")}</td>
          <td data-label="Status"><span class="proc-pill proc-pill-${PROC.statusTone(r.status)}">${escapeHtml(r.status)}</span></td>
          <td class="proc-cell-dim" data-label="Updated">${PROC.formatDate(r.updated_at)}</td>
          <td class="proc-cell-action">
            <button type="button" class="proc-btn proc-btn-small" data-open="${r.id}">Edit</button>
          </td>
        </tr>`).join("");

    body.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = PROC.rows.find((r) => String(r.id) === btn.dataset.open);
        if (row) PROC.form.openEdit(row);
      });
    });
  }

  document.addEventListener("proc:data", render);

  // Only a steward with no reports and no review rights sees this list, so
  // it's straight to the form for themself, no picker. Admins and leaders
  // create from process-review.js's panel, which opens the picker.
  const newBtn = document.getElementById("procNewBtn");
  if (newBtn) newBtn.addEventListener("click", () => PROC.form.openCreate());

  PROC.ready.then(render);
})();
