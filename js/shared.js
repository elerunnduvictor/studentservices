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
  };

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
