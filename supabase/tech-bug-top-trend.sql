-- ═══════════════════════════════════════════════════════════════════════════
--  THE TOP TEN OVER TIME — one row per point on the Top 10 tab's charts.
--
--  Run once, after supabase/tech-bugs.sql has created tech_bug_top_history
--  (its latest build writes that table and fills it each run).
--
--  tech_bug_trend() counts bugs and cannot say which ones. This returns the
--  heaviest bugs themselves, at each point, so the tab can say what entered
--  the top ten, what dropped out, how long each has been up there, and
--  whether the score it takes to get in is climbing.
--
--  A point is the latest capture inside each day, week or month — the same
--  rule the backlog's own charts use, so the two tabs never disagree about
--  what "this week" means. Points before p_since are still read, so the
--  earliest point in range can be compared with the capture before it.
--
--  p_grain   'day', 'week' or 'month'  (anything else is read as 'week')
--  p_since   the earliest point to return; null for everything on record
--
--  Each row carries the capture's whole stored list — twenty bugs, heaviest
--  first — as
--     [{"rank": 1, "key": "20495", "product": "Transcripts",
--       "label": "Transcripts", "title": "Orphan Course Issue",
--       "score": 184, "noWork": true, "scope": "5811"}, …]
--  Twenty rather than ten so the page can see a bug cross the line rather
--  than simply appear.
--
--  Who may read it: whoever may read the backlog. Security INVOKER, so
--  tech_bug_top_history's own policy — hub_sees_emerging_issues() — decides.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.tech_bug_top_trend(p_grain text default 'week',
                                                     p_since date default null)
returns table (bucket date, top jsonb)
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
  picked as (
    select max(h.captured_on) as day
      from public.tech_bug_top_history h, unit u
     group by date_trunc(u.g, h.captured_on::timestamp)
  )
  select p.day as bucket,
         (select jsonb_agg(jsonb_build_object(
                   'rank',    t.rank,
                   'key',     t.bug_key,
                   'product', t.product,
                   'label',   t.product_label,
                   'title',   t.title,
                   'score',   t.score,
                   'noWork',  t.no_workaround,
                   'scope',   t.scope)
                 order by t.rank)
            from public.tech_bug_top_history t
           where t.captured_on = p.day) as top
    from picked p
   where p_since is null or p.day >= p_since
   order by p.day;
$$;

revoke all on function public.tech_bug_top_trend(text, date) from public, anon;
grant execute on function public.tech_bug_top_trend(text, date) to authenticated;


-- ── check it ───────────────────────────────────────────────────────────────
-- Every capture on record, and what the top ten carried at each. The last
-- row is today; its ten scores added together are what the tab shows as the
-- weight the top ten carry.
select bucket,
       jsonb_array_length(top)                                as bugs_stored,
       (select sum((b ->> 'score')::numeric)
          from jsonb_array_elements(top) b
         where (b ->> 'rank')::int <= 10)                     as top_ten_score,
       (select b ->> 'score' from jsonb_array_elements(top) b
         where (b ->> 'rank')::int = 1)                       as heaviest,
       (select b ->> 'score' from jsonb_array_elements(top) b
         where (b ->> 'rank')::int = 10)                      as tenth_place
  from public.tech_bug_top_trend('day', null)
 order by bucket;

-- Today's ten, in order, with the products they belong to.
select b ->> 'rank' as rank, b ->> 'label' as product, b ->> 'title' as bug,
       b ->> 'score' as weighted_score, b ->> 'noWork' as no_workaround
  from public.tech_bug_top_trend('day', null) t,
       jsonb_array_elements(t.top) b
 where t.bucket = (select max(captured_on) from public.tech_bug_top_history)
   and (b ->> 'rank')::int <= 10
 order by (b ->> 'rank')::int;
