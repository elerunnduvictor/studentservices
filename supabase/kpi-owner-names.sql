-- ═══════════════════════════════════════════════════════════════════════════
--  KPIs THAT NAME AN OWNER THE DIRECTORY DOES NOT HAVE
--
--  ── What this fixes ──
--
--  kpis_select gives a staff or director reader the rows whose `employee` is
--  in hub_visible_people(), and that function returns employees.name. Both are
--  hand-typed lists of the same people with no key between them, so a KPI
--  recorded against "Aitana Toscano" while the directory says "Aitana Nathaly
--  Toscano Cedeño" belongs to nobody as far as the policy is concerned.
--
--  It is invisible to every scoped reader in the organisation. Only an admin
--  sees it, which is why it went unreported: the people who would have noticed
--  are the ones who cannot see it.
--
--  name-joins.sql counts the cost. When this was written that was ten readers
--  losing between one and seven KPIs each, four of them losing every one:
--
--      Kari Johnson  7    Kim Overdiek 6    Nikki Jane Chambers 6
--      Kelley Richardson 4    Katelyn Graf 4    Helen Reboucas 3
--      Anne Marie Clark 3     Mandy Schwab 2    Anne E. Owen 1
--      Tyson Bell 1
--
--  ── How it matches ──
--
--  First initial plus surname, accents folded. That is what survives a middle
--  name being added or dropped, which is the whole of this problem:
--
--      Aitana Toscano                 <- Aitana Nathaly Toscano Cedeño
--      Helen Reboucas                 <- Helen Segalla de Oliveira Rebouças
--
--  A row is only rewritten when that key identifies EXACTLY ONE employee.
--  Anything ambiguous, or matching nobody, is left alone and listed by STEP 3
--  for a person to decide. Two different people sharing an initial and a
--  surname would be exactly the case where guessing is worst.
--
--  ── Run STEP 1 first ──
--
--  It shows every change before any is made. Read it. This edits the owner on
--  KPI rows, and an owner is who a KPI is judged by.
--
--  Safe to re-run: only rows whose employee matches no directory name are
--  considered, so a second run finds nothing left to do.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function pg_temp.fold(t text) returns text
language sql immutable as $$
  select translate(coalesce(t, ''),
    'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaaeeeeiiiiooooouuuucnAAAAAAEEEEIIIIOOOOOUUUUCN')
$$;

create or replace function pg_temp.norm(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(lower(pg_temp.fold(t)), '[^a-z ]', ' ', 'g'))
$$;

create or replace function pg_temp.key_of(t text) returns text
language sql immutable as $$
  select case
    when pg_temp.norm(t) = '' then ''
    else left(pg_temp.norm(t), 1) || ' ' ||
         (string_to_array(pg_temp.norm(t), ' '))[
           array_length(string_to_array(pg_temp.norm(t), ' '), 1)]
  end
$$;


-- ── STEP 1: every change this would make ───────────────────────────────────
-- `matches` is how many employees the key identifies. Only the 1s are touched.
select k.employee                                   as kpi_says,
       count(*)                                     as kpi_rows,
       (select count(*) from public.employees e
         where e.active
           and pg_temp.key_of(e.name) = pg_temp.key_of(k.employee))   as matches,
       (select min(e.name) from public.employees e
         where e.active
           and pg_temp.key_of(e.name) = pg_temp.key_of(k.employee))   as becomes
  from public.kpis k
 where coalesce(k.employee, '') <> ''
   and not exists (select 1 from public.employees e
                    where lower(e.name) = lower(k.employee))
 group by k.employee
 order by matches, count(*) desc;


-- ── STEP 2: align the owner with the directory ─────────────────────────────
do $$
declare
  fixed int;
  left_over int;
begin
  update public.kpis k
     set employee = e.name
    from public.employees e
   where e.active
     and coalesce(k.employee, '') <> ''
     and pg_temp.key_of(e.name) = pg_temp.key_of(k.employee)
     -- only rows that currently match nobody
     and not exists (select 1 from public.employees x
                      where lower(x.name) = lower(k.employee))
     -- and only where the key is unambiguous
     and (select count(*) from public.employees x
           where x.active
             and pg_temp.key_of(x.name) = pg_temp.key_of(k.employee)) = 1;
  get diagnostics fixed = row_count;

  select count(*) into left_over
    from public.kpis k
   where coalesce(k.employee, '') <> ''
     and not exists (select 1 from public.employees e
                      where lower(e.name) = lower(k.employee));

  raise notice 'KPI owners realigned: %', fixed;
  if left_over > 0 then
    raise notice '% KPI rows still name nobody in the directory — ambiguous or '
                 'unknown. STEP 3 lists them; they need a person.', left_over;
  end if;
end $$;


-- ── STEP 3: what is left, if anything ──────────────────────────────────────
-- Rows here matched two people or none, so nothing safe could be done with
-- them. Expect none.
select k.employee                                   as kpi_says,
       count(*)                                     as kpi_rows,
       (select count(*) from public.employees e
         where e.active
           and pg_temp.key_of(e.name) = pg_temp.key_of(k.employee))   as matches
  from public.kpis k
 where coalesce(k.employee, '') <> ''
   and not exists (select 1 from public.employees e
                    where lower(e.name) = lower(k.employee))
 group by k.employee
 order by count(*) desc;


-- ── STEP 4: what each reader can see now ───────────────────────────────────
-- The same figures name-joins.sql prints. `named_but_unmatched` should be zero
-- for everybody, and the readers who saw nothing — Nikki, Helen, Mandy and
-- Johanna — should be reading numbers instead.
select h.full_name,
       (select count(*) from public.hub_subtree(h.scope_person))  as people,
       (select count(*) from public.kpis k
         where lower(k.employee) in
               (select lower(s.name) from public.hub_subtree(h.scope_person) s)) as kpis_seen,
       (select count(*) from public.kpis k
         where not exists (select 1 from public.employees e
                            where lower(e.name) = lower(k.employee))
           and exists (select 1 from public.hub_subtree(h.scope_person) s
                        where pg_temp.key_of(s.name) = pg_temp.key_of(k.employee))
       )                                                          as named_but_unmatched
  from public.hub_access h
 where h.active and h.role = 'staff' and coalesce(h.scope_person, '') <> ''
 order by kpis_seen, h.full_name;
