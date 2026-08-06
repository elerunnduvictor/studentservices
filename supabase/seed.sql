-- ═══════════ SEED DATA ═══════════
-- Generated 2026-08-06 by supabase/import_sheets.py
-- Reloads every table from the source workbooks. Safe to re-run.
-- Audit triggers are suspended so the import is not logged as user edits.

begin;

alter table public.okrs disable trigger okrs_audit;
alter table public.employees disable trigger employees_audit;
alter table public.student_employees disable trigger student_employees_audit;
alter table public.org_chart_nodes disable trigger org_chart_nodes_audit;
alter table public.kpis disable trigger kpis_audit;

truncate public.okrs, public.employees, public.student_employees,
         public.org_chart_nodes, public.kpis restart identity;

insert into public.okrs (sort_order, okr, key_result, sub_key_result, sub_key_result_child, period, primary_stakeholder, secondary_stakeholders, project_manager, type, goal, stretch_goal, progress, status, trend, comment, update_date) values
  (1, 'Clarify and refine the Student Services organization', 'Create Student Services team member awareness & role development', 'Student Services Survey Results: Access to Resources', null, 'Annual - 2026', 'Ben Packer', 'Nathan Relken', 'Jess Swinburne', 'KPI % - Increase', 0.9, null, 0.84, 'On Track', 'Maintaining', 'This question is focused on whether team members feel like they have access to the resources they need to effectively fulfill their role.

System issues and improvements are a focus for improvement on these items. We are working on the ITD roadmaps which will bring about a certain amount of system improvements and including system development into the role expectations for certain team members.

We had a discussion on this KR in SSLC on July 15th. Access to resources is still a place we feel like team members may be feeling pressure. The directors will hold discussions with their teams and report back so we can get a clear picture of our progress in this area.', '2026-07-31'),
  (2, 'Clarify and refine the Student Services organization', 'Create Student Services team member awareness & role development', 'Student Services Survey Results: Confusion of Student Services Roles (other departments)', null, 'Annual - 2026', 'Ben Packer', 'Nathan Relken', 'Jess Swinburne', 'KPI # - Decrease', 5.0, 0.0, 9.0, 'At Risk', 'Maintaining', 'This question was related to how many people reported that they collaborate with Student Services often and feel like the roles and responsibilities of our team members are unclear to them. 9 out of 13 distinct individuals reported that they were confused about the roles of Student Services team members.

The Student Services Hub is completed and has been presented to President Ashton and SSC. We have been working to identify groups of people who should have access so we can provision them. The next step in the project is KPI scorecards, which we have released a first draft of. This will be presented in SSC on August 5th.', '2026-07-31'),
  (3, 'Clarify and refine the Student Services organization', 'Create Student Services team member awareness & role development', 'Student Services Survey Results: Role Clarity', null, 'Annual - 2026', 'Ben Packer', 'Nathan Relken', 'Jess Swinburne', 'KPI % - Increase', 0.9, 1.0, 0.94, 'Completed - On time', 'Maintaining', 'The ''Role Clarity'' category is comprised of the questions around understanding their role (97%) and knowing how success is measured (92%).

Although we have already exceeded our goal at baseline, our Organizational Clarity projects will continue to provide additional role clarity for all team members. We are now working on adding KPI scorecards to the Student Services Hub, which will add an aspect of performance tracking to the Hub for further clarity.', '2026-07-31'),
  (4, 'Clarify and refine the Student Services organization', 'Create Student Services team member awareness & role development', 'Student Services Survey Results: Workload', null, 'Annual - 2026', 'Ben Packer', 'Nathan Relken', 'Jess Swinburne', 'KPI % - Increase', 0.9, null, 0.7, 'On Track', 'Maintaining', 'The ''Workload'' category is comprised of the questions around workload (79%) and time spent on strategy (61%).

We had a discussion on this KR in SSLC on July 15th. We are interested in gaining an understanding of how team members currently feel about their workload. The directors will hold discussions with their teams and report back so we can get a clear picture of our progress in this area.', '2026-07-31'),
  (5, 'Clarify and refine the Student Services organization', 'Develop plans and documentation for role and process definition, succession, and scalability', 'Process documentation is assessed, created or updated if necessary, and stored in a central repository.', null, 'Q4 - 2026', 'Ben Packer', 'Nathan Relken', 'Jess Swinburne', 'Milestone Tracked', 1.0, null, 0.18, 'On Track', null, 'We are continuing progress on identifying key Student Services processes following the survey rollout and defining the systematic storage workflow to prepare for upcoming document submissions.

Progress Update:

Generate complete list of processes: Currently at 75% progress via the Student Services Process Identification Survey.

Determine storage procedure: Currently at 50% progress in finalizing the storage plan.', '2026-07-31'),
  (6, 'Clarify and refine the Student Services organization', 'Develop plans and documentation for role and process definition, succession, and scalability', 'Succession plans for each Full Time Employee are created and stored in a central repository', null, 'Q2 - 2026', 'Ben Packer', 'Nathan Relken', 'Jess Swinburne', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - On time', null, 'June 12th update: Project is completed and reviewed. As a follow up, we are exploring how succession plans can be stored in @work.

This project is nearing completion. The Registrar''s office still has some information to be added. Many of the other departments have left gaps in their succession plans, but we can continue to fill in the gaps once the base project is completed.', '2026-05-31'),
  (7, 'Clarify and refine the Student Services organization', 'Develop plans and documentation for role and process definition, succession, and scalability', 'Scalability plans for each Student Services Department are created and stored in a central repository', null, 'Q2 - 2026', 'Ben Packer', 'Nathan Relken', 'Jess Swinburne', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - On time', null, 'All departments successfully completed their scalability plans on time. The document will be reviewed and updated over time, but the base product is complete.', '2026-05-31'),
  (8, 'Clarify and refine the Student Services organization', 'Develop plans and documentation for role and process definition, succession, and scalability', 'Team and position descriptions, and KPIs are recorded and made available.', null, 'Q1 - 2026', 'Ben Packer', 'Nathan Relken', 'Jess Swinburne', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - On time', null, 'April 27th update: Student Services site is completed, with a directory and full org chart. Please contact Jess or Ben for the link and access instructions if needed. 

KPI Project: Ben will review the sheet on his own and consider the need for any final changes. Jess & David have standardized the language and data structure in the document.

Role Inventory Site:

Directory has been completed.
Org chart is ready to be fully populated. 
We met with Paul Scherbel & ICS we were able to determine how to embed the org chart and any other site into the SharePoint 
The new Student Services hub is designed and being populated with information.
James is working to finalize the Role Inventory documents for Springboard contractors - 95% completed.
We haven''t been able to get the document where Springboard is tracking the total number of contractors each pay period so we can finalize the format of the Springboard page, but we will keep working on it.', '2026-05-31'),
  (9, 'Clarify and refine the Student Services organization', 'Implement performance evaluation and professional development plans', 'Design and implement revised performance evaluation program by September 1 to be conducted with each team member in Q4', null, 'Annual - 2026', 'Ben Packer', 'Nathan Relken', 'Jess Swinburne', 'Milestone Tracked', 1.0, null, 0.35, 'At Risk', null, 'Working towards creating the evaluation guides, we were able to find and review a number of CAP and atwork resources that already exist. We have reviewed the goals and pushed the timeline to complete the guides to the end of August. The current plan is to use the existing resources to create a guide on a SharePoint site for all team members to use while completing their evaluations.

We have been waiting for my atwork approval so we can continue work on creating the guides. This process seems to be blocked, as I haven''t been given access and there seems to be hesitation to provide it. Jake Walter''s is out until August 11th. If I have not been given access by this date, I will pivot and replan the project so that the work can be completed in another way.', '2026-07-31'),
  (10, 'Clarify and refine the Student Services organization', 'Implement performance evaluation and professional development plans', 'Implement professional development plans for all Student Service employees to begin being utilized by each team member in Q4', null, 'Annual - 2026', 'Ben Packer', 'Nathan Relken', 'Jess Swinburne', 'Milestone Tracked', 1.0, null, 0.45, 'On Track', null, 'Working towards creating the evaluation guides (which will include the PD aspect), we were able to find and review a number of CAP and atwork resources that already exist. We have reviewed the goals and pushed the timeline to complete the guides to the end of August. The current plan is to use the existing resources to create a guide on a SharePoint site for all team members to use while completing their evaluations.

We have been waiting for my atwork approval so we can continue work on creating the guides. This process seems to be blocked, as I haven''t been given access and there seems to be hesitation to provide it. Jake Walter''s is out until August 11th. If I have not been given access by this date, I will pivot and replan the project so that the work can be completed in another way.', '2026-07-31'),
  (11, 'Enable enrollment scaling', 'Ensure students can get a transcript in a timely manner', 'Transcript ADOs (bugs) will be eliminated by June 1, allowing us to run clean transcripts', null, 'Jan 01 - Jun 01', 'Mark Gefrom', 'Kari Johnson, Tyson Bell, Anne Owen', 'Moses Abioye', 'KPI # - Decrease', 5.0, 0.0, 8.0, 'At Risk', 'Trending down', 'Work is still in progress and all stakeholders are collaborating well to get this resolved as soon as possible in order to meet the new deadline', '2026-07-31'),
  (12, 'Enable enrollment scaling', 'Ensure students can get a transcript in a timely manner', 'More than 90% of students can receive a transcript within 10 days starting April 6', null, 'Jan 01 - Jun 30', 'Mark Gefrom', 'Kari Johnson, Tyson Bell, Anne Owen', 'Moses Abioye', 'KPI % - Increase', 0.9, 1.0, 0.96, 'Completed - On time', 'Trending up', 'Status ''Completed ''', '2026-07-17'),
  (13, 'Enable enrollment scaling', 'Create student satisfaction and enrollment scalability by successfully deploying the Companion App', 'Companion app will serve as the primary service interface for a majority of students by Block 6, 2026', null, 'Annual - 2026', 'Jacob Adams', 'Ricky Kailiponi Jr.', 'David Koomson', 'KPI % - Increase', 0.51, 1.0, 0.49, 'On Track', 'Maintaining', 'Companion has been rolled out to all students, and tracking efforts have been in place to ensure accurate tracking. This value will be reflected accurately in the next Check-In', '2026-07-31'),
  (14, 'Enable enrollment scaling', 'Create student satisfaction and enrollment scalability by successfully deploying the Companion App', 'Companion app will maintain a C-Sat of 85%', null, 'Annual - 2026', 'Jacob Adams', 'Ricky Kailiponi Jr.', 'David Koomson', 'KPI % - Increase', 0.85, 1.0, 0.93, 'On Track', 'Trending up', 'Status ''On Track ''', '2026-07-31'),
  (15, 'Enable enrollment scaling', 'Create student satisfaction and enrollment scalability by successfully deploying the Companion App', 'Prepare Companion app to provide end-to-end services and be made available to all students by July 1', null, 'Annual - 2026', 'Jacob Adams', 'Ricky Kailiponi Jr.', 'David Koomson', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - On time', null, 'Completed', '2026-07-17'),
  (16, 'Enable enrollment scaling', 'Create student satisfaction and enrollment scalability by successfully deploying the Companion App', 'With ICS, create and implement operational resilience within the Companion app by May 18', null, 'Annual - 2026', 'Jacob Adams', 'Ricky Kailiponi Jr.', 'David Koomson', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - On time', null, 'Operational resilience initiatives for the Companion application have been completed in partnership with ICS. Application lifecycle segmentation across development, testing, and production environments has been implemented, alongside ADO pipeline deployment and rollback capabilities to support more reliable release management. Smoke, regression, and load testing activities have been finalized, providing additional confidence in application stability and deployment readiness. QA testing has also been incorporated into CI/CD processes, strengthening quality assurance practices throughout the development lifecycle. Phase 2 activities have been completed, establishing the foundational infrastructure and deployment framework needed to support ongoing Companion operations and future enhancements.', '2026-05-31'),
  (17, 'Enable enrollment scaling', 'Complete Admissions ITD roadmap of essential features for scale', 'Complete Admissions ITD roadmap of essential features for scale', 'Q1 Admissions ITD roadmap', 'Annual - 2026', 'Alison Cundiff', 'Trevor Shelton, Johanna Powell', 'Charles Crankson', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - On time', null, 'Some Items have been moved around to future quarters. All Items have been completed for Q1.', '2026-05-31'),
  (18, 'Enable enrollment scaling', 'Complete Admissions ITD roadmap of essential features for scale', 'Complete Admissions ITD roadmap of essential features for scale', 'Q2 Admissions ITD roadmap', 'Annual - 2026', 'Alison Cundiff', 'Trevor Shelton, Johanna Powell', 'Charles Crankson', 'Milestone Tracked', 1.0, null, null, null, null, null, '2026-07-17'),
  (19, 'Enable enrollment scaling', 'Complete Admissions ITD roadmap of essential features for scale', 'Complete Admissions ITD roadmap of essential features for scale', 'Q3 Admissions ITD roadmap', 'Annual - 2026', 'Alison Cundiff', 'Trevor Shelton, Johanna Powell', 'Charles Crankson', null, 1.0, null, 0.26, 'At Risk', null, 'Work is moving forward, with two milestones progressing since the previous check-in. Johanna and Trevor are still confident that we will be able to complete all items within Q3. 

Enroll Portuguese students in EnglishConnect - 0% > 0% - We still do not anticipate that we will need to complete this work but have not confirmed that yet.
Enhance analytics for application and admissions modules - 0% > 0% - We have not started on this project yet.
Automate promotion once a qualifying application is submitted - 0% > 0% - We have not started on this project yet.
Recognize EnglishConnect for Missionaries (ECM) completion to qualify for PathwayConnect - 2% > 2% - No progress made on this project.
Expand academic history data collection - 0% > 10% - Business requirements gathered. We are now working with ICS to design experience.
Improve handoff from admission to registration - 2% > 10% - All C&D and PC admits are being provisioned in Canvas upon promotion. We have also completed the first phase of our discovery work to determine how long it takes for each step between admit and promotion.
Improve performance tracking on key admissions processes & systems - 50% > 50% - We have started doing discovery work to determine how the systems are currently performing and then will need to make adjustments as needed.
Improve ELA exemption and scoring rules - 95% > 95% - no new progress made.
Improve emails and nudges through the application journey - 50% - In progress
Spanish Student Portal Modules Implementation Part #1 - 30% > 90% - Released ELA and Credit Transfer modules to support Spanish in the student Portal. The Parent Program Selection updates will be released next week. Ecclesiastical Endorsement module will be updated in Q4.', '2026-07-31'),
  (20, 'Enable enrollment scaling', 'Complete Admissions ITD roadmap of essential features for scale', 'Complete Admissions ITD roadmap of essential features for scale', 'Q4 Admissions ITD roadmap', 'Annual - 2026', 'Alison Cundiff', 'Trevor Shelton, Johanna Powell', 'Charles Crankson', null, null, null, null, 'Not Started', null, 'Due to begin in October.', '2026-07-17'),
  (21, 'Enable enrollment scaling', 'Complete IT development roadmaps to provide effective, scalable services', 'Complete Planning and Registration ITD roadmap of essential features for scale', 'Q1 Planning and Registration ITD roadmap', 'Annual - 2026', 'Mark Gefrom', 'Dustin Waite, Kari Johnson', 'Moses Abioye', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - Late', null, 'PATH 1.0 Data Migration
Status: Completed. -All of the development for this has been completed.  It is now in BJ''s area for data clean up and checking on it.  From the development team''s perspective there will be no other updates.  Please work with BJ to getany updates in this area.Moses will follow up with BJ - BJ is still working with Elucian team to update a few item', '2026-05-31'),
  (22, 'Enable enrollment scaling', 'Complete IT development roadmaps to provide effective, scalable services', 'Complete Planning and Registration ITD roadmap of essential features for scale', 'Q2 Planning and Registration ITD roadmap', 'Annual - 2026', 'Mark Gefrom', 'Dustin Waite, Kari Johnson', 'Moses Abioye', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - On time', null, 'All items here have been completed', '2026-06-26'),
  (23, 'Enable enrollment scaling', 'Complete IT development roadmaps to provide effective, scalable services', 'Complete Planning and Registration ITD roadmap of essential features for scale', 'Q3 Planning and Registration ITD roadmap', 'Annual - 2026', 'Mark Gefrom', 'Dustin Waite, Kari Johnson', 'Moses Abioye', 'Milestone Tracked', 1.0, null, 0.41, 'On Track', null, 'Updates from Dustin

My Program: Catalog Selection Updates

Status: Completed - This was turned on in Production on 7/21.


S&I Transfer Improvements

Status: Completed -  This was completed on 7/20


Process to Award a Credentials

Status: In Progress - This seems to be getting bigger on what is needed.  Dustin will work with the developers to determine if this can still be completed by the end of the quarter.


Integrations for OOB Gatherings

Status: Not Started - Making good progress around configurations in preparation for necessary development


My Program: Withdrawing/Leave of Absence

Status: Not Started - Need to make sure all the requirements on this are nailed down.  Dustin will be meeting with key business partners in order to accomplish what is needed.', '2026-07-31'),
  (24, 'Enable enrollment scaling', 'Complete IT development roadmaps to provide effective, scalable services', 'Complete Planning and Registration ITD roadmap of essential features for scale', 'Q4 Planning and Registration ITD roadmap', 'Annual - 2026', 'Mark Gefrom', 'Dustin Waite, Kari Johnson', 'Moses Abioye', 'Milestone Tracked', 1.0, null, null, 'Not Started', null, 'My Program Enhancement- got moved up in priority based on several issues we are seeing in the student journey.  We now hope to accomplish this sometime in Q2.  Previously, it was in Q4.

The first of the enhancements is being tested right now.  Other enhancements are currently being worked on.

All other features are pending start', '2026-07-31'),
  (25, 'Enable enrollment scaling', 'Complete IT development roadmaps to provide effective, scalable services', 'Complete Student Support ITD roadmap of essential features for scale', 'Q1 Student Support ITD roadmap', 'Annual - 2026', 'Mark Gefrom', 'Chad Neth, Brad Lester', 'Victor Elerunndu', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - Late', null, 'Several Companion and Help Center enhancements have been successfully completed and prepared for release, including WhatsApp support interactions, ticket alerts for student responses, Help Center tutorials, phone support estimated wait times, institution-level ticket reporting, organizational structure integration within Reach, phone support callback functionality, visible Help Center phone numbers for current and prospective students, SMS support interactions, and transcript queue improvements. These enhancements have been completed, tested, and validated, improving communication channels, support accessibility, and operational visibility for both students and support teams. Final release activities have been completed, and the solution is ready for deployment.', '2026-05-31'),
  (26, 'Enable enrollment scaling', 'Complete IT development roadmaps to provide effective, scalable services', 'Complete Student Support ITD roadmap of essential features for scale', 'Q2 Student Support ITD roadmap', 'Annual - 2026', 'Mark Gefrom', 'Chad Neth, Brad Lester', 'Victor Elerunndu', 'Milestone Tracked', 1.0, null, 0.76, 'At Risk', null, 'Progress is mixed across the initiatives. Graduation Processes Added to Case Management has resumed after delays and is now being worked on. Automated Product Manager and Key Stakeholder Reporting has been completed. Several initiatives, including Companion App Forms, Prospective Student Case Creation, Phone Support Outage Alerts, and Automated CC on Employee Escalations, have been moved to Q3 due to dependencies and rework. The Help Center Student Forum and AI Assistance Highlighting Frustrated Students remain in progress.', '2026-07-31'),
  (27, 'Enable enrollment scaling', 'Complete IT development roadmaps to provide effective, scalable services', 'Complete Student Support ITD roadmap of essential features for scale', 'Q3 Student Support ITD roadmap', 'Annual - 2026', 'Mark Gefrom', 'Chad Neth, Brad Lester', 'Victor Elerunndu', 'Milestone Tracked', 1.0, null, 0.35, 'At Risk', null, 'Progress is being made across several initiatives. The Student Program in Reach has its database completed and is awaiting front-end development. The Custom Help Center Chatbot is in active development with one story completed and another in progress. Live Chat with Agents is currently in QA and stakeholder review, while Dynamic Language Video and Screenshot Content has not yet started.', '2026-07-31'),
  (28, 'Enable enrollment scaling', 'Complete IT development roadmaps to provide effective, scalable services', 'Complete Student Support ITD roadmap of essential features for scale', 'Q4 Student Support ITD roadmap', 'Annual - 2026', 'Mark Gefrom', 'Chad Neth, Brad Lester', 'Victor Elerunndu', 'Milestone Tracked', 1.0, null, 0.0, 'Not Started', null, 'No progress has been made across the listed initiatives, with all items currently not started. These include AI-assisted auto-merging duplicate tickets, AI-assisted sending alert to leadership alerting, customized help center experience based on loging (Missionary, Mentor, Staff, etc.), and multi-language AI phone agents, indicating work has yet to begin.', '2026-07-31'),
  (29, 'Enable enrollment scaling', 'Complete IT development roadmaps to provide effective, scalable services', 'Complete Student Support ITD roadmap of essential features for scale', 'Launch Live Chat Support for all students by Block 6, 2026', 'Annual - 2026', 'Mark Gefrom', 'Chad Neth, Brad Lester', 'Victor Elerunndu', 'Milestone Tracked', 1.0, null, 0.0, 'Not Started', null, 'Initial tool delivery did not occur within the Jul 01–Jul 24 window, as ICS is still working on finalizing the build on their end. The dependency on ICS to complete and hand over the tool has been the primary factor holding up progress against the original timeline, and the delay has carried downstream implications for subsequent milestones tied to this deliverable.

Per the latest update from Chad, ICS is actively working toward completion, and delivery is now anticipated by August 5. Once the tool is handed over, business user testing will commence immediately to recover as much of the lost timeline as possible, though the shift has pushed that phase out of its original Jul 24 – Jul 31 window.', '2026-07-31'),
  (30, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 75% customer satisfaction among domestic students by Term 6, 2026', null, 'Annual - 2026', 'Steve Thomas', 'Ben Packer', 'Mariela Pezzali', 'KPI % - Increase', 0.75, 0.85, 0.69, 'On Track', 'Maintaining', 'Data collected from the Student Services Executive dashboard - Online Student CSAT for 2026 Block 3 is showing 68.27%. The data has been uploaded to the dashboard following the end of the block.

This is a very similar metric from Block 2. We can expect to see new data for this metric following the end of Block 4.', '2026-07-31'),
  (31, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 75% ticket customer satisfaction among domestic students by Term 6, 2026', null, 'Annual - 2026', 'Mark Gefrom', 'Brad Lester', 'Victor Elerunndu', 'KPI % - Increase', 0.75, 0.85, 0.69, 'On Track', 'Maintaining', 'Ticket customer satisfaction among domestic students is still maintaining 69%, placing the department below the 75% target heading into Term 6, 2025. The metric has been stable at 69% this period. It''s been on 69 for a while now without showing either an upward or downward trend.

 

Key drivers of the decline identified through student feedback include extended response times during peak registration volume, a higher incidence of tickets being closed without confirmed resolution, and recurring friction in the registration process that has generated repeat contacts and escalations. To address these issues, follow-up protocols are being reinforced, agents are being directed to verify resolution with students prior to closing tickets, and registration support workflows are undergoing streamlining. These measures are expected to stabilize the metric in the near term and rebuild momentum toward the target over the remainder of the terms', '2026-07-31'),
  (32, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Over 90% of tickets will be resolved within 5 days by Term 4, 2026', null, 'Annual - 2026', 'Mark Gefrom', 'Brad Lester', 'Victor Elerunndu', 'KPI % - Increase', 0.9, 1.0, 0.81, 'On Track', 'Maintaining', 'The 5-day ticket resolution rate currently stands at 81%, reflecting meaningful progress toward the 90% target by Term 4, 2026. The upward movement this period indicates that recent workflow adjustments are taking hold, and the remaining gap is well within reach given the current trajectory and the runway still available in the timeline.

Efforts driving this improvement have focused on resolving the bottlenecks that previously contributed to extended resolution times, including delayed internal handoffs, incomplete initial responses requiring multiple follow-ups, and registration-related tickets that tend to involve longer processing cycles. Workflow optimizations and enhanced triage protocols are now in effect, ensuring tickets are routed accurately and resolved efficiently within the 5-day window. With these measures continuing to mature, the department is positioned to sustain momentum and close the remaining gap to target within the established timeframe.', '2026-07-31'),
  (33, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 85% student autonomy on all inbound issue tickets by Term 6, 2026', null, 'Annual - 2026', 'Mark Gefrom', 'Dustin Waite, Matt Smith', 'Victor Elerunndu', 'KPI % - Increase', 0.85, 0.9, 0.67, 'At Risk', 'Trending up', 'Student autonomy on inbound issue tickets has moved to 67%, a modest uptick against the 85% target set for Term 6, 2026. After an extended period holding flat at 65%, the shift signals early movement in the right direction, though the 18-percentage-point gap still calls for a more deliberate push to build consistent momentum. The metric reflects the proportion of students who did not open any tickets in the latest period, indicating the level of student self-sufficiency in resolving issues independently.

Strategies to drive autonomy higher remain focused on expanding self-service resources, strengthening knowledge base content around high-volume issue categories such as registration, and improving proactive communication to address common concerns before they generate tickets. Analysis of repeat-ticket patterns and students accumulating three or more cases continues to inform where friction points can be resolved to reduce inbound ticket volume over the coming terms.', '2026-07-31'),
  (34, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 60% PC New yield from admission to registration for Portuguese MLP', null, 'Annual - 2026', 'Alison Cundiff', 'Trevor Shelton', 'Charles Crankson', 'KPI % - Increase', 0.6, 0.65, 0.34, 'In Trouble', 'Trending up', 'Student Services and the MLP committee met on July 1st to discuss student attrition points for Portuguese MLP students. PC new yield from admission to registration was identified as a major cause for concern, and there was a discussion around the various causes. 

Several initiatives were identified to create improvements in this realm, which are all currently being addressed by the initiatives around general PC new yield from admission to registration. 

We have created this KR to track this KPI and record observations as those initiatives progress.', '2026-07-31'),
  (35, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 75% PC New yield from admission to registration', null, 'Annual - 2026', 'Alison Cundiff', 'Trevor Shelton', 'Charles Crankson', 'KPI % - Increase', 0.75, 0.8, 0.64, 'In Trouble', 'Maintaining', 'Registration for 26B4 is now complete, with the metric of 64% showing. This is a 5% decrease from the previous block. 

There doesn''t seem to be any particular cause for this drop that we can track. We are aiming to see an increase in this metric as our initiatives progress to improve the admission to registration experience for students.', '2026-07-17'),
  (36, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 75% PC New yield from admission to registration', 'Refine and scale orientation content for newly admitted students by Block 6, 2026', 'Annual - 2026', 'Alison Cundiff', 'Rachel Kirk, Trevor Shelton', 'Charles Crankson', 'Milestone Tracked', 1.0, null, 0.1, 'At Risk', null, 'No progress on active milestones, as we''re waiting for approvals to proceed.', '2026-07-31'),
  (37, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 75% PC New yield from admission to registration', 'Inventory and refine the communication plan for incoming students by Block 5, 2026', 'Annual - 2026', 'Ben Packer', null, 'Jess Swinburne', 'Milestone Tracked', 1.0, null, 0.45, 'At Risk', null, 'Milestone 1 has been completed, taking an inventory of all of the messages sent to the admitted-not-registered audience for Block 4.

Milestone 2 has been completed, so a refined messaging plan for Block 5 is in place. 

Milestone 3 is blocked as it is dependent on ICS and we don''t currently have insight on when they will be finished their work.', '2026-07-31'),
  (38, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 75% PC New yield from admission to registration', 'Complete a marketing content plan to better inform prospective students (pre-application) by Block 5, 2026', 'Annual - 2026', 'Ben Packer', null, 'Jess Swinburne', 'Milestone Tracked', 1.0, null, 0.3, 'On Track', null, 'Dale was able to provide an update on milestone 1 and 2: 

Introduce social media content priority around student preparedness: "There is an ongoing effort to post regular informational and student preparedness content. This will be an ongoing effort, so there is not a clear "this is done" moment. We have drafts for scripts in Portuguese addressing common preparedness concerns once these and the English counterparts are filmed and scheduled, I''ll consider this step complete."

Deploy new student orientation awareness information: "I''m kicking off this request with my team this week, so it remains at 0% for now. I also plan to add companion app awareness to this step since it appears that sending students to companion is helping the admission to registration yield."

Eric provided an update on milestone 3 and 4: 

Update the Admissions landing page:

"Working on the apply.byupathway.edu page. This is about 50% complete with initial architecture, layout, and content mostly finalized."

User testing for website redesign to validate and guide update plans:

"I would still mark this as 0% complete. We have done some user testing to try out different platforms—and each test has yielded valuable insights around content choices and some initial friction points—but we haven’t ramped this up yet. We’re looking to finalize a deal with usertesting.com very soon so we can do this consistently. "', '2026-07-31'),
  (39, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 75% PC New yield from admission to registration', 'Implement enrollment counselor tracker & alert system in portal and decrease enrollment counselor ratio from 800:1 to 150:1 by Block 6, 2026', 'Annual - 2026', 'Alison Cundiff', 'Rachel Kirk, Trevor Shelton, Sebastian Vargas', 'Charles Crankson', 'Milestone Tracked', 1.0, null, 0.4, 'At Risk', null, 'This KR is blocked because the tracker is incomplete; however, it is mostly completed. We are currently expecting the final work to be done for the tracker in August. Plans are in place to test workload over the next couple of months.', '2026-07-31'),
  (40, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 75% PC New yield from admission to registration', 'Launch the Companion app to PC New students by Block 4, 2026', 'Annual - 2026', 'Jacob Adams', null, 'David Koomson', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - On time', null, 'Completed-On Time', '2026-06-26'),
  (41, 'Enable enrollment scaling', 'KPIs demonstrate high-quality, scalable performance', 'Achieve 75% PC New yield from admission to registration', 'Redesign and develop the PC and EC gathering selection tools in the student portal by Block 2, 2027', 'Annual - 2026', 'Ben Packer', null, 'Jess Swinburne', 'Milestone Tracked', 1.0, null, 0.28, 'On Track', null, 'This project is progressing as expected. The design stage has progressed and is over halfway. Development is now starting.', '2026-07-31'),
  (42, 'Reach retention goals through targeted initiatives', 'Plan and carry out missionary domestic mentoring pilot by Block 5, 2026', 'Missionary domestic mentoring pilot planning', null, 'Jun 1 - Dec 30', 'Alison Cundiff', null, 'Charles Crankson', 'Milestone Tracked', 1.0, null, null, 'Canceled', null, null, '2026-06-12'),
  (43, 'Reach retention goals through targeted initiatives', 'Optimize success network roles and strengthen the analytics engine', 'Mentors will be assessed for retention effectiveness by Block 5, 2026.', null, 'Annual - 2026', 'Alison Cundiff', 'Kelley Richardson, Katelyn Graf', 'Charles Crankson', 'Milestone Tracked', null, null, 0.5, 'On Track', null, 'The Mentoring team is reviewing the dashboard under the overview of the dashboard team. Potential improvements have been planned, and some items have been carried out. However, there are still major improvements still to be made.', '2026-07-17'),
  (44, 'Reach retention goals through targeted initiatives', 'Optimize success network roles and strengthen the analytics engine', 'AI outreach will be activated by Block 2, 2026 and then assessed for effectiveness', null, 'Annual - 2026', 'Jacob Adams', 'Joshua Hadden', 'David Koomson', 'Milestone Tracked', 1.0, null, 0.67, 'At Risk', null, 'We clarified that this KR is focused on measuring the effectiveness of Companion push notifications by tracking which notifications students receive, how they respond, and whether those notifications lead to meaningful actions. Progress is currently dependent on accessing notification-level data, which is not yet available. The team is working with the appropriate technical teams to obtain this data, and the target has been proposed to be moved to Block 6.', '2026-07-31'),
  (45, 'Reach retention goals through targeted initiatives', 'Optimize success network roles and strengthen the analytics engine', 'All Success Network and AI outreach will be concurrently assessed for effectiveness, refined, and revised on a continual upward cycle by Block 5, 2026', null, 'Annual - 2026', 'Jacob Adams', 'Joshua Hadden', 'David Koomson', 'Milestone Tracked', 1.0, null, 0.81, 'At Risk', null, 'The team continues working with stakeholders to evaluate and improve both AI and Success Network outreach. Predictive models are available, but implementation depends on stabilizing existing systems and agreeing on how predictive insights will be used. The timeline is still under review because of these dependencies', '2026-07-31'),
  (46, 'Reach retention goals through targeted initiatives', 'Launch new student orientation to increase 2nd term retention', 'Demonstrate a 3-point 2nd term retention increase for an orientation experimental group', null, 'Annual - 2026', 'Alison Cundiff', 'Trevor Shelton, Rachel Kirk', 'Charles Crankson', 'KPI % - Increase', 0.03, 0.07, 0.0, 'On Track', 'Maintaining', 'Cohorts for retention analysis have been identified and confirmed.
The first cohort has completed the NSO module.
The second cohort (Block 4, 2026 intake) has been invited and will complete the orientation as part of their onboarding journey.

Next Steps
Begin formal monitoring of second-term retention for the first cohort following Block 4, 2026 enrollment outcomes.
Initiate retention tracking for the second cohort following Block 5, 2026 enrollment outcomes.
Compare retention results against established baseline metrics to assess progress toward the targeted 3-percentage-point improvement.', '2026-07-17'),
  (47, 'Reach retention goals through targeted initiatives', 'Launch new student orientation to increase 2nd term retention', 'Develop, pilot and scale new student orientation content', null, 'Jan 01 - Jun 30', 'Alison Cundiff', 'Rachel Kirk', 'Charles Crankson', 'Milestone Tracked', 1.0, null, 1.0, 'Completed - On time', null, 'This project is now considered completed, as the Block 4, 2025 cohort has been invited to participate, and the block has since started. 

The work started in this initiative will be continued in the KR "Refine and scale orientation content for newly admitted students by Block 6, 2026". This can be found under "Achieve 75% PC New yield from admission to registration."', '2026-06-26'),
  (48, 'Reach retention goals through targeted initiatives', 'Achieve retention & completion KPIs', 'Achieve 40% C1 Completion', null, 'Annual - 2026', 'Alison Cundiff', 'Katelyn Graf', 'Charles Crankson', 'KPI % - Increase', 0.4, 0.5, 0.33, 'At Risk', 'Trending down', 'With the close of 26B3, we have added the metric from 25B2. This metric shows a downward trend as see a drop from 36% in 25B1 to 33% in 25B2.

We can likely attribute the loss in progress on this metric to the change to Anthology in 2025. We will investigate to ascertain if there is any further root cause to be discovered and report back in future check-ins.', '2026-07-31'),
  (49, 'Reach retention goals through targeted initiatives', 'Achieve retention & completion KPIs', 'Achieve 55% C&D 4-term Retention', null, 'Annual - 2026', 'Alison Cundiff', 'Katelyn Graf', 'Charles Crankson', 'KPI % - Increase', 0.55, 0.65, 0.39, 'In Trouble', 'Maintaining', 'Data for 25B6 has been added, which shows 39% retention, which was the same as 25B5. This is a major decline from 48% in 25B4.', '2026-07-31'),
  (50, 'Reach retention goals through targeted initiatives', 'Achieve retention & completion KPIs', 'Achieve 45% PC Completion', null, 'Annual - 2026', 'Alison Cundiff', 'Katelyn Graf', 'Charles Crankson', 'KPI % - Increase', 0.45, 0.55, 0.31, 'In Trouble', 'Maintaining', 'With the close of 26B3, we have added the metric from 25B4. The new data shows a slight increase after a downward trend as the metric fell from 36% in 25B1, to 30% in 25B2, to 29% in 25B3.

We can likely attribute the loss in progress on this metric to the change to Anthology in 2025. The increase to 31% is a positive indication that we began to recover in later blocks.', '2026-07-31');

insert into public.employees (sort_order, name, role, department, employment_type, primary_stakeholder, sub_department, contract_organization, tier) values
  (1, 'Gisele Loisotto', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Sandra Wurttele', 'Accessibility Office', 'Springboard', '3'),
  (2, 'Sandra Wurttele', 'Accessibility Office Coordinator', 'Dean of Students', 'Professional Contractor', 'Anne Marie Clark', 'Department Leadership', 'Velocity Global - EOR', 'EOR'),
  (3, 'Ana de Castro', 'Office of Belonging Coordinator', 'Dean of Students', 'Full-Time Employee', 'Anne Marie Clark', 'Department Leadership', null, null),
  (4, 'Mariela Pezzali', 'Project Manager', 'Dean of Students', 'Professional Contractor', 'Steven K. Thomas', 'Department Leadership', 'Springboard', '3.5'),
  (5, 'Joseph Bentum', 'Student Crisis Office Coordinator', 'Dean of Students', 'Professional Contractor', 'Anne Marie Clark', 'Department Leadership', 'XML- EOR', 'EOR'),
  (6, 'Ana Clara Lopes', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Joseph Bentum', 'Student Crisis Office', 'Springboard', '3'),
  (7, 'Lawrence Genesis Onyeisi', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Katelyn Ray', 'Student Honor & Conduct Office', 'Springboard', '3'),
  (8, 'Ariana Ester Manley Mejia', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Sandra Wurttele', 'Accessibility Office', 'Springboard', '3'),
  (9, 'Jarom Nascimento', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Sandra Wurttele', 'Accessibility Office', 'Springboard', '3'),
  (10, 'Helen Segalla de Oliveira Rebouças', 'Student Grievance Coordinator', 'Dean of Students', 'Professional Contractor', 'Anne Marie Clark', 'Department Leadership', 'Springboard', '3.5'),
  (11, 'Anne Marie Clark', 'Associate Dean of Students', 'Dean of Students', 'Full-Time Employee', 'Steven K. Thomas', 'Department Leadership', null, null),
  (12, 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'Full-Time Employee', 'VP of Student Services', 'Department Leadership', null, null),
  (13, 'Joseph Chingwara', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Helen Segalla de Oliveira Rebouças', 'Grievance Office', 'Springboard', '3'),
  (14, 'Ifunanya Queendalyn Okeke', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Helen Segalla de Oliveira Rebouças', 'Grievance Office', 'Springboard', '3'),
  (15, 'Wesley dos Santos', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Helen Segalla de Oliveira Rebouças', 'Grievance Office', 'Springboard', '3'),
  (16, 'Katelyn Ray', 'Student Honor & Conduct Coordinator', 'Dean of Students', 'Full-Time Employee', 'Anne Marie Clark', 'Service Area Coordinators', null, null),
  (17, 'Scott Appiah', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Joseph Bentum', 'Student Crisis Office', 'Springboard', '3'),
  (18, 'Tubo-Oreriba Joseph Elisha', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Joseph Bentum', 'Student Crisis Office', 'Springboard', '3'),
  (19, 'Israel Juzgaya', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Katelyn Ray', 'Student Honor & Conduct Office', 'Springboard', '3'),
  (20, 'Rhoda Mabundu', 'Dean of Students Office Specialist', 'Dean of Students', 'Professional Contractor', 'Katelyn Ray', 'Student Honor & Conduct Office', 'Springboard', '3'),
  (21, 'Isaias Zuñiga', 'AI Dev. Manager', 'Digital Operations', 'Professional Contractor', 'Ricky Kailiponi Jr.', 'AI', 'Upwork', '3'),
  (22, 'Diego Huarsaya', 'AI Engineer', 'Digital Operations', 'Professional Contractor', 'Jorge Chavez', 'AI', 'Upwork', '3'),
  (23, 'Jorge Sosa', 'AI Engineer', 'Digital Operations', 'Professional Contractor', 'Isaias Zuñiga', 'AI', 'Upwork', '3'),
  (24, 'Steven Tan', 'AI Engineer', 'Digital Operations', 'Professional Contractor', 'Juan Camargo', 'AI', 'Upwork', '3'),
  (25, 'Prosper Odinakachukwu', 'AI Engineer', 'Digital Operations', 'Professional Contractor', 'Juan Camargo', 'AI', 'Upwork', '3'),
  (26, 'Jorge Chavez', 'Team Lead', 'Digital Operations', 'Professional Contractor', 'Isaias Zuñiga', 'AI', 'Upwork', '3'),
  (27, 'Juan Camargo', 'Team Lead', 'Digital Operations', 'Professional Contractor', 'Isaias Zuñiga', 'AI', 'Upwork', '3'),
  (28, 'Samuel Riveros', 'Companion & Special Projects Dev. Manager', 'Digital Operations', 'Professional Contractor', 'Ricky Kailiponi Jr.', 'Companion & Special Projects', 'Springboard', '3'),
  (29, 'Jacob Sanchez', 'Companion Native Developer, Security Champion', 'Digital Operations', 'Professional Contractor', 'Alirio Mieres', 'Companion & Special Projects', 'Upwork', '3'),
  (30, 'Valerie Sanchez', 'Companion Web Developer', 'Digital Operations', 'Professional Contractor', 'Ariel Sanchez', 'Companion & Special Projects', 'Upwork', '3'),
  (31, 'Michelle Gutierrez', 'Companion Web Developer, Lead Designer', 'Digital Operations', 'Professional Contractor', 'Ariel Sanchez', 'Companion & Special Projects', 'Upwork', '3'),
  (32, 'Timileyin Omikunle', 'Developer, QA Champion', 'Digital Operations', 'Professional Contractor', 'Gabriel Bolivar', 'Companion & Special Projects', 'Upwork', '3'),
  (33, 'Alirio Mieres', 'Team Lead, Companion Web & Native Developer', 'Digital Operations', 'Professional Contractor', 'Samuel Riveros', 'Companion & Special Projects', 'Upwork', '3'),
  (34, 'Ariel Sanchez', 'Team Lead, Companion Web Developer', 'Digital Operations', 'Professional Contractor', 'Samuel Riveros', 'Companion & Special Projects', 'Springboard', '3'),
  (35, 'Gabriel Bolivar', 'Team Lead, QA & Documentation', 'Digital Operations', 'Professional Contractor', 'Samuel Riveros', 'Companion & Special Projects', 'Springboard', '3'),
  (36, 'John Ayinde', 'D365 & Automation Dev. Team Lead', 'Digital Operations', 'Professional Contractor', 'Sebastian Vargas', 'D365 & Automation', 'Springboard', '3'),
  (37, 'Sebastian Vargas', 'D365 & Automation Dev. Manager', 'Digital Operations', 'Professional Contractor', 'Ricky Kailiponi Jr.', 'D365 & Automation', 'Springboard', '3'),
  (38, 'Matias Gutierrez', 'Team Lead', 'Digital Operations', 'Professional Contractor', 'Sebastian Vargas', 'D365 & Automation', 'Springboard', '3'),
  (39, 'Elias Oyarzun', 'PowerApps Developer', 'Digital Operations', 'Professional Contractor', 'Matias Gutierrez', 'D365 & Automation', 'Upwork', '3'),
  (40, 'Ignacio Alvarez', 'PowerApps Developer', 'Digital Operations', 'Professional Contractor', 'John Ayinde', 'D365 & Automation', 'Upwork', '3'),
  (41, 'Jose Sanchez', 'PowerApps Developer', 'Digital Operations', 'Professional Contractor', 'Matias Gutierrez', 'D365 & Automation', 'Upwork', '3'),
  (42, 'Rawin Olivera', 'PowerApps Developer', 'Digital Operations', 'Professional Contractor', 'John Ayinde', 'D365 & Automation', 'Springboard', '3'),
  (43, 'Rene Sanchez', 'PowerApps Developer', 'Digital Operations', 'Professional Contractor', 'John Ayinde', 'D365 & Automation', 'Upwork', '3'),
  (44, 'James De Guzman', 'Analytics & Automation Specialist', 'Digital Operations', 'Professional Contractor', 'Aitana Toscano', 'Data', 'Upwork', '3'),
  (45, 'Dulci Dos Santos', 'Team Lead', 'Digital Operations', 'Professional Contractor', 'Aitana Toscano', 'Data', 'Springboard', '3'),
  (46, 'Gonzalo Oyarzun', 'Data Analyst & Reporting Specialist', 'Digital Operations', 'Professional Contractor', 'Aitana Toscano', 'Data', 'Upwork', '3'),
  (47, 'Nefi Dorado', 'Data Analyst & Reporting Specialist', 'Digital Operations', 'Professional Contractor', 'Aitana Toscano', 'Data', 'Upwork', '3'),
  (48, 'Oluwatobi Makinde', 'Data Analyst & Reporting Specialist', 'Digital Operations', 'Professional Contractor', 'Aitana Toscano', 'Data', 'Upwork', '3'),
  (49, 'Goodness Okafor', 'Data Pipeline Engineer', 'Digital Operations', 'Professional Contractor', 'Dulci Dos Santos', 'Data', 'Upwork', '3'),
  (50, 'Matias Valenzuela', 'ML Specialist (Predictive Models)', 'Digital Operations', 'Professional Contractor', 'Aitana Toscano', 'Data', 'Springboard', '3'),
  (51, 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Full-Time Employee', 'VP of Student Services', 'Department Leadership', null, null),
  (52, 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Operations', 'Digital Operations', 'Full-Time Employee', 'Jacob Adams', 'Department Leadership', null, null),
  (53, 'Feyisayo Famakinde', 'Azure DevOps Engineer', 'Digital Operations', 'Professional Contractor', 'Ricky Kailiponi Jr.', 'Dev-Ops', 'Upwork', '3'),
  (54, 'Karina Vargas', 'Coordinator', 'Digital Operations', 'Professional Contractor', 'Ricky Kailiponi Jr.', 'Project Management', 'Upwork', '3'),
  (55, 'David Peck', 'Operational Data Analyst', 'Digital Operations', 'Full-Time Employee', 'Joshua Stafford Hadden', 'Systems & Operations', null, null),
  (56, 'Pelenatita Neiufi', 'Reporting & Evaluation Coordinator', 'Digital Operations', 'Full-Time Employee', 'Joshua Stafford Hadden', 'Systems & Operations', null, null),
  (57, 'Victor Lamôni Calado Ferreira', 'System & Operations Associate Registrar', 'Digital Operations', 'Full-Time Employee', 'Joshua Stafford Hadden', 'Systems & Operations', null, null),
  (58, 'Aitana Nathaly Toscano Cedeño', 'Data Manager', 'Digital Operations', 'Professional Contractor', 'Joshua Stafford Hadden', 'Data', 'Springboard', '3'),
  (59, 'Joshua Stafford Hadden', 'System & Operations Manager', 'Digital Operations', 'Full-Time Employee', 'Jacob Adams', 'Systems & Operations', null, null),
  (60, 'James Etukudo', 'Project Manager', 'Enrollment & Retention', 'Professional Contractor', 'Alison Cundiff', 'Department Leadership', 'Springboard', '3'),
  (61, 'Alison Cundiff', 'Director of Enrollment & Retention', 'Enrollment & Retention', 'Full-Time Employee', 'VP of Student Services', 'Department Leadership', null, null),
  (62, 'Jose Escoto', 'Senior Success Manager for Enrollment Counselling', 'Enrollment & Retention', 'Professional Contractor', 'Rachel Kirk', 'Enrollment Counseling', 'Springboard', '3'),
  (63, 'Rachel Kirk', 'Enrollment Counseling Manager', 'Enrollment & Retention', 'Full-Time Employee', 'Alison Cundiff', 'Enrollment Counseling', null, null),
  (64, 'Kimarie Howard', 'Enrollment Counseling Development & Performance Coordinator', 'Enrollment & Retention', 'Part-Time Temporary', 'Rachel Kirk', 'Enrollment Counseling', null, null),
  (65, 'Megan Niblett', 'Enrollment Counseling Operations Coordinator', 'Enrollment & Retention', 'Part-Time Temporary', 'Rachel Kirk', 'Enrollment Counseling', null, null),
  (66, 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Full-Time Employee', 'Trevor Shelton', 'Enrollment Services', null, null),
  (67, 'Ely Zmolek', 'Enrollment Coordinator', 'Enrollment & Retention', 'Full-Time Employee', 'Trevor Shelton', 'Enrollment Services', null, null),
  (68, 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Full-Time Employee', 'Alison Cundiff', 'Enrollment Services', null, null),
  (69, 'Peter Abarte', 'Senior Success Manager for Mentoring', 'Enrollment & Retention', 'Professional Contractor', 'Kelley Richardson', 'Mentoring', 'Springboard', '3'),
  (70, 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Full-Time Employee', 'Katelyn Graf', 'Mentoring', null, null),
  (71, 'Mandy Poll Schwab', 'Mentoring Content Coordinator', 'Enrollment & Retention', 'Professional Contractor', 'Kelley Richardson', 'Mentoring', 'Springboard', '3'),
  (72, 'Gabriela Ortega', 'Success Manager for Mentoring', 'Enrollment & Retention', 'Professional Contractor', 'Kelley Richardson', 'Mentoring', 'Springboard', '3'),
  (73, 'Carlos Alexandro Castañeda Rodriguez', 'Success Manager for Mentoring', 'Enrollment & Retention', 'Professional Contractor', 'Kelley Richardson', 'Mentoring', 'Springboard', '3'),
  (74, 'Jenifer Cisneros Ccoyllo', 'Success Manager for Mentoring', 'Enrollment & Retention', 'Professional Contractor', 'Kelley Richardson', 'Mentoring', 'Springboard', '3'),
  (75, 'Cynthia Trinity Nyachae', 'Success Manager for Mentoring', 'Enrollment & Retention', 'Professional Contractor', 'Kelley Richardson', 'Mentoring', 'Springboard', '3'),
  (76, 'Johanna Relkin', 'Mentor Operations Specialist', 'Enrollment & Retention', 'Part-Time Temporary', 'Kelley Richardson', 'Mentoring', null, null),
  (77, 'Moses Abioye', 'Project Manager', 'Student Records, Registration, and Support', 'Professional Contractor', 'Mark Gefrom', 'Department Leadership', 'Springboard', '3'),
  (78, 'Victor Oluwapelumi Elerunndu', 'Project Manager', 'Student Records, Registration, and Support', 'Professional Contractor', 'Mark Gefrom', 'Department Leadership', 'Springboard', '3'),
  (79, 'Mark Gefrom', 'Director of Student Records, Registration & Support', 'Student Records, Registration, and Support', 'Full-Time Employee', 'VP of Student Services', 'Department Leadership', null, null),
  (80, 'Kim Overdiek', 'Associate Registrar (Curriculum & Configuration)', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Kari Johnson', 'Registrar''s Office', null, null),
  (81, 'Tyson Bell', 'Associate Registrar (Transcripts & Graduation)', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Kari Johnson', 'Registrar''s Office', null, null),
  (82, 'Angie Holt', 'Graduation Coordinator', 'Student Records, Registration, and Support', 'Professional Contractor', 'Tyson Bell', 'Registrar''s Office', 'Springboard', '3'),
  (83, 'Cindi C Putnam', 'Planning Coordinator', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Kim Overdiek', 'Registrar''s Office', null, null),
  (84, 'Anne E. Owen', 'Records & Transcript Coordinator', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Tyson Bell', 'Registrar''s Office', null, null),
  (85, 'Kari Johnson', 'Registrar', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Mark Gefrom', 'Registrar''s Office', null, null),
  (86, 'Nikki Jane Chambers', 'Enrollment Verification Specialist', 'Student Records, Registration, and Support', 'Full-Time Temporary', 'Kim Overdiek', 'Registrar''s Office', null, null),
  (87, 'Kira Hayes', 'Consistency Coordinator (QA & Knowledge Base)', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Brad Lester', 'Student Support', null, null),
  (88, 'Brad Lester', 'Senior Manager, Student Support', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Mark Gefrom', 'Student Support', null, null),
  (89, 'Hilary Bagley', 'Student Experience Coordinator', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Brad Lester', 'Student Support', null, null),
  (90, 'Alyssa Burrell', 'Student Support Coordinator (Phone Support)', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Brad Lester', 'Student Support', null, null),
  (91, 'Adam Bradford', 'Technical Support Engineer', 'Student Records, Registration, and Support', 'Professional Contractor', 'Matthew Smith', 'Technical Support', 'Upwork', '3'),
  (92, 'Armen Wood', 'Technical Support Engineer', 'Student Records, Registration, and Support', 'Professional Contractor', 'Matthew Smith', 'Technical Support', 'Upwork', '3'),
  (93, 'Jackson Fonseca', 'Technical Support Engineer', 'Student Records, Registration, and Support', 'Professional Contractor', 'Matthew Smith', 'Technical Support', 'Springboard', '3'),
  (94, 'Miguel Figuereo', 'Technical Support Engineer', 'Student Records, Registration, and Support', 'Professional Contractor', 'Matthew Smith', 'Technical Support', 'Upwork', '3'),
  (95, 'Winner Aniekan Anietie', 'Technical Support Engineer', 'Student Records, Registration, and Support', 'Professional Contractor', 'Matthew Smith', 'Technical Support', 'Springboard', '3'),
  (96, 'Sariah De Hoyos Hernandez', 'EC3 Executive Innovation Personal Assistant', 'Student Records, Registration, and Support', 'Professional Contractor', 'Kari Johnson', 'Registrar''s Office', 'Springboard', '3'),
  (97, 'Axel Dario Abalos', 'Student Services Success Manager', 'Student Records, Registration, and Support', 'Professional Contractor', 'Kari Johnson', 'Registrar''s Office', 'Springboard', '3'),
  (98, 'Maria Fernanda Moreno', 'Student Support Success Manager', 'Student Records, Registration, and Support', 'Professional Contractor', 'Brad Lester', 'Student Support', 'Springboard', '3'),
  (99, 'Ana Laura Daniela Vasquez Reynoso', 'Student Support Success Manager', 'Student Records, Registration, and Support', 'Professional Contractor', 'Brad Lester', 'Student Support', 'Springboard', '3'),
  (100, 'Colby Warner', 'Product Support Engineer', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Matthew Smith', 'Technical Support', null, null),
  (101, 'Matthew Smith', 'Technical Support Manager', 'Student Records, Registration, and Support', 'Full-Time Employee', 'Mark Gefrom', 'Technical Support', null, null),
  (102, 'David De-Graft Koomson', 'Project Manager', 'Digital Operations', 'Professional Contractor', 'Jacob Adams', 'Department Leadership', 'Springboard', '3'),
  (103, 'Jess Swinburne', 'Project Manager', 'VP - Student Services', 'Professional Contractor', 'Ben Packer', 'Department Leadership', 'Springboard', '3'),
  (104, 'Terence Borjal', 'Qualitative Researcher', 'Digital Operations', 'Professional Contractor', 'Joshua Stafford Hadden', 'Systems & Operations', 'Springboard', '3'),
  (105, 'Brandot Yarleque', 'AI Engineer', 'Digital Operations', 'Professional Contractor', 'Isaias Zuñiga', 'AI', 'Upwork', '3'),
  (106, 'Daniel Zago', 'Curriculum and Registration Coordinator', 'Student Records, Registration, and Support', 'Professional Contractor', 'Tyson Bell', 'Registrar''s Office', 'Springboard', '3'),
  (107, 'Elie Gilles Ravel Mambou', 'Assistant Project Manager', 'VP - Student Services', 'Professional Contractor', 'Jess Swinburne', 'Department Leadership', 'Springboard', '3'),
  (108, 'Charles Crankson', 'Project Manager', 'Enrollment & Retention', 'Professional Contractor', 'Alison Cundiff', 'Department Leadership', 'Springboard', '3'),
  (109, 'Katelyn Graf', 'Senior Manager of Retention', 'Enrollment & Retention', 'Full-Time Employee', 'Alison Cundiff', 'Retention', null, null);

insert into public.student_employees (sort_order, name, job_name, role_title, sub_department, supervisor, department) values
  (1, 'Adolfo Arellano Pineda', 'Student Employee', 'Student Data evaluator', 'Student Data evaluator', 'Pelenatita Neiufi', 'Digital Operations'),
  (2, 'Melyssa Silva', 'Student Employee', 'Student Data evaluator', 'Student Data evaluator', 'Pelenatita Neiufi', 'Digital Operations'),
  (3, 'Abish Arroyo Avila', 'Student Employee', 'Transfer Evaluation Agent', 'Transfer Evaluation', 'Shaunasee James', 'Enrollment & Retention'),
  (4, 'Angela Naranjo', 'Student Employee', 'Enrollment Counsellor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (5, 'Arian Bazan Azanero', 'Student Employee', 'Transfer Evaluation Agent', 'Transfer Evaluation', 'Shaunasee James', 'Enrollment & Retention'),
  (6, 'Aubrey Smith', 'Student Employee', 'Domestic Enrollment Counserlor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (7, 'Belinda Riley', 'Student Employee', 'Transfer Evaluation Agent', 'Transfer Evaluation', 'Shaunasee James', 'Enrollment & Retention'),
  (8, 'Bradley Braganca', 'Student Employee', 'Domestic Enrollment Counserlor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (9, 'Char Fridley', 'Student Employee', 'Domestic Enrollment Counserlor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (10, 'Daniel Leal', 'Student Employee', 'Domestic Enrollment Counserlor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (11, 'Doris Klinglesmith', 'Student Employee', 'Domestic Enrollment Counserlor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (12, 'Jacob Keeney Keeney', 'Student Employee', 'Domestic Enrollment Counserlor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (13, 'Jeffrey Sumarajan', 'Student Employee', 'Transfer Evaluation Agent', 'Transfer Evaluation', 'Shaunasee James', 'Enrollment & Retention'),
  (14, 'Joanna Relken', 'Coord,Training', 'Mentoring Operations Specialist', 'Mentoring', 'Kelley Richardson', 'Enrollment & Retention'),
  (15, 'Justyn Hernandez', 'Student Employee', 'Enrollment Counsellor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (16, 'Kate DeForest', 'Student Employee', 'Transfer Evaluation Agent', 'Transfer Evaluation', 'Shaunasee James', 'Enrollment & Retention'),
  (17, 'Kim STEWART', 'Student Employee', 'Domestic Enrollment Counserlor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (18, 'Letitia Marshall-Mellor', 'Student Employee', 'Transfer Evaluation Agent', 'Transfer Evaluation', 'Shaunasee James', 'Enrollment & Retention'),
  (19, 'Mack Monson', 'Student Employee', 'Domestic Enrollment Counserlor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (20, 'Mandy Schwab', 'Coord,Training', 'Mentoring Development Specialist', 'Mentoring', 'Kelley Richardson', 'Enrollment & Retention'),
  (21, 'Nelly Barrera', 'Student Employee', 'Enrollment Counsellor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (22, 'Patricia Ann Donato', 'Student Employee', 'Domestic Enrollment Counserlor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (23, 'Rebekah Sasser Sasser', 'Student Employee', 'Domestic Enrollment Counserlor', 'Enrollment Couselling', 'Rachel Kirk', 'Enrollment & Retention'),
  (24, 'Tarali Blanchard', 'Student Employee', 'Transfer Evaluation Agent', 'Transfer Evaluation', 'Shaunasee James', 'Enrollment & Retention'),
  (25, 'Abraham Osorio', 'Student Employee', 'Planning Shift Lead', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (26, 'Aida Camarillo', 'Student Employee', 'Records & Transcripts Shift Lead', 'Records & Transcripts', 'Anne E Owen', 'Records, Registration & Support'),
  (27, 'Alan Sanchez', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (28, 'Alana Willis', 'Student Employee', 'Planning Agent', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (29, 'Alejandro Gonzalez', 'Student Employee', 'Records & Transcripts Supervisor', 'Records & Transcripts', 'Anne E Owen', 'Records, Registration & Support'),
  (30, 'Alessandra Loiola', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (31, 'Amanda Smith', 'Student Employee', 'Graduation Shift Lead', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (32, 'Andrew Petersen', 'Student Employee', 'Graduation Supervisor', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (33, 'Ashley Currier', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (34, 'Astrid Rivera Nunez', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (35, 'Blake Call', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (36, 'Chhung Kim', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (37, 'Connor Washburn', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (38, 'Daniel Rasmuson', 'Student Employee', 'Planning Agent', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (39, 'Daniela Santibanez Pineira', 'Student Employee', 'Graduation Shift Lead', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (40, 'Derek Goodwin', 'Student Employee', 'Graduation Shift Lead', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (41, 'Destiny Hardin', 'Student Employee', 'Enrollment Verification Agent', 'Enrollment Verification', 'Nikki Jane Chambers', 'Records, Registration & Support'),
  (42, 'Eduardo Sulecio', 'Student Employee', 'Registration Supervisor', 'Registration', 'Kim Overdiek', 'Records, Registration & Support'),
  (43, 'Elizabeth DeGraw', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (44, 'Emilly Ferreira Lima Durante', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (45, 'Emma Hamblin', 'Student Employee', 'Enrollment Verification Supervisor', 'Enrollment Verification', 'Nikki Jane Chambers', 'Records, Registration & Support'),
  (46, 'Endrit Cakollari', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (47, 'Ethan Brockbank', 'Student Employee', 'Graduation Shift Lead', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (48, 'Felipe Feitosa', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (49, 'Grover Vasquez', 'Student Employee', 'Planning Agent', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (50, 'Horace Tun', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (51, 'Isis Flores', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (52, 'Jassive Duran', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (53, 'Jerry Hodges', 'Student Employee', 'Planning Agent', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (54, 'Jimena Martinez Bolanos', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (55, 'Joshua Jones', 'Student Employee', 'Graduation Diplomatic Supervisor', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (56, 'Juliana Daley', 'Student Employee', 'Enrollment Verification Agent', 'Enrollment Verification', 'Nikki Jane Chambers', 'Records, Registration & Support'),
  (57, 'Katelyn Slaugh', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (58, 'Kathy Norcross', 'Student Employee', 'Planning Agent', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (59, 'Kayla Palmore', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (60, 'Kira Odake', 'Student Employee', 'Phone Support Agent', 'Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (61, 'Makenna Lundquist', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (62, 'Mami Nagata', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (63, 'Mandy Hatch', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (64, 'Marilin Mullo Culquicondor', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (65, 'Marquelle Call', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (66, 'Mia Homer', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (67, 'Milagros Concha Tamo', 'Student Employee', 'Student Data Enaluator', 'Student Data Enaluator', 'Anne E Owen', 'Records, Registration & Support'),
  (68, 'Misael Iniestra Salazar', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (69, 'Morgan Beckey', 'Student Employee', 'Planning Agent', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (70, 'Morgan Checkettes', 'Student Employee', 'Records & Transcripts Shift Lead', 'Records & Transcripts', 'Anne E Owen', 'Records, Registration & Support'),
  (71, 'Natalia Iglesias Vinocuna', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (72, 'Nick Gonzalez', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (73, 'Nikki Chambers', 'Global Support Specialist', 'Enrollment Verification Coordinator', 'Enrollment Verification', 'Tyson Bell', 'Records, Registration & Support'),
  (74, 'Nina Eubanks', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (75, 'Paige Petersen', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (76, 'Paige Rasmussen', 'Student Employee', 'Planning Agent', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (77, 'Rachel Dowdle', 'Student Employee', 'Planning Supervisor', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (78, 'Rebeca Cisneros Lozano', 'Student Employee', 'Planning Agent', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (79, 'Reina Matsumura', 'Student Employee', 'Planning Agent', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (80, 'Sarah Purvis', 'Student Employee', 'Enrollment Verification Agent', 'Enrollment Verification', 'Nikki Jane Chambers', 'Records, Registration & Support'),
  (81, 'Stella Gefrom', 'Student Employee', 'Domestic Phone Support Agent', 'Domestic Phone Support', 'Alyssa Burrell', 'Records, Registration & Support'),
  (82, 'Valeria Morales Pontillo', 'Student Employee', 'Planning Agent', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support'),
  (83, 'Vanessa Sales de Morais', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (84, 'Vincent Onen', 'Student Employee', 'Graduation Agent', 'Graduation', 'Tyson Bell', 'Records, Registration & Support'),
  (85, 'Yessika Antillon Denison Denison', 'Student Employee', 'Planning Shift Lead', 'Planning', 'Cindi C Putnam', 'Records, Registration & Support');

insert into public.org_chart_nodes (sort_order, name, role, employee_status, stewardships, key_kpis, reports_to, department, link, key_responsibilities, direct_reports) values
  (1, 'Mark Gefrom', 'Director of Student Records, Registration, and Support', 'FTE', 'Registrar, student support, tech support oversight 
Help center 
Customer relations systems 
Ticket systems', 'All Records, Registration, and Support teams meeting or exceeding service-level agreements for response, resolution, QA, CSAT, and first contact resolution 
Records, registration, and support department budget	
Overall student autonomy (primary)
Overall student satisfaction (secondary)', 'Ben Packer, VP of Student Services', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBpfBRqxg1FTqAoAyYTtdYhAQZ58j2DOREbCoKMFpxpPBY?e=WczgAk', 'Maintain a well-structured Help Center with effective ticket systems and external knowledge articles to address common student needs and reduce friction.
Ensure internal knowledge articles, proper ticket categorization, trend analysis, and bug escalation processes are in place to support agents and inform product and system improvements.
Balance service quality with efficiency through CSAT, first-contact resolution, QA evaluations, and effective handling of VIP and escalated cases.', 'Brad Lester - Senior Manager of Student Support 
Matthew Smith - Technical Support Manager
Kari Johnson - Registrar
Victor Oluwapelumi Elerunndu - Project Manager
Moses Abioye - Project Manager'),
  (2, 'Brad Lester', 'Senior Manager of Student Support', 'FTE', 'Inbound student support lead 
Academic advising program', 'Student support budget	
Autonomy rate for student support cases', 'Mark Gefrom, Director of Student Records, Registration, and Support', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCKoBX4HbZJRq7HLLXdBrCbAdvXS8PLZF0W8t-imhz4UV4?e=HLCnTw', 'Oversee daily support operations, including ticket management, escalation handling, and workload distribution. 
Monitor and report on key performance indicators such as response times, resolution times, and customer satisfaction. 
Coordinate with cross-departmental teams to resolve student issues and align support processes. 
Drive continuous improvement by analyzing trends, identifying root causes, and implementing process changes. 
Lead and develop support team staff through coaching, training, and performance management.', 'Alyssa Burrell - Student Support Coordinator
Hilary Bagley - Training & Quality Assurance Manager
Kira Hayes - Training & Quality Assurance Coordinator'),
  (3, 'Alyssa Burrell', 'Student Support Coordinator', 'FTE', 'Phone support 
General support', 'General support case response and resolution rates
Phone support answer speed, handle rate, agent availability, QA, CSAT, and first contact resolution', 'Brad Lester, Senior Manager of Student Support', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBwUBFZyWZaSLXU28SQe4_cAUirTYoW8S2Th63JomM1XhM?e=YVQEeX', 'Lead and oversee the Phone Support team at BYU-Pathway Worldwide 
Monitor and report weekly metrics and provide training for the team or coach individual agents when goals are not met.  
Write and publish Knowledge Base articles specific to the phone support team 
Review QA and CSAT scores and ensure all teams have access to review their metrics and action improvements', null),
  (4, 'Hilary Bagley', 'Training & Quality Assurance Manager', 'FTE', 'Training, area collaboration, & partner communication
Media & Knowledge Base development
Student Support content accuracy
Student journey mapping', 'Request-to-KB publish rate
Knowledge Base audit pass rate
Cost per KB Article Maintained
QA feedback cycle rate 
QA calibration consistency rate
QA team lead feedback success rate
Cost per QA Evaluation', 'Brad Lester, Senior Manager of Student Support', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAAwTC8MOIqQIkj0G04BRqGAc9Y9taAUl9NY_6ZfIDUJ4Y?e=hfFaGg', 'Coordinate training with other Pathway departments and external partners. 
Coordinate with media and creative teams to develop video and supplementary content for knowledge base articles. 
Facilitate communication across the student services structure within the organization and with partners. 
Collaborate with student support to ensure that student-facing articles on the Help Center are easily accessible and accurate. 
Outline and communicate the student journey', 'Kira Hayes - Training & Quality Assurance Coordinator'),
  (5, 'Kira Hayes', 'Training & Quality Assurance Coordinator', 'FTE', 'Ticketing QA
External Knowledge Base articles
Support agent onboarding and training', 'KB publishing rate
QA evaluation completion rate
DSAT and critical violation delivery rate', 'Hilary Bagley, Training & Quality Assurance Manager', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCtk6Visur9S73CLrYxUHrpAd25rc-Xrtvfnt3SO0KwFLM?e=H5naai', 'Manage the QA team 
Provide reports on support performance in reference to QA metrics 
Manage the External KB team 
Ensure that internal articles are created when support agents have questions or are missing information when helping students 
Support the staffing needs of Student Support', null),
  (6, 'Matthew Smith', 'Technical Support Manager', 'FTE', 'Inbound tech support lead', 'Tech support case resolution rate
Tech support costs
Autonomy rate for tech support cases', 'Mark Gefrom, Director of Student Records, Registration, and Support', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQC6ZURvjEf_R4kbBaAAgIjGAaB-PHWFt8Afm--cDEFlV6M?e=Y0g1Xo', 'Lead and develop the technical support team 
Use key performance indicators and service level agreements to track and share team and agent-level trends with stakeholders and leadership 
Develop and maintain a sound technical understanding of key systems, how they integrate, and how students use them 
Continue to mature overall technology support processes and reporting to effectively manage anticipated growth 
Assist in identifying and communicating major system outages to key stakeholders', 'Colby Warner - Product Support Engineer'),
  (7, 'Colby Warner', 'Product Support Engineer', 'FTE', 'Tech support troubleshooting & resolution', 'Escalated case resolution rate
Tech support case QA, CSAT, first contract resolution', 'Matthew Smith, Technical Support Manager', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBaWG5YlOnKQrXGueyhBughAXBMduY1rLTdPM_7EobPwQo?e=e6Zd8q', 'Resolve student cases 
Coordinate and resolve P1 issues 
Write DevOps bugs for ICS 
Write knowledge base articles and provide appropriate training 
Bug testing systems', null),
  (8, 'Kari Johnson', 'Registrar', 'FTE', 'Registration and Records lead
Academic record maintenance
Block/Term system and catalog data publishing', 'Registrar budget
Autonomy for registrar processes and cases
Case CSAT for planning and registration', 'Mark Gefrom, Director of Student Records, Registration, and Support', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBkQUDPjDkJQqGJR2uD02GvAZ2F5T3reRUi0tmNHnatB8c?e=em7vc2', 'Provide strategic leadership and direction for the Registrar’s Office 
Serve as the institutional authority over academic records 
Ensure compliance and policy governance 
Oversee registration operations
Direct academic governance and publishing 
Lead end-to-end graduation operations each block 
Oversee catalog maintenance', 'Kim Overdiek - Associate Registrar
Tyson Bell - Associate Registrar'),
  (9, 'Kim Overdiek', 'Associate Registrar', 'FTE', 'Policies & processes
Curriculum/catalog maintenance 
Academic planning system configuration
Course registration process', 'Process case resolution rate, QA, and CSAT
On-time catalog publishing and system configuration rates', 'Kari Johnson, Registrar', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDHxfnyxJ_PTKTIYysDqssWAVj3YJCFsDb62MgYnRnRvfo?e=zcdOtl', 'Process ADO resolution  
Review Coursedog proposals for Academic Catalog updates  
Make and test configuration updates in Anthology Student  
Maintain policy and processes for Curriculum, Planning, and Registration  
Work on manual registration as needed - GEC, Portuguese sections', 'Cindi C Putnam - Planning Coordinator 
Angie Holt - Registration Specialist'),
  (10, 'Cindi C Putnam', 'Planning Coordinator', 'FTE', 'Degree progress audit corrections', 'Degree planning escalation case resolution rate, QA, and CSAT', 'Kim Overdiek, Associate Registrar', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDM5kWdtj6eTobfhfYTnaukATgc2h46N2asN0nMbPnj9eA?e=vikaN5', 'Oversee the planning team and their processes  
Collaborate with teams to resolve student DPA issues 
Check-ins with supervisors and team leads for support and training.  
Coordinate with Anthology to review platform concerns and issues', null),
  (11, 'Daniel Zago', 'Curriculum and Registration Coordinator', 'FTT', 'Registration user testing
Registration support
Manual registration projects', 'Registration issue case resolution rate, QA, and CSAT', 'Kim Overdiek, Associate Registrar', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCG3lQB9sDJS4SZ2aTzVK8sATEJsadBe9TtYehiUNGHfwg?e=EXzB5z', 'Test registration processes 
Lead registration cleanup and specialized projects 
Handle registration work for VIP or escalated students.', null),
  (12, 'Tyson Bell', 'Associate Registrar', 'FTE', 'Student records
Transcripts
Graduation
Enrollment verification', 'Records case resolution rate, QA, and CSAT', 'Kari Johnson, Registrar', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQANGB82vwVpR7kWikzK32R6AcXDcnbDlXCI-F8G8MsOwZA?e=HYUBCa', 'Manage Graduation, Records, and Enrollment Verification teams 
Queue request processing 
Execute projects to create process and systems to automate and scale the work 
Refine and direct processes to handle escalations 
Collaborate with external team to provide the critical fixes to anthology system 
Lead testing of critical fixes to verify and provide feedback to accelerate progress', 'Geraldine Susan Bean - Graduation Coordinator
Anne E. Owen - Records & Transcript Coordinator 
Nikki Jane Chambers - Enrollment Verification Specialist'),
  (13, 'Angie Bell', 'Graduation Coordinator', 'FTE', 'Graduation application
Diploma awarding process', 'Graduation application case completion rate
Award processing rate
Number of rescinded degrees
Application and awarding QA', 'Tyson Bell, Associate Registrar', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAR8feRUQUqRbS9IFJkfhY6Ae-dI_3KnvPYc7_B5RaXvmE?e=SVgmsJ', 'Oversee the graduation team and their processes 
Vet and award graduation credentials  
Send orders for paper copies of diplomas 
Collaborate with partner institutions on all aspects of the graduation process  
Process escalations, concerns and deliver missed credentials  
Partner with communication team to share graduation information with students 
Oversee hiring and basic training for registrar office agents 
Configure portal alerts for apostille processing and graduation setup', null),
  (14, 'Anne E. Owen', 'Records & Transcript Coordinator', 'FTE', 'Grade changes
Academic exceptions
Transcript requests', 'Process case completion rate
Process case QA, and CSAT
Transcript accuracy QA', 'Tyson Bell, Associate Registrar', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAEOXkjnBS2T5AgKHhw-KlEAXws8SAXw2fBBXWANGQ3-i8?e=frYZ29', 'Maintaining and updating knowledge base for accuracy 
Ensure accuracy and efficiency of student record processes. 
Process grade changes 
Manage transcript processing, resolve data issues, and handle official requests 
Academic exceptions management', null),
  (15, 'Nikki Jane Chambers', 'Enrollment Verification Specialist', 'FTT', 'Enrollment verification 
Partner transfer evaluation
Apostilles
Student verification letters', 'Enrollment verification and apostille completion rate
Enrollment verification QA, and CSAT 
Apostille QA, and CSAT', 'Tyson Bell, Associate Registrar', 'Student Records, Registration, and Support', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBkohdpEKodQoL-ghZzzwCRAQKlxkR8j_9LVGL0oGq1t5Y?e=8brGcT', 'Process Enrollment Verification for third party 
Communicating with BYU-I on letters and forms 
Letters from the Department of the Defense 
Resolve Internal Credits missing from BYUI and Ensign College in the system  
Custom letters for students 
Process apostilles documents on request', null),
  (16, 'Steven K. Thomas', 0, 'FTE', 'Executive Oversight of Federally and Institutionally Mandated Student Service Offices
Institutional Policy Stewardship & Compliance (Title IX Coordintor, ADA/Section 504 Coordinator)
Crisis Governance & Risk Mitigation', 'No material audit, legal, or accreditation findings attributable to Dean of Students governance
Annual DOS budget	
Overall student satisfaction (primary)', 'Ben Packer, VP of Student Services', 'Dean of Students Office', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAJCeQuk9fHTbFRX-_VINCFAXaStbvWN2DK4_tsSELnmmQ?e=UfES01', 'Executive Oversight of Federally and Institutionally Mandated Student Service Offices 
Institutional Policy Stewardship & Compliance
Lead and oversee the global Dean of Students Office
Develop policies and procedures related to student support and conduct 
Coordinate with BYU-Idaho and Ensign College on compliance and student processes 
Report trends, risks, and student needs to executive leadership 
Manage DOS Office budget, staffing, and strategic initiatives 
Represent student support functions in executive councils and committees', 'Anne Marie Clark - Associate Dean of Students'),
  (17, 'Anne Marie Clark', 'Associate Dean of Students', 'FTE', 'Deputy Oversight of Title IX and ADA/Section 504 Compliance
Operational Governance and Quality Assurance of Dean of Students Services
Case Escalation, Secondary Review, and Risk Resolution Authority', 'Dean of Students response and resolution time
Dean of Students services escalation rates
Partner C-Sat', 'Steven K. Thomas, Dean of Students', 'Dean of Students Office', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDSHzYkaQbiTKka4BszvUdeAelcwMltNNhbDXOi0SkDl08?e=xKEuAg', 'Deputy Oversight of Title IX and ADA/Section 504 Compliance  
Operational Governance and Quality Assurance of Dean of Students Services  
Case Escalation, Secondary Review, and Risk Resolution Authority 
Train and support DOS staff 
Oversee daily operations of all six service areas 
Develop and improve processes and workflows 
Ensure service levels and response times are maintained 
Assist with compliance and policy implementation', 'Katelyn Ray - Student Honor & Conduct Coordinator
Sandra Wurttele - Student Accessibility Coordinator
Ana De Castro - Student Belonging Coordinator
Helen Reboucas - Student Grievance Coordinator
Joseph Bentum - Student Crisis Coordinator'),
  (18, 'Katelyn Ray', 'Student Honor & Conduct Coordinator', 'FTE', 'Institutional CES Honor Code Administration, Adjudication, and Due Process Enforcement
Behavioral Risk Monitoring and Institutional Conduct Trend Analysis', 'Honor and Conduct response and resolution time
Repeat offender rate', 'Anne Marie Clark, Associate Dean of Students', 'Dean of Students Office', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBQz2AWfHg4QLr-tLfqWB5OAfGlKm815bIjKlysE6sH3XU?e=12zTcP', 'Place holds on student accounts 
Meet with disgruntled students 
Enroll students in academic integrity course 
Coordination with BYU-Idaho Honor office 
Review and manage student conduct cases 
Determine outcomes and sanctions when appropriate 
Track conduct trends and policy implications', null),
  (19, 'Sandra Wurttele', 'Student Accessibility Coordinator', 'Contractor', 'Disability Accommodation Determination and Deputy ADA/Section 504 Coordinator
Accommodation Appeals, Adjustments, and Compliance Documentation', 'Accommodation determination processing and resolution rates
ADA and Section 504 standard compliance and audit compliance rates', 'Anne Marie Clark, Associate Dean of Students', 'Dean of Students Office', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBVF-cnaza5S4QpkfqcBzYBAeYcEuv3-9UQF2FsOVwDveg?e=fgld8E', 'Disability accommodation determination  
Deputy ADA/Section 504 Coordinator 
Accommodation appeals, adjustments, and compliance documentation 
Meet with students to discuss barriers, needs, and reasonable accommodations 
Prepare and issue accommodation letters to students directly', null),
  (20, 'Ana De Castro', 'Student Belonging Coordinator', 'Contractor', 'Non-Discrimination Administration and Institutional Response
Belonging-Related Concern Resolution and Systemic Risk Escalation', 'Discrimination case resolution rate 
Student sentiment on belonging
Student belonging CSAT', 'Anne Marie Clark, Associate Dean of Students', 'Dean of Students Office', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDw3EYyUChUSY3A6NON-yzTAbsZyYTV79vgs6HuVXn3KPM?e=eMTFQX', 'Non-discrimination administration and institutional response 
Belonging-related concern resolution and systemic risk escalation 
Respond to belonging and non-discrimination concerns 
Support students experiencing discrimination or exclusion 
Develop belonging initiatives and student support resources 
Monitor trends related to belonging and student satisfaction 
Provide guidance on inclusive practices and student support 
Support students who may be at risk of leaving due to belonging concerns', null),
  (21, 'Helen Reboucas', 'Student Grievance Coordinator', 'Contractor', 'Formal Student Grievance Administration and Due Process Assurance
Grievance Appeals, Pattern Analysis, and Institutional Risk Insight', 'Student grievance case resolution time
Grievance QA', 'Anne Marie Clark, Associate Dean of Students', 'Dean of Students Office', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAFWmgwRzlyR5zv2gsq5azrAXc2nfbXRXsAR85GuTJ0Ykw?e=lLfV4e', 'Formal Student Grievance Administration and Due Process Assurance 
Grievance Appeals, Pattern Analysis, and Institutional Risk Insight   
Receive and review student grievances 
Document and track grievance cases 
Coordinate grievance review with instructors and institutions 
Ensure grievance process follows policy and accreditation requirements 
Communicate grievance outcomes to students 
Maintain grievance records and reporting 
Identify trends and institutional process issues', null),
  (22, 'Joseph Bentum', 'Student Crisis Coordinator', 'Contractor', 'Student Crisis Intake, Triage, Stabilization, and Emergency Coordination
High-Risk Case Monitoring and Institutional Safeguards', 'Crisis response time', 'Anne Marie Clark, Associate Dean of Students', 'Dean of Students Office', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCck7nWiNmJTbKblCL9bvWxASpttHquDaszNgyjwEDUvDA?e=zFBhpM', 'Student Crisis Intake, Triage, Stabilization, and Emergency Coordination 
High-Risk Case Monitoring and Institutional Safeguards 
Supervise and support Student in Crisis Specialists 
Handle sensitive or high-impact cases  
Ensure adherence to institutional policies, privacy standards, and ethical guidelines through our outreach to students', null),
  (23, 'Alison Cundiff', 'Director of Enrollment & Retention', 'FTE', 'Enrollment services & mentoring oversight
Student retention and completion', 'Enrollment & Retention budget
Enrollment, retention, completion (primary)
Overall student autonomy and satisfaction (secondary)', 'Ben Packer, VP of Student Services', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAFhc5UkuwgTapnxWheHmYRAeUt6L6jGcomm-gS_hKDWbg?e=v2NPg4', 'Ensure success of enrolment services & mentoring teams.  
Tracking and understanding student retention and completion trends and needs. 
Oversee student throughput across the student journey/pipeline, using milestone tracking, dashboards, and AI & human intervention strategies.  
Strategic planning and execution to meet Student Services and organizational objectives.  
Report to key stakeholders, including VP of Student Services.  
Represent enrollment services and mentoring in cross-functional meetings related to registration. 
Facilitate and participate in councils and workgroups when appropriate.', 'Kelley Richardson - Mentoring Manager
Trevor Shelton - Senior Manager of Enrollment Services'),
  (24, 'Kelley Richardson', 'Mentoring Manager', 'FTE', 'Mentoring program lead', 'Mentor required action completion rate
Mentor interaction QA
Overall student autonomy (secondary)
Mentor CSAT
Retention rate contribution by mentors', 'Alison Cundiff, Director of Enrollment & Retention', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDf11sIFIdKRpf47WFm_HrbAbXK5oADRJG7VjwmaQKoGEY?e=LfYtXd', 'Implement the mentoring strategy
Ensure that the mentor program has all the necessary resources, training programs, and plans to function effectively
Supply guides and required action implementation to standardize and inform mentors regarding ongoing changes and process updates
Implement and provide quality assurance for mentoring, such as case management and mentor interaction with students (timing, frequency, and quality), and the mentor scorecard system
Mentor CRM needs and adjustments', 'Mandy Schwab - Mentor Development Specialist
Joanna Relkin - Mentor Operations Specialist'),
  (25, 'Mandy Schwab', 'Mentor Development Specialist', 'PTT', 'Mentoring program development', 'Mentor interaction QA 
Mentor CSAT', 'Kelley Richardson, Mentoring Manager', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBy2LVzDoldRZisyIODLh8zAQMURc-jWPshlLW15i3qb1A?e=U7sRj2', 'Maintain and execute the Planning Calendar, including milestones and block strategies 
Develop and distribute program communications, including pilot updates and initiatives
Ensure clear documentation of policies and procedures for mentoring
Create, update, and manage Mentor Hub content and guides
Provide concise, actionable resources for mentors
Coordinate and document training needs and schedules
Create and present REACH methodology training
Maintain CSAT dashboard accuracy and evolution
Track and report on Development KPI metrics, including CSAT averages
Support continuous improvement efforts through data insights
Oversee and refine Interaction Scorecards within CRM systems
Lead evaluation coordination with leadership and external partners (Springboard)
Monitor and improve QA processes and scorecard effectiveness
Facilitate QA-related meetings and calibration efforts', null),
  (26, 'Joanna Relkin', 'Mentor Operations Specialist', 'PTT', 'Mentoring program operations', 'Mentor required action completion rate
Mentor concern case QA', 'Kelley Richardson, Mentoring Manager', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAD6qmcBdXESLblm4Cwxcq-AQzexoG57ED2rJSulZnrW7A?e=istmOr', 'Required Action Planning 
Case Management Oversight and Implementation 
Collaborate with Digital Operations on Required Actions Dashboard and ensure data is accurate 
Compile data from RA Dashboard and share RA completion rate and student response data with Mentoring Manager and Mentoring team', null),
  (27, 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'FTE', 'Enrollment services lead
Enrollment funnel performance, strategy, and innovation', 'Reduction of enrollment related support cases
Reduction of admissions tier 2 support cases', 'Alison Cundiff, Director of Enrollment & Retention', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCVmNuaOp68SKhTnf_tOoajAX5JqDNZE3skdK_YOh1zQOg?e=cIHUdp', 'Develop admissions policies and strategies to support new and evolving initiatives 
Lead system design, testing, and improvement efforts to enhance student access 
Monitor key admissions metrics to inform decisions 
Collaborate with BYU-Pathway leadership, partner institutions, and cross-functional teams to align processes 
Support organizational scalability through planning and documentation 
Provide oversight and direction to staff who manage operational processes (application review, endorsements, transcripts, data integrity)', 'Rachel Kirk - Enrollment Counseling Manager
Shaunasee Janette James - Enrollment Coordinator 
Ely Zmolek - Enrollment Services Specialist 
Trey Mooney - University Chaplain'),
  (28, 'Rachel Kirk', 'Enrollment Counseling Manager', 'FTE', 'Enrollment Counseling team
Enrollment funnel performance & outcomes', 'Application start to admission yield
Admission to registration yield
Registration to auto-drop yield', 'Trevor Shelton, Senior Manager of Enrollment Services', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAw0JzSy0-_SJwGTk9TEoL5AfQPAV9g6j-Z3Q3eUX_PAaY?e=flOOTM', 'Ensure Enrollment Counseling team is supported and functioning optimally  
Manage escalated student concerns  
Plan targeted outreach 
Plan and request tool optimization  
Understand and present results of key initiatives and team performance to senior leadership and key stakeholders', 'Kimarie Howard - Enrollment Counseling Development and Performance Coordinator
Megan Niblett - Enrollment Counseling Operations Coordinator'),
  (29, 'Kimarie Howard', 'Enrollment Counseling Development and Performance Coordinator', 'Contractor', 'Enrollment Counseling development and performance', 'Enrollment Counseling CSAT rate
Enrollment Counseling yield contribution', 'Rachel Kirk, Enrollment Counseling Manager', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQC8A6J14ltYSax9jMGUoFVTAec5lePpVzxNpeJdiJsbtBY?e=jimf3o', 'Coach Enrollment Counselors through performance evaluations and implementation of training
Mentor Enrollment Counseling Student Supervisors to improve training delivery and leadership skills
Use evaluation results and data reports to improve Enrollment Counseling processes and outcomes
Develop new training tools to increase efficiency and performance
Monitor Enrollment Counselor outreach quality, accuracy of documentation, and completion in REACH
Provide input during hiring interviews and contribute to onboarding strategy
Assess human factors and behavioral trends affecting EC and student success
Develop leadership-focused content and initiatives to grow internal talent
Create and refine systems that drive team success and individual improvement
Identify barriers to Enrollment Counselor performance and strategize solutions
Work closely with the Enrollment Counseling Operations Coordinator.', null),
  (30, 'Megan Niblett', 'Enrollment Counseling Operations Coordinator', 'Contractor', 'Enrollment Counseling operations', 'Enrollment Counseling required action completion rate
Enrollment Counseling contact rate by alert', 'Rachel Kirk, Enrollment Counseling Manager', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDYXALjqBy9TqMnkrLzZPALAVRIDVcR-t2zQ7_N6t_-sFI?e=OrqQzO', 'Monitor Required Action assignments and Enrollment Counselor documentation in REACH
Share daily announcements and coordinate semester theme content
Maintain Enrollment Counselor Reference Guide, outreach templates, and internal resources
Oversee hiring process (review resumes, schedule and conduct interviews, extend offers)
Manage Enrollment Counselor bookings and onboarding logistics
Meet with new hires to complete HR forms and provide system access
Coordinate and manage self-evaluations, team performance trackers, and QA tools
Prepare agendas and materials for weekly Enrollment Counselor team and supervisor meetings
Monitor Enrollment Counseling cases (e.g., Enrollment Counselor concerns, mentor requests, etc.)
Support a culture of team unity via announcements, celebrations, and Team Unity Chat
Strategize Enrollment Counseling priorities to improve the overall student experience
Identify system issues, workflow bottlenecks, and escalate or resolve as needed
Collaborate with the Enrollment Counseling Performance Coordinator', null),
  (31, 'Shaunasee Janette James', 'Enrollment Coordinator', 'FTE', 'Transfer evaluation 
Ecclesiastical endorsement 
Chaplain partnership', 'Transfer evaluation processing rate 
Number of transfer evaluation and endorsement cases
Transfer evaluation and endorsement case resolution rate', 'Trevor Shelton, Senior Manager of Enrollment Services', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBHJEF4d22UQ4TOTp6j8queASopK9ehmaq4-SfVdUQwo1g?e=qSPQFY', 'Liaise with the Ecclesiastical Clearance Office (ECO) and chaplains to resolve endorsement-related issues.
Manage a team that notifies students with missing or MRNs and resetting endorsement requests.
Oversee transfer evaluation team as they make sure of transcript submission. workflows and ensure accurate linkage to student records.
Support or lead transcript evaluation processes to verify credit.
Manage and monitor student portal tools, including the English Language Assessment and Parent Program Selection.', null),
  (32, 'Ely Zmolek', 'Enrollment Services Specialist', 'FTE', 'Application processing
Admissons exceptions 
Admissions systems', 'Application processing rate
Application manual review turnaround rate
Number of admissions support cases
Admissions case resolution rate', 'Trevor Shelton, Senior Manager of Enrollment Services', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDyS1zVpuz3SI8qQdzkXt4eAa5v6mtHteW4fZK3kCJ5twA?e=C1jcso', 'Process student applications across various programs.
Monitor integration logs to verify successful application processing and resolve reported issues.
Review and process applications flagged for Manual Review, including those requiring exceptions.
Create and update knowledge base (KB) articles related to the application process.
Collaborate with the Registrar’s Office to update returning students’ credits and PathwayConnect graduations upon enrollment.
Test new application versions (e.g., Portuguese application) and report issues for resolution.
Oversee the Admissions SME queue, identifying and managing cases related to the application.
Supervise a team of student employees, providing weekly training and ongoing support.', null),
  (33, 'Trey Mooney', 'University Chaplain', 'FTE', 'Ecclesiastical endorsements for non-member students', 'Non-member endorsement completion rate
Number of support cases with non-member endorsement concerns', 'Trevor Shelton, Senior Manager of Enrollment Services', 'Enrollment & Retention', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCr-O7RTvhPRaqywK1WC3PeAfbXS3wjfPjtPewsh_8PD3M?e=5EgIUj', 'Coordination Meeting with Admissions Leadership 
Data Team ECO Coordination Meeting 
Volunteer Chaplain Leadership Coordination 
Salt Lake City HQ Mission Presidency Coordination 
Conduct Ecclesiastical Endorsement Interviews 
Train Leadership 
Interview new Chaplains', null),
  (34, 'Jacob Adams', 'Director of Digital Operations', 'FTE', 'Digital operations oversight
Application and implementation of emerging technologies
Strategy for Power BI, machine learning, agentic AI, and Companion teams
UX evaluation & impact review', 'Overall Stakeholder CSAT
Digital Ops budget
Costs saved by customers due to Digital Ops technologies (secondary)
Overall student autonomy (secondary)
Overall student satisfaction (secondary)
Application Rate
Retention Rate
Completion Rate (Secondary)', 'Ben Packer, VP of Student Services', 'Digital Operations', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQA4Z3GLmjrRQ7VQBp_tH6EAAX8tlXHJ79We6G8lvZI-Z_s?e=hfmBx2', 'Strategic discernment of analytics engine (backend) 
Companion/Mentor portal (frontend) feature alignment, development, and maintenance to scale to millions of students in multiple languages with the best of AI and human relationship-based intervention.    
Review non-linear and linear UX impacts and results.', 'Ricky Kailiponi Jr. - Senior Manager of Digital Ops
Joshua Stafford Hadden - System & Operations Manager'),
  (35, 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'FTE', 'Business Partner collaboration
Architect & Engineer engagement (IT/ICS)
Development & QA lead
AI Compliance & advancement', 'Team meeting project deadlines 
Companion feature C-Sat
Companion usage rates
Companion C-Sat
AI retention effect', 'Jacob Adams - Director of Digital Operations', 'Digital Operations', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQA_Pg4UzvhTS7QJCBFKoz33AfnpJQE-bSz0L_2WnenPqRk?e=fV14kS', 'Companion features including EC3, Registration, Admissions, Finance/Gatherings    
App management for the Mentor Portal, Ecclesiastical Endorsement App, and Support Cases integration 
Responsible for integrations with Azure and ICS stakeholders', 'Sebastian Vargas - D365 & Automation Manager
Samuel Riveros - Companion & Special Projects Manager
Aitana Toscano - Data Manager
Isaias Zuñiga - AI Manager'),
  (36, 'Joshua Stafford Hadden', 'Operational Research and Report Manager', 'FTE', 'Registrar business solutions
Operational data & reporting
SIS support & configuration', 'Team meeting project timelines rate
Stakeholder CSAT on team''s projects
Cost reductions in service areas (secondary)', 'Jacob Adams - Director of Digital Operations', 'Digital Operations', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDAfxv5-z3nRIuCZ8cuqVLrAetuZhsS26bV2B5GVKjLtkk?e=we7VuH', 'SIS Configuration Specialist 
Operational Data and Reporting 
Process and Solution Development', 'David Peck - Operational Data Analyst
Pelenatita Neiufi - Reporting & Evaluation Coordinator 
Victor Lamôni Calado Ferreira - System & Operations Associate Registrar'),
  (37, 'David Peck', 'Operational Data Analyst', 'FTE', 'Power BI report management & refresh', 'Project delivery on time rate
Stakeholder CSAT - communication, quality of work, impact', 'Joshua Stafford Hadden - System & Operations Manager', 'Digital Operations', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCZBbLkMAvERrRvFUiNIP8uAUhqA7Wc7H1tIJ0WisHWbLY?e=RulDks', 'Create and maintain a suite of operational reports for the registrar office  
Manage the reports in the Power BI Apps that have been developed  
Ensure that reports continue to refresh and function as expected', null),
  (38, 'Pelenatita Neiufi', 'Reporting & Evaluation Coordinator', 'FTE', 'NSC & Enrollment reporting (BYUI & EC)
Student record updates (Demographics, SSN)
Qualitative research', 'Project delivery on time rate
Stakeholder CSAT - communication, quality of work, impact', 'Joshua Stafford Hadden - Operational Research and Report Manager', 'Digital Operations', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDO92S10jkTS7uQSURJg-AQAQB0pMN-87vTcDEJaGIc7Y8?e=m2YL0Q', 'National Student Clearinghouse Reporting 
Demographic and social security number changes 
Qualitative Research Projects', null),
  (39, 'Victor Lamôni Calado Ferreira', 'System & Operations Associate Registrar', 'FTE', 'Registrar services for MLP students', 'Project delivery on time rate
Stakeholder CSAT - communication, quality of work, impact', 'Joshua Stafford Hadden - System & Operations Manager', 'Digital Operations', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBd6L0FnQgkQoq21Rr5e_CeAVnmrAepKNqoBsDZpFYsz3A?e=5EPfTL', 'Portuguese Services subject matter expert
Configuration Specialist for Multilanguage Programs', null),
  (40, 'John Ayinde', 'D365 & Automation Manager', 'Contractor', 'Mentor Portal 
Predictive Model Data Pipeline', 'Stakeholder CSAT - timeliness per project
Stakeholder CSAT - communication, quality of work, impact', 'Ricky Kailiponi Jr. - Senior Manager of Digital Ops', 'Digital Operations', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCJXq3iu29QSbfipK9hj10LAboUgNxbbxhiZixIQKvTths?e=d8h5fW', 'Data accuracy in mentor portal   
Data pipeline connection to predictive model index outputs 
High stakeholder satisfaction with enrollment counseling and mentoring services', null),
  (41, 'Samuel Riveros', 'Companion & Special Projects Manager', 'Contractor', 'Companion Front-End Stability & Usability
Companion–Analytics Engine Integration', 'Stakeholder CSAT - timeliness per project
Stakeholder CSAT - communication, quality of work, impact', 'Ricky Kailiponi Jr. - Senior Manager of Digital Ops', 'Digital Operations', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAGDpuAcq_uRJQfBo6jtQ6VAZzICKfHCBKlonY8DuoA5c0?e=uOPRI1', 'Responsible for Companion front end stability and usability
Responsible for Companion integrations with analytics engine
Responsible for high stakeholder satisfaction with ICS', null),
  (42, 'Aitana Toscano', 'Data Manager', 'Contractor', 'Power BI reporting lead
Backend Data stability & cleaning', 'Stakeholder CSAT - timeliness per project
Stakeholder CSAT - communication, quality of work, impact', 'Joshua Stafford Hadden - System & Operations Manager', 'Digital Operations', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDM61NrXoIgTZn7hTXqXYRFAT-HAogly8tB9cq40Uvl0dk?e=9icL1c', 'Responsible for quick turnarounds for PowerBI 
Responsible for backend table stability and cleaning  
Responsible for high stakeholder satisfaction with Student Services', null),
  (43, 'Isaias Zuñiga', 'AI Manager', 'Contractor', 'AI/ML Architecture development
Data Model development
Azure Board, GitHub, & DevOps Pipeline management', null, 'Ricky Kailiponi Jr. - Senior Manager of Digital Ops', 'Digital Operations', 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQB-HCg_VNVVQ6goimpZTa7rAZp194qZhHI9tyf41DYA3T4?e=9YCbey', 'Track project progression
Manage team through 1on1s and team meetings
Source solutions to unfolding project challenges
Build AI/ML Architecture
Build data model  
Maintain and manage Azure Developers board
Maintain and manage GitHub Repos
Maintain and manage Azure DevOps Pipelines
Maintain and manage Weekly reporting meetings', null);

insert into public.kpis (sort_order, employee, role, department, kpi_measure, kpi_category, category_type, data_availability, band_green, band_yellow, band_red, tracking_status, current_value, data_source, update_frequency, update_date, direction_hint, green_cutoff, red_cutoff) values
  (1, 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'No material audit findings attributable to Dean of Students governance', 'Operational Outcomes', 'Quality', 'Data available', '0', '0', '≥1', 'Tracking', '0', 'Excel link', 'Monthly', '2026-08-03', 'Lower is Better', '0', '1'),
  (2, 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'No legal findings attributable to Dean of Students governance', 'Operational Outcomes', 'Quality', 'Data available', '0', '0', '≥1', 'Tracking', '0', 'Excel link', 'Monthly', '2026-08-03', 'Lower is Better', '0', '1'),
  (3, 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'No accreditation findings attributable to Dean of Students governance', 'Operational Outcomes', 'Quality', 'Data available', '0', '0', '≥1', 'Tracking', '0', 'Excel link', 'Monthly', '2026-08-03', 'Lower is Better', '0', '1'),
  (4, 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'Annual DOS budget', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (5, 'Steven K. Thomas', 'Dean of Students', 'Dean of Students', 'Overall student satisfaction (primary)', 'Student Outcomes', 'Satisfaction', 'Data in report', '≥75%', '65% - 75%', '< 65%', 'Tracking', '0.69', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=58eb3239-b972-4ee8-8645-fcf195f36c96&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=02d230574060475bc0e4&pbi_source=appShareLink&portalSessionId=90e3d628-0853-431e-a924-80acd7dbd750', 'Term', '2026-07-15', 'Higher is Better', '0.75', '0.65'),
  (6, null, 'University Chaplain', 'Dean of Students', 'Non-member endorsement completion rate', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (7, null, 'University Chaplain', 'Dean of Students', 'Number of support cases with non-member endorsement concerns', 'Operational Outcomes', 'Quality', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (8, 'Anne Marie Clark', 'Associate Dean of Students', 'Dean of Students', 'Dean of Students response time', 'Operational Outcomes', 'Speed', 'Data available', '<5 days', '5 - 7 days', '>7 days', 'Tracking', '2 days', 'Excel link', 'Monthly', '2026-08-05', 'Lower is Better', '5', '7'),
  (9, 'Anne Marie Clark', 'Associate Dean of Students', 'Dean of Students', 'Dean of Students resolution time', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (10, 'Anne Marie Clark', 'Associate Dean of Students', 'Dean of Students', 'Dean of Students services escalation rates', 'Operational Outcomes', 'Quality', 'Data available', null, null, null, 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (11, 'Anne Marie Clark', 'Associate Dean of Students', 'Dean of Students', 'Partner CSAT', 'Operational Outcomes', 'Quality', 'No data', null, null, null, 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (12, 'Katelyn Ray', 'Student Honor & Conduct Coordinator', 'Dean of Students', 'Honor and Conduct response time', 'Operational Outcomes', 'Speed', 'Data available', '<5 days', '5 - 7 days', '>7 days', 'Tracking', '5 days', 'Excel link', 'Monthly', '2026-08-05', 'Lower is Better', '5', '7'),
  (13, 'Katelyn Ray', 'Student Honor & Conduct Coordinator', 'Dean of Students', 'Honor and Conduct resolution time', 'Operational Outcomes', 'Speed', 'No data', 'TBD', 'TBD', 'TBD', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (14, 'Katelyn Ray', 'Student Honor & Conduct Coordinator', 'Dean of Students', 'Rate of repeat offenders', 'Operational Outcomes', 'Quality', 'Data available', '0.05', '0.15', '0.25', 'Tracking', '0.12', 'Excel link', 'Monthly', '2026-08-05', 'Lower is Better', '0.05', '0.25'),
  (15, 'Sandra Wurttele', 'Student Accessibility Coordinator', 'Dean of Students', 'Accommodation determination processing rate', 'Operational Outcomes', 'Speed', 'Data available', '<5 days', '5 - 7 days', '>7 days', 'Not Tracking', null, 'Excel link', 'Monthly', null, 'Lower is Better', '5', '7'),
  (16, 'Sandra Wurttele', 'Student Accessibility Coordinator', 'Dean of Students', 'Accommodation resolution rate', 'Operational Outcomes', 'Speed', 'Data available', '<3 days', '3 - 6 days', '> 6 days', 'Not Tracking', null, 'Excel link', 'Monthly', null, 'Lower is Better', '3', '6'),
  (17, 'Sandra Wurttele', 'Student Accessibility Coordinator', 'Dean of Students', 'ADA and Section 504 standard compliance rate', 'Operational Outcomes', 'Quality', 'Data available', '-', '-', '-', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (18, 'Sandra Wurttele', 'Student Accessibility Coordinator', 'Dean of Students', 'ADA and Section 504 Audit compliance rate', 'Operational Outcomes', 'Quality', 'Data available', '-', '-', '-', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (19, 'Ana De Castro', 'Student Belonging Coordinator', 'Dean of Students', 'Discrimination resolution rate', 'Operational Outcomes', 'Quality', 'Data available', '-', '-', '-', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (20, 'Ana De Castro', 'Student Belonging Coordinator', 'Dean of Students', 'Student sentiment on belonging', 'Operational Outcomes', 'Quality', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (21, 'Ana De Castro', 'Student Belonging Coordinator', 'Dean of Students', 'CSAT for Student Belonging', 'Operational Outcomes', 'Quality', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (22, 'Ana De Castro', 'Student Belonging Coordinator', 'Dean of Students', '90% of non-member ecclesiastical endorsements completed with 14 days', 'Operational Outcomes', 'Speed', 'Speed', '< 90%', '80% - 90%', '< 80%', 'Tracking', '0.524', null, 'Monthly', null, 'Higher is Better', '0.9', '0.8'),
  (23, 'Helen Reboucas', 'Student Grievance Coordinator', 'Dean of Students', 'Student grievance case response time', 'Operational Outcomes', 'Speed', 'Speed', '<5 days', '5 - 7 days', '>7 days', 'Tracking', '0.7', 'Excel link', 'Monthly', null, 'Lower is Better', '5', '7'),
  (24, 'Helen Reboucas', 'Student Grievance Coordinator', 'Dean of Students', 'Grievance QA', 'Operational Outcomes', 'Quality', 'Data available', '< 90%', '70% - 90%', '< 70%', 'Tracking', '0.9545', 'Excel link', 'Monthly', '2026-08-05', 'Higher is Better', '0.9', '0.7'),
  (25, 'Joseph Bentum', 'Student Crisis Coordinator', 'Dean of Students', 'Crisis response time', 'Operational Outcomes', 'Speed', 'Data available', '< 1 day', '1 - 2 days', '> 2 days', 'Tracking', '1 day', 'Excel link', 'Monthly', '2026-08-05', 'Lower is Better', '24', '48'),
  (26, 'Mark Gefrom', 'Director of Student Support', 'Records, Registration, Support', 'Teams meeting or exceeding response service-level agreements', 'Operational Outcomes', 'Speed', 'Data in report', '< 24 hours', '24 - 48 hours', '> 48 hours', 'Tracking', null, null, 'Monthly', null, 'Lower is Better', '24', '48'),
  (27, 'Mark Gefrom', 'Director of Student Support', 'Records, Registration, Support', 'Teams meeting or exceeding resolution service-level agreements', 'Operational Outcomes', 'Speed', 'Data in report', '<48 hours', '48 - 72 hours', '> 72 hours', 'Tracking', null, null, 'Monthly', null, 'Lower is Better', '48', '72'),
  (28, 'Mark Gefrom', 'Director of Student Support', 'Records, Registration, Support', 'Teams meeting QA service-level agreements', 'Operational Outcomes', 'Quality', 'Data in report', '≥90%', '85% - 90%', '< 85%', 'Tracking', null, null, 'Monthly', null, 'Higher is Better', '0.9', '0.85'),
  (29, 'Mark Gefrom', 'Director of Student Support', 'Records, Registration, Support', 'Teams meeting CSAT service-level agreements', 'Operational Outcomes', 'Quality', 'Data in report', '≥85%', '80% - 85%', '<80%', 'Tracking', null, null, 'Monthly', null, 'Higher is Better', '0.85', '0.8'),
  (30, 'Mark Gefrom', 'Director of Student Support', 'Records, Registration, Support', 'Teams meeting first contact resolution service-level agreements', 'Operational Outcomes', 'Quality', 'Data in report', '≥90%', '85% - 90%', '<85%', 'Tracking', null, null, 'Monthly', null, 'Higher is Better', '0.9', '0.85'),
  (31, 'Mark Gefrom', 'Director of Student Support', 'Records, Registration, Support', 'Student records, registration, and support department budget', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (32, 'Mark Gefrom', 'Director of Student Support', 'Records, Registration, Support', 'Overall student autonomy (primary)', 'Student Outcomes', 'Autonomy', 'Data in report', '≥85%', '80% - 85%', '< 80%', 'Tracking', '0.67', 'https://app.powerbi.com/groups/me/apps/d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0/reports/fcf13746-fad2-48de-9d61-a4ab0ae71022/90333e1e71861247c683?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.85', '0.8'),
  (33, 'Mark Gefrom', 'Director of Student Support', 'Records, Registration, Support', 'Overall student satisfaction (secondary)', 'Student Outcomes', 'Satisfaction', 'Data in report', '≥75%', '65% - 75%', '< 65%', 'Tracking', '0.82', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=58eb3239-b972-4ee8-8645-fcf195f36c96&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=02d230574060475bc0e4&pbi_source=appShareLink&portalSessionId=90e3d628-0853-431e-a924-80acd7dbd750', 'Term', null, 'Higher is Better', '0.75', '0.65'),
  (34, 'Brad Lester', 'Senior Manager of Student Support', 'Records, Registration, Support', 'Student support budget', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (35, 'Brad Lester', 'Senior Manager of Student Support', 'Records, Registration, Support', 'Autonomy rate for student support cases', 'Student Outcomes', 'Autonomy', 'Data in report', '100% - 85%', '84% - 70%', '0.69', 'Tracking', null, 'https://app.powerbi.com/groups/me/apps/d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0/reports/fcf13746-fad2-48de-9d61-a4ab0ae71022/90333e1e71861247c683?experience=power-bi', 'Monthly', null, 'Higher is Better', '1', '0.69'),
  (36, 'Alyssa Burrell', 'Student Support Coordinator', 'Records, Registration, Support', 'General support case response rate', 'Operational Outcomes', 'Speed', 'Data in report', '1-3 Days', '4-5 Days', '5+ Days', 'Tracking', null, 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/acd0ee0b785069a6a598?experience=power-bi', 'Monthly', null, 'Lower is Better', '3', '5'),
  (37, 'Alyssa Burrell', 'Student Support Coordinator', 'Records, Registration, Support', 'General support case resolution rate', 'Operational Outcomes', 'Speed', 'Data in report', '≥ 90%', '80-90%', '< 80%', 'Not Tracking', null, 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/acd0ee0b785069a6a598?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.9', '0.8'),
  (38, 'Alyssa Burrell', 'Student Support Coordinator', 'Records, Registration, Support', 'Phone answer speed', 'Operational Outcomes', 'Speed', 'Data in report', '< 1 minute', '2-5 minutes', '5+ minutes', 'Tracking', '3', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/ec6a4f4305973947e908?experience=power-bi', 'Monthly', null, 'Lower is Better', '1', '5'),
  (39, 'Alyssa Burrell', 'Student Support Coordinator', 'Records, Registration, Support', 'Phone handle rate', 'Operational Outcomes', 'Speed', 'Data in report', '≥ 90%', '80-89%', '< 80%', 'Tracking', '0.825', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/ec6a4f4305973947e908?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.9', '0.8'),
  (40, 'Alyssa Burrell', 'Student Support Coordinator', 'Records, Registration, Support', 'Agent availability', 'Operational Outcomes', 'Speed', 'Data in report', '≥ 80%', '75 - 79 %', '< 75%', 'Tracking', '0.96', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/ec6a4f4305973947e908?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.8', '0.75'),
  (41, 'Alyssa Burrell', 'Student Support Coordinator', 'Records, Registration, Support', 'Phone support QA', 'Operational Outcomes', 'Quality', 'Data in report', '≥ 80%', '75-85%', '< 75%', 'Tracking', '0.98', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/1afb91a1da6d47c71041?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.8', '0.75'),
  (42, 'Alyssa Burrell', 'Student Support Coordinator', 'Records, Registration, Support', 'Phone support CSAT', 'Operational Outcomes', 'Quality', 'Data in report', '≥ 80%', '75-85%', '< 75%', 'Tracking', '0.77', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/77b2e5ed1050bc711c70?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.8', '0.75'),
  (43, 'Alyssa Burrell', 'Student Support Coordinator', 'Records, Registration, Support', 'Phone support first contact resolution', 'Operational Outcomes', 'Quality', 'Data in report', '≥ 90%', '80-90%', '< 80%', 'Tracking', '0.97', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/acd0ee0b785069a6a598?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.9', '0.8'),
  (44, 'Hilary Bagley', 'Training & Quality Assurance Manager', 'Records, Registration, Support', 'Request-to-KB publish rate', 'Operational Outcomes', 'Speed', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (45, 'Hilary Bagley', 'Training & Quality Assurance Manager', 'Records, Registration, Support', 'QA feedback cycle rate', 'Operational Outcomes', 'Speed', 'Data in report', null, null, null, 'Tracking', null, 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/4c2855c01a3caaf171d0?experience=power-bi', 'Monthly', null, 'Manual', null, null),
  (46, 'Hilary Bagley', 'Training & Quality Assurance Manager', 'Records, Registration, Support', 'QA calibration consistency rate', 'Operational Outcomes', 'Quality', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (47, 'Hilary Bagley', 'Training & Quality Assurance Manager', 'Records, Registration, Support', 'Knowledge Base audit pass rate', 'Operational Outcomes', 'Quality', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (48, 'Hilary Bagley', 'Training & Quality Assurance Manager', 'Records, Registration, Support', 'QA team lead feedback success rate', 'Operational Outcomes', 'Quality', 'Data in report', null, null, null, 'Tracking', '0.8324', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/4c2855c01a3caaf171d0?experience=power-bi', 'Monthly', null, 'Manual', null, null),
  (49, 'Hilary Bagley', 'Training & Quality Assurance Manager', 'Records, Registration, Support', 'Cost per QA Evaluation ($ per Evaluation)', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (50, 'Hilary Bagley', 'Training & Quality Assurance Manager', 'Records, Registration, Support', 'Cost per KB Article Maintained ($ per Article Updated or Audited)', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (51, 'Kira Hayes', 'Training & Quality Assurance Coordinator', 'Records, Registration, Support', 'KB publishing rate', 'Operational Outcomes', 'Speed', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (52, 'Kira Hayes', 'Training & Quality Assurance Coordinator', 'Records, Registration, Support', 'QA evaluation completion rate', 'Operational Outcomes', 'Quality', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (53, 'Kira Hayes', 'Training & Quality Assurance Coordinator', 'Records, Registration, Support', 'DSAT and critical violation delivery rate', 'Operational Outcomes', 'Quality', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (54, 'Matthew Smith', 'Technical Support Manager', 'Records, Registration, Support', 'Tech support case resolution rate', 'Operational Outcomes', 'Speed', 'Data in report', '3 business days', '5 business days', '> 10 business days', 'Not Tracking', null, 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/acd0ee0b785069a6a598?experience=power-bi', 'Monthly', null, 'Lower is Better', '3', '10'),
  (55, 'Matthew Smith', 'Technical Support Manager', 'Records, Registration, Support', 'Tech support costs', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (56, 'Matthew Smith', 'Technical Support Manager', 'Records, Registration, Support', 'Autonomy rate for tech support cases', 'Student Outcomes', 'Autonomy', 'Data in report', '0', '0', '0', 'Not Tracking', null, 'https://app.powerbi.com/groups/me/apps/d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0/reports/20549c98-8ffc-4600-b08a-67e5f927e9d6/23134ede7649a89fe09c?experience=power-bi', 'Monthly', null, 'Manual', null, null),
  (57, 'Colby Warner', 'Product Support Engineer', 'Records, Registration, Support', 'Escalated case resolution rate', 'Operational Outcomes', 'Speed', 'Data in report', '90-100%', '75-90%', '< 75%', 'Not Tracking', null, 'https://app.powerbi.com/groups/me/apps/d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0/reports/1d513597-8eb5-4912-8692-96ff2a683a51/0209ae92d2720717522a?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.9', '0.75'),
  (58, 'Colby Warner', 'Product Support Engineer', 'Records, Registration, Support', 'Tech Support case QA', 'Operational Outcomes', 'Quality', 'Data in report', '90-100%', '80-90%', '<80%', 'Tracking', '0.94', 'https://app.powerbi.com/groups/me/apps/d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0/reports/1d513597-8eb5-4912-8692-96ff2a683a51/0209ae92d2720717522a?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.9', '0.8'),
  (59, 'Colby Warner', 'Product Support Engineer', 'Records, Registration, Support', 'Tech Support case CSAT', 'Operational Outcomes', 'Quality', 'Data in report', '90-100%', '80-90%', '<80%', 'Tracking', '0.778', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/77b2e5ed1050bc711c70?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.9', '0.8'),
  (60, 'Colby Warner', 'Product Support Engineer', 'Records, Registration, Support', 'Tech Support case first contact resolution', 'Operational Outcomes', 'Quality', 'Data in report', '90-100%', '75-90%', '< 75%', 'Tracking', '0.96', 'https://app.powerbi.com/groups/me/apps/d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0/reports/1d513597-8eb5-4912-8692-96ff2a683a51/0209ae92d2720717522a?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.9', '0.75'),
  (61, 'Kari Johnson', 'Registrar', 'Records, Registration, Support', 'Registrar budget', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (62, 'Kari Johnson', 'Registrar', 'Records, Registration, Support', 'Autonomy for student registration (% students registered without submitting a support request)', 'Student Outcomes', 'Autonomy', 'Data available', '90-100%', '75-90%', '<75%', 'Tracking', null, 'https://grafanapathway-bvcefagkg2gtgzb6.eus.grafana.azure.com/d/edt8uho6bh0jkc/anthology-monitoring-top?orgId=1&from=now-6h&to=now&timezone=America%2FDenver&refresh=10s', 'Monthly', null, 'Higher is Better', '0.9', '0.75'),
  (63, 'Kari Johnson', 'Registrar', 'Records, Registration, Support', 'Transcripts processed within 10 days', 'Student Outcomes', 'Autonomy', 'Data in report', '90-100%', '75-90%', '<75%', 'Tracking', '0.93', 'https://app.powerbi.com/groups/me/apps/d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0/reports/32370e33-dc03-418d-9403-25cfd508af0b/ReportSection9394f2e53928728d117e?experience=power-bi', 'Monthly', '2026-07-28', 'Lower is Better', '5', '30'),
  (64, 'Kari Johnson', 'Registrar', 'Records, Registration, Support', 'Case CSAT for planning and registration', 'Student Outcomes', 'Satisfaction', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', null, 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/77b2e5ed1050bc711c70?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.85', '0.7'),
  (65, 'Kim Overdiek', 'Associate Registrar', 'Records, Registration, Support', 'On-time catalog publishing rate', 'Operational Outcomes', 'Speed', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (66, 'Kim Overdiek', 'Associate Registrar', 'Records, Registration, Support', 'On-time system configuration rate', 'Operational Outcomes', 'Speed', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (67, 'Kim Overdiek', 'Associate Registrar', 'Records, Registration, Support', 'Case resolution within 5 days', 'Operational Outcomes', 'Speed', 'Data in report', '85-100%', '65-84%', 'Below 65%', 'Tracking', null, 'https://app.powerbi.com/groups/me/apps/edf61692-3af5-4aba-af7e-ef1de76ce451/reports/70c7e184-e400-4cac-9500-f8ec201a252b/ReportSection9394f2e53928728d117e?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi', 'Monthly', null, 'Higher is Better', '0.85', '0.65'),
  (68, 'Kim Overdiek', 'Associate Registrar', 'Records, Registration, Support', 'Process case QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.9542999999999999', 'https://app.powerbi.com/groups/me/apps/edf61692-3af5-4aba-af7e-ef1de76ce451/reports/7f263ef8-0c4e-4dbd-8c84-2d5d029a1085/e5ac827acf52df1bdc6a?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi / https://app.powerbi.com/groups/me/apps/edf61692-3af5-4aba-af7e-ef1de76ce451/reports/7f263ef8-0c4e-4dbd-8c84-2d5d029a1085/185501d1d1107d800e43?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi', 'Monthly', '2026-07-20', 'Higher is Better', '0.85', '0.7'),
  (69, 'Kim Overdiek', 'Associate Registrar', 'Records, Registration, Support', 'Process case CSAT', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.8665', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/77b2e5ed1050bc711c70?experience=power-bi / https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/77b2e5ed1050bc711c70?experience=power-bi', 'Monthly', '2026-07-20', 'Higher is Better', '0.85', '0.7'),
  (70, 'Tyson Bell', 'Associate Registrar', 'Records, Registration, Support', 'Case resolution within 5 days', 'Operational Outcomes', 'Speed', 'Data in report', '90-100%', '80-90%', '<80%', 'Not Tracking', null, null, 'Monthly', null, 'Higher is Better', '0.9', '0.8'),
  (71, 'Tyson Bell', 'Associate Registrar', 'Records, Registration, Support', 'Records case QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.9476666666666667', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/1afb91a1da6d47c71041?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.85', '0.7'),
  (72, 'Tyson Bell', 'Associate Registrar', 'Records, Registration, Support', 'Records case CSAT', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.8846', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/1afb91a1da6d47c71041?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.85', '0.7'),
  (73, 'Angie Holt', 'Graduation Coordinator', 'Records, Registration, Support', 'Award processing rate', 'Operational Outcomes', 'Speed', 'Data available', '< 3 weeks', '3-6 weeks', 'Above 6 weeks', 'Not Tracking', '3', 'Block 3 Final Reviews_6.26.26.xlsx', 'Monthly', '2026-07-20', 'Lower is Better', '3', '6'),
  (74, 'Angie Holt', 'Graduation Coordinator', 'Records, Registration, Support', 'Graduation application case completion rate', 'Operational Outcomes', 'Speed', 'Data available', '< 3 weeks', '3-6 weeks', 'Above 6 weeks', 'Not Tracking', null, null, 'Monthly', null, 'Lower is Better', '3', '6'),
  (75, 'Angie Holt', 'Graduation Coordinator', 'Records, Registration, Support', 'Number of Rescinded Degrees', 'Operational Outcomes', 'Quality', 'Data available', '0', 'NA', '>1', 'Not Tracking', null, null, 'Monthly', null, 'Lower is Better', '0', '1'),
  (76, 'Angie Holt', 'Graduation Coordinator', 'Records, Registration, Support', 'Application QA', 'Operational Outcomes', 'Quality', 'Data available', '95-100%', '85-94%', 'Below  85%', 'Tracking', '0.98', '2026 Year QA Tracker.xlsx', 'Monthly', '2026-07-20', 'Higher is Better', '0.95', '0.85'),
  (77, 'Angie Holt', 'Graduation Coordinator', 'Records, Registration, Support', 'Awarding QA', 'Operational Outcomes', 'Quality', 'Data available', '95-100%', '85-94%', 'Below  85%', 'Tracking', '0.98', '2026 Year QA Tracker.xlsx', 'Monthly', '2026-07-20', 'Higher is Better', '0.95', '0.85'),
  (78, 'Anne E. Owen', 'Records & Transcript Coordinator', 'Records, Registration, Support', 'Process case completion rate', 'Operational Outcomes', 'Speed', 'Data in report', '< 5 days', '6-10 Days', 'Above 10 Days', 'Tracking', '2.56', 'Transcript Requests - Power BI', 'Monthly', null, 'Lower is Better', '5', '10'),
  (79, 'Anne E. Owen', 'Records & Transcript Coordinator', 'Records, Registration, Support', 'Process case CSAT', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', null, 'C-SAT - Student Support Dashboard (R) - Power BI', 'Monthly', null, 'Higher is Better', '0.85', '0.7'),
  (80, 'Anne E. Owen', 'Records & Transcript Coordinator', 'Records, Registration, Support', 'Process case QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.9', 'Records Report', 'Monthly', null, 'Higher is Better', '0.85', '0.7'),
  (81, 'Anne E. Owen', 'Records & Transcript Coordinator', 'Records, Registration, Support', 'Transcript accuracy QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.9', 'Transcripts Report', 'Monthly', null, 'Higher is Better', '0.85', '0.7'),
  (82, 'Cindi C Putnam', 'Planning Coordinator', 'Records, Registration, Support', 'Degree planning escalation case resolution rate', 'Operational Outcomes', 'Speed', 'Data in report', 'Resolution Rate < 5 Days', '6-10 days', 'Above 10 Day', 'Not Tracking', null, 'https://app.powerbi.com/groups/me/apps/edf61692-3af5-4aba-af7e-ef1de76ce451/reports/70c7e184-e400-4cac-9500-f8ec201a252b/ReportSection9394f2e53928728d117e?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi', 'Monthly', null, 'Lower is Better', '5', '10'),
  (83, 'Cindi C Putnam', 'Planning Coordinator', 'Records, Registration, Support', 'Degree planning escalation case CSAT', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.8', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/77b2e5ed1050bc711c70?experience=power-bi', 'Monthly', '2026-07-20', 'Higher is Better', '0.85', '0.7'),
  (84, 'Cindi C Putnam', 'Planning Coordinator', 'Records, Registration, Support', 'Degree planning escalation case QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.956', 'https://app.powerbi.com/groups/me/apps/edf61692-3af5-4aba-af7e-ef1de76ce451/reports/7f263ef8-0c4e-4dbd-8c84-2d5d029a1085/e5ac827acf52df1bdc6a?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi', 'Monthly', '2026-07-20', 'Higher is Better', '0.85', '0.7'),
  (85, 'Nikki Jane Chambers', 'Enrollment Verification Specialist', 'Records, Registration, Support', 'Enrollment verification completion rate', 'Operational Outcomes', 'Speed', 'Data available', '< 5 days', '6-10 Days', 'Above 10 Days', 'Tracking', '4.5', 'https://cne-101008.crm.dynamics.com/main.aspx?appid=155f9667-c2f7-ed11-8847-000d3a358523', 'Monthly', null, 'Lower is Better', '5', '10'),
  (86, 'Nikki Jane Chambers', 'Enrollment Verification Specialist', 'Records, Registration, Support', 'Apostille completion rate', 'Operational Outcomes', 'Speed', 'Data available', '<10 Days', '11-14 days', 'Above 14 days', 'Tracking', '29 days', 'https://cne-101008.crm.dynamics.com/main.aspx?appid=155f9667-c2f7-ed11-8847-000d3a358523', 'Monthly', null, 'Lower is Better', '10', '14'),
  (87, 'Nikki Jane Chambers', 'Enrollment Verification Specialist', 'Records, Registration, Support', 'Enrollment verification QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.963', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/1afb91a1da6d47c71041?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.85', '0.7'),
  (88, 'Nikki Jane Chambers', 'Enrollment Verification Specialist', 'Records, Registration, Support', 'Apostille QA', 'Operational Outcomes', 'Quality', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (89, 'Nikki Jane Chambers', 'Enrollment Verification Specialist', 'Records, Registration, Support', 'Enrollment verification CSAT', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.8846', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/1afb91a1da6d47c71041?experience=power-bi', 'Monthly', null, 'Higher is Better', '0.85', '0.7'),
  (90, 'Nikki Jane Chambers', 'Enrollment Verification Specialist', 'Records, Registration, Support', 'Apostille C-Sat', 'Operational Outcomes', 'Quality', 'No data', 'NA', 'NA', 'NA', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (91, 'Daniel Zago', 'Registration Specialist', 'Records, Registration, Support', 'Registration issue case resolution rate', 'Operational Outcomes', 'Speed', 'Data in report', 'Resolution Rate < 24 hours', '< 3 days', 'Above 3 Days', 'Not Tracking', null, 'https://app.powerbi.com/groups/me/apps/edf61692-3af5-4aba-af7e-ef1de76ce451/reports/fd36c261-899f-4645-aef4-d7302ec76d79/ReportSection9394f2e53928728d117e?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi', 'Monthly', null, 'Higher is Better', '24', '3'),
  (92, 'Daniel Zago', 'Registration Specialist', 'Records, Registration, Support', 'Registration issue case QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.9526', 'https://app.powerbi.com/groups/me/apps/edf61692-3af5-4aba-af7e-ef1de76ce451/reports/7f263ef8-0c4e-4dbd-8c84-2d5d029a1085/185501d1d1107d800e43?ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&experience=power-bi', 'Monthly', '2026-07-20', 'Higher is Better', '0.85', '0.7'),
  (93, 'Daniel Zago', 'Registration Specialist', 'Records, Registration, Support', 'Registration issue case CSAT', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', 'Below 70%', 'Tracking', '0.933', 'https://app.powerbi.com/groups/4f9c84ba-b5d3-4eda-a86b-41fbb3b3bc4a/reports/af9ba6b3-8092-4e0c-bb52-4f8903b1b861/77b2e5ed1050bc711c70?experience=power-bi', 'Monthly', '2026-07-20', 'Higher is Better', '0.85', '0.7'),
  (94, 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Overall Stakeholder CSAT', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, 'Monthly', null, 'Higher is Better', '0.85', '0.75'),
  (95, 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Digital Ops budget', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (96, 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Costs saved by customers due to Digital Ops technologies (secondary)', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (97, 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Overall student autonomy (secondary)', 'Student Outcomes', 'Student Autonomy', 'Data in report', '80-100%', '65-79%', '<65%', 'Tracking', '0.704', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=be2cacf8-fa52-4ce4-abf5-f9ee28fa66a6&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=90333e1e71861247c683&pbi_source=appShareLink&portalSessionId=78f4edc2-9814-43bc-bc67-b03ff6a08911', 'Term', null, 'Higher is Better', '0.8', '0.65'),
  (98, 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'Overall student satisfaction (secondary)', 'Student Outcomes', 'Student Satisfaction', 'Data in report', '80-100%', '65-79%', '<65%', 'Tracking', '0.8261', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=58eb3239-b972-4ee8-8645-fcf195f36c96&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=02d230574060475bc0e4&pbi_source=appShareLink&portalSessionId=78f4edc2-9814-43bc-bc67-b03ff6a08911', 'Term', null, 'Higher is Better', '0.8', '0.65'),
  (99, 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'App start-to-registration yield (secondary)', 'Student Outcomes', 'Completion', 'Data in report', '80-100%', '65-79%', '<65%', 'Tracking', '0.6516', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=27ea7bdf-aa28-4e92-98c9-89ecc9455740&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=f2a14ebbd5968172a5bb&pbi_source=appShareLink&portalSessionId=78f4edc2-9814-43bc-bc67-b03ff6a08911', 'Term', null, 'Higher is Better', '0.8', '0.65'),
  (100, 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'PC Completion Rate (secondary)', 'Student Outcomes', 'Completion', 'Data in report', '>45%', '30-44%', '<30%', 'Tracking', '0.31', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=4679386d-8e13-43fa-9be7-6c5c504ce07a&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=004a8c4d49c762e03b5d&pbi_source=appShareLink&portalSessionId=78f4edc2-9814-43bc-bc67-b03ff6a08911', 'Term', null, 'Higher is Better', '0.4', '0.3'),
  (101, 'Jacob Adams', 'Director of Digital Operations', 'Digital Operations', 'First Certificate Completion Rate (secondary)', 'Student Outcomes', 'Completion', 'Data in report', '>40%', '30-39%', '<30%', 'Tracking', '0.327', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=4679386d-8e13-43fa-9be7-6c5c504ce07a&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=004a8c4d49c762e03b5d&pbi_source=appShareLink&portalSessionId=78f4edc2-9814-43bc-bc67-b03ff6a08911', 'Quarterly', null, 'Higher is Better', '0.4', '0.3'),
  (102, 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'Team meeting project deadlines rate', 'Operational Outcomes', 'Speed', null, null, null, null, 'Not Tracking', null, null, 'Monthly', null, 'Manual', null, null),
  (103, 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'Companion feature C-Sat', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '75-84%', '<75%', 'Tracking', '0.9', 'Usage - Companion App - Power BI', 'Monthly', null, 'Higher is Better', '0.85', '0.75'),
  (104, 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'Companion usage rates', 'Student Outcomes', 'Student Autonomy', 'Data in report', '75-100%', '50-74%', '<50%', 'Tracking', '0.93', 'Usage - Companion App - Power BI', 'Term', null, 'Higher is Better', '0.75', '0.5'),
  (105, 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'Companion C-Sat', 'Student Outcomes', 'Student Satisfaction', 'Data in report', '85-100%', '75-84%', '<75%', 'Tracking', '0.87', 'Usage - Companion App - Power BI', 'Monthly', null, 'Higher is Better', '0.85', '0.75'),
  (106, 'Ricky Kailiponi Jr.', 'Senior Manager of Digital Ops', 'Digital Operations', 'AI retention effect', 'Student Outcomes', 'Completion', 'Data available', '>4%', '2-3%', '0.01', 'Not Tracking', null, null, null, null, 'Higher is Better', '4', '1'),
  (107, 'Joshua Stafford Hadden', 'Operational Research & Reporting Manager', 'Digital Operations', 'Team meeting project timelines rate', 'Operational Outcomes', 'Speed', null, null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (108, 'Joshua Stafford Hadden', 'Operational Research & Reporting Manager', 'Digital Operations', 'Stakeholder CSAT on team''s projects', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'),
  (109, 'Joshua Stafford Hadden', 'Operational Research & Reporting Manager', 'Digital Operations', 'Cost reductions in service areas (secondary)', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (110, 'David Peck', 'Operational Data Analyst', 'Digital Operations', 'Project delivery on time rate', 'Operational Outcomes', 'Speed', null, null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (111, 'David Peck', 'Operational Data Analyst', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'),
  (112, 'Pelenatita Neiufi', 'Reporting & Evaluation Coordinator', 'Digital Operations', 'Project delivery on time rate', 'Operational Outcomes', 'Speed', null, null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (113, 'Pelenatita Neiufi', 'Reporting & Evaluation Coordinator', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'),
  (114, 'Victor Lamôni Calado Ferreira', 'System & Operations Associate Registrar
(title change)', 'Digital Operations', 'Project delivery on time rate', 'Operational Outcomes', 'Speed', null, null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (115, 'Victor Lamôni Calado Ferreira', 'System & Operations Associate Registrar
(title change)', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'),
  (116, 'John Ayinde', 'D365 & Automation Manager', 'Digital Operations', 'Stakeholder CSAT - timeliness per project', 'Operational Outcomes', 'Speed', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'),
  (117, 'John Ayinde', 'D365 & Automation Manager', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'),
  (118, 'Samuel Riveros', 'Companion & Special Projects Manager', 'Digital Operations', 'Stakeholder CSAT - timeliness per project', 'Operational Outcomes', 'Speed', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'),
  (119, 'Samuel Riveros', 'Companion & Special Projects Manager', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'),
  (120, 'Aitana Toscano', 'Data Manager', 'Digital Operations', 'Stakeholder CSAT - timeliness per project', 'Operational Outcomes', 'Speed', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'),
  (121, 'Aitana Toscano', 'Data Manager', 'Digital Operations', 'Stakeholder CSAT - communication, quality of work, impact', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '75-84%', '<75%', 'Not Tracking', null, null, null, null, 'Higher is Better', '0.85', '0.75'),
  (122, 'Alison Cundiff', 'Director of Enrollment & Retention', 'Enrollment & Retention', 'Enrollment & Retention budget', 'Operational Outcomes', 'Cost', 'Data available', '$', '$', '$', 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (123, 'Alison Cundiff', 'Director of Enrollment & Retention', 'Enrollment & Retention', 'Overall student autonomy (secondary)', 'Student Outcomes', 'Student Autonomy', 'Data in report', '≥85%', '80% - 85%', '< 80%', 'Tracking', '0.906', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=be2cacf8-fa52-4ce4-abf5-f9ee28fa66a6&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=90333e1e71861247c683&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', null, null, 'Higher is Better', '0.85', '0.8'),
  (124, 'Alison Cundiff', 'Director of Enrollment & Retention', 'Enrollment & Retention', 'Overall student satisfaction (secondary)', 'Student Outcomes', 'Student Satisfaction', 'Data in report', '≥75%', '65% - 75%', '< 65%', 'Tracking', '0.69', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=58eb3239-b972-4ee8-8645-fcf195f36c96&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=02d230574060475bc0e4&pbi_source=appShareLink&portalSessionId=90e3d628-0853-431e-a924-80acd7dbd750', 'Term', null, 'Higher is Better', '0.75', '0.65'),
  (125, 'Katelyn Graf', 'Senior Manager of Retention', 'Enrollment & Retention', 'PC Completion Rate', 'Student Outcomes', 'Completion', 'Data in report', '>45%', '30-44%', '<30%', 'Tracking', '0.311', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=4679386d-8e13-43fa-9be7-6c5c504ce07a&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=004a8c4d49c762e03b5d&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', null, null, 'Higher is Better', '0.45', '0.3'),
  (126, 'Katelyn Graf', 'Senior Manager of Retention', 'Enrollment & Retention', 'First Certificate Completion Rate', 'Student Outcomes', 'Completion', 'Data in report', '>40%', '30-39%', '<30%', 'Tracking', '0.328', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=4679386d-8e13-43fa-9be7-6c5c504ce07a&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=004a8c4d49c762e03b5d&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', null, null, 'Higher is Better', '0.4', '0.3'),
  (127, 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Mentor required action completion rate', 'Operational Outcomes', 'Speed', 'Data in report', '95-100%', '85-94%', '<85%', 'Tracking', '0.99', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=8b8c6aa8-361e-4ed7-8018-ac9b625ec004&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=8dd6568b0dc02796db27&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.95', '0.85'),
  (128, 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Mentor interaction QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', '<70%', 'Tracking', '0.95', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=cb2ce85e-73e7-4234-8d3b-dd2fc9744649&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=404ac9b71b3c0ac70d20&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.85', '0.7'),
  (129, 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Mentor CSAT', 'Student Outcomes', 'Student Satisfaction', 'Data in report', '85-100%', '70-84%', '<70%', 'Tracking', '0.9', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=e2b5b9d8-0b16-4185-9213-61b41d61c157&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=ReportSectionf20578b2c846b75ef80e&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.85', '0.7'),
  (130, 'Kelley Richardson', 'Mentoring Manager', 'Enrollment & Retention', 'Retention rate contribution by mentors', 'Student Outcomes', 'Completion', 'No data', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (131, 'Mandy Schwab', 'Mentoring Content Coordinator', 'Enrollment & Retention', 'Mentor interaction QA', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', '<70%', 'Tracking', '0.95', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=cb2ce85e-73e7-4234-8d3b-dd2fc9744649&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=404ac9b71b3c0ac70d20&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.85', '0.7'),
  (132, 'Mandy Schwab', 'Mentoring Content Coordinator', 'Enrollment & Retention', 'Mentor CSAT', 'Operational Outcomes', 'Quality', 'Data in report', '85-100%', '70-84%', '<70%', 'Tracking', '0.9', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=e2b5b9d8-0b16-4185-9213-61b41d61c157&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=ReportSectionf20578b2c846b75ef80e&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.85', '0.7'),
  (133, 'Joanna Relkin', 'Mentor Operations Coordinator', 'Enrollment & Retention', 'Mentor required action completion rate', 'Operational Outcomes', 'Speed', 'Data in report', '95-100%', '85-94%', '<85%', 'Tracking', '0.99', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=8b8c6aa8-361e-4ed7-8018-ac9b625ec004&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=8dd6568b0dc02796db27&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Term', null, 'Higher is Better', '0.95', '0.85'),
  (134, 'Joanna Relkin', 'Mentor Operations Coordinator', 'Enrollment & Retention', 'Mentor concern case QA', 'Operational Outcomes', 'Quality', 'Data available', '85-100%', '70-84%', '<70%', 'Tracking', '0.895', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=1d513597-8eb5-4912-8692-96ff2a683a51&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=0209ae92d2720717522a&pbi_source=appShareLink&portalSessionId=c8279588-5339-490f-bd8a-0cbc06437598', 'Monthly', null, 'Higher is Better', '0.85', '0.7'),
  (135, 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Reduction of enrollment related support cases', 'Student Outcomes', 'Student Autonomy', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (136, 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Reduction of admissions tier 2 support cases', 'Student Outcomes', 'Student Autonomy', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (137, 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'App start-to-registration yield', 'Student Outcomes', 'Completion', 'Data in report', '75-100%', '60-74%', '<60%', 'Tracking', '0.6661', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=27ea7bdf-aa28-4e92-98c9-89ecc9455740&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=f2a14ebbd5968172a5bb&pbi_source=appShareLink&portalSessionId=04e4cd1a-8779-483e-a338-581068ced021', null, null, 'Higher is Better', '0.75', '0.6'),
  (138, 'Trevor Shelton', 'Senior Manager of Enrollment Services', 'Enrollment & Retention', 'Registration to auto-drop yield', 'Student Outcomes', 'Completion', 'Data in report', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (139, 'Rachel Kirk', 'Enrollment Counseling Manager', 'Enrollment & Retention', 'Enrollment Counseling required action completion rate', 'Operational Outcomes', 'Speed', 'Data available', '95-100%', '85-94%', '<85%', 'Tracking', '0.98', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=7177fab9-23b0-4184-8f31-f0db822282c0&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=ReportSection964c860de430a5035bab&pbi_source=appShareLink&portalSessionId=04e4cd1a-8779-483e-a338-581068ced021', null, null, 'Higher is Better', '0.95', '0.85'),
  (140, 'Rachel Kirk', 'Enrollment Counseling Manager', 'Enrollment & Retention', 'Enrollment Counseling contact rate by alert', 'Operational Outcomes', 'Speed', 'No data', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (141, 'Rachel Kirk', 'Enrollment Counseling Manager', 'Enrollment & Retention', 'Enrollment Counseling CSAT rate', 'Operational Outcomes', 'Quality', 'Data in report', '90-100%', '75-89%', '<75%', 'Tracking', '0.9239', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=d0f58bce-3a7d-49b6-80a3-eade14ab09fc&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=e3ff97a21eaacb03dbca&pbi_source=appShareLink&portalSessionId=04e4cd1a-8779-483e-a338-581068ced021', null, null, 'Higher is Better', '0.9', '0.75'),
  (142, 'Rachel Kirk', 'Enrollment Counseling Manager', 'Enrollment & Retention', 'Enrollment Counseling yield contribution', 'Operational Outcomes', 'Quality', 'No data', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (143, 'Kimarie Howard', 'Enrollment Counseling Development and Performance Coordinator', 'Enrollment & Retention', 'Enrollment Counseling CSAT rate', 'Operational Outcomes', 'Quality', 'Data in report', '90-100%', '75-89%', '<75%', 'Tracking', '0.9239', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=d0f58bce-3a7d-49b6-80a3-eade14ab09fc&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=e3ff97a21eaacb03dbca&pbi_source=appShareLink&portalSessionId=04e4cd1a-8779-483e-a338-581068ced021', null, null, 'Higher is Better', '0.9', '0.75'),
  (144, 'Kimarie Howard', 'Enrollment Counseling Development and Performance Coordinator', 'Enrollment & Retention', 'Enrollment Counseling yield contribution', 'Operational Outcomes', 'Quality', 'No data', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (145, 'Megan Niblett', 'Enrollment Counseling Operations Coordinator', 'Enrollment & Retention', 'Enrollment Counseling required action completion rate', 'Operational Outcomes', 'Speed', 'Data available', '95-100%', '85-94%', '<85%', 'Tracking', '0.98', 'https://app.powerbi.com/Redirect?action=OpenReport&appId=d4fe7f49-1b93-41aa-9e7d-6ee6d5ec3eb0&reportObjectId=7177fab9-23b0-4184-8f31-f0db822282c0&ctid=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&reportPage=ReportSection964c860de430a5035bab&pbi_source=appShareLink&portalSessionId=04e4cd1a-8779-483e-a338-581068ced021', null, null, 'Higher is Better', '0.95', '0.85'),
  (146, 'Megan Niblett', 'Enrollment Counseling Operations Coordinator', 'Enrollment & Retention', 'Enrollment Counseling contact rate by alert', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (147, 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Transfer evaluation processing rate', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (148, 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Transfer evaluation case resolution rate', 'Operational Outcomes', 'Speed', 'Data available', '90-100%', '80-90%', '< 80%', 'Not Tracking', '0.7052023121387283', 'Link', null, null, 'Manual', null, null),
  (149, 'Shaunasee Janette James', 'Enrollment Coordinator', 'Enrollment & Retention', 'Reduction of transfer evaluation cases', 'Operational Outcomes', 'Quality', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (150, 'Ely Zmolek', 'Enrollment Services Specialist', 'Enrollment & Retention', 'Application processing rate', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (151, 'Ely Zmolek', 'Enrollment Services Specialist', 'Enrollment & Retention', 'Application manual review turnaround rate', 'Operational Outcomes', 'Speed', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (152, 'Ely Zmolek', 'Enrollment Services Specialist', 'Enrollment & Retention', 'Reduction of admissions support cases', 'Operational Outcomes', 'Quality', 'Data available', null, null, null, 'Not Tracking', null, null, null, null, 'Manual', null, null),
  (153, 'Ely Zmolek', 'Enrollment Services Specialist', 'Enrollment & Retention', 'Admissions case resolution rate', 'Operational Outcomes', 'Quality', 'Data available', '90-100%', '80-90%', '< 80%', 'Not Tracking', '0.8643533123028391', 'Link', null, null, 'Manual', null, null);

insert into public.allowed_editors (email, full_name, note) values
  ('jswinburne@churchofjesuschrist.org', null, 'Jess Swinburne — Project Manager'),
  ('gillesravelmambou@churchofjesuschrist.org', null, 'Elie Gilles Ravel Mambou — Assistant PM'),
  ('marielapezzali@churchofjesuschrist.org', null, 'Dean of Students'),
  ('davidkoomson@churchofjesuschrist.org', null, 'Digital Operations'),
  ('ccrankson@churchofjesuschrist.org', null, 'Enrollment & Retention'),
  ('mabioye@churchofjesuschrist.org', null, 'Student Records, Registration & Support'),
  ('oluwapelumi@churchofjesuschrist.org', null, 'Student Records, Registration & Support')
on conflict (email) do nothing;

alter table public.okrs enable trigger okrs_audit;
alter table public.employees enable trigger employees_audit;
alter table public.student_employees enable trigger student_employees_audit;
alter table public.org_chart_nodes enable trigger org_chart_nodes_audit;
alter table public.kpis enable trigger kpis_audit;

commit;
