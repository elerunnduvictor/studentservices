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
        { key: "okr",                    label: "OKR",                     type: "text",     width: 230 },
        { key: "key_result",             label: "Key Result",              type: "text",     width: 230 },
        { key: "sub_key_result",         label: "Sub-Key Result (Parent)", type: "text",     width: 300, required: true },
        { key: "sub_key_result_child",   label: "Sub-Key Result (Child)",  type: "text",     width: 190 },
        { key: "period",                 label: "Period",                  type: "text",     width: 120 },
        { key: "primary_stakeholder",    label: "Stakeholder",             type: "text",     width: 150 },
        { key: "secondary_stakeholders", label: "Leads",                   type: "text",     width: 190,
          help: "Comma-separated. Shown on the hub as separate people." },
        { key: "project_manager",        label: "Project Manager",         type: "text",     width: 150 },
        { key: "type",                   label: "Type",                    type: "text",     width: 150 },
        { key: "goal",                   label: "Goal",                    type: "percent",  width: 90 },
        { key: "stretch_goal",           label: "Stretch Goal",            type: "percent",  width: 100 },
        { key: "progress",               label: "Progress",                type: "percent",  width: 140, render: progressCell },
        { key: "status",                 label: "Status",                  type: "select",   width: 150, options: OKR_STATUS },
        { key: "trend",                  label: "Trend",                   type: "select",   width: 130, options: TREND },
        { key: "comment",                label: "Comment",                 type: "longtext", width: 300 },
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
        key: "employees",
        label: "Employee Directory",
        table: "employees",
        order: "sort_order.asc,id.asc",
        columns: [
          { key: "name",                  label: "Name",              type: "text",   width: 190, required: true },
          { key: "role",                  label: "Role",              type: "text",   width: 250 },
          { key: "department",            label: "Department",        type: "select", width: 220, options: DEPARTMENTS },
          { key: "employment_type",       label: "Employment Type",   type: "select", width: 180, options: EMPLOYMENT_TYPES },
          { key: "primary_stakeholder",   label: "Primary Stakeholder", type: "text", width: 175,
            help: "Who this person reports to. Drives the org chart." },
          { key: "sub_department",        label: "Sub Dept",          type: "text",   width: 180,
            help: "Also groups this person's KPIs on the scorecard." },
          { key: "contract_organization", label: "Contract Org",      type: "text",   width: 150 },
          { key: "tier",                  label: "Tier",              type: "text",   width: 70 },
          { key: "email",                 label: "Email",             type: "text",   width: 200 },
          { key: "active",                label: "Active",            type: "select", width: 90,
            options: [{ value: true, label: "Active", tone: "green" }, { value: false, label: "Inactive", tone: "grey" }],
            help: "Inactive people drop off the hub but stay on record." },
        ],
      },
      {
        key: "student_employees",
        label: "Student Employees",
        table: "student_employees",
        order: "sort_order.asc,id.asc",
        columns: [
          { key: "name",           label: "Employee Name", type: "text", width: 200, required: true },
          { key: "job_name",       label: "Job Name",      type: "text", width: 170 },
          { key: "role_title",     label: "Role Title",    type: "text", width: 220 },
          { key: "sub_department", label: "Sub-Dept",      type: "text", width: 200 },
          { key: "supervisor",     label: "Supervisor",    type: "text", width: 180 },
          { key: "department",     label: "Dept",          type: "select", width: 220, options: DEPARTMENTS },
        ],
      },
      {
        key: "org_chart_nodes",
        label: "Org Chart Info",
        table: "org_chart_nodes",
        order: "sort_order.asc,id.asc",
        columns: [
          { key: "name",                 label: "Name",                 type: "text",     width: 180, required: true },
          { key: "role",                 label: "Role",                 type: "text",     width: 240 },
          { key: "employee_status",      label: "Employee Status",      type: "text",     width: 130 },
          { key: "stewardships",         label: "Stewardships",         type: "longtext", width: 260 },
          { key: "key_kpis",             label: "Key KPIs",             type: "longtext", width: 260 },
          { key: "reports_to",           label: "Reports to",           type: "text",     width: 200 },
          { key: "department",           label: "Department",           type: "text",     width: 220 },
          { key: "link",                 label: "Role Inventory",       type: "url",      width: 120, linkLabel: "Open doc ↗" },
          { key: "key_responsibilities", label: "Key Responsibilities", type: "longtext", width: 300 },
          { key: "direct_reports",       label: "Direct Reports",       type: "longtext", width: 260 },
        ],
      },
    ],
  },

  /* ═══════════ 3. KPIs ═══════════ */
  kpis: {
    label: "KPIs",
    subtitle: "Student Services KPIs",
    accent: "kpis",
    sheets: [{
      key: "kpis",
      label: "KPI Scorecard",
      table: "kpis",
      order: "sort_order.asc,id.asc",
      columns: [
        { key: "employee",          label: "Employee",       type: "text",   width: 175 },
        { key: "role",              label: "Role",           type: "text",   width: 210 },
        { key: "department",        label: "Dept",           type: "text",   width: 200 },
        { key: "kpi_measure",       label: "KPI Measure",    type: "text",   width: 300, required: true },
        { key: "kpi_category",      label: "KPI Category",   type: "select", width: 175, options: KPI_CATEGORY },
        { key: "category_type",     label: "Category Type",  type: "select", width: 165, options: CATEGORY_TYPE },
        { key: "data_availability", label: "Data",           type: "text",   width: 130 },
        { key: "band_green",        label: "Green",          type: "text",   width: 120,
          help: 'e.g. "85-100%", "≥ 90%", "< 5 days"' },
        { key: "band_yellow",       label: "Yellow",         type: "text",   width: 120,
          help: "The anchor band — green and red sit beyond its two ends." },
        { key: "band_red",          label: "Red",            type: "text",   width: 120,
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
