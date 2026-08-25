-- ═══════════════════════════════════════════════════════════════════════════
--  THE STEWARD LIST IS NOT PUBLIC
--
--  `process_stewards` was created world-readable — `for select using (true)` —
--  so that a page could ask "am I a steward?" with a plain filtered select and
--  no RPC. That works, but it also answers "who is everyone?": a signed-in
--  partner outside the organisation can read all 42 rows and walk away with
--  every steward's email address.
--
--  The register itself was never exposed. `processes` returns a partner zero
--  rows, as do `emerging_issues` and the summary view. This is the one table
--  that leaked, and what it leaked is a staff roster.
--
--  Narrowed to Student Services. The check that needed it still works: staff,
--  directors and admins can read the table and find their own row, and a
--  partner's query now errors — which the page already treats as "not a
--  steward", so they get no link and no card, which is the answer they should
--  have had anyway.
--
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

drop policy if exists "process_stewards_select" on public.process_stewards;

create policy "process_stewards_select" on public.process_stewards
  for select
  using (public.hub_role() in ('staff', 'director', 'admin'));

commit;

-- Should list exactly one select policy, scoped to the three internal roles.
select policyname, cmd, qual
  from pg_policies
 where schemaname = 'public'
   and tablename = 'process_stewards'
   and cmd = 'SELECT';
