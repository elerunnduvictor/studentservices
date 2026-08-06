-- ═══════════ PATCH 02 — DEPARTMENT NAMES & STUDENT CONTRACTOR COUNTS ═══════════
--
-- Two things the first pass left behind.
--
-- 1. The same department was spelled two ways — staff carried
--    "Student Records, Registration, and Support" while student employees kept
--    the workbook's "Records, Registration & Support". The hub read them as two
--    departments and drew two bars for one team.
--
-- 2. `STUDENT_CONTRACTORS` — the per-department headcount of student
--    contractors — was still a hardcoded map in directory/js/employees.js. It is
--    the only figure on the directory that was not coming from the database, so
--    it moves here.
--
-- Run once, after reconcile-directory.sql. Safe to re-run.

begin;

-- ── audit trigger, fixed ───────────────────────────────────────────────────
-- The first version hard-coded `new.id`, which fails on any table whose primary
-- key is not called "id" — `student_contractor_counts` is keyed by department.
-- This looks the key up from the catalog instead, so the same trigger works on
-- every table, and records it as text as well as a number.
alter table public.change_log
  add column if not exists row_key text;

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

-- ── 1. one spelling per department ─────────────────────────────────────────
update public.employees
   set department = 'Student Records, Registration, and Support'
 where department in ('Records, Registration & Support',
                      'Records, Registration, Support',
                      'Student Records, Registration & Support');

update public.student_employees
   set department = 'Student Records, Registration, and Support'
 where department in ('Records, Registration & Support',
                      'Records, Registration, Support',
                      'Student Records, Registration & Support');

-- ── 2. student contractor headcount, per department ────────────────────────
-- An aggregate, not a roster: these people are contracted in bulk and are not
-- tracked individually, so a count per department is the honest shape.
create table if not exists public.student_contractor_counts (
  department  text primary key,
  headcount   integer not null default 0 check (headcount >= 0),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

comment on table public.student_contractor_counts is
  'Per-department student contractor headcount shown on the directory and department dashboards.';

drop trigger if exists student_contractor_counts_touch on public.student_contractor_counts;
create trigger student_contractor_counts_touch before update on public.student_contractor_counts
  for each row execute function public.touch_row();

drop trigger if exists student_contractor_counts_audit on public.student_contractor_counts;
create trigger student_contractor_counts_audit
  after insert or update or delete on public.student_contractor_counts
  for each row execute function public.record_change();

alter table public.student_contractor_counts enable row level security;

-- Policies, in the same shape every other table uses.
--
-- An earlier version of this file called these "scc *" and checked a
-- SECURITY DEFINER helper, public.is_editor(). That helper is gone — patch-03
-- retired it, because a privileged function every client role may execute is a
-- standing invitation, and the question it answered ("is my email on the list?")
-- is one a signed-in user can ask directly. Any leftovers under either name are
-- swept first so re-running cannot leave two permissive sets on one table.
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
   where schemaname = 'public' and tablename = 'student_contractor_counts';
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.student_contractor_counts', nm);
  end loop;

  execute 'create policy "student_contractor_counts_select"
             on public.student_contractor_counts for select using (true)';

  execute format('create policy "student_contractor_counts_insert"
             on public.student_contractor_counts
             for insert to authenticated with check (%s)', chk);

  execute format('create policy "student_contractor_counts_update"
             on public.student_contractor_counts
             for update to authenticated using (%1$s) with check (%1$s)', chk);

  execute format('create policy "student_contractor_counts_delete"
             on public.student_contractor_counts
             for delete to authenticated using (%s)', chk);
end;
$$;

insert into public.student_contractor_counts (department, headcount) values
  ('Student Records, Registration, and Support', 338),
  ('Enrollment & Retention',                     455),
  ('Digital Operations',                           0),
  ('Dean of Students',                             0)
on conflict (department) do update set headcount = excluded.headcount;

grant select on public.student_contractor_counts to anon, authenticated;

commit;
