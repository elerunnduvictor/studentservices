"""
Generate supabase/patch-04-org-chart.sql.

The org chart could not simply be pointed at `org_chart_nodes`: that table came
from the "Org Chart Info" sheet, which covers leadership only (43 rows) and
carries no tile level, department slug, photo, email or project-manager flag.
The hand-maintained org-chart/js/data.js has all of it for 53 nodes.

So rather than degrade the chart to fit the table, this widens the table to fit
the chart — merging the sheet's stewardships and key-KPI text onto the richer
records, and reloading. After this the org chart reads from the database like
every other page.

    python supabase/build_org_chart_patch.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DATA_JS = REPO / "org-chart" / "js" / "data.js"
OUT = REPO / "supabase" / "patch-04-org-chart.sql"


def sql(v):
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, list):
        if not v:
            return "null"
        inner = ",".join('"' + str(x).replace("\\", "\\\\").replace('"', '\\"') + '"' for x in v)
        return "'{" + inner.replace("'", "''") + "}'"
    return "'" + str(v).replace("'", "''") + "'"


def read_nodes():
    """Evaluate data.js in node and hand back the employee array as JSON."""
    script = f"""
      global.window = {{}};
      global.OC = {{}};
      const fs = require('fs');
      eval(fs.readFileSync({json.dumps(str(DATA_JS))}, 'utf8'));
      const emp = (global.OC && global.OC.employees) || (window.OC && window.OC.employees) || [];
      process.stdout.write(JSON.stringify(emp));
    """
    out = subprocess.run([ "node", "-e", script ], capture_output=True, text=True, encoding="utf-8")
    if out.returncode != 0:
        sys.exit("Could not read data.js:\n" + out.stderr)
    return json.loads(out.stdout)


def main():
    nodes = read_nodes()
    if not nodes:
        sys.exit("No org chart nodes found")

    lines = [
        "-- ═══════════ PATCH 04 — ORG CHART ═══════════\n"
        "--\n"
        "-- `org_chart_nodes` came from the \"Org Chart Info\" sheet, which covers\n"
        "-- leadership only and carries no tile level, department slug, photo, email or\n"
        "-- project-manager flag. The org chart page needs all of those, so pointing it\n"
        "-- at the table as it stood would have dropped ten people and flattened the\n"
        "-- hierarchy.\n"
        "--\n"
        "-- This widens the table to hold everything the chart draws, then reloads it\n"
        "-- from the richer hand-maintained source. After this the org chart reads from\n"
        "-- the database like every other page, and PMs can edit it.\n"
        "--\n"
        "-- Run after patch-03. Safe to re-run.\n\n"
        "begin;\n\n"
        "-- ── the fields the chart needs ────────────────────────────────────────────\n"
        "alter table public.org_chart_nodes\n"
        "  add column if not exists node_key      text,      -- stable id used by the chart\n"
        "  add column if not exists reports_to_key text,     -- parent's node_key\n"
        "  add column if not exists dept_slug     text,      -- executive|records|enrollment|dean|digital\n"
        "  add column if not exists level         integer,   -- 1 VP … 5 staff\n"
        "  add column if not exists email         text,\n"
        "  add column if not exists photo_url     text,\n"
        "  add column if not exists is_pm         boolean not null default false,\n"
        "  add column if not exists pm_position   text,      -- left|right, for PM tiles\n"
        "  add column if not exists responsibilities text[],\n"
        "  add column if not exists kpis          text[];\n\n"
        "create unique index if not exists org_chart_nodes_key_idx\n"
        "  on public.org_chart_nodes (node_key);\n\n"
        "-- ── keep the sheet's narrative text, keyed by name ────────────────────────\n"
        "create temporary table _sheet_text on commit drop as\n"
        "  select lower(trim(name)) as name_key, stewardships, key_kpis,\n"
        "         key_responsibilities, direct_reports\n"
        "    from public.org_chart_nodes\n"
        "   where stewardships is not null or key_kpis is not null;\n\n"
        "delete from public.org_chart_nodes;\n\n"
    ]

    cols = ("sort_order, node_key, name, role, employee_status, reports_to, reports_to_key, "
            "dept_slug, department, level, email, photo_url, link, is_pm, pm_position, "
            "responsibilities, kpis")
    lines.append(f"insert into public.org_chart_nodes ({cols}) values\n")

    rows = []
    for i, n in enumerate(nodes, start=1):
        rows.append("  (" + ", ".join([
            str(i),
            sql(n.get("id")),
            sql(n.get("name")),
            sql(n.get("title")),
            sql(n.get("status")),
            sql(None),                       # reports_to (name) refilled below
            sql(n.get("reportsTo")),
            sql(n.get("dept")),
            sql(None),                       # department (long name) refilled below
            sql(n.get("level")),
            sql(n.get("email")),
            sql(n.get("photoUrl")),
            sql(n.get("roleInventoryUrl")),
            sql(n.get("role") == "pm"),
            sql(n.get("pmPosition")),
            sql(n.get("responsibilities") or []),
            sql(n.get("kpis") or []),
        ]) + ")")
    lines.append(",\n".join(rows) + ";\n\n")

    lines.append(
        "-- parent's display name, derived from the key so the two cannot disagree\n"
        "update public.org_chart_nodes c\n"
        "   set reports_to = p.name\n"
        "  from public.org_chart_nodes p\n"
        " where c.reports_to_key = p.node_key;\n\n"
        "-- long department name, for the pages that show it\n"
        "update public.org_chart_nodes set department = case dept_slug\n"
        "  when 'executive'  then 'VP - Student Services'\n"
        "  when 'records'    then 'Student Records, Registration, and Support'\n"
        "  when 'enrollment' then 'Enrollment & Retention'\n"
        "  when 'dean'       then 'Dean of Students'\n"
        "  when 'digital'    then 'Digital Operations'\n"
        "  else department end;\n\n"
        "-- put the sheet's stewardship / KPI wording back where the names match\n"
        "update public.org_chart_nodes c\n"
        "   set stewardships         = coalesce(c.stewardships, s.stewardships),\n"
        "       key_kpis             = coalesce(c.key_kpis, s.key_kpis),\n"
        "       key_responsibilities = coalesce(c.key_responsibilities, s.key_responsibilities),\n"
        "       direct_reports       = coalesce(c.direct_reports, s.direct_reports)\n"
        "  from _sheet_text s\n"
        " where lower(trim(c.name)) = s.name_key;\n\n"
        "-- ── what the org chart page reads ─────────────────────────────────────────\n"
        "create or replace view public.v_hub_org_chart as\n"
        "  select node_key as id, name, role as title, dept_slug as dept, level,\n"
        "         employee_status as status, reports_to_key as \"reportsTo\",\n"
        "         coalesce(responsibilities, '{}') as responsibilities,\n"
        "         coalesce(kpis, '{}') as kpis,\n"
        "         email, photo_url as \"photoUrl\", link as \"roleInventoryUrl\",\n"
        "         case when is_pm then 'pm' end as role_kind,\n"
        "         pm_position as \"pmPosition\",\n"
        "         stewardships, key_kpis, key_responsibilities, direct_reports\n"
        "    from public.org_chart_nodes\n"
        "   order by level, sort_order;\n\n"
        "alter view public.v_hub_org_chart set (security_invoker = on);\n"
        "grant select on public.v_hub_org_chart to anon, authenticated;\n\n"
        "commit;\n"
    )

    OUT.write_text("".join(lines), encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(REPO)}  ({len(nodes)} nodes)")
    by_level = {}
    for n in nodes:
        by_level[n.get("level")] = by_level.get(n.get("level"), 0) + 1
    print("  levels:", dict(sorted(by_level.items())))
    print("  with photo:", sum(1 for n in nodes if n.get("photoUrl")))
    print("  project managers:", sum(1 for n in nodes if n.get("role") == "pm"))


if __name__ == "__main__":
    main()
