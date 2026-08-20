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
                         — world-readable (RLS: select using true); written
                         only by allowed_editors (the PM Hub roster), same as
                         every other reference table. No write UI here.

     processes          created_by is the ownership column — there is no
                         steward_email. steward_name/steward_role are display
                         text only. The impact multi-select column is
                         population_impacted, not "impacts". department is
                         NOT NULL with a foreign key to departments(name).

   Row-level security, exactly as deployed:
     select   own rows (created_by), OR hub_access.role = 'admin' (directors
              are NOT reviewers here) with active=true and
              scope_department is null or equals processes.department.
     insert   created_by must be the caller, and the caller must have an
              active process_stewards row.
     update   ONE combined policy, own-row-while-unlocked OR admin-in-scope.
              A BEFORE UPDATE trigger, process_guard(), is the actual
              enforcement for who may touch status/status_note/reviewed_by/
              reviewed_at:
                reviewer   any status change auto-stamps reviewed_by/
                           reviewed_at server-side; a client-sent value for
                           either is discarded, never trusted.
                steward    status_note/reviewed_by/reviewed_at are never
                           theirs — any change raises an exception. status
                           may move to exactly one place, Submitted; any
                           other new status (jumping straight to Reviewed or
                           Archived) also raises. RLS's own USING clause is
                           what already limits which rows a steward can
                           reach at all (status in Draft/Needs Changes), so
                           the trigger only has to police where they can
                           move TO.
              This is why save() below only ever sends the steward-editable
              columns plus status — a defensive whitelist mirroring the
              trigger, so a client bug fails with a normal validation
              message here rather than a raw Postgres error from Supabase.
     delete   allowed_editors only (the PM Hub roster) — nobody reachable
              from this page can delete a row, which is why there's no
              delete affordance in the UI.

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
      // process_stewards is world-readable, so this is a plain filtered
      // select — no RPC exists for it (there is no process_me()).
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
    const rows = await SS.db.insert("processes", [Object.assign(
      pickStewardFields(payload),
      { created_by: email, status: payload.status || "Draft" }
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
   * Reviewer action: status + a note. reviewed_by/reviewed_at are NOT sent —
   * process_guard() stamps both server-side from the caller's own JWT and the
   * clock whenever a reviewer changes status, and ignores whatever a client
   * sends for either column. Sending them here would just be a value the
   * trigger throws away; one source of truth beats two that could drift.
   */
  async function review(id, patch) {
    const rows = await SS.db.update("processes", id, {
      status: patch.status,
      status_note: patch.status_note || null,
    });
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
    reviewScopeDepartment: { get: () => (SS.access.scope && SS.access.scope.department) || null },
    rows:         { get: () => state.rows },
    departments:  { get: () => state.departments },
    error:        { get: () => state.error },
  });

  const STATUS_TONE = {
    "Draft": "grey",
    "Submitted": "yellow",
    "Reviewed": "accent",
    "Needs Changes": "red",
    "Archived": "grey",
  };

  PROC.refresh = refresh;
  PROC.create = create;
  PROC.save = save;
  PROC.review = review;
  PROC.statusTone = (status) => STATUS_TONE[status] || "grey";
  PROC.formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch { return iso; }
  };
})();
