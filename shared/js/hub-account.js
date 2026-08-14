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

  async function mount() {
    const email = (localStorage.getItem("ss_user_session") || "").trim();
    if (!email) return;                       // the login page has nobody to show

    let role = "none";
    try { await SS.access.ready; role = SS.access.role; } catch { /* show it anyway */ }

    // Prefer the navbar so it lines up with the existing chrome; otherwise
    // float it, which keeps pages that predate the navbar working.
    const nav = document.querySelector("#navLinks") || document.querySelector("#navbar");
    const chip = build(email, role);
    if (nav && nav.id === "navLinks") nav.append(chip);
    else if (nav) nav.append(chip);
    else { chip.classList.add("is-floating"); document.body.append(chip); }
  }

  SS.account = { signOut };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
