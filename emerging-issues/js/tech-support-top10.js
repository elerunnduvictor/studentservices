/* ════════ TOP 10 TECH SUPPORT ISSUES ════════

   The highest-priority open issue for each of the ten products Technical
   Support tracks, taken from the "TS Product Tracker" workbook.

   ── Why these ten ──

   The tracker has one sheet per product and each sheet has its own priority
   column that starts again at 1, so there is no single ranked list of ten
   anywhere in it. These are the priority-1 rows: ten issues, one per product,
   which is the reading that covers the whole estate rather than whichever
   product happens to have the most bugs open at the moment. The order is the
   workbook's own sheet order.

   ── Refreshing it ──

   Send a fresh copy of the tracker and this file is regenerated from it.

   Deliberately a plain list rather than a database table: the source of truth
   is the workbook the TS team already keeps, and a second copy in Postgres
   would be a second thing to update and the one that quietly went stale.

   Captured 4 September 2026. Nothing here names a student — product, bug number,
   symptom, scope and ETA only — but it is internal operational detail, and it
   sits behind the gate in middleware.js once HUB_GATE is switched on.
   ════════════════════════════════════════════════════════ */

window.TECH_SUPPORT_TOP10 = {
  captured: "2026-09-04",
  // Spelled out as well as dated. "2026-09-04" parsed as a Date is UTC
  // midnight, which prints as the 3rd anywhere west of Greenwich — the
  // page would have claimed the list was a day older than it is.
  capturedLabel: "4 September 2026",
  source: "TS Product Tracker",
  issues: [
    {"product": "Admissions EE", "issue": "Applications are being submitted without completing app process", "bug": "935748", "summary": "Applications are being submitted, but not completing the full application process or receiving a decision.", "scope": "27", "impact": "Student applications get stuck and have to be manually fixed to move forward.", "eta": "20 Aug 2026", "status": "Closed on 8/25. Update was added to application to ensure process complete before an application is marked as Submitted."},
    {"product": "Finance", "issue": "Cybersource Integration Change Request-Secure Acceptance to Unified Check Out", "bug": "ADO 90976", "summary": "Moving to a new platform called Unified Check Out. Secure Acceptance will be retired by September.", "scope": "All BYU-Pathway students", "impact": "No payments will be able to be made if this is not updated before September."},
    {"product": "Canvas", "issue": "Canvas User Not Created", "bug": "921758", "summary": "A new student registered for courses but a user was never created in Canvas.", "scope": "To be determined", "impact": "Students cannot access their registered courses in Canvas. Students need to be manually imported in order to be created properly", "eta": "To be determined", "status": "09/01/2026 - Jeff VanDrimmelen closed the case, this where his notes: \"Single student. Fix manually. Please re-open if there are multiple students you are seeing this with and can reproduce. \""},
    {"product": "Student Portal", "issue": "Student Portal Access Requests", "summary": "Original form is still active if the student does not exist in Anthology at all such as a PATH 1.0 student.", "scope": "PATH 1.0 students not in Anthology", "impact": "PATH 1.0 students need to have TS provision them and then the Registrar teams rebuild their records. We see roughly 10-20 tickets a week.", "eta": "Next two weeks", "status": "1/6/26 the data migration is starting to bring PATH 1.0 students information into Anthology. This will take approximately 2 weeks to complete."},
    {"product": "Portal Okta", "issue": "Last Day To Withdraw Date Incorrect", "bug": "937013", "summary": "The Last Day To Withdraw date on the Withdraw page in the Class Schedule is incorrect.", "scope": "Unknown", "impact": "Students are led to believe that they can withdraw a course on a date that is beyond what the actual limit is.", "status": "This issue was originally reported by Academic Exceptions. The student was under the impression that they could withdraw a day later than they actually could, which caused a case to be submitted to the Academic Exceptions team."},
    {"product": "Companion", "issue": "Courses registered are not appearing in Terms with Courses (1.0.8)", "bug": "BUG 944099", "summary": "Newly registered courses do not appear in the list of registered courses.", "impact": "Leads students to believe registration failed and they attempt to register for the same courses multiple times."},
    {"product": "EC3", "issue": "Error 1003 on Learn More > \"I Can\" statements", "bug": "907039", "summary": "The \"I Can\" statements have broken links.", "scope": "All EC3 students", "impact": "Student does not have access to extra learning resources when attempting to do additional learning after completing a skill.", "eta": "In current sprint, set to be done on June, 29", "status": "Ready"},
    {"product": "Planning-Registration", "issue": "Students unable to register for PC retakes", "bug": "939551", "summary": "Students are unable to retake PC courses.", "scope": "~6,200", "impact": "Students: Can't see the PC course they failed to register and retake the course and that prevents them from moving forward in PathwayConnect.", "eta": "Ellucian: We have requested but not yet received an ETA.", "status": "Update 9/3: From Ellucian-(9/3) - PS (Keren) updated config in TEST on 9/2 to match the scenario observed in PROD. Support continues to review/analyze the reported concern. I will request for the case owner to share an update by EOD if possible, by EOD tomorrow at the latest. Update 8/25: According to Ellucian, Dustin did more analysis and found that when the course that needs the Re-take is only Associated to the PV, then the re-take does not appear for the student to see. Ellucian sending to their Support Team to get them to look into the issue. Said this is fully with them at the moment. Update 8/21: Ellucian determined that the re-take configurations were not the root cause and have involved their Support team. Also there is a meeting to be scheduled next week when Barry returns to dig into this further. Script that Ellucian has will be ran twice a day until the root cause is found to clean up the data and allow students to continue registering for courses with open sections. Update 8/17: Ellucian found re-take configurations that were turned off. Keren and Jeff Ross are working to see the Portal Configurations and see if something needs to be turned on. Update 8/14: ADOs created for ICS and Ellucian. Working to perfect the scope as some on the list were identified as okay."},
    {"product": "CRM Workspace", "issue": "SMS/WhatsApp Read Receipts", "bug": "831019", "summary": "Adding Read receipts for SMS and WhatsApp messages so that agents can see if messages are being read by students.", "scope": "All Students", "impact": "Agents are unable to discern if students have read or received their WhatsApp messages sent from a case.", "status": "Update 9/1: Chad will get a live chat demo from the engineers tomorrow and will be distributed to TS soon after. Update 8/25: Waiting on Live Chat."},
    {"product": "Gatherings", "issue": "Active Gathering Enrollments showing incorrectly for students no longer in the course", "bug": "849916", "summary": "Area Management Tool contains Active Gathering Enrollments for students and there are some students that have Active Gathering Enrollments for past terms that the Gatherings aren't even Active anymore.", "scope": "500", "impact": "Missionaries may still see the students enrolled in these Gatherings when checking their My Gatherings. Students in a different Gathering or course now, may not see the Service Missionaries and Gathering may not show in the Gatherings page of the Student Portal.", "status": "Bug recently updated by TS indicating there are still multiple Active Gathering Enrollments that should not be Active still."}
  ],
};
