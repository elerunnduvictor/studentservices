/* ═══════════════════════════════════════════════════════════════════════════
   "MY PROCESSES" — renders only for a signed-in steward.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = window.SS;
  const PROC = window.PROC;
  const escapeHtml = SS.escapeHtml;

  function render() {
    const panel = document.getElementById("procMine");
    if (!panel) return;

    if (!PROC.isSteward) { panel.hidden = true; return; }
    panel.hidden = false;

    // steward_email exclusively — it's who the row is actually for, always.
    // created_by is who wrote the row, which for a PM-created-on-behalf-of
    // row is the PM, not the steward: OR'ing it in here would wrongly also
    // list that row under the PM's own "mine" (2026-09-02 fix). For a
    // self-created row created_by and steward_email are always the same
    // person (create() defaults steward_email to the caller), so this is a
    // no-op for steward-only users.
    const email = String(SS.access.email || "").toLowerCase();
    const mine = PROC.rows.filter(
      (r) => String(r.steward_email || "").toLowerCase() === email
    );

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
          <td class="proc-cell-name">${escapeHtml(r.process_name)}</td>
          <td>${escapeHtml(r.department || "—")}</td>
          <td><span class="proc-pill proc-pill-${PROC.statusTone(r.status)}">${escapeHtml(r.status)}</span></td>
          <td class="proc-cell-dim">${PROC.formatDate(r.updated_at)}</td>
          <td>
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

  // Someone who is also a reviewer (Jess, Gilles — 2026-09-02) gets the same
  // unified "Whose process are you creating?" picker Review's own button
  // opens, with a "Me" entry folded in — one modal, not two overlapping
  // create flows. A steward with no reviewer rights is untouched: straight
  // to the form for themself, no picker, exactly as before.
  const newBtn = document.getElementById("procNewBtn");
  if (newBtn) newBtn.addEventListener("click", () => {
    if (PROC.isReviewer) PROC.form.openCreateForSteward();
    else PROC.form.openCreate();
  });

  PROC.ready.then(render);
})();
