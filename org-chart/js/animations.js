(function() {
  var isMobile = function() { return window.matchMedia('(max-width: 900px)').matches; };

  function initEntranceAnimations() {
    var tiles = document.querySelectorAll('.tile:not(.spacer-tile)');
    var tileIndex = 0;

    tiles.forEach(function(t) { t.classList.add('animate-pending'); });

    requestAnimationFrame(function() {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var tile = entry.target;
            var delay = tileIndex * 40;
            tile.style.animationDelay = delay + 'ms';
            tile.classList.remove('animate-pending');
            tile.classList.add('animate-in');
            tileIndex++;
            observer.unobserve(tile);
          }
        });
      }, { threshold: 0.01, rootMargin: '200px' });

      tiles.forEach(function(t) { observer.observe(t); });

      // Safety net: force visible after 3s
      setTimeout(function() {
        tiles.forEach(function(t) {
          if (t.classList.contains('animate-pending')) {
            t.classList.remove('animate-pending');
            t.classList.add('animate-in');
          }
        });
      }, 3000);
    });
  }

  function initConnectorDrawing() {
    var treeItems = document.querySelectorAll('.tree li');
    var treeUls = document.querySelectorAll('.tree ul');
    var delay = 0;

    treeUls.forEach(function(ul) {
      setTimeout(function() { ul.classList.add('connectors-drawn'); }, delay);
      delay += 100;
    });

    treeItems.forEach(function(li) {
      setTimeout(function() { li.classList.add('connectors-drawn'); }, delay);
      delay += 30;
    });
  }

  function initTiltEffect() {
    if (isMobile()) return;
    var container = document.getElementById('chartContainer');

    container.addEventListener('mousemove', function(e) {
      var tile = e.target.closest('.tile');
      if (!tile || tile.classList.contains('dimmed')) return;

      var rect = tile.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;

      tile.classList.add('tilt-active');
      tile.style.transform = 'perspective(600px) rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg) translateY(-4px) scale(1.02)';
    });

    container.addEventListener('mouseleave', function(e) {
      var tile = e.target.closest('.tile');
      if (tile) {
        tile.classList.remove('tilt-active');
        tile.style.transform = '';
      }
    }, true);

    container.addEventListener('mouseout', function(e) {
      var tile = e.target.closest('.tile');
      var relatedTile = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.tile') : null;
      if (tile && tile !== relatedTile) {
        tile.classList.remove('tilt-active');
        tile.style.transform = '';
      }
    });
  }

  OC.initAnimations = function() {
    requestAnimationFrame(function() {
      initConnectorDrawing();
      setTimeout(initEntranceAnimations, 200);
      initTiltEffect();
    });

    var wasDesktop = !isMobile();
    window.addEventListener('resize', function() {
      var isDesktop = !isMobile();
      if (isDesktop && !wasDesktop) initTiltEffect();
      wasDesktop = isDesktop;
    });
  };
})();
