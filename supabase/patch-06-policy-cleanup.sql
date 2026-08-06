-- ═══════════ PATCH 06 — POLICY & INDEX CLEANUP ═══════════
--
-- Clears the remaining advisories. All three are performance, not security —
-- the Critical items from patch-03 are gone and stay gone.
--
-- 1. Auth RLS Initialization Plan (31×)
--    The advisor is a *static* check on the policy expression as Postgres
--    stores it: it looks for an `auth.<fn>()` call that is not immediately
--    preceded by SELECT. patch-03's predicate is stored as
--
--        COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text)
--
--    where the parenthesis sitting between SELECT and the call is enough to
--    miss that pattern — which is why all 31 were flagged. Hoisting the call
--    into a sub-select of its own stores it as `( SELECT auth.jwt() AS jwt)`,
--    which matches, and is the form Supabase's own guidance uses.
--
--    Being straight about the size of this: EXPLAIN shows *both* forms already
--    evaluated the auth call once per query as an InitPlan, so this is lint
--    compliance and future-proofing, not a measurable speedup. Item 2 below is
--    the one with real cost attached.
--
-- 2. Multiple Permissive Policies (5×, student_contractor_counts)
--    That table collected two generations of policies — patch-02 created a set,
--    patch-03 created another under different names. Both are permissive, so
--    Postgres ORs them and evaluates both on every access. Rather than guess
--    which survived, this drops *every* policy on the managed tables and lays
--    down exactly one per action.
--
-- 3. Unused Index (8×)
--    Driven from pg_stat_user_indexes rather than a hand-written list, because
--    the advisory does not say which index it means and I would be guessing:
--    it reports one unused index on `employees`, which has three. This drops
--    exactly the ones with zero recorded scans, and never one backing a primary
--    key or unique constraint.
--
--    Worth knowing: "unused" means zero scans since statistics were last reset,
--    so on a young database an index can look idle simply because nothing has
--    needed it yet. At these row counts — the largest table is 153 — Postgres
--    will choose a sequential scan regardless, so the conclusion is the same
--    either way, and any of these is one line to recreate if the data grows.
--
-- Run after patch-05. Safe to re-run.

begin;

-- ── 1 & 2. one clean set of policies ──────────────────────────────────────
do $$
declare
  t     text;
  nm    text;
  names text[];
  -- "the signed-in caller is on the editor list". The auth call sits in a
  -- sub-select of its own so it stores as `( SELECT auth.jwt() AS jwt)` — see
  -- the note above on why the parenthesis placement is what the advisor reads.
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
begin
  foreach t in array array[
    'okrs', 'employees', 'student_employees', 'org_chart_nodes', 'kpis',
    'student_contractor_counts', 'app_text', 'performance_sections',
    'performance_services', 'performance_metric_links'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    -- Clear whatever is there, whatever earlier patches called it. The names are
    -- collected first rather than dropped inside a cursor over pg_policies —
    -- deleting rows out from under a catalog scan you are still iterating is
    -- asking for skipped entries.
    select coalesce(array_agg(policyname), '{}') into names
      from pg_policies where schemaname = 'public' and tablename = t;
    foreach nm in array names loop
      execute format('drop policy if exists %I on public.%I', nm, t);
    end loop;

    execute format('alter table public.%I enable row level security;', t);

    -- Read: open. The hub is a static site carrying only the anon key, which is
    -- the same exposure this data had as checked-in .js files.
    execute format(
      'create policy "%1$s_select" on public.%1$s
         for select using (true);', t);

    -- Write: provisioned editors only. `to authenticated` means anon never even
    -- evaluates these — the role filter rejects it first.
    execute format(
      'create policy "%1$s_insert" on public.%1$s
         for insert to authenticated with check (%2$s);', t, chk);

    execute format(
      'create policy "%1$s_update" on public.%1$s
         for update to authenticated using (%2$s) with check (%2$s);', t, chk);

    execute format(
      'create policy "%1$s_delete" on public.%1$s
         for delete to authenticated using (%2$s);', t, chk);
  end loop;

  -- allowed_editors: signed-in users may read it (the policies above need to),
  -- nobody edits it from a client. No auth call at all — the role filter is the
  -- whole condition.
  select coalesce(array_agg(policyname), '{}') into names
    from pg_policies where schemaname = 'public' and tablename = 'allowed_editors';
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.allowed_editors', nm);
  end loop;
  execute 'create policy "allowed_editors_select" on public.allowed_editors
             for select to authenticated using (true)';

  -- change_log: readable by editors, written only by triggers.
  select coalesce(array_agg(policyname), '{}') into names
    from pg_policies where schemaname = 'public' and tablename = 'change_log';
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.change_log', nm);
  end loop;
  execute format('create policy "change_log_select" on public.change_log
                    for select to authenticated using (%s)', chk);
end;
$$;

-- the audit trail stays append-only
revoke insert, update, delete on public.change_log from anon, authenticated;

-- ── 3. indexes with no recorded scans ─────────────────────────────────────
do $$
declare
  nm    text;
  names text[];
begin
  -- collected up front, for the same reason as the policies above
  select coalesce(array_agg(s.indexrelname::text), '{}') into names
    from pg_stat_user_indexes s
    join pg_index i on i.indexrelid = s.indexrelid
   where s.schemaname = 'public'
     and s.idx_scan = 0
     and not i.indisprimary
     and not i.indisunique
     -- never touch an index a constraint depends on
     and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid);

  foreach nm in array names loop
    execute format('drop index if exists public.%I', nm);
    raise notice 'dropped unused index %', nm;
  end loop;
  raise notice '% unused index(es) dropped', coalesce(array_length(names, 1), 0);
end;
$$;

commit;

-- ── what you should see afterwards ────────────────────────────────────────
-- Four policies per data table, one per action, no duplicates anywhere.
select tablename,
       count(*)                               as policies,
       count(*) filter (where cmd = 'SELECT') as sel,
       count(*) filter (where cmd = 'INSERT') as ins,
       count(*) filter (where cmd = 'UPDATE') as upd,
       count(*) filter (where cmd = 'DELETE') as del
  from pg_policies
 where schemaname = 'public'
 group by tablename
 order by tablename;
