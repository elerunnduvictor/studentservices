// ═══════════════════════════════════════════════════════════
// DATA — Departments, Levels, and Employee Dataset
// ═══════════════════════════════════════════════════════════

window.OC = window.OC || {};

OC.DEPARTMENTS = {
  executive:  { name: 'Executive', color: '#FFC328', colorR: '255,195,40' },
  records:    { name: 'Student Records, Registration, and Support', color: '#3A929D', colorR: '58,146,157' },
  enrollment: { name: 'Enrollment & Retention', color: '#7E3F8F', colorR: '126,63,143' },
  dean:       { name: 'Dean of Students', color: '#A2C23D', colorR: '162,194,61' },
  digital:    { name: 'Digital Operations', color: '#CB4A27', colorR: '203,74,39' }
};

OC.LEVELS = {
  1: 'Executive',
  2: 'Director',
  3: 'Department Leadership',
  4: 'Management',
  5: 'Staff'
};

/* The people used to be here — 53 records with names, titles, reporting lines
   and work email addresses — as an offline fallback for when the database is
   unreachable.

   That made them a static file on a public site: anyone who knew the path could
   fetch the whole org chart without signing in, which is precisely what the
   row-level security in supabase/rls-lockdown.sql exists to prevent. The
   snapshot quietly handed back what the database refuses.

   They now come from v_hub_org_chart only, filled in by
   shared/js/data-service.js before anything renders. The empty array is what
   the renderers read until it arrives, and what they keep if it never does.

   DEPARTMENTS and LEVELS above stay: they are the chart's structure — names,
   colours, what a level is called — not anybody's data, and the renderer needs
   them before a single row has loaded. */
OC.employees = [];
