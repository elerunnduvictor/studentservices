/* ═══════════════════════════════════════════════════════════════════════════
   PER-CARD EXPAND / COLLAPSE

   Every card with anyone under it carries a handle: + to show them, − to put
   them away. It replaces the old whole-tree modes — a "leadership view" that
   hid everything below level 3, and a per-department view that hid every
   branch but one. Both answered the same question ("show me less") with a
   setting that applied everywhere; this answers it per card.

   ── Two flags, one button ──

   A card has two kinds of report and they sit in different places:

     · line reports, in the <ul> below the card
     · project managers, in .assistant-group beside it, left and right

   So the scope carries two classes, `is-collapsed` for the row below and
   `pm-collapsed` for the flanks, and the one handle drives both. The reason
   they are separate flags rather than one is the opening view: it has to match
   the leadership chart exactly, and that showed directors *with* their senior
   managers but *without* their PMs. That state is only expressible if the two
   can differ. After the first press they always move together.

   ── What counts as a node ──

   Everyone below the VP sits in an <li>. The VP does not — the renderer puts
   the VP's card and its <ul> side by side as children of `.tree` — so `.tree`
   is the VP's scope. Both have the same shape (a card, an optional
   .assistant-group, an optional <ul>), so one set of rules covers them.

   ── Motion ──

   Hiding is `display:none`, which cannot be transitioned, so the reveal is an
   animation on the cards themselves rather than on the container: they are
   marked `is-revealing` for one beat and the class comes off on animationend.
   Collapsing is immediate — waiting to hide something reads as lag, while
   waiting to show it reads as movement. Respects reduced-motion.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* The element that owns a card's children: its <li>, or `.tree` for the VP,
     whose card is not wrapped in one.

     A card inside an .assistant-group has neither. It is a PM flanking someone
     else, and its own PMs come out with it when that someone is opened, so it
     owns nothing to toggle. Saying so explicitly matters: `closest('li')`
     returns null from inside a flanking group, and the `|| closest('.tree')`
     below then handed back the VP's scope — so a handle there did not do
     nothing, it collapsed the entire chart. The renderer no longer puts one
     there; this makes it harmless if it ever does again. */
  function scopeOf(tile) {
    if (tile.closest('.assistant-group')) return null;
    return tile.closest('li') || tile.closest('.tree');
  }

  function isOpen(scope) {
    return !scope.classList.contains('is-collapsed') &&
           !scope.classList.contains('pm-collapsed');
  }

  /* Cards revealed by this press, so the animation lands on them and not on
     everything already on screen. Only one level down: opening a director
     shows its senior managers, and each of those keeps its own handle. */
  function revealed(scope) {
    var out = [];
    scope.querySelectorAll(':scope > .tile-with-assistants > .assistant-group .tile')
         .forEach(function (t) { out.push(t); });
    scope.querySelectorAll(':scope > ul > li > .tile-with-assistants > .tile,' +
                           ':scope > ul > li > .tile')
         .forEach(function (t) { out.push(t); });
    // A skipped level puts spacer nodes in between; the real card is deeper.
    scope.querySelectorAll(':scope > ul > li.spacer-node .tile:not(.spacer-tile)')
         .forEach(function (t) { out.push(t); });
    return out;
  }

  function animateIn(scope) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    revealed(scope).forEach(function (tile, i) {
      tile.classList.remove('is-revealing');
      // Reading offsetWidth restarts the animation when a card is reopened
      // before its previous one finished.
      void tile.offsetWidth;
      tile.style.setProperty('--reveal-delay', (Math.min(i, 8) * 26) + 'ms');
      tile.classList.add('is-revealing');
      tile.addEventListener('animationend', function done() {
        tile.classList.remove('is-revealing');
        tile.style.removeProperty('--reveal-delay');
        tile.removeEventListener('animationend', done);
      });
    });
  }

  /* Closing returns a card to how it was, which is not the same as empty.

     Collapsing used to set both flags, so pressing - on a director hid its
     project managers *and* the senior managers that had been on screen since
     the page loaded — press + on Mark Gefrom, press - again, and Brad, Kari
     and Matthew were gone. Nobody asked for them to go; they were never part
     of what the + revealed.

     So each node remembers the state it opened in, and - restores that rather
     than hiding everything. For a director that means the PMs go and the
     senior managers stay. For a card further down, whose reports were hidden
     to begin with, restoring its opening state does hide them — which is what
     - means there. Same button, and in both cases it undoes exactly what the +
     did. */
  function setOpen(scope, open) {
    if (open) {
      scope.classList.remove('is-collapsed', 'pm-collapsed');
    } else {
      scope.classList.toggle('is-collapsed', scope.dataset.initCollapsed === '1');
      scope.classList.toggle('pm-collapsed', scope.dataset.initPm === '1');
    }
    var btn = scope.querySelector(':scope > .tile-with-assistants > .tile > .tile-toggle,' +
                                 ':scope > .tile > .tile-toggle');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) animateIn(scope);
  }

  OC.toggleNode = function (tile) {
    var scope = scopeOf(tile);
    if (!scope) return;
    setOpen(scope, !isOpen(scope));
  };

  /* The opening view, node by node: the VP and the directors showing their
     line reports but not their PMs, everyone below them closed. This is the
     leadership chart, reproduced without a mode. */
  OC.applyInitialCollapse = function (root) {
    var tree = (root || document).querySelector('.tree');
    if (!tree) return;

    tree.classList.remove('is-collapsed');
    tree.classList.add('pm-collapsed');
    tree.dataset.initCollapsed = '0';
    tree.dataset.initPm = '1';

    tree.querySelectorAll('li[data-lvl]').forEach(function (li) {
      var lvl = parseInt(li.dataset.lvl, 10);
      var closed = lvl >= 3;
      li.classList.toggle('is-collapsed', closed);
      li.classList.add('pm-collapsed');
      // What - will put it back to.
      li.dataset.initCollapsed = closed ? '1' : '0';
      li.dataset.initPm = '1';
    });

    // Every handle starts on +: each of these nodes still has something to
    // show, even the ones already displaying their line reports.
    tree.querySelectorAll('.tile-toggle').forEach(function (b) {
      b.setAttribute('aria-expanded', 'false');
    });
  };

  OC.expandAllNodes = function (root) {
    var tree = (root || document).querySelector('.tree');
    if (!tree) return;
    tree.classList.remove('is-collapsed', 'pm-collapsed');
    tree.querySelectorAll('li').forEach(function (li) {
      li.classList.remove('is-collapsed', 'pm-collapsed');
    });
    // Only the opening call sets the baseline; Expand All from the toolbar
    // must not redefine what - means afterwards.
    if (!tree.dataset.initCollapsed) {
      tree.dataset.initCollapsed = '0';
      tree.dataset.initPm = '0';
      tree.querySelectorAll('li').forEach(function (li) {
        li.dataset.initCollapsed = '0';
        li.dataset.initPm = '0';
      });
    }
    tree.querySelectorAll('.tile-toggle').forEach(function (b) {
      b.setAttribute('aria-expanded', 'true');
    });
  };

  OC.collapseAllNodes = function (root) {
    OC.applyInitialCollapse(root);
  };

  /* `initial` picks the opening state, because the two places this runs want
     different ones. The org chart wants the leadership view. A department page
     is already a single branch that someone navigated to deliberately, so it
     opens showing everything — collapsing it by default would hide the only
     thing that page is for. Both still get working handles.

     `container` is the org chart's; a department page passes its own. */
  OC.initExpand = function (initial, container) {
    container = container || document.getElementById('chartContainer');
    if (!container) return;
    if (initial === 'open') OC.expandAllNodes(container);
    else OC.applyInitialCollapse(container);

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('.tile-toggle');
      if (!btn) return;
      // The card itself opens its detail body on click; the handle must not
      // do both.
      e.stopPropagation();
      e.preventDefault();
      var tile = btn.closest('.tile');
      if (tile) OC.toggleNode(tile);
    });
  };
})();
