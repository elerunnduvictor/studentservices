OC.initPan = function() {
  var viewport = document.getElementById('chartViewport');
  var isPanning = false;
  var panStartX, panStartY, scrollStartX, scrollStartY;

  // Mouse panning (desktop/tablet)
  viewport.addEventListener('mousedown', function(e) {
    if (e.target.closest('.tile')) return;
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    scrollStartX = viewport.scrollLeft;
    scrollStartY = viewport.scrollTop;
  });

  window.addEventListener('mousemove', function(e) {
    if (!isPanning) return;
    viewport.scrollLeft = scrollStartX - (e.clientX - panStartX);
    viewport.scrollTop = scrollStartY - (e.clientY - panStartY);
  });

  window.addEventListener('mouseup', function() {
    isPanning = false;
  });

  // Touch panning (mobile/tablet)
  viewport.addEventListener('touchstart', function(e) {
    if (e.target.closest('.tile') || e.touches.length !== 1) return;
    isPanning = true;
    panStartX = e.touches[0].clientX;
    panStartY = e.touches[0].clientY;
    scrollStartX = viewport.scrollLeft;
    scrollStartY = viewport.scrollTop;
  }, { passive: true });

  viewport.addEventListener('touchmove', function(e) {
    if (!isPanning || e.touches.length !== 1) return;
    viewport.scrollLeft = scrollStartX - (e.touches[0].clientX - panStartX);
    viewport.scrollTop = scrollStartY - (e.touches[0].clientY - panStartY);
  }, { passive: true });

  viewport.addEventListener('touchend', function() {
    isPanning = false;
  });
};
