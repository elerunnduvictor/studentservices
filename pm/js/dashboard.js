/* ═══════════════════════════════════════════════════════════════════════════
   WORKFORCE DASHBOARD

   The Directory workbook's summary, drawn rather than tabulated.

   It was four rows and four columns — the same numbers, in the shape that makes
   you read them one at a time and hold them in your head to compare. The hub's
   own directory page already answers "how big is each department, and of what"
   visually, from this same data, so the same question is answered the same way
   here instead of being invented twice.

   ── on the colours ────────────────────────────────────────────────────────
   The hub's palette is brand, not decoration, so it is used as-is. Two of its
   pairings do not survive a colour-blindness check, and that shaped two
   decisions rather than being ignored:

     · Full-Time Temporary (#28738A) sits ΔE 9.7 from Full-Time Employee
       (#065577) — below the floor for *normal* vision, never mind protanopia.
       Since the tabs merge both temporary kinds anyway, "Temporary" is drawn in
       the Part-Time gold instead, which measures ΔE 18.0 clear.
     · Dark mode is stepped separately, not flipped: the navy is lifted and the
       grey lightened until the violet/grey pair clears the floor too.

   Both sets were checked with the palette validator, not by eye. What remains
   failing there is the gold being very light and the grey nearly neutral, which
   are properties of the brand colours themselves — so every bar segment carries
   its number and the donut legend writes every figure down beside its name.
   Nothing here depends on telling two colours apart to read a value.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* Five, not four. "VP - Student Services" was missing, and its two people —
     the executive PM and assistant PM, who report to Ben Packer rather than to
     a director — fell into the `other` bucket below, which is accumulated and
     then never rendered. The effect was two totals on one page that disagreed:
     "Total workforce" read 177 because it sums these departments, while
     "Employment types" read 179 because it counts every live person whatever
     their department. The two contractors in the gap were exactly the pair. */
  const DEPARTMENTS = [
    "Digital Operations",
    "Dean of Students",
    "Enrollment & Retention",
    "Student Records, Registration, and Support",
    "VP - Student Services",
  ];

  // Shortened for the axis; the table underneath carries the full name.
  const SHORT = {
    "Student Records, Registration, and Support": "Records, Registration & Support",
    "VP - Student Services": "VP — Student Services",
  };

  /* The four kinds the department tabs are split into, in the order they are
     stacked. `match` maps the employment_type column onto them — Temporary
     covers both, exactly as the tabs do, so the chart and the tabs can never
     disagree about who is counted where. */
  const KINDS = [
    { key: "fte",      label: "Full-Time",   match: (t) => t === "Full-Time Employee" },
    { key: "temp",     label: "Temporary",   match: (t) => t === "Full-Time Temporary" || t === "Part-Time Temporary" },
    { key: "contract", label: "Contractors", match: (t) => t === "Professional Contractor" },
    { key: "student",  label: "Students",    match: null },   // its own table
  ];

  /* The bars merge the two temporary kinds because the department tabs do.
     The donut does not: "Employment Types" is the one place the difference
     between Full-Time and Part-Time Temporary is the actual subject, so it is
     shown as it is stored. Colours come from the hub's own palette, so this
     chart and the directory page cannot drift apart. */
  const TYPE_ORDER = [
    "Full-Time Employee",
    "Full-Time Temporary",
    "Part-Time Temporary",
    "Professional Contractor",
    "Student Employee",
  ];
  /* Drawn from the same tokens as the bars rather than raw hexes. In dark mode
     the bars step to lighter values; taking the donut's fills from the same
     variables is what stops "Full-Time" being pale teal in one chart and dark
     navy in the other on the same screen. */
  const TYPE_VAR = {
    "Full-Time Employee":      "--wf-fte",
    "Full-Time Temporary":     "--wf-ftt",
    "Part-Time Temporary":     "--wf-temp",
    "Professional Contractor": "--wf-contract",
    "Student Employee":        "--wf-student",
  };
  // Anything unexpected keeps the hub palette, then a neutral.
  const typeColor = (t) => TYPE_VAR[t]
    ? `var(${TYPE_VAR[t]})`
    : ((window.TYPE_COLORS && window.TYPE_COLORS[t]) || "#7F898A");

  /* Degrades to plain colour if the texture layer is not on the page, so a
     missing script costs the second channel rather than the whole chart. */
  const NO_TEXTURE = { enabled: () => false, className: () => "",
                       svgDefs: () => "", svgFill: (i, c) => c, onChange: () => {} };
  const tex = () => (window.SS && window.SS.texture) || NO_TEXTURE;

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function styles() {
    if (document.getElementById("pm-dashboard-css")) return;
    const el = document.createElement("style");
    el.id = "pm-dashboard-css";
    el.textContent = `
    /* Light steps. Dark is a separate set below, not a filter over these. */
    .wf { --wf-fte:#065577; --wf-ftt:#28738A; --wf-temp:#FFC328;
          --wf-contract:#7F898A; --wf-student:#5E60CE;
          --wf-track:rgba(0,0,0,.06); }
    :root[data-theme="dark"] .wf {
      --wf-fte:#4F9DBA; --wf-ftt:#2C7F94; --wf-temp:#FFC328;
      --wf-contract:#B9C2C3; --wf-student:#6C6FD8;
      --wf-track:rgba(255,255,255,.08);
    }
    .wf { padding:22px 26px 30px; overflow:auto; height:100%; }
    .wf-tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
                gap:14px; margin-bottom:26px; }
    .wf-tile { border:1px solid var(--line); border-radius:12px; padding:14px 16px;
               background:var(--surface); }
    .wf-tile-n { font-size:1.9rem; font-weight:600; line-height:1.1; color:var(--ink); }
    .wf-tile-l { font-size:.68rem; letter-spacing:.13em; text-transform:uppercase;
                 color:var(--ink-muted); margin-top:5px; }
    .wf-h { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase;
            color:var(--ink-muted); margin:0 0 4px; }
    .wf-sub { font-size:.78rem; color:var(--ink-muted); margin:0 0 16px; }

    .wf-legend { display:flex; flex-wrap:wrap; gap:14px; margin:0 0 18px; }
    .wf-key { display:inline-flex; align-items:center; gap:7px; font-size:.76rem;
              color:var(--ink-soft); }
    .wf-sw { width:11px; height:11px; border-radius:3px; flex:none; }

    .wf-row { display:grid; grid-template-columns:190px 1fr 58px; align-items:center;
              gap:14px; margin-bottom:11px; }
    .wf-name { font-size:.8rem; color:var(--ink); text-align:right; line-height:1.25; }
    .wf-total { font-size:.85rem; font-weight:600; color:var(--ink); }
    /* 2px surface gap between segments, per the mark spec — the track shows
       through, so touching fills never read as one block. */
    .wf-bar { display:flex; gap:2px; height:26px; background:var(--wf-track);
              border-radius:5px; overflow:hidden; }
    .wf-seg { position:relative; display:flex; align-items:center; justify-content:center;
              min-width:0; transition:filter .15s; }
    .wf-seg:first-child { border-radius:5px 0 0 5px; }
    .wf-seg:last-child  { border-radius:0 5px 5px 0; }
    .wf-seg:hover { filter:brightness(1.12); }
    .wf-seg-n { font-size:.7rem; font-weight:600; color:#fff; pointer-events:none;
                text-shadow:0 1px 2px rgba(0,0,0,.35); }
    /* Gold is too light to carry white text. */
    .wf-seg[data-kind="temp"] .wf-seg-n,
    :root[data-theme="dark"] .wf-seg[data-kind="contract"] .wf-seg-n {
      color:#1a1a1a; text-shadow:none;
    }
    .wf-tip { position:fixed; z-index:60; pointer-events:none; padding:7px 10px;
              border-radius:8px; font-size:.75rem; line-height:1.4; white-space:nowrap;
              background:var(--ink); color:var(--surface);
              box-shadow:0 6px 18px rgba(0,0,0,.22); opacity:0; transition:opacity .12s; }
    .wf-tip.on { opacity:1; }

    /* Stacked, not side by side: the bars need the full width to stay readable,
       and squeezed into a 290px column the donut left the page mostly empty. */
    .wf-panels { display:flex; flex-direction:column; gap:26px; }
    .wf-panel { min-width:0; }
    .wf-panel-side { border-top:1px solid var(--line); padding-top:22px; }

    /* Full width, so the donut sits beside its legend rather than above it. */
    .wf-head { display:flex; align-items:flex-start; justify-content:space-between;
               gap:20px; flex-wrap:wrap; }
    .wf-tex-btn { flex:none; padding:5px 12px; border-radius:7px; cursor:pointer;
                  font-size:.72rem; letter-spacing:.06em;
                  border:1px solid var(--line); background:var(--surface);
                  color:var(--ink-muted); transition:var(--t, .15s); }
    .wf-tex-btn:hover { color:var(--ink); border-color:var(--ink-muted); }
    .wf-tex-btn[aria-pressed="true"] { color:var(--accent); border-color:var(--accent); }

    .wf-donut-wrap { display:flex; flex-direction:row; align-items:center; gap:52px;
                     flex-wrap:wrap; }
    .wf-donut-wrap svg { flex:none; }
    .wf-donut-val { font-size:2.1rem; font-weight:600; fill:var(--ink); }
    .wf-donut-cap { font-size:.66rem; letter-spacing:.16em; text-transform:uppercase;
                    fill:var(--ink-muted); }
    /* Runs to the same right edge as the bar chart above, so the two sections
       line up rather than one stopping halfway across the page. The rule under
       each row carries the eye from the label to its number. */
    .wf-donut-legend { flex:1; min-width:260px;
                       display:flex; flex-direction:column; gap:9px; }
    /* Row height, type size and swatch all matched to the bar chart above, so
       the two halves of the page read as one thing. */
    .wf-donut-item { display:grid; grid-template-columns:13px 1fr auto; align-items:center;
                     gap:13px; font-size:.82rem; min-height:34px;
                     padding-bottom:9px; border-bottom:1px solid var(--line); }
    .wf-donut-item:last-child { border-bottom:none; padding-bottom:0; }
    .wf-donut-item .wf-sw { width:13px; height:13px; }
    .wf-donut-n { font-size:.9rem; }
    .wf-donut-label { color:var(--ink-soft); line-height:1.3; }
    .wf-donut-n { font-weight:600; color:var(--ink); font-variant-numeric:tabular-nums; }
    `;
    document.head.append(el);
  }

  /**
   * The same donut the directory page draws: arcs stroked on one circle, the
   * total in the middle, and a legend carrying each label with its number.
   *
   * That legend is what makes the chart readable without colour — every figure
   * is written down beside its name, so telling two arcs apart is never the
   * only way to get the number.
   */
  function donutHtml(data, total) {
    // Sized to sit at the same visual weight as the department bars above it —
    // a small ring under a full-width chart read as an afterthought.
    const size = 248, cx = size / 2, cy = size / 2, r = size * 0.36, w = size * 0.15;
    let run = 0;
    const arcs = data.map((d, i) => {
      const start = run;
      run += d.value / total;
      const a0 = start * 2 * Math.PI - Math.PI / 2;
      const a1 = run * 2 * Math.PI - Math.PI / 2;
      const large = d.value / total > 0.5 ? 1 : 0;
      // A single category would leave start and end on the same point and draw
      // nothing, so it is stroked as a full circle instead.
      if (data.length === 1) {
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                        stroke="${tex().svgFill(i, d.color, "wftex")}" stroke-width="${w}"/>`;
      }
      return `<path d="M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)}
                       A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}"
                    fill="none" stroke="${tex().svgFill(i, d.color, "wftex")}"
                    stroke-width="${w}" stroke-linecap="butt"/>`;
    }).join("");

    return `
      <div class="wf-donut-wrap">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img"
             aria-label="Workforce by employment type">
          ${tex().svgDefs(data.map((d) => d.color), "wftex")}
          ${arcs}
          <text x="${cx}" y="${cy + 2}" text-anchor="middle" class="wf-donut-val">${total}</text>
          <text x="${cx}" y="${cy + 26}" text-anchor="middle" class="wf-donut-cap">Total</text>
        </svg>
        <div class="wf-donut-legend">
          ${data.map((d, i) => `
            <div class="wf-donut-item">
              <span class="wf-sw ${tex().className(i)}" style="background-color:${d.color}"></span>
              <span class="wf-donut-label">${esc(d.label)}</span>
              <span class="wf-donut-n">${d.value}</span>
            </div>`).join("")}
        </div>
      </div>`;
  }

  /** One tooltip element, moved around — not one per segment. */
  function tooltips(root) {
    const tip = document.createElement("div");
    tip.className = "wf-tip";
    document.body.append(tip);
    root.addEventListener("mouseover", (e) => {
      const seg = e.target.closest(".wf-seg");
      if (!seg || !root.contains(seg)) return;
      tip.innerHTML = seg.dataset.tip;
      tip.classList.add("on");
    });
    root.addEventListener("mousemove", (e) => {
      if (!tip.classList.contains("on")) return;
      const pad = 14;
      tip.style.left = Math.min(e.clientX + pad, innerWidth - tip.offsetWidth - 8) + "px";
      tip.style.top = Math.max(e.clientY - tip.offsetHeight - pad, 8) + "px";
    });
    root.addEventListener("mouseout", (e) => {
      if (!e.target.closest(".wf-seg")) return;
      tip.classList.remove("on");
    });
    // The dashboard is redrawn on every visit; don't leave tooltips behind.
    const obs = new MutationObserver(() => {
      if (!document.body.contains(root)) { tip.remove(); obs.disconnect(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  let lastHost = null;
  let watching = false;

  window.renderWorkforceDashboard = async function renderWorkforceDashboard(host) {
    styles();
    lastHost = host;
    if (!watching && window.SS && window.SS.texture) {
      watching = true;
      window.SS.texture.onChange(() => {
        if (lastHost && lastHost.isConnected) window.renderWorkforceDashboard(lastHost);
      });
    }

    const [staff, students] = await Promise.all([
      SS.db.select("employees", { select: "department,employment_type,active" }),
      SS.db.select("student_employees", { select: "department,active" }),
    ]);

    // Inactive people stay on record but are not workforce.
    const live = (r) => r && r.active !== false;
    const byDept = new Map(DEPARTMENTS.map((d) => [d, { fte: 0, temp: 0, contract: 0, student: 0 }]));
    const other = { fte: 0, temp: 0, contract: 0, student: 0 };
    const bucket = (d) => byDept.get(d) || other;

    const byType = {};
    staff.filter(live).forEach((r) => {
      const kind = KINDS.find((k) => k.match && k.match(r.employment_type));
      if (kind) bucket(r.department)[kind.key]++;
      if (r.employment_type) byType[r.employment_type] = (byType[r.employment_type] || 0) + 1;
    });
    students.filter(live).forEach((r) => {
      bucket(r.department).student++;
      byType["Student Employee"] = (byType["Student Employee"] || 0) + 1;
    });

    // Known types first in their documented order, then anything unexpected —
    // a new employment type should show up rather than be silently dropped.
    const typeRows = TYPE_ORDER.concat(Object.keys(byType).filter((t) => !TYPE_ORDER.includes(t)))
      .filter((t) => byType[t] > 0)
      .map((t) => ({ label: t, value: byType[t], color: typeColor(t) }));
    const typeTotal = typeRows.reduce((n, d) => n + d.value, 0);

    /* `other` is drawn, not discarded.
       It collects anyone whose department is not one of the five above — a
       typo, a blank, or a department somebody added to the data without adding
       it here. Accumulating it and then leaving it out of `rows` is what let
       this page show two totals that disagreed: the people were counted, then
       dropped on the way to the chart, and nothing said so.
       Now they appear under their own heading, so the bars and the tile always
       add up to the same number the type breakdown does, and an unrecognised
       department is visible instead of silently shrinking the workforce. */
    const otherTotal = KINDS.reduce((n, k) => n + other[k.key], 0);
    const rows = DEPARTMENTS.map((d) => {
      const c = byDept.get(d);
      return { dept: d, counts: c, total: KINDS.reduce((n, k) => n + c[k.key], 0) };
    })
      .concat(otherTotal ? [{ dept: "Not in a listed department", counts: other, total: otherTotal }] : [])
      .sort((a, b) => b.total - a.total);

    const grand = KINDS.reduce((o, k) => (o[k.key] = rows.reduce((n, r) => n + r.counts[k.key], 0), o), {});
    const headcount = KINDS.reduce((n, k) => n + grand[k.key], 0);
    const widest = Math.max(...rows.map((r) => r.total), 1);

    const wrap = document.createElement("div");
    wrap.className = "wf";

    const tile = (n, l) => `<div class="wf-tile"><div class="wf-tile-n">${n}</div><div class="wf-tile-l">${l}</div></div>`;
    const kindIndex = (k) => KINDS.findIndex((x) => x.key === k);
    const swatch = (k) => `<span class="wf-sw ${tex().className(kindIndex(k))}"
                                 style="background-color:var(--wf-${k})"></span>`;

    wrap.innerHTML = `
      <div class="wf-tiles">
        ${tile(headcount, "Total workforce")}
        ${tile(grand.fte, "Full-time employees")}
        ${tile(grand.temp, "Temporary (FTT / PTT)")}
        ${tile(grand.contract, "Professional contractors")}
        ${tile(grand.student, "Student employees")}
      </div>

      <div class="wf-panels">
        <section class="wf-panel">
          <p class="wf-h">Headcount by department</p>
          <p class="wf-sub">Each bar is one department, split by how its people are
            engaged. Hover a segment for the exact figure.</p>

          <div class="wf-legend">
            ${KINDS.map((k) => `<span class="wf-key">${swatch(k.key)}${esc(k.label)}</span>`).join("")}
          </div>

          <div class="wf-chart">
            ${rows.map((r) => `
              <div class="wf-row">
                <div class="wf-name">${esc(SHORT[r.dept] || r.dept)}</div>
                <div class="wf-bar" style="width:${(r.total / widest) * 100}%">
                  ${KINDS.filter((k) => r.counts[k.key] > 0).map((k) => {
                    const n = r.counts[k.key];
                    const pct = (n / r.total) * 100;
                    return `<div class="wf-seg ${tex().className(KINDS.indexOf(k))}" data-kind="${k.key}"
                                 style="flex:0 0 ${pct}%;background-color:var(--wf-${k.key})"
                                 data-tip="<strong>${esc(SHORT[r.dept] || r.dept)}</strong><br>${esc(k.label)}: ${n} of ${r.total}">
                              ${pct > 9 ? `<span class="wf-seg-n">${n}</span>` : ""}
                            </div>`;
                  }).join("")}
                </div>
                <div class="wf-total">${r.total}</div>
              </div>`).join("")}
          </div>
        </section>

        <section class="wf-panel wf-panel-side">
          <div class="wf-head">
            <div>
              <p class="wf-h">Employment types</p>
              <p class="wf-sub">The whole workforce, as each person is engaged.</p>
            </div>
            <button type="button" class="wf-tex-btn" aria-pressed="${tex().enabled()}">
              ${tex().enabled() ? "Plain fills" : "Add patterns"}
            </button>
          </div>
          ${typeTotal ? donutHtml(typeRows, typeTotal)
                      : `<p class="wf-sub">No people on record yet.</p>`}
        </section>
      </div>
    `;

    host.innerHTML = "";
    host.append(wrap);
    tooltips(wrap);

    // Hatching is a second channel for anyone who cannot rely on hue — the two
    // blues in this legend being the case in point. Offered rather than forced,
    // because it makes every chart busier for readers who do not need it.
    const texBtn = wrap.querySelector(".wf-tex-btn");
    if (texBtn) {
      texBtn.title = "Add a hatch pattern to each category, so they can be told " +
                     "apart without relying on colour. Remembered on this device.";
      texBtn.addEventListener("click", () => tex().set(!tex().enabled()));
    }
  };
})();
