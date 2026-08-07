-- ═══════════ PATCH 11 — NEW SHEETS AND NEW COLUMNS, FROM THE PM HUB ═══════════
--
-- Until now the shape of every sheet lived in pm/js/schema.js, so adding a
-- column meant a code change and a deploy. Rows were already free; columns,
-- tabs and whole sheets were not. This makes all of them possible from the
-- Hub itself.
--
-- The approach: the built-in sheets stay defined in code, and the database
-- holds only what a PM *adds* on top — extra columns, and entirely new sheets.
-- The Hub merges the two at load. That deliberately avoids copying the existing
-- definitions into the database, where they would be a second source of truth
-- free to drift away from the code that renders them.
--
-- ── About the two functions below ─────────────────────────────────────────
--
-- They run DDL — ALTER TABLE and CREATE TABLE — on behalf of a browser. That
-- deserves stating plainly rather than burying: this is the one place in the
-- system where a client can change the schema, so each is SECURITY DEFINER and
-- every argument is treated as hostile until proven otherwise.
--
--   · the caller must be in `allowed_editors`, checked inside the function
--     rather than trusted from the client;
--   · identifiers must match ^[a-z][a-z0-9_]*$ and are length-capped, so no
--     quoting trick reaches the SQL — and they are passed through format(%I)
--     as well, which is belt and braces on purpose;
--   · the column type must be one of six named types, not free text;
--   · a column may only be added to a table on an explicit allow-list, or to a
--     table this same mechanism created. No touching auth, change_log or
--     allowed_editors;
--   · search_path is pinned, so a same-named function in another schema cannot
--     be substituted;
--   · EXECUTE is granted to `authenticated` only — never to anon.
--
-- Nothing here can drop a column or a table. Removing things stays a
-- deliberate act performed in the SQL editor by someone who means it.
--
-- Run after patch-10. Safe to re-run.

begin;

-- ── sheets a PM has created ───────────────────────────────────────────────
create table if not exists public.pm_sheets (
  sheet_key   text primary key,
  workbook    text not null,             -- okrs | directory | kpis
  label       text not null,
  table_name  text not null,
  order_by    text not null default 'sort_order.asc,id.asc',
  sort_order  integer not null default 100,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  created_by  text,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- ── columns a PM has added, to a built-in sheet or a new one ──────────────
create table if not exists public.pm_columns (
  id          bigserial primary key,
  sheet_key   text not null,             -- matches a built-in key or pm_sheets
  col_key     text not null,             -- the real column name on the table
  label       text not null,
  type        text not null default 'text',
  width       integer not null default 150,
  help        text,
  required    boolean not null default false,
  read_only   boolean not null default false,
  options     jsonb,                     -- for type = 'select'
  sort_order  integer not null default 100,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  created_by  text,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  unique (sheet_key, col_key)
);

-- ── who is asking ─────────────────────────────────────────────────────────
create or replace function public.pm_current_editor()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lower(e.email)
    from public.allowed_editors e
   where lower(e.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
   limit 1;
$$;

revoke all on function public.pm_current_editor() from public, anon;
grant execute on function public.pm_current_editor() to authenticated;

-- ── add a column to a sheet ───────────────────────────────────────────────
create or replace function public.pm_add_column(
  p_sheet_key text,
  p_table     text,
  p_col_key   text,
  p_label     text,
  p_type      text default 'text',
  p_width     integer default 150
)
returns public.pm_columns
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor    text := public.pm_current_editor();
  sql_type text;
  allowed  constant text[] := array[
    'okrs', 'employees', 'student_employees', 'org_chart_nodes', 'kpis',
    'student_contractor_counts', 'app_text', 'performance_sections',
    'performance_services', 'performance_metric_links', 'departments',
    'sub_departments', 'kpi_categories', 'kpi_guiding_questions',
    'department_kpi_matrix', 'kpi_baselines'
  ];
  out public.pm_columns;
begin
  if actor is null then
    raise exception 'Only provisioned editors may change a sheet.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Identifiers are validated, not escaped-and-hoped. Anything that is not a
  -- plain lower-case name is refused outright.
  if p_col_key !~ '^[a-z][a-z0-9_]*$' or length(p_col_key) > 48 then
    raise exception 'Column name must be lower-case letters, digits and underscores, starting with a letter (got %)', p_col_key
      using errcode = 'invalid_parameter_value';
  end if;
  if p_table !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'Invalid table name' using errcode = 'invalid_parameter_value';
  end if;

  -- Only a known data table, or one this mechanism created itself.
  if not (p_table = any (allowed)
          or exists (select 1 from public.pm_sheets s where s.table_name = p_table)) then
    raise exception 'Columns cannot be added to %', p_table
      using errcode = 'insufficient_privilege';
  end if;

  sql_type := case lower(p_type)
                when 'text'     then 'text'
                when 'longtext' then 'text'
                when 'select'   then 'text'
                when 'url'      then 'text'
                when 'number'   then 'numeric'
                when 'percent'  then 'numeric'
                when 'date'     then 'date'
                when 'boolean'  then 'boolean'
                else null
              end;
  if sql_type is null then
    raise exception 'Unsupported column type: %', p_type
      using errcode = 'invalid_parameter_value';
  end if;

  execute format('alter table public.%I add column if not exists %I %s',
                 p_table, p_col_key, sql_type);

  insert into public.pm_columns
        (sheet_key, col_key, label, type, width, created_by, updated_by,
         sort_order)
  values (p_sheet_key, p_col_key, coalesce(nullif(p_label, ''), p_col_key),
          lower(p_type), greatest(60, coalesce(p_width, 150)), actor, actor,
          100 + coalesce((select count(*)::int from public.pm_columns c
                           where c.sheet_key = p_sheet_key), 0))
  on conflict (sheet_key, col_key) do update
        set label = excluded.label, type = excluded.type,
            width = excluded.width, hidden = false, updated_by = actor
  returning * into out;

  return out;
end;
$$;

revoke all on function public.pm_add_column(text, text, text, text, text, integer) from public, anon;
grant execute on function public.pm_add_column(text, text, text, text, text, integer) to authenticated;

-- ── create a whole new sheet ──────────────────────────────────────────────
-- The new table gets the same treatment every other table has: touch and audit
-- triggers, RLS with public read and editor-only writes, and grants. A sheet
-- created here is not a second-class citizen.
create or replace function public.pm_create_sheet(
  p_workbook  text,
  p_sheet_key text,
  p_label     text
)
returns public.pm_sheets
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor text := public.pm_current_editor();
  tbl   text;
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
  out public.pm_sheets;
begin
  if actor is null then
    raise exception 'Only provisioned editors may create a sheet.'
      using errcode = 'insufficient_privilege';
  end if;
  if p_sheet_key !~ '^[a-z][a-z0-9_]*$' or length(p_sheet_key) > 40 then
    raise exception 'Sheet key must be lower-case letters, digits and underscores (got %)', p_sheet_key
      using errcode = 'invalid_parameter_value';
  end if;
  if p_workbook not in ('okrs', 'directory', 'kpis') then
    raise exception 'Unknown workbook: %', p_workbook
      using errcode = 'invalid_parameter_value';
  end if;

  -- Namespaced, so a created sheet can never collide with or shadow a table
  -- the rest of the system depends on.
  tbl := 'sheet_' || p_sheet_key;

  execute format($f$
    create table if not exists public.%I (
      id         bigserial primary key,
      sort_order integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      updated_by text
    )$f$, tbl);

  execute format('drop trigger if exists %1$I_touch on public.%1$I;
    create trigger %1$I_touch before update on public.%1$I
      for each row execute function public.touch_row();', tbl);
  execute format('drop trigger if exists %1$I_audit on public.%1$I;
    create trigger %1$I_audit after insert or update or delete on public.%1$I
      for each row execute function public.record_change();', tbl);

  execute format('alter table public.%I enable row level security', tbl);
  execute format('drop policy if exists "%1$s_select" on public.%1$I', tbl);
  execute format('create policy "%1$s_select" on public.%1$I for select using (true)', tbl);
  execute format('drop policy if exists "%1$s_insert" on public.%1$I', tbl);
  execute format('create policy "%1$s_insert" on public.%1$I
      for insert to authenticated with check (%2$s)', tbl, chk);
  execute format('drop policy if exists "%1$s_update" on public.%1$I', tbl);
  execute format('create policy "%1$s_update" on public.%1$I
      for update to authenticated using (%2$s) with check (%2$s)', tbl, chk);
  execute format('drop policy if exists "%1$s_delete" on public.%1$I', tbl);
  execute format('create policy "%1$s_delete" on public.%1$I
      for delete to authenticated using (%2$s)', tbl, chk);
  execute format('grant select on public.%I to anon, authenticated', tbl);
  execute format('grant insert, update, delete on public.%I to authenticated', tbl);
  execute format('grant usage, select on sequence public.%I to authenticated', tbl || '_id_seq');

  insert into public.pm_sheets (sheet_key, workbook, label, table_name, created_by, updated_by)
  values (p_sheet_key, p_workbook, coalesce(nullif(p_label, ''), p_sheet_key), tbl, actor, actor)
  on conflict (sheet_key) do update
        set label = excluded.label, workbook = excluded.workbook,
            hidden = false, updated_by = actor
  returning * into out;

  return out;
end;
$$;

revoke all on function public.pm_create_sheet(text, text, text) from public, anon;
grant execute on function public.pm_create_sheet(text, text, text) to authenticated;

-- ── the two registries get the usual treatment ────────────────────────────
do $$
declare
  t     text;
  nm    text;
  names text[];
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
begin
  foreach t in array array['pm_sheets', 'pm_columns']
  loop
    execute format('drop trigger if exists %1$s_touch on public.%1$s;
      create trigger %1$s_touch before update on public.%1$s
        for each row execute function public.touch_row();', t);

    select coalesce(array_agg(policyname), '{}') into names
      from pg_policies where schemaname = 'public' and tablename = t;
    foreach nm in array names loop
      execute format('drop policy if exists %I on public.%I', nm, t);
    end loop;

    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "%1$s_select" on public.%1$s for select using (true);', t);
    execute format('create policy "%1$s_insert" on public.%1$s
        for insert to authenticated with check (%2$s);', t, chk);
    execute format('create policy "%1$s_update" on public.%1$s
        for update to authenticated using (%2$s) with check (%2$s);', t, chk);
    execute format('create policy "%1$s_delete" on public.%1$s
        for delete to authenticated using (%2$s);', t, chk);
    execute format('grant select on public.%I to anon, authenticated;', t);
    execute format('grant insert, update, delete on public.%I to authenticated;', t);
  end loop;
end;
$$;

grant usage, select on sequence public.pm_columns_id_seq to authenticated;

commit;
