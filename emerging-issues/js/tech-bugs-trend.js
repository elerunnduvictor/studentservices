/* ═══════════════════════════════════════════════════════════════════════════
   TECHNICAL BUGS BACKLOG — THE LINES OVER TIME

   Longitudinal line graphs for the second tab of the Emerging Issues page,
   drawn from tech_bug_history: one row per weekly workbook, per product, per
   section (supabase/tech-bugs.sql writes it). Nothing here is fetched; the
   page hands these functions the rows and they return drawings.

   Two things are drawn:

     · The backlog, week by week — under the summary, kept short so it sits
       beside the page rather than taking it over. Two panels rather than one
       chart with two scales: the bug counts in each section on the left, the
       open backlog's total weighted score on the right. A count and a score
       on one axis would flatten one of them; on two axes it would invite
       comparing lines that do not share a unit.

     · A line in each product's header, in the gap between its counts and its
       total score — that product's own weeks, in the colour of the section
       being read, so the same colour means the same thing everywhere on the
       tab. Where it stands now is the dot; how far it moved since the week
       before is written above it.

   ── the drawing rules ──
   Lines 2px with round joins; end-dots 8px with a 2px ring in the card's
   colour so they read where lines cross; a 10% wash under a single line;
   hairline solid gridlines; every value written in ink, never in the line's
   colour, beside a short key that says which line it is. A legend always, for
   more than one line. Hover finds the week, not the line: a crosshair snaps to
   the nearest week and one readout lists every line there. The arrow keys do
   the same from the keyboard, and every value is in the tables behind "See
   the numbers", so nothing can only be reached by pointing.

   The four section colours are the Bridge's own red, teal, gold and purple,
   stepped until they passed the palette validator — lightness band, chroma,
   separation for colour-blind readers and for everyone, contrast against the
   card — in light and in dark. See --tr-* in emerging-issues.css.

   Time is to scale: weeks sit where their dates put them, so a missed week
   shows as a longer gap rather than being quietly closed up. Every axis starts
   at zero — a line that starts part-way up turns a small change into a cliff.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const LONG = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const dayOf = (v) => { const s = String(v || "").slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ""; };
  const ms = (iso) => Date.parse(iso + "T00:00:00Z");
  const short = (iso) => SHORT.format(new Date(ms(iso)));
  const long = (iso) => LONG.format(new Date(ms(iso)));
  const fmt = (n) => (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 1 });
  const fmtAxis = (v) => v >= 10000 ? fmt(v / 1000) + "k" : fmt(v);
  const plural = (n, one, many) => fmt(n) + " " + (n === 1 ? one : many);

  /* In palette order — the order the validator passed them in, which is what
     keeps neighbouring colours apart for colour-blind readers. */
  const SECTIONS = [
    { id: "active",   label: "Open backlog",       short: "Open",     color: "var(--tr-open)",
      line: "Open bugs",     one: "open bug",     many: "open bugs" },
    { id: "closed",   label: "Closed",             short: "Closed",   color: "var(--tr-closed)",
      line: "Closed bugs",   one: "closed bug",   many: "closed bugs" },
    { id: "resolved", label: "Resolved this week", short: "Resolved", color: "var(--tr-resolved)",
      line: "Resolved",      one: "bug resolved", many: "bugs resolved" },
    { id: "removed",  label: "Removed",            short: "Removed",  color: "var(--tr-removed)",
      line: "Removed bugs",  one: "removed bug",  many: "removed bugs" },
  ];
  const sectionOf = (id) => SECTIONS.find((s) => s.id === id) || SECTIONS[0];

  /* ── the numbers ─────────────────────────────────────────────────────────
     Indexed once per load: the weeks on record, what each product recorded
     in each of them, and the whole backlog's totals week by week. */
  const CACHE = new WeakMap();
  function index(history) {
    let ix = CACHE.get(history);
    if (ix) return ix;
    const at = new Map();          // "week|product" → { section: row }
    const prods = new Map();       // product → how it was last named and ordered
    const weekly = new Map();      // week → the whole backlog that week
    history.forEach((r) => {
      const w = dayOf(r.captured_on);
      if (!w) return;
      const k = w + "|" + r.product;
      if (!at.has(k)) at.set(k, {});
      at.get(k)[r.section] = r;
      const was = prods.get(r.product);
      if (!was || w >= was.week) {
        prods.set(r.product, { key: r.product, label: r.product_label, order: Number(r.product_order), week: w });
      }
      if (!weekly.has(w)) {
        const t = { week: w, score: 0, scored: 0 };
        SECTIONS.forEach((s) => { t[s.id] = 0; });
        weekly.set(w, t);
      }
      const t = weekly.get(w);
      if (t[r.section] != null) t[r.section] += Number(r.bugs) || 0;
      if (r.section === "active") {
        t.score += Number(r.score_total) || 0;
        t.scored += Number(r.scored) || 0;
      }
    });
    const weeks = [...weekly.keys()].sort();
    ix = {
      weeks, at,
      totals: weeks.map((w) => weekly.get(w)),
      products: [...prods.values()].sort((a, b) => a.order - b.order),
    };
    CACHE.set(history, ix);
    return ix;
  }

  /** One product, one section, every week on record: null where the product
      was not in that week's workbook at all; zeros where it was, with nothing
      in the section. */
  function productSeries(history, product, section) {
    const ix = index(history);
    return ix.weeks.map((w) => {
      const e = ix.at.get(w + "|" + product);
      if (!e) return null;
      const r = e[section];
      return { week: w, bugs: r ? Number(r.bugs) : 0,
               score: r ? Number(r.score_total) : 0, scored: r ? Number(r.scored) : 0 };
    });
  }

  /* Round steps — 1, 2, 2.5, 5 — so the gridlines land on numbers a person
     would pick. About three to the height: the charts are short, and more
     lines than that would crowd them. */
  function niceStep(raw) {
    if (!(raw > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  function yScale(max, integers) {
    let step = niceStep((max || 1) / 3);
    if (integers) step = Math.max(1, Math.round(step));
    const top = Math.max(step, Math.ceil((max || 1) / step) * step);
    const ticks = [];
    for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
    return { top, ticks };
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

  /* How far a line moved since the week before, as an arrow and words. Only
     the open backlog says whether that is good or bad — more open bugs, or
     more weight on them, is worse; the other sections are lists that grow as
     work gets done, so their arrows stay in ink. */
  function change(d, { worseUp, one, many, since, compact }) {
    if (!d) {
      return `<span class="tr-d is-flat" title="${esc(`No change since ${since}`)}">` +
             `${compact ? "no change" : `No change since ${esc(since)}`}</span>`;
    }
    const up = d > 0;
    const tone = worseUp ? (up ? " is-worse" : " is-better") : "";
    const n = Math.abs(d);
    const what = one ? plural(n, one, many) : fmt(n);
    return `<span class="tr-d${up ? " is-up" : " is-down"}${tone}" ` +
             `title="${esc(`${up ? "Up" : "Down"} ${what} since ${since}`)}">` +
             `<span aria-hidden="true">${up ? "▲" : "▼"}</span><span class="tr-vh">${up ? "up" : "down"}</span> ` +
             `${fmt(n)}${compact ? "" : ` <span class="tr-d-w">since ${esc(since)}</span>`}</span>`;
  }

  /* ── one panel ───────────────────────────────────────────────────────────
     Drawn at the width it is given, in pixels, so the text stays text-sized
     at every width; redrawn when the window changes. */
  function plot(el, cfg) {
    const W = Math.max(260, Math.floor(el.clientWidth || 600));
    // Short on purpose; shorter again where the two panels stack (the same
    // width as the stylesheet's), and shortest on a phone. Decided by the
    // screen, not the panel, so the two charts side by side always match.
    const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
    const H = mq("(max-width: 480px)") ? 130 : mq("(max-width: 780px)") ? 140 : 170;
    const endW = cfg.endWidth || 0;
    const m = { l: 44, r: 16 + endW, t: 10, b: 26 };
    const iw = Math.max(40, W - m.l - m.r), ih = H - m.t - m.b;
    const weeks = cfg.weeks, n = weeks.length;
    const t0 = ms(weeks[0]), t1 = ms(weeks[n - 1]);
    // One week on record sits at the right-hand edge, where the latest week
    // always sits; the weeks that follow will push it left.
    const x = (i) => n === 1 ? m.l + iw : m.l + ((ms(weeks[i]) - t0) / (t1 - t0)) * iw;
    const max = Math.max(0, ...cfg.series.flatMap((s) => s.values.filter((v) => v != null)));
    const { top, ticks } = yScale(max, cfg.integers);
    const y = (v) => m.t + ih - (v / top) * ih;

    const grid = ticks.map((v) =>
      `<line class="tr-grid" x1="${m.l}" x2="${m.l + iw}" y1="${P(y(v))}" y2="${P(y(v))}"/>` +
      `<text class="tr-ytick" x="${m.l - 8}" y="${P(y(v) + 3.5)}">${esc(fmtAxis(v))}</text>`).join("");

    // Week labels: the latest always, then working back, every week that
    // leaves room for its label — so weeks bunched together by the time
    // scale never print on top of each other. The first week is labelled
    // too, taking the place of whichever label would crowd it.
    const room = 54;
    const labelled = [n - 1];
    for (let i = n - 2; i >= 0; i--) {
      if (x(labelled[labelled.length - 1]) - x(i) >= room) labelled.push(i);
    }
    if (n > 1 && labelled[labelled.length - 1] !== 0) {
      if (x(labelled[labelled.length - 1]) - x(0) < room && labelled.length > 1) labelled.pop();
      if (x(labelled[labelled.length - 1]) - x(0) >= room) labelled.push(0);
    }
    const xticks = labelled.map((i) =>
      `<text class="tr-xtick" x="${P(x(i))}" y="${H - 6}" text-anchor="middle">${esc(short(weeks[i]))}</text>`).join("");

    const dots = n <= 16;
    const lines = cfg.series.map((s) => {
      const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)]));
      const last = lastIndex(s.values);
      const area = cfg.area ? `<path class="tr-area" d="${areaOf(pts, y(0))}" style="fill:${s.color}"/>` : "";
      const line = `<path class="tr-line" pathLength="1" d="${pathOf(pts)}" style="stroke:${s.color}"/>`;
      const marks = pts.map((p, i) => (!p || (!dots && i !== last)) ? "" :
        `<circle class="tr-dot${i === last ? " is-end" : ""}" data-i="${i}" cx="${P(p[0])}" cy="${P(p[1])}" r="4" style="fill:${s.color}"/>`).join("");
      return area + line + marks;
    }).join("");

    // Where each line ends: its latest value and its name, in ink, beside a
    // short key in its colour. Labels that would sit on each other are spread
    // apart and tied back to their line with a thin leader.
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
      const lx = m.l + iw + 16;
      ends = items.map((it) => {
        const px = x(it.i);
        const moved = Math.abs(it.ly - it.py) > 1.5 || px < m.l + iw - 1;
        return (moved ? `<path class="tr-leader" d="M${P(px + 6)} ${P(it.py)}L${P(lx - 3)} ${P(it.ly)}"/>` : "") +
          `<line class="tr-key" x1="${lx}" x2="${lx + 10}" y1="${P(it.ly)}" y2="${P(it.ly)}" style="stroke:${it.s.color}"/>` +
          `<text class="tr-end" x="${lx + 15}" y="${P(it.ly + 4)}"><tspan class="tr-end-v">${esc(cfg.format(it.v))}</tspan>` +
          `${it.s.short ? " " + esc(it.s.short) : ""}</text>`;
      }).join("");
    }

    el.innerHTML =
      `<svg class="tr-svg${cfg.animate ? " tr-anim" : ""}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">` +
        grid + xticks + lines + ends +
        `<line class="tr-cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>` +
        `<rect class="tr-hit" x="${m.l - 14}" y="0" width="${iw + 28}" height="${H}" fill="transparent"/>` +
      `</svg>` +
      `<div class="tr-tip" hidden></div>`;

    // ── hover, touch and keyboard: find the week, read every line there ──
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
      // To the right of the week, unless that would cover the labels at the
      // lines' ends; then to the left.
      const tw = tip.offsetWidth;
      tip.style.left = Math.max(0, cx + 14 + tw > m.l + iw ? cx - 14 - tw : cx + 14) + "px";
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
    // A mouse leaving hides the readout; a finger lifting leaves it up until
    // the next tap somewhere else.
    hit.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
    // The container outlives each drawing, so its listeners are added once
    // and always reach the latest drawing's functions.
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

  /* ── the backlog, week by week ─────────────────────────────────────────── */
  function renderMain(host, history, opts) {
    const ix = index(history);
    const rows = ix.totals;
    if (!rows.length) { host.hidden = true; host.innerHTML = ""; host._redraw = null; return; }
    const weeks = ix.weeks, n = weeks.length;
    const now = rows[n - 1], prev = n > 1 ? rows[n - 2] : null;
    const since = prev ? short(prev.week) : "";

    /* The legend is also the scoreboard: each section's colour, its name,
       where it stands this week and how far it moved from the last. */
    const legend = SECTIONS.map((s) => `
      <li class="tr-lg">
        <i class="tr-lg-key" style="--c:${s.color}" aria-hidden="true"></i>
        <span class="tr-lg-name"><span class="tr-full">${esc(s.label)}</span><span class="tr-short" aria-hidden="true">${esc(s.short)}</span></span>
        <b class="tr-lg-n">${fmt(now[s.id])}</b>
        ${prev ? change(now[s.id] - prev[s.id], { worseUp: s.id === "active", one: s.one, many: s.many, since, compact: true }) : ""}
      </li>`).join("");

    const recent = weeks.slice(-8).reverse();
    const byProduct = ix.products.map((p) => {
      const cells = recent.map((w) => {
        const e = ix.at.get(w + "|" + p.key);
        if (!e) return `<td class="is-none">—</td>`;
        const r = e.active;
        const bugs = r ? Number(r.bugs) : 0, scored = r ? Number(r.scored) : 0;
        return `<td><b>${fmt(bugs)}</b><small>${scored ? fmt(r.score_total) : "not scored"}</small></td>`;
      }).join("");
      return `<tr><th scope="row">${esc(p.label)}</th>${cells}</tr>`;
    }).join("");

    // One line beside the title: in the first week, that more is coming;
    // after it, how long the record runs and what the arrows compare. No
    // dates — the chart's own axis carries them.
    const sub = n === 1
      ? `The lines grow with each weekly update`
      : `<b>${plural(n, "week", "weeks")}</b> on record · arrows show the change from the week before`;

    host.innerHTML = `
      <div class="tr-head">
        <h3 class="tr-title" id="trTitle">The backlog, week by week</h3>
        <p class="tr-sub">${sub}</p>
        <button type="button" class="tr-more" aria-expanded="false" aria-controls="trTables">See the numbers</button>
      </div>
      <div class="tr-panels">
        <div class="tr-panel is-wide">
          <ul class="tr-legend" aria-label="Bugs in each section">${legend}</ul>
          <div class="tr-plot" id="trSections" tabindex="0" role="group" aria-roledescription="chart"
               aria-label="${esc(`Bugs in each section, ${n === 1 ? "one week" : n + " weeks"}. Latest, ${long(now.week)}: ` +
                 SECTIONS.map((s) => `${s.label} ${fmt(now[s.id])}`).join(", ") + ". Arrow keys move between weeks.")}"></div>
        </div>
        <div class="tr-panel">
          <div class="tr-legend is-one" title="${esc(`${fmt(now.scored)} of ${plural(now.active, "open bug", "open bugs")} carry a score`)}">
            <span class="tr-lg"><i class="tr-lg-key" style="--c:var(--tr-open)" aria-hidden="true"></i>
              <b class="tr-lg-n">${fmt(now.score)}</b>
              ${prev ? change(now.score - prev.score, { worseUp: true, since, compact: true }) : ""}
              <span class="tr-lg-name">Total weighted score, open backlog</span></span>
          </div>
          <div class="tr-plot" id="trScore" tabindex="0" role="group" aria-roledescription="chart"
               aria-label="${esc(`Total weighted score of the open backlog, ${n === 1 ? "one week" : n + " weeks"}. Latest, ${long(now.week)}: ${fmt(now.score)}. Arrow keys move between weeks.`)}"></div>
        </div>
      </div>
      <div class="tr-tables" id="trTables" hidden>
        <div class="tr-table-wrap">
          <table>
            <caption>The whole backlog, week by week</caption>
            <thead><tr><th scope="col">Week</th>${SECTIONS.map((s) => `<th scope="col">${esc(s.label)}</th>`).join("")}
              <th scope="col">Weighted score, open</th></tr></thead>
            <tbody>${rows.slice().reverse().map((r) =>
              `<tr><th scope="row">${esc(long(r.week))}</th>${SECTIONS.map((s) => `<td>${fmt(r[s.id])}</td>`).join("")}` +
              `<td>${fmt(r.score)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
        <div class="tr-table-wrap">
          <table class="is-products">
            <caption>Open bugs in each product, with their total weighted score beneath${weeks.length > 8 ? " — the latest eight weeks" : ""}</caption>
            <thead><tr><th scope="col">Product</th>${recent.map((w) => `<th scope="col">${esc(long(w))}</th>`).join("")}</tr></thead>
            <tbody>${byProduct}</tbody>
          </table>
        </div>
      </div>`;
    host.hidden = false;

    // The tables stay out of the way until they are asked for.
    const more = host.querySelector(".tr-more"), tables = host.querySelector("#trTables");
    more.addEventListener("click", () => {
      const open = tables.hidden;
      tables.hidden = !open;
      more.setAttribute("aria-expanded", String(open));
      more.textContent = open ? "Hide the numbers" : "See the numbers";
    });

    const sectionsCfg = {
      weeks, integers: true, endWidth: 112, format: fmt,
      series: SECTIONS.map((s) => ({ label: s.label, short: s.short, color: s.color, values: rows.map((r) => r[s.id]) })),
      tip: (i) => `<b>${esc(long(weeks[i]))}</b>` + SECTIONS.map((s) =>
        `<span class="tr-tip-row"><i style="background:${s.color}"></i>${esc(s.label)}<b>${fmt(rows[i][s.id])}</b></span>`).join(""),
    };
    const scoreCfg = {
      weeks, area: true, endWidth: 58, format: fmt,
      series: [{ label: "Total weighted score", short: "", color: "var(--tr-open)", values: rows.map((r) => r.score) }],
      tip: (i) => `<b>${esc(long(weeks[i]))}</b>` +
        `<span class="tr-tip-row"><i style="background:var(--tr-open)"></i>Total weighted score<b>${fmt(rows[i].score)}</b></span>` +
        `<span class="tr-tip-sub">${fmt(rows[i].scored)} of ${plural(rows[i].active, "open bug", "open bugs")} scored</span>`,
    };
    const draw = (animate) => {
      sectionsCfg.animate = scoreCfg.animate = !!animate;
      const a = host.querySelector("#trSections"), b = host.querySelector("#trScore");
      if (a) plot(a, sectionsCfg);
      if (b) plot(b, scoreCfg);
    };
    draw(opts && opts.animate);
    host._redraw = () => draw(false);
  }

  /* ── a product's line, in its header ─────────────────────────────────────
     Its own weeks, on the same time axis as every other product's so the
     lines read down the page together; its own vertical scale, from zero —
     the number beside it gives the size, the line gives the direction. Each
     week is a band that can be pointed at.

     It stretches to whatever width the header gives it and stays 40px tall:
     the drawing scales freely while the line keeps a 2px stroke, and the dots
     are laid over it as round marks of their own, so nothing turns oval. */
  const SW = 240, SH = 40;
  const pctX = (v) => (v / SW * 100).toFixed(2) + "%";
  const pctY = (v) => (v / SH * 100).toFixed(2) + "%";
  function productSpark(history, product, section, metric, opts) {
    const ix = index(history);
    const s = sectionOf(section);
    const byScore = metric === "score";
    const pts = productSeries(history, product, section);
    // A week with nothing scored has no score to draw — not a score of zero.
    const values = pts.map((p) => !p ? null : byScore ? (p.scored ? p.score : null) : p.bugs);
    const name = byScore ? "Weighted score" : s.line;
    const n = ix.weeks.length;
    const have = values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
    const head = (right) => `<span class="tb-spark-top"><span class="tb-spark-l">${esc(name)}</span>${right}</span>`;

    if (!have.length) {
      return `<span class="tb-spark is-none" style="--c:${s.color}">${head("")}
                <span class="tb-spark-empty">${byScore ? "Nothing scored on record" : "Nothing on record"}</span></span>`;
    }

    // How far it moved since the week before, when both weeks have a figure.
    const cur = values[n - 1], before = n > 1 ? values[n - 2] : undefined;
    let delta;
    if (n === 1) delta = `<span class="tr-d is-first">first week</span>`;
    else if (cur == null) delta = `<span class="tr-d is-flat">${byScore ? "not scored now" : "not listed now"}</span>`;
    else if (before == null) delta = `<span class="tr-d is-flat" title="${esc(`No figure for ${long(ix.weeks[n - 2])}`)}">new this week</span>`;
    else delta = change(cur - before, { worseUp: section === "active",
      one: byScore ? null : s.one, many: byScore ? null : s.many, since: short(ix.weeks[n - 2]) });

    const t0 = ms(ix.weeks[0]), t1 = ms(ix.weeks[n - 1]);
    const pl = 5, pr = 6, pt = 6, pb = 5;
    const x = (i) => n === 1 ? SW - pr : pl + ((ms(ix.weeks[i]) - t0) / (t1 - t0)) * (SW - pl - pr);
    const max = Math.max(...have.map((i) => values[i]));
    const top = max > 0 ? max : 1;
    const y = (v) => pt + (SH - pt - pb) * (1 - v / top);
    const xy = values.map((v, i) => (v == null ? null : [x(i), y(v)]));
    const last = have[have.length - 1];

    const tipOf = (i) => {
      const p = pts[i];
      return long(ix.weeks[i]) + " · " + (byScore
        ? `weighted score ${fmt(p.score)}` + (p.scored < p.bugs ? ` (${fmt(p.scored)} of ${fmt(p.bugs)} scored)` : "")
        : plural(p.bugs, s.one, s.many));
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
     from week to week. Wired once, to the container the compartments are
     drawn in, so redrawing them does not pile up listeners. */
  let TIP = null, HOT = null;
  function hideSparkTip() {
    if (TIP) TIP.hidden = true;
    if (HOT) { HOT.hidden = true; HOT = null; }
  }
  function wireSparks(root) {
    if (!root || root._sparks) return;
    root._sparks = true;
    TIP = document.createElement("div");
    TIP.className = "tb-spark-tip";
    TIP.hidden = true;
    TIP.setAttribute("aria-hidden", "true");     // the same figures are in the tables
    document.body.appendChild(TIP);
    root.addEventListener("pointerover", (e) => {
      const b = e.target.closest ? e.target.closest(".tb-spark-band") : null;
      if (!b) return;
      const plotEl = b.closest(".tb-spark-plot");
      const cx = Number(b.dataset.cx), cy = Number(b.dataset.cy);
      hideSparkTip();
      HOT = plotEl.querySelector(".tb-spark-hot");
      HOT.style.left = pctX(cx);
      HOT.style.top = pctY(cy);
      HOT.hidden = false;
      TIP.textContent = b.dataset.tip;
      TIP.hidden = false;
      const r = plotEl.getBoundingClientRect();
      const px = r.left + (cx / SW) * r.width, py = r.top + (cy / SH) * r.height;
      const tw = TIP.offsetWidth, th = TIP.offsetHeight;
      TIP.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, px - tw / 2)) + "px";
      TIP.style.top = (py - th - 12 < 8 ? py + 14 : py - th - 12) + "px";
    });
    root.addEventListener("pointerout", (e) => {
      const b = e.target.closest ? e.target.closest(".tb-spark-band") : null;
      const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(".tb-spark-band") : null;
      if (b && !to) hideSparkTip();
    });
    window.addEventListener("scroll", hideSparkTip, { passive: true });
  }

  window.TBTrend = { SECTIONS, index, productSeries, renderMain, productSpark, wireSparks, hideSparkTip };
})();
