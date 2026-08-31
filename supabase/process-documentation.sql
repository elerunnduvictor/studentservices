-- ═══════════ PROCESS DOCUMENTATION ═══════════
--
-- Documentation of what is actually live in Supabase, not a migration to run.
--
-- This was applied by hand in the SQL Editor, not from a file in this repo —
-- there was no committed source for it until now. What follows was written by
-- reading the live database directly (pg_policies, information_schema,
-- pg_constraint, pg_proc, pg_trigger) on 2026-08-26, updated same-day for two
-- live changes (processes_insert's admin branch widened to also allow
-- scope_department IS NULL; a steward_email column added, with
-- processes_select/processes_update widened to also match it, so a process a
-- PM created on a steward's behalf is visible/editable to that steward), and
-- is meant to be run only in the disaster-recovery case of rebuilding the
-- project from nothing,
-- the same way schema.sql and access-control.sql are. It should reproduce
-- what's live; if the two ever drift, the database is the truth and this file
-- is stale — check here first if a fresh rebuild behaves differently from
-- production.
--
-- ── the two lists, and why they are separate ──────────────────────────────
--
-- `hub_access` (access-control.sql) answers "what may this person read on the
-- hub" — partner, staff, director, admin. `process_stewards` answers a
-- different question: "may this person author process documentation," which
-- is deliberately NOT derived from hub_access.role. The table comment, set
-- directly on the live table, records why:
--
--   "Explicit allow-list of people permitted to create/edit their own process
--    documents. Confirmed with Elie on 2026-08-18 — do not derive from
--    hub_access.role."
--
-- ── who may see and do what (as the live policies actually read) ──────────
--
--   A steward sees and authors their own rows — matched by `created_by` OR
--   `steward_email`, since a PM-created row's `created_by` is the PM, not
--   the steward it's actually for. `steward_email` (added 2026-08-26) is
--   populated at creation from whichever steward the row is for: the
--   creator's own email when a steward makes their own row, or the picked
--   steward's email when a PM makes it on their behalf. Editing is only
--   possible while a row is Draft or Submitted; once a reviewer moves it to
--   Reviewed or Archived it locks.
--
--   A reviewer is `hub_access.role = 'admin'` — directors are NOT reviewers
--   of process documentation, unlike everywhere else that role pair shows up
--   in this app. `scope_department` decides how much an admin reviewer sees:
--   set, that department only; null, everything (Jess Swinburne's and Elie
--   Gilles Ravel Mambou's case).
--
--   A reviewer can also create a row on behalf of a steward — the "PM
--   creates for a steward" path. Same "null or equals" shape as select/
--   update: a department-scoped admin may only create within their own
--   department, and an org-wide admin (scope_department null) may create for
--   a steward in any department — deliberately widened same-day from an
--   earlier version of this branch that required an exact match, which shut
--   the two org-wide admins out of this path entirely. `created_by` is
--   always the PM's own email, never the steward's; `steward_name`/
--   `steward_role`/`department` are display text describing whose process it
--   is, which is why ownership was never modeled as a foreign key into
--   process_stewards in the first place.
--
--   process_stewards is readable by any signed-in staff/director/admin
--   (`hub_role() in (staff, director, admin)` — partners cannot see it) and
--   writable only by `allowed_editors` — the PM Hub roster, the same gate
--   every PM-editable reference table (departments, kpi_categories, ...)
--   already uses. There is no UI in this repo for editing it; someone on that
--   roster edits it directly, or a future PM Hub sheet is built for it.
--
-- ── the guard trigger ───────────────────────────────────────────────────────
--
-- `processes_guard` (BEFORE UPDATE only — it does not fire on INSERT) is what
-- actually enforces "reviewed_by/reviewed_at are reviewer-only, and a steward
-- may only ever move status to Submitted," since the `processes_update`
-- policy's WITH CHECK does not restrict columns on its own. It re-derives "is
-- this caller a reviewer for this row" itself (same test as the RLS
-- policies: hub_access.role = 'admin', active, in scope for NEW.department)
-- rather than trusting anything the client sent:
--
--   reviewer   any status change auto-stamps reviewed_by/reviewed_at from the
--              caller's own JWT and the clock — a client-supplied value for
--              either is silently overwritten, never trusted.
--   steward    reviewed_by/reviewed_at are never theirs — any change to
--              either raises. status may move to exactly one place,
--              Submitted (their own Draft → Submitted); any other new
--              status, e.g. jumping straight to Reviewed or Archived, also
--              raises. RLS's own USING clause is what already limits which
--              rows a steward can reach at all (status in Draft/Submitted),
--              so the trigger only has to police where they're allowed to
--              move TO.
--
-- There is no more "Needs Changes" status and no more status_note column —
-- both retired together, since status_note only ever existed to carry a
-- reviewer's reason for bouncing a row back to Needs Changes. A reviewer now
-- only ever sets Reviewed or Archived; there is no bounce-back state.
--
-- ── table grants ────────────────────────────────────────────────────────────
-- Same wide-open PostgREST default as `employees` and `kpis` — RLS is the
-- boundary, not the grant. Confirmed with Victor as the existing convention
-- for this schema, not an oversight; nothing to tighten here.
--
-- Safe to re-run.

begin;

-- ── who may author process documentation ──────────────────────────────────
create table if not exists public.process_stewards (
  email       text primary key,
  full_name   text not null,
  department  text not null,
  job_title   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

comment on table public.process_stewards is
  'Explicit allow-list of people permitted to create/edit their own process documents. Confirmed with Elie on 2026-08-18 — do not derive from hub_access.role.';

-- ── the processes themselves ───────────────────────────────────────────────
create table if not exists public.processes (
  id                    bigint generated always as identity primary key,

  process_name          text not null,
  steward_name          text not null,   -- display text only; ownership is created_by, below
  steward_role          text,
  department            text not null references public.departments(name),
  population_impacted   text[] default '{}',
  frequency             text,
  description           text,
  tools_systems         text[] default '{}',   -- free-form, no fixed list
  has_existing_doc      boolean not null default false,
  storage_location_url  text,
  workflow_steps        text[] default '{}',   -- ordered; array order is the step order
  supporting_documents  jsonb not null default '[]'::jsonb,  -- [{ "title": ..., "url": ... }, ...]

  -- Reviewer-only by convention, not by any database constraint — see the
  -- note above. The front end is what keeps this true today.
  status                text not null default 'Draft'
                          check (status in ('Draft', 'Submitted', 'Reviewed', 'Archived')),
  reviewed_by           text,
  reviewed_at           timestamptz,

  created_by            text not null,   -- who wrote the row; matched against auth.jwt() ->> 'email'
  steward_email         text,            -- who the row is actually for (2026-08-26) —
                                          -- lets a PM-created row still reach the steward's own login
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  updated_by            text
);

comment on table public.processes is
  'Process documentation (Hub v1). Stakeholders create/own their own rows via process_stewards allow-list, or a PM creates one on a steward''s behalf within their own department; PMs (hub_access role=admin scoped to department) review and set status.';

-- ── guarding the reviewer-only fields ──────────────────────────────────────
-- See the file header for what this does and does not cover.
create or replace function public.process_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
  is_reviewer boolean;
begin
  select exists (
    select 1 from public.hub_access h
    where lower(h.email) = actor
      and h.active
      and h.role = 'admin'
      and (h.scope_department is null or h.scope_department = new.department)
  ) into is_reviewer;

  if is_reviewer then
    if new.status is distinct from old.status then
      new.reviewed_by := actor;
      new.reviewed_at := now();
    end if;
  else
    -- steward: reviewed_by/reviewed_at are never theirs to touch
    if new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
    then
      raise exception 'Only a reviewer can change reviewed_by or reviewed_at.';
    end if;

    -- a steward may submit (-> Submitted) or leave status unchanged
    -- (editing content on a Draft or already-Submitted row). Any other
    -- transition (jumping to Reviewed/Archived) is blocked. RLS's
    -- USING clause restricts which rows a steward can reach at all
    -- (status in Draft/Submitted), so this only needs to constrain
    -- where they're allowed to move TO.
    if new.status is distinct from old.status and new.status <> 'Submitted' then
      raise exception 'Only a reviewer can set this status.';
    end if;
  end if;

  return new;
end;
$$;

-- ── triggers ────────────────────────────────────────────────────────────
-- Alphabetical order matters: processes_guard (order 1) settles the row
-- before processes_touch (order 2) stamps updated_at/updated_by on top of it.
drop trigger if exists processes_guard on public.processes;
create trigger processes_guard before update on public.processes
  for each row execute function public.process_guard();
drop trigger if exists processes_touch on public.processes;
create trigger processes_touch before update on public.processes
  for each row execute function public.touch_row();
drop trigger if exists processes_audit on public.processes;
create trigger processes_audit after insert or update or delete on public.processes
  for each row execute function public.record_change();

drop trigger if exists process_stewards_touch on public.process_stewards;
create trigger process_stewards_touch before update on public.process_stewards
  for each row execute function public.touch_row();
drop trigger if exists process_stewards_audit on public.process_stewards;
create trigger process_stewards_audit after insert or update or delete on public.process_stewards
  for each row execute function public.record_change();

-- ── row level security ─────────────────────────────────────────────────────
alter table public.process_stewards enable row level security;
do $$
declare nm text; names text[];
begin
  select coalesce(array_agg(policyname), '{}') into names
    from pg_policies where schemaname = 'public' and tablename = 'process_stewards';
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.process_stewards', nm);
  end loop;
end;
$$;

-- Any signed-in staff/director/admin may read the roster — partners cannot.
-- Written only by allowed_editors, same gate as every other PM-editable
-- reference table.
create policy "process_stewards_select" on public.process_stewards
  for select using (hub_role() = any (array['staff', 'director', 'admin']));

create policy "process_stewards_insert" on public.process_stewards
  for insert with check (
    lower(coalesce((select auth.jwt()) ->> 'email', '')) in
    (select lower(e.email) from public.allowed_editors e)
  );
create policy "process_stewards_update" on public.process_stewards
  for update using (
    lower(coalesce((select auth.jwt()) ->> 'email', '')) in
    (select lower(e.email) from public.allowed_editors e)
  ) with check (
    lower(coalesce((select auth.jwt()) ->> 'email', '')) in
    (select lower(e.email) from public.allowed_editors e)
  );
create policy "process_stewards_delete" on public.process_stewards
  for delete using (
    lower(coalesce((select auth.jwt()) ->> 'email', '')) in
    (select lower(e.email) from public.allowed_editors e)
  );

alter table public.processes enable row level security;
do $$
declare nm text; names text[];
begin
  select coalesce(array_agg(policyname), '{}') into names
    from pg_policies where schemaname = 'public' and tablename = 'processes';
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.processes', nm);
  end loop;
end;
$$;

-- Own rows (created_by OR steward_email — a PM-created row's created_by is
-- the PM, not the steward it's for), or an admin reviewer whose scope covers
-- this row's department. Directors do not see this table at all.
create policy "processes_select" on public.processes
  for select using (
    lower(created_by) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    or lower(coalesce(steward_email, '')) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    or exists (
      select 1 from public.hub_access h
       where lower(h.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
         and h.active and h.role = 'admin'
         and (h.scope_department is null or h.scope_department = processes.department)
    )
  );

-- Two ways in, both requiring created_by to be the caller's own email:
--   1. a provisioned, active steward creating their own row, or
--   2. an admin reviewer (hub_access role=admin) creating a row on behalf of
--      a steward — scope_department null or equal to the row's department,
--      same shape as select/update, so an org-wide admin may create for a
--      steward in any department while a scoped PM is still limited to their
--      own. created_by is still the PM's own email, never the steward's;
--      steward_name/steward_role are just descriptive text for whose process
--      this is.
create policy "processes_insert" on public.processes
  for insert with check (
    (
      lower(created_by) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
      and lower(coalesce((select auth.jwt()) ->> 'email', '')) in
          (select lower(s.email) from public.process_stewards s where s.active)
    )
    or
    (
      lower(created_by) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
      and exists (
        select 1 from public.hub_access h
         where lower(h.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
           and h.active and h.role = 'admin'
           and (h.scope_department is null or h.scope_department = processes.department)
      )
    )
  );

-- One combined policy — own row (created_by OR steward_email) while unlocked
-- (Draft or Submitted), OR an admin reviewer in scope. Note the WITH CHECK:
-- it does not additionally restrict status on the steward branch, nor which
-- columns either branch may touch. See the file header — that gap is covered
-- at the application layer and by processes_guard today.
create policy "processes_update" on public.processes
  for update using (
    (
      (
        lower(created_by) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
        or lower(coalesce(steward_email, '')) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
      )
      and status in ('Draft', 'Submitted')
    )
    or exists (
      select 1 from public.hub_access h
       where lower(h.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
         and h.active and h.role = 'admin'
         and (h.scope_department is null or h.scope_department = processes.department)
    )
  ) with check (
    lower(created_by) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    or exists (
      select 1 from public.hub_access h
       where lower(h.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
         and h.active and h.role = 'admin'
         and (h.scope_department is null or h.scope_department = processes.department)
    )
  );

-- Gated the same way every other table's delete is — allowed_editors only.
-- Nobody reachable from the processes/ page can reach this; there is no
-- delete affordance in that UI.
create policy "processes_delete" on public.processes
  for delete using (
    lower(coalesce((select auth.jwt()) ->> 'email', '')) in
    (select lower(e.email) from public.allowed_editors e)
  );

commit;

-- ── check ─────────────────────────────────────────────────────────────────
select count(*) as stewards from public.process_stewards where active;
select status, count(*) from public.processes group by status order by 1;
