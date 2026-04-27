import { useState, useMemo } from "react";

const EMPLOYEES = [
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
  { name: "Moses Abioye", role: "Project Manager", dept: "Student Records, Registration, and Support", type: "Contractor", stakeholder: "Mark Gefrom", subDept: "Department Leadership", org: "Springboard", tier: "3" },
  { name: "Victor Oluwapelumi Elerunndu", role: "Project Manager", dept: "Student Records, Registration, and Support", type: "Contractor", stakeholder: "Mark Gefrom", subDept: "Department Leadership", org: "Springboard", tier: "3" },
  { name: "Mark Gefrom", role: "Director of Student Records, Registration, and Support", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "VP of Student Services", subDept: "Department Leadership", org: "", tier: "" },
  { name: "Kim Overdiek", role: "Associate Registrar (Curriculum & Configuration)", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Kari Johnson", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Tyson Bell", role: "Associate Registrar (Transcripts & Graduation)", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Kari Johnson", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Geraldine Susan Bean", role: "Graduation Coordinator", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Tyson Bell", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Cindi C Putnam", role: "Planning Coordinator", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Kim Overdiek", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Anne E. Owen", role: "Records & Transcript Coordinator", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Tyson Bell", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Kari Johnson", role: "Registrar", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Mark Gefrom", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Nikki Jane Chambers", role: "Enrollment Verification Specialist", dept: "Student Records, Registration, and Support", type: "Full-Time Temporary", stakeholder: "Kim Overdiek", subDept: "Registrar's Office", org: "", tier: "" },
  { name: "Kira Hayes", role: "Consistency Coordinator (QA & Knowledge Base)", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Brad Lester", subDept: "Student Support", org: "", tier: "" },
  { name: "Brad Lester", role: "General Support Manager", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Mark Gefrom", subDept: "Student Support", org: "", tier: "" },
  { name: "Hilary Bagley", role: "Student Experience Coordinator", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Brad Lester", subDept: "Student Support", org: "", tier: "" },
  { name: "Alyssa Burrell", role: "Student Support Coordinator (Phone Support)", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Brad Lester", subDept: "Student Support", org: "", tier: "" },
  { name: "Adam Bradford", role: "Technical Support Engineer", dept: "Student Records, Registration, and Support", type: "Contractor", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "Upwork", tier: "3" },
  { name: "Armen Wood", role: "Technical Support Engineer", dept: "Student Records, Registration, and Support", type: "Contractor", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "Upwork", tier: "3" },
  { name: "Jackson Fonseca", role: "Technical Support Engineer", dept: "Student Records, Registration, and Support", type: "Contractor", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "Springboard", tier: "3" },
  { name: "Miguel Figuereo", role: "Technical Support Engineer", dept: "Student Records, Registration, and Support", type: "Contractor", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "Upwork", tier: "3" },
  { name: "Winner Aniekan Anietie", role: "Technical Support Engineer", dept: "Student Records, Registration, and Support", type: "Contractor", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "Springboard", tier: "3" },
  { name: "Colby Warner", role: "Product Support Engineer", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Matthew Smith", subDept: "Technical Support", org: "", tier: "" },
  { name: "Matthew Smith", role: "Technical Support Manager", dept: "Student Records, Registration, and Support", type: "Full-Time Employee", stakeholder: "Mark Gefrom", subDept: "Technical Support", org: "", tier: "" },
  { name: "David De-Graft Koomson", role: "Assistant Project Manager", dept: "VP - Student Services", type: "Contractor", stakeholder: "Jess Swinburne", subDept: "Department Leadership", org: "Springboard", tier: "3" },
  { name: "Jess Swinburne", role: "Project Manager", dept: "VP - Student Services", type: "Contractor", stakeholder: "Ben Packer", subDept: "Department Leadership", org: "Springboard", tier: "3" },
];

const DEPT_COLORS = {
  "Dean of Students": { bg: "#1B4F72", light: "#2980B9", pale: "#D6EAF8" },
  "Digital Operations": { bg: "#1A5276", light: "#2E86C1", pale: "#D4E6F1" },
  "Enrollment & Retention": { bg: "#145A32", light: "#27AE60", pale: "#D5F5E3" },
  "Student Records, Registration, and Support": { bg: "#7D3C98", light: "#A569BD", pale: "#EBDEF0" },
  "VP - Student Services": { bg: "#935116", light: "#CA6F1E", pale: "#FAE5D3" },
};

const TYPE_COLORS = {
  "Full-Time Employee": "#2196F3",
  "Full-Time Temporary": "#00BCD4",
  "Part-Time Temporary": "#FF9800",
  "Contractor": "#78909C",
};

function KPICard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "white",
      borderRadius: 12,
      padding: "20px 24px",
      borderLeft: `5px solid ${color}`,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      flex: 1,
      minWidth: 160,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: "#8395a7", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: "#1a1a2e", fontFamily: "'Playfair Display', serif", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#8395a7", marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, maxVal, colorMap }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map(({ label, value }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 180, fontSize: 12, fontWeight: 500, color: "#34495e", textAlign: "right", fontFamily: "'DM Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
          <div style={{ flex: 1, background: "#ecf0f1", borderRadius: 6, height: 26, position: "relative", overflow: "hidden" }}>
            <div style={{
              width: `${(value / maxVal) * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${colorMap?.[label]?.bg || "#2c3e50"}, ${colorMap?.[label]?.light || "#5d6d7e"})`,
              borderRadius: 6,
              transition: "width 0.6s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 8,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "white", fontFamily: "'DM Sans', sans-serif" }}>{value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2, cy = size / 2, r = size * 0.35, strokeW = size * 0.15;
  let cumulative = 0;
  const segments = data.map((d) => {
    const start = cumulative;
    cumulative += d.value / total;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const largeArc = d.value / total > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return { ...d, path: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}` };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((s, i) => (
          <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={strokeW} strokeLinecap="butt" />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 28, fontWeight: 700, fill: "#1a1a2e", fontFamily: "'Playfair Display', serif" }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 10, fill: "#8395a7", fontFamily: "'DM Sans', sans-serif" }}>Total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#34495e", fontFamily: "'DM Sans', sans-serif" }}>{d.label}: <b>{d.value}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedSubDept, setSelectedSubDept] = useState("All");

  const departments = ["All", ...new Set(EMPLOYEES.map(e => e.dept))];
  const employmentTypes = ["All", ...new Set(EMPLOYEES.map(e => e.type))];

  const filtered = useMemo(() => {
    return EMPLOYEES.filter(e => {
      if (selectedDept !== "All" && e.dept !== selectedDept) return false;
      if (selectedType !== "All" && e.type !== selectedType) return false;
      if (selectedSubDept !== "All" && e.subDept !== selectedSubDept) return false;
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.role.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [selectedDept, selectedType, selectedSubDept, search]);

  const subDepts = useMemo(() => {
    const base = selectedDept === "All" ? EMPLOYEES : EMPLOYEES.filter(e => e.dept === selectedDept);
    return ["All", ...new Set(base.map(e => e.subDept).filter(Boolean))];
  }, [selectedDept]);

  const deptCounts = useMemo(() => {
    const counts = {};
    filtered.forEach(e => { counts[e.dept] = (counts[e.dept] || 0) + 1; });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const typeCounts = useMemo(() => {
    const counts = {};
    filtered.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
    return Object.entries(counts).map(([label, value]) => ({ label, value, color: TYPE_COLORS[label] || "#95a5a6" }));
  }, [filtered]);

  const fte = filtered.filter(e => e.type === "Full-Time Employee").length;
  const contractors = filtered.filter(e => e.type === "Contractor").length;
  const maxDeptVal = Math.max(...deptCounts.map(d => d.value), 1);

  const selectStyle = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1.5px solid #d5dbdb",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    background: "white",
    color: "#2c3e50",
    cursor: "pointer",
    outline: "none",
    minWidth: 170,
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f0f3f5", minHeight: "100vh", padding: 0 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0c2340 0%, #1a3a5c 50%, #2c5282 100%)",
        padding: "28px 32px 24px",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎓</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", letterSpacing: 0.5 }}>BYU-Pathway Worldwide</h1>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>Student Services Organization Directory</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px 32px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Filters */}
        <div style={{
          background: "white",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#8395a7", textTransform: "uppercase", letterSpacing: 1, marginRight: 4 }}>Filters</div>
          <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setSelectedSubDept("All"); }} style={selectStyle}>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={selectedSubDept} onChange={e => setSelectedSubDept(e.target.value)} style={selectStyle}>
            {subDepts.map(d => <option key={d} value={d}>{d === "All" ? "All Sub-Departments" : d}</option>)}
          </select>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={selectStyle}>
            {employmentTypes.map(t => <option key={t} value={t}>{t === "All" ? "All Employment Types" : t}</option>)}
          </select>
          <input
            type="text"
            placeholder="Search name or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...selectStyle, flex: 1, minWidth: 200 }}
          />
          {(selectedDept !== "All" || selectedType !== "All" || selectedSubDept !== "All" || search) && (
            <button onClick={() => { setSelectedDept("All"); setSelectedType("All"); setSelectedSubDept("All"); setSearch(""); }}
              style={{ ...selectStyle, background: "#e74c3c", color: "white", border: "none", fontWeight: 600, cursor: "pointer", minWidth: "auto", padding: "8px 16px" }}>
              Clear
            </button>
          )}
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <KPICard label="Total Employees" value={filtered.length} sub={`of ${EMPLOYEES.length} in org`} color="#2c5282" />
          <KPICard label="Full-Time" value={fte} sub={`${Math.round(fte / filtered.length * 100 || 0)}% of filtered`} color="#2196F3" />
          <KPICard label="Contractors" value={contractors} sub={`${Math.round(contractors / filtered.length * 100 || 0)}% of filtered`} color="#78909C" />
          <KPICard label="Departments" value={new Set(filtered.map(e => e.dept)).size} color="#27AE60" />
        </div>

        {/* Charts Row */}
        <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 340, background: "white", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>Employees by Department</div>
            <BarChart data={deptCounts} maxVal={maxDeptVal} colorMap={DEPT_COLORS} />
          </div>
          <div style={{ flex: 1, minWidth: 280, background: "white", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>Employment Type Breakdown</div>
            <DonutChart data={typeCounts} />
          </div>
        </div>

        {/* Directory Table */}
        <div style={{ background: "white", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #ecf0f1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", fontFamily: "'Playfair Display', serif" }}>Employee Directory</div>
            <div style={{ fontSize: 12, color: "#8395a7" }}>Showing {filtered.length} of {EMPLOYEES.length}</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  {["Name", "Role", "Department", "Sub-Dept", "Type", "Reports To"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#5d6d7e", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: "2px solid #e8ecef" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f2f4f6", transition: "background 0.15s" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1a1a2e" }}>{e.name}</td>
                    <td style={{ padding: "10px 14px", color: "#34495e" }}>{e.role}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: DEPT_COLORS[e.dept]?.pale || "#eee",
                        color: DEPT_COLORS[e.dept]?.bg || "#333",
                      }}>{e.dept}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#5d6d7e", fontSize: 12 }}>{e.subDept}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 600,
                        color: TYPE_COLORS[e.type] || "#666",
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: TYPE_COLORS[e.type] || "#999" }} />
                        {e.type}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#5d6d7e", fontSize: 12 }}>{e.stakeholder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
