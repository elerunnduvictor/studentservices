/* Start whether this file was loaded with the page or injected afterwards by
   shared/js/hub-boot.js once the database had answered — by then
   DOMContentLoaded has already fired and would never fire again. */
(function startOrgChart() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startOrgChart, { once: true });
    return;
  }

  // ── Render the chart ──
  OC.renderChart();

  // ── Event delegation for tiles ──
  var chartContainer = document.getElementById('chartContainer');

  // ── Tile click (open the card's detail body) ──
  // The +/- handle lives inside the card and opens the card's *reports*
  // instead; expand.js claims that click before this sees it.
  chartContainer.addEventListener('click', function (e) {
    if (e.target.closest('[data-view-more]')) return;
    if (e.target.closest('.tile-toggle')) return;
    var tile = e.target.closest('.tile:not(.spacer-tile)');
    if (!tile) return;
    var opening = !tile.classList.contains('expanded');
    tile.classList.toggle('expanded');

    /* Bring the opened card fully into view.

       A card triples in width when it opens, and one near an edge opens partly
       outside the window — the far-left and far-right columns, and the PM
       cards flanking a director, which start at the outer edge of the chart to
       begin with. Rather than special-casing each position, ask the scroller
       to make the card visible and let it work out the direction and distance.

       `nearest` moves as little as possible, so a card already fully visible
       does not move at all, and one that is half out slides just far enough.

       It has to wait for the width transition to finish, not just for the next
       frame. A frame in, the card is still its collapsed 220px and already
       fully visible, so the scroller correctly decided there was nothing to
       do — and then the card grew to 680px and hung off the edge anyway. */
    if (opening) {
      var scrolled = false;
      var bring = function () {
        if (scrolled) return;
        scrolled = true;
        /* Scrolling the chart's own scroller by a measured amount, rather than
           asking scrollIntoView to work it out. The chart container carries a
           scale() transform for zoom, and scrollIntoView reads through that
           inconsistently — it moved the card that was 13px out and ignored the
           one that was 960px out. This is just arithmetic on two rectangles. */
        var vp = document.getElementById('chartViewport');
        if (!vp) return;
        var vr = vp.getBoundingClientRect();
        var tr = tile.getBoundingClientRect();
        var pad = 20;
        var dx = 0;
        if (tr.right > vr.right - pad) dx = tr.right - vr.right + pad;
        // Left takes priority: if the card is too wide to fit either way, its
        // start is the half worth showing.
        if (tr.left - dx < vr.left + pad) dx = tr.left - vr.left - pad;
        if (Math.abs(dx) > 1) {
          vp.scrollBy({
            left: dx,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
          });
        }
      };
      tile.addEventListener('transitionend', function done(ev) {
        if (ev.propertyName !== 'width') return;
        tile.removeEventListener('transitionend', done);
        bring();
      });
      // Belt and braces: transitionend does not fire if the transition is
      // cancelled, or at all under reduced motion.
      setTimeout(bring, 420);
    }
  });

  // ── Initialize all modules ──
  // No initFilter: the department chips it drove are gone, and with them the
  // single-department view. The chart is one chart now, opened card by card.
  OC.initSearch();
  OC.initExpand('leadership');
  OC.initZoom();
  OC.initPan();
  OC.initToolbar();

  // The navbar's hamburger and theme button belong to js/shared.js, which
  // every other page uses too. The toolbar below it no longer has a hamburger
  // of its own — with the chips gone it holds only search and zoom, few enough
  // to wrap on a narrow screen.

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey && e.key === 'f') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) {
      e.preventDefault();
      document.getElementById('searchInput').focus();
    }
    if (document.activeElement.tagName !== 'INPUT') {
      if (e.key === '+' || e.key === '=') OC.zoomIn();
      if (e.key === '-') OC.zoomOut();
    }
  });

  // ── Open looking at the middle of the chart ──
  // The tree is centred inside a container wider than the window, so at
  // scrollLeft 0 the view sits against its left edge and the VP appears off to
  // the right. Nudge the scroller to the middle instead. Only on load: doing
  // this after every expand would yank the chart around under the cursor.
  (function centreChart() {
    var vp = document.getElementById('chartViewport');
    if (!vp) return;
    requestAnimationFrame(function () {
      var over = vp.scrollWidth - vp.clientWidth;
      if (over > 0) vp.scrollLeft = Math.round(over / 2);
    });
  })();

  // ── Init animations ──
  OC.initAnimations();
})();
