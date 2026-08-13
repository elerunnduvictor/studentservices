-- ═══════════ HUB ACCESS CONTROL ═══════════
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

-- ── the caller ────────────────────────────────────────────────────────────
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

-- ── the rules ─────────────────────────────────────────────────────────────
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

-- ── signing in ────────────────────────────────────────────────────────────
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
insert into public.hub_access (email, full_name, category, role, scope_department, scope_person) values
  ('bpacker@byupw.edu', 'Ben Packer', 'Student Services - VP', 'admin', null, null),
  ('acundiff@byupw.edu', 'Alison Rae Cundiff', 'Student Services - E&R Director', 'director', 'Enrollment & Retention', null),
  ('kgraf@byupw.edu', 'Katelyn Graf', 'Student Services - E&R', 'staff', 'Enrollment & Retention', 'Katelyn Graf'),
  ('krichardson@byupw.edu', 'Kelley Richardson', 'Student Services - E&R', 'staff', 'Enrollment & Retention', 'Kelley Richardson'),
  ('joanna.relken@byupw.edu', 'Johanna Relkin', 'Student Services - E&R', 'staff', 'Enrollment & Retention', 'Joanna Relken'),
  ('mandraps@byupw.edu', 'Mandy Schwab', 'Student Services - E&R', 'staff', 'Enrollment & Retention', 'Mandy Poll Schwab'),
  ('tshelton@byupw.edu', 'Trevor Shelton', 'Student Services - E&R', 'staff', 'Enrollment & Retention', 'Trevor Shelton'),
  ('elizabeth.zmolek@byupw.edu', 'Ely Zmolek', 'Student Services - E&R', 'staff', 'Enrollment & Retention', 'Ely Zmolek'),
  ('scjames@byupw.edu', 'Shaunasee James', 'Student Services - E&R', 'staff', 'Enrollment & Retention', 'Shaunasee Janette James'),
  ('rhorton@byupw.edu', 'Rachel Kirk', 'Student Services - E&R', 'staff', 'Enrollment & Retention', 'Rachel Kirk'),
  ('khoward@byupw.edu', 'Kimarie Howard', 'Student Services - E&R', 'staff', 'Enrollment & Retention', 'Kimarie Howard'),
  ('megannicolebrown@byupw.edu', 'Megan Niblett', 'Student Services - E&R', 'staff', 'Enrollment & Retention', 'Megan Niblett'),
  ('jadams@byupw.edu', 'Jacob Adams', 'Student Services - Digi Ops Director', 'director', 'Digital Operations', null),
  ('rkailiponi@byupw.edu', 'Ricky Kailiponi Jr.', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'Ricky Kailiponi Jr.'),
  ('sebastian.vargas@churchofjesuschrist.org', 'Sebastian Vargas', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'Sebastian Vargas'),
  ('samuel.riveros@churchofjesuschrist.org', 'Samuel Riveros', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'Samuel Riveros'),
  ('izunigac@byupw.edu', 'Isaias Zuñiga', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'Isaias Zuñiga'),
  ('anthoniafeyisayo@churchofjesuschrist.org', 'Feyisayo Famakinde', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'Feyisayo Famakinde'),
  ('jhadden@byupw.edu', 'Joshua Hadden', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'Joshua Stafford Hadden'),
  ('aitanantc@churchofjesuschrist.org', 'Aitana Nathaly Toscano Cedeño', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'Aitana Nathaly Toscano Cedeño'),
  ('dpeck@byupw.edu', 'David Peck', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'David Peck'),
  ('pneiufi@byupw.edu', 'Pelenatita Neiufi', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'Pelenatita Neiufi'),
  ('victorferreira@byupw.edu', 'Victor Lamôni Calado Ferreira', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'Victor Lamôni Calado Ferreira'),
  ('karina_24@churchofjesuschrist.org', 'Karina Andrea Vargas', 'Student Services - Digi Ops', 'staff', 'Digital Operations', 'Karina Vargas'),
  ('mgefrom@byupw.edu', 'Mark Gefrom', 'Student Services - R2S Director', 'director', 'Student Records, Registration, and Support', null),
  ('blester@byupw.edu', 'Brad Lester', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Brad Lester'),
  ('burrell3@byupw.edu', 'Alyssa Burrell', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Alyssa Burrell'),
  ('hbagley@byupw.edu', 'Hilary Bagley', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Hilary Bagley'),
  ('khayes@byupw.edu', 'Kira Hayes', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Kira Hayes'),
  ('msmith@byupw.edu', 'Matthew Smith', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Matthew Smith'),
  ('cwarner@byupw.edu', 'Colby Warner', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Colby Warner'),
  ('karijohnson32@byupw.edu', 'Kari Johnson', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Kari Johnson'),
  ('kim.overdiek@byupw.edu', 'Kim Overdiek', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Kim Overdiek'),
  ('cputnam@byupw.edu', 'Cindi C Putnam', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Cindi C Putnam'),
  ('danielnzago@churchofjesuschrist.org', 'Daniel Zago', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Daniel Zago'),
  ('tbell1@byupw.edu', 'Tyson Bell', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Tyson Bell'),
  ('nchambers@byupw.edu', 'Nikki Jane Chambers', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Nikki Jane Chambers'),
  ('adavidso@byupw.edu', 'Anne E. Owen', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Anne E. Owen'),
  ('angie.holt@byupw.edu', 'Angie Holt', 'Student Services - R2S', 'staff', 'Student Records, Registration, and Support', 'Angie Holt'),
  ('sthomas@byupw.edu', 'Steven K. Thomas', 'Student Services - DOS Director', 'director', 'Dean of Students', null),
  ('aclark@byupw.edu', 'Anne Marie Clark', 'Student Services - DOS', 'staff', 'Dean of Students', 'Anne Marie Clark'),
  ('ana.decastro@byupw.edu', 'Ana De Castro', 'Student Services - DOS', 'staff', 'Dean of Students', 'Ana de Castro'),
  ('helensegalla@churchofjesuschrist.org', 'Helen Reboucas', 'Student Services - DOS', 'staff', 'Dean of Students', 'Helen Segalla de Oliveira Rebouças'),
  ('bentumjy@churchofjesuschrist.org', 'Joseph Bentum', 'Student Services - DOS', 'staff', 'Dean of Students', 'Joseph Bentum'),
  ('kray@byupw.edu', 'Katelyn Ray', 'Student Services - DOS', 'staff', 'Dean of Students', 'Katelyn Ray'),
  ('sandrawurttele@byupw.edu', 'Sandra Wurttele', 'Student Services - DOS', 'staff', 'Dean of Students', 'Sandra Wurttele'),
  ('jswinburne@churchofjesuschrist.org', 'Jess Swinburne', 'Student Services - Executive PM', 'admin', null, null),
  ('mabioye@churchofjesuschrist.org', 'Moses Abioye', 'Student Services - R2S PM', 'admin', 'Student Records, Registration, and Support', null),
  ('oluwapelumi@churchofjesuschrist.org', 'Victor Oluwapelumi Elerunndu', 'Student Services - R2S PM', 'admin', 'Student Records, Registration, and Support', null),
  ('marielapezzali@churchofjesuschrist.org', 'Mariela Gisell Pezzali', 'Student Services - DOS Director', 'director', 'Dean of Students', null),
  ('davidkoomson@churchofjesuschrist.org', 'David De-Graft Koomson', 'Student Services - Digi PM', 'admin', 'Digital Operations', null),
  ('ccrankson@churchofjesuschrist.org', 'Charles Crankson', 'Student Services - E&R PM', 'admin', 'Enrollment & Retention', null),
  ('gillesravelmambou@churchofjesuschrist.org', 'Gilles Ravel Mambou', 'Student Services - Executive PM', 'admin', null, null),
  ('austin@hirespringboard.com', 'Austin', 'Student Services - Springboard', 'partner', null, null),
  ('kathy.villeda@churchofjesuschrist.org', 'Kathy Villeda', 'Student Services - Springboard', 'partner', null, null),
  ('bkusch@ensign.edu', 'Bruce Kusch', 'Partner - Ensign', 'partner', null, null),
  ('tim.sloan@ensign.edu', 'Tim Sloan', 'Partner - Ensign', 'partner', null, null),
  ('alan.young@ensign.edu', 'Alan Young', 'Partner - Ensign', 'partner', null, null),
  ('jon.nichols@ensign.edu', 'Jon Nichols', 'Partner - Ensign', 'partner', null, null),
  ('creitz@ensign.edu', 'Chris Reitz', 'Partner - Ensign', 'partner', null, null),
  ('adam.jacobsmeyer@ensign.edu', 'Adam Jacobsmeyer', 'Partner - Ensign', 'partner', null, null),
  ('david.paulsen@ensign.edu', 'Dave Paulsen', 'Partner - Ensign', 'partner', null, null),
  ('dlingen@ensign.edu', 'Denice Lingen', 'Partner - Ensign', 'partner', null, null),
  ('dmcdougal@ensign.edu', 'Doug McDougal', 'Partner - Ensign', 'partner', null, null),
  ('daniel.rogers@ensign.edu', 'Daniel Rogers', 'Partner - Ensign', 'partner', null, null),
  ('jodi.chowen@ensign.edu', 'Jodi Chowen', 'Partner - Ensign', 'partner', null, null),
  ('joel.galbraith@ensign.edu', 'Joel Galbraith', 'Partner - Ensign', 'partner', null, null),
  ('grayson.layton@ensign.edu', 'Grayson Layton', 'Partner - Ensign', 'partner', null, null),
  ('thomas.mortensen@ensign.edu', 'Tom Mortensen', 'Partner - Ensign', 'partner', null, null),
  ('moana.hansen@ensign.edu', 'Moana Hansen', 'Partner - Ensign', 'partner', null, null),
  ('matthew.smith@ensign.edu', 'Matt Smith', 'Partner - Ensign', 'partner', null, null),
  ('mlythgoe@ensign.edu', 'Maren Lythgoe', 'Partner - Ensign', 'partner', null, null),
  ('egunnell@ensign.edu', 'Erin Gunnell', 'Partner - Ensign', 'partner', null, null),
  ('tiffany.bowcut@ensign.edu', 'Tiffany Bowcut', 'Partner - Ensign', 'partner', null, null),
  ('dbrooksby@ensign.edu', 'David Brooksby', 'Partner - Ensign', 'partner', null, null),
  ('agibbons@ensign.edu', 'Andrew Gibbons', 'Partner - Ensign', 'partner', null, null),
  ('dbutter7@ensign.edu', 'Darren Butterfield', 'Partner - Ensign', 'partner', null, null),
  ('melygalo@ensign.edu', 'Lesly Domgaard', 'Partner - Ensign', 'partner', null, null),
  ('jhardy@ensign.edu', 'Jim Hardy', 'Partner - Ensign', 'partner', null, null),
  ('susan.templeton@ensign.edu', 'Susan Templeton', 'Partner - Ensign', 'partner', null, null),
  ('stefanie.harward@ensign.edu', 'Stefanie Harward', 'Partner - Ensign', 'partner', null, null),
  ('lukejo@ensign.edu', 'Luke McDowell', 'Partner - Ensign', 'partner', null, null),
  ('krawlins@ensign.edu', 'Kirk Rawlins', 'Partner - Ensign', 'partner', null, null),
  ('michael.ray@ensign.edu', 'Mike Ray', 'Partner - Ensign', 'partner', null, null),
  ('peckk@byui.edu', 'Kendall Peck', 'Partner - BYU-I', 'partner', null, null),
  ('brubakers@byui.edu', 'Sam Brubaker', 'Partner - BYU-I', 'partner', null, null),
  ('romrelld@byui.edu', 'Danae Romrell', 'Partner - BYU-I', 'partner', null, null),
  ('baggettb@byui.edu', 'Boyd Baggett', 'Partner - BYU-I', 'partner', null, null),
  ('reneea@byui.edu', 'Amy Renee', 'Partner - BYU-I', 'partner', null, null),
  ('biehlk@byui.edu', 'Kevin Biehl', 'Partner - BYU-I', 'partner', null, null),
  ('rileyh@byui.edu', 'Riley Hall', 'Partner - BYU-I', 'partner', null, null),
  ('arensmeyerl@byui.edu', 'Lauri Arensmeyer', 'Partner - BYU-I', 'partner', null, null),
  ('harrism@byui.edu', 'Mindy Harris', 'Partner - BYU-I', 'partner', null, null),
  ('krumblish@byui.edu', 'Haley Krumblis', 'Partner - BYU-I', 'partner', null, null),
  ('rammelln@byui.edu', 'Nick Rammell', 'Partner - BYU-I', 'partner', null, null),
  ('sleightr@byui.edu', 'Roy Sleight', 'Partner - BYU-I', 'partner', null, null),
  ('cookb@byui.edu', 'Brett Cook', 'Partner - BYU-I', 'partner', null, null),
  ('mcwilliamsj@byui.edu', 'Joe McWilliams', 'Partner - BYU-I', 'partner', null, null),
  ('websters@byui.edu', 'Shane Webster', 'Partner - BYU-I', 'partner', null, null),
  ('gibbsb@byui.edu', 'Bracken Gibbs', 'Partner - BYU-I', 'partner', null, null),
  ('hallje@byui.edu', 'Jeremy Hall', 'Partner - BYU-I', 'partner', null, null),
  ('roachg@byui.edu', 'Greg Roach', 'Partner - BYU-I', 'partner', null, null),
  ('garrettr@byui.edu', 'Rob Garrett', 'Partner - BYU-I', 'partner', null, null),
  ('sannsa@byui.edu', 'Aaron Sanns', 'Partner - BYU-I', 'partner', null, null),
  ('willmorec@byui.edu', 'Candace Willmore', 'Partner - BYU-I', 'partner', null, null),
  ('fryarb@byui.edu', 'Ben Fryar', 'Partner - BYU-I', 'partner', null, null),
  ('lawrencej@byui.edu', 'Jonathon Lawrence', 'Partner - BYU-I', 'partner', null, null),
  ('fayd@byui.edu', 'Derek Fay', 'Partner - BYU-I', 'partner', null, null),
  ('balla@byui.edu', 'Aaron Ball', 'Partner - BYU-I', 'partner', null, null),
  ('meachama@byui.edu', 'Aaron Meacham', 'Partner - BYU-I', 'partner', null, null),
  ('baira@byui.edu', 'Adam Bair', 'Partner - BYU-I', 'partner', null, null),
  ('vorderstrassea@byui.edu', 'Adam Vorderstrasse', 'Partner - BYU-I', 'partner', null, null),
  ('lloyda@byui.edu', 'Adam Lloyd', 'Partner - BYU-I', 'partner', null, null),
  ('albaa@byui.edu', 'Adriana Alba', 'Partner - BYU-I', 'partner', null, null),
  ('schottaa@byui.edu', 'Ainhoa Schott', 'Partner - BYU-I', 'partner', null, null),
  ('kingsforda@byui.edu', 'Amanda Kingsford', 'Partner - BYU-I', 'partner', null, null),
  ('tayloran@byui.edu', 'Anna Taylor', 'Partner - BYU-I', 'partner', null, null),
  ('smithas@byui.edu', 'Ashley Smith', 'Partner - BYU-I', 'partner', null, null),
  ('miguelb@byui.edu', 'Brandie Miguel', 'Partner - BYU-I', 'partner', null, null),
  ('perrenc@byui.edu', 'Camille Perren', 'Partner - BYU-I', 'partner', null, null),
  ('mcdanielc@byui.edu', 'Casey McDaniel', 'Partner - BYU-I', 'partner', null, null),
  ('streeterc@byui.edu', 'Casey Streeter', 'Partner - BYU-I', 'partner', null, null),
  ('wilsonc@byui.edu', 'Chris Wilson', 'Partner - BYU-I', 'partner', null, null),
  ('goodwillc@byui.edu', 'Cindy Goodwill', 'Partner - BYU-I', 'partner', null, null),
  ('wolfc@byui.edu', 'CJ Wolf', 'Partner - BYU-I', 'partner', null, null),
  ('ratcliffeg@byui.edu', 'Cole Ratcliffe', 'Partner - BYU-I', 'partner', null, null),
  ('lindstromc@byui.edu', 'Craig Lindstrom', 'Partner - BYU-I', 'partner', null, null),
  ('henriecu@byui.edu', 'Curtis Henrie', 'Partner - BYU-I', 'partner', null, null),
  ('mcintyree@byui.edu', 'Estefania McIntyre', 'Partner - BYU-I', 'partner', null, null),
  ('carterh@byui.edu', 'Heather Carter', 'Partner - BYU-I', 'partner', null, null),
  ('eganh@byui.edu', 'Heidi Egan', 'Partner - BYU-I', 'partner', null, null),
  ('romneyri@byui.edu', 'Jake Romney', 'Partner - BYU-I', 'partner', null, null),
  ('findlayj@byui.edu', 'James Findlay', 'Partner - BYU-I', 'partner', null, null),
  ('pattersonj@byui.edu', 'James Patterson', 'Partner - BYU-I', 'partner', null, null),
  ('blazzardj@byui.edu', 'Jason Blazzard', 'Partner - BYU-I', 'partner', null, null),
  ('hunterj@byui.edu', 'Jennifer Hunter', 'Partner - BYU-I', 'partner', null, null),
  ('yeckj@byui.edu', 'Jenny Yeck', 'Partner - BYU-I', 'partner', null, null),
  ('fackrellj@byui.edu', 'Jon Fackrell', 'Partner - BYU-I', 'partner', null, null),
  ('quilterj@byui.edu', 'Julie Quilter', 'Partner - BYU-I', 'partner', null, null),
  ('thuesonki@byui.edu', 'Kim Thueson', 'Partner - BYU-I', 'partner', null, null),
  ('silval@byui.edu', 'Luisa Silva', 'Partner - BYU-I', 'partner', null, null),
  ('durtschil@byui.edu', 'Lynn Durtschi', 'Partner - BYU-I', 'partner', null, null),
  ('landonl@byui.edu', 'Lynne Landon', 'Partner - BYU-I', 'partner', null, null),
  ('despainm@byui.edu', 'Marci Despain', 'Partner - BYU-I', 'partner', null, null),
  ('taylormat@byui.edu', 'Matthew Taylor', 'Partner - BYU-I', 'partner', null, null),
  ('kennellyme@byui.edu', 'Melanie Kennelly', 'Partner - BYU-I', 'partner', null, null),
  ('everettm@byui.edu', 'Melissa Everett', 'Partner - BYU-I', 'partner', null, null),
  ('meekern@byui.edu', 'Nathan Meeker', 'Partner - BYU-I', 'partner', null, null),
  ('godoyp@byui.edu', 'Patricia Godoy', 'Partner - BYU-I', 'partner', null, null),
  ('blairp@byui.edu', 'Peter Blair', 'Partner - BYU-I', 'partner', null, null),
  ('williamsp@byui.edu', 'Peter Williams', 'Partner - BYU-I', 'partner', null, null),
  ('briggsq@byui.edu', 'Quinn Briggs', 'Partner - BYU-I', 'partner', null, null),
  ('gomeshenriquesr@byui.edu', 'Ricardo Henriques', 'Partner - BYU-I', 'partner', null, null),
  ('robinsse@byui.edu', 'Selena Robins', 'Partner - BYU-I', 'partner', null, null),
  ('piress@byui.edu', 'Sergio Pires', 'Partner - BYU-I', 'partner', null, null),
  ('wasdens@byui.edu', 'Shane Wasden', 'Partner - BYU-I', 'partner', null, null),
  ('adamss@byui.edu', 'Steve Adams', 'Partner - BYU-I', 'partner', null, null),
  ('pizziranit@byui.edu', 'Thiago Pizzirani', 'Partner - BYU-I', 'partner', null, null),
  ('willburnt@byui.edu', 'Tracy Willburn', 'Partner - BYU-I', 'partner', null, null),
  ('bashton@churchofjesuschrist.org', 'Brian K Ashton', 'Partner - Leadership', 'partner', null, null),
  ('nrelken@byupw.edu', 'Nathan A. Relken', 'Partner - Leadership', 'partner', null, null),
  ('bhales@byupw.edu', 'Brad Hales', 'Partner - Leadership', 'partner', null, null),
  ('sandrus@byupw.edu', 'Sam Andrus', 'Partner - General', 'partner', null, null),
  ('bbai@byupw.edu', 'Brannon Bai', 'Partner - General', 'partner', null, null),
  ('jbalderree@byupw.edu', 'John David Balderree', 'Partner - General', 'partner', null, null),
  ('aaron.ball@byupw.edu', 'Aaron Ball', 'Partner - General', 'partner', null, null),
  ('zbatty@byupw.edu', 'Zach Batty', 'Partner - General', 'partner', null, null),
  ('ebiddulph@byupw.edu', 'Easton M. Biddulph', 'Partner - General', 'partner', null, null),
  ('jbrems@byupw.edu', 'Jodie Brems', 'Partner - General', 'partner', null, null),
  ('bbridges@byupw.edu', 'B.J. Bridges', 'Partner - General', 'partner', null, null),
  ('cbristol@byupw.edu', 'Millie Bristol', 'Partner - General', 'partner', null, null),
  ('pcannon@byupw.edu', 'Peter Cannon', 'Partner - General', 'partner', null, null),
  ('acargal@byupw.edu', 'Andy Cargal', 'Partner - General', 'partner', null, null),
  ('drcarstens@byupw.edu', 'Ryan Carstens', 'Partner - General', 'partner', null, null),
  ('gchard@byupw.edu', 'Gabriel Chard', 'Partner - General', 'partner', null, null),
  ('jcheney@byupw.edu', 'Juston Cheney', 'Partner - General', 'partner', null, null),
  ('kchristensen@byupw.edu', 'Karlie Christensen', 'Partner - General', 'partner', null, null),
  ('dchristensen@byupw.edu', 'David Christensen', 'Partner - General', 'partner', null, null),
  ('tanise@byupw.edu', 'Tanise Chung-Hoon', 'Partner - General', 'partner', null, null),
  ('lconrad@byupw.edu', 'Lauren Conrad', 'Partner - General', 'partner', null, null),
  ('mdayley@byupw.edu', 'Matt Dayley', 'Partner - General', 'partner', null, null),
  ('eeames@byupw.edu', 'Eric Eames', 'Partner - General', 'partner', null, null),
  ('popol.elonda@byupw.edu', 'Yomete Popol Elonda', 'Partner - General', 'partner', null, null),
  ('sarah.excell@byupw.edu', 'Sarah Excell', 'Partner - General', 'partner', null, null),
  ('dfahringer@byupw.edu', 'Daisey Fahringer', 'Partner - General', 'partner', null, null),
  ('christy.flater@byupw.edu', 'Christy Flater', 'Partner - General', 'partner', null, null),
  ('bfogelberg@byupw.edu', 'Brian T. Fogelberg', 'Partner - General', 'partner', null, null),
  ('igavarret@byupw.edu', 'Ivan Gavarret', 'Partner - General', 'partner', null, null),
  ('lgrier@byupw.edu', 'Lauri Grier', 'Partner - General', 'partner', null, null),
  ('jgriffith@byupw.edu', 'J.D. Griffith', 'Partner - General', 'partner', null, null),
  ('sguimaraes@byupw.edu', 'Silvio Guimarães', 'Partner - General', 'partner', null, null),
  ('lhall@byupw.edu', 'Lacey Hall', 'Partner - General', 'partner', null, null),
  ('danhan@byupw.edu', 'Dana Hansen', 'Partner - General', 'partner', null, null),
  ('dharperjr@byupw.edu', 'Dale Harper', 'Partner - General', 'partner', null, null),
  ('ehjorten@byupw.edu', 'Erik D. Hjorten', 'Partner - General', 'partner', null, null),
  ('jhobbs@byupw.edu', 'Jeff Hobbs', 'Partner - General', 'partner', null, null),
  ('sjackson@byupw.edu', 'Sarah Jackson', 'Partner - General', 'partner', null, null),
  ('cjohnson@byupw.edu', 'Cary Johnson', 'Partner - General', 'partner', null, null),
  ('mjouttenus@byupw.edu', 'MJ Jouttenus', 'Partner - General', 'partner', null, null),
  ('ekarl@byupw.edu', 'Eric Branden Karl', 'Partner - General', 'partner', null, null),
  ('cleaming@byupw.edu', 'Cindy Leaming', 'Partner - General', 'partner', null, null),
  ('clivu@byupw.edu', 'Clovis S. Livu', 'Partner - General', 'partner', null, null),
  ('ploureiro@byupw.edu', 'Paulo Loureiro', 'Partner - General', 'partner', null, null),
  ('brandon.luke@byupw.edu', 'Brandon Luke', 'Partner - General', 'partner', null, null),
  ('vmachado@byupw.edu', 'Vanessa Machado', 'Partner - General', 'partner', null, null),
  ('tmakasi@byupw.edu', 'Tasara Makasi', 'Partner - General', 'partner', null, null),
  ('maughanm@byupw.edu', 'Matthew Maughan', 'Partner - General', 'partner', null, null),
  ('tminer@byupw.edu', 'R. Todd Miner', 'Partner - General', 'partner', null, null),
  ('bryan.miranda@byupw.edu', 'Bryan Miranda', 'Partner - General', 'partner', null, null),
  ('bmoffitt@byupw.edu', 'Briton Moffitt', 'Partner - General', 'partner', null, null),
  ('jmorrin@byupw.edu', 'Jeff Morrin', 'Partner - General', 'partner', null, null),
  ('cneth@byupw.edu', 'Chad Neth', 'Partner - General', 'partner', null, null),
  ('ninsiimag@byupw.edu', 'Grace Ninsiima', 'Partner - General', 'partner', null, null),
  ('sosmani@byupw.edu', 'Sead Osmani', 'Partner - General', 'partner', null, null),
  ('krysta.pace@byupw.edu', 'Krysta Pace', 'Partner - General', 'partner', null, null),
  ('ppickett@byupw.edu', 'Paul Pickett', 'Partner - General', 'partner', null, null),
  ('mpineda@byupw.edu', 'Moroni Pineda', 'Partner - General', 'partner', null, null),
  ('jpowell@byupw.edu', 'Johanna Powell', 'Partner - General', 'partner', null, null),
  ('kreilly@byupw.edu', 'Kieran Reilly', 'Partner - General', 'partner', null, null),
  ('mattrichards@byupw.edu', 'Matt Richards', 'Partner - General', 'partner', null, null),
  ('jduckworth@byupw.edu', 'Jessica Robison', 'Partner - General', 'partner', null, null),
  ('krussell@byupw.edu', 'Kimball Chase Russell', 'Partner - General', 'partner', null, null),
  ('nsanders@byupw.edu', 'Nathan Craig Sanders', 'Partner - General', 'partner', null, null),
  ('pscherbel@byupw.edu', 'Paul Scherbel', 'Partner - General', 'partner', null, null),
  ('bschumann@churchofjesuschrist.org', 'Brent Schumann', 'Partner - General', 'partner', null, null),
  ('darby.simon@byupw.edu', 'Darby Elizabeth Simon', 'Partner - General', 'partner', null, null),
  ('klfoulger@byupw.edu', 'Kristen Southall', 'Partner - General', 'partner', null, null),
  ('rspencer@byupw.edu', 'Ryan Spencer', 'Partner - General', 'partner', null, null),
  ('bsua@byupw.edu', 'Breanne Su''a', 'Partner - General', 'partner', null, null),
  ('btaylor@byupw.edu', 'Brig Taylor', 'Partner - General', 'partner', null, null),
  ('ftorresa@byupw.edu', 'Francisco Torres Archenti', 'Partner - General', 'partner', null, null),
  ('ktripodi@byupw.edu', 'Krista Tripodi', 'Partner - General', 'partner', null, null),
  ('vtukuafu@byupw.edu', 'Verna Tukuafu', 'Partner - General', 'partner', null, null),
  ('hugege@byupw.edu', 'Heather Ugege', 'Partner - General', 'partner', null, null),
  ('vukorebi@byupw.edu', 'Victor B. Ukorebi', 'Partner - General', 'partner', null, null),
  ('kelly.valle@byupw.edu', 'Kelly Valle', 'Partner - General', 'partner', null, null),
  ('dwaite@byupw.edu', 'Dustin Waite', 'Partner - General', 'partner', null, null),
  ('kwalker@byupw.edu', 'Kami Walker', 'Partner - General', 'partner', null, null),
  ('jacobleewalters@byupw.edu', 'Jacob Walters', 'Partner - General', 'partner', null, null),
  ('webbdall@byupw.edu', 'Dallin Webb', 'Partner - General', 'partner', null, null),
  ('lwilliams@byupw.edu', 'Lindsey Williams', 'Partner - General', 'partner', null, null),
  ('julieredd@byupw.edu', 'Julie Redd', 'Partner - General', 'partner', null, null),
  ('gsintay@byupw.edu', 'Gary Sintay', 'Partner - General', 'partner', null, null),
  ('alan.hansen@byupw.edu', 'Alan Drew Hansen', 'Partner - General', 'partner', null, null),
  ('kosakhe@churchofjesuschrist.org', 'Henry Kosak', 'Partner - General', 'partner', null, null),
  ('hmcdonald@byupw.edu', 'Heather McDonald', 'Partner - General', 'partner', null, null),
  ('amottola@byupw.edu', 'Adriano Mottola', 'Partner - General', 'partner', null, null),
  ('mstevens@byupw.edu', 'Makenzie Lee Stevens', 'Partner - General', 'partner', null, null),
  ('nafele@byupw.edu', 'Naomi Afele', 'Partner - General', 'partner', null, null),
  ('ricardomaingon@byupw.edu', 'Ricardo Antonio Maingon Andrade', 'Partner - General', 'partner', null, null),
  ('jabrams@byupw.edu', 'Jordan Abrams', 'Partner - General', 'partner', null, null),
  ('tpotter@byupw.edu', 'Trek Potter', 'Partner - General', 'partner', null, null),
  ('jsantos@byupw.edu', 'Jair Santos', 'Partner - General', 'partner', null, null),
  ('kballard@byupw.edu', 'Kevin Ballard', 'Partner - General', 'partner', null, null),
  ('scunningham@byupw.edu', 'Spencer Cunningham', 'Partner - General', 'partner', null, null),
  ('bschumann@byupw.edu', 'Brent Schumann', 'Partner - General', 'partner', null, null),
  ('michael.matthews@churchofjesuschrist.org', 'Michael Matthews', 'Partner - S&I', 'partner', null, null),
  ('amanda.thomas@churchofjesuschrist.org', 'Mandy Thomas', 'Partner - S&I', 'partner', null, null),
  ('brad.barson@churchofjesuschrist.org', 'Brad Barson', 'Partner - S&I', 'partner', null, null),
  ('matthew.langton@churchofjesuschrist.org', 'Matthew Brenton Langton', 'Partner - S&I', 'partner', null, null),
  ('loertscherbt@churchofjesuschrist.org', 'Benjamin T. Loertscher', 'Partner - S&I', 'partner', null, null)
-- Deliberately does NOT overwrite role or scope on an existing row.
--
-- The spreadsheet seeds this table; the Access sheet in the PM Hub owns it
-- afterwards. A category in the spreadsheet is a job title, not an access
-- level, and reading one off the other gets it wrong: Mariela Pezzali is
-- filed as "DOS Director" but is a project manager, so she needs admin.
-- That was corrected by hand, and re-running this file must not undo it.
--
-- Only the reference fields refresh. To reset somebody deliberately, change
-- them in the Access sheet.
on conflict (email) do update set
  full_name = excluded.full_name,
  category  = excluded.category;

commit;

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
