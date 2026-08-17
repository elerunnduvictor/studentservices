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
  const LABEL = {
    admin: "Full access",
    director: "Department",
    staff: "Your team",
    partner: "Partner view",
    none: "Limited",
  };

  function signOut() {
    // Both the hub's own marker and the database session, or the next visit
    // would sign straight back in as whoever just left.
    ["ss_user_session", "ss_last_activity", "ss_hub_supabase"].forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* private mode */ }
    });
    const up = location.pathname.replace(/^\//, "").split("/").length > 1 ? "../" : "";
    location.replace(up + "login/index.html");
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
        '<button type="button" class="hub-account-signout">Sign out</button>' +
      "</div>";

    wrap.querySelector(".hub-account-email").textContent = email;
    wrap.querySelector(".hub-account-role").textContent = LABEL[role] || LABEL.none;
    wrap.querySelector(".hub-account-menu-email").textContent = email;

    const btn = wrap.querySelector(".hub-account-btn");
    const menu = wrap.querySelector(".hub-account-menu");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !menu.hidden;
      menu.hidden = open;
      btn.setAttribute("aria-expanded", String(!open));
    });
    // A click anywhere else closes it — but not one inside the menu itself,
    // which would swallow the Sign out button before it fired.
    document.addEventListener("click", (e) => {
      if (wrap.contains(e.target)) return;
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    });
    wrap.querySelector(".hub-account-signout").addEventListener("click", signOut);
    return wrap;
  }

  /** The component brings its own stylesheet — see the note in that file. */
  function ensureStyles() {
    if (document.getElementById("hub-account-css")) return;
    const base = HERE ? HERE.replace(/js\/hub-account\.js.*$/, "") : "../shared/";
    const link = document.createElement("link");
    link.id = "hub-account-css";
    link.rel = "stylesheet";
    link.href = base + "css/hub-account.css";
    document.head.append(link);
  }

  async function mount() {
    ensureStyles();
    const email = (localStorage.getItem("ss_user_session") || "").trim();
    if (!email) return;                       // the login page has nobody to show

    // Drawn immediately, then corrected.
    //
    // Waiting on the session first meant that if sign-in was slow — or never
    // settled at all — the chip simply never appeared, which is how the org
    // chart ended up with no sign-in bar while every other page had one. Who
    // you are is worth showing straight away; which role you hold can catch up
    // a moment later.
    const setRole = (r) => {
      const el = document.querySelector(".hub-account-role");
      if (el) el.textContent = LABEL[r] || LABEL.none;
    };

    // Placed relative to the theme toggle rather than pinned to the viewport.
    //
    // That button is absolutely positioned inside the hero, so anything fixed
    // at top-right lands on top of it — and then drifts away from it on scroll,
    // because one moves with the page and the other does not. Measuring from
    // the button puts the chip beside it and keeps it there.
    const chip = build(email, "none");
    if (SS.access && SS.access.ready) {
      Promise.resolve(SS.access.ready)
        .then(() => setRole(SS.access.role))
        .catch(() => { /* leave it reading "Limited" */ });
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
