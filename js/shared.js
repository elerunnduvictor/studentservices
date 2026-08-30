/* ═══════════════ STUDENT SERVICES — SHARED RUNTIME ═══════════════
   Common helpers + auto-initialized UI behaviour reused across pages.

   What's auto-initialized on DOMContentLoaded:
     • Theme toggle — any <button id="themeToggle"> (works for navbar or
       hero-style buttons). Persists choice under localStorage key "ss-theme".
     • Mobile nav — <button id="navHamburger"> toggles <#navLinks>.open.
     • Scroll reveal — IntersectionObserver on every [data-reveal]; flips
       the .revealed class once it enters the viewport.

   Exposed as window.SS for explicit use by page scripts:
     SS.escapeHtml(s), SS.unique(arr)
     SS.initTheme(), SS.initNav(), SS.initReveal() — idempotent, callable
       again after dynamic DOM updates.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SS = window.SS = window.SS || {};

  /* ───── Pure helpers ───── */
  SS.escapeHtml = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  };

  SS.unique = function (arr) {
    return Array.from(new Set((arr || []).filter(function (x) { return x != null && x !== ""; })));
  };

  /* ───── Theme toggle ───── */
  SS.initTheme = function () {
    var saved = localStorage.getItem("ss-theme");
    if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else if (saved === "light") document.documentElement.removeAttribute("data-theme");

    var btn = document.getElementById("themeToggle");
    if (!btn || btn.dataset.ssThemeWired) return;
    btn.dataset.ssThemeWired = "1";
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      var next = cur === "dark" ? "light" : "dark";
      if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("ss-theme", next);
    });
  };

  /* ───── Mobile nav ───── */
  SS.initNav = function () {
    var hamburger = document.getElementById("navHamburger");
    var links = document.getElementById("navLinks");
    if (!hamburger || !links || hamburger.dataset.ssNavWired) return;
    hamburger.dataset.ssNavWired = "1";
    hamburger.addEventListener("click", function () {
      links.classList.toggle("open");
    });
    addProcessesNavLink(links);
    gateEmergingIssuesLink(links);
    gateDirectoryLinks();
  };

  /**
   * Emerging Issues leaves the navbar for anyone outside Student Services.
   *
   * The register is internal, and the page already refuses a partner with a
   * wall — but a link to a wall is worse than no link. It advertises something
   * they cannot have and makes them click to find that out. Processes never
   * appears for them at all, and this makes the pair consistent.
   *
   * The link is written into six pages as plain markup, so this removes it
   * rather than adding it: if the script fails, a partner sees a link that
   * still leads to a locked door, which is the safe direction to fail in.
   * Row-level security is the actual boundary either way.
   */
  function findEmergingIssuesLink(links) {
    var all = links.querySelectorAll("a.nav-link");
    for (var i = 0; i < all.length; i++) {
      if ((all[i].getAttribute("href") || "").indexOf("/emerging-issues/") !== -1) {
        return all[i];
      }
    }
    return null;
  }

  function gateEmergingIssuesLink(links) {
    if (!window.SS || !SS.access) return;

    var link = findEmergingIssuesLink(links);

    /* Added where it is missing rather than only removed where it is present.
       Most pages carry the link as markup, but the four department pages have
       a nav of their own (Home / Mission / Team / Other Depts) and never had
       it. Emerging Issues is meant to be reachable from anywhere in the hub,
       so if the link is absent it is created — still behind the same gate, so
       a partner never sees one appear. */
    if (!link) {
      link = document.createElement("a");
      link.href = "/emerging-issues/index.html";
      link.className = "nav-link";
      link.textContent = "Emerging Issues";
      link.hidden = true;                       // until the gate says otherwise
      links.appendChild(link);
    }

    Promise.resolve(SS.access.ready).then(function () {
      if (!SS.access.isStudentServices) { link.remove(); return; }
      link.hidden = false;
      addCriticalBell(link);
    })["catch"](function () {
      // The gate could not be asked. A link that was already in the markup
      // stays (row-level security is the real boundary); one this function
      // invented is removed, so a failure cannot conjure a door.
      if (link.hidden) link.remove();
    });
  }

  /**
   * A bell on the Emerging Issues nav link, but only when something is critical.
   *
   * At zero this does nothing at all — no bell, no badge, no "0". The link
   * stays an ordinary nav link. That is the point: the bell's presence is the
   * message, so it has to be absent most of the time to mean anything when it
   * appears.
   *
   * Reads the same view the home page's alert reads, so the two can never
   * disagree about how many criticals there are. Fails silently: a nav link
   * without a bell is the normal state, so an unreachable database is
   * indistinguishable from good news — which is the safe way round for
   * something decorative, and the register itself is one click away regardless.
   */
  function addCriticalBell(link) {
    if (!SS.db || !SS.db.select || link.querySelector(".nav-bell")) return;
    SS.db.select("v_emerging_issues_brief", { limit: 1 })
      .then(function (rows) {
        var brief = (rows || [])[0];
        var critical = brief ? Number(brief.red_open) || 0 : 0;
        if (critical <= 0) return;              // nothing critical: no bell

        var bell = document.createElement("span");
        bell.className = "nav-bell is-ringing";
        bell.setAttribute("aria-hidden", "true");
        bell.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>' +
            '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
          "</svg>" +
          '<span class="nav-bell-badge">' + (critical > 99 ? "99+" : critical) + "</span>";
        link.appendChild(bell);
        link.classList.add("has-critical");
        // The badge is aria-hidden, so the count is put where a screen reader
        // will actually reach it.
        link.setAttribute("aria-label",
          "Emerging Issues — " + critical +
          (critical === 1 ? " critical issue" : " critical issues"));
      })["catch"](function () { /* no bell; the link still works */ });
  }

  /**
   * The Directory link leaves both the navbar and the footer for anyone
   * outside Student Services — the same treatment Emerging Issues gets, and
   * for the same reason: the directory page already refuses a partner every
   * row (row-level security on employees/student_employees), so a link to it
   * is a link to an empty table rather than a real door. Written into six
   * pages as plain markup in two different places (nav + footer) each, so
   * this scans the whole document for the href rather than a single known
   * container.
   */
  function gateDirectoryLinks() {
    if (!window.SS || !SS.access) return;
    var found = document.querySelectorAll('a[href="/directory/index.html"]');
    if (!found.length) return;
    Promise.resolve(SS.access.ready).then(function () {
      if (SS.access.canSeeDirectory) return;
      found.forEach(function (a) { a.remove(); });
    })["catch"](function () { /* leave the nav as it is */ });
  }

  /**
   * "Processes" in the navbar, for anyone who can do something on that page.
   * The rule itself is SS.access.canUseProcesses() — it lives in the access
   * layer because the home page menu needs the same answer and does not load
   * this file.
   */
  function addProcessesNavLink(links) {
    if (links.dataset.ssProcNavChecked) return;
    links.dataset.ssProcNavChecked = "1";
    if (!window.SS || !SS.access || !SS.access.canUseProcesses) return;
    SS.access.canUseProcesses().then(function (allowed) {
      if (!allowed) return;
      var a = document.createElement("a");
      // Absolute: this link is injected into the navbar of every page, at every
      // folder depth, so it cannot be written relative to any one of them.
      a.href = "/processes/index.html";
      a.className = "nav-link";
      a.textContent = "Processes";
      links.appendChild(a);
    }).catch(function () { /* nav stays as it was */ });
  }

  /* ───── Scroll reveal ───── */
  SS.initReveal = function () {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach(function (el) {
        el.classList.add("revealed");
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = el.getAttribute("data-reveal-delay");
          if (delay) el.style.transitionDelay = (parseInt(delay, 10) * 100) + "ms";
          el.classList.add("revealed");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -20px 0px" });
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      if (!el.dataset.ssRevealObserved) {
        el.dataset.ssRevealObserved = "1";
        io.observe(el);
      }
    });
  };

  /* ───── Boot ───── */
  function boot() {
    SS.initTheme();
    SS.initNav();
    SS.initReveal();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
