-- ═══════════════════════════════════════════════════════════════════════════
--  PROJECT INVENTORY — the status of other important projects
--
--  The fourth card on the Bridge's home page, beside Organization. Not KPIs
--  (ongoing measures) and not OKRs (this year's priority goals): the projects
--  worth watching to completion, each with a plain status rather than a
--  percentage, kept up to date by the department's project manager in the PM
--  Hub.
--
--  ── Who may see and change it ──
--
--  Exactly what OKRs already allow (rls-lockdown.sql), so the two pages that
--  sit side by side on the home page cannot disagree about who is let in:
--
--    Read    anyone provisioned on the hub — hub_role() is not 'none' —
--            partners included, the same as the OKR page; or an editor.
--    Write   the PM Hub's editors, from allowed_editors.
--
--  Starts empty. Projects are entered in the PM Hub, not seeded here: the
--  examples in the design review were placeholders, and loading them would
--  put invented projects in front of the organisation as fact.
--
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.projects (
  id             bigserial primary key,
  sort_order     integer not null default 0,
  title          text    not null,
  department     text,
  pm_owner       text,                 -- the project manager who keeps it current
  stakeholders   text,                 -- comma-separated, as typed
  status         text    not null default 'Not Started'
                 constraint projects_status_check check (status in
                   ('Not Started', 'On Track', 'At Risk', 'Blocked',
                    'Completed', 'On Hold', 'Archived')),
  start_date     date,
  target_date    date,
  description    text,                 -- what the project is
  latest_update  text,                 -- where it stands now, in a sentence or two
  update_date    date,                 -- when that was last written
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     text
);

create index if not exists projects_sort_idx on public.projects (sort_order, id);

-- The same pair every other maintained table gets: updated_at on write, and an
-- append-only audit row recording who changed what.
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch
  before update on public.projects
  for each row execute function public.touch_row();

drop trigger if exists projects_audit on public.projects;
create trigger projects_audit
  after insert or update or delete on public.projects
  for each row execute function public.record_change();

-- ── who may do what — the OKRs' rules, word for word ───────────────────────
alter table public.projects enable row level security;

drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select to authenticated
  using (public.hub_role() <> 'none'
         or lower(coalesce((select auth.jwt()) ->> 'email', '')) in
            (select lower(e.email) from public.allowed_editors e));

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects
  for insert to authenticated
  with check (lower(coalesce((select auth.jwt()) ->> 'email', '')) in
              (select lower(e.email) from public.allowed_editors e));

drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update to authenticated
  using (lower(coalesce((select auth.jwt()) ->> 'email', '')) in
         (select lower(e.email) from public.allowed_editors e))
  with check (lower(coalesce((select auth.jwt()) ->> 'email', '')) in
              (select lower(e.email) from public.allowed_editors e));

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects
  for delete to authenticated
  using (lower(coalesce((select auth.jwt()) ->> 'email', '')) in
         (select lower(e.email) from public.allowed_editors e));

-- Nothing for anyone who never signed in.
revoke all on public.projects from public, anon;
grant select, insert, update, delete on public.projects to authenticated;
grant usage, select on sequence public.projects_id_seq to authenticated;

commit;

-- ── check it ───────────────────────────────────────────────────────────────
-- Expect four policies, nothing granted to anon, and 0 projects on a first run.
select 'policies' as what,
       string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname) as detail
  from pg_policies
 where schemaname = 'public' and tablename = 'projects'
union all
select 'can someone not signed in read it? (must be no)',
       case when has_table_privilege('anon', 'public.projects', 'SELECT') then 'YES — check the revoke' else 'no' end
union all
select 'projects so far', count(*)::text from public.projects;
