"""
Generate supabase/access-control.sql from "Hub Access List.xlsx".

This is the hub's access-control layer. Until now the hub let anyone on a flat
allow-list read everything; this gives each person a role and a scope, and moves
the decision into Postgres so restricted rows never reach the browser.

Four roles, derived from the sheet's "Category (confirm)" column:

  partner    third parties (BYU-I, Ensign, S&I, general). Student Services and
             each department at a glance — no sub-departments, no individuals,
             no directory listing.
  staff      inside Student Services. Full directory. On the scorecard they see
             their own reporting line downwards in full, and every other branch
             only as a rolled-up health figure.
  director   a department's director: that whole department, top to bottom.
  admin      the VP, the executive PMs and the departmental PMs: everything.

`scope_person` is what makes "Brad downwards" work — it names the employees row
the person sits at, and the subtree is walked from there through
`primary_stakeholder`. Resolved here rather than at query time because the
spreadsheet writes names loosely ("Alison Rae Cundiff" for "Alison Cundiff",
"Gilles Ravel Mambou" for "Elie Gilles Ravel Mambou") and that guesswork does
not belong in a policy.

    python supabase/build_access_control.py
"""
import json
import pathlib
import re
import sys
import unicodedata
import urllib.request

import openpyxl

REPO = pathlib.Path(__file__).resolve().parent.parent
SHEET = REPO / "Hub Access List.xlsx"
OUT = REPO / "supabase" / "access-control.sql"

# Department shorthand as the sheet writes it -> the name the database uses.
DEPARTMENTS = {
    "e&r": "Enrollment & Retention",
    "digi ops": "Digital Operations",
    "digi": "Digital Operations",
    "r2s": "Student Records, Registration, and Support",
    "dos": "Dean of Students",
}


def sql(v):
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def toks(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return [t for t in re.sub(r"[^a-z ]", " ", s.lower()).split() if len(t) > 1]


def classify(category):
    """Category text -> (role, department or None)."""
    c = " ".join(str(category or "").split())
    low = c.lower()

    if low.startswith("partner"):
        return "partner", None
    if not low.startswith("student services"):
        return "partner", None            # anything unrecognised gets the least access

    tail = low.replace("student services", "").strip(" -")

    if tail in ("vp", "executive pm"):
        return "admin", None
    if tail.endswith(" pm"):               # E&R PM, Digi PM, R2S PM, DOS PM
        return "admin", DEPARTMENTS.get(tail[:-3].strip())
    if tail.endswith(" director"):
        return "director", DEPARTMENTS.get(tail[:-9].strip())
    if tail == "springboard":
        return "staff", None
    return "staff", DEPARTMENTS.get(tail)


def load_employees():
    """Read the live directory so scope_person can be resolved against it."""
    cfg = (REPO / "shared" / "js" / "config.js").read_text(encoding="utf-8")
    url = re.search(r'SUPABASE_URL:\s*"([^"]+)"', cfg).group(1)
    # The key is written as several string literals joined by `+` so the file
    # stays inside a sane line length; take everything from the property name up
    # to the line that ends the expression, then stitch the literals together.
    tail = cfg.split("SUPABASE_ANON_KEY:", 1)[1]
    tail = tail.split("\n}", 1)[0].split(",\n", 1)[0]
    key = "".join(re.findall(r'"([^"]*)"', tail))
    req = urllib.request.Request(
        url.rstrip("/") + "/rest/v1/employees?select=name,email,department,primary_stakeholder",
        headers={"apikey": key, "Authorization": "Bearer " + key})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    if not SHEET.exists():
        sys.exit(f"Missing {SHEET.name} in the repository root.")

    employees = load_employees()
    by_email = {(e["email"] or "").lower(): e for e in employees if e.get("email")}
    by_tokens = [(set(toks(e["name"])), e) for e in employees]

    def resolve(name, email):
        e = by_email.get((email or "").lower())
        if e:
            return e["name"]
        t = set(toks(name))
        if not t:
            return None
        hits = [e for ts, e in by_tokens if t <= ts or ts <= t]
        return hits[0]["name"] if len(hits) == 1 else None

    wb = openpyxl.load_workbook(SHEET, data_only=True, read_only=True)
    rows = [[("" if c is None else str(c).strip()) for c in r]
            for r in wb["Hub Access List"].iter_rows(values_only=True)]
    hdr = rows[0]
    col = {h: i for i, h in enumerate(hdr) if h}
    wb.close()

    people, seen, stats = [], set(), {}
    for r in rows[1:]:
        if len(r) <= col["Email"]:
            continue
        email = (r[col["Email"]] or "").strip().lower()
        if not email or "@" not in email or email in seen:
            continue
        seen.add(email)
        name = r[col["Name"]] if len(r) > col["Name"] else ""
        category = r[col["Category (confirm)"]] if len(r) > col["Category (confirm)"] else ""
        role, dept = classify(category)
        person = resolve(name, email) if role in ("staff",) else None
        people.append({"email": email, "full_name": name, "category": category,
                       "role": role, "scope_department": dept, "scope_person": person})
        stats[role] = stats.get(role, 0) + 1

    L = ['''-- ═══════════ HUB ACCESS CONTROL ═══════════
--
-- Who may see what on the Student Services hub, decided in the database rather
-- than in the browser.
--
-- The hub used to hold a flat list of ~257 addresses in a JavaScript file: if
-- you were on it you saw everything. That is no longer good enough now that
-- third-party partners need access — a partner should see Student Services and
-- each department at a glance and nothing further, and hiding the rest in
-- JavaScript would not stop anyone opening the network tab.
--
-- So the rows never leave the server. Every read of `kpis` and `employees` is
-- filtered by row-level security against the caller's role, and the caller is
-- known because the hub now signs in to Supabase with their email.
--
-- ── The four roles ────────────────────────────────────────────────────────
--
--   partner   third parties. Student Services as a whole and each department as
--             a whole. No sub-departments, no individuals, no directory names.
--   staff     inside Student Services. The whole directory. On the scorecard,
--             their own reporting line downwards in full; every other branch
--             only as a rolled-up figure.
--   director  a department's director — that department, top to bottom.
--   admin     the VP, executive PMs and departmental PMs — everything.
--
-- ── How "everything from Brad downwards" is computed ──────────────────────
--
-- `scope_person` names the row a person occupies in `employees`, and
-- `hub_subtree()` walks `primary_stakeholder` from there. A staff member sees
-- KPIs for themselves and everyone reporting up to them, however deep.
--
-- Safe to re-run. Written by supabase/build_access_control.py from
-- "Hub Access List.xlsx" — edit access in the PM Hub afterwards, not here.

begin;

-- ── who is allowed in, and as what ────────────────────────────────────────
create table if not exists public.hub_access (
  email            text primary key,
  full_name        text,
  category         text,          -- the spreadsheet's wording, kept for reference
  role             text not null default 'partner'
                     check (role in ('partner', 'staff', 'director', 'admin')),
  scope_department text,          -- director: the department they run
  scope_person     text,          -- staff: the employees.name they sit at
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       text
);

create index if not exists hub_access_role_idx on public.hub_access (role);

''']

    L.append("""-- ── the caller ────────────────────────────────────────────────────────────
-- One row for whoever is asking. SECURITY DEFINER so a partner can be told
-- their own role without being able to read anyone else's.
create or replace function public.hub_me()
returns public.hub_access
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from public.hub_access
   where active
     and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
   limit 1;
$$;

create or replace function public.hub_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select role from public.hub_me()), 'none');
$$;

-- ── everyone at or below a person in the reporting chain ──────────────────
-- Recursive over `primary_stakeholder`. The depth guard is not decoration: a
-- directory maintained by hand can develop a cycle (two people listed as each
-- other's manager), and without it the query would never return.
create or replace function public.hub_subtree(p_person text)
returns table (name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with recursive tree as (
    select e.name, 1 as depth
      from public.employees e
     where lower(e.name) = lower(p_person)
    union
    select e.name, t.depth + 1
      from public.employees e
      join tree t on lower(e.primary_stakeholder) = lower(t.name)
     where t.depth < 12
  )
  select name from tree;
$$;

-- What the caller may see people-level detail for.
create or replace function public.hub_visible_people()
returns table (name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.name
    from public.employees e, public.hub_me() m
   where m.role = 'admin'
      or (m.role = 'director' and e.department = m.scope_department)
      or (m.role = 'staff' and e.name in (select s.name from public.hub_subtree(m.scope_person) s));
$$;

revoke all on function public.hub_me() from public, anon;
revoke all on function public.hub_role() from public, anon;
revoke all on function public.hub_subtree(text) from public, anon;
revoke all on function public.hub_visible_people() from public, anon;
grant execute on function public.hub_me() to authenticated;
grant execute on function public.hub_role() to authenticated;
grant execute on function public.hub_subtree(text) to authenticated;
grant execute on function public.hub_visible_people() to authenticated;

""")

    L.append("""-- ── the rules ─────────────────────────────────────────────────────────────
-- `kpis` carries the sensitive detail — who owns which measure and how it is
-- performing — so this is where the line is drawn. A partner gets no rows at
-- all: their view of the scorecard is built from the aggregates below, which
-- carry no names.
do $$
declare
  nm    text;
  names text[];
begin
  select coalesce(array_agg(policyname), '{}') into names
    from pg_policies where schemaname = 'public' and tablename = 'kpis' and cmd = 'SELECT';
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.kpis', nm);
  end loop;

  execute $p$
    create policy "kpis_select" on public.kpis for select using (
      public.hub_role() = 'admin'
      or (public.hub_role() in ('staff', 'director')
          and employee in (select name from public.hub_visible_people()))
    )$p$;
end;
$$;

-- The directory: staff and above see everyone, partners see nobody by name.
do $$
declare
  t     text;
  nm    text;
  names text[];
begin
  foreach t in array array['employees', 'student_employees']
  loop
    select coalesce(array_agg(policyname), '{}') into names
      from pg_policies where schemaname = 'public' and tablename = t and cmd = 'SELECT';
    foreach nm in array names loop
      execute format('drop policy if exists %I on public.%I', nm, t);
    end loop;
    execute format($p$
      create policy "%1$s_select" on public.%1$s for select using (
        public.hub_role() in ('staff', 'director', 'admin')
      )$p$, t);
  end loop;
end;
$$;

-- ── the rolled-up view, for everything the caller may not open ────────────
--
-- Two needs, one shape. A partner must still see Student Services and each
-- department as a whole; a staff member must still see that the Registrar's
-- Office is amber even though its people are none of their business. Both are
-- "health without names".
--
-- So this returns the bands and the current value — enough for the browser to
-- work out a colour with the same rule the scorecard already uses — and nothing
-- that identifies anyone. No employee, no measure text, no role. The grain
-- follows the caller: a partner gets one row per department, everyone inside
-- Student Services gets one per sub-department.
--
-- SECURITY DEFINER because it is deliberately reading rows the caller cannot,
-- and returning strictly less than it read.
create or replace function public.hub_scorecard_rollup()
returns table (department text, sub_department text, category_type text,
               band_green text, band_yellow text, band_red text,
               current_value text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select k.department,
         -- cast required: a bare NULL in a CASE has no type, and the function's
         -- declared return column does not supply one
         -- sub-department lives on the employee, not the KPI — which is the
         -- reason for the join below
         case when public.hub_role() = 'partner' then null::text
              else e.sub_department end,
         k.category_type, k.band_green, k.band_yellow, k.band_red, k.current_value
    from public.kpis k
    left join public.employees e on lower(e.name) = lower(k.employee)
   where k.tracking_status = 'Tracking'
     and public.hub_role() <> 'none';
$$;

-- Headcount and department blurb, for the partner view of the directory and
-- the department pages. Counts only — never a name.
create or replace function public.hub_department_summary()
returns table (department text, description text, sort_order integer,
               staff_count bigint, contractor_count integer, tracked_kpis bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select d.name, d.description, d.sort_order,
         (select count(*) from public.employees e where e.department = d.name and e.active),
         coalesce((select c.headcount from public.student_contractor_counts c
                    where c.department = d.name), 0),
         (select count(*) from public.kpis k
           where k.department = d.name and k.tracking_status = 'Tracking')
    from public.departments d
   where public.hub_role() <> 'none'
   order by d.sort_order, d.name;
$$;

revoke all on function public.hub_scorecard_rollup() from public, anon;
revoke all on function public.hub_department_summary() from public, anon;
grant execute on function public.hub_scorecard_rollup() to authenticated;
grant execute on function public.hub_department_summary() to authenticated;

""")

    L.append("""-- ── signing in ────────────────────────────────────────────────────────────
-- The signup trigger from the PM Hub work only admitted the seven editors.
-- Everyone on the hub access list needs an account too, so it now admits
-- either list — and still nobody else.
create or replace function public.enforce_provisioned_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.allowed_editors e
              where lower(e.email) = lower(new.email))
     or exists (select 1 from public.hub_access h
                 where h.active and lower(h.email) = lower(new.email)) then
    return new;
  end if;
  raise exception
    'This address is not provisioned for Student Services. Contact Ben Packer or Jess Swinburne.'
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists enforce_provisioned_signup on auth.users;
create trigger enforce_provisioned_signup
  before insert on auth.users
  for each row execute function public.enforce_provisioned_signup();

-- ── hub_access itself ─────────────────────────────────────────────────────
-- Readable only by admins, so a partner cannot enumerate the organisation from
-- the access list. Writable by the PM editors, which is what makes it a normal
-- PM Hub sheet.
do $$
declare
  nm    text;
  names text[];
  chk constant text :=
    'lower(coalesce((select auth.jwt()) ->> ''email'', '''')) in '
    '(select lower(e.email) from public.allowed_editors e)';
begin
  execute 'drop trigger if exists hub_access_touch on public.hub_access;
    create trigger hub_access_touch before update on public.hub_access
      for each row execute function public.touch_row();';
  execute 'drop trigger if exists hub_access_audit on public.hub_access;
    create trigger hub_access_audit after insert or update or delete on public.hub_access
      for each row execute function public.record_change();';

  select coalesce(array_agg(policyname), '{}') into names
    from pg_policies where schemaname = 'public' and tablename = 'hub_access';
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.hub_access', nm);
  end loop;

  execute 'alter table public.hub_access enable row level security';
  execute format('create policy "hub_access_select" on public.hub_access
      for select to authenticated using (%s or public.hub_role() = ''admin'')', chk);
  execute format('create policy "hub_access_insert" on public.hub_access
      for insert to authenticated with check (%s)', chk);
  execute format('create policy "hub_access_update" on public.hub_access
      for update to authenticated using (%1$s) with check (%1$s)', chk);
  execute format('create policy "hub_access_delete" on public.hub_access
      for delete to authenticated using (%s)', chk);
end;
$$;

grant select on public.hub_access to authenticated;
grant insert, update, delete on public.hub_access to authenticated;

-- ── the list ──────────────────────────────────────────────────────────────
""")

    cols = ["email", "full_name", "category", "role", "scope_department", "scope_person"]
    L.append("insert into public.hub_access (" + ", ".join(cols) + ") values\n" +
             ",\n".join("  (" + ", ".join(sql(p[c]) for c in cols) + ")" for p in people) +
             "\non conflict (email) do update set\n" +
             "  full_name = excluded.full_name, category = excluded.category,\n" +
             "  role = excluded.role, scope_department = excluded.scope_department,\n" +
             "  scope_person = excluded.scope_person, active = true;\n\ncommit;\n")

    L.append("""
-- ═══════════ USAGE ANALYTICS ═══════════
--
-- Page hits and sign-ins, for internal review.
--
-- Append-only by construction: a signed-in person may insert their own events
-- and nothing else. No update, no delete, and the email is taken from the token
-- rather than the request body, so a row cannot be attributed to someone else.
-- Only admins may read it — usage data is a record of individuals' behaviour
-- and should not be browsable by the whole organisation.

begin;

create table if not exists public.hub_events (
  id         bigserial primary key,
  occurred_at timestamptz not null default now(),
  email      text,
  role       text,                 -- their role at the time, so trends survive a change
  event      text not null,        -- 'page' | 'login' | 'login_denied'
  page       text,                 -- '/scorecard', '/directory', …
  referrer   text,
  user_agent text
);

create index if not exists hub_events_time_idx  on public.hub_events (occurred_at desc);
create index if not exists hub_events_email_idx on public.hub_events (email, occurred_at desc);
create index if not exists hub_events_page_idx  on public.hub_events (page, occurred_at desc);

-- The only way in. Stamps identity server-side; the caller supplies just what
-- happened, never who it happened to.
create or replace function public.hub_track(
  p_event    text,
  p_page     text default null,
  p_referrer text default null,
  p_agent    text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  who text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
begin
  if p_event not in ('page', 'login', 'login_denied') then
    return;                                   -- ignore anything unrecognised
  end if;
  insert into public.hub_events (email, role, event, page, referrer, user_agent)
  values (nullif(who, ''), public.hub_role(), p_event,
          left(coalesce(p_page, ''), 200), left(coalesce(p_referrer, ''), 300),
          left(coalesce(p_agent, ''), 300));
end;
$$;

revoke all on function public.hub_track(text, text, text, text) from public, anon;
grant execute on function public.hub_track(text, text, text, text) to authenticated;

alter table public.hub_events enable row level security;
do $$
declare
  nm    text;
  names text[];
begin
  select coalesce(array_agg(policyname), '{}') into names
    from pg_policies where schemaname = 'public' and tablename = 'hub_events';
  foreach nm in array names loop
    execute format('drop policy if exists %I on public.hub_events', nm);
  end loop;
  -- Reading is for admins. Writing happens only through hub_track().
  execute 'create policy "hub_events_select" on public.hub_events
             for select to authenticated using (public.hub_role() = ''admin'')';
end;
$$;

grant select on public.hub_events to authenticated;
revoke insert, update, delete on public.hub_events from anon, authenticated;

-- ── what the reports read ─────────────────────────────────────────────────
create or replace view public.v_hub_usage_daily as
  select date_trunc('day', occurred_at)::date as day,
         event,
         count(*)                             as hits,
         count(distinct email)                as people
    from public.hub_events
   group by 1, 2
   order by 1 desc, 2;

create or replace view public.v_hub_usage_pages as
  select coalesce(nullif(page, ''), '(unknown)') as page,
         count(*)                                as hits,
         count(distinct email)                   as people,
         max(occurred_at)                        as last_seen
    from public.hub_events
   where event = 'page'
   group by 1
   order by 2 desc;

alter view public.v_hub_usage_daily set (security_invoker = on);
alter view public.v_hub_usage_pages set (security_invoker = on);
grant select on public.v_hub_usage_daily, public.v_hub_usage_pages to authenticated;

commit;

-- ── check ─────────────────────────────────────────────────────────────────
select role, count(*) from public.hub_access group by role order by 2 desc;
select count(*) as staff_without_a_scope from public.hub_access
 where role = 'staff' and scope_person is null;
""")

    OUT.write_text("".join(L), encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(REPO)}")
    print(f"  people        {len(people)}")
    for r, n in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"    {r:9} {n}")
    noscope = [p for p in people if p["role"] == "staff" and not p["scope_person"]]
    print(f"  staff with no org row (org+dept view only): {len(noscope)}")
    for p in noscope:
        print(f"    · {p['full_name']} — {p['category']}")


if __name__ == "__main__":
    main()
