-- ═══════════ PATCH 12 — THE ROW IN THE OTHER COPY ═══════════
--
-- The KPIs workbook carries two versions of the Records, Registration & Support
-- matrix tab. patch-07 imported the one without the "(2)" and treated the other
-- as a stale duplicate, which was right about fifteen of its sixteen rows and
-- wrong about one: the two tabs are not copies, they diverge. The imported tab
-- has Geraldine Susan Bean; the "(2)" copy has Daniel Zago instead.
--
-- Daniel Zago is a real member of staff — he is in `employees` and has three
-- KPIs on the ScoreCard — so his stewardship and measures were sitting in a tab
-- nobody was reading. This restores that row. Geraldine's is already present,
-- so nothing is displaced.
--
-- Found while checking whether the source workbooks were safe to delete. They
-- were not, quite.
--
-- Run after patch-11. Safe to re-run.

begin;

insert into public.department_kpi_matrix (department, tab_label, sort_order, employee_name, role, employment_status, stewardship, speed, quality, cost, student_autonomy, student_satisfaction, completion)
select 'Student Records, Registration, and Support', 'Records, Registration, Support', 16, 'Daniel Zago', 'Registration Specialist', 'Contractor', '> Registration user testing
> Registration support
> Manual registration projects', 'Registration issue case resolution rate', 'Registration issue case QA
Registration issue case CSAT', null, null, null, null
 where not exists (
   select 1 from public.department_kpi_matrix m
    where lower(m.employee_name) = lower('Daniel Zago')
 );

commit;

select count(*) as matrix_rows from public.department_kpi_matrix;
