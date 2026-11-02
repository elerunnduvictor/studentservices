-- ═══════════════════════════════════════════════════════════════════════════
--  CAP GUIDE ROUND 2: ROLLBACK (2026-10-28)
--
--  Undoes 2026-10-28-cap-guide-round2.sql. In one transaction:
--    1. Stops, changing nothing, if the two backup tables are not there.
--    2. Replaces the current rows of cap_guide_sections and cap_guide_items
--       with the backup copies, keeping their original ids, timestamps and
--       updated_by, and resets both id sequences past the restored ids.
--    3. Restores the old kind check (paragraph, list_item) and drops the two
--       new columns (cap_guide_sections.date_label, cap_guide_items.title).
--
--  Any edit made to the guide after the migration, in the PM Hub or anywhere
--  else, is lost. change_log keeps a record of it (the audit triggers log the
--  deletes and inserts this file makes, with changed_by = 'system').
--
--  Left alone: the RLS policies, the audit triggers, and the two backup
--  tables, which stay in place (RLS on, no policies) until someone drops
--  them by hand:
--      drop table public.cap_guide_items_bak_20261028;
--      drop table public.cap_guide_sections_bak_20261028;
--
--  Deploy the old cap-guide/ page back at the same time: the new page reads
--  the two columns this file drops.
--
--  Safe to re-run while the backup tables exist: each run ends in the same
--  state.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Guard ────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.cap_guide_sections_bak_20261028') is null
     or to_regclass('public.cap_guide_items_bak_20261028') is null then
    raise exception 'Backup tables not found. Nothing was changed.';
  end if;
  if not exists (select 1 from public.cap_guide_sections_bak_20261028) then
    raise exception 'cap_guide_sections_bak_20261028 is empty. Nothing was changed.';
  end if;
end;
$$;

-- ── 2. Rows ─────────────────────────────────────────────────────────────────
delete from public.cap_guide_items;
delete from public.cap_guide_sections;

insert into public.cap_guide_sections
  (id, audience, sort_order, section_key, title, intro, created_at, updated_at, updated_by)
overriding system value
select id, audience, sort_order, section_key, title, intro, created_at, updated_at, updated_by
from public.cap_guide_sections_bak_20261028;

insert into public.cap_guide_items
  (id, section_id, sort_order, indent, kind, body, link_label, link_url, created_at, updated_at, updated_by)
overriding system value
select id, section_id, sort_order, indent, kind, body, link_label, link_url, created_at, updated_at, updated_by
from public.cap_guide_items_bak_20261028;

select setval(pg_get_serial_sequence('public.cap_guide_sections', 'id'),
              greatest((select max(id) from public.cap_guide_sections), 1));
select setval(pg_get_serial_sequence('public.cap_guide_items', 'id'),
              greatest((select coalesce(max(id), 0) from public.cap_guide_items), 1));

-- ── 3. Schema ───────────────────────────────────────────────────────────────
alter table public.cap_guide_items drop constraint if exists cap_guide_items_kind_check;
alter table public.cap_guide_items add constraint cap_guide_items_kind_check
  check (kind in ('paragraph', 'list_item'));

alter table public.cap_guide_items    drop column if exists title;
alter table public.cap_guide_sections drop column if exists date_label;

notify pgrst, 'reload schema';

commit;

-- ── Verification (read-only, after the commit) ──────────────────────────────
-- Expect 13 sections (7 team_member, 6 leader) and 62 items, as before.
select s.audience, s.sort_order, s.section_key, s.title, count(i.id) as items
from public.cap_guide_sections s
left join public.cap_guide_items i on i.section_id = s.id
group by s.id
order by s.audience desc, s.sort_order;
