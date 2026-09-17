-- ═══════════════════════════════════════════════════════════════════════════
--  THE BACKLOG'S TREND — one row per point on the Technical Bugs Backlog's
--  line graphs.
--
--  Run once. It adds nothing to the daily update: every run of
--  supabase/tech-bugs.sql keeps writing tech_bug_history, and this reads it.
--
--  ── why a function and not the table ──────────────────────────────────────
--
--  tech_bug_history holds one row per capture, per product, per section —
--  about forty rows each time the tracker is loaded. Daily, that is 14,000
--  rows a year, and PostgREST hands a browser at most a thousand rows in one
--  read: the page would silently draw an incomplete line. So the grouping
--  happens here, and the page receives one row per point on the chart —
--  a hundred rows at the very most, whatever the range.
--
--  ── what a point is ──────────────────────────────────────────────────────
--
--  The latest capture inside each day, week or month. Not an average: every
--  figure on the chart is a real reading of the tracker on a real date, and a
--  point is labelled with that date. Averaging captures would invent numbers
--  that were never true of the backlog.
--
--  ── stocks and flows ─────────────────────────────────────────────────────
--
--  The tracker keeps four lists per product, and two of them are archives:
--
--     the top rows            the open backlog        — a stock: where it stands
--     Resolved Bugs This Week what TS just resolved   — a staging list
--     Closed Bugs             everything ever closed  — an archive, grows only
--     Removed Bugs           everything ever dropped  — an archive, grows only
--
--  Drawing an archive as a line says nothing: it only ever climbs. What the
--  reader wants is how many bugs left the backlog in the period they are
--  looking at, so this works that out for them:
--
--     resolved_flow = (closed + resolved list) now − (closed + resolved list)
--                     at the previous point
--
--  Counting the staging list alongside the archive is what makes the figure
--  right: a bug counts the day it leaves the backlog, and counts again for
--  nothing when it later moves out of the list into the archive — the list
--  falls by one as the archive rises by one. removed_flow is the same
--  arithmetic on the Removed archive. Both are null at the first point on
--  record, where there is no earlier capture to compare with; a negative one
--  means bugs came back out of an archive.
--
--  p_grain   'day', 'week' or 'month'  (anything else is read as 'week')
--  p_since   the earliest point to return; null for everything on record.
--            Points before it are still read, so the first point in range
--            gets its flow from the capture before it.
--
--  Who may read it: whoever may read the backlog. The function is security
--  INVOKER, so tech_bug_history's own policy — hub_sees_emerging_issues() —
--  decides, exactly as it does for the list.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.tech_bug_trend(p_grain text default 'week',
                                                 p_since date default null)
returns table (bucket          date,
               open_bugs       integer,
               open_score      numeric,
               open_scored     integer,
               closed_total    integer,
               removed_total   integer,
               resolved_listed integer,
               resolved_flow   integer,
               removed_flow    integer,
               products        jsonb)
language sql
stable
set search_path = public, pg_temp
as $$
  with unit as (
    select case lower(coalesce(p_grain, 'week'))
             when 'day'   then 'day'
             when 'month' then 'month'
             else              'week'
           end as g
  ),
  -- The latest capture in each day, week or month — over everything on
  -- record, so a flow can always look back one point.
  picked as (
    select max(h.captured_on) as day
      from public.tech_bug_history h, unit u
     group by date_trunc(u.g, h.captured_on::timestamp)
  ),
  pts as (
    select h.*
      from public.tech_bug_history h
      join picked p on p.day = h.captured_on
  ),
  -- One row per point: the backlog as it stood, and the two archives.
  whole as (
    select captured_on as day,
           coalesce(sum(bugs)        filter (where section = 'active'),   0)::integer as open_bugs,
           coalesce(sum(score_total) filter (where section = 'active'),   0)          as open_score,
           coalesce(sum(scored)      filter (where section = 'active'),   0)::integer as open_scored,
           coalesce(sum(bugs)        filter (where section = 'closed'),   0)::integer as closed_total,
           coalesce(sum(bugs)        filter (where section = 'removed'),  0)::integer as removed_total,
           coalesce(sum(bugs)        filter (where section = 'resolved'), 0)::integer as resolved_listed
      from pts
     group by captured_on
  ),
  flows as (
    select w.*,
           (w.closed_total + w.resolved_listed)
             - lag(w.closed_total + w.resolved_listed) over (order by w.day) as resolved_flow,
           w.removed_total
             - lag(w.removed_total)                    over (order by w.day) as removed_flow
      from whole w
  ),
  -- Each product at each point, all four of its lists, as
  -- {"Canvas": {"label": "Canvas", "sections": {"active": [bugs, scored, score], …}}}
  prod as (
    select captured_on as day, product, min(product_label) as label, section,
           sum(bugs)        as bugs,
           sum(scored)      as scored,
           sum(score_total) as score
      from pts
     group by captured_on, product, section
  )
  select f.day as bucket,
         f.open_bugs,
         f.open_score,
         f.open_scored,
         f.closed_total,
         f.removed_total,
         f.resolved_listed,
         f.resolved_flow::integer,
         f.removed_flow::integer,
         (select jsonb_object_agg(x.product, x.data)
            from (select p.product,
                         jsonb_build_object(
                           'label', min(p.label),
                           'sections', jsonb_object_agg(p.section,
                                         jsonb_build_array(p.bugs, p.scored, p.score))) as data
                    from prod p
                   where p.day = f.day
                   group by p.product) x)                                     as products
    from flows f
   where p_since is null or f.day >= p_since
   order by f.day;
$$;

revoke all on function public.tech_bug_trend(text, date) from public, anon;
grant execute on function public.tech_bug_trend(text, date) to authenticated;


-- ── check it ───────────────────────────────────────────────────────────────
-- Every point on record, day by day. The last row is today, and its open bugs
-- and weighted score should match the strip at the top of the page.
-- resolved_flow is null on the first row only.
select bucket, open_bugs, open_score, closed_total, resolved_listed,
       resolved_flow, removed_total, removed_flow
  from public.tech_bug_trend('day', null)
 order by bucket;

-- The same, by week: one point per week, and the flows count everything that
-- left the backlog inside that week.
select bucket, open_bugs, open_score, resolved_flow, removed_flow,
       (select count(*) from jsonb_object_keys(products)) as products
  from public.tech_bug_trend('week', null)
 order by bucket;

-- By month, which is what the longer ranges use.
select bucket, open_bugs, open_score, resolved_flow, removed_flow
  from public.tech_bug_trend('month', null)
 order by bucket;

-- A range: the last 30 days, weekly. The earliest row still carries a flow,
-- worked out from the capture before the range began.
select bucket, open_bugs, resolved_flow, removed_flow
  from public.tech_bug_trend('week', current_date - 30)
 order by bucket;
