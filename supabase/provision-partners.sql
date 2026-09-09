-- ═══════════════════════════════════════════════════════════════════════════
--  PROVISION NINETEEN PEOPLE AS PARTNERS — THE ONES NOT ALREADY PROVISIONED
--
--  A partner sees the organisation and each department at a glance: outcome
--  health, departmental rollups, the org chart. No named individuals, no
--  directory, no individual KPIs. That is enforced by row-level security, not
--  by the pages, so this row is the whole of what they get.
--
--  ── Two things this is careful about ──
--
--  1. It never changes anybody who is already here.
--
--     The insert is guarded by a NOT EXISTS on the address, so a row that is
--     already there stays exactly as it is, whatever role it carries.
--
--     bpacker@byupw.edu was on the list given and is `admin` — the VP. He is
--     left out of the insert altogether rather than relying on that guard to
--     skip him: the guard is correct, but a file that cannot reach his row at
--     all is a stronger promise than one that chooses not to. He is still in
--     the check below, where "admin / already there" beside the new partners
--     is the confirmation nothing happened to him.
--
--  2. It cannot create a second row for the same person.
--
--     `email` is the primary key and it is text, so 'EKarl@byupw.edu' and
--     'ekarl@byupw.edu' are two different keys. `on conflict (email)` would
--     not catch that pair, and two rows for one person is worse than none:
--     hub_role() matches on lower(email) and hub_me() takes `limit 1`, so
--     which role that person gets would depend on which row came back first.
--
--     So every address is lowered on the way in, and the guard compares
--     lower() to lower() — the same comparison hub_role() itself makes.
--
--  ── full_name ──
--
--  Left null for anyone new. It is a label for the PM Hub's Access book, and
--  inventing one from the local part of an email address would put a name on
--  a person that nobody chose. Fill them in there, where whoever knows them
--  can type them.
--
--  Safe to re-run: a second run inserts nothing.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.hub_access (email, category, role, active)
select lower(btrim(t.addr)), 'Partner - General', 'partner', true
  from unnest(array[
    'bashton@churchofjesuschrist.org',
    'drcarstens@byupw.edu',
    'tanise@byupw.edu',
    'lgrier@byupw.edu',
    'jgriffith@byupw.edu',
    'EKarl@byupw.edu',
    'Matthew.Langton@churchofjesuschrist.org',
    'tminer@byupw.edu',
    'jmorrin@byupw.edu',
    'peckk@byui.edu',
    'petersonsn@byupw.edu',
    'nrelken@byupw.edu',
    'tim.sloan@ensign.edu',
    'alan.young@ensign.edu',
    'jwilson@ChurchofJesusChrist.org',
    'heathabradley@ChurchofJesusChrist.org',
    'lwilliams@byupw.edu',
    'bhales@byupw.edu'
  ]) as t(addr)
 where not exists (
   select 1 from public.hub_access h
    where lower(h.email) = lower(btrim(t.addr))
 );


-- ── check it ───────────────────────────────────────────────────────────────
-- All nineteen, with what each one actually has. `was_already_there` says
-- whether this file created the row or found it. Ben should read admin and
-- "already there"; anybody reading partner and "added now" is new.
select lower(btrim(t.addr))                     as address,
       h.full_name,
       h.role,
       h.active,
       case when h.created_at < now() - interval '1 minute'
            then 'already there' else 'added now' end   as was_already_there
  from unnest(array[
    'bashton@churchofjesuschrist.org','drcarstens@byupw.edu','tanise@byupw.edu',
    'lgrier@byupw.edu','jgriffith@byupw.edu','EKarl@byupw.edu',
    'Matthew.Langton@churchofjesuschrist.org','tminer@byupw.edu','jmorrin@byupw.edu',
    'bpacker@byupw.edu','peckk@byui.edu','petersonsn@byupw.edu','nrelken@byupw.edu',
    'tim.sloan@ensign.edu','alan.young@ensign.edu','jwilson@ChurchofJesusChrist.org',
    'heathabradley@ChurchofJesusChrist.org','lwilliams@byupw.edu','bhales@byupw.edu'
  ]) as t(addr)
  left join public.hub_access h on lower(h.email) = lower(btrim(t.addr))
 order by h.role nulls first, address;

-- Nobody should appear twice under two spellings. Expect no rows.
select lower(email) as address, count(*) as rows_for_this_person
  from public.hub_access
 group by lower(email)
having count(*) > 1;
