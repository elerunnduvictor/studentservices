-- ═══════════════════════════════════════════════════════════════════════════
--  PROVISION SEVEN OF MATT SMITH'S TECHNICAL SUPPORT TEAM AS STAFF (2026-10-12)
--
--  Technical Support sits in Student Records, Registration, and Support (R2S),
--  under Matthew Smith. These seven get the same access as the rest of R2S
--  staff — `staff`, category 'Student Services - R2S' — which is what lets them
--  into the pages the team actually works from:
--
--    Emerging Issues          read, raise, pin, and add notes to pinned issues
--    Field Notes              read every note; write their own
--    Technical Bugs Backlog   read (it is their own tracker)
--
--  None of those needed a new rule: each page's policy already admits
--  staff, directors and admins (hub_sees_emerging_issues(), field_notes_select,
--  tech_bugs_select). A `staff` row is the whole of the change.
--
--  ── scope_person ──
--
--  Five are in the directory as Technical Support Engineers reporting to
--  Matthew Smith, so scope_person is their directory name, exactly as written
--  there — that is what row-level security matches on for the KPI scorecard.
--  The other two (Alexander Cutler, mnellett) are deliberately not in the
--  directory and are not to be added: they need the Bridge, not a place in
--  the org chart. Their scope_person stays null, which costs them nothing on
--  the three pages above; the scorecard simply has no line of their own.
--
--  ── full_name ──
--
--  From the directory where it exists. Alexander Cutler's address spells his
--  name out; mnellett@byupw.edu's does not, so it is left null rather than
--  guessed — fill it in on the PM Hub's Access page.
--
--  ── It does not demote anyone ──
--
--  If one of these addresses is already provisioned, a `partner` row is raised
--  to `staff`; a staff, director or admin row is left exactly as it is.
--  Addresses are lowered on the way in and compared lower() to lower(), the
--  same comparison hub_role() makes, so this cannot create a second row for
--  the same person under different capitals.
--
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create temporary table new_tech_support (email text, full_name text, scope_person text) on commit drop;
insert into new_tech_support values
  ('adambradford@churchofjesuschrist.org',   'Adam Bradford',    'Adam Bradford'),
  ('miguelfiguereo@churchofjesuschrist.org', 'Miguel Figuereo',  'Miguel Figuereo'),
  ('armenwood@byupathway.org',               'Armen Wood',       'Armen Wood'),
  ('alexander.cutler@byupw.edu',             'Alexander Cutler', null),
  ('mnellett@byupw.edu',                     null,               null),
  ('jackfonseca@byupw.edu',                  'Jackson Fonseca',  'Jackson Fonseca'),
  ('winneraniekan@churchofjesuschrist.org',  'Winner Aniekan Anietie', 'Winner Aniekan Anietie');

-- Already here as a partner: raise to staff, fill only what is blank.
update public.hub_access h
   set role             = 'staff',
       category         = 'Student Services - R2S',
       scope_department = 'Student Records, Registration, and Support',
       scope_person     = coalesce(h.scope_person, n.scope_person),
       full_name        = coalesce(h.full_name, n.full_name),
       active           = true,
       updated_at       = now()
  from new_tech_support n
 where lower(h.email) = n.email
   and h.role = 'partner';

-- Not here at all: add.
insert into public.hub_access (email, full_name, category, role, scope_department, scope_person, active)
select n.email, n.full_name, 'Student Services - R2S', 'staff',
       'Student Records, Registration, and Support', n.scope_person, true
  from new_tech_support n
 where not exists (select 1 from public.hub_access h where lower(h.email) = n.email);

-- ── check it ───────────────────────────────────────────────────────────────
-- Expect seven rows, each `staff`, active, in R2S. `in_directory` says whether
-- the scorecard can find their line.
select n.email,
       h.full_name,
       h.role,
       h.active,
       h.scope_person,
       exists (select 1 from public.employees e where e.name = h.scope_person) as in_directory
  from new_tech_support n
  left join public.hub_access h on lower(h.email) = n.email
 order by n.email;

commit;
