-- ═══════════ PATCH 14 — REMOVING A COLUMN A PM ADDED ═══════════
--
-- patch-11 let a PM add a column and said plainly that nothing there could take
-- one away. This adds that, and draws a hard line through the middle of it.
--
-- ── Two kinds of column, and only one of them may go ──────────────────────
--
-- A column a PM added through the Hub is theirs: it exists because they asked
-- for it, nothing else reads it, and dropping it costs nothing but the data in
-- it. `pm_columns` is the record of exactly which columns those are.
--
-- Every other column is load-bearing. `employees.name` feeds the directory, the
-- org chart and the KPI scorecard's join; `kpis.band_green` decides what colour
-- a KPI shows on the public hub; `okrs.progress` draws the progress bars. The
-- hub's views select them by name, so dropping one does not degrade the site,
-- it breaks it — and it breaks it for everyone, from a button in an editor's
-- browser, with no obvious way back.
--
-- So this function refuses anything it did not create. The Hub offers to hide
-- such a column instead, which is reversible, local to the person who chose it,
-- and almost always what was actually wanted: fewer columns on screen.
--
-- The structural columns of a created sheet — id, sort_order, the timestamps —
-- are refused too. They are what makes the row addressable and auditable.
--
-- Run after patch-13. Safe to re-run.

begin;

create or replace function public.pm_drop_column(
  p_sheet_key text,
  p_table     text,
  p_col_key   text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor    text := public.pm_current_editor();
  reserved constant text[] := array['id', 'sort_order', 'created_at',
                                    'updated_at', 'updated_by'];
begin
  if actor is null then
    raise exception 'Only provisioned editors may change a sheet.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_col_key !~ '^[a-z][a-z0-9_]*$' or p_table !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'Invalid identifier' using errcode = 'invalid_parameter_value';
  end if;

  if p_col_key = any (reserved) then
    raise exception
      'Column "%" is part of how every row is identified and audited, and cannot be removed.',
      p_col_key using errcode = 'insufficient_privilege';
  end if;

  -- The gate. Being registered in pm_columns is the proof that this mechanism
  -- created the column; anything else belongs to the schema and stays.
  if not exists (
    select 1 from public.pm_columns c
     where c.sheet_key = p_sheet_key and c.col_key = p_col_key
  ) then
    raise exception
      'Column "%" is part of the original sheet and is read elsewhere in the system, so it cannot be dropped. Hide it instead.',
      p_col_key using errcode = 'insufficient_privilege';
  end if;

  execute format('alter table public.%I drop column if exists %I', p_table, p_col_key);
  delete from public.pm_columns
        where sheet_key = p_sheet_key and col_key = p_col_key;
  return true;
end;
$$;

revoke all on function public.pm_drop_column(text, text, text) from public, anon;
grant execute on function public.pm_drop_column(text, text, text) to authenticated;

commit;
