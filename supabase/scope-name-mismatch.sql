-- ═══════════════════════════════════════════════════════════════════════════
--  A SCOPE THAT NAMES NOBODY
--
--  An audit of every provisioned account turned up Johanna Relkin: a staff
--  account scoped to the person "Joanna Relken", which matches no row in
--  `employees`. See name-joins.sql, which finds this class of fault.
--
--  hub_subtree() starts by looking that name up:
--
--      where lower(e.name) = lower(p_person)
--
--  No match, no starting row, no recursion — hub_visible_people() returns
--  nothing, kpis_select gives her no rows, and every branch of the scorecard
--  renders locked. She sees departmental health and not one named KPI, with
--  nothing on screen to suggest why.
--
--  ── Why it is a class, not a typo ──
--
--  Two lists of the same people, maintained separately, joined on a string
--  somebody typed twice. "Johanna Relkin" and "Joanna Relken" are both
--  plausible spellings of one person, and nothing refuses the mismatch: the
--  account saves, the scope saves, and the failure appears only when she opens
--  a page and finds it empty.
--
--  So this matches on email, which both tables hold and neither has to spell,
--  and writes the directory's spelling into the scope. It fixes whoever is
--  affected rather than the one name we happen to have found.
--
--  Safe to re-run. It only touches rows whose scope_person matches no
--  employee, and only where the email identifies exactly one.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1: who is affected, and what they would become ─────────────────────────
-- Read this before STEP 2. `becomes` null means the email did not identify an
-- employee either, and that row needs a human rather than this file.
select h.full_name,
       h.email,
       h.scope_person                              as scope_now,
       (select e.name from public.employees e
         where lower(e.email) = lower(h.email)
         limit 1)                                  as becomes
  from public.hub_access h
 where h.active
   and h.role = 'staff'
   and h.scope_person is not null
   and not exists (select 1 from public.employees e
                    where lower(e.name) = lower(h.scope_person));


-- ── 2: align the scope with the directory ──────────────────────────────────
do $$
declare
  fixed int;
  stuck int;
begin
  update public.hub_access h
     set scope_person = e.name
    from public.employees e
   where h.active
     and h.role = 'staff'
     and h.scope_person is not null
     and lower(e.email) = lower(h.email)
     and not exists (select 1 from public.employees x
                      where lower(x.name) = lower(h.scope_person));
  get diagnostics fixed = row_count;

  select count(*) into stuck
    from public.hub_access h
   where h.active
     and h.role = 'staff'
     and h.scope_person is not null
     and not exists (select 1 from public.employees e
                      where lower(e.name) = lower(h.scope_person));

  raise notice 'scopes realigned: %', fixed;
  if stuck > 0 then
    raise notice '% still unresolved — their email matches no employee either; '
                 'STEP 1 lists them and they need deciding by hand.', stuck;
  end if;
end $$;


-- ── 2b: the one the automatic pass could not reach ────────────────────────
-- Johanna Relkin, scoped to "Joanna Relken".
--
-- STEP 2 matches on email and found none; a first-initial-plus-surname key
-- does not match either, because the surnames differ by a letter — "Relken"
-- against "Relkin" — and so does the forename. Every safe rule misses her,
-- which is correct behaviour: two spellings a letter apart are as likely to be
-- two people as one.
--
-- They are one person. That is a fact from the organisation, not something the
-- data can be made to admit, so it is written down here rather than inferred
-- by a looser rule that would also start merging people who are genuinely
-- different.
--
-- Matched on first initial plus the first four letters of the surname, which
-- is deliberately narrow, and applied only if it identifies exactly one
-- employee. If it identifies none or several, nothing is written and the
-- notice says so.
do $$
declare
  target text;
  n      int;
begin
  select count(*), min(e.name) into n, target
    from public.employees e
   where e.active
     and lower(left(e.name, 1)) = 'j'
     and lower(e.name) like '%relk%';

  if n = 1 then
    update public.hub_access
       set scope_person = target
     where active
       and lower(full_name) like 'joh%anna relk%'
       and scope_person is distinct from target;
    raise notice 'Johanna Relkin now scoped to "%"', target;
  elsif n = 0 then
    raise notice 'No employee matching Relk* — she is not in the directory at '
                 'all, and adding her is a separate decision.';
  else
    raise notice '% employees match Relk* — too many to choose between; '
                 'set scope_person by hand.', n;
  end if;
end $$;


-- ── 3: check it ────────────────────────────────────────────────────────────
-- Expect no rows: every staff scope now names somebody the directory holds.
select 'still naming nobody (expect 0 rows)' as check_name,
       h.full_name, h.role, h.scope_person
  from public.hub_access h
 where h.active
   and h.role = 'staff'
   and h.scope_person is not null
   and not exists (select 1 from public.employees e
                    where lower(e.name) = lower(h.scope_person));

-- And how much she can now see. Expect a number greater than zero for
-- everybody with a scope.
select h.full_name,
       h.scope_person,
       (select count(*) from public.hub_subtree(h.scope_person)) as people,
       (select count(*) from public.kpis k
         where lower(k.employee) in
               (select lower(s.name) from public.hub_subtree(h.scope_person) s)) as kpis
  from public.hub_access h
 where h.active and h.role = 'staff' and h.scope_person is not null
 order by people, h.full_name;
