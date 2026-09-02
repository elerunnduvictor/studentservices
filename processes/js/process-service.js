/* ═══════════════════════════════════════════════════════════════════════════
   PROCESS DOCUMENTATION — SERVICE LAYER

   No separate sign-in. This reads the same reader session hub-access.js
   already established (SS.access) and layers one more question on top of it:
   "is this person a process steward" — process_stewards is its own allow-list,
   deliberately not derived from hub_access.role (confirmed with Elie,
   2026-08-18 — see the table comment in Supabase).

   Matches the schema actually live in Supabase (verified directly against the
   database; process-documentation.sql in supabase/ is a reference copy of it,
   not the source — the migration was applied by hand in the SQL Editor):

     process_stewards   email (pk), full_name, department, job_title, active
                         — readable by any signed-in staff/director/admin
                         (partners cannot); written only by allowed_editors
                         (the PM Hub roster), same as every other reference
                         table. No write UI here.

     processes          created_by is who wrote the row (the PM, for a
                         PM-created one) — steward_email (added 2026-08-26) is
                         who the row is actually for, so a steward can still
                         see/edit a process a PM created on their behalf.
                         steward_name/steward_role are display text only. The
                         impact multi-select column is population_impacted,
                         not "impacts". department is NOT NULL with a foreign
                         key to departments(name). status is one of
                         Draft/Submitted/Reviewed/Archived — there is no
                         status_note column and no Needs Changes status; both
                         were retired together (2026-08-26), since status_note
                         only ever existed to carry a reviewer's reason for
                         bouncing a row back to that state.

   Row-level security, exactly as deployed:
     select   own rows (created_by = caller OR steward_email = caller), OR
              hub_access.role = 'admin' (directors are NOT reviewers here)
              with active=true and scope_department is null or equals
              processes.department, OR (2026-09-02, a separate policy)
              hub_access.role = 'director' with active=true and
              scope_department = processes.department (exact match only —
              unlike the admin branch, there's no null/org-wide case, since
              a director always carries a department scope). Read-only: this
              new policy has no accompanying insert/update/delete grant, so
              a director's extra visibility never becomes extra capability.
     insert   created_by must be the caller, and either the caller has an
              active process_stewards row (a steward creating their own row —
              steward_email = created_by = the steward's own email), or the
              caller is an admin whose scope_department is null or equals the
              row's department (a PM creating on behalf of a steward —
              created_by is still the PM's own email, steward_email is the
              picked steward's). Same "null or equals" shape as select/update,
              so a scoped PM can create only within their own department, and
              an org-wide admin (Jess Swinburne, Elie Gilles Ravel Mambou) can
              create for any steward anywhere (2026-08-26 — deliberately
              widened from an earlier, exact-match version of this branch).
     update   ONE combined policy, own row at ANY status (created_by =
              caller OR steward_email = caller — widened 2026-09-02, no
              longer restricted to Draft/Submitted) OR admin-in-scope. A
              BEFORE UPDATE trigger, process_guard(), is the actual
              enforcement for who may touch status/reviewed_by/reviewed_at:
                reviewer   any status change auto-stamps reviewed_by/
                           reviewed_at server-side; a client-sent value for
                           either is discarded, never trusted. A content-only
                           edit (status unchanged) leaves both alone, at any
                           status — the stamp only happens on an actual
                           status change.
                steward    reviewed_by/reviewed_at are never theirs — any
                           change raises an exception. status may move to
                           exactly one place, Submitted; any other new status
                           (jumping straight to Reviewed or Archived) also
                           raises — but leaving status unchanged never hits
                           that check, at any current status, which is what
                           makes a same-status content edit on a Reviewed or
                           Archived row work. RLS no longer restricts which
                           rows a steward can reach by status at all (widened
                           2026-09-02 alongside the update policy), so the
                           trigger is now the only thing policing a steward's
                           status transitions.
              This is why save() below only ever sends the steward-editable
              columns plus status — a defensive whitelist mirroring the
              trigger, so a client bug fails with a normal validation
              message here rather than a raw Postgres error from Supabase.
     delete   allowed_editors only (the PM Hub roster) — nobody reachable
              from this page can delete a row, which is why there's no
              delete affordance in the UI.

   process-review.js additionally hides Draft rows from the reviewer UI on
   its own — RLS's admin select branch has no status restriction, so an
   admin's own query can technically return a Draft row in their department.
   That's accepted as a UI-only boundary, not promoted to RLS: worst case a
   department PM sees one of their own team's Drafts slightly early, which
   isn't a real exposure given they're already fully trusted with that data
   the moment it's Submitted.

   Deliberately NOT run through shared/js/data-service.js's dataset loader.
   That loader exists to fall back to a bundled snapshot when Supabase is
   unreachable, which is right for dashboards showing last week's numbers and
   wrong here — a process a steward is mid-edit on has no meaningful "stale
   copy" to fall back to. A failure here is shown as a plain error state.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = (window.SS = window.SS || {});
  const PROC = (window.PROC = {});

  const state = {
    steward: null,       // process_stewards row, or null
    rows: [],             // everything the current session may see
    departments: [],      // [{ name }]
    error: null,
    loaded: false,
  };

  async function loadSteward() {
    try {
      // process_stewards is readable by any signed-in staff/director/admin,
      // so this is a plain filtered select — no RPC exists for it (there is
      // no process_me()).
      const rows = await SS.db.select("process_stewards", {
        select: "email,full_name,department,job_title,active",
        filter: { email: "ilike." + SS.access.email, active: "eq.true" },
        limit: 1,
      });
      state.steward = rows[0] || null;
    } catch {
      // A reviewer with no steward row at all is expected, not an error.
      state.steward = null;
    }
  }

  /**
   * For the reviewer's "New Process for Steward" picker. A department-scoped
   * PM gets active stewards in their own department only; an org-wide admin
   * (department is null/undefined — matches processes_insert's own `scope_
   * department IS NULL` branch) gets every active steward, unfiltered, since
   * they may create on behalf of anyone. The resulting process's department
   * comes from whichever steward is picked, not from the admin's own scope.
   */
  async function stewardsInDepartment(department) {
    const opts = {
      select: "email,full_name,department,job_title",
      filter: { active: "eq.true" },
      order: "full_name.asc",
    };
    if (department) opts.filter.department = "eq." + department;
    return SS.db.select("process_stewards", opts);
  }

  async function loadDepartments() {
    try {
      state.departments = await SS.db.select("departments", {
        select: "name",
        order: "sort_order.asc",
      });
    } catch {
      state.departments = [];
    }
  }

  async function loadRows() {
    // RLS already returns exactly the union of "mine" and "in my review
    // scope" — no separate query needed for the two panels.
    state.rows = await SS.db.select("processes", { order: "updated_at.desc" });
  }

  async function refresh() {
    try {
      state.error = null;
      await loadRows();
    } catch (err) {
      state.error = err.message || "Could not load process documentation.";
      state.rows = [];
    }
    document.dispatchEvent(new CustomEvent("proc:data", { detail: state }));
    return state;
  }

  /**
   * Only the columns a steward's own form may ever produce. Whitelisted here
   * as well as in process-form.js — this is the actual enforcement boundary,
   * since the update policy's WITH CHECK does not restrict columns.
   */
  const STEWARD_FIELDS = [
    "process_name", "steward_name", "steward_role", "department",
    "population_impacted", "frequency", "description", "tools_systems",
    "has_existing_doc", "storage_location_url", "workflow_steps",
    "supporting_documents", "status",
  ];

  function pickStewardFields(payload) {
    const out = {};
    STEWARD_FIELDS.forEach((k) => { if (k in payload) out[k] = payload[k]; });
    return out;
  }

  async function create(payload) {
    const email = SS.access.email;
    // steward_email links the row to the steward's own login even when a PM
    // created it on their behalf (created_by stays the PM, never the
    // steward). Defaults to the caller when absent — a steward creating
    // their own row — so this always ends up set to somebody.
    const rows = await SS.db.insert("processes", [Object.assign(
      pickStewardFields(payload),
      {
        created_by: email,
        steward_email: payload.steward_email || email,
        status: payload.status || "Draft",
      }
    )]);
    await refresh();
    return rows[0];
  }

  /** Steward edit: only the authored fields, while the row is unlocked. */
  async function save(id, payload) {
    const patch = pickStewardFields(payload);
    const rows = await SS.db.update("processes", id, patch);
    await refresh();
    return rows[0];
  }

  /**
   * Reviewer action: full content (same whitelist as a steward's own save())
   * plus status. reviewed_by/reviewed_at are NOT sent — process_guard()
   * stamps both server-side from the caller's own JWT and the clock whenever
   * a reviewer's edit actually changes status, and ignores whatever a client
   * sends for either column. Sending them here would just be a value the
   * trigger throws away; one source of truth beats two that could drift. A
   * content-only edit (status unchanged) leaves reviewed_by/reviewed_at as
   * they were, at any status.
   */
  async function review(id, payload) {
    const patch = pickStewardFields(payload);
    const rows = await SS.db.update("processes", id, patch);
    await refresh();
    return rows[0];
  }

  PROC.ready = (async function start() {
    try { await SS.access.ready; } catch { /* state.error surfaces below */ }

    if (!SS.access.email) {
      state.error = "not-signed-in";
      document.dispatchEvent(new CustomEvent("proc:data", { detail: state }));
      state.loaded = true;
      return state;
    }

    await Promise.all([loadSteward(), loadDepartments()]);
    await refresh();
    state.loaded = true;
    return state;
  })();

  Object.defineProperties(PROC, {
    steward:      { get: () => state.steward },
    isSteward:    { get: () => !!state.steward },
    // Directors are not reviewers here — the live RLS policy checks
    // hub_access.role = 'admin' only.
    isReviewer:   { get: () => SS.access.role === "admin" },
    // Read-only visibility into their own department (2026-09-02) — a
    // separate grant from isReviewer, never both true for one person since
    // 'admin' and 'director' are mutually exclusive values of the same
    // hub_access.role column. Can be true alongside isSteward, though (all
    // four directors are also stewards of their own department) — that's
    // fine, since this view has no actionable buttons to duplicate.
    isDirector:   { get: () => SS.access.role === "director" },
    reviewScopeDepartment: { get: () => (SS.access.scope && SS.access.scope.department) || null },
    rows:         { get: () => state.rows },
    departments:  { get: () => state.departments },
    error:        { get: () => state.error },
  });

  const STATUS_TONE = {
    "Draft": "grey",
    "Submitted": "yellow",
    "Reviewed": "accent",
    "Archived": "grey",
  };

  PROC.refresh = refresh;
  PROC.create = create;
  PROC.save = save;
  PROC.review = review;
  PROC.stewardsInDepartment = stewardsInDepartment;
  PROC.statusTone = (status) => STATUS_TONE[status] || "grey";
  PROC.formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch { return iso; }
  };
})();
