-- ═══════════════════════════════════════════════════════════════════════════
--  PROJECT INVENTORY — WORKFLOW
--
--  A second, separate field beside Status. Status says how a project is doing
--  (On Track, At Risk, Blocked…); Workflow says which stage of the work it is
--  in:
--
--      New → In Development → In Progress → In Review → Completed
--
--  Stored in Title Case, the same way the statuses are. The two are not tied
--  together in the database: Workflow = Completed with Status = On Track is
--  allowed here, and the PM Hub only warns about it (pm/js/schema.js), never
--  refuses it.
--
--  Not touched: the status list, row-level security, and the projects_touch /
--  projects_audit triggers. The one row updated below goes through both
--  triggers like any other edit, so change_log records it (as "system").
--
--  Safe to re-run. The column and constraint are only added once, and the
--  SEM Hiring row is only moved off 'New' — a later stage set in the PM Hub is
--  left alone.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.projects
  add column if not exists workflow text not null default 'New';

alter table public.projects drop constraint if exists projects_workflow_check;
alter table public.projects
  add constraint projects_workflow_check check (workflow in
    ('New', 'In Development', 'In Progress', 'In Review', 'Completed'));

update public.projects
   set workflow = 'In Progress'
 where title = 'SEM Hiring: Africa South & Nigeria'
   and workflow = 'New';

commit;

-- ── check it ───────────────────────────────────────────────────────────────
-- Expect the column (text, not null, default 'New'), the constraint, and the
-- SEM Hiring row at In Progress.
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'projects' and column_name = 'workflow';

select conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.projects'::regclass and conname = 'projects_workflow_check';

select id, title, status, workflow from public.projects order by sort_order, id;
