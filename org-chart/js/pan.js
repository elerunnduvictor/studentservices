OC.initPan = function() {
  var viewport = document.getElementById('chartViewport');
  var isPanning = false;
  var panStartX, panStartY, scrollStartX, scrollStartY;

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
};
