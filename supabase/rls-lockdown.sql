-- ═══════════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY — CLOSING THE HUB TO CALLERS WHO NEVER SIGNED IN
--
--  Today, with nothing but the anon key that ships in shared/js/config.js:
--
--      v_hub_org_chart / org_chart_nodes    53 people, with work emails
--      v_hub_okrs / okrs                    50 objectives, stakeholders, comments
--      performance_sections / _services     12 + 56 rows
--      department_kpi_matrix                44 rows
--      kpi_categories / kpi_baselines       6 + 31 rows
--
--  all return 200 and every row. kpis, employees and student_employees are
--  refused — so the line is already drawn, just not around everything.
--
--  ── Why it drifted ──
--
--  schema.sql's RLS block loops over
--      okrs, employees, student_employees, org_chart_nodes, kpis
--  and gives each one `for select using (true)`. Its header says so outright:
--  "Read: anyone with the anon key ... nothing gets less private by moving to
--  Postgres." That was true when it was written — the hub had no accounts yet.
--
--  access-control.sql then introduced roles and replaced that policy for kpis,
--  employees and student_employees. It never revisited okrs or
--  org_chart_nodes, and the tables added afterwards were never brought under
--  the rule at all. The intent moved on; five tables did not.
--
--  ── The rule this file applies ──
--
--  Reading anything in the hub requires a provisioned, signed-in account:
--
--      for select to authenticated
--        using (public.hub_role() <> 'none' or <on the editor list>)
--
--  Two halves, and both matter. `to authenticated` means an anonymous caller
--  never evaluates the expression at all — it is refused by the policy rather
--  than by an error. `hub_role() <> 'none'` means a signed-in account that is
--  not on the access list, or has been deactivated, gets nothing either.
--
--  ...or the caller is on allowed_editors, so that anyone who may write a
--  table can also read it. See STEP 1.
--
--  This does NOT touch kpis, employees, student_employees, processes,
--  process_stewards or emerging_issues. Those have real, narrower rules of
--  their own in access-control.sql and their own patch files, and this file
--  would only flatten them.
--
--  ── Belt and braces ──
--
--  The grants are withdrawn from anon as well, so a refusal reads as
--  "permission denied for table x" rather than a silent empty array. RLS is
--  the boundary; the grant is a second lock on the same door, and it is the
--  one that still holds if a policy is ever dropped by hand.
--
--  Safe to run more than once. Run access-control.sql first — this depends on
--  hub_role() and stops with a clear message if it is missing.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 0: refuse to run half-configured ───────────────────────────────────
do $$
begin
  if to_regprocedure('public.hub_role()') is null then
    raise exception
      'public.hub_role() does not exist. Run supabase/access-control.sql first — without it every policy below would deny everyone, including admins.';
  end if;
end $$;


-- ── STEP 1: the tables that were open ───────────────────────────────────────
do $$
declare
  t     text;
  nm    text;
  names text[];
  -- "the signed-in caller is on the editor list" — the same write rule the
  -- other tables already carry, quoted from schema.sql so the two cannot
  -- drift. The auth call sits in a scalar sub-select so it is evaluated once
  -- per query rather than once per row.
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
  targets constant text[] := array[
    'okrs',
    'org_chart_nodes',
    'performance_sections',
    'performance_services',
    'department_kpi_matrix',
    'kpi_categories',
    'kpi_baselines'
  ];
begin
  foreach t in array targets loop
    if to_regclass('public.' || t) is null then
      raise notice 'skipped %: no such table', t;
      continue;
    end if;

    -- Several of these were never brought under RLS at all, which is why they
    -- answer anon in full. Enabling it is idempotent.
    execute format('alter table public.%I enable row level security', t);

    -- Replace every policy that can grant a read, whatever it happens to be
    -- called. Two permissive policies covering one action are ORed together,
    -- so leaving an old `using (true)` behind would undo everything below.
    select coalesce(array_agg(policyname), '{}') into names
      from pg_policies
     where schemaname = 'public' and tablename = t and cmd in ('SELECT', 'ALL');
    foreach nm in array names loop
      execute format('drop policy if exists %I on public.%I', nm, t);
    end loop;

    -- The editor clause is not decoration. Reading is gated on hub_access and
    -- writing on allowed_editors, and nothing keeps the two lists in step: all
    -- seven editors happen to be admins on the access list today, but the next
    -- person added to allowed_editors alone could write a table they could not
    -- read. "You can always read what you may write" is cheaper to state here
    -- than to debug later.
    execute format($p$
      create policy "%1$s_select" on public.%1$s
        for select to authenticated
        using (public.hub_role() <> 'none' or %2$s)$p$, t, chk);

    -- The writes have to be restated here, not left alone. Enabling RLS on a
    -- table that had none turns "everyone may write" into "nobody may write",
    -- and the PM hub edits kpi_baselines, kpi_categories and
    -- department_kpi_matrix. Dropping the ALL policies above could take a
    -- write rule with it as well. Same editor rule okrs and kpis already use,
    -- so anyone editing today keeps editing.
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);

    execute format('create policy "%1$s_insert" on public.%1$s
        for insert to authenticated with check (%2$s)', t, chk);
    execute format('create policy "%1$s_update" on public.%1$s
        for update to authenticated using (%2$s) with check (%2$s)', t, chk);
    execute format('create policy "%1$s_delete" on public.%1$s
        for delete to authenticated using (%2$s)', t, chk);

    raise notice 'locked down %', t;
  end loop;
end $$;


-- ── STEP 1b: the headcounts ─────────────────────────────────────────────────
-- student_contractor_counts was returning all four rows to anon. It is easy to
-- miss because it is not what its name suggests: not a view over
-- student_contractors, but a separate table of per-department headcounts kept
-- by hand (793 people against a named directory of 179 — they are counted
-- rather than listed).
--
-- It gets the roster's rule rather than STEP 1's, because it is the roster's
-- number: staff and above, matching student_contractors in
-- student-contractors.sql. Partners are already refused the headcount cards on
-- a department page and the directory outright, so nothing they can see
-- depends on it, and dept-dashboard.js reads a missing department as zero.
do $$
declare
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
  nm    text;
  names text[];
begin
  if to_regclass('public.student_contractor_counts') is null then
    raise notice 'skipped student_contractor_counts: no such table';
    return;
  end if;

  execute 'alter table public.student_contractor_counts enable row level security';

  select coalesce(array_agg(policyname), '{}') into names
    from pg_policies
   where schemaname = 'public' and tablename = 'student_contractor_counts'
     and cmd in ('SELECT', 'ALL');
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.student_contractor_counts', nm);
  end loop;

  execute 'create policy "student_contractor_counts_select"
      on public.student_contractor_counts for select to authenticated
      using (public.hub_role() in (''staff'', ''director'', ''admin''))';

  execute format('drop policy if exists %I on public.student_contractor_counts',
                 'student_contractor_counts_insert');
  execute format('drop policy if exists %I on public.student_contractor_counts',
                 'student_contractor_counts_update');
  execute format('drop policy if exists %I on public.student_contractor_counts',
                 'student_contractor_counts_delete');
  execute format('create policy "student_contractor_counts_insert"
      on public.student_contractor_counts for insert to authenticated
      with check (%s)', chk);
  execute format('create policy "student_contractor_counts_update"
      on public.student_contractor_counts for update to authenticated
      using (%1$s) with check (%1$s)', chk);
  execute format('create policy "student_contractor_counts_delete"
      on public.student_contractor_counts for delete to authenticated
      using (%s)', chk);

  raise notice 'locked down student_contractor_counts';
end $$;


-- ── STEP 2: a view must not read past the policies underneath it ────────────
-- Without security_invoker a view runs with its owner's rights, and every rule
-- in STEP 1 is bypassed by anyone who queries the view instead of the table.
-- schema.sql sets this on the three views it defines; the ones added later are
-- not in the repo at all, so they are set here rather than assumed.
do $$
declare
  v text;
  views constant text[] := array[
    'v_hub_org_chart', 'v_hub_okrs', 'v_hub_kpis', 'v_hub_directory',
    'v_hub_performance_sections', 'v_emerging_issues',
    'v_hub_usage_daily', 'v_hub_usage_pages'
  ];
begin
  foreach v in array views loop
    if to_regclass('public.' || v) is null then
      raise notice 'skipped %: no such view', v;
      continue;
    end if;
    execute format('alter view public.%I set (security_invoker = on)', v);
  end loop;
end $$;


-- ── STEP 3: take the anon grants away ───────────────────────────────────────
-- The second lock. RLS already refuses these; the grant is what keeps the
-- refusal standing if a policy is ever dropped by hand, and what turns a
-- silent empty array into an honest "permission denied".
--
-- Nothing on the site reads as anon: every page sits behind js/auth-guard.js
-- and every fetch carries the session. A request that arrives without one gets
-- 401 and the page falls back to its bundled snapshot — which is exactly what
-- kpis has done all along.
do $$
declare
  o text;
  objs constant text[] := array[
    'okrs', 'org_chart_nodes', 'kpis', 'employees', 'student_employees',
    'student_contractors', 'student_contractor_counts',
    'kpi_categories', 'kpi_baselines',
    'department_kpi_matrix', 'performance_sections', 'performance_services',
    'emerging_issues', 'processes', 'process_stewards',
    'hub_access', 'hub_events', 'change_log', 'allowed_editors',
    'v_hub_org_chart', 'v_hub_okrs', 'v_hub_kpis', 'v_hub_directory',
    'v_hub_performance_sections', 'v_emerging_issues',
    'v_hub_usage_daily', 'v_hub_usage_pages'
  ];
begin
  foreach o in array objs loop
    if to_regclass('public.' || o) is null then continue; end if;
    execute format('revoke all on public.%I from anon', o);
    execute format('grant select on public.%I to authenticated', o);
  end loop;
end $$;


-- ── STEP 4: check it ────────────────────────────────────────────────────────
-- Expect anon_can_select to be false on every row, and every SELECT policy to
-- name {authenticated}. A row that says otherwise is something this file
-- missed — tell me and I will widen it.
select c.relname                                             as object,
       case c.relkind when 'v' then 'view' else 'table' end  as kind,
       c.relrowsecurity                                      as rls_on,
       p.policyname,
       p.roles::text                                         as policy_roles,
       has_table_privilege('anon', c.oid, 'select')          as anon_can_select
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policies p
         on p.schemaname = 'public'
        and p.tablename  = c.relname
        and p.cmd        = 'SELECT'
 where n.nspname = 'public'
   and c.relname in (
     'okrs', 'org_chart_nodes', 'kpis', 'employees', 'student_employees',
     'student_contractors', 'student_contractor_counts',
     'kpi_categories', 'kpi_baselines',
     'department_kpi_matrix', 'performance_sections', 'performance_services',
     'emerging_issues', 'processes', 'process_stewards',
     'hub_access', 'hub_events', 'change_log', 'allowed_editors',
     'v_hub_org_chart', 'v_hub_okrs', 'v_hub_kpis', 'v_hub_directory',
     'v_hub_performance_sections', 'v_emerging_issues',
     'v_hub_usage_daily', 'v_hub_usage_pages')
 order by anon_can_select desc, kind, c.relname;
