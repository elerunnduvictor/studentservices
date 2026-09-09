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
--  again. Resolved rows are excluded on `status`, which is what the page
--  filters on, rather than on `resolved_at`.
--
--  The other seven columns are untouched. They still mean "open, any age",
--  and nothing on the site reads them.
--
--  ── Worth knowing before you run it ──
--
--  red_open also drives the bell on the Emerging Issues nav link
--  (js/shared.js). Scoping it to the week means a Critical issue older than
--  seven days and still unresolved no longer rings it — the two nine-day-old
--  rows in today's data are exactly that case. That follows from asking for
--  the week's criticals rather than the total, and it is reversible: put the
--  age_days condition back on red_open alone.
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
         raised_prev7
    from (
      select
        count(*) filter (where v.resolved_at is null) as open_total,

        -- Critical, raised this week, still open — the five the register shows
        -- on the tab it opens on. Was: every unresolved Critical, any age.
        count(*) filter (
          where v.age_days < 7
            and v.status is distinct from 'Resolved'
            and v.severity = 'Critical'
        ) as red_open,

        count(*) filter (where v.resolved_at is null and v.severity = 'Moderate') as amber_open,
        count(*) filter (where v.resolved_at is null and v.status = 'Exploring') as exploring,
        count(*) filter (where v.resolved_at is null and v.status = 'Resolution in progress') as in_progress,
        count(*) filter (where v.resolved_at is null and v.days_since_update >= 14) as going_stale,
        count(*) filter (where v.resolved_at >= (now() - interval '30 days')) as resolved_30d,

        -- The register's Current Week, exactly: age_days < 7, Resolved hidden.
        -- Was: created_at >= now() - interval '7 days', which is a rolling 168
        -- hours and caught rows the page had already moved to Last Week.
        count(*) filter (
          where v.age_days < 7
            and v.status is distinct from 'Resolved'
        ) as raised_7d,

        -- And its Last Week, on the same footing.
        count(*) filter (
          where v.age_days >= 7
            and v.age_days < 14
            and v.status is distinct from 'Resolved'
        ) as raised_prev7
      from public.v_emerging_issues v
    ) b
   /* Whoever the register is for — the same rule emerging_issues_select
      carries, so the counts on the home page and the bell on the nav link can
      never disagree with the page they lead to.

      Widened from staff/director/admin when BYU-Pathway's own partners and the
      leadership were given the register. Leaving it narrow would have handed
      them a link with no bell and a home page with no alert, for a page they
      can read perfectly well. */
   where public.hub_role() = any (array['staff', 'director', 'admin'])
      or (
        public.hub_role() = 'partner'
        and (select m.category from public.hub_me() m)
              = any (array['Partner - General', 'Partner - Leadership'])
      );


-- The original ran with security_invoker on and was granted to authenticated
-- only; create or replace resets neither, but both are restated so a rebuild
-- from this file alone lands in the same place.
alter view public.v_emerging_issues_brief set (security_invoker = on);
revoke all on public.v_emerging_issues_brief from anon;
grant select on public.v_emerging_issues_brief to authenticated;


-- ── check it ───────────────────────────────────────────────────────────────
-- The first two figures are what the home tile will print. They should now
-- equal the second two, which are what the register counts on the tab it opens
-- on. If a row differs, the two are still using different clocks.
select b.red_open   as tile_critical,
       b.raised_7d  as tile_this_week,
       (select count(*) from public.v_emerging_issues
         where age_days < 7 and status is distinct from 'Resolved'
           and severity = 'Critical')          as page_critical_this_week,
       (select count(*) from public.v_emerging_issues
         where age_days < 7 and status is distinct from 'Resolved')
                                               as page_this_week
  from public.v_emerging_issues_brief b;
