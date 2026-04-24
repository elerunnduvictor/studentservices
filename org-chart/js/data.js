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
  5: 'Staff'
};

OC.employees = [
  // ── LEVEL 1: VP ──
  { id: 'vp', name: 'Ben Packer', title: 'Vice President of Student Services', dept: 'executive', level: 1, status: 'FTE', reportsTo: null,
    responsibilities: ['Executive oversight of all Student Services operations', 'Strategic direction for student support, enrollment, records, and digital operations', 'Budget and resource allocation across departments'],
    kpis: ['Overall student satisfaction scores', 'Student retention and completion rates', 'Operational efficiency across departments'], email: '', photoUrl: '' },

  // ── LEVEL 2: DIRECTORS ──
  { id: 'mark-gefrom', name: 'Mark Gefrom', title: 'Director of Student Records, Registration & Support', dept: 'records', level: 2, status: 'FTE', reportsTo: 'vp',
    responsibilities: ['Registrar, student support, tech support oversight', 'Help center', 'Customer relations systems', 'Ticket systems'],
    kpis: ['All Records, Registration, and Support teams meeting or exceeding service-level agreements for response, resolution, QA, CSAT, and first contact resolution', 'Records, registration, and support department budget', 'Overall student autonomy (primary)', 'Overall student satisfaction (secondary)'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBpfBRqxg1FTqAoAyYTtdYhAQZ58j2DOREbCoKMFpxpPBY?e=WczgAk' },
  { id: 'alison-cundiff', name: 'Alison Cundiff', title: 'Director of Enrollment & Retention', dept: 'enrollment', level: 2, status: 'FTE', reportsTo: 'vp',
    responsibilities: ['Enrollment services & mentoring oversight', 'Student retention and completion'],
    kpis: ['Enrollment & Retention budget', 'Enrollment, retention, completion (primary)', 'Overall student autonomy and satisfaction (secondary)'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAFhc5UkuwgTapnxWheHmYRAeUt6L6jGcomm-gS_hKDWbg?e=v2NPg4' },
  { id: 'steven-thomas', name: 'Steven K. Thomas', title: 'Dean of Students', dept: 'dean', level: 2, status: 'FTE', reportsTo: 'vp',
    responsibilities: ['Executive Oversight of Federally and Institutionally Mandated Student Service Offices', 'Institutional Policy Stewardship & Compliance (Title IX Coordintor, ADA/Section 504 Coordinator)', 'Crisis Governance & Risk Mitigation'],
    kpis: ['No material audit, legal, or accreditation findings attributable to Dean of Students governance', 'Annual DOS budget', 'Overall student satisfaction (primary)'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAJCeQuk9fHTbFRX-_VINCFAXaStbvWN2DK4_tsSELnmmQ?e=UfES01' },
  { id: 'jacob-adams', name: 'Jacob Adams', title: 'Director of Digital Operations', dept: 'digital', level: 2, status: 'FTE', reportsTo: 'vp',
    responsibilities: ['Digital operations oversight', 'Application and implementation of emerging technologies', 'Strategy for Power BI, machine learning, agentic AI, and Companion teams', 'UX evaluation & impact review'],
    kpis: ['Overall Stakeholder CSAT', 'Digital Ops budget', 'Costs saved by customers due to Digital Ops technologies (secondary)', 'Overall student autonomy (secondary)', 'Overall student satisfaction (secondary)', 'Application Rate', 'Retention Rate', 'Completion Rate (Secondary)'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQA4Z3GLmjrRQ7VQBp_tH6EAAX8tlXHJ79We6G8lvZI-Z_s?e=hfmBx2' },

  // ── RECORDS, REGISTRATION & SUPPORT ──
  // Level 3
  { id: 'brad-lester', name: 'Brad Lester', title: 'Senior Manager of Student Support', dept: 'records', level: 3, status: 'FTE', reportsTo: 'mark-gefrom',
    responsibilities: ['Inbound student support lead', 'Academic advising program'],
    kpis: ['Student support budget', 'Autonomy rate for student support cases'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCKoBX4HbZJRq7HLLXdBrCbAdvXS8PLZF0W8t-imhz4UV4?e=HLCnTw' },
  { id: 'kari-johnson', name: 'Kari Johnson', title: 'Registrar', dept: 'records', level: 3, status: 'FTE', reportsTo: 'mark-gefrom',
    responsibilities: ['Registration and Records lead', 'Academic record maintenance', 'Block/Term system and catalog data publishing'],
    kpis: ['Registrar budget', 'Autonomy for registrar processes and cases', 'Case CSAT for planning and registration'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBkQUDPjDkJQqGJR2uD02GvAZ2F5T3reRUi0tmNHnatB8c?e=em7vc2' },
  // Level 4
  { id: 'matthew-smith', name: 'Matthew Smith', title: 'Technical Support Manager', dept: 'records', level: 4, status: 'FTE', reportsTo: 'brad-lester',
    responsibilities: ['Inbound tech support lead'],
    kpis: ['Tech support case resolution rate', 'Tech support costs', 'Autonomy rate for tech support cases'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQC6ZURvjEf_R4kbBaAAgIjGAaB-PHWFt8Afm--cDEFlV6M?e=Y0g1Xo' },
  { id: 'hilary-bagley', name: 'Hilary Bagley', title: 'Training & QA Manager', dept: 'records', level: 4, status: 'FTE', reportsTo: 'brad-lester',
    responsibilities: ['Training, area collaboration, & partner communication', 'Media & Knowledge Base development', 'Student Support content accuracy', 'Student journey mapping'],
    kpis: ['Request-to-KB publish rate', 'Knowledge Base audit pass rate', 'Cost per KB Article Maintained', 'QA feedback cycle rate', 'QA calibration consistency rate', 'QA team lead feedback success rate', 'Cost per QA Evaluation'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAAwTC8MOIqQIkj0G04BRqGAc9Y9taAUl9NY_6ZfIDUJ4Y?e=hfFaGg' },
  { id: 'kim-overdiek', name: 'Kim Overdiek', title: 'Associate Registrar', dept: 'records', level: 4, status: 'FTE', reportsTo: 'kari-johnson',
    responsibilities: ['Policies & processes', 'Curriculum/catalog maintenance', 'Academic planning system configuration', 'Course registration process'],
    kpis: ['Process case resolution rate, QA, and CSAT', 'On-time catalog publishing and system configuration rates'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDHxfnyxJ_PTKTIYysDqssWAVj3YJCFsDb62MgYnRnRvfo?e=zcdOtl' },
  { id: 'tyson-bell', name: 'Tyson Bell', title: 'Associate Registrar', dept: 'records', level: 4, status: 'FTE', reportsTo: 'kari-johnson',
    responsibilities: ['Student records', 'Transcripts', 'Graduation', 'Enrollment verification'],
    kpis: ['Records case resolution rate, QA, and CSAT'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQANGB82vwVpR7kWikzK32R6AcXDcnbDlXCI-F8G8MsOwZA?e=HYUBCa' },
  // Level 5
  { id: 'colby-warner', name: 'Colby Warner', title: 'Product Support Engineer', dept: 'records', level: 5, status: 'FTE', reportsTo: 'matthew-smith',
    responsibilities: ['Tech support troubleshooting & resolution'],
    kpis: ['Escalated case resolution rate', 'Tech support case QA, CSAT, first contract resolution'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBaWG5YlOnKQrXGueyhBughAXBMduY1rLTdPM_7EobPwQo?e=e6Zd8q' },
  { id: 'alyssa-burrell', name: 'Alyssa Burrell', title: 'Student Support Coordinator', dept: 'records', level: 5, status: 'FTE', reportsTo: 'brad-lester',
    responsibilities: ['Phone support', 'General support'],
    kpis: ['General support case response and resolution rates', 'Phone support answer speed, handle rate, agent availability, QA, CSAT, and first contact resolution'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBwUBFZyWZaSLXU28SQe4_cAUirTYoW8S2Th63JomM1XhM?e=YVQEeX' },
  { id: 'kira-hayes', name: 'Kira Hayes', title: 'Training & QA Coordinator', dept: 'records', level: 5, status: 'FTE', reportsTo: 'hilary-bagley',
    responsibilities: ['Ticketing QA', 'External Knowledge Base articles', 'Support agent onboarding and training'],
    kpis: ['KB publishing rate', 'QA evaluation completion rate', 'DSAT and critical violation delivery rate'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCtk6Visur9S73CLrYxUHrpAd25rc-Xrtvfnt3SO0KwFLM?e=H5naai' },
  { id: 'geraldine-bean', name: 'Geraldine Susan Bean', title: 'Graduation Coordinator', dept: 'records', level: 5, status: 'FTE', reportsTo: 'tyson-bell',
    responsibilities: ['Graduation application', 'Diploma awarding process'],
    kpis: ['Graduation application case completion rate', 'Award processing rate', 'Number of rescinded degrees', 'Application and awarding QA'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAR8feRUQUqRbS9IFJkfhY6Ae-dI_3KnvPYc7_B5RaXvmE?e=SVgmsJ' },
  { id: 'anne-owen', name: 'Anne E. Owen', title: 'Records & Transcript Coordinator', dept: 'records', level: 5, status: 'FTE', reportsTo: 'tyson-bell',
    responsibilities: ['Grade changes', 'Academic exceptions', 'Transcript requests'],
    kpis: ['Process case completion rate', 'Process case QA, and CSAT', 'Transcript accuracy QA'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAEOXkjnBS2T5AgKHhw-KlEAXws8SAXw2fBBXWANGQ3-i8?e=frYZ29' },
  { id: 'cindi-putnam', name: 'Cindi C Putnam', title: 'Planning Coordinator', dept: 'records', level: 5, status: 'FTE', reportsTo: 'kim-overdiek',
    responsibilities: ['Degree progress audit corrections'],
    kpis: ['Degree planning escalation case resolution rate, QA, and CSAT'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDM5kWdtj6eTobfhfYTnaukATgc2h46N2asN0nMbPnj9eA?e=vikaN5' },
  { id: 'nikki-chambers', name: 'Nikki Jane Chambers', title: 'Enrollment Verification Specialist', dept: 'records', level: 5, status: 'FTT', reportsTo: 'tyson-bell',
    responsibilities: ['Enrollment verification', 'Partner transfer evaluation', 'Apostilles', 'Student verification letters'],
    kpis: ['Enrollment verification and apostille completion rate', 'Enrollment verification QA, and CSAT', 'Apostille QA, and CSAT'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBkohdpEKodQoL-ghZzzwCRAQKlxkR8j_9LVGL0oGq1t5Y?e=8brGcT' },

  // ── ENROLLMENT & RETENTION ──
  // Level 3
  { id: 'trevor-shelton', name: 'Trevor Shelton', title: 'Senior Manager of Enrollment Services', dept: 'enrollment', level: 3, status: 'FTE', reportsTo: 'alison-cundiff',
    responsibilities: ['Enrollment services lead', 'Enrollment funnel performance, strategy, and innovation'],
    kpis: ['Reduction of enrollment related support cases', 'Reduction of admissions tier 2 support cases'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCVmNuaOp68SKhTnf_tOoajAX5JqDNZE3skdK_YOh1zQOg?e=cIHUdp' },
  { id: 'kelley-richardson', name: 'Kelley Richardson', title: 'Mentoring Manager', dept: 'enrollment', level: 3, status: 'FTE', reportsTo: 'alison-cundiff',
    responsibilities: ['Mentoring program lead'],
    kpis: ['Mentor required action completion rate', 'Mentor interaction QA', 'Overall student autonomy (secondary)', 'Mentor CSAT', 'Retention rate contribution by mentors'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDf11sIFIdKRpf47WFm_HrbAbXK5oADRJG7VjwmaQKoGEY?e=LfYtXd' },
  // Level 4
  { id: 'rachel-kirk', name: 'Rachel Kirk', title: 'Enrollment Counseling Manager', dept: 'enrollment', level: 4, status: 'FTE', reportsTo: 'trevor-shelton',
    responsibilities: ['Enrollment Counseling team', 'Enrollment funnel performance & outcomes'],
    kpis: ['Application start to admission yield', 'Admission to registration yield', 'Registration to auto-drop yield'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAw0JzSy0-_SJwGTk9TEoL5AfQPAV9g6j-Z3Q3eUX_PAaY?e=flOOTM' },
  // Level 5
  { id: 'mandy-schwab', name: 'Mandy Schwab', title: 'Mentor Development Specialist', dept: 'enrollment', level: 5, status: 'PTT', reportsTo: 'kelley-richardson',
    responsibilities: ['Mentoring program development'],
    kpis: ['Mentor interaction QA', 'Mentor CSAT'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBy2LVzDoldRZisyIODLh8zAQMURc-jWPshlLW15i3qb1A?e=U7sRj2' },
  { id: 'johanna-relkin', name: 'Joanna Relkin', title: 'Mentor Operations Specialist', dept: 'enrollment', level: 5, status: 'PTT', reportsTo: 'kelley-richardson',
    responsibilities: ['Mentoring program operations'],
    kpis: ['Mentor required action completion rate', 'Mentor concern case QA'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAD6qmcBdXESLblm4Cwxcq-AQzexoG57ED2rJSulZnrW7A?e=istmOr' },
  { id: 'kimarie-howard', name: 'Kimarie Howard', title: 'EC Development & Performance Coordinator', dept: 'enrollment', level: 5, status: 'Contractor', reportsTo: 'rachel-kirk',
    responsibilities: ['Enrollment Counseling development and performance'],
    kpis: ['Enrollment Counseling CSAT rate', 'Enrollment Counseling yield contribution'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQC8A6J14ltYSax9jMGUoFVTAec5lePpVzxNpeJdiJsbtBY?e=jimf3o' },
  { id: 'megan-niblett', name: 'Megan Niblett', title: 'EC Operations Coordinator', dept: 'enrollment', level: 5, status: 'Contractor', reportsTo: 'rachel-kirk',
    responsibilities: ['Enrollment Counseling operations'],
    kpis: ['Enrollment Counseling required action completion rate', 'Enrollment Counseling contact rate by alert'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDYXALjqBy9TqMnkrLzZPALAVRIDVcR-t2zQ7_N6t_-sFI?e=OrqQzO' },
  { id: 'shaunasee-james', name: 'Shaunasee Janette James', title: 'Enrollment Coordinator', dept: 'enrollment', level: 5, status: 'FTE', reportsTo: 'trevor-shelton',
    responsibilities: ['Transfer evaluation', 'Ecclesiastical endorsement', 'Chaplain partnership'],
    kpis: ['Transfer evaluation processing rate', 'Number of transfer evaluation and endorsement cases', 'Transfer evaluation and endorsement case resolution rate'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBHJEF4d22UQ4TOTp6j8queASopK9ehmaq4-SfVdUQwo1g?e=qSPQFY' },
  { id: 'ely-zmolek', name: 'Ely Zmolek', title: 'Enrollment Services Specialist', dept: 'enrollment', level: 5, status: 'FTE', reportsTo: 'trevor-shelton',
    responsibilities: ['Application processing', 'Admissons exceptions', 'Admissions systems'],
    kpis: ['Application processing rate', 'Application manual review turnaround rate', 'Number of admissions support cases', 'Admissions case resolution rate'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDyS1zVpuz3SI8qQdzkXt4eAa5v6mtHteW4fZK3kCJ5twA?e=C1jcso' },
  { id: 'trey-mooney', name: 'Trey Mooney', title: 'University Chaplain', dept: 'enrollment', level: 5, status: 'FTE', reportsTo: 'trevor-shelton',
    responsibilities: ['Ecclesiastical endorsements for non-member students'],
    kpis: ['Non-member endorsement completion rate', 'Number of support cases with non-member endorsement concerns'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCr-O7RTvhPRaqywK1WC3PeAfbXS3wjfPjtPewsh_8PD3M?e=5EgIUj' },

  // ── DEAN OF STUDENTS ──
  // Level 3
  { id: 'anne-clark', name: 'Anne Marie Clark', title: 'Associate Dean of Students', dept: 'dean', level: 3, status: 'FTE', reportsTo: 'steven-thomas',
    responsibilities: ['Deputy Oversight of Title IX and ADA/Section 504 Compliance', 'Operational Governance and Quality Assurance of Dean of Students Services', 'Case Escalation, Secondary Review, and Risk Resolution Authority'],
    kpis: ['Dean of Students response and resolution time', 'Dean of Students services escalation rates', 'Partner C-Sat'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDSHzYkaQbiTKka4BszvUdeAelcwMltNNhbDXOi0SkDl08?e=xKEuAg' },
  // Level 5 (no Level 4 in this dept)
  { id: 'katelyn-ray', name: 'Katelyn Ray', title: 'Student Honor & Conduct Coordinator', dept: 'dean', level: 5, status: 'FTE', reportsTo: 'anne-clark',
    responsibilities: ['Institutional CES Honor Code Administration, Adjudication, and Due Process Enforcement', 'Behavioral Risk Monitoring and Institutional Conduct Trend Analysis'],
    kpis: ['Honor and Conduct response and resolution time', 'Repeat offender rate'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBQz2AWfHg4QLr-tLfqWB5OAfGlKm815bIjKlysE6sH3XU?e=12zTcP' },
  { id: 'sandra-wirttele', name: 'Sandra Wurttele', title: 'Student Accessibility Coordinator', dept: 'dean', level: 5, status: 'Contractor', reportsTo: 'anne-clark',
    responsibilities: ['Disability Accommodation Determination and Deputy ADA/Section 504 Coordinator', 'Accommodation Appeals, Adjustments, and Compliance Documentation'],
    kpis: ['Accommodation determination processing and resolution rates', 'ADA and Section 504 standard compliance and audit compliance rates'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBVF-cnaza5S4QpkfqcBzYBAeYcEuv3-9UQF2FsOVwDveg?e=fgld8E' },
  { id: 'ana-decastro', name: 'Ana De Castro', title: 'Student Belonging Coordinator', dept: 'dean', level: 5, status: 'Contractor', reportsTo: 'anne-clark',
    responsibilities: ['Non-Discrimination Administration and Institutional Response', 'Belonging-Related Concern Resolution and Systemic Risk Escalation'],
    kpis: ['Discrimination case resolution rate', 'Student sentiment on belonging', 'Student belonging CSAT'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDw3EYyUChUSY3A6NON-yzTAbsZyYTV79vgs6HuVXn3KPM?e=eMTFQX' },
  { id: 'helen-reboucas', name: 'Helen Reboucas', title: 'Student Grievance Coordinator', dept: 'dean', level: 5, status: 'Contractor', reportsTo: 'anne-clark',
    responsibilities: ['Formal Student Grievance Administration and Due Process Assurance', 'Grievance Appeals, Pattern Analysis, and Institutional Risk Insight'],
    kpis: ['Student grievance case resolution time', 'Grievance QA'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAFWmgwRzlyR5zv2gsq5azrAXc2nfbXRXsAR85GuTJ0Ykw?e=lLfV4e' },
  { id: 'joseph-bentum', name: 'Joseph Bentum', title: 'Student Crisis Coordinator', dept: 'dean', level: 5, status: 'Contractor', reportsTo: 'anne-clark',
    responsibilities: ['Student Crisis Intake, Triage, Stabilization, and Emergency Coordination', 'High-Risk Case Monitoring and Institutional Safeguards'],
    kpis: ['Crisis response time'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCck7nWiNmJTbKblCL9bvWxASpttHquDaszNgyjwEDUvDA?e=zFBhpM' },

  // ── DIGITAL OPERATIONS ──
  // Level 3
  { id: 'ricky-kailiponi', name: 'Ricky Kailiponi Jr.', title: 'Senior Manager of Digital Operations', dept: 'digital', level: 3, status: 'FTE', reportsTo: 'jacob-adams',
    responsibilities: ['Business Partner collaboration', 'Architect & Engineer engagement (IT/ICS)', 'Development & QA lead', 'AI Compliance & advancement'],
    kpis: ['Team meeting project deadlines', 'Companion feature C-Sat', 'Companion usage rates', 'Companion C-Sat', 'AI retention effect'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQA_Pg4UzvhTS7QJCBFKoz33AfnpJQE-bSz0L_2WnenPqRk?e=fV14kS' },
  // Level 4
  { id: 'joshua-hadden', name: 'Joshua Stafford Hadden', title: 'System & Operations Manager', dept: 'digital', level: 4, status: 'FTE', reportsTo: 'ricky-kailiponi',
    responsibilities: ['Registrar business solutions', 'Operational data & reporting', 'SIS support & configuration'],
    kpis: ['Team meeting project timelines rate', 'Stakeholder CSAT on team\'s projects', 'Cost reductions in service areas (secondary)'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDAfxv5-z3nRIuCZ8cuqVLrAetuZhsS26bV2B5GVKjLtkk?e=we7VuH' },
  { id: 'sebastian-vargas', name: 'Sebastian Vargas', title: 'Dev Manager', dept: 'digital', level: 4, status: 'Contractor', reportsTo: 'ricky-kailiponi',
    responsibilities: ['Mentor Portal', 'Predictive Model Data Pipeline'],
    kpis: ['Stakeholder CSAT - timeliness per project', 'Stakeholder CSAT - communication, quality of work, impact'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCJXq3iu29QSbfipK9hj10LAboUgNxbbxhiZixIQKvTths?e=d8h5fW' },
  { id: 'samuel-riveros', name: 'Samuel Riveros', title: 'Dev Manager', dept: 'digital', level: 4, status: 'Contractor', reportsTo: 'ricky-kailiponi',
    responsibilities: ['Companion Front-End Stability & Usability', 'Companion–Analytics Engine Integration'],
    kpis: ['Stakeholder CSAT - timeliness per project', 'Stakeholder CSAT - communication, quality of work, impact'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQAGDpuAcq_uRJQfBo6jtQ6VAZzICKfHCBKlonY8DuoA5c0?e=uOPRI1' },
  { id: 'aitana-toscano', name: 'Aitana Toscano', title: 'Dev Manager', dept: 'digital', level: 4, status: 'Contractor', reportsTo: 'ricky-kailiponi',
    responsibilities: ['Power BI reporting lead', 'Backend Data stability & cleaning'],
    kpis: ['Stakeholder CSAT - timeliness per project', 'Stakeholder CSAT - communication, quality of work, impact'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDM61NrXoIgTZn7hTXqXYRFAT-HAogly8tB9cq40Uvl0dk?e=9icL1c' },
  { id: 'isaias-zuniga', name: 'Isaias Zu\u00f1iga', title: 'AI Manager', dept: 'digital', level: 4, status: 'Contractor', reportsTo: 'ricky-kailiponi',
    responsibilities: ['AI/ML Architecture development', 'Data Model development', 'Azure Board, GitHub, & DevOps Pipeline management'],
    kpis: [], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQB-HCg_VNVVQ6goimpZTa7rAZp194qZhHI9tyf41DYA3T4?e=9YCbey' },
  // Level 5
  { id: 'david-peck', name: 'David Peck', title: 'Operational Data Analyst', dept: 'digital', level: 5, status: 'FTE', reportsTo: 'joshua-hadden',
    responsibilities: ['Power BI report management & refresh'],
    kpis: ['Project delivery on time rate', 'Stakeholder CSAT - communication, quality of work, impact'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQCZBbLkMAvERrRvFUiNIP8uAUhqA7Wc7H1tIJ0WisHWbLY?e=RulDks' },
  { id: 'pelenatita-neiufi', name: 'Pelenatita Neiufi', title: 'Reporting & Evaluation Coordinator', dept: 'digital', level: 5, status: 'FTE', reportsTo: 'joshua-hadden',
    responsibilities: ['NSC & Enrollment reporting (BYUI & EC)', 'Student record updates (Demographics, SSN)', 'Qualitative research'],
    kpis: ['Project delivery on time rate', 'Stakeholder CSAT - communication, quality of work, impact'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQDO92S10jkTS7uQSURJg-AQAQB0pMN-87vTcDEJaGIc7Y8?e=m2YL0Q' },
  { id: 'victor-ferreira', name: 'Victor Lam\u00e9ni Calado Ferreira', title: 'System & Operations Associate Registrar', dept: 'digital', level: 5, status: 'FTE', reportsTo: 'joshua-hadden',
    responsibilities: ['Registrar services for MLP students'],
    kpis: ['Project delivery on time rate', 'Stakeholder CSAT - communication, quality of work, impact'], email: '', photoUrl: '', roleInventoryUrl: 'https://churchofjesuschrist.sharepoint.com/:w:/s/BYU-PathwayStudentSuccessRoleInventory/IQBd6L0FnQgkQoq21Rr5e_CeAVnmrAepKNqoBsDZpFYsz3A?e=5EPfTL' },

  // ── PROJECT MANAGERS (displayed beside their director/VP) ──
  { id: 'jess-swinburne', name: 'Jess Swinburne', title: 'Project Manager', dept: 'executive', level: 2, status: 'Contractor', reportsTo: 'vp', role: 'pm', pmPosition: 'right',
    responsibilities: ['Coordinate cross-departmental strategic initiatives for Student Services', 'Track project milestones, deliverables, and resource allocation across all departments', 'Facilitate executive reporting and stakeholder communication for the VP'],
    kpis: ['On-time delivery of cross-departmental projects', 'Stakeholder satisfaction with project communication and reporting', 'Resource utilization efficiency across initiatives'], email: '', photoUrl: '', roleInventoryUrl: '' },
  { id: 'david-koomson', name: 'David De-Graft Koomson', title: 'Assistant Project Manager', dept: 'executive', level: 2, status: 'Contractor', reportsTo: 'jess-swinburne', role: 'pm', pmPosition: 'right',
    responsibilities: ['Support project coordination and documentation for VP-level initiatives', 'Manage project timelines, meeting agendas, and action item tracking', 'Assist with cross-team communication and follow-up on deliverables'],
    kpis: ['Action item completion rate across VP initiatives', 'Meeting cadence adherence and documentation quality', 'Timely escalation of project risks and blockers'], email: '', photoUrl: '', roleInventoryUrl: '' },
  { id: 'victor-elerunndu', name: 'Victor Oluwapelumi Elerunndu', title: 'Project Manager', dept: 'records', level: 3, status: 'Contractor', reportsTo: 'mark-gefrom', role: 'pm', pmPosition: 'left',
    responsibilities: ['Coordinate student support improvement projects and initiatives', 'Track Help Center and ticket system optimization milestones', 'Manage cross-functional project timelines within student support operations'],
    kpis: ['On-time delivery of student support projects', 'Project milestone completion rate', 'Stakeholder satisfaction with project communication'], email: '', photoUrl: '', roleInventoryUrl: '' },
  { id: 'moses-abioye', name: 'Moses Abioye', title: 'Project Manager', dept: 'records', level: 3, status: 'Contractor', reportsTo: 'mark-gefrom', role: 'pm', pmPosition: 'right',
    responsibilities: ['Coordinate registration and records process improvement projects', 'Track registrar system updates and compliance initiative timelines', 'Manage project documentation and reporting for records operations'],
    kpis: ['On-time delivery of registrar and records projects', 'Registration process improvement milestones met', 'Project documentation completeness and accuracy'], email: '', photoUrl: '', roleInventoryUrl: '' },
  { id: 'james-etukudo', name: 'James Etukudo Jr.', title: 'Project Manager', dept: 'enrollment', level: 3, status: 'Contractor', reportsTo: 'alison-cundiff', role: 'pm', pmPosition: 'right',
    responsibilities: ['Coordinate enrollment funnel and retention initiative projects', 'Track admissions system design, testing, and deployment milestones', 'Manage project reporting and cross-team coordination for enrollment services'],
    kpis: ['On-time delivery of enrollment and retention projects', 'Enrollment initiative milestone completion rate', 'Stakeholder satisfaction with project updates and communication'], email: '', photoUrl: '', roleInventoryUrl: '' },
  { id: 'mariela-pezzali', name: 'Mariela Gisell Pezzali', title: 'Project Manager', dept: 'dean', level: 3, status: 'Contractor', reportsTo: 'steven-thomas', role: 'pm', pmPosition: 'right',
    responsibilities: ['Coordinate Dean of Students office projects and compliance initiatives', 'Track Title IX, ADA/504, and student conduct process improvement timelines', 'Manage cross-office project documentation and stakeholder reporting'],
    kpis: ['On-time delivery of DOS compliance and policy projects', 'Project milestone completion rate for student services initiatives', 'Stakeholder satisfaction with project coordination and reporting'], email: '', photoUrl: '', roleInventoryUrl: '' },
  { id: 'karina-vargas', name: 'Karina Andrea Vargas', title: 'Project Manager', dept: 'digital', level: 3, status: 'Contractor', reportsTo: 'jacob-adams', role: 'pm', pmPosition: 'right',
    responsibilities: ['Coordinate digital operations development and deployment projects', 'Track sprint deliverables, feature releases, and system integration milestones', 'Manage stakeholder reporting and project communication for digital initiatives'],
    kpis: ['On-time delivery of digital operations projects', 'Sprint and release milestone completion rate', 'Stakeholder satisfaction with project timeliness and communication'], email: '', photoUrl: '', roleInventoryUrl: '' }
];
