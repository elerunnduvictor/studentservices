-- ═══════════ PATCH 07 — THE TABS THE FIRST IMPORT LEFT BEHIND ═══════════
--
-- The Org Directory workbook has eight tabs and the KPIs workbook twelve. The
-- first import took two from one and one from the other, which is why the PM
-- Hub looked nothing like the workbooks it replaced.
--
-- What arrives here, and why each is shaped the way it is:
--
--   departments          the title and description at the top of each
--                        department tab — the only content on those tabs that
--                        is not already in the Employee Directory. Checked
--                        before assuming: all 105 people listed across the four
--                        tabs are in the directory, so the tabs themselves
--                        become filtered views of `employees` rather than four
--                        more copies of the same roster that could drift apart.
--
--   sub_departments      the Control tab. These lists were hardcoded in the PM
--                        Hub's JavaScript; in the database an edit to them
--                        reaches the dropdowns without a deploy.
--
--   kpi_categories       the Overview tab. Speed, Quality, Cost, Autonomy,
--                        Satisfaction and Completion with their definitions and
--                        examples. The scorecard has always grouped by these
--                        without recording what they mean.
--
--   kpi_guiding_questions  the questions used to draw KPIs out of a role.
--
--   department_kpi_matrix  the per-department KPI tabs. Unlike the directory
--                        tabs these are *not* a view of anything: they are a
--                        matrix of employee against outcome category, and they
--                        contain KPI text that never reached the ScoreCard. So
--                        they get their own table and stay editable as written.
--
-- Run after patch-06. Safe to re-run.

begin;

-- ── departments ───────────────────────────────────────────────────────────
create table if not exists public.departments (
  name        text primary key,
  tab_label   text,                    -- what the workbook tab is called
  description text,
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table if not exists public.sub_departments (
  id          bigserial primary key,
  department  text not null,
  name        text not null,
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  unique (department, name)
);

-- ── KPI reference ─────────────────────────────────────────────────────────
create table if not exists public.kpi_categories (
  name          text primary key,
  outcome_group text,                  -- Operational Outcomes | Student Outcomes
  definition    text,
  examples      text,
  sort_order    integer not null default 0,
  updated_at    timestamptz not null default now(),
  updated_by    text
);

create table if not exists public.kpi_guiding_questions (
  id         bigserial primary key,
  question   text not null,
  goal       text,
  focus      text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ── the per-department KPI matrix ─────────────────────────────────────────
-- Six category columns held as written, multi-line text and all: this is a
-- working document, and reformatting it would lose the author's structure.
create table if not exists public.department_kpi_matrix (
  id                   bigserial primary key,
  department           text not null,
  tab_label            text,
  sort_order           integer not null default 0,
  employee_name        text not null,
  role                 text,
  employment_status    text,
  stewardship          text,
  speed                text,
  quality              text,
  cost                 text,
  student_autonomy     text,
  student_satisfaction text,
  completion           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  updated_by           text
);

-- ── plumbing: same touch/audit/RLS treatment as every other table ─────────
do $$
declare
  t     text;
  nm    text;
  names text[];
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
begin
  foreach t in array array['departments', 'sub_departments', 'kpi_categories',
                           'kpi_guiding_questions', 'department_kpi_matrix']
  loop
    execute format('drop trigger if exists %1$s_touch on public.%1$s;
      create trigger %1$s_touch before update on public.%1$s
        for each row execute function public.touch_row();', t);

    execute format('drop trigger if exists %1$s_audit on public.%1$s;
      create trigger %1$s_audit after insert or update or delete on public.%1$s
        for each row execute function public.record_change();', t);

    select coalesce(array_agg(policyname), '{}') into names
      from pg_policies where schemaname = 'public' and tablename = t;
    foreach nm in array names loop
      execute format('drop policy if exists %I on public.%I', nm, t);
    end loop;

    execute format('alter table public.%I enable row level security;', t);

    execute format('create policy "%1$s_select" on public.%1$s
        for select using (true);', t);
    execute format('create policy "%1$s_insert" on public.%1$s
        for insert to authenticated with check (%2$s);', t, chk);
    execute format('create policy "%1$s_update" on public.%1$s
        for update to authenticated using (%2$s) with check (%2$s);', t, chk);
    execute format('create policy "%1$s_delete" on public.%1$s
        for delete to authenticated using (%2$s);', t, chk);

    execute format('grant select on public.%I to anon, authenticated;', t);
  end loop;
end;
$$;

-- ── load ──────────────────────────────────────────────────────────────────
truncate public.department_kpi_matrix restart identity;
truncate public.kpi_guiding_questions restart identity;
truncate public.sub_departments restart identity;

insert into public.departments (name, tab_label, description, sort_order) values
  ('Digital Operations', 'Digital Operations', 'Technology strategy for analytics, AI/ML, the Companion platform, mentor portal, Power BI reporting, SIS configuration, and data pipelines.', 1),
  ('Dean of Students', 'Dean of Students', 'Executive oversight of Title IX, Student Conduct, Accessibility, Belonging, Grievances, and Crisis response offices.', 2),
  ('Enrollment & Retention', 'Enrollment & Retention', 'Enrollment counseling, mentoring programs, admissions services, ecclesiastical endorsements, and student retention strategy.', 3),
  ('Student Records, Registration, and Support', 'Records Registration & Support', 'Student support operations, registrar services, graduation, academic records, planning, enrollment verification, and knowledge base management.', 4)
on conflict (name) do update set tab_label = excluded.tab_label, description = excluded.description, sort_order = excluded.sort_order;

insert into public.sub_departments (department, name, sort_order) values
  ('Student Records, Registration, and Support', 'Department Leadership', 1),
  ('Student Records, Registration, and Support', 'Student Support', 2),
  ('Student Records, Registration, and Support', 'Technical Support', 3),
  ('Student Records, Registration, and Support', 'Registrar''s Office', 4),
  ('Enrollment & Retention', 'Department Leadership', 5),
  ('Enrollment & Retention', 'Enrollment Counseling', 6),
  ('Enrollment & Retention', 'Mentoring', 7),
  ('Enrollment & Retention', 'Enrollment Services', 8),
  ('Enrollment & Retention', 'Admissions Office', 9),
  ('Digital Operations', 'Department Leadership', 10),
  ('Digital Operations', 'AI', 11),
  ('Digital Operations', 'Service Area Coordinators', 12),
  ('Digital Operations', 'D365 and  Automation', 13),
  ('Digital Operations', 'Companion and  Special Projects', 14),
  ('Digital Operations', 'Data', 15),
  ('Digital Operations', 'Dev-Ops', 16),
  ('Dean of Students', 'Department Leadership', 17),
  ('Dean of Students', 'Service Area Coordinators', 18),
  ('Dean of Students', 'Grievance Office', 19),
  ('Dean of Students', 'Student Honor & Conduct Office', 20),
  ('Dean of Students', 'Student Crisis Office', 21),
  ('Dean of Students', 'Accessibility Office', 22);

insert into public.kpi_categories (name, outcome_group, definition, examples, sort_order) values
  ('Speed', 'Operational Outcomes', 'Operations are executed  with promptness in order to maximize efficiency and satisfaction.', 'Resolution rate
Completion time
Response time
Processing time', 1),
  ('Quality', 'Operational Outcomes', 'Operations are conducted at a high rate of quality, maximizing satisfaction.', 'QA measures
Accuracy
Number of bugs or issues
Process C-Sat
1st contact resolution
Throughput rate
Usage rate', 2),
  ('Cost', 'Operational Outcomes', 'Operations reduce and control costs, allowing for efficiency and scalability of services.', 'Wages
Contractual services budget
Compute costs
Licenses
ITD/ITS
Costs per [unit of measure]', 3),
  ('Student Autonomy', 'Student Outcomes', 'The proportion of students not needing help from the home office in order to navigate the student experience.', 'What proportion of students submits an issue or process ticket for your services each term/year?', 4),
  ('Student Satisfaction', 'Student Outcomes', 'Student levels of satisfaction with their services experience--coupled with autonomy, students are delighted with their service experience without needing help from the home office.', 'Surveys or other forms of objective feedback indicating C-Sat with your specific services.

Also consider other clients'' satisfaction, as applicable.', 5),
  ('Completion', 'Student Outcomes', 'The proportion of students retained and completing a credential.', 'Application funnel
Retention
C1 Completion', 6)
on conflict (name) do update set outcome_group = excluded.outcome_group, definition = excluded.definition, examples = excluded.examples, sort_order = excluded.sort_order;

insert into public.kpi_guiding_questions (question, goal, focus, sort_order) values
  ('What are the most important operational outcomes this role is responsible for?', 'This question seeks to help you both establish a clear objective for the role.', 'As these are established, begin assigning them among the Operational and Student Outcomes', 1),
  ('How does this role impact the 3 imperitives of Student Services? (Autonomy, Satisfaction, Completion)', 'Understanding this help guide which categories are most appropriate for setting KPIs.', null, 2),
  ('Does this role support the organization in providing critical services?', 'If a role contributes to a critical services, it is important to ensure those things are measured by their KPIs.', 'Critical services'' are the services which every university must provide as a tertiary institution. Not every role does contribute to critical services, but if they do then it is good to have this in mind for setting KPIs.', 3),
  ('What evidence is there to show that you have done a great Job?', 'The aim here is to visualize what success looks like for the role and identify what can be quantified.', null, 4),
  ('What activities or behaviours lead to these outcomes?', 'Aims to understand what drives success', 'Role and department specific.', 5),
  ('Are they existing metrics or numbers that show success in these area?', 'The goal is to understand how success is already measured.', null, 6),
  ('If there are existing data, where does it come from?', 'This question points us to the data source. Verifying for data integrity.', 'A system or report that generates or shows these data.', 7),
  ('What is the timeframe for measuring sucess?', 'This is to understand how often their work would yield results and what progress looks like within that timeframe.', 'Semester, Monthly, weekly, Block, etc.', 8);

insert into public.department_kpi_matrix (department, tab_label, sort_order, employee_name, role, employment_status, stewardship, speed, quality, cost, student_autonomy, student_satisfaction, completion) values
  ('Dean of Students', 'Dean of Students', 1, 'Steven K. Thomas', 'Dean of Students', 'FTE', '> Dean of Students office oversight
> Title IX coordintor, ADA/Section 504 coordinator', null, 'No material audit findings attributable to Dean of Students governance
No legal findings attributable to Dean of Students governance
No accreditation findings attributable to Dean of Students governance', 'Annual DOS budget', null, 'Overall student satisfaction (primary)', null),
  ('Dean of Students', 'Dean of Students', 2, 'Anne Marie Clark', 'Associate Dean of Students', 'FTE', '> DOS operational lead
> Deputy Title IX and ADA/Section 504 coordinator', 'Dean of Students response time
Dean of Students resolution time', 'Dean of Students services escalation rates
Partner C-Sat', null, null, null, null),
  ('Dean of Students', 'Dean of Students', 3, 'Katelyn Ray', 'Student Honor & Conduct Coordinator', 'FTE', '> CES Honor Code
> Student conduct', 'Honor and Conduct response time
Honor and Conduct resolution time', 'Rate of repeat offenders', null, null, null, null),
  ('Dean of Students', 'Dean of Students', 4, 'Ana De Castro', 'Student Belonging Coordinator', 'FTE', '> Non-Discrimination
> Student belonging', null, 'Discrimination resolution rate 
Student sentiment on belonging
CSAT for Student Belonging', null, null, null, null),
  ('Dean of Students', 'Dean of Students', 5, 'Sandra Wurttele', 'Student Accessibility Coordinator', 'Contractor', '> Deputy ADA/Section 504 coordinator', 'Accommodation determination processing rate
Accommodation resolution rate', 'ADA and Section 504 standard compliance rate
ADA and Section 504 Audit compliance rate', null, null, null, null),
  ('Dean of Students', 'Dean of Students', 6, 'Helen Reboucas', 'Student Grievance Coordinator', 'Contractor', '> Student grievances', 'Student grievance case resolution time', 'Grievance QA', null, null, null, null),
  ('Dean of Students', 'Dean of Students', 7, 'Joseph Bentum', 'Student Crisis Coordinator', 'Contractor', '> Students-in-Crisis
> High-need case monitoring', 'Crisis response time', null, null, null, null, null),
  ('Digital Operations', 'Digital Ops', 1, 'Jacob Adams', 'Director of Digital Operations', 'FTE', '> Digital operations oversight
> Application and implementation of emerging technologies
> Strategy for Power BI, machine learning, agentic AI, and Companion teams
> UX evaluation & impact review', null, 'Overall Stakeholder CSAT', 'Digital Ops budget
Costs saved by customers due to Digital Ops technologies (secondary)', 'Overall student autonomy (secondary)', 'Overall student satisfaction (secondary)', 'Application Rate
Retention Rate
Completion Rate (Secondary)'),
  ('Digital Operations', 'Digital Ops', 2, 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'FTE', '> Business Partner collaboration
> Architect & Engineer engagement (IT/ICS)
> Development & QA lead
> AI Compliance & advancement', 'Team meeting project deadlines rate', 'Companion feature C-Sat', null, 'Companion usage rates', 'Companion C-Sat', 'AI retention effect'),
  ('Digital Operations', 'Digital Ops', 3, 'Joshua Stafford Hadden', 'Operational Research & Reporting Manager', 'FTE', '> Registrar business solutions
> Operational data & reporting
> SIS support & configuration', 'Team meeting project timelines rate', 'Stakeholder CSAT on team''s projects', 'Cost reductions in service areas (secondary)', null, null, null),
  ('Digital Operations', 'Digital Ops', 4, 'David Peck', 'Operational Data Analyst', 'FTE', '> Power BI report management & refresh', 'Project delivery on time rate', 'Stakeholder CSAT - communication, quality of work, impact', null, null, null, null),
  ('Digital Operations', 'Digital Ops', 5, 'Pelenatita Neiufi', 'Reporting & Evaluation Coordinator', 'FTE', '> NSC & Enrollment reporting (BYUI & EC)
> Student record updates (Demographics, SSN)
> Qualitative research', 'Project delivery on time rate', 'Stakeholder CSAT - communication, quality of work, impact', null, null, null, null),
  ('Digital Operations', 'Digital Ops', 6, 'Victor Lamôni Calado Ferreira', 'System & Operations Associate Registrar
(title change)', 'FTE', '> Registrar services for MLP students', 'Project delivery on time rate', 'Stakeholder CSAT - communication, quality of work, impact', null, null, null, null),
  ('Digital Operations', 'Digital Ops', 7, 'John Ayinde', 'D365 & Automation Manager', 'Contractor', '> Mentor Portal 
> Predictive Model Data Pipeline', 'Stakeholder CSAT - timeliness per project', 'Stakeholder CSAT - communication, quality of work, impact', null, null, null, null),
  ('Digital Operations', 'Digital Ops', 8, 'Samuel Riveros', 'Companion & Special Projects Manager', 'Contractor', '> Companion Front-End Stability & Usability
> Companion–Analytics Engine Integration', 'Stakeholder CSAT - timeliness per project', 'Stakeholder CSAT - communication, quality of work, impact', null, null, null, null),
  ('Digital Operations', 'Digital Ops', 9, 'Aitana Toscano', 'Data Manager', 'Contractor', '> Power BI reporting lead
> Backend Data stability & cleaning', 'Stakeholder CSAT - timeliness per project', 'Stakeholder CSAT - communication, quality of work, impact', null, null, null, null),
  ('Digital Operations', 'Digital Ops', 10, 'Isaias Zuñiga', 'AI Manager', 'Contractor', '> AI/ML Architecture development
> Data Model development
> Azure Board, GitHub, & DevOps Pipeline management', null, null, null, null, null, null),
  ('Enrollment & Retention', 'Enrollment & Retention', 1, 'Alison Cundiff', 'Director of Enrollment & Retention', 'FTE', '> Enrollment services & mentoring oversight
> Student retention and completion', null, null, 'Enrollment & Retention budget', 'Overall student autonomy (secondary)', 'Overall student satisfaction (secondary)', 'Enrollment, retention, completion (primary)'),
  ('Enrollment & Retention', 'Enrollment & Retention', 2, 'Katelyn Graf', 'Senior Manager of Retention', 'FTE', '> Retention performance and execution lead
> Mentoring performance, strategy, and innovation', null, null, null, null, null, 'PC Completion Rate
First Certificate Completion Rate'),
  ('Enrollment & Retention', 'Enrollment & Retention', 3, 'Kelley Richardson', 'Mentoring Manager', 'FTE', '> Mentoring program lead', 'Mentor required action completion rate', 'Mentor interaction QA', null, null, 'Mentor CSAT', 'Retention rate contribution by mentors'),
  ('Enrollment & Retention', 'Enrollment & Retention', 4, 'Mandy Schwab', 'Mentoring Content Coordinator', 'Full-Time Contractor', '> Mentoring program development', null, 'Mentor interaction QA', null, null, 'Mentor CSAT', null),
  ('Enrollment & Retention', 'Enrollment & Retention', 5, 'Joanna Relkin', 'Mentor Operations Coordinator', 'Full-Time Contractor', '> Mentoring program operations', 'Mentor required action completion rate', 'Mentor concern case QA', null, null, null, null),
  ('Enrollment & Retention', 'Enrollment & Retention', 6, 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'FTE', '> Enrollment services lead
> Enrollment funnel performance, strategy, and innovation', null, null, null, 'Reduction of enrollment related support cases
Reduction of admissions tier 2 support cases', null, 'Application start to admission yield
Admission to registration yield
Registration to auto-drop yield'),
  ('Enrollment & Retention', 'Enrollment & Retention', 7, 'Rachel Kirk', 'Enrollment Counseling Manager', 'FTE', '> Enrollment Counseling program lead', 'Enrollment Counseling required action completion rate
Enrollment Counseling contact rate by alert', 'Enrollment Counseling CSAT rate
Enrollment Counseling yield contribution', null, null, null, null),
  ('Enrollment & Retention', 'Enrollment & Retention', 8, 'Kimarie Howard', 'Enrollment Counseling Development and Performance Coordinator', 'Full-Time Contractor', '> Enrollment Counseling development and performance', null, 'Enrollment Counseling CSAT rate
Enrollment Counseling yield contribution', null, null, null, null),
  ('Enrollment & Retention', 'Enrollment & Retention', 9, 'Megan Niblett', 'Enrollment Counseling Operations Coordinator', 'Full-Time Contractor', '> Enrollment Counseling operations', 'Enrollment Counseling required action completion rate
Enrollment Counseling contact rate by alert', null, null, null, null, null),
  ('Enrollment & Retention', 'Enrollment & Retention', 10, 'Shaunasee Janette James', 'Enrollment Coordinator', 'FTE', '> Transfer evaluation 
> Ecclesiastical endorsement 
> Chaplain partnership', 'Transfer evaluation processing rate 
Transfer evaluation case resolution rate', 'Number of transfer evaluation cases', null, null, null, null),
  ('Enrollment & Retention', 'Enrollment & Retention', 11, 'Ely Zmolek', 'Enrollment Services Specialist', 'FTE', '> Application processing
> Admissons exceptions 
> Admissions systems', 'Application processing rate
Application manual review turnaround rate', 'Number of admissions support cases
Admissions case resolution rate', null, null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 1, 'Mark Gefrom', null, 'FTE', '> Registrar, student support, Tech support oversight
> Help center
> Customer relations systems 
> Case systems', 'Teams meeting or exceeding response service-level agreements
Teams meeting or exceeding resolution service-level agreements', 'Teams meeting QA service-level agreements
Teams meeting CSAT service-level agreements
Teams meeting first contact resolution service-level agreements', 'Student records, registration, and support department budget', 'Overall student autonomy (primary)', 'Overall student satisfaction (secondary)', null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 2, 'Brad Lester', null, 'FTE', '> Inbound student support lead
> Academic advising program', 'Student support case response rates
Student support case resolution rates', 'Student support QA
Student support CSAT
Student support first contact resolution', 'Student support budget', 'Autonomy rate for student support cases', null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 3, 'Alyssa Burrell', null, 'FTE', '> Phone support 
> General support', 'General support case response rate
General support case resolution rate
Phone answer Speed
Phone handle rate
Agent availability', 'Phone support QA 
Phone support CSAT 
Phone upport first contanct resolution', 'Phone support costs', null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 4, 'Hilary Bagley', null, 'FTE', '> Training, area collaboration, & partner communication
> Media & Knowledge Base development
> Student Support content accuracy
> Student journey mapping', 'Request-to-KB publish rate
QA feedback cycle rate', 'QA calibration consistency rate
Knowledge Base audit pass rate
QA team lead feedback success rate', 'Cost per QA Evaluation ($ per Evaluation)
Cost per KB Article Maintained ($ per Article Updated or Audited)', null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 5, 'Kira Hayes', null, 'FTE', '> caseing QA
> External Knowledge Base articles
> Support agent onboarding and training', 'KB publishing rate', 'QA evaluation completion rate
DSAT and critical violation delivery rate', 'QA Team Costs
Knowledge Base (KB) Team Costs', null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 6, 'Matthew Smith', null, 'FTE', '> Inbound tech support lead', 'Tech support case resolution rate', 'Tech Support case QA 
Tech Support case CSAT
Tech Support case first contract resolution', 'Tech support costs', 'Autonomy rate for tech support cases', null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 7, 'Colby Warner', null, 'FTE', '> Tech support troubleshooting & resolution', 'Escalated case resolution rate
Tech support case response rate', 'Tech Support case QA 
Tech Support case CSAT
Tech Support case first contract resolution', null, null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 8, 'Kari Johnson', null, 'FTE', '> Registration and Records lead
> Academic record maintenance
> Block/Term system and catalog data publishing', 'Registrar process resolution rate
Registrar case resolution rate', 'CSAT for registrar processes
CSAT for registrar cases', 'Registrar budget', 'Autonomy for registrar processes
Autonomy for registrar cases', 'Case C-Sat for planning and registration', null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 9, 'Kim Overdiek', null, 'FTE', '> Policies & processes
> Curriculum/catalog maintenance 
> Academic planning system configuration
> Course registration process', 'Process case resolution rate
On-time catalog publishing rate
On-time system configuration rate', 'Process case QA 
Process case CSAT Score', 'Planning and registration team costs', null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 10, 'Tyson Bell', null, 'FTE', '> Student records
>Transcripts
>Graduation
>Enrollment verification', 'Records case resolution rate', 'Records case QA
Records case CSAT', 'Records team costs', null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 11, 'Geraldine Susan Bean', null, 'FTE', '> Graduation application
> Diploma awarding process', 'Graduation application case completion rate
Award processing rate', 'Number of Rescinded Degrees
Application QA 
Awarding QA', 'Graduation team costs', null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 12, 'Anne E. Owen', null, 'FTE', '> Grade changes
> Academic exceptions
> Transcript requests', 'Process case completion rate', 'Process case CSAT
Process case QA 
Transcript Accuracy QA', 'Process team costs', null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 13, 'Cindi C Putnam', null, 'FTE', '> Degree progress audit corrections', 'Degree planning escalation case resolution rate', 'Degree Planning Escalation case CSAT Score
Degree Planning Escalation case QA Score', 'Degree planning team costs', null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 14, 'Nikki Jane Chambers', null, 'FTT', '> Enrollment verification 
> Partner transfer evaluation
> Apostilles
> Student verification letters', 'Enrollment verification completion rate
Apostille completion rate', 'Enrollment verification QA
Apostille QA 
Enrollment verification CSAT
Apostille C-Sat', 'Enrollment verification team costs', null, null, null),
  ('Student Records, Registration, and Support', 'Records, Registration, Support', 15, 'Angie Holt', null, 'Contractor', '> Registration user testing
> Registration support
> Manual registration projects', 'Registration issue case resolution rate', 'Registration issue case QA
Registration issue case CSAT', 'Registration team costs', null, null, null);

-- ── what the hub reads ────────────────────────────────────────────────────
create or replace view public.v_hub_departments as
  select d.name, d.tab_label, d.description, d.sort_order,
         (select count(*) from public.employees e where e.department = d.name) as staff_count,
         coalesce((select c.headcount from public.student_contractor_counts c
                    where c.department = d.name), 0) as contractor_count
    from public.departments d
   order by d.sort_order, d.name;

alter view public.v_hub_departments set (security_invoker = on);
grant select on public.v_hub_departments to anon, authenticated;

commit;
