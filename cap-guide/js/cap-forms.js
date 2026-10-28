/* ═══════════════════════════════════════════════════════════════════════════
   CAP SELF-ASSESSMENT FORMS — on the page

   The click that turns a form into a PDF. The buttons themselves are drawn
   by cap-guide.js, from download items whose link_url is cap-form:<id>; it
   asks CAPForms.has(id) first, so an id with no form here shows as plain
   text rather than a button that does nothing.

   Nothing heavy loads with the page. pdf-lib (vendored, ~0.5MB) and the
   builder are fetched from this site on the first Download click and reused
   after that; a failed load is forgotten so the next click tries again.

   Privacy, by construction rather than by policy:
     - the PDF is built in this tab from cap-forms-content.js and the page's
       colour tokens — no request carries anything about the reader;
     - it is handed to the browser as a blob: download, never uploaded;
     - nothing here records the click (the page-view hit hub-access.js sends
       for every hub page is the only usage record, and it predates this);
     - what a reader types goes into their saved copy of the PDF, which this
       page never sees.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var PDFLIB_SRC = "/cap-guide/js/vendor/pdf-lib-1.17.1/pdf-lib.min.js";
  var BUILDER_SRC = "/cap-guide/js/cap-forms-builder.js";
  var NOTE = "Fill in this PDF on your computer. Your answers are not stored by the Bridge, so save your own copy.";

  var FORMS = window.CAP_FORMS || {};

  /* ── Loading on demand ── */

  var loading = {};
  function loadScript(src) {
    if (!loading[src]) {
      loading[src] = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = function () {
          delete loading[src];
          s.remove();
          reject(new Error("Could not load " + src));
        };
        document.head.appendChild(s);
      });
    }
    return loading[src];
  }

  /* ── Colours ──

     The light-theme values of the page's own tokens, read from the :root
     rules of its stylesheets: the --cap-print-* tokens in cap-guide.css, and
     --text, --text-muted, --border and --bg-card from dept.css. Not
     getComputedStyle: in dark mode that answers with the dark values, and a
     printed form wants paper colours whatever the reader's theme. Later rules
     win, as they do in the cascade. */
  function palette() {
    var tokens = {};
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      var rules;
      try { rules = sheet.cssRules; } catch (e) { return; }   // cross-origin (Google Fonts)
      Array.prototype.forEach.call(rules || [], function (rule) {
        if (rule.selectorText !== ":root") return;
        for (var i = 0; i < rule.style.length; i++) {
          var name = rule.style[i];
          tokens[name] = rule.style.getPropertyValue(name).trim();
        }
      });
    });
    return {
      accent: tokens["--cap-print-accent"],
      text: tokens["--text"],
      muted: tokens["--text-muted"],
      panel: tokens["--cap-print-panel"],
      rule: tokens["--border"],
      paper: tokens["--bg-card"],
    };
  }

  function saveFile(bytes, fileName) {
    var url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Some browsers read the blob after click() returns; give them time.
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  /* ── The click ── */

  function setStatus(el, text, isError) {
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("is-error", !!isError);
  }

  async function download(button) {
    var form = has(button.dataset.capForm) ? FORMS[button.dataset.capForm] : null;
    var status = button.parentElement.querySelector(".cap-form-status");
    if (!form || button.getAttribute("aria-busy") === "true") return;

    button.setAttribute("aria-busy", "true");
    button.disabled = true;
    setStatus(status, "Preparing the PDF…");
    try {
      await Promise.all([loadScript(PDFLIB_SRC), loadScript(BUILDER_SRC)]);
      var bytes = await window.CAPFormsBuilder.build(form, palette(), window.PDFLib);
      saveFile(bytes, form.fileName);
      setStatus(status, "Downloaded " + form.fileName + ". " + NOTE);
    } catch (err) {
      console.error("[cap-forms]", err);
      setStatus(status, "The PDF could not be created. Check your connection, then try again or reload the page.", true);
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.focus();
    }
  }

  document.addEventListener("click", function (e) {
    var button = e.target.closest && e.target.closest("[data-cap-form]");
    if (button) download(button);
  });

  /** Whether `id` names a form. Own keys only, so "constructor" and the like
   *  from the database are not mistaken for one. */
  function has(id) {
    return Object.prototype.hasOwnProperty.call(FORMS, id);
  }

  window.CAPForms = {
    has: has,
    title: function (id) { return has(id) ? FORMS[id].title : null; },
  };
})();
