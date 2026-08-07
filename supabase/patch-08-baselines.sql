-- ═══════════ PATCH 08 — BASELINES AND THE REGISTRY REMAINDER ═══════════
--
-- Two things left after patch-07, both decided on evidence rather than taste.
--
-- 1. `kpi_baselines` — the 2025 Baseline KPIs tab.
--    The groundwork behind every KPI: what a role is responsible for, what it
--    is working on, what has to be true for it to succeed, where the numbers
--    would come from and how often they land. Nothing else in either workbook
--    records this, and it is the context that makes a one-line KPI readable.
--
-- 2. The KPI Registry rows that never reached the ScoreCard.
--    Worth being precise about the direction of travel here, because it decides
--    whether adding them back is a restoration or a regression. The ScoreCard
--    is the *newer* document: where the Registry left a measure open, the
--    ScoreCard fills it in — Ana De Castro's endorsement KPI is "X%" with no
--    bands in the older copy and "90%" with full bands on the ScoreCard. So
--    these rows are not something the ScoreCard removed; they are measures
--    identified for a role and not yet placed on it.
--
--    They load as `Not Tracking`, which puts them on the record without
--    touching the hub — the KPI Scorecard page only ever renders Tracking rows.
--    Anything already present is left exactly as it is.
--
-- Run after patch-07. Safe to re-run.

begin;

create table if not exists public.kpi_baselines (
  id                     bigserial primary key,
  sort_order             integer not null default 0,
  employee_name          text not null,
  role                   text,
  department             text,
  scheduling             text,
  key_responsibilities   text,
  current_projects       text,
  conditions_for_success text,
  current_kpis           text,
  suggested_kpis         text,
  data_source            text,
  timeframe              text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  updated_by             text
);

-- same touch/audit/RLS treatment as every other table
do $$
declare
  nm    text;
  names text[];
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
begin
  execute 'drop trigger if exists kpi_baselines_touch on public.kpi_baselines;
    create trigger kpi_baselines_touch before update on public.kpi_baselines
      for each row execute function public.touch_row();';
  execute 'drop trigger if exists kpi_baselines_audit on public.kpi_baselines;
    create trigger kpi_baselines_audit after insert or update or delete on public.kpi_baselines
      for each row execute function public.record_change();';

  select coalesce(array_agg(policyname), '{}') into names
    from pg_policies where schemaname = 'public' and tablename = 'kpi_baselines';
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.kpi_baselines', nm);
  end loop;

  execute 'alter table public.kpi_baselines enable row level security';
  execute 'create policy "kpi_baselines_select" on public.kpi_baselines for select using (true)';
  execute format('create policy "kpi_baselines_insert" on public.kpi_baselines
      for insert to authenticated with check (%s)', chk);
  execute format('create policy "kpi_baselines_update" on public.kpi_baselines
      for update to authenticated using (%1$s) with check (%1$s)', chk);
  execute format('create policy "kpi_baselines_delete" on public.kpi_baselines
      for delete to authenticated using (%s)', chk);
  execute 'grant select on public.kpi_baselines to anon, authenticated';
end;
$$;

truncate public.kpi_baselines restart identity;

insert into public.kpi_baselines (sort_order, employee_name, role, department, scheduling, key_responsibilities, current_projects, conditions_for_success, current_kpis, suggested_kpis, data_source, timeframe) values
  (1, 'Steven K. Thomas', 'Dean of Students', 'DOS', 'Complete', '> Provide executive-level and strategic leadership for all six DOS Office service areas (Student Honor & Conduct; Accessibility; Belonging; Grievances; Sexual Misconduct/Title IX; Students in Crisis).
> Title IX Coordinator and ADA/Sec. 504 Coordinator for the institution.
> Set vision, strategic direction, and institutional alignment for the DOS Office across BYU-Pathway Worldwide’s global student body.
> Lead policy development, cross-institutional coordination, and executive-level stakeholder collaboration (BYU-Idaho, Ensign College, ICS/IT, GEO, Digital Ops, etc.).
> Oversee crisis-response strategy, including escalation frameworks, global monitoring, partner communication pathways, and institutional student-safety protocols.
> Direct development and implementation of DOS Office reporting dashboards, analytics tools, and annual reports.
> Steward DOS Office staffing, operational budget, contractor strategy, and technological modernization initiatives.
> Represent the DOS Office in executive councils, SSEC, cross-institutional committees, accreditation-related efforts, and Student Success imperatives.', '> Student Crisis Portfolio development
> Multi-Language Program (MLP) DOS Office implementation roadmap
> DOS Partner Resource Portal (policies, workflows, referral processes)
> DOS Office Annual Report design and launch (impact, case data, findings, predictive insights)
> Technological innovation initiatives supported by ITD funding
> Companion App feature expansion across all six services areas (Accessibility workflows, case intake, etc.).
> Executive Secretary/Project Manager onboarding and integration
> Data standardization with Digital Ops (DOS Office Power BI Dashboard)', '> DOS Office processes standardized globally with clear escalation pathways
> Accurate, timely DOS Office dashboards for all six service areas
> Strong cross-institutional alignment with partner schools and internal departments
> Student trust and case-resolution consistency across regions
> Effective utilization of Digital Ops, Springboard teams, and contractor talent
> Documented, scalable procedures usable at 190+ country scale', '> Successful decoupling from partner institutions across all six DOS Office service areas.', 'High-Level Strategic / Executive Focus
1. Operational Clarity & Scalability
• Complete DOS Office Position Descriptions, Success Measures, and full process documentation across all six service areas.
• Finalize succession plans for critical roles.
• Validate and deliver scalability plans to support future growth to 1 million students.
2. Stakeholder & Student Satisfaction
• Implement quarterly CSAT surveys for internal and external partners.
• Launch post-interaction student CSAT surveys across service areas and integrate results into dashboards.
• Demonstrate measurable increases in partner trust and clarity with DOS processes.
3. Cross-Institutional Collaboration & Alignment
• Ensure DOS-chaired committees produce documented outcomes and alignment with partner institutions.
• Strengthen year-round collaboration and communication with institutional partners.
• Improve system health and reduce friction across shared processes.
4. High-Quality, Scalable Performance
• Achieve student satisfaction with DOS services at or above 80%.
• Resolve 90%+ of DOS tickets within 5 days (excluding Title IX/Sexual Misconduct timelines).
• Demonstrate dashboard readiness and data accuracy for all service areas.
5. Retention & Completion Impact
• Establish realistic retention and completion benchmarks for students who receive DOS Office services.', '> Power BI dashboards (DOS service areas)
> Adobe Analytics (student behavior and case-flow insights)
> Digital Ops data pipelines
> Crisis monitoring systems and global intelligence feeds
> Companion App and REACH/CRM case records', 'Ongoing – Block, Quarterly, and Annual Reporting Cycles'),
  (2, 'Anne Marie Clark', 'Associate Dean of Students', 'DOS', 'Complete', '> Provide operational leadership and oversight for DOS Office teams and service areas.
> Deputy Title IX Coordinator and Duputy ADA/Sec. 504 Coordinator for the institution.
> Lead day-to-day coordination of policies, case management practices, instructor support workflows, and DOS Office procedural alignment.
> Ensure consistency and accuracy in case handling, documentation, student communication, and compliance across all six service areas.
> Oversee cross-departmental coordination with Enrollment Counseling, Mentoring, Support & Services, and Digital Ops.
> Support implementation of DOS dashboards, data-cleaning initiatives, and service-area reporting.
> Manage sensitive and escalated student cases; provide counsel to internal partners and managers.
> Lead workforce training for policies, referral workflows, and crisis-scenario readiness.
> Support development of the DOS Partner Resource Portal and Annual DOS Office Report.', '> DOS Office case-practice standardization and documentation
> Internal and partner-facing student crisis-response guidance and escalation pathways
> DOS dashboards data-accuracy initiative with Digital Ops
> Policies and workflow alignment for internal staff and partner instituitions
> Support & Services escalation improvement initiative
> Annual DOS Office Report (data, narrative, outcomes)', '> Clean, reliable, and consistently entered DOS Office data
> Clear and documented processes for internal staff and external partners
> Strengthened relationships with partner schools and internal stakeholders
> Reduced student touchpoints and faster resolution timelines
> Improved operational accuracy and consistency across case managers and coordinators', '> Efficient and effective case resolution across all six DOS Office service areas.', 'Operational / Execution Focus
1. Process Fidelity & Documentation
• Maintain service-area Standard Operational Procedures (SOPs), escalation guides, and workflow documentation.
• Achieve 100% implementation of updated processes within established timelines.
2. Case Quality & Consistency
• Maintain 90%+ accuracy in case documentation and data entry.
• Reduce procedural errors and repeat student contacts.
• Ensure consistent adherence to policy and procedural standards.
3. Ticket Resolution & Service Performance
• Resolve 85–90% of tickets within defined timelines (within 5 days for non-Title IX cases).
• Reduce Support & Services delays impacting DOS cases.
4. Dashboard & Data Reliability
• Conduct weekly data-quality verification (accuracy, completeness, consistency).
• Meet dashboard-readiness milestones in partnership with Digital Ops.
5. Stakeholder Communication & Alignment
• Maintain positive feedback from Instructors, GEO, Communications, and partner institutions.
• Deliver quarterly updates to partner institutions and cross-departmental teams on schedule.
6. Training & Readiness
• Ensure 100% of instructors, mentors, internal staff, and partners are trained in revised escalation and crisis-response processes.
• Improve partner understanding of DOS procedures as reflected in CSAT and quarterly reviews.
7. Student & Partner Satisfaction Implementation
• Execute student and partner CSAT survey distribution.
• Monitor response trends and apply insights into operational improvements.', '> Power BI dashboards (DOS service areas)
> Adobe Analytics (student behavior and case-flow insights)
> Digital Ops data pipelines
> Crisis monitoring systems and global intelligence feeds
> Companion App and REACH/CRM case records', 'Ongoing – Block, Quarterly, and Annual Reporting Cycles'),
  (3, 'Katelyn Ray', 'Student Honor & Grievance Coordinator', 'DOS', 'Complete', '> Place Holds on Student Accounts
> Scheduled Phone calls with Disgruntled students
> Grievances weekly team meeting
> Enroll students in Academic Integrity Course
> Coordination with BYU-I & Ensign Honor Offices
> DOS weekly team meeting
> Compile data regarding trends for grievances for past week/month
> Manage the Navigating Academic Honesty course on Canvas', 'Student honor and conduct committee Co-chair
Adding AI section to Navigating Academic Honesty course on Canvas', 'Tracks student honor violations and ensures that appropriate action is taken in each case to resolve the concern in accordance with our institution policies.
Ensure a strong relationship with BYU-I & Ensign Honor Offices
Maintain open communication and strong relationship with instructional teams to streamline violation processing.', 'Number of cases received - tracked
Number of repeat offender - tracked
Case age, 5 days or less - 90%', 'CSAT - Students', '> Power BI dashboards (DOS service areas)
> Adobe Analytics (student behavior and case-flow insights)
> Digital Ops data pipelines
> Crisis monitoring systems and global intelligence feeds
> Companion App and REACH/CRM case records', 'Weekly'),
  (4, 'Alison Cundiff', 'Director of Enrollment & Retention', 'Enrollment & Retention', 'Pending - Extended to Friday Dec 5th', '> Oversee the Enrollment Counselling and Mentoring teams:
>> 1:1s
>> Team meetings
>> Long-Term planning to meet Student Success and Organizational objectives
> Oversee student throughput across the student journey/pipeline
>> Milestones
>> Dashboards
>> AI/Human intervention strategies
> Report on progress in weekly 1:1 with the VP of Student Success.
> Represent EC and Mentoring in daily, weekly, and monthly cross-functional meetings related to registration.
> Prepare agendas and facilitate the Retention Council, various workgroup participation', 'Retention Council (Chair)
Orientation, Analytics Engine Workgroup (Chair)
Enrollment & Retention Suite dashboard project w/ Dallin
Milestone map project
EC3 Mentor exploration
CARE Committee (participant)
CES Student Success Committee (participant)
Companion Implementation Taskforce (participant)
Advising Committee (participant)', 'Mentoring is functioning optimally, mentor role is clear, and students know how to reach their mentor.
Enrollment Counseling is functioning optimally, and that we have the right intervention model set up to increase yield rates from Application to Registration.
Teams have all the resources (access to data, systems) needed to perform their roles in a paced and effective way.
We are aligned across the organization on the primary persistence and retention measurements and are consistently making progress on them from term to term, year to year.', 'EC RA completion 95% average
Mentor CSAT - 85% average
Mentor RA Implementation - 90% completion
Mentor Scorecard (Quality) - 85% average
PC Completion: 45%
C&D 4-Term Retention: 55%
C1 Completion: 40%', 'None', '> https://app.fabric.microsoft.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/d0f58bce-3a7d-49b6-80a3-eade14ab09fc/e3ff97a21eaacb03dbca?experience=fabric-developer&clientSideAuth=0
> https://app.powerbi.com/groups/me/reports/7177fab9-23b0-4184-8f31-f0db822282c0/ReportSection964c860de430a5035bab?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi
> https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/8b8c6aa8-361e-4ed7-8018-ac9b625ec004/51439a40d9bbc658cac9?experience=power-bi
> https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/e2b5b9d8-0b16-4185-9213-61b41d61c157/40663d76a0ae8a192407?experience=power-bi', 'Weekly, Monthly, and By Term'),
  (5, 'Rachel Kirk', 'Enrollment Counseling Manager', 'Enrollment & Retention', 'Complete', '> Supporting my team and escalating complicated issues (50%)
> Cross-departmental collaboration (15%)
> Planning targeted outreach (10%)
> Monitoring enrollment counseling effectiveness/performance (10%)
> Planning and Requesting optimization to our tools (5%)
> Synthesize and present results of key initiatives and team performance to senior leadership (10%)', 'New Student Orientation Workgroup', 'Ensuring that the EC team is functioning effectively and supporting students
Planning RAs and outreach
Tracking tool efficacy and ensuring tool repair and updates', 'RA completion 95% average', 'EC CSAT 85% average - New metric being tracked', '> https://app.fabric.microsoft.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/d0f58bce-3a7d-49b6-80a3-eade14ab09fc/e3ff97a21eaacb03dbca?experience=fabric-developer&clientSideAuth=0
> https://app.powerbi.com/groups/me/reports/7177fab9-23b0-4184-8f31-f0db822282c0/ReportSection964c860de430a5035bab?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi', 'Weekly'),
  (6, 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Complete', '> Implement the Mentoring Strategy
> CRM needs and adjustments
> Oversee Mentor & Evaluator training sessions
> Supply guides and Required Action Implementation to standardize and inform Mentors regarding changes made and process updates.
> Build and maintain the mentor scorecard model.
> Implement and quality assure items in Mentoring such as Case Management and Mentor Interaction with students (timing, frequency, and quality).', 'MLP Portuguese Pilot mentors
EC3 Project Pilot mentor update', 'Mentoring strategy is being implemented successfully.
Mentors & Evaluators trainings are provided to Springboard before new items are expected to be implemented.
Mentor guides & RA guides are provided and updated as needed.
Mentor Evaluation updates are delivered regularly', 'Mentor CSAT - 85% average
RA Implementation - 90% completion
Scorecard (Quality) - 85% average', 'None', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/8b8c6aa8-361e-4ed7-8018-ac9b625ec004/51439a40d9bbc658cac9?experience=power-bi
https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/e2b5b9d8-0b16-4185-9213-61b41d61c157/40663d76a0ae8a192407?experience=power-bi', 'Weekly & by Term'),
  (7, 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Complete', '> Strategic discernment of analytics engine (backend) and Companion/Mentor portal (frontend) feature alignment, development, and maintenance to scale to millions of students in multiple languages with the best of AI and human relationship-based intervention.
> Daily/weekly scrum meetings with human role applications on behalf of students aligned with analytics engine with Companion, PowerBI, and machine learning and agentic AI teams.
> Review non-linear and linear UX impacts and results.', 'None', 'Digital Ops projects are progressing on time and completed project meet their requirements.
Stakeholder approval with high satisfaction.', 'None', '85% CSAT in Companion
100% uptime (0% P1s) with clear pro-active maintenance windows communicated to students and stakeholders
Each prompt/answer in Companion 98% QA accurate/relevant/ethical/accountable separated by feature (i.e. jobs, course assistant, Versant prep assistant, etc.)
Simulate results for stability in Azure with 1 million students in Spanish, Portuguese, French, English (i.e. 98% accuracy, 100% uptime, 3% milestone achievement over predicted)
Predictive model accuracy 92% on average for each micro-milestone', 'PowerBI
Azure chat transcript tables
Microsoft Application Insights
Azure notebooks', '> CSAT and Uptime - daily
> QA weekly'),
  (8, 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'Complete', '> Collaborate with IT and ICS partners, including solution managers Kyle C. and Jeff Van Drimmelen, product managers Dustin Waith (Registration), Cary Johnson (formerly EC3), Johanna Powell (Admissions), Mike Hilmo (Finance/Gatherings), and Chad Neth (Reach), and ICS developers Bob Capel and Gordon Young (Reach/D365).
> Work closely with portfolio architect Dennis Kiesel and various ICS engineers supporting Azure and AI services.
> Hold weekly team meetings and 1:1s with each manager to maintain alignment and support individual well-being, performance, and growth.
> Weekly development and development QA with managers.
> Meet with ICS contacts specifically related to AI initiatives. These meetings ensure compliance with security protocols and help secure the support needed to advance our work.', null, 'High engagement and alignment with stakeholders and team
Strong cross-team collaboration with IT and ICS partners
Timely delivery of AI-related initiatives
Effective QA and development with managers', '90% or better of projects delivered on time and within scope across our team (Overall execution and alignment with org priorities)
85% or better stakeholder satisfaction score (Effectiveness of collaboration and communication at an operational level)
80% or better engagement score from quarterly team surveys or retention metrics (Leadership quality and team stability)
One or more of our AI initiatives successfully integrated into business processes per quarter (Strategic contribution to modernization and innovation)', 'None', 'None', 'Quarterly & Biannually'),
  (9, 'Dezjaron Dorsey', 'AI Manager', 'Digital Operations', 'Complete', '> Track project progression
> Manage team through 1on1s and team meetings
> Source solutions to unfolding project challenges
> Build AI/ML Architecture
> Build data model
> Weekly reporting meetings
> Maintain and manage
>> Azure Developers board
>> GitHub Repos
>> Azure DevOps Pipelines', 'Course Assistant
Fluency Assistant
Companion Assistant (different from Native)
Grader Assistant
Data Model', 'Ensure Digital Ops final products can be used successfully by the end users.
Ensure feedback and improvement backends are built into projects so they can be monitored and maintained.
Projects are updated and improved as needed to keep them functioning optimally.', 'None', 'None', null, null),
  (10, 'Mark Gefrom', 'Director of Student Support', 'Student Support', 'Pending', '> Ensuring the path for students to get help is clear and easy by promoting the use of the Help Center
> Ticket management systems are configured properly to allow us to effectively record, categorize, and quantify inbound ticket traffic
> Promoting ongoing employee coaching and development
> Internal knowledge articles are in place to guide agents on how to help students and know what internal processes to follow
> External knowledge articles are in place on the Help Center to address common questions/issues for students
> Balancing efficiency and quality (CSAT surveys, First Contact Resolution, and QA Evaluations) as it pertains to ticket handling
> Identifying, quantifying, and escalating system bugs for Product Managers and ICS to work on permanent fixes
> Identifying ticket trends which are negatively impacting students. This includes working with other departments to reduce escalations by training and empowering our agents
> Handling VIP and escalated support issues
> Addressing team and employee performance issues', 'Ticket Task Force', 'Ensure that the Help Center is fully operational and the path for students to get support is clear and reliable.
All agents QA’d and given feedback monthly.
Ticket systems are running optimally and students are receiving high quality support.', '24 hour Response Time
48 hour Resolution Time
90% of tickets resolved within 5 days
95% First Contact Resolution
30 second wait time to speak with an agent (Phone Support)
80% agent availability to take calls (Phone Support)
20 minute average talk time (Phone Support)
60% resolution rate (Phone Support)
90% CSAT
All agents QA’d and given feedback monthly', 'None', 'Power BI Dashboards', 'Weekly & Monthly'),
  (11, 'Brad Lester', 'General Support Manager', 'Student Support', 'Complete', 'Team Oversight & Check-ins
> Run weekly team meetings or stand-ups to align priorities.
> Conduct 1:1 check-ins with direct reports.
> Monitor workload distribution and adjust assignments.
Operational Monitoring
> Review open support cases/tickets, escalations, or backlog.
Issue Resolution & Escalation
> Address customer or stakeholder escalations.
> Troubleshoot recurring issues with processes, tools, or systems.
Performance Tracking
> Review weekly KPIs (e.g., response times, customer satisfaction).
> Identify early trends and areas needing quick correction.
Communication & Coordination
> Update leadership on support trends or risks.
> Share policy/process updates with the team.
> Coordinate with other departments to resolve cross-functional issues.
Team Development
> Provide ongoing coaching or feedback.
> Reinforce best practices and standard procedures.', 'Advisor Workgroup
New Registration Workgroup', 'Queue Health:
> Ensure that ticket queues are turning over and cases are being resolved in a timely manner.
> Diagnose ticket issues to ensure cases are in the correct queues.
Ensure that escalated cases are sent to the correct teams.
Maintain infrastructure health and request software updates as needed.
Plan and implement team development and ongoing training consistently.
Use KPIs to identify agents that need additional training and focus.', 'Ticket resolutions per day - as high as possible
Average response time in hours - as low as possible
Average resolution time - 3 days or less
First contact resolution rate - 90% average
CSAT - 90% average
Quality assurance - 95% average', null, 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/b4f5a8a463b9d5aef9c3?experience=power-bi', 'Weekly & Monthly'),
  (12, 'Matthew Smith', 'Technical Support Manager', 'Student Support', 'Complete', '> Managing and developing the technical support team staff.
> Updating key stakeholders on bug/issues.
> Coordinating and prioritizing bug/issues based on key factors such as scope/impact/etc.
> Responding to VIPs and other staff on issues for urgent matters.
> Check and keep our Knowledge Base up to date.
> Providing training and sharing knowledge with lower tiers of support to ensure first contact resolution success.', 'Team Restructure towards efficiency:
> Product presentations for each product and assign a member of tech support to each product and get a bi-weekly update of Product Bugs, continued issues, concerns on what needs to get fixed and risks to the product if they aren''t fixed. This includes number of tickets and the main issues attached to each. We should have a running PPT that will provide this information to Product Managers.
Portal Product Service Reports with Miguel. Get Reporting for each Product Manager.
Training, Development, and Access
Future:
> Refine FTE onboarding
> Create student employee onboarding', 'Tech Support team is functioning effectively and developing towards improving the student experience.
Improve knowledge & training for technical support team
Provide weekly report on current ticket issues per team
Lower user access/merge issues for students:
> Identify solutions to prevent students from deleting their user details.
> Manage KBs used by Account Management to assist with user account issues', 'Track average of new KB per month - goal 2 per month per person (6 FT & 1 PT)
Improve quality of service offered by Tech Support:
> QA ticket scoring 85%
> Ticket resolution within 5 days to 90% once escalated to Tech Support
> Initial response time within 48 hours once escalated to Tech Support', 'Add Kira''s QA scores to KPIs
End-to-end testing if that procedure can be implemented', 'https://app.powerbi.com/groups/me/reports/f4e772a1-108f-4def-8aa5-c298e2c4eb0a/5bd92746cf75258f9eb1?experience=power-bi', 'Monthly'),
  (13, 'Colby Warner', 'Product Support Engineer', 'Student Support', 'Complete', '> Resolve student cases.
> Coordinate and help resolve any P1 issues.
> Write DevOps bugs for ICS as necessary.
> Write Knowledge Base articles and provide any necessary training.
> Help keep the team running smoothly and efficiently.
> Bug testing systems.', 'Student accounts merging.', 'Improve knowledge & training for technical support team
Provide weekly report on current ticket issues per team
Lower user access/merge issues for students:
> Identify solutions to prevent students from deleting their user details.
> Manage KBs used by Account Management to assist with user account issues.', 'Create or edit 10 KB articles per month
Improve quality of service offered by Tech Support:
> QA ticket scoring 85%
> Ticket resolution within 5 days to 90% once escalated to Tech Support
> Initial response time within 48 hours once escalated to Tech Support
Close 40 tickets per week minimum (depending on how many tickets are in the queue)', null, 'https://app.powerbi.com/groups/me/reports/f4e772a1-108f-4def-8aa5-c298e2c4eb0a/5bd92746cf75258f9eb1?experience=power-bi', 'Weekly & Monthly'),
  (14, 'Kira Hayes', 'Consistency Coordinator', 'Student Support', 'Complete', '> Managing the QA team
> Managing the External KB team
> Ensuring that internal articles get created when Support agents have questions or is missing information when helping students.
> Providing reports on how well Support is doing in reference to our QA metrics
> Aiding with the staffing needs of student support', '> Updating Onboarding Training
> Constant QA team training/improvement
> Maintaining all employee records across multiple teams for QA/dashboard purposes', 'Quality Assurance:
> Monthly reports are sent to senior leaders on time
Onboarding:
> New hires are trained within the appropriate time frame to avoid delaying start dates
Knowledge Management:
> Monthly random auditing of Help Center KB articles (checking for consistency)
> Monitoring backlog of internal feedback and new requests awaiting SME responses and sending monthly report to senior leaders', 'Quality Assurance:
> All agents receive at least 3 QAs per month
> Team Leaders provide feedback to agents within the same month of the evaluation - 90% goal
> 1 consistency monitoring session per week with team
> 100% of critical violations sent to team leaders
Onboarding:
> New hires are trained and ready to take calls within 1 and a half weeks
Knowledge Management:
> Help Center KB articles published within 48 hours of being requested', 'None', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/1afb91a1da6d47c71041?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi', 'Monthly'),
  (15, 'Alyssa Burrell', 'Student Support Coordinator', 'Student Support', 'Complete', '> Lead and oversee the Phone Support team at BYU-Pathway Worldwide, including domestic student employees and international contractors
> Monitor and report weekly metrics and provide training for the team or coach individual agents when goals are not met.
> Train Phone Support Leads and assist them in answering agent questions to ensure that accurate information is being always given out
> Monitor phone calls to provide feedback to leads, agents, and jump in when necessary
> Design and deliver training programs on call center skills such as active listening, de-escalation, FERPA compliance, and escalation procedures
> Write and publish Knowledge Base articles specific to the phone support team
> Collaborate with other teams and departments to provide student feedback, report errors, and create escalation paths
> Act as a key point of escalation for complex or urgent student issues, ensuring timely resolution and communication
> Review QA and CSAT scores and assist the leads in providing feedback to agents and the team
> Manage domestic student employees time, schedules, and absences', '> Adding additional contact methods once ICS is ready
> Ongoing training and development for Phone Support Team', 'This role is successful when the Phone Support team is performing optimally, meeting their goals, and developing their skills.', '> Number of Calls Answered - as low as possible, depends on all tools functioning correctly.
> Abandoned Rate - under 5%
> Caller wait time - no current goal, tracking
> Caller handle time - under 20 minutes
> Availability - 80%
> Resolution Rate - no current goal, tracking
> CSAT - 85%
> QA Scores - 85%
> Case Open Time - under 5 days', 'None', 'Student Support Metrics dashboard', 'Weekly'),
  (16, 'Kari Johnson', 'Registrar', 'Student Services', 'Complete', 'Maintain student academic records and ensure compliance with institutional policies, accreditations standards, and regulations.
Oversee the following teams: registration, graduation, enrollment verification and internal transfer credits, records, degree progress audit, and planning.
Oversee course registration for each block including manual GEC registration.
Manage publishing Block/Term data and EnglishConnect section creation.
Oversee the graduation process for each block.
Coordinate with various departments and area managers to resolve student record issues.
Review data and processes with partner institutions for auditing purposes.
Catalog maintenance
Oversee academic exceptions committee and weekly meetings.', 'Ticket Task Force
All other projects are contained within the typical functioning of the registrar''s office.
Single PV Graduation Processing
Move Students to new Program Versions
Path 1.0 Data Migration
Syncing Campus Based Courses and Credentials (BYU-I, Ensign College)
GEC Section Management
Registration - Matriculation Management
Apostille - SAQA and Brazil
Blocking transcript ordering from more than one institutuion (BYUPW, BYUI, Ensign)
Budgets
Catalog - publish new catalog 2026 -
Catalog maintenance
Companion Implementation Task force
Course / Program Teach-out
Course section creation colaboration with BYU-Idaho
Direct Admits - removing', 'Constantly improving the student experience.
Ensure that all student academic records are accurate, current, and accessible.
Provide support and leadership for the registration, graduation, enrolment verification, records, DPA, and planning teams and ensure they are functioning optimally.
Provide oversight to ensure all student registration happens efficiently and effectively.
Ensure that Block data is published and all needed sections are created in Canvas.
Ensure that the graduation process in carried out efficiently and accurately for each block.
High employee productivity due to clear direction and leadership.
Effective collaboration among team members.', 'None', 'Achieve 100% accuracy rate in student academic records. Increase team member task completion rate Ensure Block data is 100% published by due date', 'None', 'None'),
  (17, 'Kim Overdiek', 'Associate Registrar', 'Student Services', 'Complete', '> Work on ADO resolution (1 hours)
> Review Coursedog proposals for Academic Catalog updates (1 hours)
> Make configuration updates in Anthology Student (2 hours)
> Meetings to maintain policy and processes for Curriculum, Planning, and Registration (6 to 7 hours)
> Assist with manual registration as needed - GEC, Portuguese sections (2 to 3 hours)
> Continued testing on current curriculum or configuration updates (2 hours)
> Other meetings with team members (1 to 2 hours)
> Planning for next day (30 minutes)', 'Program Plans (Student facing)
Program Sheets (Organization facing)', 'Curriculum is updated and functioning in Anthology to allow for on-time Registration.
Ensure that Registration Cleanup data is available and actioned appropriately.
Coordinate the Coursedog proposal procedure to ensure that all stakeholders are completing their actions items so curriculum updates can be implemented on time.', 'None', 'Configuration Updates Made Each block
Catalog Updates Made Each block
Team is task goals completed each block', 'None', 'TBD'),
  (18, 'Geraldine Susan Bean', 'Graduation Coordinator', 'Student Services', 'Complete', '> Oversee the graduation team as they work through graduation applications and graduation issues.
> Personally vet and award credentials each week.
> Send orders for paper copies of diplomas.
> Take care of escalated students who have not received their credentials for any given reason.
> Work with partners to go over any graduation questions or issues they might have.
> Work through apostilles for students needing documents certified for use outside of the US (this can include certificates, diplomas, official transcripts, and enrollment verification letters).
> Work with communications team to send information about graduation to students.
> Work with partner institutions for vetting and auditing lists of graduates, as well as posting final numbers and getting names into the graduation programs.
> Work in the configuration to make sure we can send portal alerts for apostille and am working on getting them set up for graduation as well.
> Apart from graduation, I am also overseeing the hiring and basic training for the registrar office.', 'Term 6 Active to Pending Completion Queue (Anthology Student workflow)
Term 6 Applications (REACH)
Finishing the Ensign Audit from 5/10/2025
Sending grads to the printer weekly', 'Ample access to resources and training modules
Daily team work sessions via zoom
Weekly leadership check-ins and trainings
Prioritize quality over quantity', 'Zero incorrect graduations/rescinded degrees. Prioritize quality over quantity
All applications submitted before the term deadline will have at least one review before the end of the term, and students will be notified.
Every graduate receives two reviews before their graduation is finalized. One at mid-term, and the final review after grades post.
Employees process 2-3 graduations or on-track reviews per hour', 'None', 'None', 'Per term'),
  (19, 'Anne E. Owen', 'Records & Transcript Coordinator', 'Student Services', 'Complete', '> Grade Changes: Oversees documentation and processing of grade change requests, reinstatements, and grievance-related updates.
> Academic Exceptions: Facilitates exception requests via the Companion Bot, collaborates with institutional partners, and supports the Academic Exceptions Committee.
> Transcript Management: Manages manual transcript processing and verification, resolving legacy data issues in partnership with technical teams and institutions.
> Transcript Cleanup: Coordinates with Anthology to maintain transcript data integrity through daily issue resolution.
> Official Transcript Requests: Ensures compliant handling and delivery of official transcript requests submitted through the Companion Bot.', 'Transcript Cleanup & Accuracy: Ongoing resolution of legacy data issues in Anthology to ensure accurate transcripts.
Academic Exceptions Management: Facilitating committee reviews and improving turnaround times for exception cases.
Grade Change Processing: Maintaining accuracy and timeliness for reinstatements and grievance-related updates.
Knowledge Base Updates: Regularly refining content based on trends and escalations.
Service Performance Reporting: Weekly tracking agent outcomes and service trends for Springboard collaboration.', 'System Stability: Reduced SIS bugs and improved Anthology functionality for transcript processing.
Cross-Team Collaboration: Timely communication with BYU–Idaho, Ensign College, and Anthology partners.
Clear SOPs: Fully documented processes for grade changes, academic exceptions, and transcript handling.
QA & Training: Ongoing quality assurance reviews and team training to maintain compliance and accuracy.', 'Grade Change Accuracy Rate: Target ≥ 97%
Transcript Accuracy Rate: Target ≥ 95%
Academic Exception Accuracy: Target ≥ 95%
QA Review Pass Rate: Target ≥ 90%
Knowledge Base Updates: 2–4 per month
Response Time to Partners: ≤ 24 hours
Meeting Attendance: ≥ 95%
Turnaround Times:Grade Changes: ≤ 3-5 business days
Academic Exceptions: ≤ 8-14 business days
Transcript Fulfillment: ≤ 8-14 business days', 'Escalation Resolution Time: Average ≤ 72 hours
Issue Flagging & Resolution Rate: ≥ 90% within SLA
Training Sessions Conducted: 1–weekly
Service Performance Reporting Compliance: 100% of weekly reports submitted', 'Reach: For tracking grade changes, academic exceptions, and transcript requests.
Anthology: For transcript accuracy and ADO issue resolution.
QA Audit Reports: For compliance and accuracy metrics.
Knowledge Base Logs: For update frequency.
Internal Meeting Records & Timecards: For attendance and cyclical tasks.', 'Weekly: Service performance reports, QA reviews, meeting attendance tracking.
Monthly: KPI dashboard updates, Knowledge Base updates.
Quarterly: SMART goal progress evaluation, workload trend analysis.
Bi-Annual: Performance reviews and cyclical compliance checks'),
  (20, 'Cindi C Putnam', 'Planning Coordinator', 'Student Services', 'Complete', '> Meet with Planning Team leadership (student employees) to review the team''s productivity and training.
> Work with other teams both inside and outside the Registrar''s office to iron out issues in students'' DPAs and planning.
> Creating and refining processes to address issues in weekly meetings with other Coordinators.
> Meet with Anthology once a week to review questions about the platform and issues found.
> Attend and participate in the Academic Exceptions meeting at least once a week.', 'Assisting with Curriculum updates
Creating and refining processes
Creating and updating KBs for Planning Team', 'Number of new incoming cases is monitored to inform new KB and procedure needs.
Student DPA issues are reducing, and the institution is working toward data cleanliness.
Maintain an open dialog with Anthology to ensure system updates are moving forward appropriately.
Understand and contribute to Academic Exceptions team.', 'Cases completed - 80 cases per day
Number of cases in the queue - less than 160 cases
Quality assurance - 90% average
Cases age - less than 14 days old (Case age can only be controlled so far by the planning team because they are worked by other teams first but this metric is an aspirational KPI)', 'None', 'https://app.powerbi.com/groups/me/apps/edf61692-3af5-4aba-af7e-ef1de76ce451/reports/6f338692-a93d-4072-b2d6-b7af6aa347ab/e205f7687b0c4b678359?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi', 'Weekly'),
  (21, 'Nikki Jane Chambers', 'Enrollment Verification Specialist', 'Student Services', 'Complete', '> Emailing third parties that need an enrolment verification
> Communicating with BYU-I on letters and forms I can fill out
> Letters from the Department of the Defense
> Internal Credits missing from BYUI and Ensign College that need to be input into the system
> Custom letters for students', 'Add BYU-I & Ensign courses to Anthology', 'Third-party verification cases are processed and sent to students as soon as possible.
Ensuring that students receive enrolment verifications efficiently and effectively.
Collaborate with other departments and government organizations to provide students with custom letters as efficiently as possible.
Refine and update internal credit system with the goal of establishing accuracy.', 'Enrolment verification cases - 3 per hour per agent
Internal credit additions - 1 per hour per agent
Quality assurance - 90% goal
Maximum case age - 5 days', 'None', 'None - tracking in spreadsheets', 'Weekly & Monthly'),
  (22, 'Emma Stone', 'Registration Specialist', 'Student Services', 'Out of office', null, null, null, null, null, null, null),
  (23, 'Joshua Stafford Hadden', 'System & Operations Manager', 'Student Services', 'Complete', 'Systems and Operations is a new team intended to help Student Services operate with greater efficiency and efficacy. The Systems & Operations team does this through three major emphases:
> Help steer future state projects--We help guide and plan for future state projects (especially the technical elements), allowing SMEs to focus on serving current student needs/initiatives. Some current examples of these projects are the MLP and New Registration projects. In addition to this, we frequently meet with SMEs to design ways to optimize their operations through better processes, tools, and best practices.
> Provide operational data/reports (especially to members of student services) --We provide data and reports to help SMEs work more effectively in their area. We also produce reports that allow teams to measure their overall effectiveness/productivity. Additionally, we present the needs and standards for students to record data to a variety of internal and external partners.
> Be SIS specialist--We provide support for how to best utilize the SIS and its features. This involves consulting with SMEs on their processes and how they use the SIS. We also manage much of the configuration of the entities within the SIS to tailor the system for our programs, initiatives, and students.', 'None', 'State projects have all the technical support and project planning to roll out effectively without distracting SMEs.
Ensure the Student Information System has the necessary support to run effectively and efficiently.
All Power BI reports are functional and providing data to fulfill their purposes.', 'Tasks completed on time - goal to be set
Number of task hours completed - goal to be set', 'None', 'Pending', 'Monthly'),
  (24, 'David Peck', 'Operational Data Analyst', 'Student Services', 'Complete', '> Manage the reports in the Power BI Apps that I have developed and ensure that they continue to refresh as expected.', 'None', 'All Power BI reports are functional and providing data to fulfill their purposes.', 'Tasks completed on time - goal to be set
Number of task hours completed - goal to be set', 'None', 'Pending', 'Monthly'),
  (25, 'Pelenatita Neiufi', 'Reporting & Evaluation Coordinator', 'Student Services', 'Complete', '> NSC reporting for both BYUI and EC
> Enrollment Verifications
> Demographic changes
> SSN verifications
> Auto-Drop Process
> Grade Posting Process
> Academic Calendar - Dates & Deadlines
> Term Configurations
> Updating student services website through Coursedog', 'None', 'All Student Services process reports are functional and updating appropriately.
Student Services website is always fully updated.', 'Tasks completed on time - goal to be set
Number of task hours completed - goal to be set', 'None', 'Pending', 'Monthly'),
  (26, 'Victor Lamôni Calado Ferreira', 'System & Operations Associate Registrar', 'Student Services', 'Complete', '> Overseeing the Student Information System (SIS)
> Implementing institutional academic policies
> FERPA compliance', 'None', 'Ensure the Student Information System has the necessary support to run effectively and efficiently.
FERPA practices are maintained for all students.', 'Tasks completed on time - goal to be set
Number of task hours completed - goal to be set', 'None', 'Pending', 'Monthly'),
  (27, 'Trevor Shelton', 'Admissions Services Manager', 'Student Services', 'Complete', '> Develop admissions policies and strategies to support new and evolving initiatives
> Key business owner for system design, testing, and improvement efforts to enhance student access
> Monitor key admissions metrics to inform decisions
> Collaborate with BYU-Pathway leadership, partner institutions, and cross-functional teams to align processes
> Support organizational scalability through planning and documentation
> Provide oversight and direction to staff who manage operational processes (application review, endorsements, transcripts, data integrity', 'MLP System development and updates
New Registration Updates (Ecclesiastical Endorsement, Progressing Students)
Improve transfer credit evaluation process', 'Reduced BYU-Pathway Support traffic for all areas overseen by Admissions
Improved application to registration through-put
High employee productivity due to clear direction and leadership.
Effective collaboration among team members.', 'None', 'Percentage of started admission applications that get an admissions decision (admit or deny).
Delivery of Strategic Admissions Initiatives
Completion of planned admissions initiatives on time and as scoped.
Reduction of enrollment related support tickets.
Elimination of Admissions-SME tier 2 support tickets.', 'None', 'Per term'),
  (28, 'Shaunasee Janette James', 'Enrollment Coordinator', 'Student Services', 'Complete', '> Liaise with the Ecclesiastical Clearance Office (ECO) and chaplains to resolve endorsement-related issues.
> Manage a team that notifies students with missing or MRNs and resetting endorsement requests.
> Oversee transfer evaluation team as they make sure of transcript submission. workflows and ensure accurate linkage to student records.
> Support or lead transcript evaluation processes to verify credit.
> Identify and merge duplicate student records in Reach.
> Manage and monitor student portal tools, including the English Language Assessment and Parent Program Selection.', 'Updating Transfer Evaluation Policies
Checking and correcting endorsement hold groups
Creating transfer evaluation QA procedure', 'Consistently reducing transfer evaluation backlog
Admission SME Support queue is emptying each day
Endorsement related issues are resolved efficiently and effectively
Student MRN issues are tracked and corrected by collaborating with the student to prevent barriers for continuation
Ensure student portal tools are functional', 'Maximum case age - 5 days
Quality assurance - 90% average', 'Transfer evaluations are completed at an average rate of 1.25 per hour per agent.
Maximum case age does not exceed 5 days, ensuring evaluations do not develop into a backlog.
Quality assurance scores average 90 percent or higher across completed evaluations.
Reduction of enrollment related support tickets.
Elimination of Admissions-SME tier 2 support tickets', 'Pending', 'Weekly & Monthly'),
  (29, 'Ely Zmolek', 'Enrollment Services Specialist', 'Student Services', 'Complete', '> Process student applications across various programs.
> Monitor integration logs to verify successful application processing and resolve reported issues.
> Review and process applications flagged for Manual Review, including those requiring exceptions.
> Manually provision students when necessary or upon request.
> Maintain and update application settings in Reach for each term, including application periods, decisions, and admission letters.
> Create and update knowledge base (KB) articles related to the application process.
> Collaborate with the Registrar’s Office to update returning students’ credits and PathwayConnect graduations upon enrollment.
> Test new application versions (e.g., Portuguese application) and report issues for resolution.
> Oversee the Admissions SME Support queue, identifying and managing cases related to the application.
> Supervise a team of student employees, providing weekly training and ongoing support.', 'Application processing
Ensuring integration and provisioning to get all student licenses
Resolve escalated issues in the SME Admissions Support Queue
Manual Review on Applications
Ensuring Application setting are correctly updated each block', 'Promote admitted students within 1 business day of application submission
Students receive admissions communication at the proper times during the application process.
Resolve Manual Review on Application within a week
Application settings are always updated and correct', 'None', 'Get student their BYU-Pathway email within a business day of promotion
100% application processed within a business day
100% of admitted applications processed (promoted) within one business day during promotion periods.
100% of applications selected for manual review are completed, or the student is communicated with, within one week.
Reduction of application related support tickets.
Elimination of Admissions-SME tier 2 support tickets.', 'REACH Queues', 'Per term'),
  (30, 'Trey Mooney', 'University Chaplain', 'Student Services', 'Pending', '> Coordination Meeting with Admissions Leadership
> Data Team ECO Coordination Meeting
> Volunteer Chaplain Leadership Coordination
> Salt Lake City HQ Mission Presidency Coordination
> Conduct Ecclesiastical Endorsement Interviews Training Leadership Interview new Chaplains', 'Ecclesiastical Endorsement Interview Oversight
Partnership and Communication with the Ecclesiastical Clearance Office (ECO).
Chaplain Training and Onboarding
Forecasting and Capacity Planning
Data, Reporting, and Continuous Improvement
Chaplain Endorsement Tool Oversight
Chaplain Recruitment and Load Balancing
Escalation & Student Communication
BYU-Pathway and Partner Collaboration', 'Interviews are accurate, complete, and aligned with the Honor Code.
Chaplains are well-trained, confident, and performing at high quality levels.
Chaplains are provided with the tools that allow them to be efficient and effective in conducting Ecclesiastical Endorsement Interviews (Chaplain Portal)
There exists a high level of discretion, care, and spiritual sensitivity in student and team interactions.
There is strong collaboration with internal departments and external partners to ensure alignment on policies, communication, and endorsement processes.
All updates to ECS and all tracking tools reflect current and correct information.
Dashboards and reports provide clear, actionable insights that guide decisions.
Feedback from students, chaplains, and ECO indicates a positive and supportive interview experience.', 'Target interview timelines (goal: within 2 weeks) are consistently met.', '100% of Chaplain endorsement requests being worked on within 1 week (first contact attempt).
Endorsement requests completed within 2 weeks of entering Chaplain queue.
Weekly training/coordination with lead chaplains.
Monthly training/coordination with all chaplains."', 'Chaplin dashboard', 'Monthly'),
  (31, 'Hilary Bagley', 'Student Experience Coordinator', 'Student Services', 'Complete', '> Coordinate Training with other Pathway departments as well as with our partners.
> Coordinate with those working on video and other media creative projects to supplement our KBs.
> Communicate with SSC structure within the organization and with our partners.
> Collaborate with Student Support to ensure that the student-facing articles on the Help Centre are easily accessible and accurate.
> Outline and communicate the student journey', 'Milestone Maps
Training Development
New Registration KBs for who is moving to new registration and who isn''t
Class Planning
How to us Program Plans
Springboard contractors checking all KBs for accuracy.', 'Ensure that the Help Centre has everything a student needs to navigate the student experience autonomously. Including all steps, micro steps, links, pictures, and videos.
Understand the full student experience to advocate and plan for their needs.
Coordinate with SMEs and write KBs to their specifications.', 'None', 'Audit every external article each quarter.
Confirm SME meetings are occurring each week.', 'None', 'Weekly & Quarterly');

-- ── the Registry remainder ────────────────────────────────────────────────
-- Guarded on employee + measure so a re-run adds nothing twice, and so a row a
-- PM has since edited on the ScoreCard is never overwritten by the older text.
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Helen Reboucas', 'Student Grievance Coordinator', 'Dean of Students', 'Student grievance case resolution time', 'Operational Outcomes', 'Speed', 'Data available', '<5 days', '5 - 7 days', '>7 days', 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Helen Reboucas')
     and lower(k.kpi_measure) = lower('Student grievance case resolution time'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Application Rate', 'Student Outcomes', 'Completion', 'Data in report', '80-100%', '65-79%', '<65%', 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Jacob Adams')
     and lower(k.kpi_measure) = lower('Application Rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Retention Rate', 'Student Outcomes', 'Completion', 'Data in report', '>75%', '65-74%', '<65%', 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Jacob Adams')
     and lower(k.kpi_measure) = lower('Retention Rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Completion Rate (Secondary)', 'Student Outcomes', 'Completion', 'Data in report', '>40%', '30-39%', '<30%', 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Jacob Adams')
     and lower(k.kpi_measure) = lower('Completion Rate (Secondary)'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Alison Cundiff', 'Director of Enrollment & Retention', 'Enrollment & Retention', 'Enrollment, retention, completion (primary)', 'Student Outcomes', 'Completion', 'Data in report', null, null, null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Alison Cundiff')
     and lower(k.kpi_measure) = lower('Enrollment, retention, completion (primary)'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Overall student autonomy (secondary)', 'Student Outcomes', 'Student Autonomy', 'Data in report', null, null, null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Kelley Richardson')
     and lower(k.kpi_measure) = lower('Overall student autonomy (secondary)'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Application start to admission yield', 'Student Outcomes', 'Completion', 'Data in report', null, null, null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Trevor Shelton')
     and lower(k.kpi_measure) = lower('Application start to admission yield'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Admission to registration yield', 'Student Outcomes', 'Completion', 'Data in report', null, null, null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Trevor Shelton')
     and lower(k.kpi_measure) = lower('Admission to registration yield'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Endorsement case resolution rate', 'Operational Outcomes', 'Speed', 'No data', null, null, null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Shaunasee Janette James')
     and lower(k.kpi_measure) = lower('Endorsement case resolution rate'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Number of transfer evaluation cases', 'Operational Outcomes', 'Quality', 'Data available', null, null, null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Shaunasee Janette James')
     and lower(k.kpi_measure) = lower('Number of transfer evaluation cases'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Number of endorsement cases', 'Operational Outcomes', 'Quality', 'Data available', null, null, null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Shaunasee Janette James')
     and lower(k.kpi_measure) = lower('Number of endorsement cases'));
insert into public.kpis (employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status)
select 'Ely Zmolek', 'Enrollment Services Specialist', 'Enrollment & Retention', 'Number of admissions support cases', 'Operational Outcomes', 'Quality', 'Data available', null, null, null, 'Not Tracking'
 where not exists (select 1 from public.kpis k
   where lower(k.employee) = lower('Ely Zmolek')
     and lower(k.kpi_measure) = lower('Number of admissions support cases'));

commit;
