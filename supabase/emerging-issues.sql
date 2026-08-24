-- ═══════════════════════════════════════════════════════════════════════════
--  EMERGING ISSUES
--
--  "The ideal on this site is that the AI is just saying, here's what's going
--   on today and this is a problem, focus on that. We're creating the
--   repository and we're structuring the data in hopes that that's what you
--   get."                                                    — Ben Packer
--
--  That sentence is the whole design brief, and it is a brief about *data*, not
--  about a page. An assistant can only say "focus on this" if the record says
--  which things are worse than others, which are moving, which have gone quiet,
--  and what they are attached to. So the schema carries:
--
--    · severity and status as separate axes — a Red issue that is being
--      actively worked is not the same as a Red issue nobody has touched
--    · a running log, not just a current state, so an issue has a direction
--    · a link to the KPI or OKR it threatens, because the digest Ben described
--      reads across all three: "this KPI is down, this OKR is behind, this
--      emerging issue is red"
--    · first_observed and target_date, so "its due date is approaching" is a
--      fact the database knows rather than something a human has to notice
--
--  Silence is the signal that is easiest to miss and cheapest to compute, so
--  `days_since_update` is exposed as a first-class column: an issue nobody has
--  written on for three weeks is itself worth surfacing.
--
--  ── access ────────────────────────────────────────────────────────────────
--  Student Services only. Partners are third parties and get nothing — not a
--  filtered list, not an empty page they could inspect: the rows never leave
--  Postgres. Enforced here rather than in the browser, exactly like the rest of
--  the hub.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── the issue ─────────────────────────────────────────────────────────────
create table if not exists public.emerging_issues (
  id               bigserial primary key,
  title            text not null,
  summary          text,                    -- what is happening
  impact           text,                    -- who or what it affects

  department       text,
  sub_department   text,
  raised_by        text,                    -- email, stamped on insert
  owner            text,                    -- the person carrying it

  -- Two axes on purpose. Severity is how bad it is; status is what is being
  -- done about it. Collapsing them into one field is what makes a board lie:
  -- "Red / Resolved" and "Red / nobody looking" would read the same.
  severity         text not null default 'Amber'
                     check (severity in ('Red', 'Amber', 'Green')),
  status           text not null default 'Open'
                     check (status in ('Open', 'Investigating', 'Monitoring',
                                       'Escalated', 'Resolved')),

  first_observed   date not null default current_date,
  target_date      date,                    -- when it should be settled by
  resolved_at      timestamptz,

  -- What this threatens. Both optional: not every issue maps to a measure, and
  -- forcing one would produce false links that an assistant would then repeat.
  linked_kpi_id    bigint references public.kpis(id) on delete set null,
  linked_okr_id    bigint references public.okrs(id) on delete set null,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       text
);

create index if not exists emerging_issues_open_idx
  on public.emerging_issues (severity, status) where resolved_at is null;
create index if not exists emerging_issues_dept_idx
  on public.emerging_issues (department);

comment on table public.emerging_issues is
  'Issues Student Services is watching. Severity is how bad; status is what is being done.';

-- ── the running log ───────────────────────────────────────────────────────
-- An issue with no history is a snapshot. This is what lets someone — or
-- something — say whether a problem is getting better or worse.
create table if not exists public.emerging_issue_updates (
  id           bigserial primary key,
  issue_id     bigint not null references public.emerging_issues(id) on delete cascade,
  note         text not null,
  -- Copied at the time of writing, so the log still reads correctly after the
  -- issue itself moves on.
  severity_then text,
  status_then   text,
  created_at   timestamptz not null default now(),
  created_by   text
);
create index if not exists emerging_issue_updates_issue_idx
  on public.emerging_issue_updates (issue_id, created_at desc);

comment on table public.emerging_issue_updates is
  'Chronological notes against an issue — the direction of travel, not just the current state.';

-- ── stamps ────────────────────────────────────────────────────────────────
-- Who raised it and who last touched it, without asking the browser to be
-- honest about either.
create or replace function public.stamp_emerging_issue()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'INSERT' then
    new.raised_by := coalesce(new.raised_by, (select auth.jwt()) ->> 'email');
  end if;
  new.updated_at := now();
  new.updated_by := coalesce((select auth.jwt()) ->> 'email', new.updated_by);
  -- Resolving stamps the time once; re-opening clears it.
  if new.status = 'Resolved' and new.resolved_at is null then
    new.resolved_at := now();
  elsif new.status <> 'Resolved' then
    new.resolved_at := null;
  end if;
  return new;
end;
$fn$;

drop trigger if exists emerging_issues_stamp on public.emerging_issues;
create trigger emerging_issues_stamp before insert or update on public.emerging_issues
  for each row execute function public.stamp_emerging_issue();

create or replace function public.stamp_issue_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  new.created_by := coalesce(new.created_by, (select auth.jwt()) ->> 'email');
  -- Snapshot the issue's state so the note keeps its context.
  if new.severity_then is null or new.status_then is null then
    select coalesce(new.severity_then, i.severity), coalesce(new.status_then, i.status)
      into new.severity_then, new.status_then
      from public.emerging_issues i where i.id = new.issue_id;
  end if;
  return new;
end;
$fn$;

drop trigger if exists emerging_issue_updates_stamp on public.emerging_issue_updates;
create trigger emerging_issue_updates_stamp before insert on public.emerging_issue_updates
  for each row execute function public.stamp_issue_update();

-- ── the reading view ──────────────────────────────────────────────────────
-- Everything the page and an assistant both need, computed once here rather
-- than recalculated in two places that could disagree.
create or replace view public.v_emerging_issues
with (security_invoker = true) as
  select
    i.*,
    (current_date - i.first_observed)                       as age_days,
    (select count(*) from public.emerging_issue_updates u
      where u.issue_id = i.id)                              as update_count,
    (select max(u.created_at) from public.emerging_issue_updates u
      where u.issue_id = i.id)                              as last_update_at,
    -- Silence is a signal. Null means nobody has ever written on it, which is
    -- louder than a stale note, so it falls back to the day it was raised.
    (current_date - coalesce(
       (select max(u.created_at)::date from public.emerging_issue_updates u
         where u.issue_id = i.id),
       i.created_at::date))                                 as days_since_update,
    case
      when i.target_date is null then null
      else (i.target_date - current_date)
    end                                                     as days_to_target,
    k.kpi_measure                                           as linked_kpi,
    o.okr                                                   as linked_okr
  from public.emerging_issues i
  left join public.kpis k on k.id = i.linked_kpi_id
  left join public.okrs o on o.id = i.linked_okr_id;

-- ── what an assistant would open first ────────────────────────────────────
-- Not a chart and not a list: the handful of facts that answer "what should I
-- look at today". Kept as a view so the answer is the same whether it is read
-- by the page, by a weekly digest, or by a model.
create or replace view public.v_emerging_issues_brief
with (security_invoker = true) as
  select
    count(*) filter (where resolved_at is null)                          as open_total,
    count(*) filter (where resolved_at is null and severity = 'Red')     as red_open,
    count(*) filter (where resolved_at is null and severity = 'Amber')   as amber_open,
    count(*) filter (where resolved_at is null and status = 'Escalated') as escalated,
    -- Raised but untouched for a fortnight: the quiet failure mode.
    count(*) filter (where resolved_at is null and days_since_update >= 14) as going_stale,
    -- Ben's "its due date is approaching", as a number.
    count(*) filter (where resolved_at is null and days_to_target between 0 and 7) as due_this_week,
    count(*) filter (where resolved_at is null and days_to_target < 0)   as overdue,
    count(*) filter (where resolved_at >= now() - interval '30 days')    as resolved_30d,
    count(*) filter (where created_at  >= now() - interval '7 days')     as raised_7d
  from public.v_emerging_issues;

-- ── access: Student Services only ─────────────────────────────────────────
alter table public.emerging_issues        enable row level security;
alter table public.emerging_issue_updates enable row level security;

do $do$
declare
  -- Anyone the hub knows as staff, a director or an admin. A partner is a third
  -- party: they are not "none", they are simply not Student Services, and this
  -- is the one place in the hub where that distinction is the entire point.
  inside constant text := $q$public.hub_role() in ('staff','director','admin')$q$;
  t text;
  nm text;
  names text[];
begin
  foreach t in array array['emerging_issues', 'emerging_issue_updates'] loop
    select coalesce(array_agg(policyname), '{}') into names
      from pg_policies where schemaname = 'public' and tablename = t;
    foreach nm in array names loop
      execute format('drop policy if exists %I on public.%I', nm, t);
    end loop;

    execute format('create policy "%1$s_select" on public.%1$s
                      for select to authenticated using (%2$s)', t, inside);
    execute format('create policy "%1$s_insert" on public.%1$s
                      for insert to authenticated with check (%2$s)', t, inside);
    execute format('create policy "%1$s_update" on public.%1$s
                      for update to authenticated using (%2$s) with check (%2$s)', t, inside);
  end loop;
end;
$do$;

-- Nobody deletes an issue. Resolving it is the ending; removing it would erase
-- the history the whole thing exists to accumulate.
revoke delete on public.emerging_issues        from anon, authenticated;
revoke delete on public.emerging_issue_updates from anon, authenticated;
grant select, insert, update on public.emerging_issues        to authenticated;
grant select, insert, update on public.emerging_issue_updates to authenticated;
grant select on public.v_emerging_issues       to authenticated;
grant select on public.v_emerging_issues_brief to authenticated;

commit;

-- The audit triggers attach themselves: supabase/history.sql installed an event
-- trigger that fires on CREATE TABLE, so both tables above are already being
-- recorded in change_log without another pass.
select c.relname as table_name,
       count(*) filter (where t.tgname like '%\_audit') > 0 as audited
  from pg_class c
  join pg_namespace ns on ns.oid = c.relnamespace
  left join pg_trigger t on t.tgrelid = c.oid and not t.tgisinternal
 where ns.nspname = 'public'
   and c.relname in ('emerging_issues', 'emerging_issue_updates')
 group by c.relname;
