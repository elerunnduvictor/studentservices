document.addEventListener('DOMContentLoaded', function() {
  // ── Render the chart ──
  OC.renderChart();

  // ── Event delegation for tiles ──
  var chartContainer = document.getElementById('chartContainer');

  // ── Tile click (expand/collapse) ──
  chartContainer.addEventListener('click', function(e) {
    var tile = e.target.closest('.tile:not(.spacer-tile)');
    if (!tile) return;
    tile.classList.toggle('expanded');
  });

  // ── Tile double-click (open modal) ──
  chartContainer.addEventListener('dblclick', function(e) {
    var tile = e.target.closest('.tile:not(.spacer-tile)');
    if (tile && tile.dataset.id) {
      OC.openModal(tile.dataset.id);
    }
  });

  // ── Initialize all modules ──
  OC.initModal();
  OC.initSearch();
  OC.initFilter();
  OC.initZoom();
  OC.initPan();
  OC.initToolbar();

  // ── Hamburger menu toggle ──
  var menuToggle = document.getElementById('menuToggle');
  var toolbarCollapsible = document.getElementById('toolbarCollapsible');

  menuToggle.addEventListener('click', function() {
    menuToggle.classList.toggle('open');
    toolbarCollapsible.classList.toggle('open');
  });

  // Close menu when a filter or action button is clicked
  toolbarCollapsible.addEventListener('click', function(e) {
    if (e.target.closest('.filter-btn') || e.target.closest('.tool-btn')) {
      menuToggle.classList.remove('open');
      toolbarCollapsible.classList.remove('open');
    }
  });

  // Close menu on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.toolbar') && toolbarCollapsible.classList.contains('open')) {
      menuToggle.classList.remove('open');
      toolbarCollapsible.classList.remove('open');
    }
  });

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key === 'f') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) {
      e.preventDefault();
      document.getElementById('searchInput').focus();
    }
    if (document.activeElement.tagName !== 'INPUT') {
      if (e.key === '+' || e.key === '=') OC.zoomIn();
      if (e.key === '-') OC.zoomOut();
    }
  });

  // ── Init animations ──
  OC.initAnimations();

  // ── Hierarchy Tree toggle ──
  var hierarchyToggle = document.getElementById('hierarchyToggle');
  var hierarchySection = document.getElementById('hierarchySection');
  var chartViewport = document.getElementById('chartViewport');
  var legendEl = document.querySelector('.legend');
  var noResults = document.getElementById('noResults');
  var toolbarSearch = document.getElementById('toolbarSearch');
  var toolbarFilters = document.getElementById('toolbarFilters');
  var toolbarActions = document.getElementById('toolbarActions');

  hierarchyToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    var isActive = hierarchyToggle.classList.toggle('active');

    if (isActive) {
      // Remove active from department filter buttons
      document.querySelectorAll('.filter-btn[data-filter]').forEach(function(b) { b.classList.remove('active'); });
      // Show hierarchy, hide org chart
      chartViewport.style.display = 'none';
      legendEl.style.display = 'none';
      noResults.style.display = 'none';
      hierarchySection.style.display = '';
      // Recalculate max-height now that section is visible
      requestAnimationFrame(function() {
        document.querySelectorAll('.ht-dept:not(.ht-collapsed) .ht-dept-body').forEach(function(body) {
          body.style.maxHeight = body.scrollHeight + 'px';
        });
      });
    } else {
      // Show org chart, hide hierarchy
      hierarchySection.style.display = 'none';
      chartViewport.style.display = '';
      legendEl.style.display = '';
      // Re-activate "Leadership" filter
      document.querySelectorAll('.filter-btn[data-filter]').forEach(function(b) { b.classList.remove('active'); });
      document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
      // Show all branches in leadership view
      document.querySelectorAll('.dept-branch').forEach(function(b) { b.style.display = ''; });
      var tree = document.querySelector('.tree');
      if (tree) { tree.classList.add('leadership-view'); tree.classList.remove('single-dept-view'); }
    }
  });

  // When a department filter is clicked, deactivate hierarchy toggle and restore org chart
  document.querySelectorAll('.filter-btn[data-filter]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (hierarchyToggle.classList.contains('active')) {
        hierarchyToggle.classList.remove('active');
        hierarchySection.style.display = 'none';
        chartViewport.style.display = '';
        legendEl.style.display = '';
      }
    });
  });

  // ── Hierarchy tree: department collapse/expand (mobile) ──
  OC.toggleHtDept = function(header) {
    var chevron = header.querySelector('.ht-chevron');
    if (getComputedStyle(chevron).display === 'none') return;

    var dept = header.closest('.ht-dept');
    var body = dept.querySelector('.ht-dept-body');

    if (dept.classList.contains('ht-collapsed')) {
      dept.classList.remove('ht-collapsed');
      body.style.maxHeight = body.scrollHeight + 'px';
    } else {
      dept.classList.add('ht-collapsed');
      body.style.maxHeight = '0px';
    }
  };

  // Note: initial max-height is set when hierarchy section becomes visible

  // Recalculate on resize
  window.addEventListener('resize', function() {
    document.querySelectorAll('.ht-dept:not(.ht-collapsed) .ht-dept-body').forEach(function(body) {
      body.style.maxHeight = body.scrollHeight + 'px';
    });
  });
});
