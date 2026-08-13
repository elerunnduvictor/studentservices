/* ═══════════════════════════════════════════════════════════════════════════
   PAGE SCOPING

   Adjusts what a page offers to match what the database will actually give the
   person reading it.

   This is presentation, not protection. A partner's request for the employee
   table already comes back empty from Postgres — nothing here is what keeps
   them out. What it does is stop the hub showing a search box that finds
   nothing, a table with no rows, and a headcount chart drawn from an empty
   array. A page that silently renders blank looks broken; a page that says
   "this is the view you have" does not.

   Loaded on the directory and department pages, after hub-access.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = (window.SS = window.SS || {});

  function hide(el) { if (el) el.style.display = "none"; }

  function notice(text) {
    const d = document.createElement("div");
    d.className = "scope-notice";
    d.setAttribute("role", "status");
    d.innerHTML =
      '<strong>Partner view</strong><span>' + text + "</span>";
    return d;
  }

  /**
   * The directory, for someone outside Student Services.
   *
   * Departments and totals stay — they are the shape of the organisation, and
   * that is public knowledge. The roster, the filters and the search go, along
   * with everything that would only ever draw an empty result.
   */
  async function scopeDirectory() {
    const table = document.getElementById("dirTableBody");
    const host = table ? table.closest("section, .section, main") : null;

    ["filterSearch", "filterDept", "filterSubDept", "filterType", "filterClear"]
      .forEach((id) => {
        const el = document.getElementById(id);
        hide(el && (el.closest(".filter-field, .dir-filter, label") || el));
      });

    if (table) {
      const wrap = table.closest("table") || table;
      hide(wrap.closest(".table-wrap, .dir-table-wrap") || wrap);
    }
    if (host) {
      host.prepend(notice(
        "You can see Student Services and each department at a glance. " +
        "The list of individual people is limited to Student Services staff."));
    }

    // The department bars and the headcount totals are aggregates, so they stay
    // — but they have to come from the summary function, because the employee
    // rows they were computed from will not arrive.
    try {
      const rows = await SS.access.rpcSummary();
      if (rows && rows.length) renderPartnerTotals(rows);
    } catch { /* the notice above still explains the page */ }
  }

  function renderPartnerTotals(rows) {
    const bars = document.getElementById("deptBars");
    const count = document.getElementById("dirCount");
    const total = rows.reduce((a, r) => a + Number(r.staff_count || 0), 0);
    const contractors = rows.reduce((a, r) => a + Number(r.contractor_count || 0), 0);

    if (count) {
      count.textContent = total + " people across " + rows.length + " departments" +
        (contractors ? " · " + contractors + " student contractors" : "");
    }
    if (!bars) return;
    const max = Math.max.apply(null, rows.map((r) => Number(r.staff_count || 0)).concat([1]));
    bars.innerHTML = rows.map((r) => {
      const n = Number(r.staff_count || 0);
      return '<div class="dept-bar-row">' +
        '<div class="dept-bar-label">' + escapeHtml(r.department) + "</div>" +
        '<div class="dept-bar-track"><div class="dept-bar-fill" style="width:' +
          Math.round((100 * n) / max) + '%"></div></div>' +
        '<div class="dept-bar-value">' + n + "</div>" +
        "</div>";
    }).join("");
  }

  /** A department page, for a partner: the mission stays, the workforce goes. */
  function scopeDepartmentPage() {
    hide(document.getElementById("deptDashboard"));   // headcount / type cards
    hide(document.getElementById("deptChart"));       // workforce chart
    const team = document.getElementById("team");     // the people section
    if (team) {
      team.innerHTML = "";
      team.append(notice(
        "Team composition is visible to Student Services staff. " +
        "The department's purpose and services are shown above."));
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  SS.scope = {
    async apply() {
      if (!SS.access) return;
      await SS.access.ready;
      if (!SS.access.isPartner) return;      // everyone inside sees it all

      document.documentElement.setAttribute("data-scope", "partner");
      const path = location.pathname;
      if (/\/directory\//.test(path)) await scopeDirectory();
      if (/\/departments\//.test(path)) scopeDepartmentPage();
    },
  };

  // Run once the page has rendered, so the elements exist to adjust.
  if (document.readyState === "loading") {
    document.addEventListener("ss:data-ready", () => SS.scope.apply(), { once: true });
    document.addEventListener("DOMContentLoaded", () => setTimeout(() => SS.scope.apply(), 0), { once: true });
  } else {
    document.addEventListener("ss:data-ready", () => SS.scope.apply(), { once: true });
    setTimeout(() => SS.scope.apply(), 0);
  }
})();
