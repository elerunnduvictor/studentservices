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
    ? '<div class="tile-section"><div class="tile-section-title">STEWARDSHIPS</div><ul class="tile-list">' +
      emp.responsibilities.map(function(r) { return '<li>' + r + '</li>'; }).join('') +
      '</ul></div>' : '';

  var kpisHtml = emp.kpis.length
    ? '<div class="tile-section"><div class="tile-section-title">KEY KPIs</div><ul class="tile-list kpi-list">' +
      emp.kpis.map(function(k) { return '<li>' + k + '</li>'; }).join('') +
      '</ul></div>' : '';

  var directReports = OC.getChildren(emp.id);
  var directReportsHtml = directReports.length
    ? '<div class="tile-section"><div class="tile-section-title">DIRECT REPORTS (' + directReports.length + ')</div><ul class="tile-list">' +
      directReports.map(function(r) { return '<li>' + r.name + ' — ' + r.title + '</li>'; }).join('') +
      '</ul></div>' : '';

  var reportsToHtml = manager
    ? '<div class="tile-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Reports to: ' + manager.name + '</div>' : '';

  var emailButtonHtml = emp.email
    ? '<a class="tile-email" href="mailto:' + emp.email + '" data-view-more><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' + emp.email + '</a>'
    : '';

  var deptHtml = '<div class="tile-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' + dept.name + '</div>';

  // The +/- handle. Present only where there is something under the card, so
  // its absence is meaningful: a card with no handle is a leaf. Counts PMs as
  // reports, because they are — they just sit beside rather than below.
  var hasReports = OC.getChildren(emp.id).length > 0;
  var toggleHtml = hasReports
    ? '<button class="tile-toggle" type="button" data-toggle="' + emp.id + '"' +
      ' aria-expanded="false" title="Show who reports to ' + emp.name + '"' +
      ' aria-label="Show who reports to ' + emp.name + '">' +
        '<svg class="tile-toggle-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">' +
          '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' +
        '</svg>' +
        '<svg class="tile-toggle-minus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">' +
          '<line x1="5" y1="12" x2="19" y2="12"/>' +
        '</svg>' +
      '</button>'
    : '';

  var viewMoreHtml = !isVP
    ? '<a class="tile-view-more" href="' + (emp.roleInventoryUrl || '#') + '" target="_blank" rel="noopener" data-view-more>View Role Inventory <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>'
    : '';

  return '<div class="' + tileClass + '" data-id="' + emp.id + '" data-dept="' + emp.dept + '" data-level="' + emp.level + '" data-name="' + emp.name.toLowerCase() + '" data-title="' + emp.title.toLowerCase() + '" title="Click for details" style="--tile-color:' + dept.color + '; --tile-color-r:' + dept.colorR + ';">' +
    '<div class="tile-accent" style="background:' + dept.color + '"></div>' +
    '<div class="tile-header">' +
      '<div class="avatar">' + (emp.photoUrl ? '<img src="' + emp.photoUrl + '" alt="' + emp.name + '" loading="lazy" onerror="this.outerHTML=\'' + OC.getInitials(emp.name) + '\'">' : OC.getInitials(emp.name)) + '</div>' +
      '<div class="tile-name">' + emp.name + '</div>' +
      '<div class="tile-title">' + emp.title + '</div>' +
      '<div class="tile-level-badge">' + levelBadge + '</div>' +
    '</div>' +
    '<div class="tile-expand-indicator">Click for details</div>' +
    toggleHtml +
    '<div class="tile-body"><div class="tile-body-inner">' +
      responsibilitiesHtml + kpisHtml + directReportsHtml +
      '<div class="tile-meta">' +
        '<div class="tile-meta-row">' + reportsToHtml + viewMoreHtml + '</div>' +
        '<div class="tile-meta-row">' + deptHtml + emailButtonHtml + '</div>' +
      '</div>' +
    '</div></div></div>';
};

// Everyone flanks their PMs — the VP, the directors, and PMs with PMs of
// their own. Directors used to be the exception, dropping their PMs into the
// row of children below them instead; now that a card's handle reveals its own
// reports, "beside" is what distinguishes a PM from a line report, so the
// exception had to go.
OC.renderTileWithAssistants = function(emp) {
  var assistants = OC.getAssistants(emp.id);
  if (assistants.length === 0) return OC.renderTile(emp);

  var left = assistants.filter(function(a) { return a.pmPosition === 'left'; });
  var right = assistants.filter(function(a) { return a.pmPosition !== 'left'; });

  var html = '<div class="tile-with-assistants">';
  html += OC.renderTile(emp);

  if (left.length) {
    html += '<div class="assistant-group assistant-group-left">';
    left.forEach(function(a) {
      html += '<div class="assistant-slot">' + OC.renderTileWithAssistants(a) + '</div>';
    });
    html += '</div>';
  }

  if (right.length) {
    html += '<div class="assistant-group assistant-group-right">';
    right.forEach(function(a) {
      html += '<div class="assistant-slot">' + OC.renderTileWithAssistants(a) + '</div>';
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
};

OC.renderSubtree = function(parentId) {
  var parent = OC.employees.find(function(e) { return e.id === parentId; });
  // PMs are never in this row: every parent flanks them instead.
  var children = OC.getTreeChildren(parentId);
  if (children.length === 0) return '';

  var parentLevel = parent ? parent.level : 0;

  var html = '<ul>';

  children.forEach(function(child) {
    var isPM = child.role === 'pm';
    var isDeptBranch = child.level === 2 && !isPM;
    var deptColor = OC.getDeptInfo(child.dept).color;

    // Room for the flanking PMs, as classes rather than inline padding.
    // Inline padding was unconditional, so once PMs could be hidden it held
    // 208px of empty space open beside a director with nothing in it. The CSS
    // applies these only while that card's PMs are actually showing.
    var childAssistants = OC.getAssistants(child.id);
    var hasLeftPM = childAssistants.some(function(a) { return a.pmPosition === 'left'; });
    var hasRightPM = childAssistants.some(function(a) { return a.pmPosition !== 'left'; });

    var classNames = [];
    if (isDeptBranch) classNames.push('dept-branch');
    if (isPM) classNames.push('pm-branch');
    if (hasLeftPM) classNames.push('has-pm-left');
    if (hasRightPM) classNames.push('has-pm-right');
    var classAttr = classNames.length ? ' class="' + classNames.join(' ') + '"' : '';
    var inlineStyles = (isDeptBranch ? '--dc:' + deptColor + ';' : '');
    var styleAttr = inlineStyles ? ' style="' + inlineStyles + '"' : '';
    var deptAttr = isDeptBranch ? ' data-branch-dept="' + child.dept + '"' : '';
    var branchAttr = classAttr + deptAttr + ' data-lvl="' + child.level + '"' + styleAttr;
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
          '<div class="tile-body"><div class="tile-body-inner"></div></div>' +
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
  // No `leadership-view` class any more. That was a whole-tree mode that hid
  // everything below level 3 with `display:none !important`, which is exactly
  // the thing per-card collapsing has to be able to override. The same opening
  // view is now produced by setting each node's own state — see OC.initExpand.
  var html = '<div class="tree">';
  html += OC.renderTileWithAssistants(vp);
  html += OC.renderSubtree(vp.id);
  html += '</div>';
  document.getElementById('chartContainer').innerHTML = html;
};
