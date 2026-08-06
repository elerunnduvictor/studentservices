-- ═══════════ PATCH 05 — PERFORMANCE STANDARDS ═══════════
--
-- The last page still reading a checked-in data file. It maps every Student
-- Services service to the accreditation sub-standards it satisfies, with a
-- steward, evidence, key metric and review cadence.
--
-- Three tables because the data has three shapes: the headings, the service
-- rows inside them, and the key-metric → Power BI lookup. The intro paragraph
-- goes in a small key/value table so it can be reworded without a deploy.
--
-- Run after patch-04. Safe to re-run.

begin;

-- ── site text a PM can edit without a deploy ──────────────────────────────
create table if not exists public.app_text (
  key        text primary key,
  value      text not null,
  note       text,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ── the twelve headings ───────────────────────────────────────────────────
create table if not exists public.performance_sections (
  id          bigserial primary key,
  section_key text not null unique,      -- slug used as the anchor in the page
  title       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- ── the service rows inside each heading ──────────────────────────────────
create table if not exists public.performance_services (
  id          bigserial primary key,
  section_key text not null references public.performance_sections(section_key)
                on update cascade on delete cascade,
  sort_order  integer not null default 0,
  service     text not null,
  standards   text[] not null default '{}',   -- e.g. {1.B.1, 2.G.1}
  stewards    text[] not null default '{}',
  evidence    text,
  key_metrics text,
  cadence     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);
-- No index on (section_key, sort_order): at 56 rows Postgres sequentially scans
-- and sorts in memory regardless, so one would be write overhead that never
-- earns its keep. Add it if this ever grows by an order of magnitude.

-- ── key metric → dashboard ────────────────────────────────────────────────
-- `has_report = false` records a metric the team has deliberately parked, so
-- the page can say "no report for now" rather than silently showing plain text.
create table if not exists public.performance_metric_links (
  metric     text primary key,
  url        text,
  has_report boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ── plumbing: same touch/audit/RLS treatment as every other table ─────────
do $$
declare
  t     text;
  nm    text;
  names text[];
  -- "the signed-in caller is on the editor list". The auth call sits in a
  -- sub-select of its own so it stores as `( SELECT auth.jwt() AS jwt)`, which
  -- is the shape Supabase's RLS advisor looks for — see schema.sql for why the
  -- parenthesis placement is what gets read.
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
begin
  foreach t in array array['app_text', 'performance_sections',
                           'performance_services', 'performance_metric_links']
  loop
    execute format('drop trigger if exists %1$s_touch on public.%1$s;
      create trigger %1$s_touch before update on public.%1$s
        for each row execute function public.touch_row();', t);

    execute format('drop trigger if exists %1$s_audit on public.%1$s;
      create trigger %1$s_audit after insert or update or delete on public.%1$s
        for each row execute function public.record_change();', t);

    -- exactly one policy per action; two permissive ones would both run
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
  end loop;
end;
$$;

-- ── load ──────────────────────────────────────────────────────────────────
truncate public.performance_services, public.performance_sections restart identity cascade;
truncate public.performance_metric_links;

insert into public.app_text (key, value, note) values
  ('performance_standards_intro', 'This appendix preserves all original services and adds stewardship, evidence, key metrics, and cadence of review.  References use full sub-standard granularity (2020 standards).', 'Paragraph under the Performance Standards heading')
on conflict (key) do update set value = excluded.value;

insert into public.performance_sections (section_key, title, sort_order) values
  ('student-support-center-help-desk', 'Student Support Center & Help Desk', 1),
  ('student-advising-mentoring', 'Student Advising & Mentoring', 2),
  ('admissions-enrollment-services', 'Admissions & Enrollment Services', 3),
  ('registration-academic-records', 'Registration & Academic Records', 4),
  ('transcripts', 'Transcripts', 5),
  ('academic-administrative-grievances', 'Academic & Administrative Grievances', 6),
  ('dean-of-students-student-conduct', 'Dean of Students & Student Conduct', 7),
  ('academic-exceptions-accommodations', 'Academic Exceptions & Accommodations', 8),
  ('student-portal-technology-services', 'Student Portal & Technology Services', 9),
  ('career-alumni-services', 'Career & Alumni Services', 10),
  ('communications-required-disclosures', 'Communications & Required Disclosures', 11),
  ('institutional-research-reporting-quality-assurance', 'Institutional Research, Reporting & Quality Assurance', 12)
on conflict (section_key) do update set title = excluded.title, sort_order = excluded.sort_order;

insert into public.performance_services (section_key, sort_order, service, standards, stewards, evidence, key_metrics, cadence) values
  ('student-support-center-help-desk', 1, 'Centralized student help center and ticket system', '{"1.B.1","2.G.1","2.G.2"}', '{"Student services VP"}', 'Support system', 'Ticket volume, CSAT', 'Per academic term'),
  ('student-support-center-help-desk', 2, 'Knowledge-base routing of support inquiries', '{"1.B.1","2.G.1","2.G.2"}', '{"Student services VP"}', 'KB repository', 'Routing accuracy', 'Annual QA audit'),
  ('student-support-center-help-desk', 3, 'Chat-based student support (automated and live)', '{"2.G.7","2.G.1","2.G.2"}', '{"CIO","Student services"}', 'Chat analytics', 'Response time', 'Quarterly review'),
  ('student-support-center-help-desk', 4, 'Phone support for U.S. and Canada students', '{"2.G.1","2.G.2"}', '{"Student services VP"}', 'Call logs', 'Wait time', 'Ongoing dashboard monitoring'),
  ('student-support-center-help-desk', 5, 'Online support workflows for international students', '{"2.G.1","2.G.2"}', '{"Student services VP"}', 'Support flows', 'Usage volume', 'Per term'),
  ('student-advising-mentoring', 1, 'Peer mentoring support', '{"1.A","1.D.1","2.G.1","2.G.2"}', '{"Student services VP"}', 'Mentor data', 'Retention correlation', 'Per term'),
  ('student-advising-mentoring', 2, 'Academic advising for degree planning and progression', '{"1.C.1","1.D.1","2.G.6"}', '{"Student services Director"}', 'Advising logs', 'Student satisfaction', 'Per term'),
  ('student-advising-mentoring', 3, 'Escalation of complex advising cases', '{"1.C.1","2.G.6"}', '{"Student services Director"}', 'Escalation records', 'Escalation rate', 'Per term'),
  ('student-advising-mentoring', 4, 'Monitoring of student milestones', '{"1.D.1"}', '{"RET"}', 'Dashboard', 'Retention metrics', 'Per term'),
  ('student-advising-mentoring', 5, 'Mentoring-to-advising handoff', '{"1.C.1","1.D.1","2.G.6"}', '{"Student services Director"}', 'Workflow data', 'Transition success rate', 'Per term'),
  ('admissions-enrollment-services', 1, 'Unified admissions application management', '{"1.A.1","2.C.1"}', '{"Registrar"}', 'Application system', 'Conversion rate', 'Per term'),
  ('admissions-enrollment-services', 2, 'Eligibility determination for entry pathways', '{"1.A.1","2.C.1"}', '{"Admissions"}', 'Admissions reports', 'Accuracy rate', 'Annual audit'),
  ('admissions-enrollment-services', 3, 'Verification of PW Connect completion', '{"1.D.1","2.C.3"}', '{"Registrar"}', 'Matriculation data', 'Matriculation %', 'Per term'),
  ('admissions-enrollment-services', 4, 'Enrollment counseling', '{"1.A.1","2.G.1","2.G.2"}', '{"Student services VP"}', 'Counsel logs', 'Conversion effectiveness', 'Per term'),
  ('admissions-enrollment-services', 5, 'Registrar coordination for enrollment changes', '{"2.A","2.C.3"}', '{"Registrar"}', 'Coordination logs', 'Adjustment volume', 'Per term'),
  ('registration-academic-records', 1, 'Course registration and add/drop support', '{"1.C.1","2.G.6"}', '{"Registrar"}', 'Registration system', 'Access success rate', 'Per term'),
  ('registration-academic-records', 2, 'Graduation processing and degree verification', '{"1.D.1","2.C.3"}', '{"Registrar"}', 'Graduation reports', 'Completion rate', 'Per term'),
  ('registration-academic-records', 3, 'Enrollment verification services', '{"2.C.3"}', '{"Registrar"}', 'Verification logs', 'Request volume', 'Per term'),
  ('registration-academic-records', 4, 'International graduation letters', '{"2.C.3"}', '{"Registrar"}', 'Letter logs', 'Issuance count', 'Per term'),
  ('registration-academic-records', 5, 'Catalog and program plan maintenance', '{"1.C.1","2.C.1"}', '{"Curriculum Director"}', 'Catalog', 'Update completeness', 'Annual review'),
  ('registration-academic-records', 6, 'Multi-language award support', '{"1.C.1","2.G.1","2.G.2"}', '{"Registrar"}', 'Program data', 'Completion rate', 'Per term'),
  ('transcripts', 1, 'Transcript request processing', '{"2.C.3"}', '{"Registrar"}', 'Transcript queue', 'Volume', 'Per term'),
  ('transcripts', 2, 'Transcript accuracy verification', '{"2.C.3"}', '{"Registrar"}', 'Audit checks', 'Accuracy rate', 'Continuous with annual audit'),
  ('transcripts', 3, 'Issuance of official transcripts', '{"2.C.3"}', '{"Registrar"}', 'Transcript system', 'Turnaround time', 'Ongoing'),
  ('transcripts', 4, 'Transcript metric tracking', '{"1.B.1"}', '{"RET"}', 'Dashboard', 'Processing metrics', 'Per term'),
  ('academic-administrative-grievances', 1, 'Academic grievance processing', '{"1.C.1","2.A"}', '{"Student services"}', 'Grievance logs', 'Case volume', 'Per term'),
  ('academic-administrative-grievances', 2, 'Routing grievances to BYU-Idaho partners', '{"2.A"}', '{"Student services"}', 'Routing records', 'Routing time', 'Per term'),
  ('academic-administrative-grievances', 3, 'Administrative grievance management', '{"2.C.2","2.G.1","2.G.2"}', '{"Student services"}', 'CRM', 'Resolution rate', 'Per term'),
  ('academic-administrative-grievances', 4, 'Grievance record retention', '{"2.C.3"}', '{"Registrar"}', 'Records', 'Record completeness', 'Annual audit'),
  ('dean-of-students-student-conduct', 1, 'Student conduct case routing', '{"1.D.1","2.G.1","2.G.2"}', '{"Dean of Students"}', 'CRM', 'Case volume', 'Per term'),
  ('dean-of-students-student-conduct', 2, 'Privacy-controlled conduct forms', '{"2.C.2"}', '{"Dean of Students"}', 'Forms', 'Compliance adherence', 'Annual audit'),
  ('dean-of-students-student-conduct', 3, 'Secure conduct record repository', '{"2.C.3"}', '{"Registrar"}', 'Repository', 'Security compliance', 'Annual review'),
  ('academic-exceptions-accommodations', 1, 'Academic exception processing', '{"1.C.1","2.G.1","2.G.2"}', '{"Student services"}', 'Exception system', 'Volume', 'Per term'),
  ('academic-exceptions-accommodations', 2, 'Joint exception adjudication committees', '{"2.A"}', '{"Committee"}', 'Records', 'Decision turnaround', 'Per term'),
  ('academic-exceptions-accommodations', 3, 'Secure documentation storage', '{"2.C.3"}', '{"Registrar"}', 'Reach', 'Compliance rate', 'Annual audit'),
  ('student-portal-technology-services', 1, 'Student portal operations', '{"2.G.7"}', '{"CIO"}', 'Portal analytics', 'Usage', 'Per term'),
  ('student-portal-technology-services', 2, 'Portal access for students and mentors', '{"2.G.7"}', '{"CIO"}', 'Access logs', 'Access success rate', 'Per term'),
  ('student-portal-technology-services', 3, 'Analytics-based portal monitoring', '{"1.B.1"}', '{"Technology Council"}', 'Analytics', 'System performance', 'Quarterly'),
  ('student-portal-technology-services', 4, 'Low-bandwidth learning tools', '{"2.G.7"}', '{"Technology Council"}', 'Tools', 'Adoption rate', 'Annual'),
  ('career-alumni-services', 1, 'Resume and interview preparation tools', '{"1.A.1","1.D.1"}', '{"Student services"}', 'Usage', 'Engagement rate', 'Per term'),
  ('career-alumni-services', 2, 'Career preparation webinars', '{"1.D.1"}', '{"Student services"}', 'Logs', 'Attendance', 'Per event / term'),
  ('career-alumni-services', 3, 'Employment opportunity sharing', '{"1.D.1"}', '{"Student services"}', 'Listings', 'Placement rate', 'Per term'),
  ('career-alumni-services', 4, 'Alumni outcomes tracking', '{"1.B.1","1.D.1"}', '{"RET"}', 'Survey data', 'Employment outcomes', 'Annual'),
  ('career-alumni-services', 5, 'Curriculum-to-career alignment coordination', '{"1.C.1"}', '{"Curriculum Council"}', 'Reports', 'Alignment effectiveness', 'Annual'),
  ('communications-required-disclosures', 1, 'FERPA and required disclosures', '{"2.C.2"}', '{"Compliance"}', 'FERPA reports', 'Completion rate (FERPA)', 'Annual'),
  ('communications-required-disclosures', 2, 'Mass student communications', '{"2.C.2","2.G.1","2.G.2"}', '{"Communications"}', 'Email system', 'Delivery & engagement', 'Per term'),
  ('communications-required-disclosures', 3, 'Partner disclosure coordination', '{"2.C.2"}', '{"Compliance"}', 'Reports', 'Compliance status', 'Annual'),
  ('communications-required-disclosures', 4, 'Program and degree communications', '{"1.A.1"}', '{"Communications"}', 'Web/email', 'Engagement metrics', 'Per term'),
  ('institutional-research-reporting-quality-assurance', 1, 'Institutional data sharing', '{"1.B.1"}', '{"RET"}', 'Warehouse', 'Data completeness', 'Per term'),
  ('institutional-research-reporting-quality-assurance', 2, 'Regulatory reporting support (IPEDS)', '{"2.C.3"}', '{"RET"}', 'Reports', 'Submission compliance', 'Annual'),
  ('institutional-research-reporting-quality-assurance', 3, 'Student survey administration', '{"1.B.1"}', '{"RET"}', 'Survey tools', 'Response rates', 'Per term'),
  ('institutional-research-reporting-quality-assurance', 4, 'Enrollment forecasting support', '{"1.B.1"}', '{"RET"}', 'Models', 'Forecast accuracy', 'Annual'),
  ('institutional-research-reporting-quality-assurance', 5, 'Service metric tracking', '{"1.B.1"}', '{"RET"}', 'Dashboards', 'KPI performance', 'Per term'),
  ('institutional-research-reporting-quality-assurance', 6, 'Student satisfaction (CSAT) tracking', '{"1.B.1"}', '{"RET"}', 'CSAT', 'Satisfaction scores', 'Per term'),
  ('institutional-research-reporting-quality-assurance', 7, 'Aggregate metric sharing with BYU-Idaho', '{"1.B.1"}', '{"RET"}', 'Dashboards', 'Reporting completeness', 'Per term'),
  ('institutional-research-reporting-quality-assurance', 8, 'QA scorecard maintenance', '{"1.B.1"}', '{"RET"}', 'QA reports', 'QA scores', 'Per term');

insert into public.performance_metric_links (metric, url, has_report) values
  ('Ticket volume, CSAT', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=ded010d1-96ef-4e1f-9b5b-7c876d8c2e30&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=31a72180304346cc05d3&pbi_source=appShareLink&portalSessionId=a19dddfe-31b5-4020-bcd4-0620a238202c', true),
  ('CSAT', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=d33f81f8-e7c1-4ef1-bd54-b3306755acc7&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=ReportSection&pbi_source=appShareLink&portalSessionId=a19dddfe-31b5-4020-bcd4-0620a238202c', true),
  ('Wait time', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/ec6a4f4305973947e908?experience=power-bi&clientSideAuth=0', true),
  ('Student satisfaction', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=1959dda2-b631-461b-826b-ca1c46ac3195&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=02d230574060475bc0e4&pbi_source=appShareLink&portalSessionId=a19dddfe-31b5-4020-bcd4-0620a238202c', true),
  ('Retention metrics', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=44a0175b-f24b-4013-9ca5-657b8a780e24&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=6fe825e133e88e090118&pbi_source=appShareLink&portalSessionId=a19dddfe-31b5-4020-bcd4-0620a238202c', true),
  ('Completion rate', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=022c079f-9333-427a-b493-0bff722f40b4&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=e7b34724620e78523ae5&pbi_source=appShareLink&portalSessionId=a19dddfe-31b5-4020-bcd4-0620a238202c', true),
  ('KPI performance', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/b4d8ef5765577cbc2e57?experience=power-bi&clientSideAuth=0', true),
  ('Satisfaction scores', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=1959dda2-b631-461b-826b-ca1c46ac3195&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=02d230574060475bc0e4&pbi_source=appShareLink&portalSessionId=a19dddfe-31b5-4020-bcd4-0620a238202c', true),
  ('QA scores', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/4c2855c01a3caaf171d0?experience=power-bi&clientSideAuth=0', true),
  ('Conversion rate', null, false),
  ('Conversion effectiveness', null, false),
  ('Turnaround time', null, false),
  ('Processing metrics', null, false)
on conflict (metric) do update set url = excluded.url, has_report = excluded.has_report;

-- ── what the page reads ───────────────────────────────────────────────────
-- Services are nested under their section so the renderer receives exactly the
-- shape it already expected.
create or replace view public.v_hub_performance_sections as
  select s.section_key as id, s.title, s.sort_order as index,
         coalesce(
           (select json_agg(json_build_object(
                      'service',    v.service,
                      'standards',  v.standards,
                      'stewards',   v.stewards,
                      'evidence',   v.evidence,
                      'keyMetrics', v.key_metrics,
                      'cadence',    v.cadence
                    ) order by v.sort_order, v.id)
              from public.performance_services v
             where v.section_key = s.section_key),
           '[]'::json) as services
    from public.performance_sections s
   order by s.sort_order, s.id;

alter view public.v_hub_performance_sections set (security_invoker = on);
grant select on public.v_hub_performance_sections to anon, authenticated;
grant select on public.app_text, public.performance_metric_links to anon, authenticated;

commit;
