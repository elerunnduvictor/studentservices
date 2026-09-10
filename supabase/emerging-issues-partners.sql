-- ═══════════════════════════════════════════════════════════════════════════
--  WHO MAY READ THE EMERGING ISSUES REGISTER
--
--  Until now: Student Services only.
--
--      emerging_issues_select
--        using (hub_role() = any (array['staff','director','admin']))
--
--  Now, three kinds of partner as well:
--
--      Partner - General      BYU-Pathway's own people. 93 of them, all on
--                             byupw.edu — partners to this hub, colleagues to
--                             the work it describes.
--      Partner - Leadership   Three, including the President, whose addresses
--                             are not all byupw.edu.
--      Student Services -     Two: the Springboard contractors. Partners by
--        Springboard          category because they sit outside Student
--                             Services, but they do the work the register is
--                             about.
--
--  Partner - BYU-I (75), Partner - Ensign (29) and Partner - S&I (5) continue
--  to be refused.
--
--  ── Why the category and not the email domain ──
--
--  The first version of this rule tested for an address ending in
--  "@byupw.edu". That admits exactly the 93 in Partner - General, and shuts
--  out Brian Ashton — the President — who is on churchofjesuschrist.org.
--
--  Adding his address as an exception would turn the rule into a list of
--  people somebody has to remember to maintain, which is the shape of every
--  access problem this hub has already had. `category` is the organisation's
--  own answer to the same question, it is already maintained in hub_access,
--  and it admits him for the reason he should be admitted rather than by name.
--
--  ── What this does not change ──
--
--  Only SELECT. emerging_issues_insert and emerging_issues_update are left
--  exactly as they are: reading a register is not the same as writing to it,
--  and the raise form is hidden from partners in the page as well.
--
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── the rule, in one place ─────────────────────────────────────────────────
-- Two things ask this question — the policy below, and the WHERE on
-- v_emerging_issues_brief in emerging-issues-brief-window.sql, which decides
-- whether the nav bell and the home alert appear. Written twice they would
-- eventually disagree, and the symptom would be a bell for a page that walls
-- you, or a page with no bell. So it is written once, here, and both call it.
--
-- Plain SQL, not SECURITY DEFINER: hub_role() and hub_me() already are, and
-- are already granted to authenticated only, so this needs no privilege of its
-- own. An anonymous caller cannot execute it, which is the same refusal it
-- would get from the functions inside it.
create or replace function public.hub_sees_emerging_issues()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.hub_role() = any (array['staff', 'director', 'admin'])
      or (
        public.hub_role() = 'partner'
        and (select m.category from public.hub_me() m) = any (array[
              'Partner - General',            -- BYU-Pathway's own, 93 of them
              'Partner - Leadership',          -- the President and two others
              'Student Services - Springboard' -- the contractors doing the work
            ])
      );
$$;

revoke all on function public.hub_sees_emerging_issues() from public, anon;
grant execute on function public.hub_sees_emerging_issues() to authenticated;


-- ── the policy ─────────────────────────────────────────────────────────────
drop policy if exists "emerging_issues_select" on public.emerging_issues;

create policy "emerging_issues_select" on public.emerging_issues
  for select to authenticated
  using (public.hub_sees_emerging_issues());


-- ── the brief view the nav bell and the home alert read ────────────────────
-- v_emerging_issues_brief carried its own copy of this rule and has been
-- changed to call the function above instead — see
-- emerging-issues-brief-window.sql, which must be run after this file so the
-- function exists. Same rule, so a reader who can open the register always
-- gets the bell and the alert that describe it.


-- ── check it ───────────────────────────────────────────────────────────────
-- Who the rule now admits, counted by category. Expect Partner - General and
-- Partner - Leadership to read `yes`, and BYU-I, Ensign and S&I to read `no`.
select h.category,
       h.role,
       count(*) as people,
       case
         when h.role = any (array['staff','director','admin']) then 'yes'
         when h.role = 'partner'
          and h.category = any (array['Partner - General','Partner - Leadership',
                                      'Student Services - Springboard'])
           then 'yes'
         else 'no'
       end as reads_the_register
  from public.hub_access h
 where h.active
 group by h.category, h.role
 order by reads_the_register desc, people desc;

-- And the President specifically, since he is the reason the rule is written
-- this way rather than on the email domain.
select email, full_name, role, category,
       case when category = any (array['Partner - General','Partner - Leadership',
                                       'Student Services - Springboard'])
            then 'yes' else 'no' end as reads_the_register
  from public.hub_access
 where lower(email) = 'bashton@churchofjesuschrist.org';

-- The policy as it now stands.
select policyname, cmd, roles::text, qual
  from pg_policies
 where schemaname = 'public' and tablename = 'emerging_issues'
 order by cmd;
