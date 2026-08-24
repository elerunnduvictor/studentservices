-- ═══════════════════════════════════════════════════════════════════════════
--  SEVERITY IN WORDS
--
--  The register stored its severity as a colour — Red, Amber, Green. Colour is
--  how a thing is *drawn*, not what it *is*, and storing it that way has two
--  costs. A reader who cannot distinguish red from amber is being told the
--  severity in a channel they do not have, even in plain text. And the digest
--  this data exists to feed would end up saying "this issue is red", which
--  describes a pixel rather than a problem.
--
--  So the level is now the word, and the colour is what the page paints it:
--
--      Red   → Critical      needs attention now
--      Amber → Moderate      being managed, worth watching
--      Green → Low           contained
--
--  Existing rows are translated in place. Safe to re-run: after the first pass
--  there is nothing left matching the old values.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- The old constraint has to go before the values can move through it.
alter table public.emerging_issues
  drop constraint if exists emerging_issues_severity_check;

update public.emerging_issues set severity = 'Critical' where severity = 'Red';
update public.emerging_issues set severity = 'Moderate' where severity = 'Amber';
update public.emerging_issues set severity = 'Low'      where severity = 'Green';

-- The log keeps its own copy of the level at the time of writing, so those
-- move too or the history would read in two vocabularies.
update public.emerging_issue_updates set severity_then = 'Critical' where severity_then = 'Red';
update public.emerging_issue_updates set severity_then = 'Moderate' where severity_then = 'Amber';
update public.emerging_issue_updates set severity_then = 'Low'      where severity_then = 'Green';

alter table public.emerging_issues
  alter column severity set default 'Moderate';

alter table public.emerging_issues
  add constraint emerging_issues_severity_check
  check (severity in ('Critical', 'Moderate', 'Low'));

-- ── the brief: renamed levels, and a guard ────────────────────────────────
-- Two changes at once.
--
-- The wording follows the new levels. And the whole row is now withheld from
-- anyone outside Student Services.
--
-- That second one is not belt-and-braces, it is a fix for a real cost. An
-- aggregate always returns a row: counting nothing still answers "0". So the
-- home page could not tell "you may not see this" from "there is nothing to
-- see", and had to wait for hub_me() to learn the reader's role before it dared
-- ask — session, then role, then query, three round trips in series before a
-- band could appear. With the row withheld at the source, "did a row come back"
-- is itself the answer, the role lookup drops off the critical path, and the
-- rule is enforced in Postgres rather than by a browser deciding to be honest.
create or replace view public.v_emerging_issues_brief
with (security_invoker = true) as
select * from (
  select
    count(*) filter (where resolved_at is null)                            as open_total,
    count(*) filter (where resolved_at is null and severity = 'Critical')  as red_open,
    count(*) filter (where resolved_at is null and severity = 'Moderate')  as amber_open,
    count(*) filter (where resolved_at is null and status = 'Escalated')   as escalated,
    count(*) filter (where resolved_at is null and days_since_update >= 14) as going_stale,
    count(*) filter (where resolved_at is null and days_to_target between 0 and 7) as due_this_week,
    count(*) filter (where resolved_at is null and days_to_target < 0)     as overdue,
    count(*) filter (where resolved_at >= now() - interval '30 days')      as resolved_30d,
    count(*) filter (where created_at  >= now() - interval '7 days')       as raised_7d
  from public.v_emerging_issues
) b
where public.hub_role() in ('staff', 'director', 'admin');

grant select on public.v_emerging_issues_brief to authenticated;

commit;

select severity, count(*) from public.emerging_issues group by severity;
