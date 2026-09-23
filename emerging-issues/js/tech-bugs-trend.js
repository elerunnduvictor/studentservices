/* ═══════════════════════════════════════════════════════════════════════════
   TECHNICAL BUGS BACKLOG — THE LINES OVER TIME

   Line graphs for the second tab of the Emerging Issues page, drawn from
   tech_bug_history, which every run of supabase/tech-bugs.sql adds a capture
   to. The grouping is done in the database by tech_bug_trend(grain, since)
   — see supabase/tech-bug-trend.sql — so the page receives one row per point
   on the chart however long the record grows.

   ── what the reader chooses ──────────────────────────────────────────────
   How far back (7 days … everything on record) and how coarse each point is
   (a day, a week, a month). A point is always a real capture: the latest one
   inside that day, week or month, labelled with its own date. Nothing is
   averaged.

   ── stocks and flows ─────────────────────────────────────────────────────
   Three panels, one unit each, because a count of what stands cannot share an
   axis with a count of what changed without flattening one of them:

     · Open backlog — where the backlog stood at each point.
     · Resolved and Removed — how many bugs left the backlog between one point
       and the next. The tracker's Closed and Removed sheets are archives that
       only climb, so drawing them said nothing; the database turns them into
       per-period figures, counting the "Resolved This Week" staging list
       alongside the Closed archive so a bug counts once, the day it leaves.
     · Total weighted score — the weight carried by the open backlog.

   ── in each product's header ─────────────────────────────────────────────
   That product's own line, in the colour of the section being read, on the
   same axis as every other product's so they read down the page together.

   ── the drawing rules ──
   Lines 2px with round joins; end-dots 8px with a 2px ring in the card's
   colour; a 10% wash under a single line; hairline solid gridlines; values
   written in ink, never in a line's colour, beside a short key in its colour.
   A legend always, for more than one line. Hover finds the point, not the
   line, and one readout lists every line there; the arrow keys do the same.
   Time is to scale, so a gap in the record shows as a gap. Axes start at zero
   unless a figure goes below it.

   The section colours are the Bridge's own red, teal, gold and purple,
   stepped until they passed the palette validator in light and in dark. See
   --tr-* in emerging-issues.css.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const LONG = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  const dayOf = (v) => { const s = String(v || "").slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ""; };
  const ms = (iso) => Date.parse(iso + "T00:00:00Z");
  const short = (iso) => SHORT.format(new Date(ms(iso)));
  const long = (iso) => LONG.format(new Date(ms(iso)));
  const fmt = (n) => (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 1 });
  const fmtAxis = (v) => Math.abs(v) >= 10000 ? fmt(v / 1000) + "k" : fmt(v);
  const plural = (n, one, many) => fmt(n) + " " + (Math.abs(n) === 1 ? one : many);

  /* ── what the reader can ask for ──────────────────────────────────────────
     A range, and how coarse its points are. Grains that would leave fewer
     than two points in a range are not offered for it: a month has nothing
     to say about seven days. */
  const RANGES = [
    { id: "7d",  label: "7 days",   days: 7,   grains: ["day"] },
    { id: "30d", label: "30 days",  days: 30,  grains: ["day", "week"] },
    { id: "90d", label: "90 days",  days: 90,  grains: ["day", "week", "month"] },
    { id: "6m",  label: "6 months", days: 182, grains: ["week", "month"] },
    { id: "1y",  label: "1 year",   days: 365, grains: ["week", "month"] },
    { id: "all", label: "All",      days: null, grains: ["day", "week", "month"] },
  ];
  const GRAINS = [
    { id: "day",   label: "Day",   one: "day",   many: "days",   before: "the day before",   point: "day" },
    { id: "week",  label: "Week",  one: "week",  many: "weeks",  before: "the week before",  point: "week" },
    { id: "month", label: "Month", one: "month", many: "months", before: "the month before", point: "month" },
  ];
  const rangeOf = (id) => RANGES.find((r) => r.id === id) || RANGES[2];
  const grainOf = (id) => GRAINS.find((g) => g.id === id) || GRAINS[1];
  const DEFAULTS = { range: "90d", grain: "week" };

  /** The earliest capture a range wants, as a plain day, or null for all. */
  function since(rangeId, today) {
    const r = rangeOf(rangeId);
    if (!r.days) return null;
    const t = today ? ms(today) : Date.now();
    return new Date(t - (r.days - 1) * 86400000).toISOString().slice(0, 10);
  }

  /* The three panels' colours. Resolved takes the teal the Closed archive
     used to carry, since it is mostly that archive's growth. */
  const OPEN = { key: "open", label: "Open backlog", short: "Open", color: "var(--tr-open)" };
  const RESOLVED = { key: "resolvedFlow", label: "Resolved", short: "Resolved", color: "var(--tr-closed)" };
  const REMOVED = { key: "removedFlow", label: "Removed", short: "Removed", color: "var(--tr-removed)" };

  /* Each product's line follows the section the reader is in, in that
     section's colour. */
  const SECTIONS = [
    { id: "active",   color: "var(--tr-open)",     line: "Open bugs",   one: "open bug",     many: "open bugs" },
    { id: "closed",   color: "var(--tr-closed)",   line: "Closed bugs", one: "closed bug",   many: "closed bugs" },
    { id: "resolved", color: "var(--tr-resolved)", line: "Resolved",    one: "bug resolved", many: "bugs resolved" },
    { id: "removed",  color: "var(--tr-removed)",  line: "Removed bugs", one: "removed bug", many: "removed bugs" },
  ];
  const sectionOf = (id) => SECTIONS.find((s) => s.id === id) || SECTIONS[0];

  /* ── the points ───────────────────────────────────────────────────────────
     One object per point on the chart, whether the database grouped them or
     this file had to. */
  const num = (v) => (v == null || v === "" ? null : Number(v));

  /** tech_bug_trend()'s rows, which already carry a point each. */
  function fromRpc(rows) {
    return (rows || []).map((r) => ({
      day: dayOf(r.bucket),
      open: num(r.open_bugs) || 0,
      score: num(r.open_score) || 0,
      scored: num(r.open_scored) || 0,
      closed: num(r.closed_total) || 0,
      removed: num(r.removed_total) || 0,
      listed: num(r.resolved_listed) || 0,
      resolvedFlow: num(r.resolved_flow),
      removedFlow: num(r.removed_flow),
      products: r.products || {},
    })).filter((p) => p.day).sort((a, b) => a.day.localeCompare(b.day));
  }

  /** The same, worked out here from raw tech_bug_history rows — the path
      taken before supabase/tech-bug-trend.sql has been run. */
  function fromHistory(rows, grainId, sinceDay) {
    const byDay = new Map();
    (rows || []).forEach((r) => {
      const d = dayOf(r.captured_on);
      if (!d) return;
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d).push(r);
    });
    // The latest capture in each day, week or month.
    const key = (d) => {
      if (grainId === "day") return d;
      if (grainId === "month") return d.slice(0, 7);
      const t = new Date(ms(d));
      t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));   // back to Monday
      return t.toISOString().slice(0, 10);
    };
    const picked = new Map();
    [...byDay.keys()].sort().forEach((d) => { picked.set(key(d), d); });

    const points = [...picked.values()].sort().map((d) => {
      const mine = byDay.get(d);
      const sum = (section, field) => mine.filter((r) => r.section === section)
        .reduce((a, r) => a + (Number(r[field]) || 0), 0);
      const products = {};
      mine.forEach((r) => {
        const p = products[r.product] = products[r.product] || { label: r.product_label || r.product, sections: {} };
        p.sections[r.section] = [Number(r.bugs) || 0, Number(r.scored) || 0, Number(r.score_total) || 0];
      });
      return { day: d, open: sum("active", "bugs"), score: sum("active", "score_total"),
               scored: sum("active", "scored"), closed: sum("closed", "bugs"),
               removed: sum("removed", "bugs"), listed: sum("resolved", "bugs"),
               resolvedFlow: null, removedFlow: null, products };
    });
    // The flows, from one point to the next.
    points.forEach((p, i) => {
      if (!i) return;
      const was = points[i - 1];
      p.resolvedFlow = (p.closed + p.listed) - (was.closed + was.listed);
      p.removedFlow = p.removed - was.removed;
    });
    return sinceDay ? points.filter((p) => p.day >= sinceDay) : points;
  }

  /* Round steps — 1, 2, 2.5, 5 — so the gridlines land on numbers a person
     would pick, about three to a short panel. */
  function niceStep(raw) {
    if (!(raw > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  /* Zero is always on the axis; a figure below it (bugs coming back out of an
     archive) pulls the axis down rather than being clipped. */
  function yScale(values, integers) {
    const seen = values.filter((v) => v != null);
    const hi = Math.max(0, ...seen), lo = Math.min(0, ...seen);
    let step = niceStep((hi - lo || 1) / 3);
    if (integers) step = Math.max(1, Math.round(step));
    const top = Math.max(step, Math.ceil(hi / step) * step);
    const bottom = Math.min(0, Math.floor(lo / step) * step);
    const ticks = [];
    for (let v = bottom; v <= top + 1e-9; v += step) ticks.push(v);
    return { top, bottom, ticks };
  }

  const P = (n) => n.toFixed(1);
  function pathOf(pts) {
    let d = "", pen = false;
    pts.forEach((p) => {
      if (!p) { pen = false; return; }
      d += (pen ? "L" : "M") + P(p[0]) + " " + P(p[1]);
      pen = true;
    });
    return d;
  }
  function areaOf(pts, base) {
    let d = "", run = [];
    const flush = () => {
      if (run.length > 1) {
        d += "M" + P(run[0][0]) + " " + P(base) +
             run.map((p) => "L" + P(p[0]) + " " + P(p[1])).join("") +
             "L" + P(run[run.length - 1][0]) + " " + P(base) + "Z";
      }
      run = [];
    };
    pts.forEach((p) => { if (p) run.push(p); else flush(); });
    flush();
    return d;
  }
  const lastIndex = (values) => { for (let i = values.length - 1; i >= 0; i--) if (values[i] != null) return i; return -1; };

  /* How far a figure moved from the point before, as an arrow and words. Only
     the open backlog and its weight say whether that is good or bad. */
  function change(d, { worseUp, one, many, since: sinceLabel, compact }) {
    if (d == null) return "";
    if (!d) {
      return `<span class="tr-d is-flat" title="${esc(`No change since ${sinceLabel}`)}">` +
             `${compact ? "no change" : `No change since ${esc(sinceLabel)}`}</span>`;
    }
    const up = d > 0;
    const tone = worseUp ? (up ? " is-worse" : " is-better") : "";
    const n = Math.abs(d);
    const what = one ? plural(n, one, many) : fmt(n);
    return `<span class="tr-d${up ? " is-up" : " is-down"}${tone}" ` +
             `title="${esc(`${up ? "Up" : "Down"} ${what} since ${sinceLabel}`)}">` +
             `<span aria-hidden="true">${up ? "▲" : "▼"}</span><span class="tr-vh">${up ? "up" : "down"}</span> ` +
             `${fmt(n)}${compact ? "" : ` <span class="tr-d-w">since ${esc(sinceLabel)}</span>`}</span>`;
  }

  /* ── one panel ───────────────────────────────────────────────────────────
     Drawn at the width it is given, in pixels, so the text stays text-sized
     at every width; redrawn when the window changes. */
  function plot(el, cfg) {
    const W = Math.max(240, Math.floor(el.clientWidth || 420));
    const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
    // Three panels stack on a phone, so each is shorter there than it would
    // be beside the others.
    const H = mq("(max-width: 480px)") ? 112 : mq("(max-width: 780px)") ? 130 : 160;
    const endW = cfg.endWidth || 0;
    const m = { l: 40, r: 14 + endW, t: 10, b: 24 };
    const iw = Math.max(40, W - m.l - m.r), ih = H - m.t - m.b;
    const days = cfg.days, n = days.length;
    const t0 = ms(days[0]), t1 = ms(days[n - 1]);
    const x = (i) => n === 1 ? m.l + iw : m.l + ((ms(days[i]) - t0) / (t1 - t0 || 1)) * iw;
    const { top, bottom, ticks } = yScale(cfg.series.flatMap((s) => s.values), cfg.integers);
    const span = top - bottom || 1;
    const y = (v) => m.t + ih - ((v - bottom) / span) * ih;

    const grid = ticks.map((v) =>
      `<line class="tr-grid${v === 0 && bottom < 0 ? " is-zero" : ""}" x1="${m.l}" x2="${m.l + iw}" y1="${P(y(v))}" y2="${P(y(v))}"/>` +
      `<text class="tr-ytick" x="${m.l - 7}" y="${P(y(v) + 3.5)}">${esc(fmtAxis(v))}</text>`).join("");

    // The latest point always labelled, then working back while there is room;
    // the first point takes the place of whichever label would crowd it.
    const room = cfg.grain === "month" ? 62 : 54;
    const label = (i) => cfg.grain === "month" ? MONTH.format(new Date(ms(days[i]))) : short(days[i]);
    const marked = [n - 1];
    for (let i = n - 2; i >= 0; i--) {
      if (x(marked[marked.length - 1]) - x(i) >= room) marked.push(i);
    }
    if (n > 1 && marked[marked.length - 1] !== 0) {
      if (x(marked[marked.length - 1]) - x(0) < room && marked.length > 1) marked.pop();
      if (x(marked[marked.length - 1]) - x(0) >= room) marked.push(0);
    }
    const xticks = marked.map((i) =>
      `<text class="tr-xtick" x="${P(x(i))}" y="${H - 6}" text-anchor="middle">${esc(label(i))}</text>`).join("");

    const dots = n <= 20;
    const lines = cfg.series.map((s) => {
      const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)]));
      const last = lastIndex(s.values);
      const area = cfg.series.length === 1 ? `<path class="tr-area" d="${areaOf(pts, y(0))}" style="fill:${s.color}"/>` : "";
      const line = `<path class="tr-line" pathLength="1" d="${pathOf(pts)}" style="stroke:${s.color}"/>`;
      const marks = pts.map((p, i) => (!p || (!dots && i !== last)) ? "" :
        `<circle class="tr-dot" data-i="${i}" cx="${P(p[0])}" cy="${P(p[1])}" r="4" style="fill:${s.color}"/>`).join("");
      return area + line + marks;
    }).join("");

    // Where each line ends: its latest figure and its name, in ink, beside a
    // short key in its colour. Labels that would sit on each other are spread
    // apart and tied back with a thin leader.
    let ends = "";
    if (endW) {
      const items = cfg.series.map((s) => {
        const i = lastIndex(s.values);
        return i < 0 ? null : { s, i, v: s.values[i], py: y(s.values[i]), ly: y(s.values[i]) };
      }).filter(Boolean).sort((a, b) => a.py - b.py);
      const gap = 15;
      items.forEach((it, k) => { if (k && it.ly < items[k - 1].ly + gap) it.ly = items[k - 1].ly + gap; });
      const over = items.length ? items[items.length - 1].ly - (m.t + ih) : 0;
      if (over > 0) items.forEach((it) => { it.ly -= over; });
      for (let k = items.length - 2; k >= 0; k--) {
        if (items[k].ly > items[k + 1].ly - gap) items[k].ly = items[k + 1].ly - gap;
      }
      const lx = m.l + iw + 14;
      ends = items.map((it) => {
        const px = x(it.i);
        const moved = Math.abs(it.ly - it.py) > 1.5 || px < m.l + iw - 1;
        return (moved ? `<path class="tr-leader" d="M${P(px + 6)} ${P(it.py)}L${P(lx - 3)} ${P(it.ly)}"/>` : "") +
          `<line class="tr-key" x1="${lx}" x2="${lx + 9}" y1="${P(it.ly)}" y2="${P(it.ly)}" style="stroke:${it.s.color}"/>` +
          `<text class="tr-end" x="${lx + 14}" y="${P(it.ly + 4)}"><tspan class="tr-end-v">${esc(fmt(it.v))}</tspan>` +
          `${it.s.short ? " " + esc(it.s.short) : ""}</text>`;
      }).join("");
    }

    el.innerHTML =
      `<svg class="tr-svg${cfg.animate ? " tr-anim" : ""}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">` +
        grid + xticks + lines + ends +
        `<line class="tr-cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>` +
        `<rect class="tr-hit" x="${m.l - 12}" y="0" width="${iw + 24}" height="${H}" fill="transparent"/>` +
      `</svg>` +
      `<div class="tr-tip" hidden></div>`;

    // ── hover, touch and keyboard: find the point, read every line there ──
    const svg = el.querySelector("svg"), cross = el.querySelector(".tr-cross"), tip = el.querySelector(".tr-tip");
    let at = -1;
    function show(i) {
      at = Math.max(0, Math.min(n - 1, i));
      const cx = x(at);
      cross.setAttribute("x1", P(cx)); cross.setAttribute("x2", P(cx));
      cross.setAttribute("visibility", "visible");
      svg.querySelectorAll(".tr-dot").forEach((d) => d.classList.toggle("is-hot", Number(d.dataset.i) === at));
      tip.innerHTML = cfg.tip(at);
      tip.hidden = false;
      const tw = tip.offsetWidth;
      tip.style.left = Math.max(0, cx + 12 + tw > m.l + iw ? cx - 12 - tw : cx + 12) + "px";
      tip.style.top = m.t + "px";
    }
    function hide() {
      at = -1;
      cross.setAttribute("visibility", "hidden");
      svg.querySelectorAll(".tr-dot.is-hot").forEach((d) => d.classList.remove("is-hot"));
      tip.hidden = true;
    }
    function nearest(clientX) {
      const px = clientX - svg.getBoundingClientRect().left;
      let best = 0, dist = Infinity;
      for (let i = 0; i < n; i++) { const dd = Math.abs(x(i) - px); if (dd < dist) { dist = dd; best = i; } }
      return best;
    }
    const hit = el.querySelector(".tr-hit");
    hit.addEventListener("pointermove", (e) => show(nearest(e.clientX)));
    hit.addEventListener("pointerdown", (e) => show(nearest(e.clientX)));
    hit.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
    el._hide = hide;
    el._show = () => show(at < 0 ? n - 1 : at);
    el._key = (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        show((at < 0 ? n - 1 : at) + (e.key === "ArrowRight" ? 1 : -1));
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        show(e.key === "Home" ? 0 : n - 1);
      } else if (e.key === "Escape") { hide(); }
    };
    if (!el._wired) {
      el._wired = true;
      el.addEventListener("focus", () => el._show());
      el.addEventListener("blur", () => el._hide());
      el.addEventListener("keydown", (e) => el._key(e));
      document.addEventListener("pointerdown", (e) => { if (!el.contains(e.target)) el._hide(); });
    }
  }

  /* ── the card ─────────────────────────────────────────────────────────── */
  function controls(range, grain) {
    const allowed = rangeOf(range).grains;
    const btn = (kind, id, label, on, off, why) =>
      `<button type="button" class="tr-btn${on ? " is-on" : ""}" data-${kind}="${id}"
               aria-pressed="${on}"${off ? ` disabled title="${esc(why)}"` : ""}>${esc(label)}</button>`;
    return `
      <div class="tr-picks">
        <div class="tr-pick" role="group" aria-label="How far back">
          ${RANGES.map((r) => btn("range", r.id, r.label, r.id === range, false, "")).join("")}
        </div>
        <div class="tr-pick" role="group" aria-label="A point every">
          <span class="tr-pick-l">Point every</span>
          ${GRAINS.map((g) => btn("grain", g.id, g.label, g.id === grain,
              allowed.indexOf(g.id) < 0, `${g.label} needs a longer range than ${rangeOf(range).label}`)).join("")}
        </div>
      </div>`;
  }

  /* ── a card: a title, the picker, panels side by side, and the numbers ──
     Both tabs draw one of these. A panel is {id, legend, series, tip} and
     carries one unit; the picker is the same on both, so "this week" cannot
     mean two different things on one page. */
  function renderCard(host, o) {
    const grain = grainOf(o.grain), range = rangeOf(o.range);
    host.innerHTML = `
      <div class="tr-head">
        <h3 class="tr-title">${esc(o.title)}</h3>
        <p class="tr-sub">${o.sub}</p>
        ${o.tables ? `<button type="button" class="tr-more" aria-expanded="false">See the numbers</button>` : ""}
      </div>
      ${controls(range.id, grain.id)}
      <div class="tr-panels">
        ${o.panels.map((pl) => `
          <div class="tr-panel">
            <ul class="tr-legend" aria-label="${esc(pl.about || pl.title || "")}">${pl.legend}</ul>
            <div class="tr-plot" id="${pl.id}" tabindex="0" role="group" aria-roledescription="chart"
                 aria-label="${esc(pl.aria || "")}"></div>
          </div>`).join("")}
      </div>
      ${o.after || ""}
      ${o.tables ? `<div class="tr-tables" hidden>${o.tables}</div>` : ""}`;
    host.hidden = false;

    const more = host.querySelector(".tr-more"), tables = host.querySelector(".tr-tables");
    if (more && tables) {
      more.addEventListener("click", () => {
        const open = tables.hidden;
        tables.hidden = !open;
        more.setAttribute("aria-expanded", String(open));
        more.textContent = open ? "Hide the numbers" : "See the numbers";
      });
    }
    if (o.onChange) {
      host.querySelectorAll("[data-range], [data-grain]").forEach((b) => {
        b.addEventListener("click", () => {
          if (!b.disabled) o.onChange(b.dataset.range ? { range: b.dataset.range } : { grain: b.dataset.grain });
        });
      });
    }
    const draw = (animate) => o.panels.forEach((pl) => {
      const el = host.querySelector("#" + pl.id);
      if (el) plot(el, { days: o.days, grain: grain.id, integers: pl.integers !== false,
                         endWidth: pl.endWidth || 96, series: pl.series, tip: pl.tip, animate: !!animate });
    });
    draw(o.animate);
    host._redraw = () => draw(false);
  }

  /* A figure in a legend: its key, its name, where it stands and how it
     moved. */
  function legendRow(s, value, delta, note) {
    return `
      <li class="tr-lg">
        <i class="tr-lg-key" style="--c:${s.color}" aria-hidden="true"></i>
        <span class="tr-lg-name">${esc(s.label)}</span>
        <b class="tr-lg-n">${value == null ? "—" : fmt(value)}</b>
        ${delta || ""}${note ? `<span class="tr-lg-note">${esc(note)}</span>` : ""}
      </li>`;
  }

  /* ── the backlog's card ───────────────────────────────────────────────── */
  function renderMain(host, points, opts) {
    const o = opts || {};
    const grain = grainOf(o.grain);
    if (!points || !points.length) { host.hidden = true; host.innerHTML = ""; host._redraw = null; return; }
    const days = points.map((p) => p.day), n = points.length;
    const now = points[n - 1], prev = n > 1 ? points[n - 2] : null;
    const sinceLabel = prev ? (grain.id === "month" ? MONTH.format(new Date(ms(prev.day))) : short(prev.day)) : "";
    const pointName = (d) => grain.id === "month" ? MONTH.format(new Date(ms(d))) : long(d);

    const row = (s, value, extra) =>
      `<span class="tr-tip-row"><i style="background:${s.color}"></i>${esc(s.label)}` +
      `<b>${value == null ? "—" : fmt(value)}</b></span>` + (extra || "");
    const head = (i) => `<b>${esc(pointName(points[i].day))}</b>`;

    const rows = points.slice().reverse();
    const recent = points.slice(-8).reverse();
    const prods = {};
    points.forEach((p) => Object.entries(p.products || {}).forEach(([k, v]) => { prods[k] = v.label || k; }));

    renderCard(host, {
      title: "The backlog over time",
      sub: `<b>${plural(n, grain.one, grain.many)}</b> shown · arrows compare with ${esc(grain.before)}`,
      range: o.range, grain: o.grain, onChange: o.onChange, animate: o.animate, days,
      panels: [
        { id: "trOpen", about: "Where the backlog stands", endWidth: 96,
          legend: legendRow(OPEN, now.open,
            prev ? change(now.open - prev.open, { worseUp: true, one: "open bug", many: "open bugs", since: sinceLabel, compact: true }) : ""),
          aria: `Open backlog, ${plural(n, grain.one, grain.many)}. Latest, ${pointName(now.day)}: ${fmt(now.open)} open bugs. Arrow keys move between points.`,
          series: [{ label: OPEN.label, short: OPEN.short, color: OPEN.color, values: points.map((p) => p.open) }],
          tip: (i) => head(i) + row(OPEN, points[i].open) +
            `<span class="tr-tip-sub">${fmt(points[i].closed)} closed and ${fmt(points[i].removed)} removed to date</span>` },
        { id: "trFlow", about: "What left the backlog", endWidth: 104,
          legend:
            legendRow(RESOLVED, now.resolvedFlow,
              prev && prev.resolvedFlow != null && now.resolvedFlow != null
                ? change(now.resolvedFlow - prev.resolvedFlow, { since: sinceLabel, compact: true }) : "") +
            legendRow(REMOVED, now.removedFlow,
              prev && prev.removedFlow != null && now.removedFlow != null
                ? change(now.removedFlow - prev.removedFlow, { since: sinceLabel, compact: true }) : ""),
          aria: `Bugs that left the backlog in each ${grain.one}. Latest, ${pointName(now.day)}: ${fmt(now.resolvedFlow)} resolved, ${fmt(now.removedFlow)} removed. Arrow keys move between points.`,
          series: [{ label: RESOLVED.label, short: RESOLVED.short, color: RESOLVED.color, values: points.map((p) => p.resolvedFlow) },
                   { label: REMOVED.label, short: REMOVED.short, color: REMOVED.color, values: points.map((p) => p.removedFlow) }],
          tip: (i) => head(i) + row(RESOLVED, points[i].resolvedFlow) + row(REMOVED, points[i].removedFlow) +
            (i ? `<span class="tr-tip-sub">since ${esc(short(points[i - 1].day))}</span>`
               : `<span class="tr-tip-sub">no earlier capture to compare with</span>`) },
        { id: "trScore", about: "The weight on the backlog", endWidth: 58, integers: false,
          legend: legendRow({ label: "Weighted score", color: OPEN.color }, now.score,
            prev ? change(now.score - prev.score, { worseUp: true, since: sinceLabel, compact: true }) : "",
            `${fmt(now.scored)} of ${fmt(now.open)} scored`),
          aria: `Total weighted score of the open backlog. Latest, ${pointName(now.day)}: ${fmt(now.score)}. Arrow keys move between points.`,
          series: [{ label: "Weighted score", short: "", color: OPEN.color, values: points.map((p) => p.score) }],
          tip: (i) => head(i) + row({ label: "Weighted score", color: OPEN.color }, points[i].score) +
            `<span class="tr-tip-sub">${fmt(points[i].scored)} of ${plural(points[i].open, "open bug", "open bugs")} scored</span>` },
      ],
      tables: `
        <div class="tr-table-wrap">
          <table>
            <caption>Every point shown, newest first</caption>
            <thead><tr><th scope="col">Point</th><th scope="col">Open backlog</th>
              <th scope="col">Resolved</th><th scope="col">Removed</th>
              <th scope="col">Weighted score, open</th>
              <th scope="col">Closed to date</th><th scope="col">Removed to date</th></tr></thead>
            <tbody>${rows.map((p) => `<tr><th scope="row">${esc(long(p.day))}</th>
              <td>${fmt(p.open)}</td><td>${p.resolvedFlow == null ? "—" : fmt(p.resolvedFlow)}</td>
              <td>${p.removedFlow == null ? "—" : fmt(p.removedFlow)}</td>
              <td>${fmt(p.score)}</td><td>${fmt(p.closed)}</td><td>${fmt(p.removed)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
        <div class="tr-table-wrap">
          <table class="is-products">
            <caption>Open bugs in each product, with their total weighted score beneath${n > 8 ? " — the latest eight points" : ""}</caption>
            <thead><tr><th scope="col">Product</th>${recent.map((p) => `<th scope="col">${esc(long(p.day))}</th>`).join("")}</tr></thead>
            <tbody>${Object.keys(prods).map((k) => `<tr><th scope="row">${esc(prods[k])}</th>${recent.map((p) => {
              const c = p.products && p.products[k] && p.products[k].sections && p.products[k].sections.active;
              return c ? `<td><b>${fmt(c[0])}</b><small>${c[1] ? fmt(c[2]) : "not scored"}</small></td>` : `<td class="is-none">—</td>`;
            }).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>`,
    });
  }

  /* ── the Top 10 tab's card ───────────────────────────────────────────────
     Its points are captures of the heaviest bugs themselves, so it can draw
     what counts alone cannot: the weight the ten carry, the score it takes to
     get in, and how many of the ten are new. */
  const TEN = 10;
  const tenOf = (p) => (p.top || []).filter((b) => b.rank <= TEN);
  const weightOf = (p) => tenOf(p).reduce((a, b) => a + (Number(b.score) || 0), 0);
  const atRank = (p, rank) => {
    const b = (p.top || []).find((x) => x.rank === rank);
    return b ? Number(b.score) : null;
  };
  /** Bugs in this point's ten that were not in the one before's. */
  function entrants(p, was) {
    if (!was) return null;
    const had = new Set(tenOf(was).map((b) => b.key));
    return tenOf(p).filter((b) => !had.has(b.key));
  }
  function leavers(p, was) {
    if (!was) return [];
    const has = new Set(tenOf(p).map((b) => b.key));
    return tenOf(was).filter((b) => !has.has(b.key));
  }
  /** How long a bug has been in the ten, in points and in days. */
  function tenure(points, key) {
    let since = null;
    for (let i = points.length - 1; i >= 0; i--) {
      if (tenOf(points[i]).some((b) => b.key === key)) since = points[i].day; else break;
    }
    return since;
  }

  const WEIGHT = { label: "Weight the ten carry", short: "Weight", color: "var(--tr-open)" };
  const CUTOFF = { label: "Tenth place", short: "10th", color: "var(--tr-resolved)" };
  const HEAVIEST = { label: "The heaviest", short: "1st", color: "var(--tr-open)" };
  const CHURN = { label: "New in the ten", short: "New", color: "var(--tr-closed)" };

  function renderTop(host, points, opts) {
    const o = opts || {};
    const grain = grainOf(o.grain);
    if (!points || !points.length) { host.hidden = true; host.innerHTML = ""; host._redraw = null; return; }
    const days = points.map((p) => p.day), n = points.length;
    const now = points[n - 1], prev = n > 1 ? points[n - 2] : null;
    const sinceLabel = prev ? (grain.id === "month" ? MONTH.format(new Date(ms(prev.day))) : short(prev.day)) : "";
    const pointName = (d) => grain.id === "month" ? MONTH.format(new Date(ms(d))) : long(d);
    const churn = points.map((p, i) => { const e = entrants(p, i ? points[i - 1] : null); return e ? e.length : null; });

    const row = (s, value, extra) =>
      `<span class="tr-tip-row"><i style="background:${s.color}"></i>${esc(s.label)}` +
      `<b>${value == null ? "—" : fmt(value)}</b></span>` + (extra || "");
    const head = (i) => `<b>${esc(pointName(points[i].day))}</b>`;
    const named = (list) => list.length
      ? list.map((b) => `${b.label}: ${b.title}`).join("; ")
      : "none";

    renderCard(host, {
      title: "The top ten over time",
      sub: `<b>${plural(n, grain.one, grain.many)}</b> shown · arrows compare with ${esc(grain.before)}`,
      range: o.range, grain: o.grain, onChange: o.onChange, animate: o.animate, days,
      panels: [
        { id: "ttWeight", about: "The weight the ten carry", endWidth: 70, integers: false,
          legend: legendRow(WEIGHT, weightOf(now),
            prev ? change(weightOf(now) - weightOf(prev), { worseUp: true, since: sinceLabel, compact: true }) : "",
            o.shareNote || ""),
          aria: `Weighted score of the top ten added together, ${plural(n, grain.one, grain.many)}. Latest, ${pointName(now.day)}: ${fmt(weightOf(now))}. Arrow keys move between points.`,
          series: [{ label: WEIGHT.label, short: WEIGHT.short, color: WEIGHT.color, values: points.map(weightOf) }],
          tip: (i) => head(i) + row(WEIGHT, weightOf(points[i])) +
            `<span class="tr-tip-sub">${fmt(tenOf(points[i]).length)} bugs, heaviest ${fmt(atRank(points[i], 1))}</span>` },
        { id: "ttBar", about: "What it takes to be in the ten", endWidth: 82,
          legend:
            legendRow(HEAVIEST, atRank(now, 1),
              prev ? change(atRank(now, 1) - atRank(prev, 1), { worseUp: true, since: sinceLabel, compact: true }) : "") +
            legendRow(CUTOFF, atRank(now, TEN),
              prev && atRank(prev, TEN) != null ? change(atRank(now, TEN) - atRank(prev, TEN), { worseUp: true, since: sinceLabel, compact: true }) : ""),
          aria: `The heaviest bug's score and the tenth place score. Latest, ${pointName(now.day)}: heaviest ${fmt(atRank(now, 1))}, tenth ${fmt(atRank(now, TEN))}. Arrow keys move between points.`,
          series: [{ label: HEAVIEST.label, short: HEAVIEST.short, color: HEAVIEST.color, values: points.map((p) => atRank(p, 1)) },
                   { label: CUTOFF.label, short: CUTOFF.short, color: CUTOFF.color, values: points.map((p) => atRank(p, TEN)) }],
          tip: (i) => head(i) + row(HEAVIEST, atRank(points[i], 1)) + row(CUTOFF, atRank(points[i], TEN)) +
            `<span class="tr-tip-sub">a bug had to score ${fmt(atRank(points[i], TEN))} to be in the ten</span>` },
        { id: "ttChurn", about: "How much the ten changes", endWidth: 74,
          legend: legendRow(CHURN, churn[n - 1],
            prev && churn[n - 2] != null && churn[n - 1] != null
              ? change(churn[n - 1] - churn[n - 2], { since: sinceLabel, compact: true }) : "",
            prev ? `${fmt(leavers(now, prev).length)} dropped out` : ""),
          aria: `How many of the top ten are new at each point. Latest, ${pointName(now.day)}: ${churn[n - 1] == null ? "no earlier capture" : fmt(churn[n - 1])}. Arrow keys move between points.`,
          series: [{ label: CHURN.label, short: CHURN.short, color: CHURN.color, values: churn }],
          tip: (i) => {
            const e = entrants(points[i], i ? points[i - 1] : null);
            const l = i ? leavers(points[i], points[i - 1]) : [];
            return head(i) + row(CHURN, e ? e.length : null) +
              (e ? `<span class="tr-tip-sub">in: ${esc(named(e))}</span>
                    <span class="tr-tip-sub">out: ${esc(named(l))}</span>`
                 : `<span class="tr-tip-sub">no earlier capture to compare with</span>`);
          } },
      ],
      after: o.after || "",
      tables: `
        <div class="tr-table-wrap">
          <table>
            <caption>The top ten at every point shown, newest first</caption>
            <thead><tr><th scope="col">Point</th><th scope="col">Weight the ten carry</th>
              <th scope="col">Heaviest</th><th scope="col">Tenth place</th>
              <th scope="col">New in the ten</th><th scope="col">Dropped out</th></tr></thead>
            <tbody>${points.slice().reverse().map((p, k, arr) => {
              const was = k + 1 < arr.length ? arr[k + 1] : null;
              const e = entrants(p, was), l = leavers(p, was);
              return `<tr><th scope="row">${esc(long(p.day))}</th><td>${fmt(weightOf(p))}</td>
                <td>${fmt(atRank(p, 1))}</td><td>${atRank(p, TEN) == null ? "—" : fmt(atRank(p, TEN))}</td>
                <td>${e ? fmt(e.length) : "—"}</td><td>${was ? fmt(l.length) : "—"}</td></tr>`;
            }).join("")}</tbody>
          </table>
        </div>`,
    });
  }

  /* ── a product's line, in its header ─────────────────────────────────────
     That product's own points, in the colour of the section being read; its
     own vertical scale, from zero. It stretches to whatever width the header
     gives it and stays 40px tall, so the drawing scales freely while the line
     keeps a 2px stroke and the dots stay round. */
  const SW = 240, SH = 40;
  const pctX = (v) => (v / SW * 100).toFixed(2) + "%";
  const pctY = (v) => (v / SH * 100).toFixed(2) + "%";
  function productSpark(points, product, section, metric, opts) {
    const s = sectionOf(section);
    const byScore = metric === "score";
    const cell = (p) => {
      const e = p.products && p.products[product];
      const arr = e && e.sections && e.sections[section];
      return arr ? { bugs: Number(arr[0]) || 0, scored: Number(arr[1]) || 0, score: Number(arr[2]) || 0 } : null;
    };
    const cells = points.map(cell);
    // A point with nothing scored has no score to draw — not a score of zero.
    const values = cells.map((c) => !c ? null : byScore ? (c.scored ? c.score : null) : c.bugs);
    const name = byScore ? "Weighted score" : s.line;
    const n = points.length;
    const have = values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
    const head = (right) => `<span class="tb-spark-top"><span class="tb-spark-l">${esc(name)}</span>${right}</span>`;

    if (!have.length) {
      return `<span class="tb-spark is-none" style="--c:${s.color}">${head("")}
                <span class="tb-spark-empty">${byScore ? "Nothing scored on record" : "Nothing on record"}</span></span>`;
    }

    const cur = values[n - 1], before = n > 1 ? values[n - 2] : undefined;
    let delta;
    if (n === 1) delta = `<span class="tr-d is-first">one point</span>`;
    else if (cur == null) delta = `<span class="tr-d is-flat">${byScore ? "not scored now" : "not listed now"}</span>`;
    else if (before == null) delta = `<span class="tr-d is-flat">new</span>`;
    else delta = change(cur - before, { worseUp: section === "active",
      one: byScore ? null : s.one, many: byScore ? null : s.many, since: short(points[n - 2].day) });

    const t0 = ms(points[0].day), t1 = ms(points[n - 1].day);
    const pl = 5, pr = 6, pt = 6, pb = 5;
    const x = (i) => n === 1 ? SW - pr : pl + ((ms(points[i].day) - t0) / (t1 - t0 || 1)) * (SW - pl - pr);
    const max = Math.max(...have.map((i) => values[i]));
    const top = max > 0 ? max : 1;
    const y = (v) => pt + (SH - pt - pb) * (1 - v / top);
    const xy = values.map((v, i) => (v == null ? null : [x(i), y(v)]));
    const last = have[have.length - 1];

    const tipOf = (i) => {
      const c = cells[i];
      return long(points[i].day) + " · " + (byScore
        ? `weighted score ${fmt(c.score)}` + (c.scored < c.bugs ? ` (${fmt(c.scored)} of ${fmt(c.bugs)} scored)` : "")
        : plural(c.bugs, s.one, s.many));
    };
    const bands = have.map((i, k) => {
      const left = k ? (x(have[k - 1]) + x(i)) / 2 : 0;
      const right = k < have.length - 1 ? (x(i) + x(have[k + 1])) / 2 : SW;
      return `<rect class="tb-spark-band" x="${P(left)}" y="0" width="${P(Math.max(1, right - left))}" height="${SH}" fill="transparent"
                data-cx="${P(xy[i][0])}" data-cy="${P(xy[i][1])}" data-tip="${esc(tipOf(i))}"/>`;
    }).join("");

    return `<span class="tb-spark" style="--c:${s.color}">${head(delta)}
      <span class="tb-spark-plot${opts && opts.animate ? " tr-anim" : ""}">
        <svg class="tb-spark-svg" viewBox="0 0 ${SW} ${SH}" preserveAspectRatio="none" aria-hidden="true">
          <line class="tb-spark-base" x1="${pl}" x2="${SW - pr}" y1="${P(y(0))}" y2="${P(y(0))}" vector-effect="non-scaling-stroke"/>
          <path class="tb-spark-area" d="${areaOf(xy, y(0))}"/>
          <path class="tb-spark-line" d="${pathOf(xy)}" vector-effect="non-scaling-stroke"/>
          ${bands}
        </svg>
        <i class="tb-spark-end" style="left:${pctX(xy[last][0])};top:${pctY(xy[last][1])}" aria-hidden="true"></i>
        <i class="tb-spark-hot" aria-hidden="true" hidden></i>
      </span></span>`;
  }

  /* One readout for every product line on the page, following the pointer
     from point to point. Wired once, to the container the compartments are
     drawn in, so redrawing them does not pile up listeners. */
  // BAND is the point the pointer is on, so a scroll can move the tip with it
  // rather than throwing it away.
  let TIP = null, HOT = null, BAND = null;
  function hideSparkTip() {
    if (TIP) TIP.hidden = true;
    if (HOT) { HOT.hidden = true; HOT = null; }
    BAND = null;
  }
  function wireSparks(root) {
    if (!root || root._sparks) return;
    root._sparks = true;
    TIP = document.createElement("div");
    TIP.className = "tb-spark-tip";
    TIP.hidden = true;
    TIP.setAttribute("aria-hidden", "true");     // the same figures are in the tables
    document.body.appendChild(TIP);
    /* The tip is positioned in viewport coordinates, so it has to be placed
       again whenever the page moves under it. */
    const place = (b) => {
      const plotEl = b.closest(".tb-spark-plot");
      if (!plotEl) return;
      const cx = Number(b.dataset.cx), cy = Number(b.dataset.cy);
      const r = plotEl.getBoundingClientRect(), k = r.width / SW;
      const px = r.left + cx * k, py = r.top + (cy / SH) * r.height;
      const tw = TIP.offsetWidth, th = TIP.offsetHeight;
      TIP.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, px - tw / 2)) + "px";
      TIP.style.top = (py - th - 12 < 8 ? py + 14 : py - th - 12) + "px";
    };

    root.addEventListener("pointerover", (e) => {
      const b = e.target.closest ? e.target.closest(".tb-spark-band") : null;
      if (!b) return;
      const plotEl = b.closest(".tb-spark-plot");
      const cx = Number(b.dataset.cx), cy = Number(b.dataset.cy);
      hideSparkTip();
      BAND = b;
      HOT = plotEl.querySelector(".tb-spark-hot");
      HOT.style.left = pctX(cx);
      HOT.style.top = pctY(cy);
      HOT.hidden = false;
      TIP.textContent = b.dataset.tip;
      TIP.hidden = false;
      place(b);
    });
    root.addEventListener("pointerout", (e) => {
      const b = e.target.closest ? e.target.closest(".tb-spark-band") : null;
      const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(".tb-spark-band") : null;
      if (b && !to) hideSparkTip();
    });
    /* Scrolling used to hide the tip outright, which is right when the reader
       has scrolled away from the line — and wrong in the case that actually
       happens: scrolling down to a product and reaching for its line while the
       page is still gliding. Trackpad momentum kept firing scroll events, so
       the tip was killed the instant it appeared and the line felt dead. While
       the pointer is still on a point, follow it instead. */
    window.addEventListener("scroll", () => {
      if (BAND && BAND.isConnected && !TIP.hidden) place(BAND);
      else hideSparkTip();
    }, { passive: true });
  }

  window.TBTrend = { RANGES, GRAINS, DEFAULTS, rangeOf, grainOf, since,
                     fromRpc, fromHistory, renderMain, renderTop, productSpark,
                     wireSparks, hideSparkTip,
                     top: { TEN, tenOf, weightOf, atRank, entrants, leavers, tenure } };
})();
