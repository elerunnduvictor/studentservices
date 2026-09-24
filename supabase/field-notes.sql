-- ═══════════════════════════════════════════════════════════════════════════
--  FIELD NOTES — the weekly note each team member writes about their own week
--
--  A third register on the Emerging Issues page, between the issue register and
--  the Technical Bugs Backlog. One row is one person's note about one week:
--  what the week held, anything blocking them, and what they are turning to
--  next. Problems that need someone to act still belong in Emerging Issues —
--  the tab says so at the top — so this stays a record of the work rather than
--  a second queue.
--
--  ── Which week ──
--
--  `week_of` is the Monday of the week the note is about, and the check keeps
--  it a Monday: the page buckets Current Week / Last Week / Backlog off this
--  column, and one row stored as a Sunday would sort itself into the wrong
--  bucket for ever.
--
--  Note the difference from emerging_issues, which buckets by rolling sevens on
--  purpose — an issue raised on Sunday evening should not be "last week" by
--  Monday morning. A field note is *about* a calendar week, so the calendar is
--  the right boundary here and the age of the row is beside the point.
--
--  ── Who may read one ──
--
--  Your own, always. Everyone's, if you are a director or an admin. A note
--  names a person and what they found hard that week, which is a narrower
--  thing than the issue register, so it is not shared sideways across the team.
--
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.field_notes (
  id          bigserial primary key,
  note_date   date not null default current_date,   -- the day it was written
  week_of     date not null                         -- the Monday it is about
              constraint field_notes_week_is_monday
              check (extract(isodow from week_of) = 1),
  person      text not null,                        -- who it is about, as shown
  department  text not null,
  notes       text not null,                        -- the week itself
  blockers    text,                                 -- optional, by design
  focus       text not null,                        -- what next week holds
  created_at  timestamptz not null default now(),
  -- Stamped from the session rather than typed: this is what row-level
  -- security matches on, so it cannot be the same field the writer fills in.
  -- `person` above is for display and may legitimately name someone else, when
  -- a note is filed on a colleague's behalf.
  created_by  text not null default lower(coalesce(auth.jwt() ->> 'email', ''))
);

create index if not exists field_notes_week_idx
  on public.field_notes (week_of desc, created_at desc);

alter table public.field_notes enable row level security;

-- ── reading ────────────────────────────────────────────────────────────────
drop policy if exists field_notes_select on public.field_notes;
create policy field_notes_select on public.field_notes
  for select to authenticated
  using (
    created_by = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    or hub_role() in ('director', 'admin')
  );

-- ── writing ────────────────────────────────────────────────────────────────
-- Anyone inside Student Services may write their own note, and only their own:
-- `created_by` must be the signed-in address, which its default already makes
-- true and this check keeps true even if a caller sends the column itself.
drop policy if exists field_notes_insert on public.field_notes;
create policy field_notes_insert on public.field_notes
  for insert to authenticated
  with check (
    created_by = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    and hub_role() in ('staff', 'director', 'admin')
  );

-- Nothing edits or deletes a note yet, and no policy grants it, so a note is
-- a record rather than a draft. Add `for update using (created_by = …)` here
-- if the page ever offers a writer a way to correct their own.

revoke all on public.field_notes from public, anon, authenticated;
grant select, insert on public.field_notes to authenticated;
grant usage on sequence public.field_notes_id_seq to authenticated;

-- ── what the page reads ────────────────────────────────────────────────────
-- security_invoker so the policies above apply to the caller; without it the
-- view would run as its owner and hand every reader every note.
create or replace view public.v_field_notes as
  select id, note_date, week_of, person, department,
         notes, blockers, focus, created_at, created_by
    from public.field_notes
   order by week_of desc, created_at desc;

alter view public.v_field_notes set (security_invoker = on);
grant select on public.v_field_notes to authenticated;

commit;

-- ── check it ───────────────────────────────────────────────────────────────
-- Empty on a first run. Once notes exist: one row per week, newest first, with
-- how many notes that week holds and how many people wrote them.
select week_of,
       count(*)                as notes,
       count(distinct person)  as people,
       max(created_at)         as latest
  from public.field_notes
 group by week_of
 order by week_of desc;
