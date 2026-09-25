-- ═══════════════════════════════════════════════════════════════════════════
--  DEAN OF STUDENTS — who is who, as of 2026-09-25
--
--  Four corrections to one department's roster, each of which the hub pages,
--  the directory and the PM Hub all read:
--
--    1. Sandra Wurttele and Joseph Bentum are Employer of Record, not tiered
--       contractors. They were filed as "Professional Contractor" with a tier
--       of "EOR", which counted them among the contractors everywhere. They now
--       have a type of their own, which gives them their own card on the
--       department page, their own tab in the PM Hub, and their own slice of
--       the directory's charts. Their tier stays "EOR".
--
--    2. Department Leadership is Steven K. Thomas and Anne Marie Clark. The
--       Dean of Students' coordinators move to Service Area Coordinators, where
--       Katelyn Ray already is. The KPI scorecard files each KPI under its
--       owner's sub-department, so this is what moves their KPIs into that card.
--
--    3. The department's five student contractors, by name, in the PM Hub's
--       Student Contractors roster — which the hub's directory never reads, so
--       they are not listed on it.
--
--    4. The department's student contractor headcount, which is what the hub
--       pages show: the Contractors card and the Employee Type Mix on the
--       Dean of Students page, and the Student Contractors card in the
--       directory. It had no row, so the department showed none.
--
--  Safe to re-run: every change only matches rows still in their old shape.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Employer of Record ──────────────────────────────────────────────────
update public.employees
   set employment_type = 'Employer of Record'
 where department = 'Dean of Students'
   and lower(name) in ('sandra wurttele', 'joseph bentum')
   and employment_type = 'Professional Contractor';

-- ── 2. Department Leadership is the Dean and the Associate Dean ────────────
-- Ana de Castro, Helen Segalla and Joseph Bentum, as asked.
update public.employees
   set sub_department = 'Service Area Coordinators'
 where department = 'Dean of Students'
   and lower(name) in ('ana de castro',
                       'helen segalla de oliveira rebouças',
                       'joseph bentum')
   and sub_department = 'Department Leadership';

-- Sandra Wurttele as well. Not named in the request, but she was the one
-- other KPI owner still in Department Leadership, which would leave that card
-- holding three people rather than the two it should. Her role is Accessibility
-- Office Coordinator, the same kind of role as the three above. Delete this
-- statement if she belongs in leadership after all.
update public.employees
   set sub_department = 'Service Area Coordinators'
 where department = 'Dean of Students'
   and lower(name) = 'sandra wurttele'
   and sub_department = 'Department Leadership';

-- Helen's KPIs were recorded as "Helen Reboucas", which matches nobody in the
-- directory; unmatched owners fall into Department Leadership by default,
-- whatever their row says. kpi-owner-names.sql already repaired this, so this
-- is a no-op unless that repair never ran.
update public.kpis
   set employee = 'Helen Segalla de Oliveira Rebouças'
 where department = 'Dean of Students'
   and employee = 'Helen Reboucas';

-- ── 3. The five student contractors, by name ───────────────────────────────
-- A tier column, the same idea as `tier` on employees. The PM Hub declares it
-- in STUDENT_CONTRACTOR_COLUMNS, so it shows there without "Add column".
alter table public.student_contractors add column if not exists tier text;

insert into public.student_contractors (name, department, tier, active)
select v.name, 'Dean of Students', 'T2', true
  from (values ('Larissa Fernanda Medeiros'),
               ('Luis Angel Bengoa Lima'),
               ('Jonas Reginaldo Da Silva'),
               ('Queen Essien'),
               ('Jennifer Otoo')) as v(name)
 where not exists (select 1 from public.student_contractors c
                    where lower(c.name) = lower(v.name));

-- ── 4. The headcount the hub shows ─────────────────────────────────────────
-- For this department the named roster is the whole population, so the count
-- is taken from it. The other departments' counts are left exactly as they are
-- — theirs are far larger than any roster anyone has typed in.
--
-- Written as update-then-insert rather than an upsert: this table was created
-- in the database directly and its constraints are not in this repo, so no
-- unique key is assumed.
update public.student_contractor_counts
   set headcount = (select count(*) from public.student_contractors
                     where department = 'Dean of Students' and active)
 where department = 'Dean of Students';

insert into public.student_contractor_counts (department, headcount)
select 'Dean of Students',
       (select count(*) from public.student_contractors
         where department = 'Dean of Students' and active)
 where not exists (select 1 from public.student_contractor_counts
                    where department = 'Dean of Students');

commit;

-- ── check it ───────────────────────────────────────────────────────────────
-- Expect: Steven K. Thomas and Anne Marie Clark alone in Department
-- Leadership; Ana de Castro, Helen, Joseph, Sandra and Katelyn Ray in Service
-- Area Coordinators; Sandra and Joseph as Employer of Record; and a student
-- contractor headcount of 5 beside five named T2 contractors.
select 'staff' as what, sub_department as detail, employment_type as kind, name
  from public.employees
 where department = 'Dean of Students'
   and sub_department in ('Department Leadership', 'Service Area Coordinators')
union all
select 'student contractor', tier, department, name
  from public.student_contractors
 where department = 'Dean of Students'
union all
select 'headcount', headcount::text, department, null
  from public.student_contractor_counts
 where department = 'Dean of Students'
 order by 1, 2, 4;
