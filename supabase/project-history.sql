-- ═══════════════════════════════════════════════════════════════════════════
--  PROJECT INVENTORY — HISTORY
--
--  What a project said on each earlier date: its status, workflow stage and
--  update note, one row per date it changed. The Bridge's project panel reads
--  this for its "View history" view; the live row in public.projects is always
--  the current version, so it is never copied here.
--
--  ── How a row gets here ──
--
--  projects_history_stamp, BEFORE INSERT OR UPDATE on public.projects:
--
--    INSERT   update_date blank → today. No history row: there is no earlier
--             version yet.
--    UPDATE   "content changed" = status, workflow or latest_update differs.
--             · Changed, and the save left update_date as it was → stamp it
--               with today. A date the editor set themselves is kept.
--             · Changed, and update_date now differs from before → the OLD
--               status / workflow / note go into project_history, dated
--               old.update_date (or the day the row was created, if it never
--               had one).
--             · Changed on the same date (a second edit that day), or only
--               other columns edited (description, stakeholders, dates…) →
--               no history row; the day's version is simply corrected.
--
--  ── Alongside the existing triggers ──
--
--  BEFORE triggers on one table fire in name order. projects_history_stamp
--  sorts before projects_touch, so it runs first; the two set different
--  columns (update_date here, updated_at / updated_by there) and neither reads
--  what the other writes, so the order does not change the outcome either way.
--  projects_audit is an AFTER trigger and sees the finished row, stamped
--  update_date included, so change_log records exactly what was stored.
--
--  ── Who may see and change it ──
--
--  Read: the same rule as projects_select, so anyone who can see a project can
--  see its history. Write: nobody from the browser. There are no insert,
--  update or delete policies and no write grants; rows arrive only through
--  the trigger function, which runs as its owner.
--
--  "Today" is current_date in the database's time zone (UTC on Supabase).
--
--  Safe to re-run: the table, index and policy are created once; the function
--  and trigger are replaced. Nothing to backfill — no project has an earlier
--  dated version yet.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.project_history (
  id             bigint generated always as identity primary key,
  project_id     bigint      not null references public.projects (id) on delete cascade,
  as_of          date        not null,   -- the date that version was current from
  status         text        not null,
  workflow       text,
  latest_update  text,
  recorded_at    timestamptz not null default now(),
  recorded_by    text        default coalesce(auth.jwt() ->> 'email', 'system')
);

create index if not exists project_history_project_idx
  on public.project_history (project_id, as_of desc, recorded_at desc);

-- ── who may do what ────────────────────────────────────────────────────────
alter table public.project_history enable row level security;

drop policy if exists "project_history_select" on public.project_history;
create policy "project_history_select" on public.project_history
  for select to authenticated
  using (public.hub_role() <> 'none'
         or lower(coalesce((select auth.jwt()) ->> 'email', '')) in
            (select lower(e.email) from public.allowed_editors e));

revoke all on public.project_history from public, anon, authenticated;
grant select on public.project_history to authenticated;

-- ── the trigger ────────────────────────────────────────────────────────────
create or replace function public.projects_history_stamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  content_changed boolean;
begin
  if tg_op = 'INSERT' then
    if new.update_date is null then
      new.update_date := current_date;
    end if;
    return new;
  end if;

  content_changed := new.status        is distinct from old.status
                  or new.workflow      is distinct from old.workflow
                  or new.latest_update is distinct from old.latest_update;
  if not content_changed then
    return new;
  end if;

  -- The editor left the date alone: today is when this was written.
  if new.update_date is not distinct from old.update_date then
    new.update_date := current_date;
  end if;

  -- A new date means the old version is now history. The same date means a
  -- correction to the day's version, which keeps no copy.
  if new.update_date is distinct from old.update_date then
    insert into public.project_history
           (project_id, as_of, status, workflow, latest_update, recorded_by)
    values (old.id,
            coalesce(old.update_date, old.created_at::date),
            old.status, old.workflow, old.latest_update,
            coalesce(auth.jwt() ->> 'email', 'system'));
  end if;

  return new;
end;
$$;

revoke all on function public.projects_history_stamp() from public, anon, authenticated;

drop trigger if exists projects_history_stamp on public.projects;
create trigger projects_history_stamp
  before insert or update on public.projects
  for each row execute function public.projects_history_stamp();

commit;

-- ── check it ───────────────────────────────────────────────────────────────
-- Expect: the table; one policy (project_history_select, SELECT); authenticated
-- with SELECT only and anon with nothing; and three triggers on projects —
-- projects_history_stamp and projects_touch (BEFORE, in that order) and
-- projects_audit (AFTER).
select 'table' as what,
       case when to_regclass('public.project_history') is not null then 'exists' else 'MISSING' end as detail
union all
select 'policies',
       string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname)
  from pg_policies
 where schemaname = 'public' and tablename = 'project_history'
union all
select 'grants: ' || grantee,
       string_agg(privilege_type, ', ' order by privilege_type)
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'project_history'
   and grantee in ('anon', 'authenticated')
 group by grantee
union all
select 'can anon read it? (must be no)',
       case when has_table_privilege('anon', 'public.project_history', 'SELECT') then 'YES — check the revoke' else 'no' end;

select tgname as trigger_name,
       case when tgtype & 2 = 2 then 'BEFORE' else 'AFTER' end as timing,
       pg_get_triggerdef(oid) as definition
  from pg_trigger
 where tgrelid = 'public.projects'::regclass and not tgisinternal
 order by timing desc, tgname;
