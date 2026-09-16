-- ═══════════════════════════════════════════════════════════════════════════
--  TWO NAMES THAT DON'T QUITE MATCH
--
--  Same class of fault as scope-name-mismatch.sql (Johanna Relkin): two lists
--  of the same people, maintained separately, and hub_is_fte() (cap-guide.sql,
--  2026-09-15) joins them on name — lower(employees.name) = lower(hub_access.
--  full_name) — because employees.email is empty for almost every FTE row.
--  Surfaced by that work, not by an audit of hub_access itself.
--
--  Two people, both missing a middle name in hub_access:
--
--    employees.name                hub_access.full_name (before)
--    Joshua Stafford Hadden    ←    Joshua Hadden
--    Shaunasee Janette James   ←    Shaunasee James
--
--  Direction confirmed against a THIRD, independently-maintained table before
--  writing anything — process_stewards (its own allow-list, not derived from
--  either employees or hub_access, per its own table comment) agrees with
--  employees' fuller spelling for both of these two, and org_chart_nodes
--  agrees too. employees.name is the one to trust here.
--
--  A third person turned up the same search — Alison Cundiff — but her split
--  runs the other way: process_stewards agrees with hub_access's "Alison Rae
--  Cundiff", not with employees' "Alison Cundiff". Deliberately left alone in
--  this file; which of those two is her actual name isn't something the data
--  can settle on its own, and guessing wrongly here would be worse than
--  leaving her as the third FTE this join still misses.
--
--  Targeted by email, not name — updates exactly these two rows, nothing
--  matched more broadly. Safe to re-run: a second run updates zero rows once
--  the first has, since the WHERE clause stops matching.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── before: what's about to change ──────────────────────────────────────────
select email, full_name as before
  from public.hub_access
 where email in ('jhadden@byupw.edu', 'scjames@byupw.edu');

-- ── the fix ──────────────────────────────────────────────────────────────────
update public.hub_access
   set full_name = 'Joshua Stafford Hadden', updated_at = now()
 where email = 'jhadden@byupw.edu'
   and full_name = 'Joshua Hadden';

update public.hub_access
   set full_name = 'Shaunasee Janette James', updated_at = now()
 where email = 'scjames@byupw.edu'
   and full_name = 'Shaunasee James';

-- ── after: confirm exactly two rows changed, nothing else ──────────────────
select email, full_name as after
  from public.hub_access
 where email in ('jhadden@byupw.edu', 'scjames@byupw.edu');
