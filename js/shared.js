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
  function gateEmergingIssuesLink(links) {
    if (!window.SS || !SS.access) return;
    var link = null;
    var all = links.querySelectorAll("a.nav-link");
    for (var i = 0; i < all.length; i++) {
      if ((all[i].getAttribute("href") || "").indexOf("/emerging-issues/") !== -1) {
        link = all[i];
        break;
      }
    }
    if (!link) return;
    Promise.resolve(SS.access.ready).then(function () {
      if (!SS.access.isStudentServices) link.remove();
    })["catch"](function () { /* leave the nav as it is */ });
  }

  /**
   * "Processes" in the navbar, for anyone who can do something on that page.
   * The rule itself is SS.access.canUseProcesses() — it lives in the access
   * layer because the home page band needs the same answer and does not load
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
