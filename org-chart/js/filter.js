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

      if (filter === 'all') {
        // Show all branches and remove dimming
        branches.forEach(function(b) { b.style.display = ''; });
        tiles.forEach(function(t) { t.classList.remove('dimmed'); });
      } else {
        // Hide non-matching department branches, show matching ones
        branches.forEach(function(b) {
          if (b.dataset.branchDept === filter) {
            b.style.display = '';
          } else {
            b.style.display = 'none';
          }
        });
        // Ensure all visible tiles are not dimmed
        tiles.forEach(function(t) { t.classList.remove('dimmed'); });
      }

      searchInput.value = '';
      searchCount.textContent = '';
      noResults.classList.remove('visible');
    });
  });
};
