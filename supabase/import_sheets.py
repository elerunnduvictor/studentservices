"""
Read the three source workbooks and emit supabase/seed.sql.

    python supabase/import_sheets.py

Run this once to load Supabase, and again any time the sheets are the source of
truth ahead of the database (it truncates and reloads). After the PM app goes
live the database is the source of truth and this script is only a fallback.

The mapping between each sheet and its table is stated in schema.sql; this file
only deals with locating the data inside sheets that carry banners, legends and
side blocks above and beside the real rows.
"""
import datetime
import re
import sys
from pathlib import Path

import openpyxl

REPO = Path(__file__).resolve().parent.parent
SHEETS = REPO / "data-sources"
OUT = REPO / "supabase" / "seed.sql"

OKR_XLSX = SHEETS / "Profit.co Monthly Reports.xlsx"
DIR_XLSX = SHEETS / "Student Services Org Directory.xlsx"
KPI_XLSX = SHEETS / "Student Services KPIs.xlsx"

PM_EDITORS_JS = REPO / "pm" / "js" / "pm-editors.js"


# ── helpers ────────────────────────────────────────────────────────────────
def clean(v):
    if v is None:
        return None
    if isinstance(v, datetime.datetime):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, datetime.date):
        return v.isoformat()
    if isinstance(v, str):
        v = v.replace("\r\n", "\n").strip()
        return v or None
    return v


def sql(v):
    """Quote a Python value as a SQL literal."""
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def num(v):
    """Numeric or null — blanks and stray text become null."""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r"-?\d+(?:\.\d+)?", str(v).replace(",", ""))
    return float(m.group(0)) if m else None


def date_or_null(v):
    v = clean(v)
    if not v:
        return None
    return v if re.match(r"^\d{4}-\d{2}-\d{2}$", str(v)) else None


def rows_of(ws, min_row, min_col, max_col):
    for r in ws.iter_rows(min_row=min_row, min_col=min_col, max_col=max_col, values_only=True):
        if any(v is not None and str(v).strip() for v in r):
            yield [clean(v) for v in r]


def insert(table, columns, records):
    """Build one multi-row INSERT. Returns '' when there is nothing to write."""
    if not records:
        return ""
    lines = [f"insert into public.{table} ({', '.join(columns)}) values"]
    body = [
        "  (" + ", ".join(sql(v) for v in rec) + ")"
        for rec in records
    ]
    lines.append(",\n".join(body) + ";")
    return "\n".join(lines) + "\n\n"


# ── 1. OKRs ────────────────────────────────────────────────────────────────
def load_okrs():
    ws = openpyxl.load_workbook(OKR_XLSX, data_only=True)["Sheet1"]
    out, order = [], 0
    for r in rows_of(ws, 2, 1, 16):
        if not r[0] and not r[2]:
            continue
        order += 1
        out.append([
            order, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8],
            num(r[9]), num(r[10]), num(r[11]), r[12], r[13], r[14], date_or_null(r[15]),
        ])
    return out


# ── 2. Directory ───────────────────────────────────────────────────────────
def find_header(ws, needle, max_scan=15):
    """Locate the row holding a known column heading."""
    for ri in range(1, min(max_scan, ws.max_row) + 1):
        for ci in range(1, ws.max_column + 1):
            v = ws.cell(ri, ci).value
            if v and str(v).strip().upper() == needle:
                return ri, ci
    raise SystemExit(f'Could not find heading "{needle}" in {ws.title}')


def load_employees():
    ws = openpyxl.load_workbook(DIR_XLSX, data_only=True)["Employee Directory"]
    hdr_row, name_col = find_header(ws, "NAME")
    out, order = [], 0
    # NAME, ROLE, DEPARTMENT, EMPLOYMENT TYPE, PRIMARY STAKEHOLDER,
    # SUB DEPT, CONTRACT ORGANIZATION, Tier Type
    for r in rows_of(ws, hdr_row + 1, name_col, name_col + 7):
        if not r[0]:
            continue
        order += 1
        tier = r[7]
        out.append([
            order, r[0], r[1], r[2], r[3], r[4], r[5], r[6],
            None if tier is None else str(tier),
        ])
    return out


def load_student_employees():
    ws = openpyxl.load_workbook(DIR_XLSX, data_only=True)["Employee Directory"]
    hdr_row, name_col = find_header(ws, "EMPLOYEE NAME")
    out, order = [], 0
    # EMPLOYEE NAME, JOB NAME, Role Title, Sub-Dept, Supervisor, Dept
    for r in rows_of(ws, hdr_row + 1, name_col, name_col + 5):
        if not r[0]:
            continue
        order += 1
        out.append([order, r[0], r[1], r[2], r[3], r[4], r[5]])
    return out


def load_org_chart():
    ws = openpyxl.load_workbook(DIR_XLSX, data_only=True)["Org Chart Info"]
    out, order = [], 0
    for r in rows_of(ws, 3, 1, 10):
        if not r[0]:
            continue
        order += 1
        out.append([order, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9]])
    return out


# ── 3. KPIs ────────────────────────────────────────────────────────────────
def load_kpis():
    ws = openpyxl.load_workbook(KPI_XLSX, data_only=True)["KPI ScoreCard"]
    headers = [str(c.value).strip().lower() if c.value else "" for c in ws[2]]

    def col(label, default=None):
        for i, h in enumerate(headers):
            if h == label.lower():
                return i
        if default is not None:
            return default
        raise SystemExit(f'Column "{label}" missing from KPI ScoreCard')

    perf = col("performance")
    idx = {
        "employee": col("employee"), "role": col("role"), "dept": col("dept"),
        "measure": col("kpi measure"), "category": col("kpi category"),
        "type": col("category type"), "data": col("data"),
        "green": perf, "yellow": perf + 1, "red": perf + 2,
        "tracking": col("tracking status"), "value": col("current value"),
        "source": col("data source (link to sheet or report)"),
        "freq": col("update frequency"), "update_date": col("update date"),
        "direction": col("direction"), "gcut": col("green cutoff"), "rcut": col("red cutoff"),
    }

    out, order = [], 0
    for r in rows_of(ws, 3, 1, ws.max_column):
        get = lambda k: r[idx[k]] if idx[k] < len(r) else None
        if not get("measure"):
            continue
        order += 1
        tracking = (get("tracking") or "Not Tracking")
        value = get("value")
        out.append([
            order, get("employee"), get("role"), get("dept"), get("measure"),
            get("category"), get("type"), get("data"),
            None if get("green") is None else str(get("green")),
            None if get("yellow") is None else str(get("yellow")),
            None if get("red") is None else str(get("red")),
            str(tracking).strip(),
            None if value is None else str(value),
            get("source"), get("freq"), date_or_null(get("update_date")),
            get("direction"),
            None if get("gcut") is None else str(get("gcut")),
            None if get("rcut") is None else str(get("rcut")),
        ])
    return out


# ── editors ────────────────────────────────────────────────────────────────
def load_editors():
    """
    Who may write, read from pm/js/pm-editors.js — the one list a person edits.

    That file is also what the console's sign-in screen checks, so the message a
    blocked user sees and the rule the database enforces can never drift apart.
    Any trailing // comment on a line is kept as the note, which is where each
    editor's role is recorded.
    """
    if not PM_EDITORS_JS.exists():
        sys.exit(f"Missing {PM_EDITORS_JS} — the console's editor list")
    src = PM_EDITORS_JS.read_text(encoding="utf-8")
    block = src.split("window.PM_EDITORS", 1)[-1].split("];", 1)[0]
    seen, out = set(), []
    for line in block.splitlines():
        m = re.search(r'"([^"]+@[^"]+)"\s*,?\s*(?://\s*(.*))?$', line)
        if not m:
            continue
        email = m.group(1).strip().lower()
        if email in seen:
            continue
        seen.add(email)
        out.append([email, None, (m.group(2) or "").strip() or None])
    return out


# ── main ───────────────────────────────────────────────────────────────────
def main():
    for f in (OKR_XLSX, DIR_XLSX, KPI_XLSX):
        if not f.exists():
            sys.exit(f"Missing workbook: {f.name}")

    okrs = load_okrs()
    employees = load_employees()
    students = load_student_employees()
    org_chart = load_org_chart()
    kpis = load_kpis()
    editors = load_editors()

    parts = [
        "-- ═══════════ SEED DATA ═══════════\n"
        f"-- Generated {datetime.date.today().isoformat()} by supabase/import_sheets.py\n"
        "-- Reloads every table from the source workbooks. Safe to re-run.\n"
        "-- Audit triggers are suspended so the import is not logged as user edits.\n\n"
        "begin;\n\n"
        "alter table public.okrs disable trigger okrs_audit;\n"
        "alter table public.employees disable trigger employees_audit;\n"
        "alter table public.student_employees disable trigger student_employees_audit;\n"
        "alter table public.org_chart_nodes disable trigger org_chart_nodes_audit;\n"
        "alter table public.kpis disable trigger kpis_audit;\n\n"
        "truncate public.okrs, public.employees, public.student_employees,\n"
        "         public.org_chart_nodes, public.kpis restart identity;\n\n"
    ]

    parts.append(insert("okrs", [
        "sort_order", "okr", "key_result", "sub_key_result", "sub_key_result_child",
        "period", "primary_stakeholder", "secondary_stakeholders", "project_manager",
        "type", "goal", "stretch_goal", "progress", "status", "trend", "comment",
        "update_date"], okrs))

    parts.append(insert("employees", [
        "sort_order", "name", "role", "department", "employment_type",
        "primary_stakeholder", "sub_department", "contract_organization", "tier"], employees))

    parts.append(insert("student_employees", [
        "sort_order", "name", "job_name", "role_title", "sub_department",
        "supervisor", "department"], students))

    parts.append(insert("org_chart_nodes", [
        "sort_order", "name", "role", "employee_status", "stewardships", "key_kpis",
        "reports_to", "department", "link", "key_responsibilities", "direct_reports"], org_chart))

    parts.append(insert("kpis", [
        "sort_order", "employee", "role", "department", "kpi_measure", "kpi_category",
        "category_type", "data_availability", "band_green", "band_yellow", "band_red",
        "tracking_status", "current_value", "data_source", "update_frequency",
        "update_date", "direction_hint", "green_cutoff", "red_cutoff"], kpis))

    if editors:
        parts.append(
            "insert into public.allowed_editors (email, full_name, note) values\n"
            + ",\n".join("  (" + ", ".join(sql(v) for v in e) + ")" for e in editors)
            + "\non conflict (email) do nothing;\n\n"
        )

    parts.append(
        "alter table public.okrs enable trigger okrs_audit;\n"
        "alter table public.employees enable trigger employees_audit;\n"
        "alter table public.student_employees enable trigger student_employees_audit;\n"
        "alter table public.org_chart_nodes enable trigger org_chart_nodes_audit;\n"
        "alter table public.kpis enable trigger kpis_audit;\n\n"
        "commit;\n"
    )

    OUT.write_text("".join(parts), encoding="utf-8", newline="\n")

    print(f"wrote {OUT.relative_to(REPO)}")
    print(f"  okrs              {len(okrs):4}")
    print(f"  employees         {len(employees):4}")
    print(f"  student_employees {len(students):4}")
    print(f"  org_chart_nodes   {len(org_chart):4}")
    print(f"  kpis              {len(kpis):4}")
    print(f"  allowed_editors   {len(editors):4}")
    tracked = sum(1 for k in kpis if str(k[11]).strip().lower() == "tracking")
    print(f"    of which tracking: {tracked}")


if __name__ == "__main__":
    main()
