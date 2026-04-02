OC.initFilter = function() {
  var searchInput = document.getElementById('searchInput');
  var searchCount = document.getElementById('searchCount');
  var noResults = document.getElementById('noResults');

  document.querySelectorAll('.filter-btn[data-filter]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');

      var filter = this.dataset.filter;
      var branches = document.querySelectorAll('.dept-branch');
      var tiles = document.querySelectorAll('.tile');

      var tree = document.querySelector('.tree');

      if (filter === 'all') {
        branches.forEach(function(b) { b.style.display = ''; });
        tiles.forEach(function(t) { t.classList.remove('dimmed'); });
        if (tree) { tree.classList.add('leadership-view'); tree.classList.remove('single-dept-view'); }
      } else {
        if (tree) { tree.classList.remove('leadership-view'); tree.classList.add('single-dept-view'); }
        branches.forEach(function(b) {
          if (b.dataset.branchDept === filter) {
            b.style.display = '';
          } else {
            b.style.display = 'none';
          }
        });
        tiles.forEach(function(t) { t.classList.remove('dimmed'); });

        // Fix spacer tile heights: find the skipped level and measure a real tile at that level
        requestAnimationFrame(function() {
          document.querySelectorAll('.spacer-node').forEach(function(spacerLi) {
            var spacerTile = spacerLi.querySelector('.tile.spacer-tile');
            if (!spacerTile) return;
            // The real child inside the spacer tells us the destination level
            var innerTile = spacerLi.querySelector('.tile:not(.spacer-tile)');
            var targetLevel = innerTile ? (parseInt(innerTile.dataset.level) - 1) : 4;
            // Find any visible tile at that level to use as height reference
            var refTile = document.querySelector('.tile[data-level="' + targetLevel + '"]:not(.spacer-tile)');
            if (!refTile || refTile.offsetHeight === 0) {
              // Fallback: any visible non-vp non-director tile
              refTile = document.querySelector('.tile:not(.spacer-tile):not(.vp-tile):not(.director-tile)');
            }
            if (!refTile || refTile.offsetHeight === 0) return;
            spacerTile.style.height = refTile.offsetHeight + 'px';
          });
        });
      }

      searchInput.value = '';
      searchCount.textContent = '';
      noResults.classList.remove('visible');
    });
  });
};
