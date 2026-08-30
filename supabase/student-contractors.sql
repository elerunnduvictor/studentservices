-- ═══════════ STUDENT CONTRACTORS ═══════════
--
-- A place to record student contractors by name, for the PM Hub's Directory
-- workbook. Mirrors `student_employees` — same shape, same policies, same
-- Active/Inactive behaviour — with one deliberate difference that is the whole
-- point of the table:
--
--   IT IS NOT IN v_hub_directory.
--
-- The hub's directory page reads that view, which unions `employees` and
-- `student_employees` and nothing else. A name in this table therefore cannot
-- appear on the hub directory — not because a filter excludes it, but because
-- no query the hub runs ever touches this table. That is the stronger form of
-- the guarantee: there is no flag to get wrong and no filter to forget.
--
-- The hub does show student contractors, but only as a headcount per
-- department, from `student_contractor_counts`. That table is untouched here.
-- The two are maintained separately, which is worth knowing: adding a person
-- here does not change the number the hub shows. See the note at the end.
--
-- Run once. Safe to re-run.

begin;

-- ── the table ─────────────────────────────────────────────────────────────
-- Columns mirror student_employees exactly. Nothing extra is invented here: if
-- a field turns out to be wanted (a contract organisation, say), the PM Hub's
-- own "Add column" button adds it, which is the route that keeps `pm_columns`
-- aware of it and makes it removable again.
create table if not exists public.student_contractors (
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
create index if not exists student_contractors_sort_idx
  on public.student_contractors (sort_order, id);
create index if not exists student_contractors_name_idx
  on public.student_contractors (lower(name));

-- ── triggers ──────────────────────────────────────────────────────────────
-- Same pair every other maintained table gets: updated_at on write, and an
-- append-only audit row recording who changed what.
drop trigger if exists student_contractors_touch on public.student_contractors;
create trigger student_contractors_touch
  before update on public.student_contractors
  for each row execute function public.touch_row();

drop trigger if exists student_contractors_audit on public.student_contractors;
create trigger student_contractors_audit
  after insert or update or delete on public.student_contractors
  for each row execute function public.record_change();

-- ── row-level security ────────────────────────────────────────────────────
-- Read: Student Services only, exactly as `employees` and `student_employees`
--       are restricted in access-control.sql. A partner gets no rows.
-- Write: the editors in `allowed_editors`, exactly as every other PM Hub table.
do $$
declare
  nm    text;
  names text[];
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
begin
  select coalesce(array_agg(policyname), '{}') into names
    from pg_policies
   where schemaname = 'public' and tablename = 'student_contractors';
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.student_contractors', nm);
  end loop;

  execute 'alter table public.student_contractors enable row level security';

  execute 'create policy "student_contractors_select" on public.student_contractors
      for select using (public.hub_role() in (''staff'', ''director'', ''admin''))';

  execute format('create policy "student_contractors_insert" on public.student_contractors
      for insert to authenticated with check (%s)', chk);
  execute format('create policy "student_contractors_update" on public.student_contractors
      for update to authenticated using (%1$s) with check (%1$s)', chk);
  execute format('create policy "student_contractors_delete" on public.student_contractors
      for delete to authenticated using (%s)', chk);
end;
$$;

-- Deliberately not granted to anon. Nothing unauthenticated has any business
-- reading a roster, and the hub never asks for this table at all.
grant select, insert, update, delete on public.student_contractors to authenticated;
grant usage, select on sequence public.student_contractors_id_seq to authenticated;

commit;

-- ── what you should see ───────────────────────────────────────────────────
-- The table exists, is restricted to Student Services, and — the part that
-- matters — does not appear anywhere in the view the hub's directory reads.
select 'policies on student_contractors' as check_name,
       coalesce(string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname), 'NONE')
  from pg_policies
 where schemaname = 'public' and tablename = 'student_contractors'

union all
select 'is it in v_hub_directory? (must be NO)',
       case when pg_get_viewdef('public.v_hub_directory'::regclass) like '%student_contractors%'
            then 'YES — STOP, names would reach the hub directory'
            else 'no' end

union all
select 'rows', count(*)::text from public.student_contractors;

-- ── the headcount is separate, for now ────────────────────────────────────
--
-- `student_contractor_counts` holds the per-department headcount the hub shows.
-- It is maintained by hand and is untouched by this table. Adding a person here
-- does not move that number — which is the intended behaviour today: the hub's
-- figure stays exactly as it is while this roster is being built up.
--
-- Whether the two should eventually agree is an open question, not a settled
-- one. Before wiring them together, check the scale. The headcount is 793
-- people (455 Enrollment & Retention, 338 Records) against a named directory of
-- 179 — these contractors are counted rather than listed because there are far
-- more of them than anyone would type in. A view summing this table while it
-- holds a fraction of that population would report far too few and shrink what
-- the hub's directory and department pages show.
--
-- So: derive the count from this table only once this table genuinely holds the
-- people the number claims. Until then, two records, kept apart on purpose.
