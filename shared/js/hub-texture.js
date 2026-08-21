/* ═══════════════════════════════════════════════════════════════════════════
   TEXTURE — the second channel

   The problem this closes, permanently.

   The hub's palette is brand, and brand colours were chosen to look right
   together, not to be told apart by someone who cannot see red or green. Every
   attempt to fix that by re-picking hues hit the same wall: this range supports
   about four categories that separate cleanly, and the hub keeps needing five or
   six — five employment types, five departments, nine OKR statuses. Fixing one
   confusable pair pushed another pair together. That is not a bad colour
   choice; it is a hard limit of any narrow palette, and no amount of tuning
   removes it.

   So stop asking colour to do it alone. Texture is a second, independent
   channel: two hatch angles alternating down the fixed slot order, so
   neighbouring categories differ by *pattern* whether or not their colours
   separate — and still differ in greyscale, in print, and at full-severity
   colour blindness, where hue carries nothing at all.

   It is deliberately not on by default. Texture is louder than flat fill and
   would make every chart busier for the majority who do not need it, so it
   engages when it is actually wanted:

     · the reader turns it on (remembered per browser)
     · the operating system asks for it — forced-colors or high contrast
     · the page is being printed

   Only two angles are used, 45° and its 135° mirror, never horizontal or
   vertical — those read as gridlines and get mistaken for chart furniture. The
   ink is a darker step of the fill's own colour, so a textured mark still reads
   as its own colour rather than turning into a grey mesh.

     SS.texture.enabled()        is it on right now
     SS.texture.set(on)          turn it on or off, remembered
     SS.texture.slot(i)          'solid' | 'a' | 'b' for the i-th category
     SS.texture.svgDefs(fills)   <defs> of patterns for an SVG chart
     SS.texture.svgFill(i, c)    the fill to use for slot i
     SS.texture.onChange(fn)     redraw when it is toggled
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = (window.SS = window.SS || {});
  const KEY = "ss_hub_texture";
  const listeners = [];

  /* Three-step cycle rather than two. With only solid/hatched, slots 0 and 2
     would both be solid and could still collide; a third state means any two
     neighbours in the fixed order always differ. */
  const CYCLE = ["solid", "a", "b"];

  function askedForBySystem() {
    try {
      return window.matchMedia("(forced-colors: active)").matches ||
             window.matchMedia("(prefers-contrast: more)").matches;
    } catch { return false; }
  }

  function chosen() {
    try { return localStorage.getItem(KEY) === "on"; } catch { return false; }
  }

  function enabled() { return chosen() || askedForBySystem(); }

  function set(on) {
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* private mode */ }
    document.documentElement.classList.toggle("ss-textured", enabled());
    listeners.forEach((fn) => { try { fn(enabled()); } catch { /* a bad listener is not fatal */ } });
  }

  function onChange(fn) { if (typeof fn === "function") listeners.push(fn); }

  function slot(i) { return CYCLE[i % CYCLE.length]; }

  /**
   * The hatch ink.
   *
   * A translucent overlay rather than a computed darker shade: fills arrive
   * either as hex or as `var(--token)`, and a token cannot be read and darkened
   * from here. Overlaying works for both, and keeps the mark's own colour
   * showing between the lines. It flips on a dark surface, where black ink on a
   * dark fill would simply vanish.
   */
  function ink() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    return dark ? "rgba(255,255,255,.55)" : "rgba(0,0,0,.42)";
  }

  /**
   * Pattern defs for an SVG chart.
   *
   * `fills` is the per-slot fill in order. Each becomes a pattern painting the
   * flat colour first and the hatch over it, so a textured arc is still its own
   * colour with lines on top rather than lines on nothing.
   */
  function svgDefs(fills, idPrefix, slots) {
    if (!enabled()) return "";
    const p = idPrefix || "sstex";
    const made = new Set();
    return "<defs>" + fills.map((fill, i) => {
      // `slots` lets a caller key patterns by the category's fixed place in the
      // palette rather than by its position in a sorted chart. Without it a
      // filter that reorders the marks would repaint the survivors, which is
      // the one thing an identity channel must never do.
      const si = slots ? slots[i] : i;
      const kind = slot(si);
      if (kind === "solid" || made.has(si)) return "";
      made.add(si);
      const angle = kind === "a" ? 45 : 135;
      return `<pattern id="${p}-${si}" patternUnits="userSpaceOnUse" width="8" height="8"
                       patternTransform="rotate(${angle})">
                <rect width="8" height="8" fill="${fill}"/>
                <line x1="0" y1="0" x2="0" y2="8" stroke="${ink()}" stroke-width="3.2"/>
              </pattern>`;
    }).join("") + "</defs>";
  }

  function svgFill(i, color, idPrefix) {
    if (!enabled() || slot(i) === "solid") return color;
    return `url(#${idPrefix || "sstex"}-${i})`;
  }

  /** For HTML marks — a class the stylesheet turns into a gradient hatch. */
  function className(i) {
    if (!enabled()) return "";
    const kind = slot(i);
    return kind === "solid" ? "" : "ss-tex-" + kind;
  }

  function styles() {
    if (document.getElementById("ss-texture-css")) return;
    const el = document.createElement("style");
    el.id = "ss-texture-css";
    el.textContent = `
      /* Drawn as an overlay rather than as the element's own background-image.
         The marks these sit on are not all flat fills — the directory's bars are
         a left-to-right gradient — and setting background-image here replaced
         that gradient outright, leaving a hatch with no colour under it. An
         overlay layers on top of whatever is already there. */
      .ss-tex-a, .ss-tex-b { position: relative; }
      .ss-tex-a::after, .ss-tex-b::after {
        content: ''; position: absolute; inset: 0; pointer-events: none;
        border-radius: inherit;
      }
      /* 45° and its mirror. Never horizontal or vertical — those read as
         gridlines rather than as a fill. */
      .ss-tex-a::after { background-image: repeating-linear-gradient(45deg,
                    rgba(0,0,0,.4) 0 3px, transparent 3px 8px); }
      .ss-tex-b::after { background-image: repeating-linear-gradient(135deg,
                    rgba(0,0,0,.4) 0 3px, transparent 3px 8px); }
      /* On a dark surface the ink has to be light or the hatch disappears. */
      :root[data-theme="dark"] .ss-tex-a::after { background-image: repeating-linear-gradient(45deg,
                    rgba(255,255,255,.48) 0 3px, transparent 3px 8px); }
      :root[data-theme="dark"] .ss-tex-b::after { background-image: repeating-linear-gradient(135deg,
                    rgba(255,255,255,.48) 0 3px, transparent 3px 8px); }
    `;
    document.head.append(el);
  }

  styles();
  document.documentElement.classList.toggle("ss-textured", enabled());

  // Printing is the case nobody remembers to turn on for themselves.
  try {
    window.addEventListener("beforeprint", () => {
      document.documentElement.classList.add("ss-textured");
      listeners.forEach((fn) => { try { fn(true); } catch { /* not fatal */ } });
    });
    window.addEventListener("afterprint", () => {
      document.documentElement.classList.toggle("ss-textured", enabled());
      listeners.forEach((fn) => { try { fn(enabled()); } catch { /* not fatal */ } });
    });
  } catch { /* no print events here */ }

  SS.texture = { enabled, set, slot, svgDefs, svgFill, className, onChange };
})();
