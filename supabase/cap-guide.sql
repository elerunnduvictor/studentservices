-- ═══════════════════════════════════════════════════════════════════════════
--  CAP WALKTHROUGH GUIDE
--
--  Reference copy of what's actually live (applied by hand in the SQL Editor,
--  2026-09-15, same convention as process-documentation.sql and
--  access-control.sql) — if this ever drifts from the database, the database
--  is the source of truth; update this file by reading the schema directly.
--
--  Two tables, content only (no schema for anything else on the Bridge):
--    cap_guide_sections   one row per heading, per audience ('team_member' /
--                          'leader') — Purpose, Links, Step 0..4.
--    cap_guide_items      one row per bullet/paragraph within a section.
--                          kind = 'paragraph' | 'list_item'; indent nests a
--                          lettered sub-list under a numbered one (0 or 1,
--                          the deepest the source content ever goes).
--                          link_label/link_url are a single optional inline
--                          or trailing link — never two links in one item,
--                          because the source content never has two either.
--
--  ── Why this table exists instead of hardcoding the guide in HTML/JS ──
--
--  The team's first instinct was to hardcode it — no schema to define yet,
--  ship today. But every other gated page in this app (processes/, directory/)
--  only ever hides its *UI* in JavaScript; the actual boundary is a live
--  Supabase query filtered by row-level security. Static HTML has no query to
--  filter: anyone with the URL gets the raw bytes regardless of what any
--  client-side gate does. This guide's audience (Ben Packer, FTE employees,
--  the 7 PMs, two named HR partners) is genuinely restricted, so it needed a
--  real boundary, not a cosmetic one — decided together 2026-09-15, see that
--  conversation for the fuller tradeoff.
--
--  ── The access list, and how each piece resolves ──
--
--    Ben Packer         hub_access.role = 'admin' (he's the VP; also covered
--                        under the PM condition below, no separate clause
--                        needed)
--    the 7 PMs           hub_access.role = 'admin' — the *whole* admin role,
--                        not admin filtered to scope_department is not null.
--                        That filter was the first draft and it's wrong: two
--                        of the seven PMs (Gilles Ravel Mambou, Jess
--                        Swinburne) are org-wide admins with scope_department
--                        = null, same shape as Ben's own row, so a filter
--                        meant to exclude just Ben would have excluded them
--                        too and dropped the PM count to 5. Every admin
--                        belongs here regardless of scope — 8 people total
--                        (Ben + 7 PMs), one clause.
--    FTE employees       hub_is_fte() — NOT a join on employees.email. Only
--                        1 of 30 active FTE rows in `employees` has that
--                        column populated at all; matching on it would have
--                        silently refused almost every real FTE. Matches on
--                        name instead (hub_access.full_name = employees.name,
--                        case-insensitive) — the same technique hub_subtree()
--                        already uses via scope_person elsewhere in this
--                        schema, just against full_name since scope_person is
--                        only ever set for role='staff'. Known gap, same
--                        class as scope-name-mismatch.sql's: 3 of 30 active
--                        FTEs don't resolve because the two tables spell their
--                        name slightly differently (a missing/extra middle
--                        name in every case) — Joshua Stafford Hadden vs.
--                        "Joshua Hadden", Shaunasee Janette James vs.
--                        "Shaunasee James", Alison Cundiff vs. "Alison Rae
--                        Cundiff". Fixing it means aligning the spelling in
--                        one of the two tables by hand, the same remedy
--                        scope-name-mismatch.sql already used for Johanna
--                        Relkin — not something this migration does on its
--                        own, since it isn't this file's call which table's
--                        spelling is the correct one.
--    Jacob Walters,      named exceptions, matched by their existing
--    Jake McKay Shannon  hub_access rows (role='partner', category='Partner
--                        - Human Resources') — jacobleewalters@byupw.edu,
--                        jshannon@byupw.edu. There is no separate "access
--                        exceptions" table anywhere in this schema; hub_access
--                        itself already carries individual rows for people
--                        outside the org, which is what these two already are.
--
--  Verified directly (not just read off the policy text): Ben, a PM, an FTE,
--  and both named exceptions each independently return all 13 sections; a
--  random staff account outside every one of those conditions, and an
--  anonymous request, both return zero rows from the table, not merely a
--  hidden page.
--
--  Read-only for everyone but allowed_editors, same as every other reference
--  table in this schema — there is no write UI for this content yet.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.hub_is_fte()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.hub_access h
    join public.employees e on lower(e.name) = lower(h.full_name)
    where lower(h.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
      and h.active
      and e.active
      and e.employment_type = 'Full-Time Employee'
  );
$$;

create table if not exists public.cap_guide_sections (
  id          bigint generated always as identity primary key,
  audience    text not null check (audience in ('team_member','leader')),
  sort_order  integer not null,
  section_key text not null,
  title       text not null,
  intro       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text,
  unique (audience, section_key)
);

create table if not exists public.cap_guide_items (
  id          bigint generated always as identity primary key,
  section_id  bigint not null references public.cap_guide_sections(id) on delete cascade,
  sort_order  integer not null,
  indent      integer not null default 0,
  kind        text not null default 'paragraph' check (kind in ('paragraph','list_item')),
  body        text,
  link_label  text,
  link_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create index if not exists cap_guide_items_section_idx on public.cap_guide_items (section_id, sort_order);

alter table public.cap_guide_sections enable row level security;
alter table public.cap_guide_items enable row level security;

create policy cap_guide_sections_select on public.cap_guide_sections
  for select to authenticated
  using (
    hub_role() = 'admin'
    or hub_is_fte()
    or lower(coalesce((select auth.jwt())->>'email','')) in ('jacobleewalters@byupw.edu','jshannon@byupw.edu')
  );

create policy cap_guide_items_select on public.cap_guide_items
  for select to authenticated
  using (
    hub_role() = 'admin'
    or hub_is_fte()
    or lower(coalesce((select auth.jwt())->>'email','')) in ('jacobleewalters@byupw.edu','jshannon@byupw.edu')
  );

create policy cap_guide_sections_write on public.cap_guide_sections
  for all to authenticated
  using (lower(coalesce((select auth.jwt())->>'email','')) in (select lower(email) from allowed_editors))
  with check (lower(coalesce((select auth.jwt())->>'email','')) in (select lower(email) from allowed_editors));

create policy cap_guide_items_write on public.cap_guide_items
  for all to authenticated
  using (lower(coalesce((select auth.jwt())->>'email','')) in (select lower(email) from allowed_editors))
  with check (lower(coalesce((select auth.jwt())->>'email','')) in (select lower(email) from allowed_editors));

-- Content rows themselves (35 team_member items across 7 sections, 27 leader
-- items across 6 sections) are not reproduced here — see change_log / the
-- database directly. This file documents the shape, not a snapshot of the
-- prose, which is expected to be edited in place over time.
