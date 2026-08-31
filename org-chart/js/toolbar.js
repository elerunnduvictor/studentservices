OC.initToolbar = function() {
  // Expand All / Collapse All work on the tree, not on the cards' detail
  // bodies. They used to add `.expanded` to all 53 cards at once, which threw
  // 53 overlapping 680px panels across the viewport — tolerable when the chart
  // only ever showed 13 cards, useless now. Opening the whole org is the thing
  // people actually want from a button called Expand All.
  document.getElementById('expandAll').addEventListener('click', function() {
    OC.expandAllNodes();
  });

  document.getElementById('collapseAll').addEventListener('click', function() {
    OC.collapseAllNodes();
  });

  // Print — build one-card-per-page layout, print it, then remove it
  document.getElementById('printBtn').addEventListener('click', function() {
    var container = document.createElement('div');
    container.id = 'printPages';
    container.className = 'print-pages';

    // Helper: walk the tree under a parent, depth-first.
    // Recurses into PMs as well so people who report to a PM (e.g. David
    // Koomson reports to Jess) aren't dropped from the printout.
    function collectTree(parentId) {
      var result = [];
      var pms = OC.getAssistants(parentId);
      pms.forEach(function(pm) {
        result.push(pm);
        result = result.concat(collectTree(pm.id));
      });
      var children = OC.getTreeChildren(parentId).sort(function(a, b) {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      });
      children.forEach(function(child) {
        result.push(child);
        result = result.concat(collectTree(child.id));
      });
      return result;
    }

    var deptOrder = ['records', 'enrollment', 'dean', 'digital'];
    var vp = OC.employees.find(function(e) { return e.level === 1; });
    var ordered = [vp];
    OC.getAssistants(vp.id).forEach(function(pm) {
      ordered.push(pm);
      ordered = ordered.concat(collectTree(pm.id));
    });
    deptOrder.forEach(function(deptKey) {
      var director = OC.employees.find(function(e) {
        return e.reportsTo === vp.id && e.dept === deptKey && e.role !== 'pm';
      });
      if (director) {
        ordered.push(director);
        ordered = ordered.concat(collectTree(director.id));
      }
    });

    ordered.forEach(function(emp) {
      var page = document.createElement('div');
      page.className = 'print-page';
      page.innerHTML = OC.buildCardContent(emp.id);
      container.appendChild(page);
    });

    document.body.appendChild(container);
    document.body.classList.add('print-mode');

    setTimeout(function() { window.print(); }, 100);
  });

  window.addEventListener('afterprint', function() {
    document.body.classList.remove('print-mode');
    var pages = document.getElementById('printPages');
    if (pages) pages.remove();
  });

  // No theme handling here. js/shared.js wires #themeToggle on every page and
  // this file used to wire it as well — with both attached, one click ran both
  // handlers and the theme flipped twice, landing back where it started. The
  // sun/moon icon swap went with it; the other pages show a static glyph.
};
