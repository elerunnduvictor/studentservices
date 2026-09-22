-- ══════════════════════════════════════════════════════════════════════════
--  COST KPI — the monthly budget, seeded by tools/build-cost-budget.py.
--
--  Source:  2026 Monthly Budget Info for Bridge.xlsx, saved 2026-09-21
--  Budget year: 2026. Months present: 4–8.
--
--    VP — Student Services              3 categories, through month 8: 64% spent
--    Records, Registration & Support    3 categories, through month 8: 77% spent
--    Dean of Students                   3 categories, through month 8: 49% spent
--    Digital Operations                 2 categories, through month 8: 72% spent
--    Enrollment & Retention             3 categories, through month 8: 54% spent
--
--  Every figure is the percentage of the department's ANNUAL budget spent
--  so far. `total` is the department's own number, not the sum of the
--  categories beside it — those are the largest ones, not all of them.
--
--  ── Worth a look ──
--  Cumulative spend fell from one month to the next here, which it
--  cannot do unless the budget itself was restated:
--    VP Travel: 12 -> 6 between months 4 and 5
--    DigOps Contract: 65 -> 43 between months 4 and 5
--    DigOps Total: 59 -> 41 between months 4 and 5
--
--  Safe to re-run: every row is `on conflict do nothing`, so a figure
--  already in the table is never overwritten. Later months are typed in
--  the PM Hub; this file only ever fills cells the table has not seen.
-- ══════════════════════════════════════════════════════════════════════════

begin;

-- ── the table ──────────────────────────────────────────────────────────────
create table if not exists public.cost_budget (
  budget_year     integer not null,
  dept_code       text    not null,   -- as the workbook tabs name it: 'VP', 'RRS', …
  dept_palette    text    not null,   -- the name DEPT_COLORS is keyed by, so the
                                      -- line arrives in the department's own colour
  dept_label      text    not null,   -- how this tab prints it
  dept_order      integer not null,
  category_key    text    not null,   -- 'wages', 'travel', 'contract', 'total', …
  category_label  text    not null,
  category_order  integer not null,   -- 'total' sorts last, at 99
  month           integer not null check (month between 1 and 12),
  pct             numeric not null,   -- % of the ANNUAL budget spent, cumulative
  updated_at      timestamptz not null default now(),
  updated_by      text,
  primary key (budget_year, dept_code, category_key, month)
);

create index if not exists cost_budget_year_idx
  on public.cost_budget (budget_year, dept_order, category_order, month);

-- ── filling in what the editor should not have to type ────────────────────
-- A department's colour, printed name and position never change from month to
-- month, and neither does a category's. Asking whoever enters September to
-- retype six of them per row is how a department ends up with two spellings
-- and two colours. So the Hub sends four fields — department, category, month
-- and the figure — and the rest is copied from what that department already
-- has on record. A BEFORE trigger, so the values are in place by the time the
-- not-null constraints are checked.
create or replace function public.cost_budget_fill()
returns trigger language plpgsql as $$
begin
  if new.dept_palette is null or new.dept_label is null or new.dept_order is null then
    select c.dept_palette, c.dept_label, c.dept_order
      into new.dept_palette, new.dept_label, new.dept_order
      from public.cost_budget c
     where c.dept_code = new.dept_code
     order by c.budget_year desc, c.month desc
     limit 1;
  end if;

  if new.category_label is null or new.category_order is null then
    select c.category_label, c.category_order
      into new.category_label, new.category_order
      from public.cost_budget c
     where c.category_key = new.category_key
       and c.dept_code = new.dept_code
     order by c.budget_year desc, c.month desc
     limit 1;
  end if;
  -- A category this department has never used before: take the naming from
  -- any department that has, so 'travel' is "Travel" everywhere.
  if new.category_label is null or new.category_order is null then
    select c.category_label, c.category_order
      into new.category_label, new.category_order
      from public.cost_budget c
     where c.category_key = new.category_key
     order by c.budget_year desc, c.month desc
     limit 1;
  end if;

  -- Still nothing to copy: a brand new category, named from its own key.
  new.category_label := coalesce(new.category_label, initcap(replace(new.category_key, '_', ' ')));
  new.category_order := coalesce(new.category_order, 50);

  -- A department with nothing on record cannot be filled in from anywhere, and
  -- "null value violates not-null constraint" would not tell anyone why.
  if new.dept_palette is null then
    raise exception
      'No department on record with the code %. A department''s first row has to '
      'carry its palette name, printed name and order; later rows copy them.',
      new.dept_code
      using hint = 'Check the code, or add the department in tools/build-cost-budget.py.';
  end if;

  new.updated_at := now();
  new.updated_by := coalesce(
    nullif((select auth.jwt())->>'email', ''), new.updated_by, 'unknown');
  return new;
end $$;

drop trigger if exists cost_budget_fill_trg on public.cost_budget;
create trigger cost_budget_fill_trg
  before insert or update on public.cost_budget
  for each row execute function public.cost_budget_fill();

-- ── who may read it, who may write it ──────────────────────────────────────
-- Read: anyone who may read the scorecard this tab lives on. Write: the same
-- list that edits everything else from the PM Hub.
alter table public.cost_budget enable row level security;

drop policy if exists cost_budget_select on public.cost_budget;
create policy cost_budget_select on public.cost_budget
  for select to authenticated using (true);

drop policy if exists cost_budget_write on public.cost_budget;
create policy cost_budget_write on public.cost_budget
  for all to authenticated
  using (lower(coalesce((select auth.jwt())->>'email','')) in (select lower(email) from allowed_editors))
  with check (lower(coalesce((select auth.jwt())->>'email','')) in (select lower(email) from allowed_editors));

revoke all on public.cost_budget from public, anon, authenticated;
grant select on public.cost_budget to authenticated;
grant insert, update, delete on public.cost_budget to authenticated;

-- ── the workbook's figures ─────────────────────────────────────────────────
insert into public.cost_budget
  (budget_year, dept_code, dept_palette, dept_label, dept_order,
   category_key, category_label, category_order, month, pct)
values
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'wages', 'Wages', 1, 4, 28.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'wages', 'Wages', 1, 5, 34.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'wages', 'Wages', 1, 6, 40.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'wages', 'Wages', 1, 7, 45.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'wages', 'Wages', 1, 8, 48.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'travel', 'Travel', 2, 4, 12.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'travel', 'Travel', 2, 5, 6.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'travel', 'Travel', 2, 6, 7.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'travel', 'Travel', 2, 7, 9.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'travel', 'Travel', 2, 8, 18.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'contract', 'Contract', 3, 4, 31.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'contract', 'Contract', 3, 5, 41.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'contract', 'Contract', 3, 6, 50.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'contract', 'Contract', 3, 7, 60.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'contract', 'Contract', 3, 8, 69.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'total', 'Total', 99, 4, 31.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'total', 'Total', 99, 5, 40.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'total', 'Total', 99, 6, 48.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'total', 'Total', 99, 7, 56.0),
  (2026, 'VP', 'VP - Student Services', 'VP — Student Services', 1, 'total', 'Total', 99, 8, 64.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'wages', 'Wages', 1, 4, 30.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'wages', 'Wages', 1, 5, 37.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'wages', 'Wages', 1, 6, 42.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'wages', 'Wages', 1, 7, 47.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'wages', 'Wages', 1, 8, 50.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'travel', 'Travel', 2, 4, 0.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'travel', 'Travel', 2, 5, 0.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'travel', 'Travel', 2, 6, 0.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'travel', 'Travel', 2, 7, 0.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'travel', 'Travel', 2, 8, 18.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'contract', 'Contract', 3, 4, 45.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'contract', 'Contract', 3, 5, 59.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'contract', 'Contract', 3, 6, 72.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'contract', 'Contract', 3, 7, 85.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'contract', 'Contract', 3, 8, 99.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'total', 'Total', 99, 4, 39.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'total', 'Total', 99, 5, 49.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'total', 'Total', 99, 6, 58.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'total', 'Total', 99, 7, 68.0),
  (2026, 'RRS', 'Student Records, Registration, and Support', 'Records, Registration & Support', 2, 'total', 'Total', 99, 8, 77.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'wages', 'Wages', 1, 4, 10.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'wages', 'Wages', 1, 5, 13.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'wages', 'Wages', 1, 6, 16.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'wages', 'Wages', 1, 7, 18.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'wages', 'Wages', 1, 8, 21.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'travel', 'Travel', 2, 4, 0.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'travel', 'Travel', 2, 5, 2.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'travel', 'Travel', 2, 6, 7.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'travel', 'Travel', 2, 7, 12.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'travel', 'Travel', 2, 8, 14.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'contract', 'Contract', 3, 4, 26.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'contract', 'Contract', 3, 5, 42.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'contract', 'Contract', 3, 6, 51.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'contract', 'Contract', 3, 7, 59.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'contract', 'Contract', 3, 8, 67.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'total', 'Total', 99, 4, 21.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'total', 'Total', 99, 5, 30.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'total', 'Total', 99, 6, 37.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'total', 'Total', 99, 7, 43.0),
  (2026, 'DOS', 'Dean of Students', 'Dean of Students', 3, 'total', 'Total', 99, 8, 49.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'travel', 'Travel', 2, 4, 2.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'travel', 'Travel', 2, 5, 2.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'travel', 'Travel', 2, 6, 2.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'travel', 'Travel', 2, 7, 3.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'travel', 'Travel', 2, 8, 3.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'contract', 'Contract', 3, 4, 65.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'contract', 'Contract', 3, 5, 43.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'contract', 'Contract', 3, 6, 54.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'contract', 'Contract', 3, 7, 65.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'contract', 'Contract', 3, 8, 75.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'total', 'Total', 99, 4, 59.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'total', 'Total', 99, 5, 41.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'total', 'Total', 99, 6, 52.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'total', 'Total', 99, 7, 62.0),
  (2026, 'DigOps', 'Digital Operations', 'Digital Operations', 4, 'total', 'Total', 99, 8, 72.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'wages', 'Wages', 1, 4, 27.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'wages', 'Wages', 1, 5, 35.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'wages', 'Wages', 1, 6, 45.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'wages', 'Wages', 1, 7, 53.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'wages', 'Wages', 1, 8, 60.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'travel', 'Travel', 2, 4, 1.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'travel', 'Travel', 2, 5, 1.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'travel', 'Travel', 2, 6, 1.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'travel', 'Travel', 2, 7, 1.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'travel', 'Travel', 2, 8, 2.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'contract', 'Contract', 3, 4, 23.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'contract', 'Contract', 3, 5, 32.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'contract', 'Contract', 3, 6, 39.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'contract', 'Contract', 3, 7, 46.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'contract', 'Contract', 3, 8, 54.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'total', 'Total', 99, 4, 23.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'total', 'Total', 99, 5, 32.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'total', 'Total', 99, 6, 39.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'total', 'Total', 99, 7, 46.0),
  (2026, 'E&R', 'Enrollment & Retention', 'Enrollment & Retention', 5, 'total', 'Total', 99, 8, 54.0)
on conflict (budget_year, dept_code, category_key, month) do nothing;

commit;

-- ── check it ───────────────────────────────────────────────────────────────
-- One row per department: how many categories it breaks out, and the Total it
-- has reached in its latest tracked month.
select dept_label,
       count(*) filter (where category_key <> 'total')                    as category_cells,
       max(month) filter (where category_key = 'total')                   as latest_month,
       max(pct)   filter (where category_key = 'total'
                            and month = (select max(month)
                                           from public.cost_budget b
                                          where b.dept_code = c.dept_code
                                            and b.category_key = 'total'))as total_pct
  from public.cost_budget c
 where budget_year = 2026
 group by dept_label, dept_order
 order by dept_order;
