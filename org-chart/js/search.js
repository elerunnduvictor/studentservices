OC.initSearch = function() {
  var searchInput = document.getElementById('searchInput');
  var searchCount = document.getElementById('searchCount');
  var noResults = document.getElementById('noResults');

  searchInput.addEventListener('input', function() {
    var query = this.value.toLowerCase().trim();
    var tiles = document.querySelectorAll('.tile');

    if (!query) {
      tiles.forEach(function(t) { t.classList.remove('highlighted', 'dimmed'); });
      searchCount.textContent = '';
      noResults.classList.remove('visible');
      return;
    }

    var matchCount = 0;
    tiles.forEach(function(t) {
      var name = t.dataset.name || '';
      var title = t.dataset.title || '';
      var dept = t.dataset.dept || '';
      var deptName = (OC.DEPARTMENTS[dept] || {}).name || '';

      if (name.includes(query) || title.includes(query) || deptName.toLowerCase().includes(query)) {
        t.classList.add('highlighted');
        t.classList.remove('dimmed');
        matchCount++;
      } else {
        t.classList.remove('highlighted');
        t.classList.add('dimmed');
      }
    });

    searchCount.textContent = matchCount + ' found';
    noResults.classList.toggle('visible', matchCount === 0);

    var first = document.querySelector('.tile.highlighted');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};
