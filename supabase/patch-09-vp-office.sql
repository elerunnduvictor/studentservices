-- ═══════════ PATCH 09 — THE VP'S OFFICE ON THE DASHBOARD ═══════════
--
-- patch-07 built `departments` from the four department tabs in the Org
-- Directory workbook, because those tabs are what the PM Hub mirrors. That is
-- right for the tabs and wrong for the Dashboard: two people — Jess Swinburne
-- and Gilles Mambou — sit under "VP - Student Services", which is not one of
-- the four. The Dashboard therefore added up to 107 of 109 employees, with no
-- hint that anyone was missing.
--
-- Neither is hidden: both appear on the Employee Directory tab, and the
-- department tabs are correct to exclude them. It is only the summary that was
-- short, and a summary that quietly omits people is worse than one that shows
-- them, because nobody has any reason to go looking.
--
-- This adds the row, so the Dashboard reconciles to 109. It does *not* add a
-- fifth tab — the workbook has four department tabs and the PM Hub keeps four.
--
-- Run after patch-08. Safe to re-run.

begin;

insert into public.departments (name, tab_label, description, sort_order)
values (
  'VP - Student Services',
  null,                                  -- no workbook tab of its own
  'Executive leadership for Student Services: strategy, project management, and oversight of the four departments.',
  0                                      -- sorts above the departments it oversees
)
on conflict (name) do update
  set description = excluded.description,
      sort_order  = excluded.sort_order;

commit;

-- ── check ─────────────────────────────────────────────────────────────────
-- staff_count should now total every employee, with nobody stranded.
select
  (select count(*) from public.employees)                     as employees,
  (select sum(staff_count) from public.v_hub_departments)     as counted_on_dashboard,
  (select count(*) from public.employees e
     where not exists (select 1 from public.departments d
                        where d.name = e.department))         as stranded;
