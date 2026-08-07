/* ═══════════════════════════════════════════════════════════════════════════
   WORKBOOK SCHEMA

   Declares the three workbooks a PM works in and, inside each, the sheets that
   map one-to-one onto database tables. Column order, labels and widths mirror
   the spreadsheets these replace, so someone who knows the sheet knows the app.

   A column is:
     key       database column
     label     header text (the spreadsheet's wording, not the column name)
     type      text | longtext | number | percent | date | select | url
     width     px
     options   for select — { value, label, tone, glyph }
     readOnly  computed or system-managed
     help      tooltip
   ═══════════════════════════════════════════════════════════════════════════ */

const OKR_STATUS = [
  { value: "On Track",            label: "On Track",            tone: "green" },
  { value: "At Risk",             label: "At Risk",             tone: "yellow" },
  { value: "Delayed",             label: "Delayed",             tone: "yellow" },
  { value: "In Trouble",          label: "In Trouble",          tone: "red" },
  { value: "Completed - On time", label: "Completed - On time", tone: "accent" },
  { value: "Completed - Late",    label: "Completed - Late",    tone: "accent" },
  { value: "Not Started",         label: "Not Started",         tone: "grey" },
  { value: "Canceled",            label: "Canceled",            tone: "grey" },
];

const TREND = [
  { value: "Trending up",   label: "Trending up",   tone: "green" },
  { value: "Maintaining",   label: "Maintaining",   tone: "grey" },
  { value: "Trending down", label: "Trending down", tone: "red" },
];

const EMPLOYMENT_TYPES = [
  { value: "Full-Time Employee",     label: "Full-Time Employee",     tone: "accent" },
  { value: "Full-Time Temporary",    label: "Full-Time Temporary",    tone: "grey" },
  { value: "Part-Time Temporary",    label: "Part-Time Temporary",    tone: "grey" },
  { value: "Professional Contractor", label: "Professional Contractor", tone: "grey" },
  { value: "Student Employee",       label: "Student Employee",       tone: "grey" },
];

const DEPARTMENTS = [
  "Dean of Students",
  "Digital Operations",
  "Enrollment & Retention",
  "Student Records, Registration, and Support",
].map((d) => ({ value: d, label: d }));

/**
 * A department tab from the Org Directory workbook.
 *
 * The workbook has one tab per department listing that department's people.
 * Those tabs hold nobody the Employee Directory does not already have — all 105
 * were checked — so rather than four more tables that could drift apart from
 * each other, each is the same `employees` table narrowed to one department.
 * Edit someone here and you have edited them everywhere.
 *
 * `seed` matters: without it a person added on a department tab would be saved
 * with no department and disappear from the tab they were just typed into.
 */
const departmentSheet = (key, label, department) => ({
  key,
  label,
  table: "employees",
  order: "sort_order.asc,id.asc",
  filter: { department: `eq.${department}` },
  seed: { department },
  // The same five columns the workbook tab shows, in the workbook's order.
  columns: [
    { key: "name",                label: "Name",                type: "text", width: 135, required: true },
    { key: "role",                label: "Role",                type: "text", width: 175 },
    { key: "sub_department",      label: "Sub Dept",            type: "text", width: 140,
      help: "Also groups this person's KPIs on the scorecard." },
    { key: "primary_stakeholder", label: "Primary Stakeholder", type: "text", width: 145,
      help: "Who this person reports to. Drives the org chart." },
    { key: "employment_type",     label: "Employment Type",     type: "select", width: 140,
      options: EMPLOYMENT_TYPES },
  ],
});

/**
 * A department tab from the KPIs workbook.
 *
 * These are the opposite case to the directory tabs: a matrix of employee
 * against outcome category, holding KPI wording that never reached the
 * ScoreCard. Real content, so it has its own table and is kept as written —
 * multi-line cells and all.
 */
const kpiMatrixSheet = (key, label, department) => ({
  key,
  label,
  table: "department_kpi_matrix",
  order: "sort_order.asc,id.asc",
  filter: { department: `eq.${department}` },
  seed: { department },
  columns: [
    // The workbook shades this block gold under an "Employee Information"
    // banner, marking who the row is about as against what is measured on it.
    { key: "employee_name",        label: "Employee Name",     type: "text",     width: 140, required: true, tone: "gold" },
    { key: "role",                 label: "Role",              type: "text",     width: 165, tone: "gold" },
    { key: "employment_status",    label: "Employment Status", type: "text",     width: 105, tone: "gold" },
    { key: "stewardship",          label: "Stewardship",       type: "longtext", width: 210, tone: "gold" },
    { key: "speed",                label: "Speed",             type: "longtext", width: 165,
      help: "Operational Outcomes — promptness of execution." },
    { key: "quality",              label: "Quality",           type: "longtext", width: 165,
      help: "Operational Outcomes — accuracy and satisfaction." },
    { key: "cost",                 label: "Cost",              type: "longtext", width: 150,
      help: "Operational Outcomes — cost control and scalability." },
    { key: "student_autonomy",     label: "Student Autonomy",  type: "longtext", width: 160,
      help: "Student Outcomes — students not needing the home office." },
    { key: "student_satisfaction", label: "Student Satisfaction", type: "longtext", width: 160,
      help: "Student Outcomes — satisfaction with the service." },
    { key: "completion",           label: "Completion",        type: "longtext", width: 155,
      help: "Student Outcomes — retention and credential completion." },
  ],
});

const TRACKING = [
  { value: "Tracking",     label: "Tracking",     tone: "green" },
  { value: "Not Tracking", label: "Not Tracking", tone: "grey" },
];

const KPI_CATEGORY = [
  { value: "Operational Outcomes", label: "Operational Outcomes" },
  { value: "Student Outcomes",     label: "Student Outcomes" },
];

const CATEGORY_TYPE = [
  "Speed", "Quality", "Cost",
  "Student Autonomy", "Student Satisfaction", "Completion",
].map((t) => ({ value: t, label: t }));

const FREQUENCY = ["Weekly", "Bi-Weekly", "Monthly", "Quarterly", "Term", "Annually"]
  .map((f) => ({ value: f, label: f }));

/* Live colour preview — the same rule the scorecard uses, so a PM sees the
   consequence of a value the moment they type it. */
function statusCell(_value, row) {
  const span = document.createElement("span");
  span.className = "cell";
  if (String(row.tracking_status || "").toLowerCase() !== "tracking") {
    span.innerHTML = '<span class="pill grey">Not tracked</span>';
    return span;
  }
  const ev = window.SS.kpiStatus.evaluate(row);
  const tone = { Green: "green", Yellow: "yellow", Red: "red" }[ev.status] || "grey";
  const glyph = { Green: "✓", Yellow: "▲", Red: "✕", "Manual Review": "◐", "No Data": "◌" }[ev.status] || "";
  span.innerHTML =
    `<span class="pill ${tone}"><span class="glyph">${glyph}</span>${ev.status}</span>`;
  if (ev.bandNote) span.title = "Band definition corrected: " + ev.bandNote;
  return span;
}

function progressCell(value, row) {
  const span = document.createElement("span");
  if (value === null || value === undefined || value === "") {
    span.className = "cell muted"; span.textContent = "—"; return span;
  }
  const n = Number(value);
  const isCount = row.type && /#/.test(row.type);
  const pct = isCount ? null : Math.round(n * 1000) / 10;
  const wrap = document.createElement("span");
  wrap.className = "bar";
  const track = document.createElement("span"); track.className = "bar-track";
  const fill = document.createElement("span"); fill.className = "bar-fill";
  fill.style.width = Math.max(0, Math.min(100, isCount ? 100 : pct)) + "%";
  track.append(fill);
  const val = document.createElement("span"); val.className = "bar-val";
  val.textContent = isCount ? String(n) : pct + "%";
  wrap.append(track, val);
  return wrap;
}

window.SS = window.SS || {};
window.SS.WORKBOOKS = {
  /* ═══════════ 1. OKRs ═══════════ */
  okrs: {
    label: "OKRs",
    subtitle: "Profit.co Monthly Reports",
    accent: "okrs",
    sheets: [{
      key: "okrs",
      label: "Sub-Key Results",
      table: "okrs",
      order: "sort_order.asc,id.asc",
      columns: [
        { key: "okr",                    label: "OKR",                     type: "text",     width: 215 },
        { key: "key_result",             label: "Key Result",              type: "text",     width: 215 },
        { key: "sub_key_result",         label: "Sub-Key Result (Parent)", type: "text",     width: 195, required: true },
        { key: "sub_key_result_child",   label: "Sub-Key Result (Child)",  type: "text",     width: 124 },
        { key: "period",                 label: "Period",                  type: "text",     width: 120 },
        { key: "primary_stakeholder",    label: "Stakeholder",             type: "text",     width: 150 },
        { key: "secondary_stakeholders", label: "Leads",                   type: "text",     width: 124,
          help: "Comma-separated. Shown on the hub as separate people." },
        { key: "project_manager",        label: "Project Manager",         type: "text",     width: 150 },
        { key: "type",                   label: "Type",                    type: "text",     width: 150 },
        { key: "goal",                   label: "Goal",                    type: "percent",  width: 90 },
        { key: "stretch_goal",           label: "Stretch Goal",            type: "percent",  width: 100 },
        { key: "progress",               label: "Progress",                type: "percent",  width: 140, render: progressCell },
        { key: "status",                 label: "Status",                  type: "select",   width: 150, options: OKR_STATUS },
        { key: "trend",                  label: "Trend",                   type: "select",   width: 130, options: TREND },
        { key: "comment",                label: "Comment",                 type: "longtext", width: 380 },
        { key: "update_date",            label: "Update Date",             type: "date",     width: 120 },
      ],
    }],
  },

  /* ═══════════ 2. Directory ═══════════ */
  directory: {
    label: "Directory",
    subtitle: "Student Services Org Directory",
    accent: "directory",
    sheets: [
      {
        // The workbook's Dashboard is a pivot driven by two dropdowns. Here it
        // is the same summary read straight from the data, so it cannot fall
        // out of step with the tabs beside it.
        key: "dashboard",
        label: "Dashboard",
        table: "v_hub_departments",
        order: "sort_order.asc",
        readOnly: true,
        columns: [
          { key: "name",             label: "Department",           type: "text",     width: 210, readOnly: true },
          { key: "staff_count",      label: "Employees",            type: "number",   width: 100, readOnly: true },
          { key: "contractor_count", label: "Student Contractors",  type: "number",   width: 130, readOnly: true },
          { key: "description",      label: "What the department does", type: "longtext", width: 420, readOnly: true },
        ],
      },
      {
        key: "employees",
        label: "Employee Directory",
        table: "employees",
        order: "sort_order.asc,id.asc",
        columns: [
          { key: "name",                  label: "Name",              type: "text",   width: 124, required: true },
          { key: "role",                  label: "Role",              type: "text",   width: 162 },
          { key: "department",            label: "Department",        type: "select", width: 143, options: DEPARTMENTS },
          { key: "employment_type",       label: "Employment Type",   type: "select", width: 117, options: EMPLOYMENT_TYPES },
          { key: "primary_stakeholder",   label: "Primary Stakeholder", type: "text", width: 115,
            help: "Who this person reports to. Drives the org chart." },
          { key: "sub_department",        label: "Sub Dept",          type: "text",   width: 117,
            help: "Also groups this person's KPIs on the scorecard." },
          { key: "contract_organization", label: "Contract Org",      type: "text",   width: 150 },
          { key: "tier",                  label: "Tier",              type: "text",   width: 70 },
          { key: "email",                 label: "Email",             type: "text",   width: 130 },
          { key: "active",                label: "Active",            type: "select", width: 90,
            options: [{ value: true, label: "Active", tone: "green" }, { value: false, label: "Inactive", tone: "grey" }],
            help: "Inactive people drop off the hub but stay on record." },
        ],
      },
      // The four department tabs, in the workbook's order.
      departmentSheet("dept_digital",    "Digital Operations",             "Digital Operations"),
      departmentSheet("dept_dean",       "Dean of Students",               "Dean of Students"),
      departmentSheet("dept_enrollment", "Enrollment & Retention",         "Enrollment & Retention"),
      departmentSheet("dept_records",    "Records, Registration & Support",
                      "Student Records, Registration, and Support"),
      {
        key: "student_employees",
        label: "Student Employees",
        table: "student_employees",
        order: "sort_order.asc,id.asc",
        columns: [
          { key: "name",           label: "Employee Name", type: "text", width: 130, required: true },
          { key: "job_name",       label: "Job Name",      type: "text", width: 115 },
          { key: "role_title",     label: "Role Title",    type: "text", width: 143 },
          { key: "sub_department", label: "Sub-Dept",      type: "text", width: 130 },
          { key: "supervisor",     label: "Supervisor",    type: "text", width: 117 },
          { key: "department",     label: "Dept",          type: "select", width: 143, options: DEPARTMENTS },
        ],
      },
      {
        key: "org_chart_nodes",
        label: "Org Chart Info",
        table: "org_chart_nodes",
        order: "sort_order.asc,id.asc",
        columns: [
          { key: "name",                 label: "Name",                 type: "text",     width: 117, required: true },
          { key: "role",                 label: "Role",                 type: "text",     width: 156 },
          { key: "employee_status",      label: "Employee Status",      type: "text",     width: 130 },
          { key: "stewardships",         label: "Stewardships",         type: "longtext", width: 169 },
          { key: "key_kpis",             label: "Key KPIs",             type: "longtext", width: 169 },
          { key: "reports_to",           label: "Reports to",           type: "text",     width: 130 },
          { key: "department",           label: "Department",           type: "text",     width: 143 },
          { key: "link",                 label: "Role Inventory",       type: "url",      width: 120, linkLabel: "Open doc ↗" },
          { key: "key_responsibilities", label: "Key Responsibilities", type: "longtext", width: 195 },
          { key: "direct_reports",       label: "Direct Reports",       type: "longtext", width: 169 },
        ],
      },
    ],
  },

  /* ═══════════ 3. KPIs ═══════════ */
  kpis: {
    label: "KPIs",
    subtitle: "Student Services KPIs",
    accent: "kpis",
    sheets: [
    {
      // The workbook's Overview tab: what Speed, Quality, Cost, Autonomy,
      // Satisfaction and Completion actually mean. The scorecard has always
      // grouped by these six without recording their definitions anywhere.
      key: "kpi_overview",
      label: "Overview",
      table: "kpi_categories",
      order: "sort_order.asc",
      readOnly: true,
      columns: [
        { key: "outcome_group", label: "Outcome Group", type: "text",     width: 150, readOnly: true },
        { key: "name",          label: "Category",      type: "text",     width: 150, readOnly: true },
        { key: "definition",    label: "Definition",    type: "longtext", width: 340, readOnly: true },
        { key: "examples",      label: "Examples",      type: "longtext", width: 300, readOnly: true },
      ],
    },
    kpiMatrixSheet("kpim_dean",       "Dean of Students",       "Dean of Students"),
    kpiMatrixSheet("kpim_digital",    "Digital Ops",            "Digital Operations"),
    kpiMatrixSheet("kpim_enrollment", "Enrollment & Retention", "Enrollment & Retention"),
    kpiMatrixSheet("kpim_records",    "Records, Registration & Support",
                   "Student Records, Registration, and Support"),
    {
      // The 2025 Baseline tab — the reasoning a KPI came out of. Kept editable
      // because it is a living planning document, not a fixed reference.
      key: "kpi_baselines",
      label: "2025 Baselines",
      table: "kpi_baselines",
      order: "sort_order.asc,id.asc",
      columns: [
        { key: "employee_name",          label: "Employee Name",          type: "text",     width: 140, required: true },
        { key: "role",                   label: "Role",                   type: "text",     width: 160 },
        { key: "department",             label: "Department",             type: "text",     width: 130 },
        { key: "scheduling",             label: "Scheduling",             type: "text",     width: 120,
          help: "Whether the baseline conversation with this person has happened." },
        { key: "key_responsibilities",   label: "Key Responsibilities",   type: "longtext", width: 220 },
        { key: "current_projects",       label: "Current Projects",       type: "longtext", width: 200 },
        { key: "conditions_for_success", label: "Conditions for Success", type: "longtext", width: 200 },
        { key: "current_kpis",           label: "Current KPIs",           type: "longtext", width: 190 },
        { key: "suggested_kpis",         label: "Suggested KPIs",         type: "longtext", width: 190 },
        { key: "data_source",            label: "Data Source",            type: "longtext", width: 180 },
        { key: "timeframe",              label: "Timeframe",              type: "text",     width: 130 },
      ],
    },
    {
      key: "kpis",
      label: "KPI ScoreCard",
      table: "kpis",
      order: "sort_order.asc,id.asc",
      columns: [
        { key: "employee",          label: "Employee",       type: "text",   width: 115 },
        { key: "role",              label: "Role",           type: "text",   width: 136 },
        { key: "department",        label: "Dept",           type: "text",   width: 130 },
        { key: "kpi_measure",       label: "KPI Measure",    type: "text",   width: 195, required: true },
        { key: "kpi_category",      label: "KPI Category",   type: "select", width: 115, options: KPI_CATEGORY },
        { key: "category_type",     label: "Category Type",  type: "select", width: 115, options: CATEGORY_TYPE },
        { key: "data_availability", label: "Data",           type: "text",   width: 130 },
        { key: "band_green",        label: "Green",          type: "text",   width: 120, tone: "green",
          help: 'e.g. "85-100%", "≥ 90%", "< 5 days"' },
        { key: "band_yellow",       label: "Yellow",         type: "text",   width: 120, tone: "yellow",
          help: "The anchor band — green and red sit beyond its two ends." },
        { key: "band_red",          label: "Red",            type: "text",   width: 120, tone: "red",
          help: 'e.g. "Below 70%", "> 7 days"' },
        { key: "tracking_status",   label: "Tracking",       type: "select", width: 130, options: TRACKING,
          help: "Only Tracking rows appear on the hub's KPI Scorecard." },
        { key: "current_value",     label: "Current Value",  type: "text",   width: 120,
          help: 'A number (0.93) or a measurement ("3 minutes").' },
        { key: "__status",          label: "Colour",         type: "text",   width: 140, readOnly: true, virtual: true,
          render: statusCell,
          help: "Computed live from the bands above — not stored, never stale." },
        { key: "data_source",       label: "Data Source",    type: "url",    width: 110, linkLabel: "Report ↗" },
        { key: "update_frequency",  label: "Update Freq.",   type: "select", width: 130, options: FREQUENCY },
        { key: "update_date",       label: "Update Date",    type: "date",   width: 120 },
      ],
    }],
  },
};
