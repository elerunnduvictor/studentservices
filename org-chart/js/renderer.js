OC.renderTile = function(emp) {
  var dept = OC.getDeptInfo(emp.dept);
  var manager = OC.getManager(emp);
  var isVP = emp.level === 1;
  var isDirector = emp.level === 2 && emp.role !== 'pm';
  var isPM = emp.role === 'pm';
  var tileClass = isVP ? 'tile vp-tile' : isDirector ? 'tile director-tile' : 'tile';
  if (isPM) tileClass += ' assistant-tile';

  var levelBadge = isPM
    ? 'Contractor'
    : isVP ? OC.LEVELS[emp.level]
    : (emp.status || 'FTE') + ' \u00b7 ' + OC.LEVELS[emp.level];

  var responsibilitiesHtml = emp.responsibilities.length
    ? '<div class="tile-section"><div class="tile-section-title">RESPONSIBILITIES</div><ul class="tile-list">' +
      emp.responsibilities.map(function(r) { return '<li>' + r + '</li>'; }).join('') +
      '</ul></div>' : '';

  var kpisHtml = emp.kpis.length
    ? '<div class="tile-section"><div class="tile-section-title">KEY KPIs</div><ul class="tile-list kpi-list">' +
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
      '<div class="tile-level-badge">' + levelBadge + '</div>' +
    '</div>' +
    '<div class="tile-expand-indicator">Click to expand \u00b7 Double-click for details</div>' +
    '<div class="tile-body"><div class="tile-body-inner">' +
      responsibilitiesHtml + kpisHtml +
      '<div class="tile-meta">' + reportsToHtml + deptHtml + emailHtml + '</div>' +
    '</div></div></div>';
};

OC.renderTileWithAssistants = function(emp) {
  var assistants = OC.getAssistants(emp.id);
  if (assistants.length === 0) return OC.renderTile(emp);

  var left = assistants.filter(function(a) { return a.pmPosition === 'left'; });
  var right = assistants.filter(function(a) { return a.pmPosition === 'right'; });

  var html = '<div class="tile-with-assistants">';
  html += OC.renderTile(emp);

  if (left.length) {
    html += '<div class="assistant-group assistant-group-left">';
    left.forEach(function(a) {
      html += '<div class="assistant-slot">' + OC.renderTile(a) + '</div>';
    });
    html += '</div>';
  }

  if (right.length) {
    html += '<div class="assistant-group assistant-group-right">';
    right.forEach(function(a) {
      html += '<div class="assistant-slot">' + OC.renderTile(a) + '</div>';
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
};

OC.renderSubtree = function(parentId) {
  var parent = OC.employees.find(function(e) { return e.id === parentId; });
  var children = OC.getTreeChildren(parentId);
  if (children.length === 0) return '';

  var parentLevel = parent ? parent.level : 0;

  var html = '<ul>';

  children.forEach(function(child) {
    var isDeptBranch = child.level === 2;
    var deptColor = OC.getDeptInfo(child.dept).color;

    // Check if this child has assistants and calculate extra padding
    var childAssistants = OC.getAssistants(child.id);
    var hasLeftPM = childAssistants.some(function(a) { return a.pmPosition === 'left'; });
    var hasRightPM = childAssistants.some(function(a) { return a.pmPosition === 'right'; });
    var extraStyles = '';
    if (hasLeftPM) extraStyles += 'padding-left:260px;--extra-pl:252px;';
    if (hasRightPM) extraStyles += 'padding-right:260px;--extra-pr:252px;';

    var branchAttr = isDeptBranch
      ? ' class="dept-branch" data-branch-dept="' + child.dept + '" style="--dc:' + deptColor + ';' + extraStyles + '"'
      : (extraStyles ? ' style="' + extraStyles + '"' : '');
    var gap = child.level - parentLevel - 1;

    if (gap > 0) {
      // Skip-level: wrap in spacer nodes with ghost tiles for height alignment
      for (var i = 0; i < gap; i++) {
        html += '<li class="spacer-node connectors-drawn">' +
          '<div class="tile spacer-tile"><div class="tile-accent"></div>' +
          '<div class="tile-header"><div class="avatar">&nbsp;</div>' +
          '<div class="tile-name">&nbsp;</div>' +
          '<div class="tile-title">&nbsp;</div>' +
          '<div class="tile-level-badge">&nbsp;</div></div>' +
          '<div class="tile-expand-indicator">&nbsp;</div>' +
          '<div class="spacer-connector"></div></div><ul>';
      }
      html += '<li' + branchAttr + '>';
      html += OC.renderTileWithAssistants(child);
      html += OC.renderSubtree(child.id);
      html += '</li>';
      for (var j = 0; j < gap; j++) {
        html += '</ul></li>';
      }
    } else {
      html += '<li' + branchAttr + '>';
      html += OC.renderTileWithAssistants(child);
      html += OC.renderSubtree(child.id);
      html += '</li>';
    }
  });

  html += '</ul>';
  return html;
};

OC.renderChart = function() {
  var vp = OC.employees.find(function(e) { return e.level === 1; });
  var html = '<div class="tree">';
  html += OC.renderTileWithAssistants(vp);
  html += OC.renderSubtree(vp.id);
  html += '</div>';
  document.getElementById('chartContainer').innerHTML = html;
};
