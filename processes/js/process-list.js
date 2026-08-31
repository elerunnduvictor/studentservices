/* ═══════════════════════════════════════════════════════════════════════════
   "MY PROCESSES" — renders only for a signed-in steward.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = window.SS;
  const PROC = window.PROC;
  const escapeHtml = SS.escapeHtml;
  const UNLOCKED = ["Draft", "Submitted"];

  function render() {
    const panel = document.getElementById("procMine");
    if (!panel) return;

    if (!PROC.isSteward) { panel.hidden = true; return; }
    panel.hidden = false;

    // created_by alone misses a process a PM created on this steward's
    // behalf — that row's created_by is the PM, not them. steward_email is
    // what actually ties it back to the person it's for.
    const email = String(SS.access.email || "").toLowerCase();
    const mine = PROC.rows.filter(
      (r) => String(r.created_by || "").toLowerCase() === email ||
             String(r.steward_email || "").toLowerCase() === email
    );

    const body = document.getElementById("procMineBody");
    const count = document.getElementById("procMineCount");
    count.textContent = mine.length + (mine.length === 1 ? " process" : " processes");

    if (!mine.length) {
      body.innerHTML = `<tr><td colspan="5"><div class="proc-empty">You haven't documented any processes yet.</div></td></tr>`;
      return;
    }

    body.innerHTML = mine.map((r) => {
      const editable = UNLOCKED.indexOf(r.status) !== -1;
      return `
        <tr>
          <td class="proc-cell-name">${escapeHtml(r.process_name)}</td>
          <td>${escapeHtml(r.department || "—")}</td>
          <td><span class="proc-pill proc-pill-${PROC.statusTone(r.status)}">${escapeHtml(r.status)}</span></td>
          <td class="proc-cell-dim">${PROC.formatDate(r.updated_at)}</td>
          <td>
            <button type="button" class="proc-btn proc-btn-small" data-open="${r.id}">
              ${editable ? "Edit" : "View"}
            </button>
          </td>
        </tr>`;
    }).join("");

    body.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = PROC.rows.find((r) => String(r.id) === btn.dataset.open);
        if (row) PROC.form.openEdit(row);
      });
    });
  }

  document.addEventListener("proc:data", render);

  const newBtn = document.getElementById("procNewBtn");
  if (newBtn) newBtn.addEventListener("click", () => PROC.form.openCreate());

  PROC.ready.then(render);
})();
