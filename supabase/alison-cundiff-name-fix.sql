-- ═══════════════════════════════════════════════════════════════════════════
--  ALISON CUNDIFF → ALISON RAE CUNDIFF
--
--  Same class of fault as scope-name-mismatch.sql and cap-guide-fte-name-fix.sql
--  (Johanna Relkin; Joshua Hadden; Shaunasee James) — surfaced by the same
--  hub_is_fte() work, but wider than either of those: Alison is a department
--  director, so her short name is repeated across three tables' worth of
--  references, not just her own row.
--
--  Direction confirmed with the user 2026-09 (not inferred from the data —
--  her split was genuinely ambiguous, see cap-guide-fte-name-fix.sql's own
--  note): "Alison Rae Cundiff" is correct. hub_access.full_name already had
--  it right; employees.name and everything that names her by copying
--  employees.name did not.
--
--  Fourteen rows, three tables, all by primary key — never by matching the
--  old name string, so this can't accidentally touch a different row that
--  happens to share it:
--
--    employees.name                     id 61 (her own row)
--    employees.primary_stakeholder      ids 68, 108, 109, 115, 63
--                                        (Trevor Shelton, Charles Crankson,
--                                        Katelyn Graf, James Etukudo,
--                                        Rachel Kirk — hub_subtree() walks
--                                        this column; left as the old name
--                                        their reports would have stopped
--                                        resolving past her node)
--    kpis.employee                      ids 122, 123, 124, 161
--                                        (her department's budget KPI and
--                                        three others attributed to her)
--    org_chart_nodes.name               id 46 (her own row — a second,
--                                        separately-maintained table with
--                                        the same short name)
--    org_chart_nodes.reports_to         ids 64, 94, 63
--                                        (Katelyn Graf, Charles Crankson,
--                                        Trevor Shelton's org chart cards)
--
--  One transaction, all fourteen or none — a partial write here would leave
--  some references pointing at each spelling, which is worse than either
--  name applied consistently.
--
--  Safe to re-run: every WHERE clause is `id = <n> and <column> = 'Alison
--  Cundiff'`, so a second run updates zero rows once the first has.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

update public.employees
   set name = 'Alison Rae Cundiff', updated_at = now()
 where id = 61 and name = 'Alison Cundiff';

update public.employees
   set primary_stakeholder = 'Alison Rae Cundiff', updated_at = now()
 where id in (68, 108, 109, 115, 63) and primary_stakeholder = 'Alison Cundiff';

update public.kpis
   set employee = 'Alison Rae Cundiff', updated_at = now()
 where id in (122, 123, 124, 161) and employee = 'Alison Cundiff';

update public.org_chart_nodes
   set name = 'Alison Rae Cundiff', updated_at = now()
 where id = 46 and name = 'Alison Cundiff';

update public.org_chart_nodes
   set reports_to = 'Alison Rae Cundiff', updated_at = now()
 where id in (64, 94, 63) and reports_to = 'Alison Cundiff';

commit;

-- ── after: confirm all fourteen changed, nothing named "Alison Cundiff" remains ──
select 'employees' as tbl, count(*) filter (where name = 'Alison Rae Cundiff' or primary_stakeholder = 'Alison Rae Cundiff') as now_correct,
       count(*) filter (where name = 'Alison Cundiff' or primary_stakeholder = 'Alison Cundiff') as still_old
  from public.employees where id in (61, 68, 108, 109, 115, 63)
union all
select 'kpis', count(*) filter (where employee = 'Alison Rae Cundiff'), count(*) filter (where employee = 'Alison Cundiff')
  from public.kpis where id in (122, 123, 124, 161)
union all
select 'org_chart_nodes', count(*) filter (where name = 'Alison Rae Cundiff' or reports_to = 'Alison Rae Cundiff'),
       count(*) filter (where name = 'Alison Cundiff' or reports_to = 'Alison Cundiff')
  from public.org_chart_nodes where id in (46, 64, 94, 63);
