document.addEventListener('DOMContentLoaded', function() {
  // ── Render the chart ──
  OC.renderChart();

  // ── Event delegation for tiles ──
  var chartContainer = document.getElementById('chartContainer');

  // ── Hover card setup ──
  var hoverCard = document.getElementById('hoverCard');
  var hoverContent = document.getElementById('hoverCardContent');
  var hoverTimer = null;
  var hideTimer = null;
  var currentHoverId = null;
  var isMobile = function() { return window.matchMedia('(max-width: 900px)').matches; };

  function positionHoverCard(tile) {
    var rect = tile.getBoundingClientRect();
    var cardWidth = 680;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // Try to place to the right of the tile
    var left = rect.right + 16;
    // If not enough room on the right, place to the left
    if (left + cardWidth > vw - 16) {
      left = rect.left - cardWidth - 16;
    }
    // If still off-screen, center horizontally
    if (left < 16) {
      left = Math.max(16, (vw - cardWidth) / 2);
    }

    // Vertically align with tile top, but keep within viewport
    var top = rect.top;
    hoverCard.style.left = left + 'px';
    hoverCard.style.top = top + 'px';

    // After rendering, check if it overflows bottom
    requestAnimationFrame(function() {
      var cardRect = hoverCard.getBoundingClientRect();
      if (cardRect.bottom > vh - 16) {
        hoverCard.style.top = Math.max(16, vh - cardRect.height - 16) + 'px';
      }
    });
  }

  function showHoverCard(tile) {
    var empId = tile.dataset.id;
    if (!empId || empId === currentHoverId) return;
    currentHoverId = empId;

    var content = OC.buildCardContent(empId);
    if (!content) return;

    hoverContent.innerHTML = content;
    positionHoverCard(tile);
    hoverCard.classList.add('visible');
  }

  function hideHoverCard() {
    clearTimeout(hoverTimer);
    clearTimeout(hideTimer);
    hoverCard.classList.remove('visible');
    currentHoverId = null;
  }

  // ── Tile click (expand/collapse) — hides hover card ──
  chartContainer.addEventListener('click', function(e) {
    var tile = e.target.closest('.tile:not(.spacer-tile)');
    if (!tile) return;
    hideHoverCard();
    tile.classList.toggle('expanded');
  });

  // ── Tile double-click (open modal) ──
  chartContainer.addEventListener('dblclick', function(e) {
    var tile = e.target.closest('.tile:not(.spacer-tile)');
    if (tile && tile.dataset.id) {
      OC.openModal(tile.dataset.id);
    }
  });

  // ── Hover card show/hide ──
  chartContainer.addEventListener('mouseenter', function(e) {
    if (isMobile()) return;
    var tile = e.target.closest('.tile:not(.spacer-tile)');
    if (!tile || tile.classList.contains('expanded')) return;

    clearTimeout(hideTimer);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function() { showHoverCard(tile); }, 300);
  }, true);

  chartContainer.addEventListener('mouseleave', function(e) {
    var tile = e.target.closest('.tile:not(.spacer-tile)');
    if (!tile) return;

    clearTimeout(hoverTimer);
    hideTimer = setTimeout(hideHoverCard, 200);
  }, true);

  // Keep hover card visible when mouse is over it
  hoverCard.addEventListener('mouseenter', function() {
    clearTimeout(hideTimer);
  });

  hoverCard.addEventListener('mouseleave', function() {
    hideTimer = setTimeout(hideHoverCard, 200);
  });

  // Close button on hover card
  document.getElementById('hoverCardClose').addEventListener('click', hideHoverCard);

  // Hide hover card when modal opens
  var origOpenModal = OC.openModal;
  OC.openModal = function(empId) {
    hideHoverCard();
    origOpenModal(empId);
  };

  // ── Initialize all modules ──
  OC.initModal();
  OC.initSearch();
  OC.initFilter();
  OC.initZoom();
  OC.initPan();
  OC.initToolbar();

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
    hideHoverCard();

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
      // Re-activate "All" filter
      document.querySelectorAll('.filter-btn[data-filter]').forEach(function(b) { b.classList.remove('active'); });
      document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
      // Show all branches
      document.querySelectorAll('.dept-branch').forEach(function(b) { b.style.display = ''; });
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
