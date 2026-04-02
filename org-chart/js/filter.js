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
      }

      searchInput.value = '';
      searchCount.textContent = '';
      noResults.classList.remove('visible');
    });
  });
};
