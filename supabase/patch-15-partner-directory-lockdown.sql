-- ═══════════ PATCH 15 — THE DIRECTORY, CONFIRMED SHUT TO PARTNERS ═══════════
--
-- access-control.sql already carries a policy restricting `employees` and
-- `student_employees` SELECT to staff/director/admin (search that file for
-- "The directory: staff and above see everyone"). This patch does not change
-- the rule — it re-asserts the exact same policy, as its own small, numbered,
-- easy-to-verify step, because two different files in this repo have defined
-- a SELECT policy on these same two tables at two different times:
--
--   schema.sql        (2026-08-06) — `using (true)`, open to every role
--   access-control.sql (2026-08-13) — `using (hub_role() in (staff, director,
--                                       admin))`, partners refused
--
-- Both are "safe to re-run" files, meaning either could plausibly be re-run
-- after the other during later maintenance and silently put the table back
-- in the wrong state — `create policy` errors if a policy of that name
-- already exists, so whichever ran *second* is what is actually live, and
-- there is no record in this repo of which that was. Re-running this patch
-- settles it regardless of that history: whatever is live beforehand, the
-- restrictive rule is what's live after.
--
-- Paired with the client-side gates added the same day — the Directory link
-- now leaves the navbar and footer for anyone outside Student Services
-- (js/shared.js, gateDirectoryLinks()), the org-chart page's Directory card
-- stays hidden for them (org-chart/js/related-tiles.js), and the directory
-- page itself shows a wall instead of an empty table (directory/js/dir-gate.js).
-- None of that is the security boundary. This is. A partner who opens
-- /directory/index.html directly, or queries v_hub_directory over the REST
-- API directly, is refused by this policy regardless of what the page does.
--
-- Safe to re-run.

begin;

-- ── 1. employees & student_employees: staff and above only ────────────────
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

-- ── 2. v_hub_directory: drop the anon grant ────────────────────────────────
-- The view is security_invoker (schema.sql), so RLS on the tables above was
-- always the real gate even for an anon caller — an unauthenticated request
-- cannot execute hub_role() (revoked from anon in access-control.sql) and the
-- policy evaluation fails closed rather than returning rows. So this was
-- never a live hole. It is still the wrong grant to leave sitting in the
-- schema: nothing about the directory should be reachable by a request that
-- never signed in, and removing it means a stray `grant ... to anon` added
-- to this view later has one less permissive precedent to point at.
revoke select on public.v_hub_directory from anon;
grant select on public.v_hub_directory to authenticated;

commit;

-- ── what you should see ───────────────────────────────────────────────────
-- The policy, confirmed restrictive:
select tablename, policyname, qual
  from pg_policies
 where schemaname = 'public'
   and tablename in ('employees', 'student_employees')
   and cmd = 'SELECT';

-- Nobody unauthenticated can read the view any longer:
select grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'v_hub_directory';
