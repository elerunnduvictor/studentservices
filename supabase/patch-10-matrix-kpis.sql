-- ═══════════ PATCH 10 — MATRIX KPIs ONTO THE SCORECARD SHEET ═══════════
--
-- The per-department KPI tabs hold measures that were written down for a role
-- and never reached the ScoreCard: Brad Lester's case response rates, Kira
-- Hayes' QA and Knowledge Base team costs, Matthew Smith's case QA, and more.
-- Until now they existed only inside a matrix cell, which is no use to anyone
-- who wants to start tracking one.
--
-- Each line of each category cell becomes a KPI row, carrying the category the
-- column it came from implies — Speed, Quality and Cost are Operational
-- Outcomes; Autonomy, Satisfaction and Completion are Student Outcomes.
--
-- They load as `Not Tracking`, which is the whole point of the exercise: the PM
-- Hub's KPI ScoreCard sheet reads the table unfiltered and shows all of them,
-- ready to be given bands and switched on, while the hub's scorecard reads
-- v_hub_kpis and continues to show only Tracking rows. Nothing appears in front
-- of the organisation until somebody decides it should.
--
-- Guarded on employee + measure, so re-running adds nothing twice and a row
-- already edited on the ScoreCard is never overwritten.
--
-- Run after patch-09. Safe to re-run.

begin;

insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Anne Marie Clark', 'Associate Dean of Students', 'Dean of Students', 'Partner C-Sat', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Anne Marie Clark')
     and lower(k.kpi_measure) = lower('Partner C-Sat'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Helen Reboucas', 'Student Grievance Coordinator', 'Dean of Students', 'Student grievance case resolution time', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Helen Reboucas')
     and lower(k.kpi_measure) = lower('Student grievance case resolution time'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Application Rate', 'Student Outcomes', 'Completion', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Jacob Adams')
     and lower(k.kpi_measure) = lower('Application Rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Retention Rate', 'Student Outcomes', 'Completion', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Jacob Adams')
     and lower(k.kpi_measure) = lower('Retention Rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Completion Rate (Secondary)', 'Student Outcomes', 'Completion', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Jacob Adams')
     and lower(k.kpi_measure) = lower('Completion Rate (Secondary)'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Alison Cundiff', 'Director of Enrollment & Retention', 'Enrollment & Retention', 'Enrollment, retention, completion (primary)', 'Student Outcomes', 'Completion', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Alison Cundiff')
     and lower(k.kpi_measure) = lower('Enrollment, retention, completion (primary)'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Application start to admission yield', 'Student Outcomes', 'Completion', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Trevor Shelton')
     and lower(k.kpi_measure) = lower('Application start to admission yield'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Admission to registration yield', 'Student Outcomes', 'Completion', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Trevor Shelton')
     and lower(k.kpi_measure) = lower('Admission to registration yield'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Number of transfer evaluation cases', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Shaunasee Janette James')
     and lower(k.kpi_measure) = lower('Number of transfer evaluation cases'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Ely Zmolek', 'Enrollment Services Specialist', 'Enrollment & Retention', 'Number of admissions support cases', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Ely Zmolek')
     and lower(k.kpi_measure) = lower('Number of admissions support cases'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Brad Lester', null, 'Student Records, Registration, and Support', 'Student support case response rates', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Brad Lester')
     and lower(k.kpi_measure) = lower('Student support case response rates'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Brad Lester', null, 'Student Records, Registration, and Support', 'Student support case resolution rates', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Brad Lester')
     and lower(k.kpi_measure) = lower('Student support case resolution rates'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Brad Lester', null, 'Student Records, Registration, and Support', 'Student support QA', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Brad Lester')
     and lower(k.kpi_measure) = lower('Student support QA'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Brad Lester', null, 'Student Records, Registration, and Support', 'Student support CSAT', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Brad Lester')
     and lower(k.kpi_measure) = lower('Student support CSAT'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Brad Lester', null, 'Student Records, Registration, and Support', 'Student support first contact resolution', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Brad Lester')
     and lower(k.kpi_measure) = lower('Student support first contact resolution'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Alyssa Burrell', null, 'Student Records, Registration, and Support', 'Phone upport first contanct resolution', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Alyssa Burrell')
     and lower(k.kpi_measure) = lower('Phone upport first contanct resolution'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Alyssa Burrell', null, 'Student Records, Registration, and Support', 'Phone support costs', 'Operational Outcomes', 'Cost', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Alyssa Burrell')
     and lower(k.kpi_measure) = lower('Phone support costs'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kira Hayes', null, 'Student Records, Registration, and Support', 'QA Team Costs', 'Operational Outcomes', 'Cost', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kira Hayes')
     and lower(k.kpi_measure) = lower('QA Team Costs'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kira Hayes', null, 'Student Records, Registration, and Support', 'Knowledge Base (KB) Team Costs', 'Operational Outcomes', 'Cost', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kira Hayes')
     and lower(k.kpi_measure) = lower('Knowledge Base (KB) Team Costs'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Matthew Smith', null, 'Student Records, Registration, and Support', 'Tech Support case QA', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Matthew Smith')
     and lower(k.kpi_measure) = lower('Tech Support case QA'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Matthew Smith', null, 'Student Records, Registration, and Support', 'Tech Support case CSAT', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Matthew Smith')
     and lower(k.kpi_measure) = lower('Tech Support case CSAT'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Matthew Smith', null, 'Student Records, Registration, and Support', 'Tech Support case first contract resolution', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Matthew Smith')
     and lower(k.kpi_measure) = lower('Tech Support case first contract resolution'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Colby Warner', null, 'Student Records, Registration, and Support', 'Tech support case response rate', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Colby Warner')
     and lower(k.kpi_measure) = lower('Tech support case response rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Colby Warner', null, 'Student Records, Registration, and Support', 'Tech Support case first contract resolution', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Colby Warner')
     and lower(k.kpi_measure) = lower('Tech Support case first contract resolution'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kari Johnson', null, 'Student Records, Registration, and Support', 'Registrar process resolution rate', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kari Johnson')
     and lower(k.kpi_measure) = lower('Registrar process resolution rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kari Johnson', null, 'Student Records, Registration, and Support', 'Registrar case resolution rate', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kari Johnson')
     and lower(k.kpi_measure) = lower('Registrar case resolution rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kari Johnson', null, 'Student Records, Registration, and Support', 'CSAT for registrar processes', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kari Johnson')
     and lower(k.kpi_measure) = lower('CSAT for registrar processes'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kari Johnson', null, 'Student Records, Registration, and Support', 'CSAT for registrar cases', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kari Johnson')
     and lower(k.kpi_measure) = lower('CSAT for registrar cases'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kari Johnson', null, 'Student Records, Registration, and Support', 'Autonomy for registrar processes', 'Student Outcomes', 'Student Autonomy', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kari Johnson')
     and lower(k.kpi_measure) = lower('Autonomy for registrar processes'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kari Johnson', null, 'Student Records, Registration, and Support', 'Autonomy for registrar cases', 'Student Outcomes', 'Student Autonomy', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kari Johnson')
     and lower(k.kpi_measure) = lower('Autonomy for registrar cases'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kari Johnson', null, 'Student Records, Registration, and Support', 'Case C-Sat for planning and registration', 'Student Outcomes', 'Student Satisfaction', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kari Johnson')
     and lower(k.kpi_measure) = lower('Case C-Sat for planning and registration'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kim Overdiek', null, 'Student Records, Registration, and Support', 'Process case resolution rate', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kim Overdiek')
     and lower(k.kpi_measure) = lower('Process case resolution rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kim Overdiek', null, 'Student Records, Registration, and Support', 'Process case CSAT Score', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kim Overdiek')
     and lower(k.kpi_measure) = lower('Process case CSAT Score'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Kim Overdiek', null, 'Student Records, Registration, and Support', 'Planning and registration team costs', 'Operational Outcomes', 'Cost', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kim Overdiek')
     and lower(k.kpi_measure) = lower('Planning and registration team costs'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Tyson Bell', null, 'Student Records, Registration, and Support', 'Records case resolution rate', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Tyson Bell')
     and lower(k.kpi_measure) = lower('Records case resolution rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Tyson Bell', null, 'Student Records, Registration, and Support', 'Records team costs', 'Operational Outcomes', 'Cost', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Tyson Bell')
     and lower(k.kpi_measure) = lower('Records team costs'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Geraldine Susan Bean', null, 'Student Records, Registration, and Support', 'Graduation application case completion rate', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Geraldine Susan Bean')
     and lower(k.kpi_measure) = lower('Graduation application case completion rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Geraldine Susan Bean', null, 'Student Records, Registration, and Support', 'Award processing rate', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Geraldine Susan Bean')
     and lower(k.kpi_measure) = lower('Award processing rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Geraldine Susan Bean', null, 'Student Records, Registration, and Support', 'Number of Rescinded Degrees', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Geraldine Susan Bean')
     and lower(k.kpi_measure) = lower('Number of Rescinded Degrees'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Geraldine Susan Bean', null, 'Student Records, Registration, and Support', 'Application QA', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Geraldine Susan Bean')
     and lower(k.kpi_measure) = lower('Application QA'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Geraldine Susan Bean', null, 'Student Records, Registration, and Support', 'Awarding QA', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Geraldine Susan Bean')
     and lower(k.kpi_measure) = lower('Awarding QA'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Geraldine Susan Bean', null, 'Student Records, Registration, and Support', 'Graduation team costs', 'Operational Outcomes', 'Cost', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Geraldine Susan Bean')
     and lower(k.kpi_measure) = lower('Graduation team costs'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Anne E. Owen', null, 'Student Records, Registration, and Support', 'Process team costs', 'Operational Outcomes', 'Cost', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Anne E. Owen')
     and lower(k.kpi_measure) = lower('Process team costs'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Cindi C Putnam', null, 'Student Records, Registration, and Support', 'Degree Planning Escalation case CSAT Score', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Cindi C Putnam')
     and lower(k.kpi_measure) = lower('Degree Planning Escalation case CSAT Score'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Cindi C Putnam', null, 'Student Records, Registration, and Support', 'Degree Planning Escalation case QA Score', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Cindi C Putnam')
     and lower(k.kpi_measure) = lower('Degree Planning Escalation case QA Score'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Cindi C Putnam', null, 'Student Records, Registration, and Support', 'Degree planning team costs', 'Operational Outcomes', 'Cost', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Cindi C Putnam')
     and lower(k.kpi_measure) = lower('Degree planning team costs'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Nikki Jane Chambers', null, 'Student Records, Registration, and Support', 'Enrollment verification team costs', 'Operational Outcomes', 'Cost', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Nikki Jane Chambers')
     and lower(k.kpi_measure) = lower('Enrollment verification team costs'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Angie Holt', null, 'Student Records, Registration, and Support', 'Registration issue case resolution rate', 'Operational Outcomes', 'Speed', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Angie Holt')
     and lower(k.kpi_measure) = lower('Registration issue case resolution rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Angie Holt', null, 'Student Records, Registration, and Support', 'Registration issue case QA', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Angie Holt')
     and lower(k.kpi_measure) = lower('Registration issue case QA'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Angie Holt', null, 'Student Records, Registration, and Support', 'Registration issue case CSAT', 'Operational Outcomes', 'Quality', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Angie Holt')
     and lower(k.kpi_measure) = lower('Registration issue case CSAT'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, tracking_status)
select 'Angie Holt', null, 'Student Records, Registration, and Support', 'Registration team costs', 'Operational Outcomes', 'Cost', null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Angie Holt')
     and lower(k.kpi_measure) = lower('Registration team costs'));

commit;

-- ── check ─────────────────────────────────────────────────────────────────
-- Tracking must be unchanged; only the Not Tracking pool grows.
select tracking_status, count(*)
  from public.kpis group by tracking_status order by 1;
select count(*) as hub_scorecard_rows from public.v_hub_kpis;
