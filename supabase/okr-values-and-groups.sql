-- ═══════════════════════════════════════════════════════════════════════════
--  OKRs — one row measured in the wrong unit (and its missing stretch goal),
--  and three sets of rows regrouped
--
--  Safe to re-run. Each update only matches rows still in their old shape, so
--  a second run changes nothing.
--
--  ── How the OKR page groups ──
--  Within an objective, rows are gathered under the parent sub-key result they
--  share; a parent with several rows becomes one collapsible group. Moving a
--  row into a group means giving it that parent and keeping its own name as
--  the child. Every page titles a row by its child first (okr-progress.js and,
--  as of this change, departments/js/dept-goals.js), so it still reads as
--  itself inside the group.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. The 3-point retention increase is measured in points ─────────────────
-- It was typed 'KPI % - Increase' with a goal of 0.03, so every page read it
-- as a percentage: "3% / 3%". The goal is three points of retention and it
-- should read "3 / 3", the way the 'KPI #' rows read "9 / 5" and "8 / 5".
--
-- So it becomes a count row like them: the type gains its "#", and the three
-- values go from fractions to the numbers they stand for (0.03 -> 3,
-- 0.07 -> 7). Matching on the old type is what stops a second run turning 3
-- into 300.
update public.okrs
   set type         = 'KPI # - Increase',
       goal         = goal * 100,
       stretch_goal = stretch_goal * 100,
       progress     = progress * 100
 where sub_key_result like 'Demonstrate a 3-point 2nd term retention increase%'
   and type = 'KPI % - Increase';

-- ── 2. Reach retention goals: C1, PC and C&D as one group ───────────────────
-- The three share a key result but each was its own parent, so they stood
-- apart. They now share a parent named for the key result they already have
-- in common. `sub_key_result_child is null` is the re-run guard: once moved,
-- a row's parent is no longer one of the three names below.
update public.okrs
   set sub_key_result_child = sub_key_result,
       sub_key_result       = key_result
 where okr        = 'Reach retention goals through targeted initiatives'
   and key_result = 'Achieve retention & completion KPIs'
   and sub_key_result in ('Achieve 40% C1 Completion',
                          'Achieve 45% PC Completion',
                          'Achieve 55% C&D 4-term Retention')
   and sub_key_result_child is null;

-- ── 3. Enable enrollment scaling: the Portuguese MLP yield joins the 75% ─────
-- "Achieve 60% PC New yield … for Portuguese MLP" goes into the group headed
-- by "Achieve 75% PC New yield from admission to registration", beside the
-- orientation, communication and counselor items already there. The group
-- sorts by name, so it lands first, next to the 75% measure itself.
update public.okrs
   set sub_key_result_child = sub_key_result,
       sub_key_result       = 'Achieve 75% PC New yield from admission to registration'
 where okr            = 'Enable enrollment scaling'
   and sub_key_result = 'Achieve 60% PC New yield from admission to registration for Portuguese MLP'
   and sub_key_result_child is null;

-- ── 4. Clarify and refine: the four survey results as one group ────────────
-- Access to Resources, Confusion of Student Services Roles, Role Clarity and
-- Workload. They already say what they have in common — every one begins
-- "Student Services Survey Results:" — so that is the group's name. Each keeps
-- its full name inside it. Once moved, a row's parent no longer has the
-- colon, which is what stops a second run matching it again.
update public.okrs
   set sub_key_result_child = sub_key_result,
       sub_key_result       = 'Student Services Survey Results'
 where okr = 'Clarify and refine the Student Services organization'
   and sub_key_result like 'Student Services Survey Results:%'
   and sub_key_result_child is null;

-- ── 5. …and its stretch goal of 7 points ────────────────────────────────────
-- Step 1 carried the row's stretch goal across with everything else, but the
-- live row had none to carry — it was blank, although the workbook it was
-- first loaded from gave it 7%. Now that the row counts in points, it is 7.
-- Only filled while still blank, so a stretch set later in the PM Hub is never
-- overwritten by a re-run.
update public.okrs
   set stretch_goal = 7
 where sub_key_result like 'Demonstrate a 3-point 2nd term retention increase%'
   and type = 'KPI # - Increase'
   and stretch_goal is null;

commit;

-- ── check it ───────────────────────────────────────────────────────────────
-- Expect: the three completion/retention rows under one parent, each named as
-- its child; the 3-point row as 'KPI # - Increase', goal 3, stretch 7, progress 3; the
-- Portuguese MLP row as a child of the 75% yield group; the four survey rows
-- under 'Student Services Survey Results'; and the two count rows unchanged
-- at 9 / 5 and 8 / 5.
select okr, sub_key_result, sub_key_result_child, type, goal, stretch_goal, progress
  from public.okrs
 where okr = 'Reach retention goals through targeted initiatives'
    or sub_key_result like 'Achieve 75% PC New yield%'
    or sub_key_result like 'Student Services Survey Results%'
    or type like 'KPI #%'
 order by okr, sort_order;
