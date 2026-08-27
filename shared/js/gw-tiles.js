/* ═══════════════════════════════════════════════════════════════════════════
   THE CLICK-TO-EXPAND TILE — engine shared by every page that uses it

   Started life inside js/home-tiles.js as the mechanics behind the home
   page's four tiles: press the head, the body grows, filled on first expand
   and cached for the visit. Pulled out here once the org chart page grew its
   own pair of them (Directory, Process Documentation) — the interaction and
   the markup it expects (.gw / .gw-head / .gw-body / .gw-panel) are identical
   on both pages; only which panels exist and what they render differs, and
   each page still owns its own PANELS map and calls mount() with it.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var SS = (window.SS = window.SS || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ── data, loaded once per visit ───────────────────────────────────────── */
  var loading = {};
  function dataset(name) {
    if (!loading[name]) {
      if (!SS.data || !SS.data.load) {
        return Promise.reject(new Error("the data service is not available on this page"));
      }
      loading[name] = SS.data.load(name);
      loading[name]["catch"](function () { delete loading[name]; });
    }
    return loading[name];
  }
  function ready() {
    return Promise.resolve(SS.access && SS.access.ready)["catch"](function () {});
  }

  /* ── expand / collapse ─────────────────────────────────────────────────── */
  var filled = {};

  /* Give an open panel exactly the height its content needs — see the note
     this carried in home-tiles.js: a guessed max-height clips a long panel
     silently, and measuring after the content lands removes the guess. */
  function sizeToContent(tile) {
    var body = tile.querySelector(".gw-body");
    var inner = tile.querySelector(".gw-body-inner");
    if (!body || !inner) return;
    body.style.maxHeight = tile.classList.contains("is-open")
      ? inner.scrollHeight + 40 + "px"
      : "";
  }

  function fill(key, panel, panels) {
    var render = panels[key];
    if (!panel || !render) return;
    var tile = panel.closest(".gw");
    render().then(function (html) {
      panel.innerHTML = html || '<div class="gw-empty">Nothing to show here.</div>';
      if (tile) sizeToContent(tile);
    })["catch"](function (err) {
      // Never a stack trace in the tile. One sentence, and the CTA below it
      // still takes them to the real page.
      panel.innerHTML = '<div class="gw-empty">Could not load this right now &mdash; ' +
        esc(err && err.message ? err.message : "try the full page below.") + "</div>";
      if (tile) sizeToContent(tile);
      delete filled[key];              // a second press may try again
    });
  }

  function toggle(tile, panels) {
    var head = tile.querySelector(".gw-head");

    if (tile.classList.contains("is-open")) {
      tile.classList.remove("is-open");
      head.setAttribute("aria-expanded", "false");
      sizeToContent(tile);             // clears it, so the stylesheet's 0 wins
      return;
    }

    tile.classList.add("is-open");
    head.setAttribute("aria-expanded", "true");
    sizeToContent(tile);               // for a panel already filled

    var key = tile.dataset.gw;
    if (!filled[key]) {
      filled[key] = true;
      fill(key, tile.querySelector(".gw-panel"), panels);
    }
  }

  /** Shut every open tile inside `root`, without animating — used when
      leaving the page, so the back-forward cache never restores one open. */
  function closeAll(root) {
    (root || document).querySelectorAll(".gw.is-open").forEach(function (tile) {
      tile.classList.remove("is-open");
      var head = tile.querySelector(".gw-head");
      if (head) head.setAttribute("aria-expanded", "false");
      var body = tile.querySelector(".gw-body");
      if (body) body.style.maxHeight = "";
    });
  }

  /** Wire click-to-expand for every `.gw` tile inside `gridSelector`,
      rendering each with the matching function in the `panels` map
      ({ [tile.dataset.gw]: () => Promise<htmlString> }). */
  function mount(gridSelector, panels) {
    var grid = document.querySelector(gridSelector);
    if (!grid) return;
    grid.addEventListener("click", function (e) {
      var head = e.target.closest(".gw-head");
      if (head) toggle(head.closest(".gw"), panels);
    });
    window.addEventListener("pagehide", function () { closeAll(grid); });
    window.addEventListener("pageshow", function (e) { if (e.persisted) closeAll(grid); });
  }

  SS.gw = { esc: esc, dataset: dataset, ready: ready, mount: mount };
})();
