/* ═══════════════ KPI SCORECARD — DATA REMOVED ═══════════════

   This file held 76 tracked KPIs: the measure, its owner by name, their role
   and department, the green/yellow/red bands and the current value — plus
   SCORECARD_META, the org-wide health and coverage figures.

   It was the offline fallback, loaded on demand by shared/js/data-service.js
   when the database could not be reached. On demand kept it out of every
   page's payload, but it was still a static file on a public site: fetchable
   by URL with no sign-in. Meanwhile `kpis` is the table the access control is
   built around — a partner gets no rows at all, and staff see only the people
   in their own reporting line. Every bit of that was undone by a file anyone
   could GET.

   The scorecard now comes from v_hub_kpis only. scorecard.js already reads
   `window.SCORECARD_META || {}`, so its absence costs nothing: data-service
   fills it from the live rollup on every successful load.

   Nothing loads this file any more. It is left in place as a record of what
   was here and why it went, so it does not get regenerated.

   See supabase/rls-lockdown.sql for the other half of the same fix.
   ═══════════════════════════════════════════════════════════ */
