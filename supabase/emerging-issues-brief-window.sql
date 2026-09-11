-- ═══════════════════════════════════════════════════════════════════════════
--  THE HOME TILE'S WEEK, AND THE REGISTER'S WEEK
--
--  The home page said "7 critical · 13 this week". Opening the register showed
--  5 and 10. Neither was wrong about the data; they were answering different
--  questions, and one of them used a different clock.
--
--  ── "13 this week" vs 10 ──
--
--  This view counted a rolling 168 hours:
--
--      count(*) filter (where created_at >= now() - interval '7 days')
--
--  The register buckets on `age_days`, a whole number of days, and its Current
--  Week tab is `age_days < 7`. Those are not the same window. Three issues
--  reported as seven days old sat inside the view's 168 hours and outside the
--  page's seven days, so the same three rows were "this week" on the home page
--  and "Last Week" on the register.
--
--  ── "7 critical" vs 5 ──
--
--  red_open counted every unresolved Critical whatever its age: the five
--  raised this week, plus one seven days old and one nine days old. True, and
--  not what the tile appeared to promise — it links to a page that opens on
--  this week, where five are showing.
--
--  ── What this changes ──
--
--  Both figures are now scoped to the same week the register opens on, and
--  expressed with the register's own `age_days` so the two cannot drift apart
--  again.
--
--  ── Resolved issues, since 2026-09-10 ──
--
--  The register used to hide Resolved issues unless its Status filter asked
--  for them, and these counts excluded them to match. It now shows them by
--  default, so "this week" and "last week" count them too — otherwise the
--  tile would say 10 this week over a Current Week tab reading 12.
--
--  red_open counts them too: every Critical raised this week, whatever its
--  status, so the tile's "critical" figure equals what the register shows
--  when it is filtered to Critical on Current Week. It briefly excluded
--  Resolved, on the grounds that a closed issue is not an alarm, and that left
--  the tile one short of the page in any week with a resolved Critical in it —
--  the same kind of mismatch this file exists to remove.
--
--  red_open also turns the home card red and puts the count on its badge, so
--  a resolved Critical does that until it is seven days old.
--
--  ── The nav bell, since 2026-09-11: raised_7d ──
--
--  The bell on the Emerging Issues nav link counts every issue raised this
--  week — raised_7d, the same figure as the home tile's "N this week" and the
--  Current Week tab. The number on the bell is the number of cards on the tab
--  the link opens. It turns the link red only when red_open says one of them
--  is Critical.
--
--  It counted two other things first, and each read as wrong:
--    · red_open, critical this week — on a week with no new critical the bell
--      vanished outright, while issues were still being raised;
--    · critical_open, every Critical not yet Resolved at any age — it read 7
--      over a Current Week tab holding 3.
--
--  critical_open is still in the view: `create or replace view` cannot drop a
--  column, and nothing is harmed by it staying. It was added at the END of the
--  column list, the only change `create or replace view` allows.
--
--  The other seven columns are untouched. They still mean "open, any age",
--  and nothing on the site reads them.
--
--  ── Worth knowing before you run it ──
--
--  The nav bell (js/shared.js) reads raised_7d and red_open, both of which
--  predate critical_open, so the page does not depend on this file's latest
--  change having been run.
--
--  Safe to re-run. `create or replace view` cannot rename or drop a column, so
--  if this file's column list has drifted from the live one Postgres refuses
--  the whole statement rather than half-applying it.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.v_emerging_issues_brief as
  select open_total,
         red_open,
         amber_open,
         exploring,
         in_progress,
         going_stale,
         resolved_30d,
         raised_7d,
         raised_prev7,
         critical_open
    from (
      select
        count(*) filter (where v.resolved_at is null) as open_total,

        -- Critical, raised this week, any status — exactly the Critical cards
        -- on the register's Current Week tab. Was: every unresolved Critical,
        -- any age.
        count(*) filter (
          where v.age_days < 7
            and v.severity = 'Critical'
        ) as red_open,

        count(*) filter (where v.resolved_at is null and v.severity = 'Moderate') as amber_open,
        count(*) filter (where v.resolved_at is null and v.status = 'Exploring') as exploring,
        count(*) filter (where v.resolved_at is null and v.status = 'Resolution in progress') as in_progress,
        count(*) filter (where v.resolved_at is null and v.days_since_update >= 14) as going_stale,
        count(*) filter (where v.resolved_at >= (now() - interval '30 days')) as resolved_30d,

        -- The register's Current Week, exactly: age_days < 7, every status —
        -- the page shows Resolved issues by default now, so this counts them.
        -- Was: created_at >= now() - interval '7 days', which is a rolling 168
        -- hours and caught rows the page had already moved to Last Week.
        count(*) filter (
          where v.age_days < 7
        ) as raised_7d,

        -- And its Last Week, on the same footing.
        count(*) filter (
          where v.age_days >= 7
            and v.age_days < 14
        ) as raised_prev7,

        -- Every Critical not marked Resolved, any age. The nav bell read this
        -- from 2026-09-10 to 09-11 and reads raised_7d now — see the header.
        -- On `status`, not `resolved_at`, because the status chip is what a
        -- reader sees on the card.
        count(*) filter (
          where v.severity = 'Critical'
            and v.status is distinct from 'Resolved'
        ) as critical_open
      from public.v_emerging_issues v
    ) b
   /* Whoever the register is for — public.hub_sees_emerging_issues(), the same
      function emerging_issues_select uses, so the counts on the home page and
      the bell on the nav link can never disagree with the page they lead to.

      This used to spell the rule out here as well. Two copies of one rule is
      how a bell ends up ringing for a page that walls you. The function is
      created by emerging-issues-partners.sql, which has to be run first. */
   where public.hub_sees_emerging_issues();


-- The original ran with security_invoker on and was granted to authenticated
-- only; create or replace resets neither, but both are restated so a rebuild
-- from this file alone lands in the same place.
alter view public.v_emerging_issues_brief set (security_invoker = on);
revoke all on public.v_emerging_issues_brief from anon;
grant select on public.v_emerging_issues_brief to authenticated;


-- ── check it ───────────────────────────────────────────────────────────────
-- Each tile_ figure is what the home tile prints; each must equal the page_
-- figure beside it, Resolved included. The nav bell prints tile_this_week, so
-- it must equal page_current_week_tab too. A difference means two things are
-- counting differently again.
select b.raised_7d    as tile_this_week,
       (select count(*) from public.v_emerging_issues
         where age_days < 7)                   as page_current_week_tab,
       b.raised_prev7 as tile_last_week,
       (select count(*) from public.v_emerging_issues
         where age_days >= 7 and age_days < 14) as page_last_week_tab,
       b.red_open     as tile_critical,
       (select count(*) from public.v_emerging_issues
         where age_days < 7 and severity = 'Critical')
                                               as page_critical_this_week
  from public.v_emerging_issues_brief b;
