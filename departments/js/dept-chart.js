/* ═══════════════ PER-DEPT ORG CHART ═══════════════

   The department's slice of the org chart, drawn from OC.employees.

   This used to be an inline <script> at the foot of each department page, and
   that is why the cards here went stale. A plain script tag runs while the page
   is still parsing; hub-boot's fetch does not resolve until well after that. So
   the chart was built from org-chart/js/data.js — the bundled snapshot, which
   is only meant to stand in when the database is unreachable — and the live
   rows that arrived a moment later replaced OC.employees with nobody left
   watching. A title corrected in the database showed on /org-chart/ (which
   renders from data-then, after the fetch) and never here.

   Loading through data-then puts this on the same footing as the org chart
   page: OC.employees is whatever the boot settled on, live or bundled, and the
   chart is drawn once, from that.

   Requires window.DEPT_KEY (set inline on the page) and org-chart/js's
   renderer + expand, both already loaded by the time data-then runs. */
(function () {
  var container = document.getElementById('deptChart');
  if (!container || !window.OC || !OC.employees) return;

  /* The page says which department it is. Falling back to the display name
     keeps a page working if someone adds one and forgets the key. */
  var key = window.DEPT_KEY;
  if (!key && window.DEPT_NAME && OC.DEPARTMENTS) {
    key = Object.keys(OC.DEPARTMENTS).find(function (k) {
      return OC.DEPARTMENTS[k].name === window.DEPT_NAME;
    });
  }
  if (!key) return;

  var director = OC.employees.find(function (e) {
    return e.dept === key && e.level === 2 && e.role !== 'pm';
  });
  if (!director) return;

  var html = '<div class="tree">';
  html += OC.renderTileWithAssistants(director);
  html += OC.renderSubtree(director.id);
  html += '</div>';
  container.innerHTML = html;

  /* renderer.js puts a +/- handle on every card with reports; expand.js is
     what listens for them. Same opening state as the org chart page — the
     director, their senior managers, and everything below behind a +. It
     opened fully expanded at first, which put the entire department on
     screen at once and left nothing for the handles to do. */
  OC.initExpand('leadership', container);

  container.addEventListener('click', function (e) {
    if (e.target.closest('[data-view-more]')) {
      e.stopPropagation();
      return;
    }
    /* The +/- handle belongs to expand.js. Both listeners sit on this same
       element, and stopPropagation in the other one does not stop a
       listener on the element it fired from — only stopImmediatePropagation
       would, and that would depend on which of the two was registered
       first. Checking here is the version that cannot break: pressing +
       was expanding the node and opening the card's detail body at once. */
    if (e.target.closest('.tile-toggle')) return;
    var tile = e.target.closest('.tile:not(.spacer-tile)');
    if (tile) tile.classList.toggle('expanded');
  });
})();
