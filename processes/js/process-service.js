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

   hub_subtree_emails() (2026-09-25) is the caller's reporting subtree from
   org_chart_nodes — themselves plus everyone under them at any depth. Their
   own login email is always included, even where the org chart carries a
   different address for them.

   Row-level security, exactly as deployed:
     select   own rows (created_by = caller OR steward_email = caller), OR
              hub_access.role = 'admin' (directors are NOT reviewers here)
              with active=true and scope_department is null or equals
              processes.department, OR (processes_select_team, 2026-09-25 —
              replaced the flat department-name director policy) a staff or
              director caller whose subtree contains the row's created_by or
              steward_email. processes_update_team grants edit on exactly
              those same rows, so a leader can fix anything they can see.
     insert   created_by must be the caller, and either the caller is an
              admin whose scope_department is null or equals the row's
              department (any steward — Jess Swinburne and Elie Gilles Ravel
              Mambou are org-wide), or the caller has an active
              process_stewards row AND steward_email is in their own subtree
              (2026-09-25 — before this, a steward could name anyone).
     update   ONE combined policy, own row at ANY status (created_by =
              caller OR steward_email = caller — widened 2026-09-02, no
              longer restricted to Draft/Submitted) OR admin-in-scope. Its
              WITH CHECK also requires steward_email to stay in the editor's
              subtree unless they're an in-scope admin (2026-09-25), so a row
              can't be reassigned outside the editor's line. Plus
              processes_update_team (2026-09-25): a staff/director caller may
              edit any row processes_select_team shows them, as long as
              steward_email stays in their subtree (or is null on a row
              their line created). Permissive policies are OR'd, which is why
              that check doesn't also accept "created_by in subtree" alone —
              it would let anyone reassign their own rows anywhere. The
              processes_touch trigger stamps updated_by from the editor's
              JWT on every update, so a leader's edit is recorded as theirs. A
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

   RLS's admin select branch has no status restriction, and since 2026-09-25
   the UI doesn't add one either: an admin's Processes list shows Drafts in
   their scope, like a leader's shows their subtree's. (The old Review
   section hid Drafts because an admin's own were listed separately; once
   the two were merged, that filter hid every Draft from admins.)

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
    subtree: [],          // lowercased emails: the caller and everyone under them
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

  async function loadSubtree() {
    try {
      // PostgREST returns a setof-scalar function as bare values; the object
      // shape is accepted too in case that ever changes.
      const rows = await SS.db.rpc("hub_subtree_emails");
      state.subtree = (rows || [])
        .map((r) => (r && typeof r === "object" ? r.hub_subtree_emails : r))
        .filter(Boolean)
        .map((e) => String(e).toLowerCase());
    } catch {
      // Without it the page behaves as for someone with no reports: the
      // steward creates for themself only, no team panel.
      state.subtree = [];
    }
  }

  function inSubtree(email) {
    return !!email && state.subtree.includes(String(email).toLowerCase());
  }

  /**
   * For a non-admin steward with reports: every active steward in their own
   * reporting subtree, whatever department that steward is in. Mirrors
   * processes_insert's steward branch, so nobody is offered a name the
   * insert would refuse.
   */
  async function stewardsInSubtree() {
    const rows = await SS.db.select("process_stewards", {
      select: "email,full_name,department,job_title",
      filter: { active: "eq.true" },
      order: "full_name.asc",
    });
    return rows.filter((s) => inSubtree(s.email));
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

    await Promise.all([loadSteward(), loadSubtree(), loadDepartments()]);
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
    // Anyone with people under them in the org chart, at any level
    // (2026-09-25 — replaced isDirector's department-wide view). Staff and
    // directors only, matching processes_select_team / processes_update_team;
    // an admin already sees more through Review. Turns the Processes list
    // into the team list with a Steward filter.
    hasTeam:      { get: () => (SS.access.role === "staff" || SS.access.role === "director")
                                 && state.subtree.some((e) => e !== String(SS.access.email || "").toLowerCase()) },
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
  PROC.stewardsInSubtree = stewardsInSubtree;
  PROC.inSubtree = inSubtree;
  PROC.statusTone = (status) => STATUS_TONE[status] || "grey";
  PROC.formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch { return iso; }
  };
})();
