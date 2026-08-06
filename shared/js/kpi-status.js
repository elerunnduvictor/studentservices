/* ═══════════════════════════════════════════════════════════════════════════
   KPI STATUS — the single implementation of "what colour is this KPI?"

   The spreadsheet's own "Performance Status" column is not trusted: its formula
   is wrong (a 3-minute value against a "2-5 minutes" yellow band came back Red).
   Colour is derived here, from each KPI's green/yellow/red band definitions
   tested against its current value.

   This used to live in the import script, which meant the answer was frozen at
   build time. It lives here now so the scorecard computes it live from the
   database, and the PM console can show an editor the resulting colour while
   they are still typing the value.

   Two rules earn their keep:

   1. Direction is inferred from how green sits against red, not from the
      sheet's Direction column — that column carries day-based cutoffs against
      percentage bands on at least one row.
   2. Where a band contradicts the standard pattern, it is rebuilt from the
      yellow range, which is always a plain interval with green and red beyond
      its two ends. "Grievance QA" is written green "< 90%" with red "< 70%";
      taken literally a 95% score is Red, which is plainly not the intent.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const NEG = Number.NEGATIVE_INFINITY;
  const POS = Number.POSITIVE_INFINITY;

  const SCORE = { Green: 100, Yellow: 50, Red: 0 };

  const OUTCOME_AREAS = {
    "student autonomy": "Autonomy",
    "completion": "Completion",
    "student satisfaction": "Satisfaction",
  };
  const TYPE_CANONICAL = {
    "autonomy": "Student Autonomy",
    "satisfaction": "Student Satisfaction",
  };

  function normalise(text) {
    return String(text)
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/≥|≧/g, ">=")
      .replace(/≤|≦/g, "<=")
      .replace(/[–—−]/g, "-")
      .replace(/\s+/g, " ");
  }

  /** Parse a band into [lo, loInclusive, hi, hiInclusive], or null. */
  function parseBand(text) {
    if (text === null || text === undefined) return null;
    const s = normalise(text);
    if (!s || ["-", "--", "n/a", "na", "tbd", "none", "$"].includes(s)) return null;
    if (!/\d/.test(s)) return null;

    let m;
    if ((m = s.match(/^>=\s*([\d.]+)/))) return [+m[1], true, POS, false];
    if ((m = s.match(/^>\s*([\d.]+)/))) return [+m[1], false, POS, false];
    if ((m = s.match(/^<=\s*([\d.]+)/))) return [NEG, false, +m[1], true];
    if ((m = s.match(/^<\s*([\d.]+)/))) return [NEG, false, +m[1], false];
    if ((m = s.match(/^(?:below|under|less than)\s*([\d.]+)/))) return [NEG, false, +m[1], false];
    if ((m = s.match(/^(?:above|over|more than)\s*([\d.]+)/))) return [+m[1], false, POS, false];
    if ((m = s.match(/^([\d.]+)\s*\+/))) return [+m[1], true, POS, false];
    if ((m = s.match(/^([\d.]+)\s*%?\s*(?:-|to)\s*([\d.]+)/))) {
      const a = +m[1], b = +m[2];
      return [Math.min(a, b), true, Math.max(a, b), true];
    }
    if ((m = s.match(/^([\d.]+)\s*%?\s*\w*$/))) return [+m[1], true, +m[1], true];
    return null;
  }

  /** Higher- or lower-is-better, or null when green and red overlap. */
  function inferDirection(g, r) {
    if (g && r) {
      if (g[0] > NEG && r[2] < POS && g[0] >= r[2]) return "higher";
      if (g[2] < POS && r[0] > NEG && g[2] <= r[0]) return "lower";
      return null;                       // contradictory — caller asks yellow
    }
    if (g && g[0] > NEG && g[2] === POS) return "higher";
    if (g && g[2] < POS && g[0] === NEG) return "lower";
    return null;
  }

  /** Repair a green or red band that contradicts the yellow anchor. */
  function reconcile(g, y, r) {
    const notes = [];
    let direction = inferDirection(g, r);
    if (!y || y[0] === NEG || y[2] === POS) return { g, r, direction, notes };

    const ylo = y[0], yhi = y[2];
    if (!direction) {
      if (r && r[2] < POS && r[2] <= ylo) direction = "higher";
      else if (r && r[0] > NEG && r[0] >= yhi) direction = "lower";
      else if (g && g[0] > NEG && g[0] >= yhi) direction = "higher";
      else if (g && g[2] < POS && g[2] <= ylo) direction = "lower";
    }
    if (!direction) return { g, r, direction: null, notes };

    // Scaled to the yellow band's own width, so a deliberate-but-loose boundary
    // (green ">= 80%" against yellow "75-85%") is left alone while a threshold
    // on the wrong scale (red "0.69" against yellow "70-84%") is caught.
    const tol = Math.max(1, 0.5 * (yhi - ylo));
    const far = (actual, expected) => actual === null || Math.abs(actual - expected) > tol;

    if (direction === "higher") {
      if (!g || g[0] === NEG || far(g[0], yhi)) {
        notes.push(`green band rebuilt from the yellow range (> ${yhi})`);
        g = [yhi, false, POS, false];
      }
      if (!r || r[2] === POS || far(r[2], ylo)) {
        notes.push(`red band rebuilt from the yellow range (< ${ylo})`);
        r = [NEG, false, ylo, false];
      }
    } else {
      if (!g || g[2] === POS || far(g[2], ylo)) {
        notes.push(`green band rebuilt from the yellow range (< ${ylo})`);
        g = [NEG, false, ylo, false];
      }
      if (!r || r[0] === NEG || far(r[0], yhi)) {
        notes.push(`red band rebuilt from the yellow range (> ${yhi})`);
        r = [yhi, false, POS, false];
      }
    }
    return { g, r, direction, notes };
  }

  function classify(value, g, r, direction) {
    if (value === null || !g || !r || !direction) return null;
    if (direction === "higher") {
      if (g[1] ? value >= g[0] : value > g[0]) return "Green";
      if (r[3] ? value <= r[2] : value < r[2]) return "Red";
      return "Yellow";
    }
    if (g[3] ? value <= g[2] : value < g[2]) return "Green";
    if (r[1] ? value >= r[0] : value > r[0]) return "Red";
    return "Yellow";
  }

  function valueNumber(v) {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return v;
    const m = String(v).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : null;
  }

  function slug(s) {
    return String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
  }

  /**
   * Evaluate one KPI. Returns everything the scorecard needs to draw it.
   * Accepts either database column names or the hub's camelCase shape.
   */
  function evaluate(row) {
    const bandGreen  = row.bandGreen  ?? row.band_green  ?? null;
    const bandYellow = row.bandYellow ?? row.band_yellow ?? null;
    const bandRed    = row.bandRed    ?? row.band_red    ?? null;
    const rawValue   = row.value      ?? row.current_value ?? null;

    const g0 = parseBand(bandGreen);
    const y0 = parseBand(bandYellow);
    const r0 = parseBand(bandRed);
    const { g, r, direction, notes } = reconcile(g0, y0, r0);

    const bandText = [bandGreen, bandYellow, bandRed]
      .filter((b) => b !== null && b !== undefined).join(" ");
    const percent = /%/.test(bandText);

    let value = valueNumber(rawValue);
    if (percent && value !== null && Math.abs(value) <= 1.5) value *= 100;

    let status = classify(value, g, r, direction);
    if (!status) {
      // A value with no thresholds to score against is not "no data" — the
      // number exists, it just needs a person to judge it.
      status = value === null ? "No Data" : "Manual Review";
    }

    return {
      status,
      direction,
      percent,
      displayValue: value,
      greenCutoff: g && direction ? (direction === "higher" ? g[0] : g[2]) : null,
      redCutoff:   r && direction ? (direction === "higher" ? r[2] : r[0]) : null,
      bandNote: notes.length ? notes.join("; ") : null,
    };
  }

  /** Shape a database row into the record the scorecard renders. */
  function decorate(r) {
    const evaluated = evaluate(r);
    const dept = r.department || r.dept || "";
    const subDept = r.subDept || r.sub_department || "Department Leadership";
    let type = (r.type || r.category_type || "").trim();
    type = TYPE_CANONICAL[type.toLowerCase()] || type;

    return {
      id: r.id,
      employee: r.employee || "Unassigned",
      role: r.role || "",
      dept,
      deptSlug: slug(dept),
      subDept,
      subDeptSlug: slug(subDept),
      personSlug: slug(r.employee || "unassigned"),
      measure: r.measure || r.kpi_measure || "",
      category: r.category || r.kpi_category || "",
      type,
      area: OUTCOME_AREAS[type.toLowerCase()] || null,
      bandGreen: r.bandGreen ?? r.band_green ?? null,
      bandYellow: r.bandYellow ?? r.band_yellow ?? null,
      bandRed: r.bandRed ?? r.band_red ?? null,
      value: r.value ?? r.current_value ?? null,
      source: r.source || r.data_source || null,
      frequency: r.frequency || r.update_frequency || null,
      ...evaluated,
    };
  }

  function rollup(rows) {
    const counts = { Green: 0, Yellow: 0, Red: 0, "Manual Review": 0, "No Data": 0 };
    let total = 0;
    rows.forEach((r) => {
      if (counts[r.status] === undefined) counts[r.status] = 0;
      counts[r.status]++;
      if (SCORE[r.status] !== undefined) total += SCORE[r.status];
    });
    const scored = counts.Green + counts.Yellow + counts.Red;
    return {
      tracked: rows.length,
      scored,
      counts,
      health: scored ? Math.round(total / scored) : null,
      coverage: rows.length ? Math.round((100 * scored) / rows.length) : 0,
    };
  }

  window.SS = window.SS || {};
  window.SS.kpiStatus = {
    parseBand, inferDirection, reconcile, classify, evaluate, decorate, rollup, slug, SCORE,
  };
})();
