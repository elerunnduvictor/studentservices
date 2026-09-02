/* ═══════════════════════════════════════════════════════════════════════════
   PM HUB — PROVISIONED EDITORS

   To give someone edit access, add their address here and re-run
   `supabase/import_sheets.py`, which fills the `allowed_editors` table from
   this file. Row-level security checks that table on every write, so removing
   someone here and re-importing genuinely revokes their access rather than
   only hiding the door.

   ── Why it lives in supabase/ ──

   It used to be pm/js/pm-editors.js, loaded by all six PM Hub pages, which
   made it a static file on a public site: seven work email addresses handed to
   anyone who asked for the path. Small next to the 258 in js/allowed-users.js
   and the 261 in access-control.sql, and exactly the same mistake.

   supabase/ is excluded from the deployment by .vercelignore, so this is now a
   build-time input rather than something the web server can hand out. The
   browser no longer reads it at all — the PM Hub asks `allowed_editors`
   instead, which is the table the database itself enforces.

   Keep it small. Everyone below can rewrite the data the whole hub renders
   from.
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
