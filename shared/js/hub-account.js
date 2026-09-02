/* ═══════════════════════════════════════════════════════════════════════════
   ACCOUNT CHIP

   Who is signed in, and a way out. Sits at the top right of every hub page.

   It earns its place beyond politeness: what a person sees now depends on who
   they are signed in as. When a partner and a director look at the same URL and
   get different pages, "which account am I?" stops being a curiosity and
   becomes the first question worth answering — and the role is shown alongside
   the address for exactly that reason.

   Injected rather than added to eleven HTML files, so it cannot drift out of
   step between pages.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = (window.SS = window.SS || {});
  // Captured now: document.currentScript is only meaningful while this file is
  // first executing, and is null by the time mount() runs.
  const HERE = (document.currentScript && document.currentScript.src) || "";
  // What shows under the address is the person's job — Senior Manager, Director
  // of Student Records, Project Manager — read from the directory. Describing
  // the permission instead ("Full access", "Partner view") told them something
  // they already knew and nothing about themselves.
  //
  // Anyone outside Student Services is simply "Partner": they have no directory
  // row, and no permission to read one.
  const PARTNER = "Partner";

  function signOut() {
    // The offline read goes too, and first — it holds the rows this person was
    // served, and the next person at this machine must not find them. Before
    // the markers below, because the cache is keyed by the address in
    // ss_user_session and removing that first would orphan it.
    try { if (window.SS && SS.data && SS.data.clearCache) SS.data.clearCache(); }
    catch { /* nothing cached, or storage refused */ }

    // And the cookie middleware.js reads, or the next request would still be
    // let past the gate on the way out.
    try { window.SS_CONFIG.clearSessionCookie(); } catch { /* no cookies */ }

    // Both the hub's own marker and the database session, or the next visit
    // would sign straight back in as whoever just left.
    ["ss_user_session", "ss_last_activity", "ss_hub_supabase"].forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* private mode */ }
    });
    location.replace("/login/index.html");
  }

  function build(email, role) {
    const wrap = document.createElement("div");
    wrap.className = "hub-account";
    const initials = (email || "?").slice(0, 2).toUpperCase();
    wrap.innerHTML =
      '<button type="button" class="hub-account-btn" aria-haspopup="true" aria-expanded="false">' +
        '<span class="hub-account-avatar" aria-hidden="true">' + initials + "</span>" +
        '<span class="hub-account-text">' +
          '<span class="hub-account-email"></span>' +
          '<span class="hub-account-role"></span>' +
        "</span>" +
      "</button>" +
      '<div class="hub-account-menu" hidden>' +
        '<div class="hub-account-menu-email"></div>' +
        // Where an accessibility preference belongs: one place, reachable from
        // every page, rather than a control repeated beside each chart.
        '<button type="button" class="hub-account-tex" aria-pressed="false">' +
          '<span class="hub-account-tex-text">' +
            '<span class="hub-account-tex-label">Colour-blind friendly charts</span>' +
            '<span class="hub-account-tex-hint">Adds patterns so chart colours ' +
              'can be told apart</span>' +
          "</span>" +
          '<span class="hub-account-tex-state">Off</span>' +
        "</button>" +
        '<button type="button" class="hub-account-signout">Sign out</button>' +
      "</div>";

    wrap.querySelector(".hub-account-email").textContent = email;
    wrap.querySelector(".hub-account-role").textContent = role || "";
    wrap.querySelector(".hub-account-menu-email").textContent = email;

    const btn = wrap.querySelector(".hub-account-btn");
    const menu = wrap.querySelector(".hub-account-menu");

    /* Moved to <body>, not left as a normal descendant of the chip.
       .hero-compact (home.css) clips its own overflow on purpose, for the
       background glow/arc — and on the home page this chip lives inside
       it. A short menu fit inside that clip box by luck; the real one
       (email, the colour-blind toggle, Sign out) is taller than the room
       .hero-compact leaves, so its bottom — Sign out — rendered past the
       clip and was genuinely unreachable, not just visually cut off.
       Reparenting escapes *any* ancestor's overflow, on this page or a
       future one, rather than tuning padding to fit today's content.
       `position: absolute` in document coordinates (not `fixed`) so it
       still scrolls with the button with no extra scroll-tracking — the
       coordinates already include the page's current scroll offset. */
    document.body.append(menu);
    function placeMenu() {
      const r = btn.getBoundingClientRect();
      const gap = 8;
      menu.style.position = "absolute";
      menu.style.top = (window.scrollY + r.bottom + gap) + "px";
      menu.style.right = (document.documentElement.clientWidth - (window.scrollX + r.right)) + "px";
      menu.style.left = "auto";
    }
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !menu.hidden;
      if (!open) placeMenu();
      menu.hidden = open;
      btn.setAttribute("aria-expanded", String(!open));
    });
    addEventListener("resize", () => { if (!menu.hidden) placeMenu(); });
    // A click anywhere else closes it — but not one inside the chip or the
    // menu itself (no longer a descendant of it, since the move above),
    // which would swallow the Sign out button before it fired.
    document.addEventListener("click", (e) => {
      if (wrap.contains(e.target) || menu.contains(e.target)) return;
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    });
    // Queried from `menu`, not `wrap` — the reparent above already moved
    // .hub-account-signout and .hub-account-tex out of wrap's own subtree.
    menu.querySelector(".hub-account-signout").addEventListener("click", signOut);

    /* Hatching as a second channel for the charts. Lives here because it is a
       reader's preference, not a property of any one page, and because the
       charts that need it are spread across six of them. */
    const tex = window.SS && window.SS.texture;
    const texBtn = menu.querySelector(".hub-account-tex");
    if (tex && texBtn) {
      const paint = () => {
        const on = tex.enabled();
        texBtn.setAttribute("aria-pressed", String(on));
        texBtn.querySelector(".hub-account-tex-state").textContent = on ? "On" : "Off";
      };
      texBtn.title = "Draws a hatch pattern over each colour in the charts, so " +
                     "categories can be told apart without relying on colour alone. " +
                     "Remembered on this device.";
      texBtn.addEventListener("click", (e) => { e.stopPropagation(); tex.set(!tex.enabled()); });
      tex.onChange(paint);
      paint();
    } else if (texBtn) {
      texBtn.remove();               // texture layer not on this page
    }
    return wrap;
  }

  /** The component brings its own stylesheet — see the note in that file. */
  /**
   * Load the chip's stylesheet, and say when it has actually applied.
   *
   * The sheet is fetched at runtime rather than sitting in each page's <head>,
   * which means there is a window where the markup exists and its rules do not.
   * The chip was being inserted inside that window, so a refresh showed a bare
   * button and two stacked lines of text that then snapped into place. Callers
   * wait on this before revealing anything.
   */
  function ensureStyles() {
    const settled = (link) => new Promise((done) => {
      // `sheet` is populated once the rules are parsed and live; on a warm cache
      // that is already true here and neither event would fire again.
      if (link.sheet) return done();
      link.addEventListener("load", done, { once: true });
      link.addEventListener("error", done, { once: true });   // show it anyway
      setTimeout(done, 2000);                                 // never hang
    });

    const existing = document.getElementById("hub-account-css");
    if (existing) return settled(existing);

    const base = HERE ? HERE.replace(/js\/hub-account\.js.*$/, "") : "../shared/";
    const link = document.createElement("link");
    link.id = "hub-account-css";
    link.rel = "stylesheet";
    link.href = base + "css/hub-account.css";
    document.head.append(link);
    return settled(link);
  }

  async function mount() {
    const stylesReady = ensureStyles();
    const email = (localStorage.getItem("ss_user_session") || "").trim();
    if (!email) return;                       // the login page has nobody to show

    // Drawn immediately, then corrected.
    //
    // Waiting on the session first meant that if sign-in was slow — or never
    // settled at all — the chip simply never appeared, which is how the org
    // chart ended up with no sign-in bar while every other page had one. Who
    // you are is worth showing straight away; which role you hold can catch up
    // a moment later.
    const setTitle = (text) => {
      const el = document.querySelector(".hub-account-role");
      if (!el) return;
      el.textContent = text || "";
      // Titles run long ("Director of Student Records, Registration & Support")
      // and the line is a single narrow row, so the full text lives in the
      // tooltip and CSS trims what is drawn.
      if (text) el.title = text; else el.removeAttribute("title");
    };

    // Placed relative to the theme toggle rather than pinned to the viewport.
    //
    // That button is absolutely positioned inside the hero, so anything fixed
    // at top-right lands on top of it — and then drifts away from it on scroll,
    // because one moves with the page and the other does not. Measuring from
    // the button puts the chip beside it and keeps it there.
    // Starts blank rather than guessing: a placeholder that changes a moment
    // later reads as the page correcting itself.
    const chip = build(email, "");
    // Set inline, so it holds even though the sheet that styles everything else
    // has not arrived. `visibility` rather than `display` keeps the element in
    // the layout, which the placement below measures.
    chip.style.visibility = "hidden";
    stylesReady.then(() => { chip.style.visibility = ""; });
    if (SS.access && SS.access.profileReady) {
      Promise.resolve(SS.access.profileReady)
        .then(() => setTitle(SS.access.isPartner ? PARTNER : SS.access.title))
        .catch(() => { /* no title is better than a wrong one */ });
    }
    const toggle = document.getElementById("themeToggle");

    // If the toggle sits in a laid-out row — the org chart's toolbar, a flex
    // navbar — join that row instead of floating over it. Absolute positioning
    // there lands the chip on top of whatever else the row is holding, which is
    // exactly what went wrong on the org chart.
    const parent = toggle && toggle.parentElement;
    const inFlow = parent && ["flex", "inline-flex", "grid"].includes(
      getComputedStyle(parent).display) && getComputedStyle(toggle).position === "static";

    if (inFlow) {
      toggle.before(chip);
      chip.classList.add(toggle.classList.contains("hero-theme-btn") ? "on-hero" : "on-nav");
      chip.style.height = toggle.offsetHeight + "px";
    } else if (toggle && toggle.offsetParent) {
      toggle.offsetParent.append(chip);
      const place = () => {
        const gap = 10;
        chip.style.position = "absolute";
        chip.style.top = toggle.offsetTop + "px";
        chip.style.height = toggle.offsetHeight + "px";
        chip.style.right =
          (toggle.offsetParent.clientWidth - toggle.offsetLeft + gap) + "px";
      };
      place();
      addEventListener("resize", place);
      // Match whichever chrome it has landed in. The home page puts the toggle
      // on a dark hero, every other page puts it in a light navbar, and a chip
      // styled for one is unreadable on the other — which is exactly how it
      // ended up looking fine at home and wrong everywhere else.
      chip.classList.add(toggle.classList.contains("hero-theme-btn") ? "on-hero" : "on-nav");
    } else {
      chip.classList.add("is-floating");
      document.body.append(chip);
    }
  }

  SS.account = { signOut };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
