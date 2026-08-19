-- ═══════════════════════════════════════════════════════════════════════════
--  KEEPING THE NUMBERS, NOT JUST THE LATEST ONE
--
--  `kpis.current_value` and `okrs.progress` are overwritten every time they are
--  updated, so the tables only ever hold today. That is why the KPI value
--  history came back as zero: nothing was lost through a fault, there was
--  simply never anywhere for a previous value to go.
--
--  change_log records whole-row snapshots and would let a series be
--  reconstructed, but only for edits made from now on, and only by unpicking
--  JSON. These two tables make the series first-class instead: one row per
--  reading, carrying enough identity to still mean something after a measure is
--  renamed, reassigned or deleted. That is the shape something analysing trends
--  later will want -- no joins to interpret, no JSON to unpack.
--
--  Append-only, and readable by editors exactly like change_log.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. every table in the hub, not a list of five ─────────────────────────
-- Discovered rather than enumerated. A hand-written list was how this drifted
-- in the first place: tables added by later patches -- the performance
-- standards, the workbook tabs, the sheet builder -- were never added to it, so
-- edits to them went unrecorded and nobody could tell, because an audit trail
-- that is missing rows looks exactly like a period when nothing happened.
--
-- The ledgers themselves are excluded: auditing the audit trail would recurse,
-- and page views are their own record already.
do $do$
declare
  t        record;
  ledgers  text[] := array['change_log', 'hub_events',
                           'kpi_value_history', 'okr_progress_history'];
  touchable boolean;
  n        int := 0;
begin
  for t in
    select c.relname as name
      from pg_class c
      join pg_namespace ns on ns.oid = c.relnamespace
     where ns.nspname = 'public'
       and c.relkind in ('r', 'p')          -- ordinary and partitioned tables
       and c.relname <> all (ledgers)
     order by c.relname
  loop
    execute format(
      'drop trigger if exists %1$I on public.%2$I;
       create trigger %1$I after insert or update or delete on public.%2$I
         for each row execute function public.record_change();',
      t.name || '_audit', t.name);

    -- `updated_at`/`updated_by` only where the table actually has them;
    -- attaching touch_row() elsewhere would fail on the first update.
    select count(*) = 2 into touchable
      from information_schema.columns
     where table_schema = 'public' and table_name = t.name
       and column_name in ('updated_at', 'updated_by');

    if touchable then
      execute format(
        'drop trigger if exists %1$I on public.%2$I;
         create trigger %1$I before update on public.%2$I
           for each row execute function public.touch_row();',
        t.name || '_touch', t.name);
    end if;
    n := n + 1;
  end loop;
  raise notice 'audit trigger attached to % tables', n;
end;
$do$;

-- ── 2. every KPI reading ──────────────────────────────────────────────────
create table if not exists public.kpi_value_history (
  id              bigserial primary key,
  kpi_id          bigint references public.kpis(id) on delete set null,
  -- Copied, not joined: a reading should still be readable after the KPI it
  -- came from has been renamed or removed.
  employee        text,
  department      text,
  kpi_measure     text,
  value           text,          -- as stored: "0.93", "3 minutes"
  tracking_status text,
  update_date     date,          -- the period the reading belongs to
  recorded_at     timestamptz not null default now(),
  recorded_by     text
);
create index if not exists kpi_value_history_kpi_time_idx
  on public.kpi_value_history (kpi_id, recorded_at desc);
create index if not exists kpi_value_history_time_idx
  on public.kpi_value_history (recorded_at desc);

comment on table public.kpi_value_history is
  'One row per KPI reading. The scorecard shows only the current value; this is the series behind it.';

create or replace function public.record_kpi_value()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  -- Only when the measurement itself moved. Editing a band or a data source is
  -- a change to the KPI, not a new reading, and would otherwise flatten the
  -- series with duplicates.
  if tg_op = 'UPDATE'
     and new.current_value is not distinct from old.current_value
     and new.update_date   is not distinct from old.update_date then
    return new;
  end if;
  if new.current_value is null then return new; end if;

  insert into public.kpi_value_history
    (kpi_id, employee, department, kpi_measure, value,
     tracking_status, update_date, recorded_by)
  values
    (new.id, new.employee, new.department, new.kpi_measure, new.current_value,
     new.tracking_status, new.update_date,
     coalesce((select auth.jwt()) ->> 'email', 'system'));
  return new;
end;
$fn$;

drop trigger if exists kpis_value_history on public.kpis;
create trigger kpis_value_history after insert or update on public.kpis
  for each row execute function public.record_kpi_value();

-- ── 3. every OKR reading ──────────────────────────────────────────────────
create table if not exists public.okr_progress_history (
  id                  bigserial primary key,
  okr_id              bigint references public.okrs(id) on delete set null,
  okr                 text,
  key_result          text,
  period              text,
  primary_stakeholder text,
  project_manager     text,
  goal                numeric,
  stretch_goal        numeric,
  progress            numeric,
  status              text,
  trend               text,
  update_date         date,
  recorded_at         timestamptz not null default now(),
  recorded_by         text
);
create index if not exists okr_progress_history_okr_time_idx
  on public.okr_progress_history (okr_id, recorded_at desc);
create index if not exists okr_progress_history_time_idx
  on public.okr_progress_history (recorded_at desc);

comment on table public.okr_progress_history is
  'One row per OKR reading -- progress, status and trend as they stood.';

create or replace function public.record_okr_progress()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'UPDATE'
     and new.progress    is not distinct from old.progress
     and new.status      is not distinct from old.status
     and new.trend       is not distinct from old.trend
     and new.update_date is not distinct from old.update_date then
    return new;
  end if;
  if new.progress is null and new.status is null then return new; end if;

  insert into public.okr_progress_history
    (okr_id, okr, key_result, period, primary_stakeholder, project_manager,
     goal, stretch_goal, progress, status, trend, update_date, recorded_by)
  values
    (new.id, new.okr, new.key_result, new.period, new.primary_stakeholder,
     new.project_manager, new.goal, new.stretch_goal, new.progress, new.status,
     new.trend, new.update_date,
     coalesce((select auth.jwt()) ->> 'email', 'system'));
  return new;
end;
$fn$;

drop trigger if exists okrs_progress_history on public.okrs;
create trigger okrs_progress_history after insert or update on public.okrs
  for each row execute function public.record_okr_progress();

-- ── 4. today as the first point ───────────────────────────────────────────
-- Without this the series starts empty and the first future edit has nothing to
-- be a change from. Guarded so re-running the script adds nothing.
insert into public.kpi_value_history
  (kpi_id, employee, department, kpi_measure, value,
   tracking_status, update_date, recorded_by)
select id, employee, department, kpi_measure, current_value,
       tracking_status, update_date, 'baseline'
  from public.kpis
 where current_value is not null
   and not exists (select 1 from public.kpi_value_history);

insert into public.okr_progress_history
  (okr_id, okr, key_result, period, primary_stakeholder, project_manager,
   goal, stretch_goal, progress, status, trend, update_date, recorded_by)
select id, okr, key_result, period, primary_stakeholder, project_manager,
       goal, stretch_goal, progress, status, trend, update_date, 'baseline'
  from public.okrs
 where (progress is not null or status is not null)
   and not exists (select 1 from public.okr_progress_history);

-- ── 5. same footing as the audit trail ────────────────────────────────────
alter table public.kpi_value_history    enable row level security;
alter table public.okr_progress_history enable row level security;

drop policy if exists "kpi_value_history_select"    on public.kpi_value_history;
drop policy if exists "okr_progress_history_select" on public.okr_progress_history;

create policy "kpi_value_history_select" on public.kpi_value_history
  for select to authenticated using (
    lower(coalesce((select auth.jwt()) ->> 'email', '')) in
    (select lower(e.email) from public.allowed_editors e)
  );
create policy "okr_progress_history_select" on public.okr_progress_history
  for select to authenticated using (
    lower(coalesce((select auth.jwt()) ->> 'email', '')) in
    (select lower(e.email) from public.allowed_editors e)
  );

-- Written by triggers running as the table owner; never by a client.
revoke insert, update, delete on public.kpi_value_history    from anon, authenticated;
revoke insert, update, delete on public.okr_progress_history from anon, authenticated;
grant select on public.kpi_value_history    to authenticated;
grant select on public.okr_progress_history to authenticated;

-- ── 6. tables that do not exist yet ───────────────────────────────────────
-- Section 1 covers everything present today, but a table added next month
-- would arrive unaudited and stay that way until someone remembered. This
-- attaches the trigger as part of creating it.
--
-- Event triggers need rights the hosted role may not have, so failure here is
-- caught and reported rather than losing the whole script. If it is skipped,
-- nothing is broken -- re-running this file after adding a table does the same
-- job by hand.
do $do$
begin
  create or replace function public.audit_new_table()
  returns event_trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
  as $fn$
  declare
    obj record;
    ledgers text[] := array['change_log', 'hub_events',
                            'kpi_value_history', 'okr_progress_history'];
  begin
    for obj in select * from pg_event_trigger_ddl_commands() loop
      if obj.command_tag = 'CREATE TABLE' and obj.schema_name = 'public' then
        if split_part(obj.object_identity, '.', 2) <> all (ledgers) then
          execute format(
            'create trigger %1$I after insert or update or delete on %2$s
               for each row execute function public.record_change();',
            split_part(obj.object_identity, '.', 2) || '_audit', obj.object_identity);
        end if;
      end if;
    end loop;
  end;
  $fn$;

  drop event trigger if exists audit_new_table_trg;
  create event trigger audit_new_table_trg
    on ddl_command_end when tag in ('CREATE TABLE')
    execute function public.audit_new_table();
  raise notice 'new tables will be audited automatically';
exception when insufficient_privilege or feature_not_supported then
  raise notice 'could not install the auto-attach trigger (%) -- re-run this file after adding a table', sqlerrm;
end;
$do$;

commit;

-- ── what is now covered ───────────────────────────────────────────────────
select c.relname                                    as table_name,
       count(*) filter (where t.tgname like '%\_audit') > 0 as audited,
       count(*) filter (where t.tgname like '%\_touch') > 0 as stamps_author
  from pg_class c
  join pg_namespace ns on ns.oid = c.relnamespace
  left join pg_trigger t on t.tgrelid = c.oid and not t.tgisinternal
 where ns.nspname = 'public' and c.relkind in ('r', 'p')
 group by c.relname
 order by audited, c.relname;
