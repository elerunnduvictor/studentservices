// ═══════════════════════════════════════════════════════════
// DATA — Departments, Levels, and Employee Dataset
// ═══════════════════════════════════════════════════════════

window.OC = window.OC || {};

OC.DEPARTMENTS = {
  executive:  { name: 'Executive', color: '#FFC328', colorR: '255,195,40' },
  records:    { name: 'Records, Registration & Support', color: '#3A929D', colorR: '58,146,157' },
  enrollment: { name: 'Enrollment & Retention', color: '#B687AC', colorR: '182,135,172' },
  dean:       { name: 'Dean of Students', color: '#A2C23D', colorR: '162,194,61' },
  digital:    { name: 'Digital Operations', color: '#CB4A27', colorR: '203,74,39' }
};

OC.LEVELS = {
  1: 'Executive',
  2: 'Director',
  3: 'Department Leadership',
  4: 'Management',
  5: 'Professional Staff'
};

OC.employees = [
  // ── LEVEL 1: VP ──
  { id: 'vp', name: 'Vice President', title: 'Vice President of Student Services', dept: 'executive', level: 1, reportsTo: null,
    responsibilities: ['Executive oversight of all Student Services operations', 'Strategic direction for student support, enrollment, records, and digital operations', 'Budget and resource allocation across departments'],
    kpis: ['Overall student satisfaction scores', 'Student retention and completion rates', 'Operational efficiency across departments'], email: '', photoUrl: '' },

  // ── LEVEL 2: DIRECTORS ──
  { id: 'mark-gefrom', name: 'Mark Gefrom', title: 'Director of Student Records, Registration & Support', dept: 'records', level: 2, reportsTo: 'vp',
    responsibilities: ['Ensuring the path for students to get help is clear and easy by promoting the use of the Help Center', 'Overseeing student records, registration processes, and support operations', 'Managing support, registrar, and training teams'],
    kpis: ['Student support ticket resolution rates', 'Help Center usage and effectiveness', 'Overall department satisfaction scores'], email: '', photoUrl: '' },
  { id: 'alison-cundiff', name: 'Alison Cundiff', title: 'Director of Enrollment & Retention', dept: 'enrollment', level: 2, reportsTo: 'vp',
    responsibilities: ['Oversee the Enrollment Counselling and Mentoring teams', 'Manage 1:1s, team meetings, and long-term planning', 'Drive enrollment funnel performance and retention strategies'],
    kpis: ['Enrollment & Retention budget management', 'Application, retention, and completion rates', 'Overall student autonomy and satisfaction (secondary)'], email: '', photoUrl: '' },
  { id: 'steven-thomas', name: 'Steven K. Thomas', title: 'Dean of Students', dept: 'dean', level: 2, reportsTo: 'vp',
    responsibilities: ['Executive oversight of Dean of Students office', 'Title IX Coordinator, ADA/Section 504 Coordinator', 'Student crisis portfolio development'],
    kpis: ['No material audit, legal, or accreditation findings attributable to DOS', 'Annual DOS budget management', 'Overall student satisfaction (primary)'], email: '', photoUrl: '' },
  { id: 'jacob-adams', name: 'Jacob Adams', title: 'Director of Digital Operations', dept: 'digital', level: 2, reportsTo: 'vp',
    responsibilities: ['Strategic discernment of analytics engine and Companion/Mentor portal features', 'Oversee digital tools, development, and AI/ML initiatives', 'Partnership with IT and ICS stakeholders'],
    kpis: ['Stakeholder CSAT with timeliness per project', 'Stakeholder CSAT with communication and roadmap', 'Overall student autonomy and satisfaction (secondary)'], email: '', photoUrl: '' },

  // ── RECORDS, REGISTRATION & SUPPORT ──
  // Level 3
  { id: 'brad-lester', name: 'Brad Lester', title: 'Senior Manager of Student Support', dept: 'records', level: 3, reportsTo: 'mark-gefrom',
    responsibilities: ['Run weekly team meetings and stand-ups to align priorities', 'Conduct 1:1 check-ins with direct reports', 'Monitor workload and escalate issues'],
    kpis: ['Ticket response and resolution times', 'QA, CSAT, and FCR scores', 'Student support budget management'], email: '', photoUrl: '' },
  { id: 'kari-johnson', name: 'Kari Johnson', title: 'Registrar', dept: 'records', level: 3, reportsTo: 'mark-gefrom',
    responsibilities: ['Maintain student academic records and ensure compliance with institutional policies', 'Oversee registration, graduation, and transcript processes', 'Manage block/term system and catalog data'],
    kpis: ['Resolution time on Registrar processes and tickets', 'C-Sat on Registrar processes and tickets', 'Registrar budget management'], email: '', photoUrl: '' },
  // Level 4
  { id: 'matthew-smith', name: 'Matthew Smith', title: 'Technical Support Manager', dept: 'records', level: 4, reportsTo: 'brad-lester',
    responsibilities: ['Managing and developing the technical support team staff', 'Updating key stakeholders on bug/issues', 'Coordinating and prioritizing bug/issues based on impact'],
    kpis: ['Tech support ticket resolution time', 'Tech support QA, CSAT, and FCR scores', 'Tech support costs'], email: '', photoUrl: '' },
  { id: 'hilary-bagley', name: 'Hilary Bagley', title: 'Training & QA Manager', dept: 'records', level: 4, reportsTo: 'brad-lester',
    responsibilities: ['Coordinate training with other Pathway departments and partners', 'Coordinate with media and creative production teams', 'Oversee knowledge base development and QA processes'],
    kpis: ['Request-to-KB Publish Time (median days)', 'QA Calibration Consistency Rate', 'KB Audit accuracy scores'], email: '', photoUrl: '' },
  { id: 'kim-overdiek', name: 'Kim Overdiek', title: 'Associate Registrar', dept: 'records', level: 4, reportsTo: 'kari-johnson',
    responsibilities: ['Work on ADO resolution', 'Review Coursedog proposals for Academic Catalog updates', 'Make configuration updates in Anthology Student for planning and registration'],
    kpis: ['Ticket resolution time', 'On-time catalog publishing and system configuration', 'Planning and Registration team costs'], email: '', photoUrl: '' },
  { id: 'tyson-bell', name: 'Tyson Bell', title: 'Associate Registrar', dept: 'records', level: 4, reportsTo: 'kari-johnson',
    responsibilities: ['Oversee student records and transcript processes', 'Manage graduation and enrollment verification', 'Ensure records integrity and compliance'],
    kpis: ['Student records accuracy rate', 'Transcript processing time', 'Graduation verification accuracy'], email: '', photoUrl: '' },
  // Level 5
  { id: 'colby-warner', name: 'Colby Warner', title: 'Product Support Engineer', dept: 'records', level: 5, reportsTo: 'matthew-smith',
    responsibilities: ['Resolve student cases and coordinate P1 issues', 'Write DevOps bugs for ICS as necessary', 'Write Knowledge Base articles and product documentation'],
    kpis: ['Individual ticket resolution time', 'Ticket response time', 'Tech Support QA, CSAT, and FCR scores'], email: '', photoUrl: '' },
  { id: 'alyssa-burrell', name: 'Alyssa Burrell', title: 'Student Support Coordinator', dept: 'records', level: 5, reportsTo: 'brad-lester',
    responsibilities: ['Lead and oversee the Phone Support team including domestic and international staff', 'Monitor and report on phone support metrics', 'Handle escalated student support cases'],
    kpis: ['Phone answer speed and handle time', 'Phone Support QA, CSAT, and FCR scores', 'Phone support cost management'], email: '', photoUrl: '' },
  { id: 'kira-hayes', name: 'Kira Hayes', title: 'Training & QA Coordinator', dept: 'records', level: 5, reportsTo: 'hilary-bagley',
    responsibilities: ['Managing the QA team and External KB team', 'Ensuring internal articles are created for agent support', 'Onboarding and training coordination for student support'],
    kpis: ['KB publishing time', 'QA evaluations on every agent', 'All DSAT & Critical Violations sent to team leaders'], email: '', photoUrl: '' },
  { id: 'geraldine-bean', name: 'Geraldine Susan Bean', title: 'Graduation Coordinator', dept: 'records', level: 5, reportsTo: 'tyson-bell',
    responsibilities: ['Oversee the graduation team on applications and issues', 'Personally vet and award credentials each week', 'Manage graduation application workflow'],
    kpis: ['Graduation application completion time', 'Number of rescinded degrees', 'Graduation team costs'], email: '', photoUrl: '' },
  { id: 'anne-owen', name: 'Anne E. Owen', title: 'Records & Transcript Coordinator', dept: 'records', level: 5, reportsTo: 'tyson-bell',
    responsibilities: ['Oversee grade change documentation and processing', 'Handle academic exceptions and reinstatements', 'Manage transcript requests and records'],
    kpis: ['Process ticket completion time', 'Transcript accuracy QA scores', 'Process ticket C-Sat'], email: '', photoUrl: '' },
  { id: 'cindi-putnam', name: 'Cindi C Putnam', title: 'Planning Coordinator', dept: 'records', level: 5, reportsTo: 'kim-overdiek',
    responsibilities: ['Meet with Planning Team leadership to review productivity and training', 'Work with teams inside and outside department on planning processes', 'Manage degree progress audit corrections'],
    kpis: ['Degree planning escalation ticket resolution time', 'Degree planning escalation ticket C-Sat and QA', 'Degree planning team costs'], email: '', photoUrl: '' },
  { id: 'nikki-chambers', name: 'Nikki Jane Chambers', title: 'Enrollment Verification Specialist', dept: 'records', level: 5, reportsTo: 'tyson-bell',
    responsibilities: ['Standard and advanced enrollment verification', 'Third-party inputs and specialized forms', 'Partner transfer evaluation and apostilles'],
    kpis: ['Enrollment verification completion time', 'Apostille QA and C-Sat', 'Enrollment Verification team costs'], email: '', photoUrl: '' },
  { id: 'emma-stone', name: 'Emma Stone', title: 'Registration Specialist', dept: 'records', level: 5, reportsTo: 'kim-overdiek',
    responsibilities: ['Registration user testing and support', 'Manual registration projects', 'Registration issue resolution'],
    kpis: ['Registration issue ticket resolution time', 'Registration issue ticket QA and C-Sat', 'Registration team costs'], email: '', photoUrl: '' },

  // ── ENROLLMENT & RETENTION ──
  // Level 3
  { id: 'trevor-shelton', name: 'Trevor Shelton', title: 'Senior Manager of Enrollment Services', dept: 'enrollment', level: 3, reportsTo: 'alison-cundiff',
    responsibilities: ['Develop admissions policies and strategies for new and evolving initiatives', 'Key business owner for system design, testing, and improvement', 'Drive enrollment funnel performance and strategy'],
    kpis: ['Delivery of strategic admissions initiatives on time and as scoped', '% reduction of enrollment related support tickets', '% reduction of admissions tier 2 support tickets'], email: '', photoUrl: '' },
  { id: 'kelley-richardson', name: 'Kelley Richardson', title: 'Mentoring Manager', dept: 'enrollment', level: 3, reportsTo: 'alison-cundiff',
    responsibilities: ['Implement the Mentoring Strategy', 'CRM needs and adjustments', 'Oversee Mentor & Evaluator training sessions'],
    kpis: ['Mentor RA Completion Rates', 'Mentor Interaction QA Rates', 'Mentor CSAT rates'], email: '', photoUrl: '' },
  // Level 4
  { id: 'rachel-kirk', name: 'Rachel Kirk', title: 'Enrollment Counseling Manager', dept: 'enrollment', level: 4, reportsTo: 'trevor-shelton',
    responsibilities: ['Supporting team and escalating complicated issues (50%)', 'Cross-departmental collaboration (15%)', 'Planning targeted outreach and monitoring performance (35%)'],
    kpis: ['EC RA Completion Rates', 'EC Contact rate by alert', 'Yield contribution by EC'], email: '', photoUrl: '' },
  // Level 5
  { id: 'mandy-schwab', name: 'Mandy Schwab', title: 'Mentor Development Specialist', dept: 'enrollment', level: 5, reportsTo: 'kelley-richardson',
    responsibilities: ['Mentor development programs and training', 'Mentor interaction quality improvement', 'Support mentor onboarding processes'],
    kpis: ['Mentor Interaction QA Rates', 'Mentor CSAT rates'], email: '', photoUrl: '' },
  { id: 'johanna-relkin', name: 'Johanna Relkin', title: 'Mentor Operations Specialist', dept: 'enrollment', level: 5, reportsTo: 'kelley-richardson',
    responsibilities: ['Mentoring operations management', 'Mentor scheduling and logistics', 'Operational reporting for mentoring program'],
    kpis: ['Mentor RA Completion Rates'], email: '', photoUrl: '' },
  { id: 'kimarie-howard', name: 'Kimarie Howard', title: 'EC Development & Performance Coordinator', dept: 'enrollment', level: 5, reportsTo: 'rachel-kirk',
    responsibilities: ['Enrollment counselor development and performance tracking', 'EC training program coordination', 'Performance metrics monitoring'],
    kpis: ['EC CSAT rates', 'Yield contribution by EC'], email: '', photoUrl: '' },
  { id: 'megan-niblett', name: 'Megan Niblett', title: 'EC Operations Coordinator', dept: 'enrollment', level: 5, reportsTo: 'rachel-kirk',
    responsibilities: ['Enrollment counselor operations management', 'EC scheduling and workload distribution', 'Operational process improvements'],
    kpis: ['EC RA Completion Rates', 'EC Contact rate by alert', 'EC CSAT rates'], email: '', photoUrl: '' },
  { id: 'shaunasee-james', name: 'Shaunasee Janette James', title: 'Enrollment Coordinator', dept: 'enrollment', level: 5, reportsTo: 'trevor-shelton',
    responsibilities: ['Liaise with Ecclesiastical Clearance Office and chaplains', 'Manage team for MRN notifications and endorsement requests', 'Oversee transfer evaluation team and transcript submission workflows'],
    kpis: ['Transfer Evaluation Throughput rate', 'Transfer Eval timelines (case age rates)', 'Transfer Eval quality (QA scores)'], email: '', photoUrl: '' },
  { id: 'ely-zmolek', name: 'Ely Zmolek', title: 'Enrollment Services Specialist', dept: 'enrollment', level: 5, reportsTo: 'trevor-shelton',
    responsibilities: ['Process student applications across various programs', 'Monitor integration logs and resolve reported issues', 'Review and process Manual Review applications including exceptions'],
    kpis: ['% of applications processed within 1 business day during promotion', 'Manual review turnaround time (within one week)', 'Reduction of application related support tickets'], email: '', photoUrl: '' },
  { id: 'trey-mooney', name: 'Trey Mooney', title: 'University Chaplain', dept: 'enrollment', level: 5, reportsTo: 'trevor-shelton',
    responsibilities: ['Coordination with Admissions Leadership and Data Team', 'Volunteer Chaplain Leadership coordination', 'Conduct Ecclesiastical Endorsement interviews and training'],
    kpis: ['Endorsement completion time', '% of positive feedback from missionary chaplains', '% of non-member student grievances related to endorsement delays'], email: '', photoUrl: '' },

  // ── DEAN OF STUDENTS ──
  // Level 3
  { id: 'anne-clark', name: 'Anne Marie Clark', title: 'Associate Dean of Students', dept: 'dean', level: 3, reportsTo: 'steven-thomas',
    responsibilities: ['Operational authority over all Dean of Students service offices', 'Deputy oversight of Title IX and ADA/Section 504 compliance', 'Operational governance and quality assurance'],
    kpis: ['DOS case response and resolution times', 'Low escalation rates across DOS service areas', 'Deputy Title IX and ADA/Section 504 Coordinator metrics'], email: '', photoUrl: '' },
  // Level 5 (no Level 4 in this dept)
  { id: 'katelyn-ray', name: 'Katelyn Ray', title: 'Student Honor & Conduct Coordinator', dept: 'dean', level: 5, reportsTo: 'anne-clark',
    responsibilities: ['Administers CES Honor Code and student conduct process', 'Ensures fairness, consistency, and due process', 'Oversee behavioral and conduct case management'],
    kpis: ['Honor and Conduct cases response and resolution times', 'Rate of repeat offenders'], email: '', photoUrl: '' },
  { id: 'sandra-wirttele', name: 'Sandra Wirttele', title: 'Student Accessibility Coordinator', dept: 'dean', level: 5, reportsTo: 'anne-clark',
    responsibilities: ['Determine and administer reasonable accommodations for students with disabilities', 'Deputy ADA/Section 504 Coordinator', 'Accommodation appeals and compliance auditing'],
    kpis: ['Accommodation determinations and resolution times', 'Compliance with ADA and Section 504 standards audit'], email: '', photoUrl: '' },
  { id: 'ana-decastro', name: 'Ana De Castro', title: 'Student Belonging Coordinator', dept: 'dean', level: 5, reportsTo: 'anne-clark',
    responsibilities: ['Institutional administrator for belonging and non-discrimination concerns', 'Ensure timely, fair, and policy-aligned response', 'Belonging-related concern resolution and reporting'],
    kpis: ['Discrimination concerns resolved informally without escalation', 'Student sentiment and C-Sat surveys'], email: '', photoUrl: '' },
  { id: 'helen-reboucas', name: 'Helen Reboucas', title: 'Student Grievance Coordinator', dept: 'dean', level: 5, reportsTo: 'anne-clark',
    responsibilities: ['Administer formal academic and administrative grievance processes', 'Ensure compliance with institutional policy and due process', 'Grievance appeals, pattern analysis, and reporting'],
    kpis: ['Student grievance case resolution time', 'Grievance QA scores'], email: '', photoUrl: '' },
  { id: 'joseph-bentum', name: 'Joseph Bentum', title: 'Student Crisis Coordinator', dept: 'dean', level: 5, reportsTo: 'anne-clark',
    responsibilities: ['Coordinate institutional intake, triage, and response for crisis referrals', 'Stabilize high-risk situations and activate emergency protocols', 'High-risk case monitoring and follow-through'],
    kpis: ['Crisis response time', 'Appropriate C-Sat or QA measures for crisis resolution'], email: '', photoUrl: '' },

  // ── DIGITAL OPERATIONS ──
  // Level 3
  { id: 'ricky-kailiponi', name: 'Ricky Kailiponi Jr.', title: 'Senior Manager of Digital Operations', dept: 'digital', level: 3, reportsTo: 'jacob-adams',
    responsibilities: ['Responsible for Companion features (EC3, Registration, Admissions, Finance)', 'Partner collaboration with IT & ICS partners', 'Architect & Engineer engagement and Development & QA oversight'],
    kpis: ['Stakeholder CSAT with timeliness per project', '% student autonomy through AI outreach (partnership metric)'], email: '', photoUrl: '' },
  // Level 4
  { id: 'joshua-hadden', name: 'Joshua Stafford Hadden', title: 'System & Operations Manager', dept: 'digital', level: 4, reportsTo: 'jacob-adams',
    responsibilities: ['Help Student Services operate with greater efficiency and efficacy', 'Future state project guidance (technical elements)', 'Operational data & reporting and SIS support'],
    kpis: ['Time to graduation/transcript requests completion', 'Projects delivered ahead or before schedule', 'Stakeholder CSAT with system operations'], email: '', photoUrl: '' },
  { id: 'sebastian-vargas', name: 'Sebastian Vargas', title: 'Dev Manager', dept: 'digital', level: 4, reportsTo: 'ricky-kailiponi',
    responsibilities: ['Responsible for data accuracy in mentor portal', 'Data pipeline connection to predictive model outputs', 'High stakeholder satisfaction with timeliness and quality'],
    kpis: ['Stakeholder CSAT with timeliness and quality', 'Stakeholder CSAT with communication and roadmap', 'Data analyst costs per PowerBI project'], email: '', photoUrl: '' },
  { id: 'samuel-riveros', name: 'Samuel Riveros', title: 'Dev Manager', dept: 'digital', level: 4, reportsTo: 'ricky-kailiponi',
    responsibilities: ['Responsible for Companion front-end stability and usability', 'Companion integrations with analytics engine', 'High stakeholder satisfaction with development output'],
    kpis: ['Companion front-end stability metrics', 'Analytics engine integration quality', 'Stakeholder CSAT with development delivery'], email: '', photoUrl: '' },
  { id: 'aitana-toscano', name: 'Aitana Toscano', title: 'Dev Manager', dept: 'digital', level: 4, reportsTo: 'ricky-kailiponi',
    responsibilities: ['Quick turnarounds for PowerBI reporting', 'Backend table stability and cleaning', 'High stakeholder satisfaction with data operations'],
    kpis: ['Power BI turnaround time', 'Backend table stability metrics', 'Stakeholder CSAT with data quality'], email: '', photoUrl: '' },
  { id: 'isaias-zuniga', name: 'Isaias Zu\u00f1iga', title: 'AI Manager', dept: 'digital', level: 4, reportsTo: 'ricky-kailiponi',
    responsibilities: ['Source solutions to unfolding project challenges', 'Build AI/ML architecture and data models', 'Manage Azure DevOps board and GitHub operations'],
    kpis: ['Azure DevOps sprint completion rates', 'Model drift and silent hallucination monitoring', 'Developer costs per project'], email: '', photoUrl: '' },
  // Level 5
  { id: 'david-peck', name: 'David Peck', title: 'Operational Data Analyst', dept: 'digital', level: 5, reportsTo: 'joshua-hadden',
    responsibilities: ['Create and maintain operational reports for Student Services', 'Manage Power BI Apps reports and data refresh', 'Ensure reports reflect accurate and current data'],
    kpis: ['Stakeholder CSAT with timeliness per project', 'Report accuracy and refresh reliability'], email: '', photoUrl: '' },
  { id: 'pelenatita-neiufi', name: 'Pelenatita Neiufi', title: 'Reporting & Evaluation Coordinator', dept: 'digital', level: 5, reportsTo: 'joshua-hadden',
    responsibilities: ['NSC reporting for both BYUI and EC', 'Enrollment verifications and demographic changes', 'SSN verifications and auto-drop process management'],
    kpis: ['Stakeholder CSAT with communication and roadmap', 'Reporting accuracy and timeliness'], email: '', photoUrl: '' },
  { id: 'victor-ferreira', name: 'Victor Lam\u00e9ni Calado Ferreira', title: 'System & Operations Associate Registrar', dept: 'digital', level: 5, reportsTo: 'joshua-hadden',
    responsibilities: ['Overseeing the Student Information System (SIS)', 'Implementing institutional academic policies', 'FERPA compliance management'],
    kpis: ['SIS uptime and reliability', 'FERPA compliance audit results', 'Academic policy implementation accuracy'], email: '', photoUrl: '' }
];
