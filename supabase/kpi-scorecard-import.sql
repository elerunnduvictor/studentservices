-- ═══════════════════════════════════════════════════════════════════════════
--  THE KPI SCORECARD, COMPLETED
--
--  "Student Services KPIs.xlsx" — the "KPI ScoreCard" tab — holds 151 measures
--  across four departments. The database held 68, every one of them Records:
--  the other three departments had never been imported. 35 of the missing rows
--  are marked Tracking in the workbook, which is why every tracked KPI on the
--  hub belonged to a single team.
--
--  This inserts the 83 that are absent:
--
--      32  Enrollment & Retention
--      28  Digital Operations
--      23  Dean of Students
--
--  Every row is guarded on employee + measure, compared trimmed and
--  case-insensitively, so nothing already in the table is touched, duplicated
--  or overwritten — including a row a PM has since edited by hand. Re-running
--  inserts nothing.
--
--  Departments are written in the spelling every other table uses. The
--  workbook's shorthand is corrected on the existing rows in section 2.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. the measures that were never imported ──────────────────────────────
insert into public.kpis
  (employee, role, department, kpi_measure, kpi_category, category_type,
   data_availability, band_green, band_yellow, band_red, tracking_status,
   current_value, data_source, update_frequency, update_date,
   direction_hint, green_cutoff, red_cutoff)
  select 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'No material audit findings attributable to Dean of Students governance', 'Operational Outcomes', 'Quality', 'Data available', '0', '0', '≥1', 'Tracking', '0', 'Excel link', 'Monthly', '2026-08-03'::date, 'Lower is Better', '0', '1'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Steven K. Thomas'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('No material audit findings attributable to Dean of Students governance')))
union all
  select 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'No legal findings attributable to Dean of Students governance', 'Operational Outcomes', 'Quality', 'Data available', '0', '0', '≥1', 'Tracking', '0', 'Excel link', 'Monthly', '2026-08-03'::date, 'Lower is Better', '0', '1'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Steven K. Thomas'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('No legal findings attributable to Dean of Students governance')))
union all
  select 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'No accreditation findings attributable to Dean of Students governance', 'Operational Outcomes', 'Quality', 'Data available', '0', '0', '≥1', 'Tracking', '0', 'Excel link', 'Monthly', '2026-08-03'::date, 'Lower is Better', '0', '1'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Steven K. Thomas'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('No accreditation findings attributable to Dean of Students governance')))
union all
  select 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'Annual DOS budget', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Steven K. Thomas'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Annual DOS budget')))
union all
  select 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'Overall student satisfaction (primary)', 'Student Outcomes', 'Satisfaction', 'Data in report', '≥75%', '65% - 75%', '< 65%', 'Tracking', '0.69', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=58eb3239-b972-4ee8-8645-fcf195f36c96&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=02d230574060475bc0e4&pbi_source=appShareLink&portalSessionId=90e3d628-0853-431e-a924-80acd7dbd750', 'Term', '2026-07-15'::date, 'Higher is Better', '0.75', '0.65'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Steven K. Thomas'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Overall student satisfaction (primary)')))
union all
  select 'Anne Marie Clark', 'Associate Dean of Students', 'Dean of Students', 'Dean of Students response time', 'Operational Outcomes', 'Speed', 'Data available', '<5 days', '5 - 7 days', '>7 days', 'Tracking', '2 days', 'Excel link', 'Monthly', '2026-08-05'::date, 'Lower is Better', '5', '7'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Anne Marie Clark'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Dean of Students response time')))
union all
  select 'Anne Marie Clark', 'Associate Dean of Students', 'Dean of Students', 'Dean of Students resolution time', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Anne Marie Clark'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Dean of Students resolution time')))
union all
  select 'Anne Marie Clark', 'Associate Dean of Students', 'Dean of Students', 'Dean of Students services escalation rates', 'Operational Outcomes', 'Quality', 'Data available', null, null, null, 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Anne Marie Clark'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Dean of Students services escalation rates')))
union all
  select 'Anne Marie Clark', 'Associate Dean of Students', 'Dean of Students', 'Partner CSAT', 'Operational Outcomes', 'Quality', 'No data', null, null, null, 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Anne Marie Clark'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Partner CSAT')))
union all
  select 'Katelyn Ray', 'Student Honor & Conduct Coordinator', 'Dean of Students', 'Honor and Conduct response time', 'Operational Outcomes', 'Speed', 'Data available', '<5 days', '5 - 7 days', '>7 days', 'Tracking', '5 days', 'Excel link', 'Monthly', '2026-08-05'::date, 'Lower is Better', '5', '7'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Katelyn Ray'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Honor and Conduct response time')))
union all
  select 'Katelyn Ray', 'Student Honor & Conduct Coordinator', 'Dean of Students', 'Honor and Conduct resolution time', 'Operational Outcomes', 'Speed', 'No data', 'TBD', 'TBD', 'TBD', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Katelyn Ray'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Honor and Conduct resolution time')))
union all
  select 'Katelyn Ray', 'Student Honor & Conduct Coordinator', 'Dean of Students', 'Rate of repeat offenders', 'Operational Outcomes', 'Quality', 'Data available', '0.05', '0.15', '0.25', 'Tracking', '0.12', 'Excel link', 'Monthly', '2026-08-05'::date, 'Lower is Better', '0.05', '0.25'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Katelyn Ray'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Rate of repeat offenders')))
union all
  select 'Sandra Wurttele', 'Student Accessibility Coordinator', 'Dean of Students', 'Accommodation determination processing rate', 'Operational Outcomes', 'Speed', 'Data available', '<5 days', '5 - 7 days', '>7 days', 'Not Tracking', null, 'Excel link', 'Monthly', null, 'Lower is Better', '5', '7'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Sandra Wurttele'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Accommodation determination processing rate')))
union all
  select 'Sandra Wurttele', 'Student Accessibility Coordinator', 'Dean of Students', 'Accommodation resolution rate', 'Operational Outcomes', 'Speed', 'Data available', '<3 days', '3 - 6 days', '> 6 days', 'Not Tracking', null, 'Excel link', 'Monthly', null, 'Lower is Better', '3', '6'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Sandra Wurttele'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Accommodation resolution rate')))
union all
  select 'Sandra Wurttele', 'Student Accessibility Coordinator', 'Dean of Students', 'ADA and Section 504 standard compliance rate', 'Operational Outcomes', 'Quality', 'Data available', '-', '-', '-', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Sandra Wurttele'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('ADA and Section 504 standard compliance rate')))
union all
  select 'Sandra Wurttele', 'Student Accessibility Coordinator', 'Dean of Students', 'ADA and Section 504 Audit compliance rate', 'Operational Outcomes', 'Quality', 'Data available', '-', '-', '-', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Sandra Wurttele'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('ADA and Section 504 Audit compliance rate')))
union all
  select 'Ana De Castro', 'Student Belonging Coordinator', 'Dean of Students', 'Discrimination resolution rate', 'Operational Outcomes', 'Quality', 'Data available', '-', '-', '-', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ana De Castro'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Discrimination resolution rate')))
union all
  select 'Ana De Castro', 'Student Belonging Coordinator', 'Dean of Students', 'Student sentiment on belonging', 'Operational Outcomes', 'Quality', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ana De Castro'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Student sentiment on belonging')))
union all
  select 'Ana De Castro', 'Student Belonging Coordinator', 'Dean of Students', 'CSAT for Student Belonging', 'Operational Outcomes', 'Quality', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ana De Castro'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('CSAT for Student Belonging')))
union all
  select 'Ana De Castro', 'Student Belonging Coordinator', 'Dean of Students', '90% of non-member ecclesiastical endorsements completed with 14 days', 'Operational Outcomes', 'Speed', 'Speed', '< 90%', '80% - 90%', '< 80%', 'Tracking', '0.524', null, 'Monthly', null, 'Higher is Better', '0.9', '0.8'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ana De Castro'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('90% of non-member ecclesiastical endorsements completed with 14 days')))
union all
  select 'Helen Reboucas', 'Student Grievance Coordinator', 'Dean of Students', 'Student grievance case response time', 'Operational Outcomes', 'Speed', 'Speed', '<5 days', '5 - 7 days', '>7 days', 'Tracking', '0.7', 'Excel link', 'Monthly', null, 'Lower is Better', '5', '7'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Helen Reboucas'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Student grievance case response time')))
union all
  select 'Helen Reboucas', 'Student Grievance Coordinator', 'Dean of Students', 'Grievance QA', 'Operational Outcomes', 'Quality', 'Data available', '< 90%', '70% - 90%', '< 70%', 'Tracking', '0.9545', 'Excel link', 'Monthly', '2026-08-05'::date, 'Higher is Better', '0.9', '0.7'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Helen Reboucas'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Grievance QA')))
union all
  select 'Joseph Bentum', 'Student Crisis Coordinator', 'Dean of Students', 'Crisis response time', 'Operational Outcomes', 'Speed', 'Data available', '< 1 day', '1 - 2 days', '> 2 days', 'Tracking', '1 day', 'Excel link', 'Monthly', '2026-08-05'::date, 'Lower is Better', '24', '48'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Joseph Bentum'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Crisis response time')))
union all
  select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Overall Stakeholder CSAT', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, 'Monthly', null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Jacob Adams'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Overall Stakeholder CSAT')))
union all
  select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Digital Ops budget', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Jacob Adams'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Digital Ops budget')))
union all
  select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Costs saved by customers due to Digital Ops technologies (secondary)', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Jacob Adams'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Costs saved by customers due to Digital Ops technologies (secondary)')))
union all
  select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Overall student autonomy (secondary)', 'Student Outcomes', 'Student Autonomy', 'Data in report', '80-100%', '65-79%', '<65%', 'Tracking', '0.704', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=be2cacf8-fa52-4ce4-abf5-f9ee28fa66a6&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=90333e1e71861247c683&pbi_source=appShareLink&portalSessionId=78f4edc2-9814-43bc-bc67-b03ff6a08911', 'Term', null, 'Higher is Better', '0.8', '0.65'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Jacob Adams'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Overall student autonomy (secondary)')))
union all
  select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Overall student satisfaction (secondary)', 'Student Outcomes', 'Student Satisfaction', 'Data in report', '80-100%', '65-79%', '<65%', 'Tracking', '0.8261', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=58eb3239-b972-4ee8-8645-fcf195f36c96&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=02d230574060475bc0e4&pbi_source=appShareLink&portalSessionId=78f4edc2-9814-43bc-bc67-b03ff6a08911', 'Term', null, 'Higher is Better', '0.8', '0.65'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Jacob Adams'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Overall student satisfaction (secondary)')))
union all
  select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'App start-to-registration yield (secondary)', 'Student Outcomes', 'Completion', 'Data in report', '80-100%', '65-79%', '<65%', 'Tracking', '0.6516', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=27ea7bdf-aa28-4e92-98c9-89ecc9455740&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=f2a14ebbd5968172a5bb&pbi_source=appShareLink&portalSessionId=78f4edc2-9814-43bc-bc67-b03ff6a08911', 'Term', null, 'Higher is Better', '0.8', '0.65'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Jacob Adams'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('App start-to-registration yield (secondary)')))
union all
  select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'PC Completion Rate (secondary)', 'Student Outcomes', 'Completion', 'Data in report', '>45%', '30-44%', '<30%', 'Tracking', '0.31', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=4679386d-8e13-43fa-9be7-6c5c504ce07a&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=004a8c4d49c762e03b5d&pbi_source=appShareLink&portalSessionId=78f4edc2-9814-43bc-bc67-b03ff6a08911', 'Term', null, 'Higher is Better', '0.4', '0.3'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Jacob Adams'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('PC Completion Rate (secondary)')))
union all
  select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'First Certificate Completion Rate (secondary)', 'Student Outcomes', 'Completion', 'Data in report', '>40%', '30-39%', '<30%', 'Tracking', '0.327', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=4679386d-8e13-43fa-9be7-6c5c504ce07a&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=004a8c4d49c762e03b5d&pbi_source=appShareLink&portalSessionId=78f4edc2-9814-43bc-bc67-b03ff6a08911', 'Quarterly', null, 'Higher is Better', '0.4', '0.3'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Jacob Adams'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('First Certificate Completion Rate (secondary)')))
union all
  select 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'Team meeting project deadlines rate', 'Operational Outcomes', 'Speed', null, null, null, null, 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ricky Kailiponi Jr.'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Team meeting project deadlines rate')))
union all
  select 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'Companion feature C-Sat', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '75-84%', '<75%', 'Tracking', '0.9', 'Usage - Companion App - Power BI', 'Monthly', null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ricky Kailiponi Jr.'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Companion feature C-Sat')))
union all
  select 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'Companion usage rates', 'Student Outcomes', 'Student Autonomy', 'Data in report', '75-100%', '50-74%', '<50%', 'Tracking', '0.93', 'Usage - Companion App - Power BI', 'Term', null, 'Higher is Better', '0.75', '0.5'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ricky Kailiponi Jr.'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Companion usage rates')))
union all
  select 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'Companion C-Sat', 'Student Outcomes', 'Student Satisfaction', 'Data in report', '85-100%', '75-84%', '<75%', 'Tracking', '0.87', 'Usage - Companion App - Power BI', 'Monthly', null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ricky Kailiponi Jr.'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Companion C-Sat')))
union all
  select 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'AI retention effect', 'Student Outcomes', 'Completion', 'Data available', '>4%', '2-3%', '0.01', 'Not Tracking', null, null, null, null, 'Higher is Better', '4', '1'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ricky Kailiponi Jr.'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('AI retention effect')))
union all
  select 'Joshua Stafford Hadden', 'Operational Research & Reporting Manager', 'Digital Operations', 'Team meeting project timelines rate', 'Operational Outcomes', 'Speed', null, null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Joshua Stafford Hadden'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Team meeting project timelines rate')))
union all
  select 'Joshua Stafford Hadden', 'Operational Research & Reporting Manager', 'Digital Operations', 'Stakeholder CSAT on team''s projects', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Joshua Stafford Hadden'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Stakeholder CSAT on team''s projects')))
union all
  select 'Joshua Stafford Hadden', 'Operational Research & Reporting Manager', 'Digital Operations', 'Cost reductions in service areas (secondary)', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Joshua Stafford Hadden'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Cost reductions in service areas (secondary)')))
union all
  select 'David Peck', 'Operational Data Analyst', 'Digital Operations', 'Project delivery on time rate', 'Operational Outcomes', 'Speed', null, null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('David Peck'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Project delivery on time rate')))
union all
  select 'David Peck', 'Operational Data Analyst', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('David Peck'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Stakeholder CSAT - communication, quality of work, impact')))
union all
  select 'Pelenatita Neiufi', 'Reporting & Evaluation Coordinator', 'Digital Operations', 'Project delivery on time rate', 'Operational Outcomes', 'Speed', null, null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Pelenatita Neiufi'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Project delivery on time rate')))
union all
  select 'Pelenatita Neiufi', 'Reporting & Evaluation Coordinator', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Pelenatita Neiufi'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Stakeholder CSAT - communication, quality of work, impact')))
union all
  select 'Victor Lamôni Calado Ferreira', 'System & Operations Associate Registrar
(title change)', 'Digital Operations', 'Project delivery on time rate', 'Operational Outcomes', 'Speed', null, null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Victor Lamôni Calado Ferreira'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Project delivery on time rate')))
union all
  select 'Victor Lamôni Calado Ferreira', 'System & Operations Associate Registrar
(title change)', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Victor Lamôni Calado Ferreira'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Stakeholder CSAT - communication, quality of work, impact')))
union all
  select 'John Ayinde', 'D365 & Automation Manager', 'Digital Operations', 'Stakeholder CSAT - timeliness per project', 'Operational Outcomes', 'Speed', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('John Ayinde'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Stakeholder CSAT - timeliness per project')))
union all
  select 'John Ayinde', 'D365 & Automation Manager', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('John Ayinde'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Stakeholder CSAT - communication, quality of work, impact')))
union all
  select 'Samuel Riveros', 'Companion & Special Projects Manager', 'Digital Operations', 'Stakeholder CSAT - timeliness per project', 'Operational Outcomes', 'Speed', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Samuel Riveros'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Stakeholder CSAT - timeliness per project')))
union all
  select 'Samuel Riveros', 'Companion & Special Projects Manager', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Samuel Riveros'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Stakeholder CSAT - communication, quality of work, impact')))
union all
  select 'Aitana Toscano', 'Data Manager', 'Digital Operations', 'Stakeholder CSAT - timeliness per project', 'Operational Outcomes', 'Speed', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Aitana Toscano'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Stakeholder CSAT - timeliness per project')))
union all
  select 'Aitana Toscano', 'Data Manager', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Aitana Toscano'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Stakeholder CSAT - communication, quality of work, impact')))
union all
  select 'Alison Cundiff', 'Director of Enrollment & Retention', 'Enrollment & Retention', 'Enrollment & Retention budget', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Alison Cundiff'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Enrollment & Retention budget')))
union all
  select 'Alison Cundiff', 'Director of Enrollment & Retention', 'Enrollment & Retention', 'Overall student autonomy (secondary)', 'Student Outcomes', 'Student Autonomy', 'Data in report', '≥85%', '80% - 85%', '< 80%', 'Tracking', '0.906', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=be2cacf8-fa52-4ce4-abf5-f9ee28fa66a6&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=90333e1e71861247c683&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', null, null, 'Higher is Better', '0.85', '0.8'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Alison Cundiff'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Overall student autonomy (secondary)')))
union all
  select 'Alison Cundiff', 'Director of Enrollment & Retention', 'Enrollment & Retention', 'Overall student satisfaction (secondary)', 'Student Outcomes', 'Student Satisfaction', 'Data in report', '≥75%', '65% - 75%', '< 65%', 'Tracking', '0.69', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=58eb3239-b972-4ee8-8645-fcf195f36c96&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=02d230574060475bc0e4&pbi_source=appShareLink&portalSessionId=90e3d628-0853-431e-a924-80acd7dbd750', 'Term', null, 'Higher is Better', '0.75', '0.65'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Alison Cundiff'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Overall student satisfaction (secondary)')))
union all
  select 'Katelyn Graf', 'Senior Manager of Retention', 'Enrollment & Retention', 'PC Completion Rate', 'Student Outcomes', 'Completion', 'Data in report', '>45%', '30-44%', '<30%', 'Tracking', '0.311', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=4679386d-8e13-43fa-9be7-6c5c504ce07a&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=004a8c4d49c762e03b5d&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', null, null, 'Higher is Better', '0.45', '0.3'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Katelyn Graf'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('PC Completion Rate')))
union all
  select 'Katelyn Graf', 'Senior Manager of Retention', 'Enrollment & Retention', 'First Certificate Completion Rate', 'Student Outcomes', 'Completion', 'Data in report', '>40%', '30-39%', '<30%', 'Tracking', '0.328', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=4679386d-8e13-43fa-9be7-6c5c504ce07a&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=004a8c4d49c762e03b5d&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', null, null, 'Higher is Better', '0.4', '0.3'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Katelyn Graf'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('First Certificate Completion Rate')))
union all
  select 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Mentor required action completion rate', 'Operational Outcomes', 'Speed', 'Data in report', '95-100%', '85-94%', '<85%', 'Tracking', '0.99', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=8b8c6aa8-361e-4ed7-8018-ac9b625ec004&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=8dd6568b0dc02796db27&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.95', '0.85'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Kelley Richardson'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Mentor required action completion rate')))
union all
  select 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Mentor interaction QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', '<70%', 'Tracking', '0.95', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=cb2ce85e-73e7-4234-8d3b-dd2fc9744649&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=404ac9b71b3c0ac70d20&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.85', '0.7'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Kelley Richardson'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Mentor interaction QA')))
union all
  select 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Mentor CSAT', 'Student Outcomes', 'Student Satisfaction', 'Data in report', '85-100%', '70-84%', '<70%', 'Tracking', '0.9', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=e2b5b9d8-0b16-4185-9213-61b41d61c157&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=ReportSectionf20578b2c846b75ef80e&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.85', '0.7'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Kelley Richardson'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Mentor CSAT')))
union all
  select 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Retention rate contribution by mentors', 'Student Outcomes', 'Completion', 'No data', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Kelley Richardson'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Retention rate contribution by mentors')))
union all
  select 'Mandy Schwab', 'Mentoring Content Coordinator', 'Enrollment & Retention', 'Mentor interaction QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', '<70%', 'Tracking', '0.95', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=cb2ce85e-73e7-4234-8d3b-dd2fc9744649&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=404ac9b71b3c0ac70d20&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.85', '0.7'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Mandy Schwab'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Mentor interaction QA')))
union all
  select 'Mandy Schwab', 'Mentoring Content Coordinator', 'Enrollment & Retention', 'Mentor CSAT', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', '<70%', 'Tracking', '0.9', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=e2b5b9d8-0b16-4185-9213-61b41d61c157&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=ReportSectionf20578b2c846b75ef80e&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.85', '0.7'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Mandy Schwab'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Mentor CSAT')))
union all
  select 'Joanna Relkin', 'Mentor Operations Coordinator', 'Enrollment & Retention', 'Mentor required action completion rate', 'Operational Outcomes', 'Speed', 'Data in report', '95-100%', '85-94%', '<85%', 'Tracking', '0.99', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=8b8c6aa8-361e-4ed7-8018-ac9b625ec004&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=8dd6568b0dc02796db27&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.95', '0.85'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Joanna Relkin'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Mentor required action completion rate')))
union all
  select 'Joanna Relkin', 'Mentor Operations Coordinator', 'Enrollment & Retention', 'Mentor concern case QA', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '70-84%', '<70%', 'Tracking', '0.895', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=1d513597-8eb5-4912-8692-96ff2a683a51&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=0209ae92d2720717522a&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Monthly', null, 'Higher is Better', '0.85', '0.7'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Joanna Relkin'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Mentor concern case QA')))
union all
  select 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Reduction of enrollment related support cases', 'Student Outcomes', 'Student Autonomy', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Trevor Shelton'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Reduction of enrollment related support cases')))
union all
  select 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Reduction of admissions tier 2 support cases', 'Student Outcomes', 'Student Autonomy', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Trevor Shelton'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Reduction of admissions tier 2 support cases')))
union all
  select 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'App start-to-registration yield', 'Student Outcomes', 'Completion', 'Data in report', '75-100%', '60-74%', '<60%', 'Tracking', '0.6661', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=27ea7bdf-aa28-4e92-98c9-89ecc9455740&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=f2a14ebbd5968172a5bb&pbi_source=appShareLink&portalSessionId=04e4cd1a-8779-483e-a338-581068ced021', null, null, 'Higher is Better', '0.75', '0.6'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Trevor Shelton'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('App start-to-registration yield')))
union all
  select 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Registration to auto-drop yield', 'Student Outcomes', 'Completion', 'Data in report', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Trevor Shelton'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Registration to auto-drop yield')))
union all
  select 'Rachel Kirk', 'Enrollment Counseling Manager', 'Enrollment & Retention', 'Enrollment Counseling required action completion rate', 'Operational Outcomes', 'Speed', 'Data available', '95-100%', '85-94%', '<85%', 'Tracking', '0.98', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=7177fab9-23b0-4184-8f31-f0db822282c0&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=ReportSection964c860de430a5035bab&pbi_source=appShareLink&portalSessionId=04e4cd1a-8779-483e-a338-581068ced021', null, null, 'Higher is Better', '0.95', '0.85'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Rachel Kirk'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Enrollment Counseling required action completion rate')))
union all
  select 'Rachel Kirk', 'Enrollment Counseling Manager', 'Enrollment & Retention', 'Enrollment Counseling contact rate by alert', 'Operational Outcomes', 'Speed', 'No data', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Rachel Kirk'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Enrollment Counseling contact rate by alert')))
union all
  select 'Rachel Kirk', 'Enrollment Counseling Manager', 'Enrollment & Retention', 'Enrollment Counseling CSAT rate', 'Operational Outcomes', 'Quality', 'Data in report', '90-100%', '75-89%', '<75%', 'Tracking', '0.9239', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=d0f58bce-3a7d-49b6-80a3-eade14ab09fc&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=e3ff97a21eaacb03dbca&pbi_source=appShareLink&portalSessionId=04e4cd1a-8779-483e-a338-581068ced021', null, null, 'Higher is Better', '0.9', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Rachel Kirk'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Enrollment Counseling CSAT rate')))
union all
  select 'Rachel Kirk', 'Enrollment Counseling Manager', 'Enrollment & Retention', 'Enrollment Counseling yield contribution', 'Operational Outcomes', 'Quality', 'No data', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Rachel Kirk'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Enrollment Counseling yield contribution')))
union all
  select 'Kimarie Howard', 'Enrollment Counseling Development and Performance Coordinator', 'Enrollment & Retention', 'Enrollment Counseling CSAT rate', 'Operational Outcomes', 'Quality', 'Data in report', '90-100%', '75-89%', '<75%', 'Tracking', '0.9239', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=d0f58bce-3a7d-49b6-80a3-eade14ab09fc&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=e3ff97a21eaacb03dbca&pbi_source=appShareLink&portalSessionId=04e4cd1a-8779-483e-a338-581068ced021', null, null, 'Higher is Better', '0.9', '0.75'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Kimarie Howard'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Enrollment Counseling CSAT rate')))
union all
  select 'Kimarie Howard', 'Enrollment Counseling Development and Performance Coordinator', 'Enrollment & Retention', 'Enrollment Counseling yield contribution', 'Operational Outcomes', 'Quality', 'No data', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Kimarie Howard'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Enrollment Counseling yield contribution')))
union all
  select 'Megan Niblett', 'Enrollment Counseling Operations Coordinator', 'Enrollment & Retention', 'Enrollment Counseling required action completion rate', 'Operational Outcomes', 'Speed', 'Data available', '95-100%', '85-94%', '<85%', 'Tracking', '0.98', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=7177fab9-23b0-4184-8f31-f0db822282c0&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=ReportSection964c860de430a5035bab&pbi_source=appShareLink&portalSessionId=04e4cd1a-8779-483e-a338-581068ced021', null, null, 'Higher is Better', '0.95', '0.85'
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Megan Niblett'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Enrollment Counseling required action completion rate')))
union all
  select 'Megan Niblett', 'Enrollment Counseling Operations Coordinator', 'Enrollment & Retention', 'Enrollment Counseling contact rate by alert', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Megan Niblett'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Enrollment Counseling contact rate by alert')))
union all
  select 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Transfer evaluation processing rate', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Shaunasee Janette James'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Transfer evaluation processing rate')))
union all
  select 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Transfer evaluation case resolution rate', 'Operational Outcomes', 'Speed', 'Data available', '90-100%', '80-90%', '< 80%', 'Not Tracking', '0.7052023121387283', 'Link', null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Shaunasee Janette James'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Transfer evaluation case resolution rate')))
union all
  select 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Reduction of transfer evaluation cases', 'Operational Outcomes', 'Quality', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Shaunasee Janette James'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Reduction of transfer evaluation cases')))
union all
  select 'Ely Zmolek', 'Enrollment Services Specialist', 'Enrollment & Retention', 'Application processing rate', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ely Zmolek'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Application processing rate')))
union all
  select 'Ely Zmolek', 'Enrollment Services Specialist', 'Enrollment & Retention', 'Application manual review turnaround rate', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ely Zmolek'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Application manual review turnaround rate')))
union all
  select 'Ely Zmolek', 'Enrollment Services Specialist', 'Enrollment & Retention', 'Reduction of admissions support cases', 'Operational Outcomes', 'Quality', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ely Zmolek'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Reduction of admissions support cases')))
union all
  select 'Ely Zmolek', 'Enrollment Services Specialist', 'Enrollment & Retention', 'Admissions case resolution rate', 'Operational Outcomes', 'Quality', 'Data available', '90-100%', '80-90%', '< 80%', 'Not Tracking', '0.8643533123028391', 'Link', null, null, 'Manual', null, null
   where not exists (select 1 from public.kpis k
     where lower(btrim(k.employee))    = lower(btrim('Ely Zmolek'))
       and lower(btrim(k.kpi_measure)) = lower(btrim('Admissions case resolution rate')));

-- ── 2. one name for one department ────────────────────────────────────────
-- The workbook writes Records as "Records, Registration, Support"; every other
-- table writes "Student Records, Registration, and Support". Two spellings made
-- the scorecard group one team as two, and any filter by department matched
-- only half of it.
update public.kpis
   set department = 'Student Records, Registration, and Support'
 where department = 'Records, Registration, Support';

-- ── 3. one value the database was missing ─────────────────────────────────
-- Every one of the 151 workbook rows was compared against the database across
-- fifteen fields — 2,265 comparisons — and exactly one differed: this measure
-- is marked Tracking and carries a value in the workbook, and the database had
-- none.
--
-- Written only because the database is *empty* here. A value that disagreed
-- with the workbook would be left alone: that is a PM's edit or a later
-- reading, and this file has no business deciding which of the two is right.
update public.kpis
   set current_value = '0.988'
 where lower(btrim(employee)) = lower(btrim('Kari Johnson'))
   and lower(btrim(kpi_measure)) like lower(btrim('Autonomy for student registration')) || '%'
   and (current_value is null or btrim(current_value) = '');

commit;

-- ── what the table holds now ──────────────────────────────────────────────
select department,
       count(*)                                                           as measures,
       count(*) filter (where lower(btrim(tracking_status)) = 'tracking')  as tracked
  from public.kpis
 group by department
 order by department;
