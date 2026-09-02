/* ═══════════════════════════════════════════════════════════════════════════
   DATA SERVICE — the one place either app talks to the database

   The hub's pages were written against globals (`window.EMPLOYEES`,
   `window.OKR_PROGRESS_ROWS`, `window.SCORECARD_KPIS`). Rather than rewrite
   every renderer, this module fills those same globals from Supabase before the
   page renders. The rendering code doesn't know or care where the rows came
   from, which is what makes the switch safe.

   Reads go through PostgREST over plain fetch — no SDK, no build step, and it
   works identically from a file:// page, the hub, and the PM Hub.

   If the database is unreachable the page keeps its bundled snapshot and says
   so, because a dashboard that renders yesterday's numbers is far better than
   one that renders an error.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const cfg = window.SS_CONFIG || {};
  const SS = (window.SS = window.SS || {});

  // Defined at load, before any renderer can reach it.
  //
  // This used to come from directory/js/employees.js, which every page pulled in
  // as a script tag. Once that stopped loading eagerly the global disappeared,
  // and the directory threw on its first lookup — 193 employees arrived and none
  // were drawn. Setting it inside the dataset's `after` hook was too late: the
  // department pages read it too, and they do not load that dataset.
  window.STUDENT_CONTRACTORS = window.STUDENT_CONTRACTORS || {};

  /* ── low-level ─────────────────────────────────────────────────────────── */

  function endpoint(path) {
    return cfg.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/" + path;
  }

  function headers(extra) {
    // Two different sessions can be in play: the PM Hub's editor session
    // (SS.session) and the hub's reader session (SS.access.session). Whichever
    // exists is what the database should judge this request by — falling back
    // to the anon key would silently downgrade a signed-in reader to no role at
    // all, and their pages would come back empty.
    const token =
      SS.session?.access_token ||
      SS.access?.session?.access_token ||
      cfg.SUPABASE_ANON_KEY;
    return Object.assign({
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    }, extra || {});
  }

  /**
   * GET rows from a table or view.
   * @param {string} resource  table or view name
   * @param {object} opts      { select, order, filter, limit }
   */
  async function select(resource, opts = {}) {
    if (!cfg.isConfigured) throw new Error("Supabase is not configured");
    const params = new URLSearchParams();
    params.set("select", opts.select || "*");
    if (opts.order) params.set("order", opts.order);
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.filter) {
      Object.entries(opts.filter).forEach(([k, v]) => params.set(k, v));
    }
    const res = await fetch(endpoint(resource) + "?" + params.toString(), {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`${resource}: ${res.status} ${await res.text().catch(() => "")}`.trim());
    }
    return res.json();
  }

  async function insert(resource, rows) {
    const res = await fetch(endpoint(resource), {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error(await describeError(res, resource));
    return res.json();
  }

  /**
   * Call a Postgres function.
   *
   * Used for the two operations that change the shape of a sheet rather than
   * its contents — adding a column and creating a sheet. Those run DDL, which
   * is why they are functions with their own checks rather than table writes:
   * the database decides whether the caller may do it, not the browser.
   */
  async function rpc(fn, args = {}) {
    const res = await fetch(endpoint("rpc/" + fn), {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(await describeError(res, fn));
    return res.json();
  }

  async function update(resource, id, patch, idKey = "id") {
    const res = await fetch(endpoint(resource) + `?${idKey}=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(await describeError(res, resource));
    return res.json();
  }

  async function remove(resource, ids, idKey = "id") {
    if (!ids.length) return;
    const list = ids.map((i) => encodeURIComponent(i)).join(",");
    const res = await fetch(endpoint(resource) + `?${idKey}=in.(${list})`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok) throw new Error(await describeError(res, resource));
  }

  async function describeError(res, resource) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.message || body.hint || body.details || "";
    } catch { /* body wasn't JSON */ }
    if (res.status === 401 || res.status === 403) {
      return `Not allowed to change ${resource}. Your email must be listed in allowed_editors, and you must be signed in.`;
    }
    return `${resource}: ${res.status} ${detail}`.trim();
  }

  /* ── hub datasets ──────────────────────────────────────────────────────── */

  /* Each dataset names the global the hub's renderers already read, the view it
     comes from, and how to reshape a database row into that global's shape. */
  const DATASETS = {
    directory: {
      global: "EMPLOYEES",
      view: "v_hub_directory",
      order: "dept.asc,subDept.asc,name.asc",
      map: (r) => ({
        name: r.name, role: r.role || "", dept: r.dept || "",
        type: r.type || "", stakeholder: r.stakeholder || "",
        subDept: r.subDept || "", org: r.org || "", tier: r.tier || "",
      }),
      // Student contractors are counted per department rather than listed, so
      // they arrive as an aggregate the directory and department pages read
      // from the same global they always have.
      after: async () => {
        // Guaranteed to exist before anything renders.
        //
        // This used to be defined by directory/js/employees.js, which every page
        // loaded as a script tag. Once that stopped being loaded eagerly, the
        // global vanished and the directory renderer threw on its first lookup —
        // so 193 employees arrived from the database and none of them were
        // drawn. An empty object gives the same answer as a missing department
        // (undefined) without taking the page down.
        window.STUDENT_CONTRACTORS = window.STUDENT_CONTRACTORS || {};
        try {
          const rows = await select("student_contractor_counts", {
            select: "department,headcount",
          });
          if (rows.length) {
            const map = {};
            rows.forEach((r) => { map[r.department] = Number(r.headcount) || 0; });
            window.STUDENT_CONTRACTORS = map;
          }
        } catch {
          // keep whatever the bundled file provided
        }
      },
    },
    okrs: {
      global: "OKR_PROGRESS_ROWS",
      view: "v_hub_okrs",
      order: "id.asc",
      map: (r) => ({
        id: r.id, okr: r.okr, keyResult: r.keyResult,
        subKeyResult: r.subKeyResult, subKeyResultChild: r.subKeyResultChild,
        period: r.period, stakeholder: r.stakeholder,
        secondaryStakeholders: r.secondaryStakeholders,
        projectManager: r.projectManager, type: r.type,
        goal: numOrNull(r.goal), stretchGoal: numOrNull(r.stretchGoal),
        progress: numOrNull(r.progress), status: r.status, trend: r.trend,
        comment: r.comment, updateDate: r.updateDate,
      }),
    },
    orgchart: {
      // The chart reads OC.employees rather than a bare global, so this dataset
      // fills that instead. Shape is identical to what org-chart/js/data.js
      // defines, which is why the renderer needed no changes.
      global: "__ORG_CHART__",
      bundled: () => (window.OC && window.OC.employees) || [],
      view: "v_hub_org_chart",
      order: "level.asc",
      map: (r) => {
        const node = {
          id: r.id, name: r.name, title: r.title || "", dept: r.dept,
          level: r.level, status: r.status || "FTE", reportsTo: r.reportsTo,
          responsibilities: r.responsibilities || [],
          kpis: r.kpis || [],
          email: r.email || "",
          photoUrl: r.photoUrl || "",
          roleInventoryUrl: r.roleInventoryUrl || "",
          stewardships: r.stewardships || "",
          keyKpis: r.key_kpis || "",
          keyResponsibilities: r.key_responsibilities || "",
          directReports: r.direct_reports || "",
        };
        if (r.role_kind === "pm") {
          node.role = "pm";
          node.pmPosition = r.pmPosition || "right";
        }
        return node;
      },
      after: async (rows) => {
        window.OC = window.OC || {};
        window.OC.employees = rows;
      },
    },

    performance: {
      // Sections arrive with their services already nested by the view, which
      // is the shape the renderer was written against.
      global: "PERFORMANCE_SECTIONS",
      view: "v_hub_performance_sections",
      order: "index.asc",
      map: (r) => ({
        id: r.id, title: r.title, index: r.index,
        services: (r.services || []).map((v) => ({
          service: v.service,
          standards: v.standards || [],
          stewards: v.stewards || [],
          evidence: v.evidence || "",
          keyMetrics: v.keyMetrics || "",
          cadence: v.cadence || "",
        })),
      }),
      // The intro paragraph and the metric-to-dashboard lookup live beside the
      // sections rather than inside them.
      after: async () => {
        try {
          const [text, links] = await Promise.all([
            select("app_text", { select: "key,value",
              filter: { key: "eq.performance_standards_intro" }, limit: 1 }),
            select("performance_metric_links", { select: "metric,url,has_report" }),
          ]);
          if (text.length) window.PERFORMANCE_INTRO = text[0].value;
          if (links.length) {
            const map = {}, parked = [];
            links.forEach((l) => {
              if (l.has_report && l.url) map[l.metric] = l.url;
              else parked.push(l.metric);
            });
            window.PERFORMANCE_METRIC_LINKS = map;
            window.PERFORMANCE_METRIC_NO_REPORT = parked;
          }
        } catch {
          // keep whatever the bundled file provided
        }
      },
    },

    kpis: {
      global: "SCORECARD_KPIS",
      view: "v_hub_kpis",
      order: "id.asc",
      // The scorecard needs derived fields (slugs, computed colour, outcome
      // area). Those are pure functions of the row, so they are computed here
      // rather than stored — a stored status would go stale the moment a band
      // or a value changed.
      map: (r) => window.SS.kpiStatus.decorate(r),
      // The scorecard prints how many measures are excluded; that count lives
      // outside the view (which only returns tracked rows), so ask for it.
      after: async (rows) => {
        // Branches this reader may not open still have to show an honest
        // colour, or a partner's scorecard would be empty and a manager's would
        // silently lose every team but their own. `hub_scorecard_rollup()`
        // returns the bands and the current value with no employee and no
        // measure attached — enough to compute a status, nothing to identify
        // anyone. Anything already present by name is left alone.
        try {
          const access = window.SS && window.SS.access;
          // The rows above are fetched as soon as there is a session, without
          // waiting to learn who this is — but the choice below is about the
          // role, so it has to wait for it. Reading `role` early returns "none",
          // which would send an admin down the restricted branch.
          if (access) { try { await access.ready; } catch { /* stays "none" */ } }
          if (access && access.session && access.role !== "admin") {
            const res = await fetch(endpoint("rpc/hub_scorecard_rollup"), {
              method: "POST", headers: headers(), body: "{}",
            });
            if (res.ok) {
              const seen = new Set(rows.map((r) => (r.dept || "") + "|" + (r.subDept || "")));
              (await res.json()).forEach((r, i) => {
                const key = (r.department || "") + "|" + (r.sub_department || "");
                if (seen.has(key)) return;      // already visible in full
                // `decorate` builds a fixed shape and keeps only the fields it
                // knows, so the flag has to be re-attached afterwards — set on
                // the way in it is silently dropped, and every branch renders as
                // openable.
                rows.push(Object.assign(window.SS.kpiStatus.decorate({
                  id: "rollup-" + i,
                  employee: null,
                  role: null,
                  department: r.department,
                  sub_department: r.sub_department,
                  kpi_measure: null,
                  category_type: r.category_type,
                  band_green: r.band_green,
                  band_yellow: r.band_yellow,
                  band_red: r.band_red,
                  current_value: r.current_value,
                  tracking_status: "Tracking",
                }), { restricted: true }));
              });
            }
          }
        } catch { /* the named rows are still worth rendering on their own */ }

        let excluded = null;
        try {
          const res = await fetch(
            endpoint("kpis") + "?select=id&tracking_status=neq.Tracking",
            { headers: headers({ Prefer: "count=exact", Range: "0-0" }) }
          );
          const range = res.headers.get("content-range") || "";
          excluded = Number(range.split("/")[1]);
          if (!Number.isFinite(excluded)) excluded = null;
        } catch { /* the footnote can live without it */ }

        const roll = window.SS.kpiStatus.rollup(rows);
        window.SCORECARD_META = {
          generated: new Date().toISOString().slice(0, 10),
          source: "the Student Services database",
          tracked: rows.length,
          excludedNotTracking: excluded,
          scored: roll.scored,
          health: roll.health,
          coverage: roll.coverage,
          live: true,
        };
      },
    },
  };

  function numOrNull(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Load a dataset into the global the hub expects.
   * Resolves to { source: "database" | "bundled", rows, error? }.
   */
  /* ══ THE OFFLINE READ ══

     What the bundled snapshots used to provide, without publishing anything.

     They were four static files on a public site, so anyone who knew a path
     had the roster, the scorecard and the org chart. This keeps the same
     convenience — a reader whose database is briefly unreachable still sees
     the numbers — by remembering what *this* reader was served rather than
     shipping a copy for everybody.

     Three properties make that a different thing from a snapshot:

       · it holds only rows the database already handed this person, so
         row-level security decided its contents, not us;
       · it lives in their browser, so there is nothing to fetch and nothing
         to leak from the server;
       · it is keyed by the signed-in address and cleared on sign-out, so a
         shared machine does not show one person's data to the next.

     It is still data at rest on a device that may not be theirs alone, which
     is why it is scoped, capped and wiped rather than simply written. */

  const CACHE_PREFIX = "ss_cache:";

  /* Old enough that showing it would mislead rather than help. A database out
     for a week is an outage somebody knows about; a page quietly rendering
     month-old KPIs as though they were current is worse than an empty one. */
  const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  function cacheWho() {
    try { return (localStorage.getItem("ss_user_session") || "").toLowerCase(); }
    catch { return ""; }                      // private mode, or storage blocked
  }

  function cacheKey(name) { return CACHE_PREFIX + cacheWho() + ":" + name; }

  function cacheWrite(name, rows) {
    if (!cacheWho() || !Array.isArray(rows) || !rows.length) return;
    try {
      localStorage.setItem(cacheKey(name), JSON.stringify({ at: Date.now(), rows }));
    } catch {
      /* No room, or storage refused. Drop whatever was there rather than leave
         an older copy behind a newer read: a half-updated cache is the one
         thing worse than none. */
      try { localStorage.removeItem(cacheKey(name)); } catch { /* nothing to do */ }
    }
  }

  function cacheRead(name) {
    if (!cacheWho()) return null;
    try {
      const raw = localStorage.getItem(cacheKey(name));
      if (!raw) return null;
      const v = JSON.parse(raw);
      if (!v || !Array.isArray(v.rows) || !v.rows.length) return null;
      if (!(typeof v.at === "number") || Date.now() - v.at > CACHE_MAX_AGE) return null;
      return v;
    } catch { return null; }
  }

  /** Every cached dataset, for every address that has signed in here. */
  function clearCache() {
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(CACHE_PREFIX) === 0) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
      return doomed.length;
    } catch { return 0; }
  }

  async function loadDataset(name) {
    const def = DATASETS[name];
    if (!def) throw new Error(`Unknown dataset "${name}"`);

    /* The global a page renders from has to exist before anything can go
       wrong, not only after a load succeeds.

       It used to be defined by the bundled snapshot, which every page loaded,
       so it was always an array no matter what happened next. With the
       snapshots gone the only thing that assigns it is a successful fetch —
       and a page whose fetch failed then reached for `.filter` on undefined
       and died. Three did: the scorecard, the OKR page and the org chart.
       An empty array renders an empty page, which is the honest answer and
       the one the empty states were written for. */
    if (!Array.isArray(window[def.global])) window[def.global] = [];
    // With no Supabase configured there is nothing to read. `bundled` is
    // whatever the page had already put in the global — empty everywhere now
    // that the snapshots are gone, except OC.DEPARTMENTS-style constants.
    if (!cfg.isConfigured) {
      const bundled = def.bundled ? def.bundled() : window[def.global];
      return finish("bundled", bundled || [], "Supabase is not configured yet");
    }
    try {
      const raw = await select(def.view, { order: def.order });
      const rows = raw.map(def.map);
      window[def.global] = rows;
      if (def.after) await def.after(rows);
      cacheWrite(name, rows);
      return finish("database", rows);
    } catch (err) {
      /* No snapshot to fall back to, on purpose.

         There used to be four: directory/js/employees.js (190 people with
         roles and reporting lines), scorecard/js/scorecard-data.js (76 KPIs
         with owners and values), okr-progress-data.js and the org chart's.
         They were loaded on demand rather than on every page, which kept them
         out of the payload — but they were still static files on a public
         site, fetchable by URL with no sign-in at all. So the row-level
         security that refuses a partner the directory was handed straight back
         to anyone who knew the path.

         They are gone. The database is the only source, and a request that
         cannot reach it says so: loadAll turns this into {source: "failed"},
         hub-boot shows "Live data unavailable", and the page renders its empty
         state. Stale data nobody can date is not obviously better than an
         honest blank, and it is not worth publishing the roster for.

         What is lost is the offline read: a signed-in reader during a Supabase
         outage now sees nothing rather than yesterday's numbers. If that
         matters, the answer is a per-user cache of the last successful load —
         it holds only what that reader was already allowed to see — not a file
         on the public internet. */
      /* The reader's own copy, if there is a recent one. This is what the
         bundled snapshot used to do, minus the publishing: it holds only rows
         the database already handed this person, and only in their browser.

         `after` has to run again — for the org chart it is what assigns
         OC.employees, so skipping it would render nothing — but it makes its
         own requests, and those will fail for whatever reason this one did.
         Its failure is not the cache's failure, so it is caught separately. */
      const cached = cacheRead(name);
      if (cached) {
        window[def.global] = cached.rows;
        if (def.after) {
          try { await def.after(cached.rows); }
          catch { /* the rollups it fetches are unreachable too; the rows stand */ }
        }
        console.warn(`[data] ${name}: ${err.message} — showing this device's copy`);
        return finish("cache", cached.rows, err.message, cached.at);
      }

      console.warn(`[data] ${name}: ${err.message}`);
      throw err;
    }

    // `at` is when the rows were read from the database, which for a cached
    // read is not now — the notice says how old they are, so it has to be the
    // original time rather than the moment they came back off disk.
    function finish(source, rows, error, at) {
      SS.dataSource = SS.dataSource || {};
      const when = at ? new Date(at) : new Date();
      SS.dataSource[name] = { source, error, count: rows.length, at: when };
      return { source, rows, error, at: when };
    }
  }

  /** Load several datasets at once; never rejects, so one bad table can't blank a page. */
  async function loadAll(names) {
    const out = {};
    await Promise.all(names.map(async (n) => {
      try { out[n] = await loadDataset(n); }
      catch (err) { out[n] = { source: "failed", rows: [], error: err.message }; }
    }));
    return out;
  }

  SS.db = { select, insert, update, remove, rpc, endpoint, headers };
  SS.data = { load: loadDataset, loadAll, DATASETS, clearCache };
})();
