(function() {
  var zoomLevel = 1;
  var zoomStep = 0.1;
  var zoomMin = 0.5;
  var zoomMax = 1.5;

  function getContainer() { return document.getElementById('chartContainer'); }
  function getDisplay() { return document.getElementById('zoomDisplay'); }

  OC.applyZoom = function() {
    getContainer().style.transform = 'scale(' + zoomLevel + ')';
    getDisplay().textContent = Math.round(zoomLevel * 100) + '%';
  };

  OC.zoomIn = function() {
    zoomLevel = Math.min(zoomMax, zoomLevel + zoomStep);
    OC.applyZoom();
  };

  OC.zoomOut = function() {
    zoomLevel = Math.max(zoomMin, zoomLevel - zoomStep);
    OC.applyZoom();
  };

  OC.zoomReset = function() {
    zoomLevel = 1;
    OC.applyZoom();
  };

  OC.autoFitZoom = function() {
    var viewport = document.getElementById('chartViewport');
    var container = getContainer();
    var vw = viewport.clientWidth;
    var cw = container.scrollWidth;
    if (cw > vw) {
      zoomLevel = Math.max(zoomMin, (vw - 48) / cw);
      OC.applyZoom();
    }
  };

  OC.initZoom = function() {
    document.getElementById('zoomIn').addEventListener('click', OC.zoomIn);
    document.getElementById('zoomOut').addEventListener('click', OC.zoomOut);
    document.getElementById('zoomReset').addEventListener('click', OC.zoomReset);

    document.getElementById('chartViewport').addEventListener('wheel', function(e) {
      if (e.ctrlKey) {
        e.preventDefault();
        zoomLevel += e.deltaY > 0 ? -zoomStep : zoomStep;
        zoomLevel = Math.max(zoomMin, Math.min(zoomMax, zoomLevel));
        OC.applyZoom();
      }
    }, { passive: false });
  };
})();
