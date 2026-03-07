OC.initToolbar = function() {
  // Expand All
  document.getElementById('expandAll').addEventListener('click', function() {
    document.querySelectorAll('.tile').forEach(function(t) { t.classList.add('expanded'); });
  });

  // Collapse All
  document.getElementById('collapseAll').addEventListener('click', function() {
    document.querySelectorAll('.tile').forEach(function(t) { t.classList.remove('expanded'); });
  });

  // Print
  document.getElementById('printBtn').addEventListener('click', function() {
    document.querySelectorAll('.tile').forEach(function(t) { t.classList.add('expanded'); });
    setTimeout(function() { window.print(); }, 200);
  });

  // Theme Toggle
  var themeBtn = document.getElementById('themeToggle');
  var moonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

  function updateThemeIcon() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeBtn.innerHTML = isDark ? sunIcon : moonIcon;
  }

  themeBtn.addEventListener('click', function() {
    var html = document.documentElement;
    var isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('oc-theme', isDark ? 'light' : 'dark');
    updateThemeIcon();
  });

  // Restore saved theme
  var savedTheme = localStorage.getItem('oc-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon();
};
