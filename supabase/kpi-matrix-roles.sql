-- ═══════════════════════════════════════════════════════════════════════════
--  ROLES ON THE KPI MATRIX
--
--  The KPIs workbook's "Records, Registration & Support" tab showed a Role for
--  one person in sixteen. The other three department tabs were complete, so
--  this was one column nobody filled in rather than a fault in the app.
--
--  The values come from the workbook's own Role column, not from the employee
--  directory. That distinction matters: the two disagree for several people.
--  The directory calls Hilary Bagley a "Student Experience Coordinator"; this
--  workbook calls her "Training & Quality Assurance Manager". Mark Gefrom is
--  "Director of Student Records, Registration & Support" in the directory and
--  "Director of Student Support" here. Neither is wrong — they are different
--  records kept for different purposes — but a KPI matrix should read the way
--  its own workbook reads, so the workbook wins for this table.
--
--  Only blank cells are written. A Role already present is left exactly as it
--  is, and every one of the 44 rows was compared against the workbook across
--  nine columns first: 381 of 396 fields already matched, the other 15 were
--  these blanks, and nothing disagreed.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

update public.department_kpi_matrix
   set role = 'Director of Student Support'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Mark Gefrom'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Senior Manager of Student Support'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Brad Lester'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Student Support Coordinator'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Alyssa Burrell'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Training & Quality Assurance Manager'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Hilary Bagley'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Training & Quality Assurance Coordinator'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Kira Hayes'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Technical Support Manager'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Matthew Smith'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Product Support Engineer'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Colby Warner'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Registrar'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Kari Johnson'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Associate Registrar'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Kim Overdiek'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Associate Registrar'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Tyson Bell'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Graduation Coordinator'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Geraldine Susan Bean'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Records & Transcript Coordinator'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Anne E. Owen'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Planning Coordinator'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Cindi C Putnam'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Enrollment Verification Specialist'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Nikki Jane Chambers'))
   and (role is null or btrim(role) = '');

update public.department_kpi_matrix
   set role = 'Registration Specialist'
 where lower(btrim(department))    = lower(btrim('Student Records, Registration, and Support'))
   and lower(btrim(employee_name)) = lower(btrim('Angie Holt'))
   and (role is null or btrim(role) = '');

commit;

-- Should return no rows.
select department, employee_name
  from public.department_kpi_matrix
 where role is null or btrim(role) = ''
 order by department, employee_name;
