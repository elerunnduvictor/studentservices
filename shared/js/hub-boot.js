/* ═══════════════════════════════════════════════════════════════════════════
   HUB BOOTSTRAP

   Loads a page's data from the database, then starts the page.

   Each hub page already renders from a global (`window.EMPLOYEES`,
   `window.OKR_PROGRESS_ROWS`, `window.SCORECARD_KPIS`). Those globals are still
   the contract — this only changes where they are filled from. The renderers
   were not touched, which is what makes moving to a database a low-risk change
   rather than a rewrite of five dashboards.

   Usage, replacing the page's own <script src="…"> tags:

     <script src="js/employees.js"></script>          <!-- offline fallback -->
     <script src="../shared/js/config.js"></script>
     <script src="../shared/js/data-service.js"></script>
     <script src="../shared/js/hub-boot.js"
             data-datasets="directory"
             data-then="js/directory.js"></script>

   The fallback file is loaded first on purpose: if the database is unreachable
   the page still renders yesterday's numbers instead of an empty shell.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const tag = document.currentScript;
  const datasets = (tag.dataset.datasets || "").split(",").map((s) => s.trim()).filter(Boolean);
  const then = (tag.dataset.then || "").split(",").map((s) => s.trim()).filter(Boolean);
  const base = tag.src.replace(/shared\/js\/hub-boot\.js.*$/, "");

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not load " + src));
      document.body.append(s);
    });
  }

  /** A quiet line in the corner telling you how fresh what you're reading is. */
  function showProvenance(results) {
    const sources = Object.values(results).map((r) => r.source);
    const live = sources.every((s) => s === "database");
    const failed = sources.some((s) => s === "failed");
    if (live) return;                       // the normal case needs no notice

    const note = document.createElement("div");
    note.setAttribute("role", "status");
    note.style.cssText =
      "position:fixed;left:14px;bottom:14px;z-index:2000;max-width:340px;" +
      "padding:10px 14px;border-radius:10px;font:400 12.5px/1.5 'Jost',system-ui,sans-serif;" +
      "background:#FFF8E5;color:#6B4E00;border:1px solid #F0D48A;" +
      "box-shadow:0 6px 20px rgba(0,0,0,.12)";
    if (document.documentElement.getAttribute("data-theme") === "dark") {
      note.style.background = "#2A2415";
      note.style.color = "#E8CE8A";
      note.style.borderColor = "#5A4A20";
    }
    const detail = Object.entries(results)
      .filter(([, r]) => r.source !== "database")
      .map(([k, r]) => `${k}: ${r.error || r.source}`)
      .join(" · ");
    note.innerHTML =
      `<strong>${failed ? "Live data unavailable" : "Showing the bundled snapshot"}</strong><br>` +
      `<span style="opacity:.85">${detail}</span>`;
    document.body.append(note);
    setTimeout(() => {
      note.style.transition = "opacity .4s";
      note.style.opacity = "0";
      setTimeout(() => note.remove(), 420);
    }, 9000);
  }

  async function boot() {
    let results = {};
    // The session has to be established before the first query goes out, or the
    // database judges the request as anon and a signed-in reader gets nothing.
    try { await (window.SS.access && window.SS.access.ready); }
    catch (err) { console.warn("[hub-boot] access", err); }
    try {
      results = await window.SS.data.loadAll(datasets);
    } catch (err) {
      console.error("[hub-boot]", err);
    }
    // Start the page whatever happened — a fallback render beats a blank page.
    for (const src of then) {
      try { await loadScript(base + src.replace(/^\.\//, "")); }
      catch (err) { console.error("[hub-boot]", err.message); }
    }
    try { showProvenance(results); } catch { /* cosmetic only */ }
    document.dispatchEvent(new CustomEvent("ss:data-ready", { detail: results }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
