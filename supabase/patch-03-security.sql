-- ═══════════ PATCH 03 — SECURITY HARDENING ═══════════
--
-- Clears every advisory Supabase raised. Each block says what was wrong and why
-- the fix is the right one — "the linter said so" is not a reason to change a
-- security boundary.
--
-- The theme: the first schema leaned on a SECURITY DEFINER helper, is_editor(),
-- which every client role then had to be allowed to run. That is backwards. The
-- editor check is a plain question — "is my email in allowed_editors?" — that a
-- signed-in user can answer for themselves, so the policies now ask it directly
-- and the privileged function goes away.
--
-- Run after patch-02. Safe to re-run.

begin;

alter table public.change_log add column if not exists row_key text;

-- ── 1. SECURITY DEFINER views (Critical) ───────────────────────────────────
-- Postgres runs a view with its *owner's* rights unless told otherwise, so these
-- views read the tables as the owner and bypass row-level security. Today every
-- table allows public SELECT so nothing leaked — but the day one gains a
-- restrictive policy, these views would quietly ignore it. `security_invoker`
-- makes a view read with the caller's rights, which is what anyone reading this
-- schema would assume it already did.
alter view public.v_hub_directory set (security_invoker = on);
alter view public.v_hub_okrs      set (security_invoker = on);
alter view public.v_hub_kpis      set (security_invoker = on);

-- ── 2. Write policies ask the question directly ────────────────────────────
-- No function call, so nothing privileged needs to be executable by clients.
-- `allowed_editors` is readable by signed-in users, so the EXISTS resolves for
-- exactly the people it should and returns nothing for everyone else.
--
-- Each predicate is wrapped in a scalar sub-select. Written bare, it would be
-- re-evaluated per row scanned; as a sub-select Postgres computes it once per
-- query as an InitPlan. That is the "Auth RLS Initialization Plan" advisory.
do $$
declare
  t text;
  editor_check constant text :=
    '(select exists (
        select 1 from public.allowed_editors e
        where lower(e.email) = lower(coalesce((select auth.jwt() ->> ''email''), ''''))
      ))';
begin
  foreach t in array array['okrs', 'employees', 'student_employees',
                           'org_chart_nodes', 'kpis', 'student_contractor_counts']
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('drop policy if exists "%1$s insert" on public.%1$s;
      create policy "%1$s insert" on public.%1$s
        for insert with check (%2$s);', t, editor_check);

    execute format('drop policy if exists "%1$s update" on public.%1$s;
      create policy "%1$s update" on public.%1$s
        for update using (%2$s) with check (%2$s);', t, editor_check);

    execute format('drop policy if exists "%1$s delete" on public.%1$s;
      create policy "%1$s delete" on public.%1$s
        for delete using (%2$s);', t, editor_check);

    -- reads stay open; the hub is a static site holding only the anon key
    execute format('drop policy if exists "%1$s read" on public.%1$s;
      create policy "%1$s read" on public.%1$s for select using (true);', t);
  end loop;
end;
$$;

drop policy if exists "editors readable by signed-in users" on public.allowed_editors;
create policy "editors readable by signed-in users" on public.allowed_editors
  for select using ((select auth.role()) = 'authenticated');

drop policy if exists "change log readable by editors" on public.change_log;
create policy "change log readable by editors" on public.change_log
  for select using ((select exists (
    select 1 from public.allowed_editors e
    where lower(e.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )));

-- ── 3. Retire is_editor() ──────────────────────────────────────────────────
-- The loop above rewrote the policies it knows by name. Earlier patches created
-- some under different names — patch-02 called its three "scc insert/update/
-- delete" — and those still reference the function, so dropping it outright
-- fails on the dependency. Find anything still pointing at it and clear it out
-- first; every table it could belong to has just been given a correct policy.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%is_editor%'
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
    raise notice 'dropped legacy policy "%" on %', r.policyname, r.tablename;
  end loop;
end;
$$;

-- A SECURITY DEFINER function that every role may execute is a standing
-- invitation; the best version of it is none.
drop function if exists public.is_editor();

-- ── 4. Trigger functions: pinned path, no public EXECUTE ───────────────────
-- A SECURITY DEFINER function without a pinned search_path can be steered into
-- calling an attacker's same-named function by putting a schema earlier on the
-- path. These two also had EXECUTE granted to PUBLIC by default, which nobody
-- needs: Postgres checks that privilege when the trigger is *created*, not when
-- it fires, so revoking now leaves the triggers working.
create or replace function public.touch_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end;
$$;

create or replace function public.record_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor  text := coalesce(auth.jwt() ->> 'email', 'system');
  rec    jsonb;
  prev   jsonb;
  pk_col text;
  rid    bigint;
  rkey   text;
begin
  if tg_op = 'DELETE' then
    rec := to_jsonb(old);
  else
    rec := to_jsonb(new);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    prev := to_jsonb(old);
  end if;

  -- a no-op save is not worth a log line
  if tg_op = 'UPDATE'
     and prev - 'updated_at' - 'updated_by' = rec - 'updated_at' - 'updated_by' then
    return new;
  end if;

  -- whatever this table calls its primary key
  select a.attname into pk_col
    from pg_index i
    join pg_attribute a
      on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
   where i.indrelid = tg_relid and i.indisprimary
   order by a.attnum
   limit 1;

  if pk_col is not null then
    rkey := rec ->> pk_col;
    if jsonb_typeof(rec -> pk_col) = 'number' then
      rid := (rec ->> pk_col)::bigint;
    end if;
  end if;

  if tg_op = 'DELETE' then
    insert into public.change_log (table_name, row_id, row_key, action, before_data, changed_by)
    values (tg_table_name, rid, rkey, 'DELETE', prev, actor);
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.change_log (table_name, row_id, row_key, action, before_data, after_data, changed_by)
    values (tg_table_name, rid, rkey, 'UPDATE', prev, rec, actor);
    return new;
  else
    insert into public.change_log (table_name, row_id, row_key, action, after_data, changed_by)
    values (tg_table_name, rid, rkey, 'INSERT', rec, actor);
    return new;
  end if;
end;
$$;

revoke all on function public.touch_row()     from public, anon, authenticated;
revoke all on function public.record_change() from public, anon, authenticated;

-- ── 5. rls_auto_enable() ───────────────────────────────────────────────────
-- Not part of this schema — it arrived with something else. Left in place in
-- case an event trigger depends on it, but no client role should be able to
-- call it. Drop it once you have confirmed nothing uses it.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
    raise notice 'rls_auto_enable(): EXECUTE revoked from client roles.';
  end if;
end;
$$;

-- ── 6. The audit trail is append-only ──────────────────────────────────────
-- change_log is written by triggers running as the table owner, so no client
-- role needs to write it. Without this an editor could rewrite the record of
-- what they did.
revoke insert, update, delete on public.change_log from anon, authenticated;

commit;
