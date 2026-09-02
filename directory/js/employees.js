/* ═══════════════ DIRECTORY — REMOVED ═══════════════

   This file held 190 people: names, roles, departments, employment types and
   who each of them reports to. It was the offline fallback for when the
   database is unreachable, loaded on demand by shared/js/data-service.js.

   On demand kept it out of every page's payload. It did not make it private.
   This is a static file on a public site, so anyone who knew the path could
   fetch the whole roster with no sign-in and no account — while row-level
   security on `employees` and `student_employees` refuses a partner every one
   of those rows, and refuses an anonymous caller outright. The snapshot handed
   back exactly what the database was there to withhold.

   The directory now comes from v_hub_directory only. If the database cannot be
   reached, the page says so rather than showing a copy of the roster whose age
   nobody can tell.

   Nothing loads this file any more — data-service has no fallbackSrc and the
   four department pages no longer script-tag it. It is left in place as a
   record of what was here and why it went, so it does not get regenerated.

   See supabase/rls-lockdown.sql for the other half of the same fix.
   ═══════════════════════════════════════════════════ */
