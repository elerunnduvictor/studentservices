-- ═══════════════════════════════════════════════════════════════════════════
--  THE SCORECARD'S OUTCOMES, DOWN TO THE SINGLE KPI — FOR EVERY READER
--
--  On the Bridge's KPI scorecard the two outcome sections — Student Outcomes
--  and Operational Outcomes — can now be opened: an outcome lists every KPI
--  filed under it, a part (Autonomy, Speed, …) lists its own, and any KPI can
--  be opened to its detail. Every reader gets that, partners included.
--
--  What changes with the reader is only whether the KPI's OWNER is named.
--
--      admin      Ben and the PMs            every owner
--      director   their department           owners inside their department
--      staff      their reporting line       owners at or below them
--      partner    —                          no owner, ever
--
--  That is not a new rule. It is `kpis_select`, the policy that already decides
--  which KPIs a reader receives by name (access-control.sql), applied to the
--  owner column instead of to the whole row. The predicate below is copied from
--  it character for character, so "owner shown here" and "this reader can read
--  that KPI by name elsewhere on the Bridge" can never disagree.
--
--  ── What a partner now receives that they did not before ──
--
--  The KPI itself: its name, its category and part, its department, its green
--  / yellow / red bands, its current value, its cadence and its data-source
--  link. Until now a partner received only the bands and the value, with no
--  name (hub_scorecard_rollup), which is enough to colour a department and not
--  enough to say what any measure is.
--
--  Still withheld from a partner: the owner and the owner's job title, and the
--  sub-department — partners see departments as a whole, as they always have.
--  None of the KPI names or data sources in the scorecard mention a person.
--
--  ── What this does not change ──
--
--  `kpis_select`, `v_hub_kpis` and `hub_scorecard_rollup()` are untouched, so
--  the department drill-down, the department pages and the home page panel
--  behave exactly as they did. This is a separate door that returns strictly
--  less than an admin could already read, and only to a signed-in reader who
--  is on the access list.
--
--  SECURITY DEFINER because it deliberately reads KPI rows the caller cannot,
--  and returns them with the owner removed. Same shape as v_hub_kpis, so the
--  page runs these rows through exactly the same status arithmetic.
--
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.hub_outcome_kpis()
returns table (id bigint, employee text, role text, department text, measure text,
               category text, type text, "bandGreen" text, "bandYellow" text,
               "bandRed" text, value text, priority text, source text,
               frequency text, "subDept" text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select public.hub_role() as r)
  select k.id,
         -- The owner, only where kpis_select would hand this reader the row.
         case when (select r from me) = 'admin'
                or ((select r from me) in ('staff', 'director')
                    and k.employee in (select v.name from public.hub_visible_people() v))
              then k.employee end,
         -- Their job title identifies them as well as their name does.
         case when (select r from me) = 'admin'
                or ((select r from me) in ('staff', 'director')
                    and k.employee in (select v.name from public.hub_visible_people() v))
              then k.role end,
         k.department,
         k.kpi_measure,
         k.kpi_category,
         k.category_type,
         k.band_green,
         k.band_yellow,
         k.band_red,
         k.current_value,
         k.priority,
         k.data_source,
         k.update_frequency,
         -- Partners see departments whole; everyone inside Student Services
         -- already sees sub-departments on the scorecard.
         case when (select r from me) = 'partner' then null::text
              else e.sub_department end
    from public.kpis k
    left join public.employees e on lower(e.name) = lower(k.employee)
   where k.tracking_status = 'Tracking'
     -- Signed in but not on the access list: nothing.
     and (select r from me) <> 'none'
   order by k.sort_order, k.id;
$$;

revoke all on function public.hub_outcome_kpis() from public, anon;
grant execute on function public.hub_outcome_kpis() to authenticated;


-- ── check it ───────────────────────────────────────────────────────────────
-- Run from the SQL editor the function itself returns nothing — the editor is
-- not signed in as anybody, so hub_role() is 'none'. This works out the same
-- rule for every reader on the access list instead, the way hub_visible_people
-- does it for whoever is signed in.
--
-- Expect: every reader lists the same number of KPIs; Ben and the PMs (admin)
-- see an owner on all of them; a director only on their department's; staff on
-- their own line's; every partner on none.
with readers as materialized (
  select * from public.hub_access where active
),
visible as materialized (
  select r.email, e.name
    from readers r
    join public.employees e
      on r.role = 'admin'
      or (r.role = 'director' and e.department = r.scope_department)
  union
  select r.email, s.name
    from readers r
    cross join lateral public.hub_subtree(r.scope_person) s
   where r.role = 'staff'
)
-- One row per account, not per name: two addresses under one name (Aaron Ball
-- and Brent Schumann each have two) were added together and read as 152.
select r.role,
       coalesce(nullif(r.full_name, ''), r.email)            as reader,
       r.email,
       coalesce(r.scope_department, r.scope_person, '')      as scope,
       count(k.id)                                           as kpis_listed,
       count(k.id) filter (
         where r.role = 'admin'
            or (r.role in ('staff', 'director')
                and k.employee in (select v.name from visible v where v.email = r.email))
       )                                                     as owners_shown
  from readers r
  cross join public.kpis k
 where k.tracking_status = 'Tracking'
 group by r.role, r.email, reader, scope
 order by case r.role when 'admin' then 1 when 'director' then 2
                      when 'staff' then 3 else 4 end,
          owners_shown desc, reader;
