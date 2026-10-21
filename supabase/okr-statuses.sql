-- ═══════════════════════════════════════════════════════════════════════════
--  OKR STATUS — the allowed values, enforced by the database
--
--  Until now okrs.status was free text, guarded only by the PM Hub dropdown.
--  This adds a CHECK constraint, okrs_status_check, allowing exactly the eleven
--  values below or NULL. The PM Hub (pm/js/schema.js, OKR_STATUS) and the Bridge
--  (shared/js/okr-math.js, STATUSES) list the same text in the same order —
--  plain hyphens, e.g. 'Completed - On time'. Change all three together.
--
--  Run order:  1. this file          2. okr-status-data-fixes.sql
--  Paste into the Supabase SQL Editor and run once. Safe to re-run: the
--  constraint is dropped first if it exists.
--
--  Deliberately NOT applied to okr_progress_history: that table keeps the
--  statuses as they were written at the time, old spellings included.
--
--  What it does, in order:
--    a. Turns a status that is blank or only whitespace into NULL. Both read
--       as "no status" everywhere (the Bridge treats '' and NULL alike), but
--       only NULL passes the constraint, and the PM Hub itself saves a cleared
--       cell as NULL. This is the one data change in this file.
--    b. Stops, naming the offending rows, if any other status is outside the
--       list — a typo, an en dash, a trailing space. Nothing is changed in
--       that case; fix those rows in the PM Hub and run this again.
--    c. Adds the constraint.
--  All inside one transaction: if anything fails, nothing is kept.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- a. blank → NULL
update public.okrs
   set status = null
 where status is not null
   and btrim(status) = '';

-- b. refuse to go further over any value the constraint would reject
do $$
declare
  bad text;
begin
  select string_agg(format('id %s: %L', id, status), '; ' order by id)
    into bad
    from public.okrs
   where status is not null
     and status not in (
       'Not Started', 'On Track', 'At Risk', 'In Trouble', 'Delayed',
       'Completed - On time', 'Completed - Late',
       'Closed - Partially Achieved', 'Closed - Goal Not Achieved',
       'Canceled', 'Archived'
     );
  if bad is not null then
    raise exception 'okrs rows hold a status outside the allowed list, so the constraint was not added: %', bad
      using hint = 'Correct these rows (PM Hub or a guarded UPDATE), then run this file again.';
  end if;
end $$;

-- c. the constraint itself
alter table public.okrs drop constraint if exists okrs_status_check;
alter table public.okrs
  add constraint okrs_status_check check (
    status is null or status in (
      'Not Started', 'On Track', 'At Risk', 'In Trouble', 'Delayed',
      'Completed - On time', 'Completed - Late',
      'Closed - Partially Achieved', 'Closed - Goal Not Achieved',
      'Canceled', 'Archived'
    )
  );

comment on constraint okrs_status_check on public.okrs is
  'The eleven OKR statuses, plain hyphens. Mirrors OKR_STATUS in pm/js/schema.js and STATUSES in shared/js/okr-math.js.';

commit;

-- Check afterwards (read-only):
--   select status, count(*) from public.okrs group by status order by status;
