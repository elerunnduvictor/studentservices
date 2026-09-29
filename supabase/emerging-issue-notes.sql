-- ═══════════════════════════════════════════════════════════════════════════
--  EMERGING ISSUES — notes added after an issue is raised
--
--  An issue is still "report once, and that is the record": what the person
--  wrote when they raised it is never changed. Notes are how the story carries
--  on underneath it — what was tried, who was contacted, what changed — each
--  one stamped with when it was added and who added it.
--
--  ── The rules ──
--
--    Read     anyone who may read the register — the same function its own
--             policy uses, so an issue and its notes can never disagree about
--             who is let in. Partners included.
--    Add      anyone in Student Services (staff, directors, admins) — the same
--             people who can raise an issue.
--    Change   nobody. There is no update or delete, for anyone: a note is part
--             of the record the moment it is posted.
--
--  The time, the author's address and the author's name are stamped by the
--  database as the note goes in, overwriting anything the caller sent. A note
--  cannot be backdated or put in somebody else's name.
--
--  Run after emerging-issues-partners.sql. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.emerging_issue_notes (
  id               bigserial primary key,
  issue_id         bigint not null references public.emerging_issues(id) on delete cascade,
  body             text   not null check (length(btrim(body)) > 0),
  created_at       timestamptz not null default now(),
  created_by       text   not null default lower(coalesce(auth.jwt() ->> 'email', '')),
  created_by_name  text
);

create index if not exists emerging_issue_notes_issue_idx
  on public.emerging_issue_notes (issue_id, created_at);

-- ── the stamp ──────────────────────────────────────────────────────────────
-- Whatever the caller sent for these is replaced, so the page cannot be used to
-- post a note as somebody else or at some other time. The name comes from the
-- author's own access record, the way raised_by_name does on an issue.
create or replace function public.ei_note_stamp()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.created_at      := now();
  new.created_by      := lower(coalesce((select auth.jwt()) ->> 'email', ''));
  new.created_by_name := (select m.full_name from public.hub_me() m limit 1);
  new.body            := btrim(new.body);
  return new;
end $$;

drop trigger if exists emerging_issue_notes_stamp on public.emerging_issue_notes;
create trigger emerging_issue_notes_stamp
  before insert on public.emerging_issue_notes
  for each row execute function public.ei_note_stamp();

-- ── who may do what ────────────────────────────────────────────────────────
alter table public.emerging_issue_notes enable row level security;

drop policy if exists emerging_issue_notes_select on public.emerging_issue_notes;
create policy emerging_issue_notes_select on public.emerging_issue_notes
  for select to authenticated
  using (public.hub_sees_emerging_issues());

drop policy if exists emerging_issue_notes_insert on public.emerging_issue_notes;
create policy emerging_issue_notes_insert on public.emerging_issue_notes
  for insert to authenticated
  with check (coalesce(public.hub_role(), 'none') in ('staff', 'director', 'admin'));

-- Select and insert only. No update or delete is granted to anyone, so there
-- is no policy for either to get wrong.
revoke all on public.emerging_issue_notes from public, anon, authenticated;
grant select, insert on public.emerging_issue_notes to authenticated;
grant usage, select on sequence public.emerging_issue_notes_id_seq to authenticated;

commit;

-- ── check it ───────────────────────────────────────────────────────────────
-- Expect: the two policies, select and insert granted, update and delete not,
-- and a note count (0 on a first run).
select 'policies' as what,
       string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname) as detail
  from pg_policies
 where schemaname = 'public' and tablename = 'emerging_issue_notes'
union all
select 'may a signed-in user edit or delete a note? (must be no)',
       case when has_table_privilege('authenticated', 'public.emerging_issue_notes', 'UPDATE')
              or has_table_privilege('authenticated', 'public.emerging_issue_notes', 'DELETE')
            then 'YES — check the grants' else 'no' end
union all
select 'notes so far', count(*)::text from public.emerging_issue_notes;
