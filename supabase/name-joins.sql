-- ═══════════════════════════════════════════════════════════════════════════
--  EVERY PLACE A PERSON IS IDENTIFIED BY A TYPED NAME
--
--  Read-only. It changes nothing; it finds what to change.
--
--  ── The fault ──
--
--  Four tables refer to the same people, and none of them holds a key. They
--  are joined on a name somebody typed:
--
--      kpis.employee                 -> employees.name
--      hub_access.scope_person       -> employees.name
--      employees.primary_stakeholder -> employees.name
--      org_chart_nodes.name          -> employees.name
--
--  A mismatch is never refused. The row saves, the page loads, and the only
--  symptom is something quietly missing — which is how all three of these
--  arrived:
--
--    · four directors reporting to 'VP of Student Services', a job title
--    · Johanna Relkin scoped to "Joanna Relken", who is not in the directory
--    · eight people whose subtree resolves but whose KPIs do not, because
--      kpis.employee and employees.name spell them differently
--
--  The last one is the one that matters most for the scorecard. kpis_select
--  gives a staff or director reader rows whose `employee` is in
--  hub_visible_people(), and that function returns employees.name. A KPI whose
--  employee string matches no employee row is therefore invisible to every
--  scoped reader in the organisation — only an admin ever sees it.
--
--  ── What the candidate column means ──
--
--  A suggestion, not an answer. It matches on surname plus first initial, or
--  on one name containing the other, which is enough to spot "Aitana Toscano"
--  against "Aitana Nathaly Toscano Cedeño" and not enough to be trusted
--  blindly. Read them before anything is written.
-- ═══════════════════════════════════════════════════════════════════════════

-- Three helpers, defined in dependency order. Postgres validates a function
-- body when it is created, so one that calls another has to come second — the
-- first draft of this file had them the other way round and would not have run.
-- pg_temp means they vanish with the session and nothing is left behind.

-- Accents folded, so "Reboucas" and "Rebouças" compare equal. Spelled out
-- rather than using the unaccent extension, which may not be installed.
create or replace function pg_temp.fold(t text) returns text
language sql immutable as $$
  select translate(coalesce(t, ''),
    'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaaeeeeiiiiooooouuuucnAAAAAAEEEEIIIIOOOOOUUUUCN')
$$;

-- Lower case, accents folded, punctuation dropped.
create or replace function pg_temp.norm(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(lower(pg_temp.fold(t)), '[^a-z ]', ' ', 'g'))
$$;

-- First initial plus surname — the part of a name that survives a middle name
-- being added or dropped, which is what separates "Aitana Toscano" from
-- "Aitana Nathaly Toscano Cedeño".
create or replace function pg_temp.key_of(t text) returns text
language sql immutable as $$
  select case
    when pg_temp.norm(t) = '' then ''
    else left(pg_temp.norm(t), 1) || ' ' ||
         (string_to_array(pg_temp.norm(t), ' '))[
           array_length(string_to_array(pg_temp.norm(t), ' '), 1)]
  end
$$;


-- ── 1: KPIs nobody scoped can see ──────────────────────────────────────────
-- The scorecard fault. Each row here is a KPI whose owner matches no employee,
-- so every staff and director reader is refused it and only an admin sees it.
select 'kpi owner matches no employee' as problem,
       k.employee                                   as typed_as,
       count(*)                                     as kpis,
       (select e.name from public.employees e
         where pg_temp.key_of(e.name) = pg_temp.key_of(k.employee)
            or pg_temp.norm(e.name) like '%' || pg_temp.norm(k.employee) || '%'
            or pg_temp.norm(k.employee) like '%' || pg_temp.norm(e.name) || '%'
         order by length(e.name) limit 1)           as candidate
  from public.kpis k
 where coalesce(k.employee, '') <> ''
   and not exists (select 1 from public.employees e
                    where lower(e.name) = lower(k.employee))
 group by k.employee
 order by count(*) desc;


-- ── 2: scopes that name nobody ─────────────────────────────────────────────
select 'scope_person matches no employee' as problem,
       h.full_name,
       h.scope_person                               as typed_as,
       h.email,
       (select e.name from public.employees e
         where pg_temp.key_of(e.name) = pg_temp.key_of(h.scope_person)
            or pg_temp.norm(e.name) like '%' || pg_temp.norm(h.scope_person) || '%'
            or pg_temp.norm(h.scope_person) like '%' || pg_temp.norm(e.name) || '%'
         order by length(e.name) limit 1)           as candidate
  from public.hub_access h
 where h.active
   and coalesce(h.scope_person, '') <> ''
   and not exists (select 1 from public.employees e
                    where lower(e.name) = lower(h.scope_person));


-- ── 3: reporting lines that point at nobody ────────────────────────────────
-- Expect only the VP rows until vp-in-the-directory.sql has been run.
select 'reports to somebody not in the directory' as problem,
       e.name, e.department,
       e.primary_stakeholder                        as typed_as,
       (select m.name from public.employees m
         where pg_temp.key_of(m.name) = pg_temp.key_of(e.primary_stakeholder)
         order by length(m.name) limit 1)           as candidate
  from public.employees e
 where e.active
   and coalesce(e.primary_stakeholder, '') <> ''
   and not exists (select 1 from public.employees m
                    where lower(m.name) = lower(e.primary_stakeholder));


-- ── 4: the eight, and whether it is a mismatch or genuinely no KPIs ────────
-- For every staff reader whose subtree resolves but who sees no KPI, this says
-- which it is: `named_but_unmatched` counts KPI rows that look like theirs and
-- are spelled differently. Zero there means they simply have no KPIs yet,
-- which is not a fault.
select h.full_name,
       h.scope_person,
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
 order by kpis_seen, people desc, h.full_name;
