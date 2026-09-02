-- ═══════════════════════════════════════════════════════════════════════════
--  EXPORT THE ORG CHART, TO REFRESH THE BUNDLED SNAPSHOT
--
--  org-chart/js/data.js is the copy the hub falls back to when the database is
--  unreachable. It has drifted behind the database — Hilary Bagley's role among
--  others — so anyone hitting the site during an outage reads old roles. This
--  pulls the live rows out so that file can be regenerated from them.
--
--  Read-only. It writes nothing and changes nothing.
--
--  ── How to run it ──
--
--   1. Supabase → SQL Editor → paste STEP 2 → Run.
--   2. One row comes back, one column, holding the whole chart as JSON.
--      Click the cell, copy the value.
--   3. Save it as  supabase/org-chart-export.json  in the repo.
--
--  STEP 1 is a quick sanity check — run it first if you want to see what you
--  are about to export before you export it.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── STEP 1: does this look right? ───────────────────────────────────────────
-- Expect roughly 53 people across levels 1–5, and Hilary's current role.
select
  (select count(*) from public.v_hub_org_chart)                        as people,
  (select count(*) from public.v_hub_org_chart where role_kind = 'pm') as project_managers,
  (select string_agg(distinct level::text, ', ' order by level::text)
     from public.v_hub_org_chart)                                      as levels,
  (select title from public.v_hub_org_chart where id = 'hilary-bagley') as hilary_says;


-- ── STEP 2: the export ──────────────────────────────────────────────────────
-- One cell, holding the chart as JSON.
--
-- Only the fourteen fields org-chart/js/data.js actually carries. The view also
-- has key_kpis, key_responsibilities, stewardships and direct_reports — long
-- free text, several thousand characters a head — and the snapshot has never
-- held them. Exporting them anyway made the result four times larger than it
-- needed to be and it would not fit in one copy. Compact rather than
-- jsonb_pretty for the same reason; the file gets formatted on the way in.
--
-- jsonb_strip_nulls drops the empty ones, which is what keeps `role` and
-- `pmPosition` on the eight project managers and off everyone else — exactly
-- the shape the file has today.
--
-- The camelCase columns are quoted because Postgres would otherwise fold them
-- to lower case and not find them.
--
-- Ordered by level so the export lands in the same sequence the site already
-- reads it in — the page requests `order=level.asc` — with dept and name
-- breaking ties so two runs produce the same file and the diff stays readable.
select jsonb_agg(
         jsonb_strip_nulls(jsonb_build_object(
           'id',               v.id,
           'name',             v.name,
           'title',            v.title,
           'dept',             v.dept,
           'level',            v.level,
           'status',           v.status,
           'reportsTo',        v."reportsTo",
           'role',             case when v.role_kind = 'pm' then 'pm' end,
           'pmPosition',       case when v.role_kind = 'pm' then v."pmPosition" end,
           'responsibilities', v.responsibilities,
           'kpis',             v.kpis,
           'email',            v.email,
           'photoUrl',         v."photoUrl",
           'roleInventoryUrl', v."roleInventoryUrl"
         ))
         order by v.level, v.dept, v.name
       )::text as org_chart_json
from public.v_hub_org_chart v;
