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
     check     (value, row) => message | null — flags a value that will not do
               what the person entering it expects; does not block saving
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── the reporting line ────────────────────────────────────────────────────
   Who someone reports to is stored as their manager's name, typed by hand, and
   nothing ever checked that the name belonged to anybody. It usually did. When
   it did not the consequence was invisible: `hub_subtree()` joins on
   lower(primary_stakeholder) = lower(name), so a near miss simply matched no
   one and that person disappeared from their manager's view — no error, no
   empty state, nothing to notice. "Anne E Owen" for "Anne E. Owen" cost four
   people; "Aitana Toscano" for "Aitana Nathaly Toscano Cedeño" cost six.

   The roster below is the set of names that actually exist, so a name that
   matches nobody can be marked at the moment it is typed. The comparison is
   deliberately the same one the database makes — trim and lowercase, nothing
   cleverer — because a check that is more forgiving than the query it stands
   in for would call the broken value fine. Punctuation-insensitive matching is
   used only to suggest what was probably meant. */
const ROSTER = { names: new Map(), loaded: false, promise: null };

/** Exactly what the database compares. */
const rosterKey = (s) => String(s == null ? "" : s).trim().toLowerCase();
/** Looser, for "did you mean…" only — never for deciding correctness.
 *  Accents are folded so "Cedeno" can still find "Cedeño". */
const rosterLoose = (s) => rosterKey(s)
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "");
/** The words of a name, folded the same way. */
const rosterWords = (s) => rosterKey(s)
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Levenshtein distance, abandoned once it passes `cap`.
 *
 * The cap is the point: a name twelve edits away is not a typo, and stopping
 * early keeps this from scanning the whole roster properly for values that were
 * never close to anything.
 */
function editDistance(a, b, cap) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (row[j] < rowMin) rowMin = row[j];
    }
    if (rowMin > cap) return cap + 1;          // no better result is possible
    prev = row;
  }
  return prev[b.length];
}

function loadRoster() {
  if (ROSTER.promise) return ROSTER.promise;
  ROSTER.promise = (async () => {
    // Only the names, and only the people the hub still shows.
    const rows = await SS.db.select("employees", { select: "name,active" });
    rows.forEach((r) => {
      if (r && r.name && r.active !== false) ROSTER.names.set(rosterKey(r.name), r.name);
    });
    ROSTER.loaded = true;
  })().catch(() => { ROSTER.loaded = false; });   // offline: flag nothing
  return ROSTER.promise;
}

/**
 * Flag a manager's name that matches nobody on the roster.
 *
 * Silent until the roster has actually loaded, so a slow or failed request
 * shows an unmarked sheet rather than every cell marked wrong.
 */
function checkReportsTo(value) {
  if (!ROSTER.loaded) return null;
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return null;                       // blank is legitimate — the top of a tree
  if (ROSTER.names.has(rosterKey(raw))) return null;

  const loose = rosterLoose(raw);
  let suggestion = null;
  for (const real of ROSTER.names.values()) {
    if (rosterLoose(real) === loose) { suggestion = real; break; }
  }
  if (!suggestion) {
    // Every word typed is part of the real name — which is how the two costly
    // ones read: "Aitana Toscano" for "Aitana Nathaly Toscano Cedeño", and
    // "Shaunasee James" for "Shaunasee Janette James". Only offered when it
    // points at exactly one person, so a common surname suggests nothing.
    const typed = rosterWords(raw);
    if (typed.length) {
      const hits = [...ROSTER.names.values()].filter((real) => {
        const words = rosterWords(real);
        return typed.every((t) => words.includes(t));
      });
      if (hits.length === 1) suggestion = hits[0];
    }
  }
  if (!suggestion) {                            // a fragment of a single name
    const hits = [...ROSTER.names.values()].filter((real) => rosterLoose(real).includes(loose));
    if (hits.length === 1) suggestion = hits[0];
  }
  if (!suggestion) {
    // A slip of the fingers — "Brad Lestre" for "Brad Lester". Only a very near
    // miss counts, and only when one name is nearer than every other, so this
    // never guesses between two colleagues with similar names. Reached only
    // once a value has already failed, so the cost falls on the rare cell.
    let best = null, bestD = Infinity, tie = false;
    for (const real of ROSTER.names.values()) {
      const d = editDistance(loose, rosterLoose(real), 2);
      if (d < bestD) { bestD = d; best = real; tie = false; }
      else if (d === bestD) tie = true;
    }
    if (best && bestD <= 2 && !tie) suggestion = best;
  }
  return suggestion
    ? `No one in the directory is called "${raw}". Did you mean "${suggestion}"? ` +
      "Until this matches a real name exactly, this person will not appear in their manager's view."
    : `No one in the directory is called "${raw}", so this person will not appear ` +
      "in their manager's view. Check the spelling against the Employee Directory tab.";
}

const OKR_STATUS = [
  { value: "On Track",            label: "On Track",            tone: "green" },
  { value: "At Risk",             label: "At Risk",             tone: "yellow" },
  { value: "Delayed",             label: "Delayed",             tone: "yellow" },
  { value: "In Trouble",          label: "In Trouble",          tone: "red" },
  { value: "Completed - On time", label: "Completed - On time", tone: "accent" },
  { value: "Completed - Late",    label: "Completed - Late",    tone: "accent" },
  { value: "Not Started",         label: "Not Started",         tone: "grey" },
  { value: "Archived",            label: "Archived",            tone: "grey" },
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
 * The four sub-tabs a department page is divided into.
 *
 * A department is no longer one list of everybody. It is the same `employees`
 * table narrowed twice — to the department, then to a kind of employment — plus
 * its student employees, which live in their own table entirely. Splitting the
 * sheet rather than the data means a person edited here is the same row as
 * everywhere else; there is still exactly one record per person.
 *
 * "Temporary" deliberately covers both Full-Time and Part-Time Temporary. Given
 * as four categories, the part-timers had nowhere to go, and three people would
 * have quietly stopped appearing anywhere in the hub. The Employment Type
 * column stays visible inside every tab, so which kind of temporary someone is
 * remains legible — and so anyone can be moved between tabs by editing it.
 *
 * `seed` matters: without it a person added on a sub-tab would save with no
 * department or type and vanish from the tab they were just typed into.
 */
const PEOPLE_COLUMNS = [
  { key: "name",                label: "Name",                type: "text", width: 135, required: true },
  { key: "role",                label: "Role",                type: "text", width: 175 },
  { key: "sub_department",      label: "Sub Dept",            type: "text", width: 140,
    help: "Also groups this person's KPIs on the scorecard." },
  { key: "primary_stakeholder", label: "Primary Stakeholder", type: "text", width: 145,
    help: "Who this person reports to. Drives the org chart, and who their " +
          "manager can see on the hub. Must match a name in the Employee " +
          "Directory exactly.",
    check: checkReportsTo },
  { key: "employment_type",     label: "Employment Type",     type: "select", width: 140,
    options: EMPLOYMENT_TYPES,
    help: "Changing this moves the person to the matching tab." },
];

/* Student employees sit in their own table and carry their own status. Setting
   someone Inactive is how they leave the Active tab and appear under Archived —
   the row is never deleted, so a returning student keeps their history. */
const STUDENT_STATUS = [
  { value: true,  label: "Active",   tone: "green" },
  { value: false, label: "Inactive", tone: "grey" },
];

const STUDENT_COLUMNS = [
  { key: "name",           label: "Employee Name", type: "text", width: 130, required: true },
  { key: "job_name",       label: "Job Name",      type: "text", width: 115 },
  { key: "role_title",     label: "Role Title",    type: "text", width: 143 },
  { key: "sub_department", label: "Sub-Dept",      type: "text", width: 130 },
  { key: "supervisor",     label: "Supervisor",    type: "text", width: 117,
    help: "Must match a name in a department's staff tabs exactly.",
    check: checkReportsTo },
  { key: "active",         label: "Status",        type: "select", width: 105,
    options: STUDENT_STATUS,
    help: "Set to Inactive to move this student to the Archived tab." },
];

const TEMPORARY_TYPES = ["Full-Time Temporary", "Part-Time Temporary"];

const departmentSheets = (key, label, department) => [
  {
    key: key + "_fte", group: key, groupLabel: label, label: "FTE",
    table: "employees", order: "sort_order.asc,id.asc",
    filter: { department: `eq.${department}`, employment_type: "eq.Full-Time Employee" },
    seed: { department, employment_type: "Full-Time Employee" },
    columns: PEOPLE_COLUMNS,
  },
  {
    key: key + "_temp", group: key, groupLabel: label, label: "Temporary",
    table: "employees", order: "sort_order.asc,id.asc",
    // Both temporary kinds. Quoted because PostgREST treats a bare comma inside
    // in.() as a value separator.
    filter: { department: `eq.${department}`,
              employment_type: `in.(${TEMPORARY_TYPES.map((t) => `"${t}"`).join(",")})` },
    seed: { department, employment_type: "Full-Time Temporary" },
    columns: PEOPLE_COLUMNS,
  },
  {
    key: key + "_contract", group: key, groupLabel: label, label: "Professional Contractors",
    table: "employees", order: "sort_order.asc,id.asc",
    filter: { department: `eq.${department}`, employment_type: "eq.Professional Contractor" },
    seed: { department, employment_type: "Professional Contractor" },
    columns: PEOPLE_COLUMNS,
  },
  {
    key: key + "_students", group: key, groupLabel: label, label: "Student Employees",
    // A different table, not a different filter on the same one.
    table: "student_employees", order: "sort_order.asc,id.asc",
    filter: { department: `eq.${department}`, active: "eq.true" },
    seed: { department, active: true },
    columns: STUDENT_COLUMNS,
  },
];

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
        { key: "sub_key_result",         label: "Sub-Key Result (Parent)", type: "text",     width: 260, required: true },
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
        { key: "comment",                label: "Comment",                 type: "longtext", width: 560 },
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
        // Rows and columns told you nothing you could see at a glance. The hub's
        // own directory page already answers "how big is each department, and
        // of what" in charts, from this same data — so it is drawn here rather
        // than invented twice.
        key: "dashboard",
        label: "Dashboard",
        // Looked up when the sheet is opened, not when this file loads: the
        // other PM pages share this schema without loading dashboard.js, and a
        // bare identifier there would be a ReferenceError that took the whole
        // console down rather than one sheet.
        render: (host) => window.renderWorkforceDashboard(host),
        readOnly: true,
      },
      // One page per department, each split by kind of employment. The
      // Employee Directory tab is gone: it listed all 108 staff in one sheet,
      // which is the thing these four tabs exist to break up. Nobody was
      // removed — every person still appears, on their department's page.
      ...departmentSheets("dept_digital",    "Digital Operations",     "Digital Operations"),
      ...departmentSheets("dept_dean",       "Dean of Students",       "Dean of Students"),
      ...departmentSheets("dept_enrollment", "Enrollment & Retention", "Enrollment & Retention"),
      ...departmentSheets("dept_records",    "Records, Registration & Support",
                          "Student Records, Registration, and Support"),
      // Every student employee, across all departments, split by status. The
      // same rows also appear on their own department's Student Employees tab.
      {
        key: "students_active", group: "students", groupLabel: "Student Employees",
        label: "Active",
        table: "student_employees", order: "sort_order.asc,id.asc",
        filter: { active: "eq.true" },
        seed: { active: true },
        columns: STUDENT_COLUMNS.concat(
          [{ key: "department", label: "Dept", type: "select", width: 143, options: DEPARTMENTS }]),
      },
      {
        key: "students_archived", group: "students", groupLabel: "Student Employees",
        label: "Archived",
        table: "student_employees", order: "sort_order.asc,id.asc",
        filter: { active: "eq.false" },
        // Kept editable rather than read-only: setting someone back to Active
        // is how a returning student comes off this tab.
        seed: { active: false },
        columns: STUDENT_COLUMNS.concat(
          [{ key: "department", label: "Dept", type: "select", width: 143, options: DEPARTMENTS }]),
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

  /* ═══════════ 4. Admin ═══════════
     Who may see the hub, and how it is being used. Its own workbook rather than
     a tab inside KPIs: this is about the application, not about the work the
     organisation is measuring, and burying it under KPIs made it look like
     another scorecard. */
  admin: {
    label: "Access",
    subtitle: "Who may see the hub, and how much of it",
    accent: "admin",
    sheets: [
    {
      // Who may see what on the hub. Editing a row here changes what that
      // person is served the next time they load a page — the database reads
      // this table on every query, so there is nothing to redeploy.
      key: "hub_access",
      label: "Hub Access",
      table: "hub_access",
      order: "role.asc,full_name.asc",
      idKey: "email",
      columns: [
        { key: "full_name", label: "Name",  type: "text", width: 170 },
        { key: "email",     label: "Email", type: "text", width: 220, required: true,
          help: "Must match the address they sign in with." },
        { key: "role",      label: "Role",  type: "select", width: 120,
          options: [
            { value: "partner",  label: "Partner",  tone: "grey" },
            { value: "staff",    label: "Staff",    tone: "accent" },
            { value: "director", label: "Director", tone: "yellow" },
            { value: "admin",    label: "Admin",    tone: "green" },
          ],
          help: "partner: org and departments only · staff: their own reporting line · " +
                "director: their whole department · admin: everything" },
        { key: "scope_department", label: "Scope — Department", type: "select", width: 175,
          options: DEPARTMENTS,
          help: "Directors only: the department they run." },
        { key: "scope_person", label: "Scope — Person", type: "text", width: 165,
          help: "Staff only: their exact name in the Employee Directory. " +
                "Everyone reporting up to them is included automatically. " +
                "Leave blank and they see no individual KPIs." },
        { key: "category", label: "Category (from the sheet)", type: "text", width: 190,
          help: "What the access spreadsheet called them. Reference only." },
        { key: "active", label: "Active", type: "select", width: 90,
          options: [{ value: true, label: "Active", tone: "green" },
                    { value: false, label: "Revoked", tone: "grey" }],
          help: "Revoking removes their access on their next page load." },
      ],
    }
    ],
  },

  /* ═══════════ 5. Student Services Hub Analytics ═══════════
     How the hub is actually being used: which pages, by how many distinct
     people, and the daily shape of visits and sign-ins. Read-only throughout —
     an audit trail that can be edited is worth less than one that cannot. */
  analytics: {
    label: "Student Services Hub Analytics",
    subtitle: "Page views and sign-ins",
    accent: "analytics",
    // Usage data is a record of individuals' behaviour. Being able to edit the
    // sheets is not the same as being entitled to read who went where, so this
    // one is limited to admins — the VP and the project managers — even though
    // every PM editor can open the rest of the Hub.
    adminOnly: true,
    sheets: [
      {
        key: "usage_pages",
        label: "Pages",
        table: "v_hub_usage_pages",
        order: "hits.desc",
        readOnly: true,
        columns: [
          { key: "page",      label: "Page",            type: "text",   width: 280, readOnly: true },
          { key: "hits",      label: "Views",           type: "number", width: 110, readOnly: true },
          { key: "people",    label: "Distinct people", type: "number", width: 145, readOnly: true,
            help: "How many different people, not how many visits." },
          { key: "last_viewed", label: "Last viewed",   type: "text",   width: 215, readOnly: true,
            help: "Mountain time." },
        ],
      },
      {
        key: "usage_daily",
        label: "By day",
        table: "v_hub_usage_daily",
        order: "day_sort.desc",
        readOnly: true,
        columns: [
          { key: "day",   label: "Day",   type: "text",   width: 145, readOnly: true },
          { key: "event", label: "Event", type: "select", width: 150, readOnly: true,
            options: [
              { value: "page",         label: "Page view", tone: "accent" },
              { value: "login",        label: "Sign-in",   tone: "green" },
              { value: "login_denied", label: "Refused",   tone: "red" },
            ] },
          { key: "hits",   label: "Count",           type: "number", width: 110, readOnly: true },
          { key: "people", label: "Distinct people", type: "number", width: 145, readOnly: true },
        ],
      },
    ],
  },
};
