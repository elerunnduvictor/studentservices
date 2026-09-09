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
-- Details taken from org_chart_nodes rather than typed in, so the two agree on
-- his title and address. sub_department matches the four directors', which is
-- what puts him on the same footing as them in every grouping.
insert into public.employees
       (name, role, department, employment_type,
        primary_stakeholder, sub_department, email, active, sort_order)
select  n.name,
        n.title,
        'VP - Student Services',
        'Full-Time Employee',
        null,                       -- nobody above him
        'Department Leadership',
        n.email,
        true,
        0
  from public.org_chart_nodes n
 where n.id = 'vp'
   and not exists (
     select 1 from public.employees e where lower(e.name) = lower(n.name)
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
