// Shared content builder for modal and hover card
OC.buildCardContent = function(empId) {
  var emp = OC.employees.find(function(e) { return e.id === empId; });
  if (!emp) return '';
  var dept = OC.getDeptInfo(emp.dept);
  var manager = OC.getManager(emp);
  var directReports = OC.getChildren(emp.id);

  var content = '<div class="modal-accent" style="background:' + dept.color + '"></div>' +
    '<div class="modal-header" style="--tile-color:' + dept.color + '; --tile-color-r:' + dept.colorR + ';">' +
      '<div class="avatar">' + (emp.photoUrl ? '<img src="' + emp.photoUrl + '" alt="' + emp.name + '">' : OC.getInitials(emp.name)) + '</div>' +
      '<div class="tile-name">' + emp.name + '</div>' +
      '<div class="tile-title" style="color:' + dept.color + '">' + emp.title + '</div>' +
      '<div class="tile-level-badge">' + (emp.role === 'pm' ? 'Project Management' : 'Level ' + emp.level + ' \u00b7 ' + OC.LEVELS[emp.level]) + '</div>' +
    '</div>' +
    '<div class="modal-body" style="--tile-color:' + dept.color + '; --tile-color-r:' + dept.colorR + ';">';

  if (emp.responsibilities.length) {
    content += '<div class="tile-section"><div class="tile-section-title">RESPONSIBILITIES</div><ul class="tile-list">' +
      emp.responsibilities.map(function(r) { return '<li>' + r + '</li>'; }).join('') + '</ul></div>';
  }

  if (emp.kpis.length) {
    content += '<div class="tile-section"><div class="tile-section-title">KEY KPIs</div><ul class="tile-list kpi-list">' +
      emp.kpis.map(function(k) { return '<li>' + k + '</li>'; }).join('') + '</ul></div>';
  }

  if (directReports.length) {
    content += '<div class="tile-section"><div class="tile-section-title">DIRECT REPORTS (' + directReports.length + ')</div><ul class="tile-list">' +
      directReports.map(function(r) { return '<li>' + r.name + ' \u2014 ' + r.title + '</li>'; }).join('') + '</ul></div>';
  }

  content += '<div class="tile-meta">';
  if (manager) {
    content += '<div class="tile-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Reports to: ' + manager.name + ' (' + manager.title + ')</div>';
  }
  content += '<div class="tile-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Department: ' + dept.name + '</div>';
  if (emp.email) {
    content += '<div class="tile-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:' + emp.email + '">' + emp.email + '</a></div>';
  }
  content += '</div></div>';

  return content;
};

OC.openModal = function(empId) {
  var content = OC.buildCardContent(empId);
  if (!content) return;
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modalOverlay').classList.add('active');
};

OC.closeModal = function() {
  document.getElementById('modalOverlay').classList.remove('active');
};

OC.initModal = function() {
  document.getElementById('modalClose').addEventListener('click', OC.closeModal);
  document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) OC.closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') OC.closeModal();
  });
};
