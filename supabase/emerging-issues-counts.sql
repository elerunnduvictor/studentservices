-- ═══════════════════════════════════════════════════════════════════════════
--  WHY THE HOME TILE AND THE REGISTER DISAGREE
--
--  The home page says "7 critical · 13 this week". Opening the page shows 5
--  and 10. Both are reading the same table, so one of them is counting rows
--  the other hides.
--
--  They do not read the same thing:
--
--    home tile   js/home-issues.js reads v_emerging_issues_brief and prints
--                red_open and raised_7d straight out of it.
--    the page    emerging-issues.js reads v_emerging_issues, then drops every
--                Resolved row unless you pick Status = Resolved, and opens on
--                the Current Week tab, which is age_days < 7.
--
--  So there are two candidate explanations and this tells them apart:
--
--    · the brief view counts Resolved rows that the page hides, or
--    · red_open counts critical issues of every age, while the page was
--      showing only the ones raised this week.
--
--  Read-only. Nothing is created, altered or deleted.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1: what the tile is being told ─────────────────────────────────────────
select 'what the home tile prints' as line, *
  from public.v_emerging_issues_brief;


-- ── 2: what the page shows, by its own rules ───────────────────────────────
-- "Current Week" is age_days < 7 and Resolved is hidden. These two figures are
-- what a reader counts on screen.
select 'page: raised this week, Resolved hidden' as line,
       count(*) as n
  from public.v_emerging_issues
 where age_days < 7
   and status is distinct from 'Resolved'
union all
select 'page: critical raised this week, Resolved hidden',
       count(*)
  from public.v_emerging_issues
 where age_days < 7
   and status is distinct from 'Resolved'
   and severity = 'Critical'
union all
select 'critical of ANY age, Resolved hidden',
       count(*)
  from public.v_emerging_issues
 where status is distinct from 'Resolved'
   and severity = 'Critical'
union all
select 'critical of ANY age, Resolved included',
       count(*)
  from public.v_emerging_issues
 where severity = 'Critical'
union all
select 'raised this week, Resolved included',
       count(*)
  from public.v_emerging_issues
 where age_days < 7;


-- ── 3: the rows themselves, so the difference is nameable ──────────────────
-- Every issue raised in the last fortnight, with the two things that decide
-- whether each of the counts above sees it.
select severity,
       status,
       age_days,
       case when age_days < 7 then 'current week'
            when age_days < 14 then 'last week'
            else 'backlog' end as tab,
       left(title, 54) as title
  from public.v_emerging_issues
 where age_days < 14
 order by severity, age_days;
