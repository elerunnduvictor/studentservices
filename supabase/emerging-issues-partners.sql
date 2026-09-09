-- ═══════════════════════════════════════════════════════════════════════════
--  WHO MAY READ THE EMERGING ISSUES REGISTER
--
--  Until now: Student Services only.
--
--      emerging_issues_select
--        using (hub_role() = any (array['staff','director','admin']))
--
--  Now, two kinds of partner as well:
--
--      Partner - General      BYU-Pathway's own people. 93 of them, all on
--                             byupw.edu — partners to this hub, colleagues to
--                             the work it describes.
--      Partner - Leadership   Three, including the President, whose addresses
--                             are not all byupw.edu.
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

-- ── the rule ───────────────────────────────────────────────────────────────
drop policy if exists "emerging_issues_select" on public.emerging_issues;

create policy "emerging_issues_select" on public.emerging_issues
  for select to authenticated
  using (
    public.hub_role() = any (array['staff', 'director', 'admin'])
    or (
      public.hub_role() = 'partner'
      and (select m.category from public.hub_me() m)
            = any (array['Partner - General', 'Partner - Leadership'])
    )
  );


-- ── the brief view the nav bell and the home alert read ────────────────────
-- Left alone deliberately, and worth knowing: v_emerging_issues_brief carries
-- its own `where hub_role() = any (array['staff','director','admin'])`, so
-- these partners get the register but no bell on the nav link and no alert on
-- the home page. They reach it from the nav link, which the page now shows
-- them. Say if it should be widened to match; it is one more line there.


-- ── check it ───────────────────────────────────────────────────────────────
-- Who the rule now admits, counted by category. Expect Partner - General and
-- Partner - Leadership to read `yes`, and BYU-I, Ensign and S&I to read `no`.
select h.category,
       h.role,
       count(*) as people,
       case
         when h.role = any (array['staff','director','admin']) then 'yes'
         when h.role = 'partner'
          and h.category = any (array['Partner - General','Partner - Leadership'])
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
       case when category = any (array['Partner - General','Partner - Leadership'])
            then 'yes' else 'no' end as reads_the_register
  from public.hub_access
 where lower(email) = 'bashton@churchofjesuschrist.org';

-- The policy as it now stands.
select policyname, cmd, roles::text, qual
  from pg_policies
 where schemaname = 'public' and tablename = 'emerging_issues'
 order by cmd;
