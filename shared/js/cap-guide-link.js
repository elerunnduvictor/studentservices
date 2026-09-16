/* ═══════════════════════════════════════════════════════════════════════════
   CAP GUIDE — LOW-KEY NAV LINK

   Deliberately its own small file: not a top-level nav item, not on the home
   page, per direction. The only way in is this one link, added into the
   navigation a KPI or OKR card already shows once it's opened — and even
   then only for someone the database says may see it.

   Visibility is decided by asking the same table the guide's own page reads
   (cap_guide_sections), not by re-implementing the allow list here — RLS is
   the one place that decision is made; this only asks it the question. A
   request that comes back with zero rows renders nothing, exactly as it
   would for anyone not on the list, whether that's because they're not
   allowed or because the guide has no content yet.

   Final placement is still pending review — kept in this one file, called
   from a single line at each integration point, specifically so moving it
   later means changing a call site, not untangling logic out of
   scorecard.js or okr-progress.js.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var SS = (window.SS = window.SS || {});
  var access = null;

  function checkAccess() {
    if (access) return access;
    access = (async function () {
      try {
        await SS.access.ready;
        if (!SS.db) return false;
        var rows = await SS.db.select("cap_guide_sections", { select: "id", limit: 1 });
        return rows.length > 0;
      } catch {
        return false;
      }
    })();
    return access;
  }

  /**
   * Appends the link into `container` if (and only if) this session's own
   * RLS-backed check says they may see the guide. Safe to call on every
   * render of the caller's own view/modal — the caller is expected to have
   * already reset `container`'s content for this render (crumbs()'s
   * innerHTML replace, a fresh modal body), so this never accumulates
   * duplicates across repeated opens.
   */
  function injectInto(container, opts) {
    if (!container) return;
    checkAccess().then(function (ok) {
      if (!ok || !container.isConnected) return;
      var view = (opts && opts.view) || "";
      var a = document.createElement("a");
      a.href = "/cap-guide/index.html" + (view ? "?view=" + encodeURIComponent(view) : "");
      a.textContent = "CAP Walkthrough Guide ↗";
      a.style.cssText =
        "display:inline-block;margin-top:10px;font-size:0.78rem;opacity:0.7;" +
        "text-decoration:underline;color:inherit;";
      container.appendChild(a);
    });
  }

  SS.capGuideLink = { injectInto: injectInto, checkAccess: checkAccess };
})();
