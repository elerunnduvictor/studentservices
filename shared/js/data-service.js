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
  async function loadDataset(name) {
    const def = DATASETS[name];
    if (!def) throw new Error(`Unknown dataset "${name}"`);
    // Most pages keep their snapshot in a plain global; the org chart keeps it
    // on OC.employees, so a dataset may say where to look instead.
    const bundled = def.bundled ? def.bundled() : window[def.global];

    if (!cfg.isConfigured) {
      return finish("bundled", bundled || [], "Supabase is not configured yet");
    }
    try {
      const raw = await select(def.view, { order: def.order });
      const rows = raw.map(def.map);
      window[def.global] = rows;
      if (def.after) await def.after(rows);
      return finish("database", rows);
    } catch (err) {
      if (cfg.ALLOW_STATIC_FALLBACK && Array.isArray(bundled) && bundled.length) {
        console.warn(`[data] ${name}: falling back to bundled snapshot —`, err.message);
        return finish("bundled", bundled, err.message);
      }
      throw err;
    }

    function finish(source, rows, error) {
      SS.dataSource = SS.dataSource || {};
      SS.dataSource[name] = { source, error, count: rows.length, at: new Date() };
      return { source, rows, error };
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
  SS.data = { load: loadDataset, loadAll, DATASETS };
})();
