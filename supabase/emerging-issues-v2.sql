-- ═══════════════════════════════════════════════════════════════════════════
--  EMERGING ISSUES — SECOND PASS
--
--  Four changes, all driven by what the register turned out to need in use.
--
--  1. THREE STATUSES INSTEAD OF FIVE.
--     "Open, Investigating, Monitoring, Escalated, Resolved" asked people to
--     make a distinction they were not making. What anyone actually wanted to
--     know was whether someone has worked out what this is yet, whether
--     something is being done, or whether it is finished:
--
--         Exploring              still working out what it is
--         Resolution in progress something is being done about it
--         Resolved               finished
--
--  2. NO TARGET DATE. Nobody was setting one honestly, and a promised date
--     nobody promised is worse than no date. "Overdue" and "due this week"
--     go with it — both would have reported a permanent zero.
--
--  3. NO OWNER FIELD. It was a free-text name typed by whoever opened the
--     form. Who raised an issue is already known for certain from the signed-in
--     session, and that is stamped by trigger; asking a second time invited a
--     third answer.
--
--  4. THE BRIEF COUNTS WHAT STILL EXISTS. Escalated, overdue and due-this-week
--     are gone; the two new status counts take their place.
--
--  5. THE NAME OF WHOEVER RAISED IT, not their login. `raised_by` holds an
--     email, and the page could only turn "mgefrom@byupw.edu" into "mgefrom".
--     The name lives in hub_access.full_name, which staff and directors are not
--     allowed to read — its policy admits PM editors and admins only, and
--     loosening it would hand everyone the whole access table to get at one
--     column. So the name is resolved once, at the moment the issue is raised,
--     by the trigger that already stamps the email: it is SECURITY DEFINER and
--     can read hub_access even though the reader cannot. Stamping also means
--     the byline survives someone later leaving hub_access.
--
--  The `title`, `impact`, `owner` and `target_date` columns are KEPT, not
--  dropped. Issues already raised carry real text in them, and a migration
--  that deletes what people wrote to tidy up a form is not a tidy-up. New
--  issues simply stop writing to `impact`, `owner` and `target_date`.
--
--  Both views are dropped and rebuilt rather than replaced — see the note above
--  section 2 for why neither could be done with `create or replace`.
--
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. status: three words ────────────────────────────────────────────────
-- The constraint comes off before the values can move through it.
alter table public.emerging_issues
  drop constraint if exists emerging_issues_status_check;

-- Old → new. Two of the five said "we are still working out what this is" and
-- two said "something is being done"; that is the whole of the distinction
-- anyone was really drawing.
update public.emerging_issues
   set status = case status
     when 'Open'          then 'Exploring'
     when 'Investigating' then 'Exploring'
     when 'Monitoring'    then 'Resolution in progress'
     when 'Escalated'     then 'Resolution in progress'
     -- The first pass of this patch said "in process". The word is "progress";
     -- naming it here means re-running the file is all it takes to correct a
     -- database that already went through the earlier version.
     when 'Resolution in process' then 'Resolution in progress'
     else status
   end
 where status in ('Open', 'Investigating', 'Monitoring', 'Escalated',
                  'Resolution in process');

-- The log keeps its own copy of the status at the time of writing, so those
-- move too or the history would read in two vocabularies.
update public.emerging_issue_updates
   set status_then = case status_then
     when 'Open'          then 'Exploring'
     when 'Investigating' then 'Exploring'
     when 'Monitoring'    then 'Resolution in progress'
     when 'Escalated'     then 'Resolution in progress'
     -- The first pass of this patch said "in process". The word is "progress";
     -- naming it here means re-running the file is all it takes to correct a
     -- database that already went through the earlier version.
     when 'Resolution in process' then 'Resolution in progress'
     else status_then
   end
 where status_then in ('Open', 'Investigating', 'Monitoring', 'Escalated',
                       'Resolution in process');

alter table public.emerging_issues
  alter column status set default 'Exploring';

alter table public.emerging_issues
  add constraint emerging_issues_status_check
  check (status in ('Exploring', 'Resolution in progress', 'Resolved'));

-- ── 1b. who raised it, by name ────────────────────────────────────────────
alter table public.emerging_issues
  add column if not exists raised_by_name text;

comment on column public.emerging_issues.raised_by_name is
  'Display name resolved from hub_access at insert. Stamped, not joined: the '
  'readers of this table cannot select from hub_access.';

-- Resolve a login to a person's name. SECURITY DEFINER on purpose — it is
-- called from the stamping trigger on behalf of someone who may not read
-- hub_access, and it returns only a name for an email handed to it.
create or replace function public.hub_display_name(p_email text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select nullif(btrim(a.full_name), '')
    from public.hub_access a
   where lower(btrim(a.email)) = lower(btrim(p_email))
   limit 1;
$fn$;

revoke all on function public.hub_display_name(text) from public, anon, authenticated;

create or replace function public.stamp_emerging_issue()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'INSERT' then
    new.raised_by := coalesce(new.raised_by, (select auth.jwt()) ->> 'email');
    -- Falls back to the email when the address is not in hub_access, which is
    -- still better than a blank byline.
    new.raised_by_name := coalesce(
      new.raised_by_name,
      public.hub_display_name(new.raised_by),
      new.raised_by);
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

-- Issues already raised get their names filled in the same way.
update public.emerging_issues
   set raised_by_name = coalesce(public.hub_display_name(raised_by), raised_by)
 where raised_by_name is null and raised_by is not null;

-- ── 2. the two views ──────────────────────────────────────────────────────
-- DROP then CREATE, not CREATE OR REPLACE. Two separate reasons, and both are
-- errors rather than preferences:
--
--   · `create or replace view` may only APPEND columns. The brief loses
--     `escalated`, `overdue` and `due_this_week`, and Postgres answers
--     "cannot drop columns from view" and rolls the whole patch back.
--
--   · `v_emerging_issues` is written as `select i.*`, and a star is expanded
--     once, when the view is created. The view therefore still lists exactly
--     the columns the table had that day. Adding `raised_by_name` to the table
--     above does not add it to the view, so the page would never have seen the
--     name no matter how faithfully the trigger stamped it.
--
-- The brief reads from v_emerging_issues, so it goes first and comes back last.
-- Plain `drop view`, never `cascade`: if something else has come to depend on
-- either of these, that should stop the patch and be looked at, not be quietly
-- destroyed on the way past.
drop view if exists public.v_emerging_issues_brief;
drop view if exists public.v_emerging_issues;

-- Unchanged from supabase/emerging-issues.sql except that the star now also
-- picks up raised_by_name.
create view public.v_emerging_issues
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

-- Every figure here has to be one a reader could act on. A count that can only
-- ever be zero — overdue, with no target dates being set — is not a fact about
-- the work, it is a fact about the form, and it does not belong on a summary.
--
-- The Student Services guard stays: an aggregate always returns a row, so
-- counting nothing would answer "0" to a partner rather than refusing them.
create view public.v_emerging_issues_brief
with (security_invoker = true) as
select * from (
  select
    count(*) filter (where resolved_at is null)                             as open_total,
    count(*) filter (where resolved_at is null and severity = 'Critical')   as red_open,
    count(*) filter (where resolved_at is null and severity = 'Moderate')   as amber_open,
    count(*) filter (where resolved_at is null and status = 'Exploring')    as exploring,
    count(*) filter (where resolved_at is null
                       and status = 'Resolution in progress')               as in_progress,
    -- Raised but untouched for a fortnight: the quiet failure mode, and now
    -- the only time-based signal left, since target dates are gone.
    count(*) filter (where resolved_at is null and days_since_update >= 14) as going_stale,
    count(*) filter (where resolved_at >= now() - interval '30 days')       as resolved_30d,
    count(*) filter (where created_at  >= now() - interval '7 days')        as raised_7d
  from public.v_emerging_issues
) b
where public.hub_role() in ('staff', 'director', 'admin');

-- Dropping a view drops its grants with it, so both are given back.
grant select on public.v_emerging_issues       to authenticated;
grant select on public.v_emerging_issues_brief to authenticated;

commit;

-- ── what this leaves behind ───────────────────────────────────────────────
select status, count(*) from public.emerging_issues group by status order by 1;
select raised_by, raised_by_name from public.emerging_issues order by id desc limit 10;
