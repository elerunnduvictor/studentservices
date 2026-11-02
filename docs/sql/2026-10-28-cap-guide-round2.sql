-- ═══════════════════════════════════════════════════════════════════════════
--  CAP GUIDE ROUND 2 (2026-10-28)
--
--  Replaces the CAP Walkthrough Guide content with Jess Swinburne's Round 2
--  text (docs/cap-forms-reference/CAP Guide Draft - Round 2.docx), for both
--  audiences, and makes the two tables able to hold its new structure.
--
--  What it does, in one transaction:
--    1. Copies both tables as they are now into cap_guide_sections_bak_20261028
--       and cap_guide_items_bak_20261028. RLS is on for both copies with no
--       policy, and every grant is revoked, so the API returns nothing from them.
--    2. Schema, the smallest change that fits the new content:
--         cap_guide_sections.date_label  text, nullable: the date chip on a
--                                         step ("Starting December 4, 2026").
--         cap_guide_items.title          text, nullable: the short heading of
--                                         a milestone, card, tile, callout or
--                                         numbered card, and the badge on a
--                                         paragraph ("2+ goals").
--         cap_guide_items_kind_check     widened to the kinds listed below.
--    3. Deletes the old rows and inserts the new ones. updated_by is
--       'claude-code-seed'; the *_audit triggers log every delete and insert
--       to change_log as usual (changed_by = 'system' from the SQL Editor).
--    4. Checks the counts and aborts the whole transaction if any are off.
--    5. After the commit, returns one row per section: the verification.
--
--  Item kinds (how cap-guide/js/cap-guide.js draws each one):
--    paragraph      text. link_label/link_url: an inline link where the label
--                   appears in the body, otherwise a button after the text.
--                   title, if set, is a small badge in front of the text.
--    list_item      bullet. indent 1 nests it under the item above.
--    numbered_item  numbered list. With a title it is drawn as a numbered card
--                   (the three goal types) instead.
--    check_item     a checklist line (meeting outcomes).
--    heading        a sub-heading inside a step.
--    callout        a highlighted box. title optional; a blank line in body
--                   starts a new paragraph inside the box.
--    card           consecutive cards sit side by side (the three assessments).
--    tile           consecutive tiles form a grid (the five Practices areas).
--    milestone      one point on the timeline: title = month, body = text.
--    download       a download button. link_label = the button text, body =
--                   a note under it, link_url = one of:
--                     cap-form:practices | cap-form:development  a PDF built
--                       in the browser; an unknown cap-form: id shows as
--                       plain text, never as a broken link;
--                     /cap-guide/assets/...pdf  a static file;
--                     null  a muted "Available soon" chip.
--  An item with indent 1 that follows a card or a numbered card belongs inside
--  that card. A body may also hold [label](url) inline links, for the one line
--  that has two links in it.
--
--  Left alone: the RLS policies on both tables (exactly as they are), the
--  audit triggers, hub_is_fte(), and every other table.
--
--  Two URLs are written out here rather than copied from the draft, which
--  holds Outlook click-tracking links for them. The current rows are no help
--  either: the leader rows have the clean addresses, the team_member rows the
--  tracking links. Both audiences get the clean ones:
--    Career and Performance (CAP) Support Site
--      https://churchofjesuschrist.sharepoint.com/sites/CareerandPerformance/
--    CAP Process Support
--      https://churchofjesuschrist.sharepoint.com/sites/CareerandPerformance/SitePages/Career-and-Performance-Tools-in-@work.aspx
--
--  Run order: on its own, before deploying the new cap-guide/ page (the new
--  page reads the two new columns, and the old page cannot draw the new kinds).
--  NOT re-runnable: a second run stops at step 1, because the backup tables
--  already exist, and changes nothing. To undo, run
--  2026-10-28-cap-guide-round2-rollback.sql.
--
--  Generated from one content file, checked word for word against the .docx.
--  17 sections, 140 items.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Backup ───────────────────────────────────────────────────────────────
create table public.cap_guide_sections_bak_20261028 as select * from public.cap_guide_sections;
create table public.cap_guide_items_bak_20261028    as select * from public.cap_guide_items;

alter table public.cap_guide_sections_bak_20261028 enable row level security;
alter table public.cap_guide_items_bak_20261028    enable row level security;
revoke all on public.cap_guide_sections_bak_20261028 from public, anon, authenticated;
revoke all on public.cap_guide_items_bak_20261028    from public, anon, authenticated;

comment on table public.cap_guide_sections_bak_20261028 is
  'Copy of cap_guide_sections before CAP Guide Round 2 (2026-10-28). Used by the rollback file. RLS on, no policies.';
comment on table public.cap_guide_items_bak_20261028 is
  'Copy of cap_guide_items before CAP Guide Round 2 (2026-10-28). Used by the rollback file. RLS on, no policies.';

-- ── 2. Schema ───────────────────────────────────────────────────────────────
alter table public.cap_guide_sections add column if not exists date_label text;
alter table public.cap_guide_items    add column if not exists title      text;

alter table public.cap_guide_items drop constraint if exists cap_guide_items_kind_check;
alter table public.cap_guide_items add constraint cap_guide_items_kind_check
  check (kind in ('paragraph', 'list_item', 'numbered_item', 'check_item', 'heading', 'callout', 'card', 'tile', 'milestone', 'download'));

comment on column public.cap_guide_sections.date_label is
  'Optional date chip shown on the section, e.g. "Starting December 4, 2026".';
comment on column public.cap_guide_items.title is
  'Optional short heading: milestone month, card/tile/callout title, numbered-card title, or a paragraph badge.';

-- ── 3. Content ──────────────────────────────────────────────────────────────
delete from public.cap_guide_items;
delete from public.cap_guide_sections;

insert into public.cap_guide_sections (audience, sort_order, section_key, title, intro, date_label, updated_by)
select v.audience, v.sort_order, v.section_key, v.title, v.intro, v.date_label, 'claude-code-seed'
from (values
    ('team_member', 0, 'timeline', 'Timeline', null, null),
    ('team_member', 10, 'purpose', 'Student Services CAP Walkthrough Guide – Team Members', 'The purpose of the Student Services CAP process is to support consistent evaluation, development planning, and performance conversations across the organization. For FTE team members, the CAP process is completed through @work, with quarterly reviews and annual assessment & evaluation.', null),
    ('team_member', 20, 'links', 'Links', null, null),
    ('team_member', 30, 'step0', 'Step 0: Check access', null, 'Starting October 29, 2026'),
    ('team_member', 40, 'step1', 'Step 1: Annual Assessments', null, 'Starting December 4, 2026'),
    ('team_member', 50, 'step2', 'Step 2: CAP Review 1 on 1 Meeting', null, 'Starting January 11, 2027'),
    ('team_member', 60, 'step3', 'Step 3: Add CAP Goals in @work', null, 'Starting January 4 – Ending January 29, 2027'),
    ('team_member', 70, 'step4', 'Step 4: Update goals & trigger the review processes on @work', null, null),
    ('team_member', 80, 'step5', 'Step 5: Review your performance', null, null),
    ('leader', 0, 'timeline', 'Timeline', null, null),
    ('leader', 10, 'purpose', 'Student Services CAP Walkthrough Guide – Supervisors', 'The purpose of the Student Services CAP process is to support consistent evaluation, development planning, and performance conversations across the organization. For FTE team members, the CAP process is completed through @work, with quarterly reviews and annual assessment & evaluation.', null),
    ('leader', 20, 'links', 'Links', null, null),
    ('leader', 30, 'step0', 'Step 0: Check access', null, 'Starting October 29, 2026'),
    ('leader', 40, 'step1', 'Step 1: Annual Assessments', null, 'Starting December 4, 2026'),
    ('leader', 50, 'step2', 'Step 2: CAP Review 1 on 1 Meeting', null, 'Starting January 11, 2027'),
    ('leader', 60, 'step3', 'Step 3: Consult the CAP Assessment documents as you complete the AIM process', null, null),
    ('leader', 70, 'step4', 'Step 4: Complete quarterly reviews and annual evaluations', null, null)
) as v(audience, sort_order, section_key, title, intro, date_label);

insert into public.cap_guide_items (section_id, sort_order, indent, kind, title, body, link_label, link_url, updated_by)
select s.id, v.sort_order, v.indent, v.kind, v.title, v.body, v.link_label, v.link_url, 'claude-code-seed'
from (values
    ('team_member', 'timeline', 10, 0, 'milestone', 'October (at Aspen Grove)', 'Check Access & CAP training', null, null),
    ('team_member', 'timeline', 20, 0, 'milestone', 'December', 'Employee and supervisor complete their assessments', null, null),
    ('team_member', 'timeline', 30, 0, 'milestone', 'Mid January', 'Employee and Supervisor 1:1 - finalize assessments & goals', null, null),
    ('team_member', 'timeline', 40, 0, 'milestone', 'Late January', 'Employee Completes CAP review documentation in @work based on 1:1 meeting', null, null),
    ('team_member', 'timeline', 50, 0, 'milestone', 'February', 'CAP review consulted when supervisors do AMI process', null, null),
    ('team_member', 'timeline', 60, 0, 'milestone', 'Late March', 'Q1 CAP review update', null, null),
    ('team_member', 'timeline', 70, 0, 'milestone', 'Late June', 'Q2 CAP review update', null, null),
    ('team_member', 'timeline', 80, 0, 'milestone', 'Late September', 'Q3 CAP review update', null, null),
    ('team_member', 'timeline', 90, 0, 'milestone', 'Early December', '2027 Annual evaluation, including the annual assessment process', null, null),
    ('team_member', 'links', 10, 0, 'paragraph', null, 'Career and Performance (CAP) Support Site', 'Career and Performance (CAP) Support Site', 'https://churchofjesuschrist.sharepoint.com/sites/CareerandPerformance/'),
    ('team_member', 'links', 20, 0, 'paragraph', null, 'CAP Process Support', 'CAP Process Support', 'https://churchofjesuschrist.sharepoint.com/sites/CareerandPerformance/SitePages/Career-and-Performance-Tools-in-@work.aspx'),
    ('team_member', 'step0', 10, 0, 'paragraph', null, 'Visit @work and attempt to login. Ensure that your credentials work and you can navigate @work successfully.', '@work', 'https://atwork.churchofjesuschrist.org/'),
    ('team_member', 'step0', 20, 0, 'paragraph', null, 'On the home page, click on "Me", then "Show More".', null, null),
    ('team_member', 'step0', 30, 0, 'paragraph', null, 'Visit "My Organization Chart".', null, null),
    ('team_member', 'step0', 40, 0, 'paragraph', null, 'Ensure that you are shown as reporting to the correct leader. Ensure that all of your direct reports appear below you.', null, null),
    ('team_member', 'step0', 50, 0, 'callout', null, 'Note: This only applies to FTE team members.', null, null),
    ('team_member', 'step0', 60, 0, 'paragraph', null, 'Use the org chart on the Bridge to cross reference if necessary.', 'org chart on the Bridge', '/org-chart/index.html'),
    ('team_member', 'step0', 70, 0, 'paragraph', null, 'If your assigned supervisor is incorrect, or any of your FTE reports are missing, please reach out to Jacob Walters in HR for assistance.', null, null),
    ('team_member', 'step1', 10, 0, 'paragraph', null, 'All quarterly reviews and annual evaluations in @work are based on the goals that are configured into your profile.', null, null),
    ('team_member', 'step1', 20, 0, 'paragraph', null, 'It is your responsibility to add your own goals to the @work platform. You will complete a series of assessments to review your performance for 2026, and develop the goals you will track for 2027, under the guidance of your supervisor.', null, null),
    ('team_member', 'step1', 30, 0, 'heading', null, 'Assessments', null, null),
    ('team_member', 'step1', 40, 0, 'card', 'Results', 'The Results assessment will be based on measurable outcomes and progress against agreed-upon priorities - operational performance & strategic contribution. This assessment is grounded in our Student Services KPIs & OKRs.', null, null),
    ('team_member', 'step1', 50, 1, 'download', null, 'Note: The Results Assessment will be available soon.', 'Download your Results Assessment here.', null),
    ('team_member', 'step1', 60, 0, 'card', 'Practices', 'The Practices assessment will be based on how work is accomplished - the leadership approach, interpersonal effectiveness, and professional conduct.', null, null),
    ('team_member', 'step1', 70, 1, 'paragraph', null, 'This section includes the Leadership Pattern and the internal Professional Practices assessment.', null, null),
    ('team_member', 'step1', 80, 1, 'download', null, 'This is the Church''s Leadership Pattern Self-Inventory. Your answers stay in the file on your device.', 'Download the Leadership Pattern assessment here.', '/cap-guide/assets/Leadership-Pattern-Self-Inventory.pdf'),
    ('team_member', 'step1', 90, 1, 'paragraph', null, 'Your supervisor will begin your Professional Practices assessment and share it with you following your CAP Review 1 on 1 meeting in January.', null, null),
    ('team_member', 'step1', 100, 0, 'card', 'Development', 'The Development assessment will be based on professional learning and growth objectives that build capability, broaden contributions, and prepare individuals for future opportunities and responsibilities.', null, null),
    ('team_member', 'step1', 110, 1, 'paragraph', null, 'This section includes the internal Professional Development assessment.', null, null),
    ('team_member', 'step1', 120, 1, 'download', null, null, 'Download the Professional Development assessment here.', 'cap-form:development'),
    ('team_member', 'step1', 130, 0, 'paragraph', null, 'The Professional Practices assessment is based on the following areas. Review these areas and think deeply about how you engage with these practices in your work. Be prepared to have an open discussion on your performance in these areas when you meet with your supervisor.', null, null),
    ('team_member', 'step1', 140, 0, 'tile', '1. Engagement', 'Demonstrates consistent engagement through timely responses, reliable calendar management, and clear availability. Stays attentive to requests, follows through promptly, and uses agreed upon channels to remain informed and accessible.', null, null),
    ('team_member', 'step1', 150, 0, 'tile', '2. Ownership', 'Takes responsibility for outcomes by showing initiative, anticipating needs, and driving work forward without requiring constant direction. Identifies problems early and brings forward thoughtful, viable solutions rather than merely escalating issues.', null, null),
    ('team_member', 'step1', 160, 0, 'tile', '3. Proficiency', 'Maintains and effectively applies the knowledge, skills, tools, and systems required for the role. Demonstrates competence within their area of responsibility and pursues continual improvement as expectations evolve.', null, null),
    ('team_member', 'step1', 170, 0, 'tile', '4. Adaptability', 'Responds constructively to change by adjusting priorities, processes, or approaches as needed. Manages transitions effectively, remains flexible in the face of uncertainty, and supports others through change.', null, null),
    ('team_member', 'step1', 180, 0, 'tile', '5. Collaboration', 'Communicates clearly and appropriately, keeps relevant stakeholders informed, and works productively with others to achieve shared outcomes. Contributes positively to team dynamics and cross functional efforts.', null, null),
    ('team_member', 'step1', 190, 0, 'callout', null, 'Download and begin working on your Assessments, starting on December 4th. Complete the assess and reflect sections of each document in preparation for your CAP Review meeting with your supervisor, which will happen in Mid-January.', null, null),
    ('team_member', 'step1', 200, 0, 'callout', 'Document Handling', 'Once you have downloaded your assessment documents, please open a private folder in your work account One Drive, and name it ''[Your Name] CAP Review''. Share this folder with your supervisor.

As you are working on your assessments, please ensure the PDFs always save to this folder. Do not share your private assessment documents with anyone other than your supervisor.

If someone asks you to share a new copy of the assessment documents, please direct them back to the Bridge to download the assessments from this CAP Guide.', null, null),
    ('team_member', 'step2', 10, 0, 'paragraph', null, 'The purpose of this meeting is to have a constructive performance and development conversation.', null, null),
    ('team_member', 'step2', 20, 0, 'paragraph', null, 'The recommended meeting time is 60 minutes.', null, null),
    ('team_member', 'step2', 30, 0, 'paragraph', null, 'The intended outcomes of the meeting are:', null, null),
    ('team_member', 'step2', 40, 0, 'check_item', null, 'Full review of all four assessment documents', null, null),
    ('team_member', 'step2', 50, 0, 'check_item', null, 'A shared understanding of employee performance throughout 2026', null, null),
    ('team_member', 'step2', 60, 0, 'check_item', null, 'Agreed-upon priorities for employee performance in 2027, guided by the supervisor', null, null),
    ('team_member', 'step2', 70, 0, 'check_item', null, 'A draft of the employee''s goals', null, null),
    ('team_member', 'step2', 80, 0, 'check_item', null, 'A timeline of when the employee''s goals will be finalized', null, null),
    ('team_member', 'step2', 90, 0, 'check_item', null, 'A due date for when the employee''s goals will be added to @work – January 31st, 2027', null, null),
    ('team_member', 'step2', 100, 0, 'heading', null, 'Agenda:', null, null),
    ('team_member', 'step2', 110, 0, 'numbered_item', null, 'Greetings & prayer', null, null),
    ('team_member', 'step2', 120, 0, 'numbered_item', null, 'Employee reflection – summarize accomplishments, challenges, assessment insights, and areas of opportunities they have identified', null, null),
    ('team_member', 'step2', 130, 0, 'numbered_item', null, 'Supervisor feedback and discussion on each area:', null, null),
    ('team_member', 'step2', 140, 1, 'list_item', null, 'Results review', null, null),
    ('team_member', 'step2', 150, 1, 'list_item', null, 'Professional practices and Leadership Pattern review', null, null),
    ('team_member', 'step2', 160, 1, 'list_item', null, 'Professional development review', null, null),
    ('team_member', 'step2', 170, 0, 'numbered_item', null, 'Draft CAP goals', null, null),
    ('team_member', 'step2', 180, 0, 'numbered_item', null, 'Confirm action items', null, null),
    ('team_member', 'step2', 190, 0, 'numbered_item', null, 'Close meeting', null, null),
    ('team_member', 'step3', 10, 0, 'heading', null, 'Goals to be added:', null, null),
    ('team_member', 'step3', 20, 0, 'numbered_item', 'Results goals', 'Focuses on measurable outcomes and progress against agreed-upon priorities. It assesses both operational performance and strategic contribution, pulling from the KPI and OKR frameworks.', null, null),
    ('team_member', 'step3', 30, 1, 'paragraph', '2+ goals', 'Your Results assessment will result in 2+ goals, approved by your supervisor.', null, null),
    ('team_member', 'step3', 40, 1, 'paragraph', null, 'Add these as Performance Goals in @work:', 'Step-by-step process for adding Performance Goals in @work', 'https://scribehow.com/o/imrDakiPT1KjepnC7BytoQ/viewer/Talent__Employee__How_To_Set_Performance_Goals_In_work__j0o0V9QiQ5qvoA2viBXufA'),
    ('team_member', 'step3', 50, 0, 'numbered_item', 'Practice goals', 'Evaluates how work is accomplished. It emphasizes leadership approach, interpersonal effectiveness, and adherence to professional expectations that strengthen the Student Services culture.', null, null),
    ('team_member', 'step3', 60, 1, 'paragraph', '2+ goals', 'Your Leadership Pattern and Profession Practices assessments will result in 2+ goals, approved by your supervisor.', null, null),
    ('team_member', 'step3', 70, 1, 'paragraph', null, 'Add these as Development Goals in @work:', 'Step-by-step process for setting Development Goals in @work', 'https://scribehow.com/o/imrDakiPT1KjepnC7BytoQ/viewer/Talent__Employee__How_to_Set_Development_Goals_in_work__JpKlpDX7QcW30THwEBGO7Q'),
    ('team_member', 'step3', 80, 0, 'numbered_item', 'Development goals', 'Learning and growth objectives that build capability, broaden contributions, and prepare individuals for future opportunities and responsibilities.', null, null),
    ('team_member', 'step3', 90, 1, 'paragraph', '2+ goals', 'Your Development assessment will result in 2+ goals, approved by your supervisor.', null, null),
    ('team_member', 'step3', 100, 1, 'paragraph', null, 'Add these as Development Goals in @work:', 'Step-by-step process for setting Development Goals in @work', 'https://scribehow.com/o/imrDakiPT1KjepnC7BytoQ/viewer/Talent__Employee__How_to_Set_Development_Goals_in_work__JpKlpDX7QcW30THwEBGO7Q'),
    ('team_member', 'step4', 10, 0, 'heading', null, 'Gather data and complete updates', null, null),
    ('team_member', 'step4', 20, 0, 'paragraph', null, 'In Q1, Q2, and Q3, you will complete a Quarterly Review. In Q4, you will complete an Annual Evaluation.', null, null),
    ('team_member', 'step4', 30, 0, 'paragraph', null, 'As part of each of these assessments, you will update your goals.', null, null),
    ('team_member', 'step4', 40, 0, 'list_item', null, 'Meet your supervisor for a 1 on 1 to review your progress.', null, null),
    ('team_member', 'step4', 50, 0, 'list_item', null, 'Consult the [KPI Scorecard on the Bridge](/scorecard/index.html) and the [OKR Report on the Bridge](/okr-progress/index.html) as you update your Results Goals.', null, null),
    ('team_member', 'step4', 60, 1, 'list_item', null, 'Note: Please reach out to your Project Manager if you have any questions about the current KPI or KR data on the Bridge.', null, null),
    ('team_member', 'step4', 70, 0, 'list_item', null, 'Review and discuss your Practices and Development goals.', null, null),
    ('team_member', 'step4', 80, 0, 'list_item', null, 'Update each goal based on actions completed and feedback from your supervisor.', null, null),
    ('team_member', 'step4', 90, 0, 'list_item', null, 'Updating your goals triggers the quarterly review or annual evaluation process for your supervisor.', null, null),
    ('team_member', 'step4', 100, 0, 'paragraph', null, 'For Q1, Q2, and Q3:', 'Step-by-step process for completing Quarterly Reviews on @work', 'https://scribehow.com/o/imrDakiPT1KjepnC7BytoQ/viewer/Talent__Employee__Complete_Quarterly_Review__F3hbKl8URZi7UtgP0vXBfw'),
    ('team_member', 'step4', 110, 0, 'paragraph', null, 'For Q4:', 'Step-by-step process for completing the Annual Evaluation on @work', 'https://scribehow.com/o/imrDakiPT1KjepnC7BytoQ/viewer/Talent__Employee__Complete_Annual_Review__LFJBHdMWQpODozPPifkGgA'),
    ('team_member', 'step4', 120, 0, 'paragraph', null, 'Submit your Quarterly Review or Annual Evaluation and inform your supervisor that it is ready for them to complete their steps.', null, null),
    ('team_member', 'step5', 10, 0, 'paragraph', null, 'Once your supervisor has reviewed the goals, progress, and comments you have submitted for your Quarterly Reviews or Annual Evaluation, they will complete the review documents.', null, null),
    ('team_member', 'step5', 20, 0, 'paragraph', null, 'Visit @work and review your feedback and comments. Meet your supervisor in a 1 on 1 to understand their feedback more clearly if necessary.', null, null),
    ('leader', 'timeline', 10, 0, 'milestone', 'October (at Aspen Grove)', 'Check Access & CAP training', null, null),
    ('leader', 'timeline', 20, 0, 'milestone', 'December', 'Employee and supervisor complete their assessments', null, null),
    ('leader', 'timeline', 30, 0, 'milestone', 'Mid January', 'Employee and Supervisor 1:1 - finalize assessments & goals', null, null),
    ('leader', 'timeline', 40, 0, 'milestone', 'Late January', 'Employee Completes CAP review documentation in @work based on 1:1 meeting', null, null),
    ('leader', 'timeline', 50, 0, 'milestone', 'February', 'CAP review consulted when supervisors do AMI process', null, null),
    ('leader', 'timeline', 60, 0, 'milestone', 'Late March', 'Q1 CAP review update', null, null),
    ('leader', 'timeline', 70, 0, 'milestone', 'Late June', 'Q2 CAP review update', null, null),
    ('leader', 'timeline', 80, 0, 'milestone', 'Late September', 'Q3 CAP review update', null, null),
    ('leader', 'timeline', 90, 0, 'milestone', 'Early December', '2027 Annual evaluation, including the annual assessment process', null, null),
    ('leader', 'links', 10, 0, 'paragraph', null, 'Career and Performance (CAP) Support Site', 'Career and Performance (CAP) Support Site', 'https://churchofjesuschrist.sharepoint.com/sites/CareerandPerformance/'),
    ('leader', 'links', 20, 0, 'paragraph', null, 'CAP Process Support', 'CAP Process Support', 'https://churchofjesuschrist.sharepoint.com/sites/CareerandPerformance/SitePages/Career-and-Performance-Tools-in-@work.aspx'),
    ('leader', 'step0', 10, 0, 'paragraph', null, 'Visit @work and attempt to login. Ensure that your credentials work and you can navigate @work successfully.', '@work', 'https://atwork.churchofjesuschrist.org/'),
    ('leader', 'step0', 20, 0, 'paragraph', null, 'On the home page, click on "Me", then "Show More".', null, null),
    ('leader', 'step0', 30, 0, 'paragraph', null, 'Visit "My Organization Chart".', null, null),
    ('leader', 'step0', 40, 0, 'paragraph', null, 'Ensure that you are shown as reporting to the correct leader. Ensure that all of your direct reports appear below you.', null, null),
    ('leader', 'step0', 50, 0, 'callout', null, 'Note: This only applies to FTE team members.', null, null),
    ('leader', 'step0', 60, 0, 'paragraph', null, 'Use the org chart on the Bridge to cross reference if necessary.', 'org chart on the Bridge', '/org-chart/index.html'),
    ('leader', 'step0', 70, 0, 'paragraph', null, 'If your assigned supervisor is incorrect, or any of your FTE reports are missing, please reach out to Jacob Walters in HR for assistance.', null, null),
    ('leader', 'step1', 10, 0, 'paragraph', null, 'All quarterly reviews and annual evaluations in @work are based on the goals that are configured into your team members'' profiles.', null, null),
    ('leader', 'step1', 20, 0, 'paragraph', null, 'Each team member will add their own goals to @work, after collaborating with you to complete a series of assessments. The assessments are designed to help team members review their performance for 2026 and set goals for 2027, under your guidance.', null, null),
    ('leader', 'step1', 30, 0, 'heading', null, 'Assessments', null, null),
    ('leader', 'step1', 40, 0, 'card', 'Results', 'The Results assessment will be based on measurable outcomes and progress against agreed-upon priorities - operational performance & strategic contribution. This assessment is grounded in our Student Services KPIs & OKRs.', null, null),
    ('leader', 'step1', 50, 1, 'paragraph', null, 'You will collaborate on your team members'' Results assessments.', null, null),
    ('leader', 'step1', 60, 0, 'card', 'Practices', 'The Practices assessment will be based on how work is accomplished - the leadership approach, interpersonal effectiveness, and professional conduct.', null, null),
    ('leader', 'step1', 70, 1, 'paragraph', null, 'This section includes the Leadership Pattern and the internal Professional Practices assessment.', null, null),
    ('leader', 'step1', 80, 1, 'paragraph', null, 'You will collaborate on your team members'' Leadership Pattern assessments.', null, null),
    ('leader', 'step1', 90, 1, 'download', null, null, 'Download a Professional Practices assessment for each team member here.', 'cap-form:practices'),
    ('leader', 'step1', 100, 0, 'card', 'Development', 'The Development assessment will be based on professional learning and growth objectives that build capability, broaden contributions, and prepare individuals for future opportunities and responsibilities.', null, null),
    ('leader', 'step1', 110, 1, 'paragraph', null, 'This section includes the internal Professional Development assessment.', null, null),
    ('leader', 'step1', 120, 1, 'paragraph', null, 'You will collaborate on your team members'' Professional Development assessments.', null, null),
    ('leader', 'step1', 130, 0, 'callout', null, 'Download and begin working on your team members'' Professional Practices Assessments, starting on December 4th. Complete the assess sections of each document in preparation for your CAP Review meetings, which will happen in Mid-January.', null, null),
    ('leader', 'step1', 140, 0, 'callout', 'Document Handling', 'Your team members will each create a private folder in their work account One Drive where they store their CAP Review documents.

Before your 1 on 1 meetings, create a private One Drive folder where you store the Practice Assessments for each team member. Clearly label each document with the appropriate employee''s name. After the 1 on 1 meetings have happened, you can transfer the Practice Assessment documents into the folder each team member has created with their other documents.', null, null),
    ('leader', 'step2', 10, 0, 'paragraph', null, 'The purpose of these meetings is to have constructive performance and development conversations with each of your direct reports.', null, null),
    ('leader', 'step2', 20, 0, 'paragraph', null, 'The recommended meeting time is 60 minutes. Please schedule time with each team member, with the goal to have all your meetings between January 11 and January 22.', null, null),
    ('leader', 'step2', 30, 0, 'paragraph', null, 'The intended outcomes of the meeting are:', null, null),
    ('leader', 'step2', 40, 0, 'check_item', null, 'Full review of all four assessment documents', null, null),
    ('leader', 'step2', 50, 0, 'check_item', null, 'A shared understanding of employee performance throughout 2026', null, null),
    ('leader', 'step2', 60, 0, 'check_item', null, 'Agreed-upon priorities for employee performance in 2027, guided by the supervisor', null, null),
    ('leader', 'step2', 70, 0, 'check_item', null, 'A draft of the employee''s goals', null, null),
    ('leader', 'step2', 80, 0, 'check_item', null, 'A timeline of when the employee''s goals will be finalized', null, null),
    ('leader', 'step2', 90, 0, 'check_item', null, 'A due date for when the employee''s goals will be added to @work – January 31st, 2027', null, null),
    ('leader', 'step2', 100, 0, 'heading', null, 'Agenda:', null, null),
    ('leader', 'step2', 110, 0, 'numbered_item', null, 'Greetings & prayer', null, null),
    ('leader', 'step2', 120, 0, 'numbered_item', null, 'Employee reflection – summarize accomplishments, challenges, assessment insights, and areas of opportunities they have identified', null, null),
    ('leader', 'step2', 130, 0, 'numbered_item', null, 'Supervisor feedback and discussion on each area:', null, null),
    ('leader', 'step2', 140, 1, 'list_item', null, 'Results review', null, null),
    ('leader', 'step2', 150, 1, 'list_item', null, 'Professional practices and Leadership Pattern review', null, null),
    ('leader', 'step2', 160, 1, 'list_item', null, 'Professional development review', null, null),
    ('leader', 'step2', 170, 0, 'numbered_item', null, 'Draft CAP goals', null, null),
    ('leader', 'step2', 180, 0, 'numbered_item', null, 'Confirm action items', null, null),
    ('leader', 'step2', 190, 0, 'numbered_item', null, 'Close meeting', null, null),
    ('leader', 'step3', 10, 0, 'paragraph', null, 'In February, the AIM process will proceed as normal. Please use the information from the CAP Assessments to help you make evidence-based decisions during this procedure.', null, null),
    ('leader', 'step3', 20, 0, 'paragraph', null, 'Consult with Ben or Jacob Walters for further information on this step.', null, null),
    ('leader', 'step4', 10, 0, 'paragraph', null, 'Once your team members have updated their goals and submitted their review documents, you will be able to complete the reviews and evaluations as appropriate.', null, null),
    ('leader', 'step4', 20, 0, 'paragraph', null, 'For Q1, Q2, and Q3:', 'Step-by-step process for completing Quarterly Reviews on @work', 'https://scribehow.com/o/imrDakiPT1KjepnC7BytoQ/viewer/Talent__Manager__Complete_a_Quarterly_performance_review_as_a_manager__LUqZqWcbQ0-mozs-pcK3Cw'),
    ('leader', 'step4', 30, 0, 'paragraph', null, 'For Q4:', 'Step-by-step process for completing the Annual Evaluation on @work', 'https://scribehow.com/o/imrDakiPT1KjepnC7BytoQ/viewer/Talent__Manager__Complete_the_annual_performance_review_in_work_for_your_employees___uXVlsu1RvGc2EF4NPsRhw'),
    ('leader', 'step4', 40, 0, 'paragraph', null, 'Review each assessment, fill in the necessary sections, and provide honest feedback in your comments.', null, null),
    ('leader', 'step4', 50, 0, 'paragraph', null, 'Submit the final review or evaluation documents and inform your team members that they have feedback to review.', null, null),
    ('leader', 'step4', 60, 0, 'paragraph', null, 'Prepare to meet them for 1 on 1 meetings to discuss their performance.', null, null)
) as v(audience, section_key, sort_order, indent, kind, title, body, link_label, link_url)
join public.cap_guide_sections s on s.audience = v.audience and s.section_key = v.section_key;

-- ── 4. Check ────────────────────────────────────────────────────────────────
do $$
declare
  bad text;
begin
  select string_agg(e.audience || '/' || e.section_key || ' expected ' || e.n || ' got ' || coalesce(a.n, 0), '; ')
    into bad
  from (values
      ('team_member', 'timeline', 9),
      ('team_member', 'purpose', 0),
      ('team_member', 'links', 2),
      ('team_member', 'step0', 7),
      ('team_member', 'step1', 20),
      ('team_member', 'step2', 19),
      ('team_member', 'step3', 10),
      ('team_member', 'step4', 12),
      ('team_member', 'step5', 2),
      ('leader', 'timeline', 9),
      ('leader', 'purpose', 0),
      ('leader', 'links', 2),
      ('leader', 'step0', 7),
      ('leader', 'step1', 14),
      ('leader', 'step2', 19),
      ('leader', 'step3', 2),
      ('leader', 'step4', 6)
  ) as e(audience, section_key, n)
  left join (
    select s.audience, s.section_key, count(i.id)::int as n
    from public.cap_guide_sections s
    left join public.cap_guide_items i on i.section_id = s.id
    group by s.audience, s.section_key
  ) a on a.audience = e.audience and a.section_key = e.section_key
  where coalesce(a.n, -1) <> e.n;

  if bad is not null then
    raise exception 'CAP guide counts are off, rolling back: %', bad;
  end if;
  if (select count(*) from public.cap_guide_sections) <> 17
     or (select count(*) from public.cap_guide_items) <> 140 then
    raise exception 'CAP guide totals are off, rolling back.';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;

-- ── 5. Verification (read-only, after the commit) ──────────────────────────
select s.audience, s.sort_order, s.section_key, s.title, s.date_label,
       count(i.id) as items,
       string_agg(distinct i.kind, ', ') as kinds
from public.cap_guide_sections s
left join public.cap_guide_items i on i.section_id = s.id
group by s.id
order by s.audience desc, s.sort_order;
