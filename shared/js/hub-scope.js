/* ═══════════════════════════════════════════════════════════════════════════
   PAGE SCOPING

   Adjusts what a page offers to match what the database will actually give the
   person reading it.

   This is presentation, not protection. A partner's request for the employee
   table already comes back empty from Postgres — nothing here is what keeps
   them out. It only removes the parts of a page that would draw from rows that
   never arrive, and it does so silently: a page that captions its own omissions
   reads as a refusal, which is not the experience a partner should have.

   Loaded on the directory and department pages, after hub-access.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = (window.SS = window.SS || {});

  function hide(el) { if (el) el.style.display = "none"; }

  /**
   * The directory, for someone outside Student Services.
   *
   * Everything that describes the shape of the organisation stays: the
   * department bars, the employment-type chart, the headcount cards. Only the
   * list of individual people goes, because that is the sensitive part — and
   * with it the filters, which exist for no other purpose.
   *
   * Nothing is announced. A page that quietly shows what you are entitled to
   * reads as the page; one that captions its own omissions reads as a refusal.
   */
  async function scopeDirectory() {
    const table = document.getElementById("dirTableBody");
    if (table) {
      const t = table.closest("table") || table;
      hide(t.closest(".table-wrap, .dir-table-wrap, section, .section") || t);
    }
    ["filterSearch", "filterDept", "filterSubDept", "filterType", "filterClear"]
      .forEach((id) => {
        const el = document.getElementById(id);
        hide(el && (el.closest(".filter-field, .dir-filter, .filters, label") || el));
      });

    // The bars and totals are aggregates, so they stay — but they have to be
    // rebuilt from the summary function, because the employee rows they were
    // computed from never arrive.
    try {
      const rows = await SS.access.rpcSummary();
      if (rows && rows.length) renderPartnerTotals(rows);
    } catch { /* leave whatever the page managed to draw */ }
  }

  function renderPartnerTotals(rows) {
    const bars = document.getElementById("deptBars");
    const count = document.getElementById("dirCount");
    const total = rows.reduce((a, r) => a + Number(r.staff_count || 0), 0);
    const contractors = rows.reduce((a, r) => a + Number(r.contractor_count || 0), 0);

    if (count) {
      // "Showing 0 of 0" is what the page writes when the roster it counts came
      // back empty — true, and meaningless to somebody who was never going to
      // see a roster. Replaced with the figure that does mean something, and
      // held against the page's own renderer, which writes this element after
      // us and would otherwise put the zeroes straight back.
      const text = total + " people across " + rows.length + " departments" +
        (contractors ? " · " + contractors + " student contractors" : "");
      const apply = () => { if (count.textContent !== text) count.textContent = text; };
      apply();
      new MutationObserver(apply).observe(count, { childList: true, characterData: true, subtree: true });
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
    hide(document.getElementById("team"));            // the people section
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  let applied = false;

  SS.scope = {
    async apply() {
      if (applied || !SS.access) return;
      applied = true;
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
