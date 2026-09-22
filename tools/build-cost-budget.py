#!/usr/bin/env python3
"""Build supabase/cost-budget.sql from the monthly budget workbook.

    python tools/build-cost-budget.py ["2026 Monthly Budget Info for Bridge.xlsx"]

One sheet per department, each laid out the same way:

    % Spent
    Category | Apr | May | Jun | ... | Dec
    Wages    |  28 |  34 | ...
    Travel   | ...
    Contract | ...
    Total    |  31 |  40 | ...

Every figure is the percentage of that department's ANNUAL budget spent so far
— cumulative, not the month on its own. `Total` is the department's own number
rather than the sum of the rows above it: the categories listed are the large
ones, not all of them, so the rows will not add up and are not meant to.

── This seeds; it does not overwrite ──

The workbook is how the table is filled the first time. After that Ben, Jess
and the PMs type each month into the PM Hub, so a re-run must never undo their
work: every insert is `on conflict do nothing`. A cell already in the database
stays exactly as it is, and only months the table has never seen are added.
To correct a figure that is already stored, edit it in the PM Hub — not here.

Once the SQL is written the workbook leaves the folder (it is gitignored, and
everything in it is now in the SQL).
"""

import datetime
import pathlib
import sys

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "supabase" / "cost-budget.sql"
DEFAULT_BOOK = "2026 Monthly Budget Info for Bridge.xlsx"

# The sheet's short code, the name the Bridge's DEPT_COLORS is keyed by, and
# the name this tab prints. The middle one is the join: it is why each
# department's line arrives in its own established colour instead of a new one
# invented for this page.
DEPTS = {
    "VP":     ("VP - Student Services",                          "VP — Student Services",       1),
    "RRS":    ("Student Records, Registration, and Support",     "Records, Registration & Support", 2),
    "DOS":    ("Dean of Students",                               "Dean of Students",            3),
    "DigOps": ("Digital Operations",                             "Digital Operations",          4),
    "E&R":    ("Enrollment & Retention",                         "Enrollment & Retention",      5),
}

# The three the workbook breaks out today. Anything else on a sheet is carried
# through under its own name and sorted after these.
KNOWN = {"wages": ("Wages", 1), "travel": ("Travel", 2), "contract": ("Contract", 3)}
TOTAL_ORDER = 99

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "july": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10,
    "nov": 11, "dec": 12,
}


def q(text):
    """A Postgres string literal, or null."""
    if text is None:
        return "null"
    return "'" + str(text).replace("'", "''") + "'"


def slug(text):
    out = "".join(c if c.isalnum() else "_" for c in str(text).strip().lower())
    return "_".join(p for p in out.split("_") if p) or "category"


def month_of(cell):
    """The month number a header cell names, or None."""
    if cell is None:
        return None
    if isinstance(cell, datetime.datetime):
        return cell.month
    return MONTHS.get(str(cell).strip().lower().rstrip("."))


def number(cell):
    """The percentage a cell holds, or None when it is blank.

    Whether 0.64 means 64% is not a guess: Excel stores a percent-formatted
    cell as the fraction and says so in the number format. Guessing from the
    value instead read E&R's Travel — a literal 1, meaning 1% — as 100%.
    """
    if cell is None or cell.value is None or str(cell.value).strip() == "":
        return None
    try:
        n = float(str(cell.value).strip().rstrip("%"))
    except ValueError:
        return None
    if "%" in (cell.number_format or ""):
        n *= 100
    return round(n, 2)


def read_sheet(ws):
    """(header months, [(key, label, order, {month: pct})]) for one department."""
    rows = list(ws.iter_rows())
    head = next((r for r in rows
                 if r and r[0].value and str(r[0].value).strip().lower() == "category"), None)
    if head is None:
        raise SystemExit(f"{ws.title}: no 'Category' header row")

    cols = [(i, month_of(c.value)) for i, c in enumerate(head)]
    cols = [(i, m) for i, m in cols if m]

    out, seen = [], set()
    for row in rows[rows.index(head) + 1:]:
        if not row or row[0].value is None or str(row[0].value).strip() == "":
            continue
        label = str(row[0].value).strip()
        key = slug(label)
        if key in seen:
            continue
        seen.add(key)
        if key == "total":
            order = TOTAL_ORDER
        elif key in KNOWN:
            label, order = KNOWN[key]
        else:
            order = 50            # an unfamiliar category sorts after the three
        values = {}
        for i, m in cols:
            n = number(row[i]) if i < len(row) else None
            if n is not None:
                values[m] = n
        out.append((key, label, order, values))
    return [m for _, m in cols], out


def main():
    book = ROOT / (sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BOOK)
    if not book.exists():
        raise SystemExit(f"no workbook at {book}")

    year = next((int(t) for t in book.stem.split() if t.isdigit() and len(t) == 4), None)
    if year is None:
        raise SystemExit(f"cannot read a year from the file name: {book.name}")

    wb = openpyxl.load_workbook(book, data_only=True)
    saved = (wb.properties.modified or datetime.datetime.now()).date()

    depts, lines, summary, anomalies = [], [], [], []
    for code, (palette, display, order) in DEPTS.items():
        if code not in wb.sheetnames:
            print(f"  ! no sheet for {code}", file=sys.stderr)
            continue
        months, cats = read_sheet(wb[code])
        depts.append(code)

        for key, label, corder, values in cats:
            for m in sorted(values):
                lines.append(
                    f"  ({year}, {q(code)}, {q(palette)}, {q(display)}, {order}, "
                    f"{q(key)}, {q(label)}, {corder}, {m}, {values[m]})"
                )
            # Cumulative spend cannot fall. Where it does the budget was
            # restated (or a figure is wrong), and it matters: the year-end
            # projection is drawn through these points.
            seq = [values[m] for m in sorted(values)]
            for i in range(1, len(seq)):
                if seq[i] < seq[i - 1] - 0.01:
                    anomalies.append(
                        f"{code} {label}: {seq[i - 1]:g} -> {seq[i]:g} "
                        f"between months {sorted(values)[i - 1]} and {sorted(values)[i]}"
                    )

        total = next((v for k, _, _, v in cats if k == "total"), {})
        if total:
            last = max(total)
            summary.append(
                f"--    {display:<34} {len(cats) - 1} categories, "
                f"through month {last}: {total[last]:g}% spent"
            )

    tracked = sorted({int(l.rsplit(", ", 2)[-2]) for l in lines})
    header = [
        "-- " + "═" * 74,
        "--  COST KPI — the monthly budget, seeded by tools/build-cost-budget.py.",
        "--",
        f"--  Source:  {book.name}, saved {saved}",
        f"--  Budget year: {year}. Months present: {tracked[0]}–{tracked[-1]}.",
        "--",
        *summary,
        "--",
        "--  Every figure is the percentage of the department's ANNUAL budget spent",
        "--  so far. `total` is the department's own number, not the sum of the",
        "--  categories beside it — those are the largest ones, not all of them.",
        "--",
    ]
    if anomalies:
        header += [
            "--  ── Worth a look ──",
            "--  Cumulative spend fell from one month to the next here, which it",
            "--  cannot do unless the budget itself was restated:",
            *[f"--    {a}" for a in anomalies],
            "--",
        ]
    header += [
        "--  Safe to re-run: every row is `on conflict do nothing`, so a figure",
        "--  already in the table is never overwritten. Later months are typed in",
        "--  the PM Hub; this file only ever fills cells the table has not seen.",
        "-- " + "═" * 74,
    ]

    sql = "\n".join(header) + f"""

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
  category_order  integer not null,   -- 'total' sorts last, at {TOTAL_ORDER}
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
{",\n".join(lines)}
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
 where budget_year = {year}
 group by dept_label, dept_order
 order by dept_order;
"""

    OUT.write_text(sql, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} — {len(lines)} figures, {len(depts)} departments")
    for line in summary:
        print("   ", line[6:])
    if anomalies:
        print("\n  worth a look — cumulative spend fell:")
        for a in anomalies:
            print("   ", a)
    print(f"\n  Now delete {book.name} from the folder.")


if __name__ == "__main__":
    main()
