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

    /* Not on a phone or a portrait tablet.

       The chart is about 1550px wide. Fitting it into 390px asks for a zoom of
       0.22, which is below zoomMin, so it landed on 0.5 — and at 0.5 a job
       title is set in 5.6px and the level badge in 4.5px, which is not small
       type, it is a grey smudge. It did not even buy what it was for: at 0.5
       the chart is still 776px in a 390px viewport, so the reader was panning
       across it anyway, just unable to read it while they did.

       Left at 1 the chart is legible and the viewport scrolls, which is the
       same gesture for a better picture. Above this width the fit still
       does what it always did. */
    if (window.matchMedia && window.matchMedia('(max-width: 1000px)').matches) return;

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
