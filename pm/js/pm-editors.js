/* ═══════════════════════════════════════════════════════════════════════════
   PM CONSOLE — PROVISIONED EDITORS

   The same provisioning model as the hub's js/allowed-users.js: to give someone
   access, add their address here. The difference is who is on it — the hub is
   read-only and open to all of Student Services, while everyone below can
   rewrite the data the whole hub renders from. Keep it small.

   This file is the single source of truth. `supabase/import_sheets.py` reads it
   to fill the `allowed_editors` table, and the database's row-level security
   checks that table on every write — so removing someone here and re-running
   the import genuinely revokes their access, rather than only hiding the door.
   ═══════════════════════════════════════════════════════════════════════════ */

window.PM_EDITORS = [
  // ── VP of Student Services ──
  "JSwinburne@churchofjesuschrist.org",          // Jess Swinburne — Project Manager
  "gillesravelmambou@churchofjesuschrist.org",   // Elie Gilles Ravel Mambou — Assistant PM

  // ── Departmental project managers ──
  "MarielaPezzali@churchofjesuschrist.org",      // Dean of Students
  "davidkoomson@churchofjesuschrist.org",        // Digital Operations
  "CCrankson@churchofjesuschrist.org",           // Enrollment & Retention
  "MAbioye@churchofjesuschrist.org",             // Student Records, Registration & Support
  "oluwapelumi@churchofjesuschrist.org",         // Student Records, Registration & Support
];

/** Case-insensitive check — people type their address however they please. */
window.isProvisionedEditor = function (email) {
  const e = String(email || "").trim().toLowerCase();
  return window.PM_EDITORS.some((x) => x.toLowerCase() === e);
};
