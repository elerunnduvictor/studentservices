OC.renderTile = function(emp) {
  var dept = OC.getDeptInfo(emp.dept);
  var manager = OC.getManager(emp);
  var isVP = emp.level === 1;
  var isDirector = emp.level === 2;
  var tileClass = isVP ? 'tile vp-tile' : isDirector ? 'tile director-tile' : 'tile';

  var responsibilitiesHtml = emp.responsibilities.length
    ? '<div class="tile-section"><div class="tile-section-title">Responsibilities</div><ul class="tile-list">' +
      emp.responsibilities.map(function(r) { return '<li>' + r + '</li>'; }).join('') +
      '</ul></div>' : '';

  var kpisHtml = emp.kpis.length
    ? '<div class="tile-section"><div class="tile-section-title">Key KPIs</div><ul class="tile-list kpi-list">' +
      emp.kpis.map(function(k) { return '<li>' + k + '</li>'; }).join('') +
      '</ul></div>' : '';

  var reportsToHtml = manager
    ? '<div class="tile-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Reports to: ' + manager.name + '</div>' : '';

  var emailHtml = emp.email
    ? '<div class="tile-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:' + emp.email + '">' + emp.email + '</a></div>' : '';

  var deptHtml = '<div class="tile-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' + dept.name + '</div>';

  return '<div class="' + tileClass + '" data-id="' + emp.id + '" data-dept="' + emp.dept + '" data-level="' + emp.level + '" data-name="' + emp.name.toLowerCase() + '" data-title="' + emp.title.toLowerCase() + '" style="--tile-color:' + dept.color + '; --tile-color-r:' + dept.colorR + ';">' +
    '<div class="tile-accent" style="background:' + dept.color + '"></div>' +
    '<div class="tile-header">' +
      '<div class="avatar">' + (emp.photoUrl ? '<img src="' + emp.photoUrl + '" alt="' + emp.name + '">' : OC.getInitials(emp.name)) + '</div>' +
      '<div class="tile-name">' + emp.name + '</div>' +
      '<div class="tile-title">' + emp.title + '</div>' +
      '<div class="tile-level-badge">Level ' + emp.level + ' \u00b7 ' + OC.LEVELS[emp.level] + '</div>' +
    '</div>' +
    '<div class="tile-expand-indicator">Click to expand \u00b7 Double-click for details</div>' +
    '<div class="tile-body"><div class="tile-body-inner">' +
      responsibilitiesHtml + kpisHtml +
      '<div class="tile-meta">' + reportsToHtml + deptHtml + emailHtml + '</div>' +
    '</div></div></div>';
};

OC.renderSubtree = function(parentId) {
  var parent = OC.employees.find(function(e) { return e.id === parentId; });
  var children = OC.getChildren(parentId);
  if (children.length === 0) return '';

  // Group children by level to detect skip-level reporting
  var normalChildren = [];
  var skipChildren = [];
  var parentLevel = parent ? parent.level : 0;

  children.forEach(function(child) {
    if (child.level > parentLevel + 1) {
      skipChildren.push(child);
    } else {
      normalChildren.push(child);
    }
  });

  var html = '<ul>';

  // Render normal (non-skip) children directly
  normalChildren.forEach(function(child) {
    var isDeptBranch = child.level === 2;
    var branchAttr = isDeptBranch
      ? ' class="dept-branch" data-branch-dept="' + child.dept + '" style="--dc:' + OC.getDeptInfo(child.dept).color + '"'
      : '';
    html += '<li' + branchAttr + '>';
    html += OC.renderTile(child);
    html += OC.renderSubtree(child.id);
    html += '</li>';
  });

  // Render skip-level children wrapped in spacer nodes
  skipChildren.forEach(function(child) {
    var gap = child.level - parentLevel - 1;
    var isDeptBranch = child.level === 2;
    var branchAttr = isDeptBranch
      ? ' class="dept-branch" data-branch-dept="' + child.dept + '" style="--dc:' + OC.getDeptInfo(child.dept).color + '"'
      : '';

    // Open spacer layers for each skipped level, with ghost tiles for height alignment
    for (var i = 0; i < gap; i++) {
      html += '<li class="spacer-node connectors-drawn">' +
        '<div class="tile spacer-tile"><div class="tile-accent"></div>' +
        '<div class="tile-header"><div class="avatar"></div>' +
        '<div class="tile-name">&nbsp;</div>' +
        '<div class="tile-title">&nbsp;</div>' +
        '<div class="tile-level-badge">&nbsp;</div>' +
        '</div></div><ul>';
    }

    html += '<li' + branchAttr + '>';
    html += OC.renderTile(child);
    html += OC.renderSubtree(child.id);
    html += '</li>';

    // Close spacer layers
    for (var j = 0; j < gap; j++) {
      html += '</ul></li>';
    }
  });

  html += '</ul>';
  return html;
};

OC.renderChart = function() {
  var vp = OC.employees.find(function(e) { return e.level === 1; });
  var html = '<div class="tree">';
  html += OC.renderTile(vp);
  html += OC.renderSubtree(vp.id);
  html += '</div>';
  document.getElementById('chartContainer').innerHTML = html;
};
