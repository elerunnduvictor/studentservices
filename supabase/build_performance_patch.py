"""
Generate supabase/patch-05-performance-standards.sql from
performance-standards/js/performance-standards-data.js.

The Performance Standards page maps every Student Services service to the
accreditation sub-standards it satisfies, with a steward, evidence, key metric
and review cadence. It was the last page still reading a checked-in file.

Three tables, because the data has three shapes:
  performance_sections       the twelve headings
  performance_services       the rows inside each heading
  performance_metric_links   key metric -> Power BI report, or "no report yet"

The intro paragraph goes into a small key/value table, so a PM can reword it
without a deploy.

    python supabase/build_performance_patch.py
"""
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DATA_JS = REPO / "performance-standards" / "js" / "performance-standards-data.js"
OUT = REPO / "supabase" / "patch-05-performance-standards.sql"


def sql(v):
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, list):
        if not v:
            return "'{}'"
        inner = ",".join('"' + str(x).replace("\\", "\\\\").replace('"', '\\"') + '"' for x in v)
        return "'{" + inner.replace("'", "''") + "}'"
    return "'" + str(v).replace("'", "''") + "'"


def read_data():
    script = f"""
      global.window = {{}};
      const fs = require('fs');
      eval(fs.readFileSync({json.dumps(str(DATA_JS))}, 'utf8'));
      process.stdout.write(JSON.stringify({{
        intro:     window.PERFORMANCE_INTRO || '',
        sections:  window.PERFORMANCE_SECTIONS || [],
        links:     window.PERFORMANCE_METRIC_LINKS || {{}},
        noReport:  window.PERFORMANCE_METRIC_NO_REPORT || []
      }}));
    """
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, encoding="utf-8")
    if out.returncode != 0:
        sys.exit("Could not read the data file:\n" + out.stderr)
    return json.loads(out.stdout)


def main():
    d = read_data()
    sections, links, no_report = d["sections"], d["links"], d["noReport"]
    if not sections:
        sys.exit("No sections found")

    L = ["""-- ═══════════ PATCH 05 — PERFORMANCE STANDARDS ═══════════
--
-- The last page still reading a checked-in data file. It maps every Student
-- Services service to the accreditation sub-standards it satisfies, with a
-- steward, evidence, key metric and review cadence.
--
-- Three tables because the data has three shapes: the headings, the service
-- rows inside them, and the key-metric → Power BI lookup. The intro paragraph
-- goes in a small key/value table so it can be reworded without a deploy.
--
-- Run after patch-04. Safe to re-run.

begin;

-- ── site text a PM can edit without a deploy ──────────────────────────────
create table if not exists public.app_text (
  key        text primary key,
  value      text not null,
  note       text,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ── the twelve headings ───────────────────────────────────────────────────
create table if not exists public.performance_sections (
  id          bigserial primary key,
  section_key text not null unique,      -- slug used as the anchor in the page
  title       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- ── the service rows inside each heading ──────────────────────────────────
create table if not exists public.performance_services (
  id          bigserial primary key,
  section_key text not null references public.performance_sections(section_key)
                on update cascade on delete cascade,
  sort_order  integer not null default 0,
  service     text not null,
  standards   text[] not null default '{}',   -- e.g. {1.B.1, 2.G.1}
  stewards    text[] not null default '{}',
  evidence    text,
  key_metrics text,
  cadence     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);
-- No index on (section_key, sort_order): at 56 rows Postgres sequentially scans
-- and sorts in memory regardless, so one would be write overhead that never
-- earns its keep. Add it if this ever grows by an order of magnitude.

-- ── key metric → dashboard ────────────────────────────────────────────────
-- `has_report = false` records a metric the team has deliberately parked, so
-- the page can say "no report for now" rather than silently showing plain text.
create table if not exists public.performance_metric_links (
  metric     text primary key,
  url        text,
  has_report boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

"""]

    # triggers, RLS
    L.append("""-- ── plumbing: same touch/audit/RLS treatment as every other table ─────────
do $$
declare
  t     text;
  nm    text;
  names text[];
  -- "the signed-in caller is on the editor list". The auth call sits in a
  -- sub-select of its own so it stores as `( SELECT auth.jwt() AS jwt)`, which
  -- is the shape Supabase's RLS advisor looks for — see schema.sql for why the
  -- parenthesis placement is what gets read.
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
begin
  foreach t in array array['app_text', 'performance_sections',
                           'performance_services', 'performance_metric_links']
  loop
    execute format('drop trigger if exists %1$s_touch on public.%1$s;
      create trigger %1$s_touch before update on public.%1$s
        for each row execute function public.touch_row();', t);

    execute format('drop trigger if exists %1$s_audit on public.%1$s;
      create trigger %1$s_audit after insert or update or delete on public.%1$s
        for each row execute function public.record_change();', t);

    -- exactly one policy per action; two permissive ones would both run
    select coalesce(array_agg(policyname), '{}') into names
      from pg_policies where schemaname = 'public' and tablename = t;
    foreach nm in array names loop
      execute format('drop policy if exists %I on public.%I', nm, t);
    end loop;

    execute format('alter table public.%I enable row level security;', t);

    execute format('create policy "%1$s_select" on public.%1$s
        for select using (true);', t);

    execute format('create policy "%1$s_insert" on public.%1$s
        for insert to authenticated with check (%2$s);', t, chk);

    execute format('create policy "%1$s_update" on public.%1$s
        for update to authenticated using (%2$s) with check (%2$s);', t, chk);

    execute format('create policy "%1$s_delete" on public.%1$s
        for delete to authenticated using (%2$s);', t, chk);
  end loop;
end;
$$;

-- ── load ──────────────────────────────────────────────────────────────────
truncate public.performance_services, public.performance_sections restart identity cascade;
truncate public.performance_metric_links;

""")

    L.append("insert into public.app_text (key, value, note) values\n  (" +
             ", ".join([sql("performance_standards_intro"), sql(d["intro"]),
                        sql("Paragraph under the Performance Standards heading")]) +
             ")\non conflict (key) do update set value = excluded.value;\n\n")

    rows = []
    for i, s in enumerate(sections, start=1):
        rows.append("  (" + ", ".join([sql(s.get("id")), sql(s.get("title")),
                                       str(s.get("index") or i)]) + ")")
    L.append("insert into public.performance_sections (section_key, title, sort_order) values\n"
             + ",\n".join(rows) + "\non conflict (section_key) do update set "
             "title = excluded.title, sort_order = excluded.sort_order;\n\n")

    svc_rows = []
    for s in sections:
        for j, v in enumerate(s.get("services") or [], start=1):
            svc_rows.append("  (" + ", ".join([
                sql(s.get("id")), str(j), sql(v.get("service")),
                sql(v.get("standards") or []), sql(v.get("stewards") or []),
                sql(v.get("evidence")), sql(v.get("keyMetrics")), sql(v.get("cadence")),
            ]) + ")")
    L.append("insert into public.performance_services "
             "(section_key, sort_order, service, standards, stewards, evidence, key_metrics, cadence) values\n"
             + ",\n".join(svc_rows) + ";\n\n")

    link_rows = [f"  ({sql(m)}, {sql(u)}, true)" for m, u in links.items()]
    link_rows += [f"  ({sql(m)}, null, false)" for m in no_report]
    L.append("insert into public.performance_metric_links (metric, url, has_report) values\n"
             + ",\n".join(link_rows) + "\non conflict (metric) do update set "
             "url = excluded.url, has_report = excluded.has_report;\n\n")

    # view
    L.append("""-- ── what the page reads ───────────────────────────────────────────────────
-- Services are nested under their section so the renderer receives exactly the
-- shape it already expected.
create or replace view public.v_hub_performance_sections as
  select s.section_key as id, s.title, s.sort_order as index,
         coalesce(
           (select json_agg(json_build_object(
                      'service',    v.service,
                      'standards',  v.standards,
                      'stewards',   v.stewards,
                      'evidence',   v.evidence,
                      'keyMetrics', v.key_metrics,
                      'cadence',    v.cadence
                    ) order by v.sort_order, v.id)
              from public.performance_services v
             where v.section_key = s.section_key),
           '[]'::json) as services
    from public.performance_sections s
   order by s.sort_order, s.id;

alter view public.v_hub_performance_sections set (security_invoker = on);
grant select on public.v_hub_performance_sections to anon, authenticated;
grant select on public.app_text, public.performance_metric_links to anon, authenticated;

commit;
""")

    OUT.write_text("".join(L), encoding="utf-8", newline="\n")
    total_services = sum(len(s.get("services") or []) for s in sections)
    print(f"wrote {OUT.relative_to(REPO)}")
    print(f"  sections       {len(sections)}")
    print(f"  services       {total_services}")
    print(f"  metric links   {len(links)} with a report, {len(no_report)} parked")


if __name__ == "__main__":
    main()
