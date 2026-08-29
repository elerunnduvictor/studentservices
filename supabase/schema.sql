-- ═══════════════════════════════════════════════════════════════════════════
--  STUDENT SERVICES — SUPABASE SCHEMA
--
--  One table per spreadsheet that currently drives the hub:
--     Profit.co Monthly Reports  -> okrs
--     Student Services Org Dir.  -> employees, student_employees, org_chart_nodes
--     Student Services KPIs      -> kpis
--
--  Column names mirror the spreadsheet headings so the PM app's grids read like
--  the sheets they replace. Everything a person types stays TEXT unless the
--  value is genuinely numeric in every row — "Current Value" holds both 0.93
--  and "3 minutes", so it is text and parsed at render time.
--
--  Run this once in the Supabase SQL editor, then run seed.sql.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── extensions ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
--  ACCESS CONTROL
--  Who may edit is a data question, not a code question — the PM app checks
--  this table, and so does every write policy below.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.allowed_editors (
  email       text primary key,
  full_name   text,
  note        text,
  created_at  timestamptz not null default now()
);

comment on table public.allowed_editors is
  'Emails permitted to sign in to the PM app and write to the data tables.';

-- Whether the caller may edit is asked directly inside each write policy, as a
-- plain EXISTS against allowed_editors. An earlier version wrapped this in a
-- SECURITY DEFINER function, which then had to be executable by every client
-- role — a standing privilege nobody needed.

-- ═══════════════════════════════════════════════════════════════════════════
--  SHARED PLUMBING
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.touch_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end;
$$;

-- Every edit is recorded. PMs are editing live production data; when a number
-- on the hub looks wrong, this is how you find out what changed and who did it.
create table if not exists public.change_log (
  id          bigserial primary key,
  table_name  text        not null,
  row_id      bigint,
  action      text        not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before_data jsonb,
  after_data  jsonb,
  changed_by  text,
  row_key     text,   -- primary key as text, whatever the table calls it
  changed_at  timestamptz not null default now()
);
create index if not exists change_log_table_time_idx
  on public.change_log (table_name, changed_at desc);

create or replace function public.record_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor  text := coalesce(auth.jwt() ->> 'email', 'system');
  rec    jsonb;
  prev   jsonb;
  pk_col text;
  rid    bigint;
  rkey   text;
begin
  if tg_op = 'DELETE' then
    rec := to_jsonb(old);
  else
    rec := to_jsonb(new);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    prev := to_jsonb(old);
  end if;

  -- a no-op save is not worth a log line
  if tg_op = 'UPDATE'
     and prev - 'updated_at' - 'updated_by' = rec - 'updated_at' - 'updated_by' then
    return new;
  end if;

  -- whatever this table calls its primary key
  select a.attname into pk_col
    from pg_index i
    join pg_attribute a
      on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
   where i.indrelid = tg_relid and i.indisprimary
   order by a.attnum
   limit 1;

  if pk_col is not null then
    rkey := rec ->> pk_col;
    if jsonb_typeof(rec -> pk_col) = 'number' then
      rid := (rec ->> pk_col)::bigint;
    end if;
  end if;

  if tg_op = 'DELETE' then
    insert into public.change_log (table_name, row_id, row_key, action, before_data, changed_by)
    values (tg_table_name, rid, rkey, 'DELETE', prev, actor);
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.change_log (table_name, row_id, row_key, action, before_data, after_data, changed_by)
    values (tg_table_name, rid, rkey, 'UPDATE', prev, rec, actor);
    return new;
  else
    insert into public.change_log (table_name, row_id, row_key, action, after_data, changed_by)
    values (tg_table_name, rid, rkey, 'INSERT', rec, actor);
    return new;
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  1. OKRs  — "Profit.co Monthly Reports" / Sheet1
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.okrs (
  id                      bigserial primary key,
  sort_order              integer     not null default 0,
  okr                     text,
  key_result              text,
  sub_key_result          text,   -- Sub-Key Result (Parent)
  sub_key_result_child    text,   -- Sub-Key Result (Child)
  period                  text,
  primary_stakeholder     text,
  secondary_stakeholders  text,   -- comma-separated, as typed in the sheet
  project_manager         text,
  type                    text,
  goal                    numeric,
  stretch_goal            numeric,
  progress                numeric,
  status                  text,
  trend                   text,
  comment                 text,
  update_date             date,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  updated_by              text
);
create index if not exists okrs_sort_idx on public.okrs (sort_order, id);

-- ═══════════════════════════════════════════════════════════════════════════
--  2a. EMPLOYEES  — Org Directory / "Employee Directory" (main block)
--      This table is the source of truth for the hub's directory AND for the
--      sub-department shown on the KPI Scorecard, which joins on name.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.employees (
  id                     bigserial primary key,
  sort_order             integer not null default 0,
  name                   text    not null,
  role                   text,
  department             text,
  employment_type        text,
  primary_stakeholder    text,   -- who they report to
  sub_department         text,
  contract_organization  text,
  tier                   text,   -- "3", "3.5", "EOR" — not always numeric
  email                  text,
  photo_url              text,
  active                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  updated_by             text
);
create index if not exists employees_sort_idx on public.employees (sort_order, id);
create index if not exists employees_name_idx on public.employees (lower(name));
create index if not exists employees_dept_idx on public.employees (department, sub_department);

-- ═══════════════════════════════════════════════════════════════════════════
--  2b. STUDENT EMPLOYEES — Org Directory / "Employee Directory" (right block)
--      Kept separate because the sheet tracks different columns for them.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.student_employees (
  id             bigserial primary key,
  sort_order     integer not null default 0,
  name           text    not null,
  job_name       text,
  role_title     text,
  sub_department text,
  supervisor     text,
  department     text,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     text
);
create index if not exists student_employees_sort_idx on public.student_employees (sort_order, id);

-- ═══════════════════════════════════════════════════════════════════════════
--  2c. ORG CHART NODES — Org Directory / "Org Chart Info"
--      The leadership detail behind each org-chart tile.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.org_chart_nodes (
  id                  bigserial primary key,
  sort_order          integer not null default 0,
  name                text    not null,
  role                text,
  employee_status     text,
  stewardships        text,
  key_kpis            text,
  reports_to          text,
  department          text,
  link                text,   -- role inventory document
  key_responsibilities text,
  direct_reports      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by          text
);
create index if not exists org_chart_sort_idx on public.org_chart_nodes (sort_order, id);

-- ═══════════════════════════════════════════════════════════════════════════
--  3. KPIs — "Student Services KPIs" / "KPI ScoreCard"
--
--  Note what is NOT here: the sheet's "Performance Status" column. Its formula
--  is wrong, so the scorecard derives colour from the three band columns tested
--  against current_value. Storing a stale status would invite someone to trust
--  it. Same for the Green/Red Cutoff helper columns — kept only for reference.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.kpis (
  id                bigserial primary key,
  sort_order        integer not null default 0,
  employee          text,
  role              text,
  department        text,
  kpi_measure       text    not null,
  kpi_category      text,           -- Operational Outcomes / Student Outcomes
  category_type     text,           -- Speed / Quality / Cost / Student Autonomy / ...
  data_availability text,           -- the sheet's "Data" column
  band_green        text,           -- Performance: green definition
  band_yellow       text,           -- Performance: yellow definition
  band_red          text,           -- Performance: red definition
  tracking_status   text    not null default 'Not Tracking',
  current_value     text,           -- "0.93" or "3 minutes" — parsed at render
  data_source       text,
  update_frequency  text,
  update_date       date,
  direction_hint    text,           -- sheet's Direction column (reference only)
  green_cutoff      text,           -- sheet's helper column (reference only)
  red_cutoff        text,           -- sheet's helper column (reference only)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        text
);
create index if not exists kpis_sort_idx on public.kpis (sort_order, id);
create index if not exists kpis_tracking_idx on public.kpis (tracking_status);
create index if not exists kpis_employee_idx on public.kpis (lower(employee));

-- ═══════════════════════════════════════════════════════════════════════════
--  TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  t text;
begin
  foreach t in array array['okrs', 'employees', 'student_employees', 'org_chart_nodes', 'kpis']
  loop
    execute format(
      'drop trigger if exists %1$s_touch on public.%1$s;
       create trigger %1$s_touch before update on public.%1$s
         for each row execute function public.touch_row();
       drop trigger if exists %1$s_audit on public.%1$s;
       create trigger %1$s_audit after insert or update or delete on public.%1$s
         for each row execute function public.record_change();', t);
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--
--  Read: anyone with the anon key — the hub is a static site and fetches with
--        it. This is the same exposure the hub has today (its data ships as
--        plain .js files), so nothing gets less private by moving to Postgres.
--  Write: signed-in users whose email is in allowed_editors.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  t     text;
  nm    text;
  names text[];
  -- "the signed-in caller is on the editor list".
  --
  -- The auth call sits in a scalar sub-select of its own for two reasons.
  -- Written bare it would be re-evaluated for every row scanned. And Supabase's
  -- "Auth RLS Initialization Plan" advisor reads the stored expression text,
  -- looking for an auth.<fn>() call directly preceded by SELECT: an earlier
  -- version of this wrapped the whole predicate as `(select exists (...))`,
  -- which stored as `SELECT (auth.jwt() ->> 'email')` — the parenthesis between
  -- SELECT and the call was enough to trip the check even though the plan was
  -- already fine. This form stores as `( SELECT auth.jwt() AS jwt)`.
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
begin
  foreach t in array array['okrs', 'employees', 'student_employees', 'org_chart_nodes', 'kpis']
  loop
    -- Exactly one policy per action. Two permissive policies covering the same
    -- action get ORed together and both run on every access. Names are collected
    -- before dropping rather than dropped inside a cursor over pg_policies.
    select coalesce(array_agg(policyname), '{}') into names
      from pg_policies where schemaname = 'public' and tablename = t;
    foreach nm in array names loop
      execute format('drop policy if exists %I on public.%I', nm, t);
    end loop;

    execute format('alter table public.%I enable row level security;', t);

    execute format('create policy "%1$s_select" on public.%1$s
        for select using (true);', t);

    -- `to authenticated` means anon never evaluates these at all.
    execute format('create policy "%1$s_insert" on public.%1$s
        for insert to authenticated with check (%2$s);', t, chk);

    execute format('create policy "%1$s_update" on public.%1$s
        for update to authenticated using (%2$s) with check (%2$s);', t, chk);

    execute format('create policy "%1$s_delete" on public.%1$s
        for delete to authenticated using (%2$s);', t, chk);
  end loop;
end;
$$;

alter table public.allowed_editors enable row level security;
drop policy if exists "editors readable by signed-in users" on public.allowed_editors;
drop policy if exists "allowed_editors_select" on public.allowed_editors;
-- No auth call needed — the role filter is the whole condition.
create policy "allowed_editors_select" on public.allowed_editors
  for select to authenticated using (true);

alter table public.change_log enable row level security;
drop policy if exists "change log readable by editors" on public.change_log;
drop policy if exists "change_log_select" on public.change_log;
create policy "change_log_select" on public.change_log
  for select to authenticated using (
    lower(coalesce((select auth.jwt()) ->> 'email', '')) in
    (select lower(e.email) from public.allowed_editors e)
  );

-- Written only by triggers running as the table owner; append-only for clients.
revoke insert, update, delete on public.change_log from anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
--  HUB VIEWS
--  Shaped to match what the hub's pages already expect, so the front end needs
--  only to swap its data source — not its rendering logic.
-- ═══════════════════════════════════════════════════════════════════════════
-- The hub's directory lists everyone — staff and student employees together —
-- so this view unions both tables into the single shape that page expects.
create or replace view public.v_hub_directory as
  select name, role, department as dept, employment_type as type,
         primary_stakeholder as stakeholder, sub_department as "subDept",
         contract_organization as org, tier
  from public.employees
  where active
  union all
  select name, coalesce(role_title, job_name) as role, department as dept,
         'Student Employee' as type, supervisor as stakeholder,
         sub_department as "subDept", null as org, null as tier
  from public.student_employees
  where active
  order by dept, "subDept", name;

create or replace view public.v_hub_okrs as
  select id, okr, key_result as "keyResult", sub_key_result as "subKeyResult",
         sub_key_result_child as "subKeyResultChild", period,
         primary_stakeholder as stakeholder,
         secondary_stakeholders as "secondaryStakeholders",
         project_manager as "projectManager", type, goal,
         stretch_goal as "stretchGoal", progress, status, trend, comment,
         update_date as "updateDate"
  from public.okrs
  order by sort_order, id;

-- Only tracked KPIs reach the scorecard; colour is computed client-side from
-- the bands, so none is stored here.
create or replace view public.v_hub_kpis as
  select k.id, k.employee, k.role, k.department, k.kpi_measure as measure,
         k.kpi_category as category, k.category_type as type,
         k.band_green as "bandGreen", k.band_yellow as "bandYellow",
         k.band_red as "bandRed", k.current_value as value,
         k.data_source as source, k.update_frequency as frequency,
         e.sub_department as "subDept"
  from public.kpis k
  left join public.employees e on lower(e.name) = lower(k.employee)
  where k.tracking_status = 'Tracking'
  order by k.sort_order, k.id;

-- Without this a view runs with its owner's rights and would bypass RLS.
alter view public.v_hub_directory set (security_invoker = on);
alter view public.v_hub_okrs      set (security_invoker = on);
alter view public.v_hub_kpis      set (security_invoker = on);

-- v_hub_directory is deliberately NOT granted to anon.
--
-- The directory is internal to Student Services: row-level security on
-- `employees` and `student_employees` (see access-control.sql) is the real gate,
-- and it refuses a partner or an unauthenticated caller every row. But nothing
-- about the roster should be reachable by a request that never signed in, so the
-- grant is withheld as well. This line previously read
--   grant select on ... v_hub_directory ... to anon, authenticated;
-- which meant a rebuild from this file silently handed anon the view back.
grant select on public.v_hub_directory to authenticated;
grant select on public.v_hub_okrs, public.v_hub_kpis to anon, authenticated;

revoke all on function public.touch_row()     from public, anon, authenticated;
revoke all on function public.record_change() from public, anon, authenticated;
