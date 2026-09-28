-- ═══════════════════════════════════════════════════════════════════════════
--  EMERGING ISSUES — pinning, and changing an issue's status
--
--  Two things an issue can now have done to it after it is raised, and nothing
--  else:
--
--  ── Pinning ──
--
--  A pinned issue sits in Current Week whatever its age, for everyone reading
--  the register, until someone unpins it — then it goes back to the week its
--  age puts it in. Anyone in Student Services may pin or unpin (staff,
--  directors, admins). Partners read the register but cannot pin.
--
--  ── Status ──
--
--  Exploring → Resolution in progress → Resolved, and back if need be. The
--  person who raised the issue may change it, and so may any director or admin.
--  Who changed it and when is recorded on the row.
--
--  ── Everything else stays as it was written ──
--
--  The register was built on "report once, and that is the record": the title,
--  the description, the severity and the department are what the person said
--  when they raised it. That still holds. Direct UPDATE on the table is taken
--  away from signed-in users altogether, and the only ways to change a row are
--  the two functions below, each of which touches its own columns and nothing
--  more. Nothing on the site updated this table before this file — the page
--  only ever inserted — so no existing feature loses anything.
--
--  ── The home tile and the nav bell ──
--
--  They count "this week" as the register's Current Week tab, on purpose (see
--  emerging-issues-brief-window.sql). A pinned issue is in Current Week now, so
--  those counts include pinned issues and Last Week excludes them — otherwise
--  the tile would disagree with the tab it links to, which is exactly what that
--  file exists to prevent.
--
--  Run after emerging-issues-partners.sql and emerging-issues-brief-window.sql.
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. the columns ─────────────────────────────────────────────────────────
alter table public.emerging_issues add column if not exists pinned_at         timestamptz;
alter table public.emerging_issues add column if not exists pinned_by         text;
alter table public.emerging_issues add column if not exists status_changed_at timestamptz;
alter table public.emerging_issues add column if not exists status_changed_by text;

-- ── 2. the view the page reads ─────────────────────────────────────────────
-- v_emerging_issues was created in the database directly, so its definition is
-- not in this repo. It is extended the same way emerging-issue-categories.sql
-- added `category`: the live definition wrapped, with the new columns joined
-- on at the end — the only change `create or replace view` allows.
do $$
declare
  def text;
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'v_emerging_issues'
                and column_name = 'pinned_at') then
    raise notice 'v_emerging_issues already exposes pinned_at — nothing to do.';
    return;
  end if;

  select pg_get_viewdef('public.v_emerging_issues'::regclass, true) into def;
  def := rtrim(btrim(def), ';');
  execute format(
    'create or replace view public.v_emerging_issues as
       select base.*, e.pinned_at, e.pinned_by, e.status_changed_at, e.status_changed_by
         from (%s) base
         join public.emerging_issues e on e.id = base.id',
    def);
end $$;

-- Re-creating a view resets this, and without it the view would read past
-- row-level security as its owner.
alter view public.v_emerging_issues set (security_invoker = on);

-- ── 3. pinning ─────────────────────────────────────────────────────────────
-- SECURITY DEFINER because nobody holds UPDATE on the table any more; the
-- checks inside are therefore the whole of the rule, and are written first.
-- hub_role() still reads the caller's own session, not the owner's.
-- Returns whether the issue is now pinned. Not void: a void function can come
-- back with no body at all, and the page's database helper reads one.
create or replace function public.ei_set_pin(p_id bigint, p_pinned boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(public.hub_role(), 'none') not in ('staff', 'director', 'admin') then
    raise exception 'Only Student Services can pin or unpin an issue.'
      using errcode = '42501';
  end if;

  update public.emerging_issues
     set pinned_at = case when p_pinned then coalesce(pinned_at, now()) end,
         pinned_by = case when p_pinned
                          then coalesce(pinned_by, lower(coalesce((select auth.jwt()) ->> 'email', '')))
                     end
   where id = p_id;

  if not found then
    raise exception 'There is no issue %.', p_id using errcode = 'P0002';
  end if;
  return p_pinned;
end $$;

-- ── 4. status ──────────────────────────────────────────────────────────────
-- Written in a block because it has to keep `resolved_at` right if the table
-- has that column (the home tile's open and resolved counts read it), and this
-- repo cannot see the table's definition to know for certain.
do $$
declare
  keeps_resolved boolean;
  resolved_clause text := '';
begin
  select exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'emerging_issues'
                    and column_name = 'resolved_at')
    into keeps_resolved;

  if keeps_resolved then
    resolved_clause :=
      ', resolved_at = case when p_status = ''Resolved'' then coalesce(resolved_at, now()) end';
  end if;

  execute format($f$
    create or replace function public.ei_set_status(p_id bigint, p_status text)
    returns text
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $body$
    declare
      me     text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
      my_role text := coalesce(public.hub_role(), 'none');
      raiser text;
    begin
      if p_status not in ('Exploring', 'Resolution in progress', 'Resolved') then
        raise exception 'Unknown status: %%.', p_status using errcode = '22023';
      end if;

      select lower(coalesce(raised_by, '')) into raiser
        from public.emerging_issues where id = p_id;
      if not found then
        raise exception 'There is no issue %%.', p_id using errcode = 'P0002';
      end if;

      -- The raiser, while still inside Student Services, or any director/admin.
      if not (my_role in ('director', 'admin')
              or (my_role = 'staff' and me <> '' and raiser = me)) then
        raise exception 'Only the person who raised this issue, or a director or admin, can change its status.'
          using errcode = '42501';
      end if;

      update public.emerging_issues
         set status = p_status,
             status_changed_at = now(),
             status_changed_by = me
             %s
       where id = p_id;
      return p_status;
    end $body$;
  $f$, resolved_clause);
end $$;

-- Callable by signed-in readers only; each function decides for itself.
revoke all on function public.ei_set_pin(bigint, boolean)  from public, anon;
revoke all on function public.ei_set_status(bigint, text)   from public, anon;
grant execute on function public.ei_set_pin(bigint, boolean) to authenticated;
grant execute on function public.ei_set_status(bigint, text)  to authenticated;

-- ── 5. nothing else is editable ────────────────────────────────────────────
-- Inserting (raising an issue) is untouched. Updating is now only possible
-- through the two functions above.
revoke update on public.emerging_issues from public, anon, authenticated;

-- ── 6. the home tile and the nav bell count pins as this week ─────────────
-- Identical to emerging-issues-brief-window.sql except where marked PINNED.
create or replace view public.v_emerging_issues_brief as
  select open_total, red_open, amber_open, exploring, in_progress, going_stale,
         resolved_30d, raised_7d, raised_prev7, critical_open
    from (
      select
        count(*) filter (where v.resolved_at is null) as open_total,
        -- PINNED: a pinned Critical is on the Current Week tab whatever its age.
        count(*) filter (
          where (v.age_days < 7 or v.pinned_at is not null)
            and v.severity = 'Critical'
        ) as red_open,
        count(*) filter (where v.resolved_at is null and v.severity = 'Moderate') as amber_open,
        count(*) filter (where v.resolved_at is null and v.status = 'Exploring') as exploring,
        count(*) filter (where v.resolved_at is null and v.status = 'Resolution in progress') as in_progress,
        count(*) filter (where v.resolved_at is null and v.days_since_update >= 14) as going_stale,
        count(*) filter (where v.resolved_at >= (now() - interval '30 days')) as resolved_30d,
        -- PINNED: the Current Week tab, pins included.
        count(*) filter (where v.age_days < 7 or v.pinned_at is not null) as raised_7d,
        -- PINNED: Last Week, with pinned issues taken out of it.
        count(*) filter (
          where v.age_days >= 7 and v.age_days < 14
            and v.pinned_at is null
        ) as raised_prev7,
        count(*) filter (
          where v.severity = 'Critical'
            and v.status is distinct from 'Resolved'
        ) as critical_open
      from public.v_emerging_issues v
    ) b
   where public.hub_sees_emerging_issues();

alter view public.v_emerging_issues_brief set (security_invoker = on);
revoke all on public.v_emerging_issues_brief from anon;
grant select on public.v_emerging_issues_brief to authenticated;

commit;

-- ── check it ───────────────────────────────────────────────────────────────
-- Expect: the four new columns on the table and the view; both functions; no
-- UPDATE left for signed-in users; and each tile figure equal to its tab, pins
-- counted in Current Week and taken out of Last Week.
select 'columns on the view' as what,
       string_agg(column_name, ', ' order by column_name) as detail
  from information_schema.columns
 where table_schema = 'public' and table_name = 'v_emerging_issues'
   and column_name in ('pinned_at', 'pinned_by', 'status_changed_at', 'status_changed_by')
union all
select 'functions', string_agg(routine_name, ', ' order by routine_name)
  from information_schema.routines
 where routine_schema = 'public' and routine_name in ('ei_set_pin', 'ei_set_status')
union all
select 'can a signed-in user UPDATE directly? (must be no)',
       case when has_table_privilege('authenticated', 'public.emerging_issues', 'UPDATE')
            then 'YES — check the revoke' else 'no' end
union all
select 'tile this week = Current Week tab',
       (select b.raised_7d from public.v_emerging_issues_brief b)::text || ' = ' ||
       (select count(*) from public.v_emerging_issues
         where age_days < 7 or pinned_at is not null)::text
union all
select 'tile last week = Last Week tab',
       (select b.raised_prev7 from public.v_emerging_issues_brief b)::text || ' = ' ||
       (select count(*) from public.v_emerging_issues
         where age_days >= 7 and age_days < 14 and pinned_at is null)::text;
