-- ═══════════ PATCH 13 — ONLY THE SEVEN MAY CREATE AN ACCOUNT ═══════════
--
-- Until now anyone could create an account on this project. Verified rather
-- than assumed: a POST to /auth/v1/signup with an unprovisioned address
-- returned a real, confirmed user.
--
-- Nothing was exposed by it. The PM Hub refuses to open for anyone outside
-- `pm-editors.js`, and row-level security refuses every write from anyone
-- outside `allowed_editors`, so such an account could see exactly what the
-- public hub already shows and change nothing. But an account that should not
-- exist is still a door standing open, and "they cannot do anything once
-- inside" is a weaker position than "they cannot get in".
--
-- The fix is a trigger on auth.users rather than switching signups off
-- wholesale. Turning them off would close this hole and take the seven PMs'
-- ability to set their own password with it — which would mean creating and
-- distributing seven passwords by hand, and no mail to distribute them with.
-- This keeps self-service for the people who should have it and refuses
-- everyone else at the point of creation.
--
-- `allowed_editors` therefore becomes the single list that governs everything:
-- who may sign up, who may sign in, and who may write. Adding a PM is one
-- insert there plus their address in pm/js/pm-editors.js.
--
-- Run after patch-12. Safe to re-run.

begin;

-- ── 1. refuse an account for anyone not on the list ───────────────────────
create or replace function public.enforce_provisioned_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.allowed_editors e
     where lower(e.email) = lower(new.email)
  ) then
    return new;
  end if;

  -- Worth knowing: GoTrue does not pass this text on. Whatever a trigger
  -- raises, the client is told "Database error saving new user" — so this
  -- message is for whoever reads the Postgres logs, and pm/js/shell.js
  -- translates the generic one into something a PM can act on.
  raise exception
    'This address is not provisioned for the Student Services PM Hub. Contact Ben Packer or Jess Swinburne.'
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists enforce_provisioned_signup on auth.users;
create trigger enforce_provisioned_signup
  before insert on auth.users
  for each row execute function public.enforce_provisioned_signup();

-- ── 2. clear out anyone who already got in ────────────────────────────────
-- Includes the probe account this check created. Sessions and identities are
-- removed with the user by the foreign keys Supabase already has in place.
--
-- Look at this list before committing if you would rather review it first:
--
--   select id, email, created_at from auth.users
--    where lower(email) not in (select lower(email) from public.allowed_editors);
delete from auth.users
 where lower(email) not in (select lower(email) from public.allowed_editors);

commit;

-- ── what you should see ───────────────────────────────────────────────────
-- Every remaining account belongs to a provisioned editor, and the count never
-- exceeds the size of the list.
select
  (select count(*) from auth.users)                                as accounts,
  (select count(*) from public.allowed_editors)                    as provisioned,
  (select count(*) from auth.users u
     where lower(u.email) not in
           (select lower(e.email) from public.allowed_editors e))  as unprovisioned;
