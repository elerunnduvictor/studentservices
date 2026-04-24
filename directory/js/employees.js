/* ═══════════════════════════════════════════════════════════════
   SHARED EMPLOYEE DATA — SINGLE SOURCE OF TRUTH

   Edit this file to add, remove, or update any employee. Every page
   that shows employee data reads from this same file, so one edit
   propagates everywhere automatically:

     • Student Services Directory  → /directory/index.html
     • Dean of Students            → /departments/dean.html
     • Digital Operations          → /departments/digital.html
     • Enrollment & Retention      → /departments/enrollment.html
     • Records, Registration...    → /departments/records.html

   Each dept page filters this array by `dept` at page load, so any
   change here updates that dept's KPIs, sub-dept bar chart, and
   employment-type donut on the next refresh.
   ═══════════════════════════════════════════════════════════════ */
window.EMPLOYEES = [
  { name: "Gisele Loisotto", role: "Dean of Students Office Specialist", dept: "Dean of Students", type: "Contractor", stakeholder: "Sandra Wurttele", subDept: "Accessibility Office", org: "Springboard", tier: "3" },
  { name: "Sandra Wurttele", role: "Accessibility Office Coordinator", dept: "Dean of Students", type: "Contractor", stakeholder: "Anne Marie Clark", subDept: "Department Leadership", org: "Velocity Global - EOR", tier: "EOR" },
  { name: "Ana de Castro", role: "Office of Belonging Coordinator", dept: "Dean of Students", type: "Contractor", stakeholder: "Anne Marie Clark", subDept: "Department Leadership", org: "Velocity Global - EOR", tier: "EOR" },
  { name: "Mariela Pezzali", role: "Project Manager", dept: "Dean of Students", type: "Contractor", stakeholder: "Steven K. Thomas", subDept: "Department Leadership", org: "Springboard", tier: "3.5" },
  { name: "Joseph Bentum", role: "Student Crisis Office Coordinator", dept: "Dean of Students", type: "Contractor", stakeholder: "Anne Marie Clark", subDept: "Department Leadership", org: "XML- EOR", tier: "EOR" },
  { name: "Helen Segalla de Oliveira Rebouças", role: "Student Grievance Coordinator", dept: "Dean of Students", type: "Contractor", stakeholder: "Anne Marie Clark", subDept: "Department Leadership", org: "Springboard", tier: "3.5" },
  { name: "Anne Marie Clark", role: "Associate Dean of Students", dept: "Dean of Students", type: "Full-Time Employee", stakeholder: "Steven K. Thomas", subDept: "Department Leadership", org: "", tier: "" },
  { name: "Steven K. Thomas", role: "Dean of Students", dept: "Dean of Students", type: "Full-Time Employee", stakeholder: "VP of Student Services", subDept: "Department Leadership", org: "", tier: "" },
  { name: "Joseph Chingwara", role: "Dean of Students Office Specialist", dept: "Dean of Students", type: "Contractor", stakeholder: "Helen Segalla de Oliveira Rebouças", subDept: "Grievance Office", org: "Springboard", tier: "3" },
  { name: "Queenie Okeke", role: "Dean of Students Office Specialist", dept: "Dean of Students", type: "Contractor", stakeholder: "Helen Segalla de Oliveira Rebouças", subDept: "Grievance Office", org: "Springboard", tier: "3" },
  { name: "Wesley dos Santos", role: "Dean of Students Office Specialist", dept: "Dean of Students", type: "Contractor", stakeholder: "Helen Segalla de Oliveira Rebouças", subDept: "Grievance Office", org: "Springboard", tier: "3" },
  { name: "Katelyn Ray", role: "Student Honor & Conduct Coordinator", dept: "Dean of Students", type: "Full-Time Employee", stakeholder: "Anne Marie Clark", subDept: "Service Area Coordinators", org: "", tier: "" },
  { name: "Scott Appiah", role: "Dean of Students Office Specialist", dept: "Dean of Students", type: "Contractor", stakeholder: "Joseph Bentum", subDept: "Student Crisis Office", org: "Springboard", tier: "3" },
  { name: "Tubo-Oreriba Joseph Elisha", role: "Dean of Students Office Specialist", dept: "Dean of Students", type: "Contractor", stakeholder: "Joseph Bentum", subDept: "Student Crisis Office", org: "Springboard", tier: "3" },
  { name: "Israel Juzgaya", role: "Dean of Students Office Specialist", dept: "Dean of Students", type: "Contractor", stakeholder: "Katelyn Ray", subDept: "Student Honor & Conduct Office", org: "Springboard", tier: "3" },
  { name: "Rhoda Mabundu", role: "Dean of Students Office Specialist", dept: "Dean of Students", type: "Contractor", stakeholder: "Katelyn Ray", subDept: "Student Honor & Conduct Office", org: "Springboard", tier: "3" },
  { name: "Isaias Zuñiga", role: "AI Dev. Manager", dept: "Digital Operations", type: "Contractor", stakeholder: "Ricky Kailiponi Jr.", subDept: "AI", org: "Upwork", tier: "3" },
  { name: "Diego Huarsaya", role: "AI Engineer", dept: "Digital Operations", type: "Contractor", stakeholder: "Jorge Chavez", subDept: "AI", org: "Upwork", tier: "3" },
  { name: "Jorge Sosa", role: "AI Engineer", dept: "Digital Operations", type: "Contractor", stakeholder: "Isaias Zuñiga", subDept: "AI", org: "Upwork", tier: "3" },
  { name: "Steven Tan", role: "AI Engineer", dept: "Digital Operations", type: "Contractor", stakeholder: "Juan Camargo", subDept: "AI", org: "Upwork", tier: "3" },
  { name: "Prosper Odinakachukwu", role: "AI Engineer", dept: "Digital Operations", type: "Contractor", stakeholder: "Juan Camargo", subDept: "AI", org: "Upwork", tier: "3" },
  { name: "Jorge Chavez", role: "Team Lead", dept: "Digital Operations", type: "Contractor", stakeholder: "Isaias Zuñiga", subDept: "AI", org: "Upwork", tier: "3" },
  { name: "Juan Camargo", role: "Team Lead", dept: "Digital Operations", type: "Contractor", stakeholder: "Isaias Zuñiga", subDept: "AI", org: "Upwork", tier: "3" },
  { name: "Brandot Yarleque", role: "AI Engineer", dept: "Digital Operations", type: "Contractor", stakeholder: "Isaias Zuñiga", subDept: "AI", org: "Upwork", tier: "3" },
  { name: "Samuel Riveros", role: "Companion & Special Projects Dev. Manager", dept: "Digital Operations", type: "Contractor", stakeholder: "Ricky Kailiponi Jr.", subDept: "Companion & Special Projects", org: "Springboard", tier: "3" },
  { name: "Jacob Sanchez", role: "Companion Native Developer, Security Champion", dept: "Digital Operations", type: "Contractor", stakeholder: "Alirio Mieres", subDept: "Companion & Special Projects", org: "Upwork", tier: "3" },
  { name: "Valerie Sanchez", role: "Companion Web Developer", dept: "Digital Operations", type: "Contractor", stakeholder: "Ariel Sanchez", subDept: "Companion & Special Projects", org: "Upwork", tier: "3" },
  { name: "Michelle Gutierrez", role: "Companion Web Developer, Lead Designer", dept: "Digital Operations", type: "Contractor", stakeholder: "Ariel Sanchez", subDept: "Companion & Special Projects", org: "Upwork", tier: "3" },
  { name: "Timileyin Omikunle", role: "Developer, QA Champion", dept: "Digital Operations", type: "Contractor", stakeholder: "Gabriel Bolivar", subDept: "Companion & Special Projects", org: "Upwork", tier: "3" },
  { name: "Alirio Mieres", role: "Team Lead, Companion Web & Native Developer", dept: "Digital Operations", type: "Contractor", stakeholder: "Samuel Riveros", subDept: "Companion & Special Projects", org: "Upwork", tier: "3" },
  { name: "Ariel Sanchez", role: "Team Lead, Companion Web Developer", dept: "Digital Operations", type: "Contractor", stakeholder: "Samuel Riveros", subDept: "Companion & Special Projects", org: "Springboard", tier: "3" },
  { name: "Gabriel Bolivar", role: "Team Lead, QA & Documentation", dept: "Digital Operations", type: "Contractor", stakeholder: "Samuel Riveros", subDept: "Companion & Special Projects", org: "Springboard", tier: "3" },
  { name: "John Ayinde", role: "Team Lead", dept: "Digital Operations", type: "Contractor", stakeholder: "Sebastian Vargas", subDept: "D365 & Automation", org: "Springboard", tier: "3" },
  { name: "Sebastian Vargas", role: "D365 & Automation Dev. Manager", dept: "Digital Operations", type: "Contractor", stakeholder: "Ricky Kailiponi Jr.", subDept: "D365 & Automation", org: "Springboard", tier: "3" },
  { name: "Matias Gutierrez", role: "Team Lead", dept: "Digital Operations", type: "Contractor", stakeholder: "Sebastian Vargas", subDept: "D365 & Automation", org: "Springboard", tier: "3" },
  { name: "Elias Oyarzun", role: "PowerApps Developer", dept: "Digital Operations", type: "Contractor", stakeholder: "Matias Gutierrez", subDept: "D365 & Automation", org: "Upwork", tier: "3" },
  { name: "Ignacio Alvarez", role: "PowerApps Developer", dept: "Digital Operations", type: "Contractor", stakeholder: "Sebastian Vargas", subDept: "D365 & Automation", org: "Upwork", tier: "3" },
  { name: "Jose Sanchez", role: "PowerApps Developer", dept: "Digital Operations", type: "Contractor", stakeholder: "Matias Gutierrez", subDept: "D365 & Automation", org: "Upwork", tier: "3" },
  { name: "Rawin Olivera", role: "PowerApps Developer", dept: "Digital Operations", type: "Contractor", stakeholder: "Sebastian Vargas", subDept: "D365 & Automation", org: "Springboard", tier: "3" },
  { name: "Rene Sanchez", role: "PowerApps Developer", dept: "Digital Operations", type: "Contractor", stakeholder: "Sebastian Vargas", subDept: "D365 & Automation", org: "Upwork", tier: "3" },
  { name: "James De Guzman", role: "Analytics & Automation Specialist", dept: "Digital Operations", type: "Contractor", stakeholder: "Aitana Toscano", subDept: "Data", org: "Upwork", tier: "3" },
  { name: "Dulci Dos Santos", role: "Team Lead", dept: "Digital Operations", type: "Contractor", stakeholder: "Aitana Toscano", subDept: "Data", org: "Springboard", tier: "3" },
  { name: "Gonzalo Oyarzun", role: "Data Analyst & Reporting Specialist", dept: "Digital Operations", type: "Contractor", stakeholder: "Aitana Toscano", subDept: "Data", org: "Upwork", tier: "3" },
  { name: "Nefi Dorado", role: "Data Analyst & Reporting Specialist", dept: "Digital Operations", type: "Contractor", stakeholder: "Aitana Toscano", subDept: "Data", org: "Upwork", tier: "3" },
  { name: "Oluwatobi Makinde", role: "Data Analyst & Reporting Specialist", dept: "Digital Operations", type: "Contractor", stakeholder: "Aitana Toscano", subDept: "Data", org: "Upwork", tier: "3" },
  { name: "Goodness Okafor", role: "Data Pipeline Engineer", dept: "Digital Operations", type: "Contractor", stakeholder: "Dulci Dos Santos", subDept: "Data", org: "Upwork", tier: "3" },
  { name: "Matias Valenzuela", role: "ML Specialist (Predictive Models)", dept: "Digital Operations", type: "Contractor", stakeholder: "Aitana Toscano", subDept: "Data", org: "Springboard", tier: "3" },
  { name: "Jacob Adams", role: "Director of Digital Operations", dept: "Digital Operations", type: "Full-Time Employee", stakeholder: "VP of Student Services", subDept: "Department Leadership", org: "", tier: "" },
  { name: "Ricky Kailiponi Jr.", role: "Senior Manager of Digital Operations", dept: "Digital Operations", type: "Full-Time Employee", stakeholder: "Jacob Adams", subDept: "Department Leadership", org: "", tier: "" },
  { name: "Feyisayo Famakinde", role: "Azure Dev Ops Engineer", dept: "Digital Operations", type: "Contractor", stakeholder: "Ricky Kailiponi Jr.", subDept: "Dev-Ops", org: "Upwork", tier: "3" },
  { name: "Karina Vargas", role: "Project Manager", dept: "Digital Operations", type: "Contractor", stakeholder: "Ricky Kailiponi Jr.", subDept: "Project Management", org: "Upwork", tier: "3" },
  { name: "David Peck", role: "Operational Data Analyst", dept: "Digital Operations", type: "Full-Time Employee", stakeholder: "Joshua Stafford Hadden", subDept: "Systems & Operations", org: "", tier: "" },
  { name: "Pelenatita Neiufi", role: "Reporting & Evaluation Coordinator", dept: "Digital Operations", type: "Full-Time Employee", stakeholder: "Joshua Stafford Hadden", subDept: "Systems & Operations", org: "", tier: "" },
  { name: "Victor Lamôni Calado Ferreira", role: "System & Operations Associate Registrar", dept: "Digital Operations", type: "Full-Time Employee", stakeholder: "Joshua Stafford Hadden", subDept: "Systems & Operations", org: "", tier: "" },
  { name: "Joshua Stafford Hadden", role: "System & Operations Manager", dept: "Digital Operations", type: "Full-Time Employee", stakeholder: "Jacob Adams", subDept: "Systems & Operations", org: "", tier: "" },
  { name: "Terence Borjal", role: "Qualitative Researcher", dept: "Digital Operations", type: "Contractor", stakeholder: "Joshua Stafford Hadden", subDept: "Systems & Operations", org: "Springboard", tier: "3" },
  { name: "James Etukudo", role: "Project Manager", dept: "Enrollment & Retention", type: "Contractor", stakeholder: "Alison Cundiff", subDept: "Department Leadership", org: "Springboard", tier: "3" },
  { name: "Alison Cundiff", role: "Director of Enrollment & Retention", dept: "Enrollment & Retention", type: "Full-Time Employee", stakeholder: "VP of Student Services", subDept: "Department Leadership", org: "", tier: "" },
  { name: "Jose Escoto", role: "Enrollment Counseling Senior Manager", dept: "Enrollment & Retention", type: "Contractor", stakeholder: "Kathy Villeda", subDept: "Enrollment Counseling", org: "Springboard", tier: "3" },
  { name: "Rachel Kirk", role: "Enrollment Counseling Manager", dept: "Enrollment & Retention", type: "Full-Time Employee", stakeholder: "Alison Cundiff", subDept: "Enrollment Counseling", org: "", tier: "" },
  { name: "Kimarie Howard", role: "Enrollment Counseling Development & Performance Coordinator", dept: "Enrollment & Retention", type: "Part-Time Temporary", stakeholder: "Rachel Kirk", subDept: "Enrollment Counseling", org: "", tier: "" },
  { name: "Megan Niblett", role: "Enrollment Counseling Operations Coordinator", dept: "Enrollment & Retention", type: "Part-Time Temporary", stakeholder: "Rachel Kirk", subDept: "Enrollment Counseling", org: "", tier: "" },
  { name: "Shaunasee Janette James", role: "Enrollment Coordinator", dept: "Enrollment & Retention", type: "Full-Time Employee", stakeholder: "Trevor Shelton", subDept: "Enrollment Services", org: "", tier: "" },
  { name: "Ely Zmolek", role: "Enrollment Services Specialist", dept: "Enrollment & Retention", type: "Full-Time Employee", stakeholder: "Trevor Shelton", subDept: "Enrollment Services", org: "", tier: "" },
  { name: "Trevor Shelton", role: "Senior Manager of Enrollment Services", dept: "Enrollment & Retention", type: "Full-Time Employee", stakeholder: "Alison Cundiff", subDept: "Enrollment Services", org: "", tier: "" },
  { name: "Trey Mooney", role: "University Chaplain", dept: "Enrollment & Retention", type: "Full-Time Employee", stakeholder: "Alison Cundiff", subDept: "Enrollment Services", org: "", tier: "" },
  { name: "Peter Abarte", role: "Senior Manager-Mentoring", dept: "Enrollment & Retention", type: "Contractor", stakeholder: "Kelley Richardson", subDept: "Mentoring", org: "Springboard", tier: "3" },
  { name: "Kelley Richardson", role: "Mentoring Manager", dept: "Enrollment & Retention", type: "Full-Time Employee", stakeholder: "Alison Cundiff", subDept: "Mentoring", org: "", tier: "" },
  { name: "Mandy Schwab", role: "Mentor Development Specialist", dept: "Enrollment & Retention", type: "Part-Time Temporary", stakeholder: "Kelley Richardson", subDept: "Mentoring", org: "", tier: "" },
  { name: "Johanna Relkin", role: "Mentor Operations Specialist", dept: "Enrollment & Retention", type: "Part-Time Temporary", stakeholder: "Kelley Richardson", subDept: "Mentoring", org: "", tier: "" },
  { name: "Moses Abioye", role: "Project Manager", dept: "Records, Registration & Support", type: "Contractor", stakeholder: "Mark Gefrom", subDept: "Department Leadership", org: "Springboard", tier: "3" },
  { name: "Victor Oluwapelumi Elerunndu", role: "Project Manager", dept: "Records, Registration & Support", type: "Contractor", stakeholder: "Mark Gefrom", subDept: "Department Leadership", org: "Springboard", tier: "3" },
  { name: "Mark Gefrom", role: "Director of Student Records, Registration & Support", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "VP of Student Services", subDept: "Department Leadership", org: "", tier: "" },
  { name: "Kim Overdiek", role: "Associate Registrar (Curriculum & Configuration)", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Kari Johnson", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Tyson Bell", role: "Associate Registrar (Transcripts & Graduation)", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Kari Johnson", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Geraldine Susan Bean", role: "Graduation Coordinator", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Tyson Bell", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Cindi C Putnam", role: "Planning Coordinator", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Kim Overdiek", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Anne E. Owen", role: "Records & Transcript Coordinator", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Tyson Bell", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Kari Johnson", role: "Registrar", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Mark Gefrom", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Nikki Jane Chambers", role: "Enrollment Verification Specialist", dept: "Records, Registration & Support", type: "Full-Time Temporary", stakeholder: "Kim Overdiek", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Kira Hayes", role: "Consistency Coordinator (QA & Knowledge Base)", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Brad Lester", subDept: "Student Support", org: "", tier: "" },
  { name: "Brad Lester", role: "General Support Manager", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Mark Gefrom", subDept: "Student Support", org: "", tier: "" },
  { name: "Hilary Bagley", role: "Student Experience Coordinator", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Brad Lester", subDept: "Student Support", org: "", tier: "" },
  { name: "Alyssa Burrell", role: "Student Support Coordinator (Phone Support)", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Brad Lester", subDept: "Student Support", org: "", tier: "" },
  { name: "Adam Bradford", role: "Technical Support Engineer", dept: "Records, Registration & Support", type: "Contractor", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "Upwork", tier: "3" },
  { name: "Armen Wood", role: "Technical Support Engineer", dept: "Records, Registration & Support", type: "Contractor", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "Upwork", tier: "3" },
  { name: "Jackson Fonseca", role: "Technical Support Engineer", dept: "Records, Registration & Support", type: "Contractor", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "Springboard", tier: "3" },
  { name: "Miguel Figuereo", role: "Technical Support Engineer", dept: "Records, Registration & Support", type: "Contractor", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "Upwork", tier: "3" },
  { name: "Winner Aniekan Anietie", role: "Technical Support Engineer", dept: "Records, Registration & Support", type: "Contractor", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "Springboard", tier: "3" },
  { name: "Colby Warner", role: "Product Support Engineer", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "", tier: "" },
  { name: "Matthew Smith", role: "Technical Support Manager", dept: "Records, Registration & Support", type: "Full-Time Employee", stakeholder: "Mark Gefrom", subDept: "Technical Support", org: "", tier: "" },
  { name: "David De-Graft Koomson", role: "Ass. Project Manager", dept: "VP - Student Services", type: "Contractor", stakeholder: "Jess Swinburne", subDept: "Department Leadership", org: "Springboard", tier: "3" },
  { name: "Jess Swinburne", role: "Project Manager", dept: "VP - Student Services", type: "Contractor", stakeholder: "Ben Packer", subDept: "Department Leadership", org: "Springboard", tier: "3" },
];

/* ═══════════════ BYU-PATHWAY DEPT COLORS ═══════════════ */
window.DEPT_COLORS = {
  "Dean of Students":                 { bg: "#A2C23D", light: "#8aaa2e", pale: "#f2f7e6", r: "162,194,61" },
  "Digital Operations":               { bg: "#CB4A27", light: "#a83d20", pale: "#fbeee9", r: "203,74,39" },
  "Enrollment & Retention":           { bg: "#B687AC", light: "#9a6f90", pale: "#f5edf3", r: "182,135,172" },
  "Records, Registration & Support":  { bg: "#3A929D", light: "#2a7a84", pale: "#e8f4f5", r: "58,146,157" },
  "VP - Student Services":            { bg: "#FFC328", light: "#d4a020", pale: "#fff6d6", r: "255,195,40" },
};

window.TYPE_COLORS = {
  "Full-Time Employee":  "#065577",
  "Full-Time Temporary": "#28738A",
  "Part-Time Temporary": "#FFC328",
  "Contractor":          "#7F898A",
};
