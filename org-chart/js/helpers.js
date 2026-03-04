OC.getInitials = function(name) {
  if (!name || name === 'Vice President') return 'VP';
  return name.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

OC.getChildren = function(parentId) {
  return OC.employees.filter(e => e.reportsTo === parentId);
};

OC.getDeptInfo = function(deptKey) {
  return OC.DEPARTMENTS[deptKey] || OC.DEPARTMENTS.executive;
};

OC.getManager = function(emp) {
  if (!emp.reportsTo) return null;
  return OC.employees.find(e => e.id === emp.reportsTo) || null;
};
