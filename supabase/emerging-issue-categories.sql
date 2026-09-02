-- ═══════════════════════════════════════════════════════════════════════════
--  EMERGING ISSUES — the category column
--
--  Adds `category` to emerging_issues and exposes it on v_emerging_issues, so
--  the raise form can record what kind of issue something is:
--
--      System Issues · High Profile Grievances · Operational Issues
--      General Concerns
--
--  That is a different question from severity (how bad) and from department
--  (whose). A system fault and a grievance can both be Critical and both belong
--  to Records, and what you do about them is not the same.
--
--  Safe to run more than once.
--
--  ── Before you run it ──
--
--  emerging_issues is not defined in schema.sql — it was created by a patch
--  that has since been removed from the repo — so this file cannot see the
--  current definition of v_emerging_issues and will not guess at it. STEP 2
--  therefore rebuilds the view from whatever it is now, rather than replacing
--  it with something written from memory. Read the notice it prints.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1: the column ──────────────────────────────────────────────────────
alter table public.emerging_issues
  add column if not exists category text;

comment on column public.emerging_issues.category is
  'What kind of issue this is: System Issues, High Profile Grievances, '
  'Operational Issues, or General Concerns. Null for issues raised before the '
  'column existed — which means nobody said, not that it is general.';

-- No check constraint on purpose. severity and status each have one, and both
-- have already had to be rewritten once when the vocabulary changed; a value
-- outside the list is refused on save and the person is shown a database error.
-- The four options are offered by a <select> that is built from one list in
-- emerging-issues.js, so free text cannot arrive from the form anyway. Add a
-- constraint here once the four names have settled:
--
--   alter table public.emerging_issues add constraint emerging_issues_category_check
--     check (category is null or category in
--       ('System Issues','High Profile Grievances','Operational Issues','General Concerns'));


-- ── STEP 2: put it on the view the page reads ───────────────────────────────
-- The register reads v_emerging_issues, so the column has to reach it or the
-- card will never show a category it did store.
--
-- This extends the existing definition instead of restating it: it reads the
-- view back with pg_get_viewdef, wraps it, and joins the new column on by id.
-- That keeps every filter, join and column the view already has, including any
-- this file has never seen.
do $$
declare
  def text;
begin
  if to_regclass('public.v_emerging_issues') is null then
    raise notice 'v_emerging_issues does not exist — nothing to extend.';
    return;
  end if;

  -- Already exposed? Then this has been run before.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'v_emerging_issues'
      and column_name  = 'category'
  ) then
    raise notice 'v_emerging_issues already exposes category — nothing to do.';
    return;
  end if;

  select pg_get_viewdef('public.v_emerging_issues'::regclass, true) into def;
  def := rtrim(btrim(def), ';');

  execute format(
    'create or replace view public.v_emerging_issues as
       select base.*, e.category
       from (%s) base
       join public.emerging_issues e on e.id = base.id',
    def);

  raise notice 'v_emerging_issues now exposes category.';
end $$;

-- A view runs with its owner's rights unless told otherwise, which would let it
-- read straight past row-level security. The original was created with
-- security_invoker on; re-creating it above resets that, so it is set again.
alter view public.v_emerging_issues set (security_invoker = on);


-- ── STEP 3: check it ────────────────────────────────────────────────────────
-- Expect one row naming the column, and the view listing it too.
select 'table'  as where_, column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'emerging_issues'
   and column_name = 'category'
union all
select 'view', column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'v_emerging_issues'
   and column_name = 'category';
