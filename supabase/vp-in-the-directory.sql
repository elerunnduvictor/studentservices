-- ═══════════════════════════════════════════════════════════════════════════
--  THE VP, IN THE DIRECTORY
--
--  Two things, and they are the same thing seen from two ends.
--
--  ── The VP - Student Services tab is empty ──
--
--  It holds two people, Jess Swinburne and Elie Gilles Ravel Mambou, both
--  Professional Contractors. A department page in the PM Hub opens on its FTE
--  sub-tab, and the only full-time employee that department has is the VP —
--  who is not in `employees` at all. So the tab opens on nothing, and the
--  department reads as empty until you happen to click Professional
--  Contractors.
--
--  Ben Packer is in org_chart_nodes, which is what draws the org chart, and
--  has never been in the directory. STEP 1 puts him there.
--
--  ── "VP of Student Services" on every department page ──
--
--  The four directors carry a job title where every other row carries a name:
--
--      Steven K. Thomas    primary_stakeholder = 'VP of Student Services'
--      Jacob Adams         primary_stakeholder = 'VP of Student Services'
--      Alison Cundiff      primary_stakeholder = 'VP of Student Services'
--      Mark Gefrom         primary_stakeholder = 'VP of Student Services'
--
--  That is the Primary Stakeholder column on each department page, and it is
--  the odd one out — 179 other rows name a person. STEP 2 makes it Ben Packer.
--
--  ── Why it is not only cosmetic ──
--
--  hub_subtree() in access-control.sql walks primary_stakeholder by name to
--  work out who a staff member may see. A director whose stakeholder is a job
--  title matches no row, so the chain stops there: a subtree rooted at Ben
--  Packer returns Ben Packer and nobody else. With STEP 1 and STEP 2 together
--  the four departments hang off him, and the recursion the function was
--  written for actually has something to walk.
--
--  Safe to re-run: STEP 1 inserts only if he is absent, STEP 2 only rewrites
--  rows that still say the old thing.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1: put the VP in the directory ────────────────────────────────────
-- Written as literals, not selected out of org_chart_nodes.
--
-- The first version of this read his title and address from that table and
-- would not run: org_chart_nodes has a numeric `id`, a `role` column rather
-- than `title`, and no email column at all. The slug "vp", `title` and `email`
-- are v_hub_org_chart's shape — the view derives them — and I wrote the insert
-- against what the page reads instead of what the table holds.
--
-- Three literals cannot fail on a column name, and the check at the foot of
-- this file compares them against the org chart, so if they ever disagree it
-- is reported rather than left to be believed.
insert into public.employees
       (name, role, department, employment_type,
        primary_stakeholder, sub_department, email, active, sort_order)
select 'Ben Packer',
       'Vice President of Student Services',
       'VP - Student Services',
       'Full-Time Employee',
       null,                        -- nobody above him
       'Department Leadership',
       'bpacker@byupw.edu',
       true,
       0
 where not exists (
   select 1 from public.employees e where lower(e.name) = 'ben packer'
 );


-- ── STEP 2: the directors report to a person ───────────────────────────────
update public.employees
   set primary_stakeholder = 'Ben Packer'
 where primary_stakeholder = 'VP of Student Services';


-- ── check it ───────────────────────────────────────────────────────────────
-- Expect the VP - Student Services department to hold three people — Ben as
-- FTE, Jess and Gilles as Professional Contractors — and no row anywhere still
-- naming a job title as its stakeholder.
select 'VP - Student Services' as department,
       name, role, employment_type, primary_stakeholder
  from public.employees
 where department = 'VP - Student Services'
   and active
 order by employment_type, name;

select 'still pointing at a title (expect 0 rows)' as check_name,
       name, department, primary_stakeholder
  from public.employees
 where primary_stakeholder = 'VP of Student Services';

select 'now reporting to Ben Packer' as check_name,
       name, department
  from public.employees
 where primary_stakeholder = 'Ben Packer'
 order by department;

-- Does the directory row agree with the org chart? Expect no rows. Anything
-- here means the two now tell different stories about the same person, which
-- is what selecting his details from the chart was meant to prevent.
select 'directory and org chart disagree (expect 0 rows)' as check_name,
       e.name, e.role as directory_says, v.title as org_chart_says,
       e.email as directory_email, v.email as org_chart_email
  from public.employees e
  join public.v_hub_org_chart v on v.id = 'vp'
 where lower(e.name) = 'ben packer'
   and (e.role is distinct from v.title or lower(e.email) is distinct from lower(v.email));
