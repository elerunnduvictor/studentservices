/* ═══════════════════════════════════════════════════════════════════════════
   CAP SELF-ASSESSMENT FORMS — on the page

   The "Self-assessment forms" cards, the download links under the two goal
   types in the guide text, and the click that turns a form into a PDF.

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
  var ORDER = window.CAP_FORMS_ORDER || Object.keys(FORMS);

  var DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="2" aria-hidden="true" focusable="false"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

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
     rules of its stylesheets (dept.css and the <style> block that sets
     --dept-color). Not getComputedStyle: in dark mode that answers with the
     dark values, and a printed form wants paper colours whatever the reader's
     theme. Later rules win, as they do in the cascade. */
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
      accent: tokens["--dept-color"],
      accentLight: tokens["--dept-light"],
      text: tokens["--text"],
      muted: tokens["--text-muted"],
      panel: tokens["--bg-elevated"],
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
    var form = FORMS[button.dataset.capForm];
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

  /* ── Markup ── */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderCards() {
    var grid = document.getElementById("capFormsCards");
    if (!grid) return;
    ORDER.forEach(function (id) {
      var form = FORMS[id];
      if (!form) return;
      var card = el("div", "cap-form-card");
      card.appendChild(el("h3", "cap-form-title", form.title));
      card.appendChild(el("p", "cap-form-summary", form.summary));
      var button = el("button", "cap-form-btn");
      button.type = "button";
      button.dataset.capForm = id;
      button.innerHTML = DOWNLOAD_ICON;
      button.appendChild(el("span", null, "Download PDF"));
      button.setAttribute("aria-label", "Download " + form.title + " (PDF)");
      card.appendChild(button);
      var status = el("p", "cap-form-status");
      status.setAttribute("aria-live", "polite");
      card.appendChild(status);
      grid.appendChild(card);
    });
  }

  function normalise(s) {
    return String(s || "").toLowerCase().replace(/[\s‐-―-]+/g, " ").trim();
  }

  /** The form whose goal type a guide item starts with, or null. */
  function formForGuideItem(body) {
    var text = normalise(body);
    for (var i = 0; i < ORDER.length; i++) {
      var form = FORMS[ORDER[i]];
      if (form && form.goalType && text.indexOf(normalise(form.goalType)) === 0) return ORDER[i];
    }
    return null;
  }

  /** The download link shown under a goal type in the guide text, as HTML,
   *  or "" when the item is not one. All text here is our own, not the
   *  item's, so there is nothing of the database's to escape. */
  function guideLinkHtml(body) {
    var id = formForGuideItem(body);
    if (!id) return "";
    var title = FORMS[id].title.replace(/[&<>"]/g, "");
    return '<span class="cap-form-inline">' +
      '<button type="button" class="cap-form-link" data-cap-form="' + id + '">' + DOWNLOAD_ICON +
      "<span>" + title + " (PDF)</span></button>" +
      '<span class="cap-form-status" aria-live="polite"></span></span>';
  }

  renderCards();
  window.CAPForms = { guideLinkHtml: guideLinkHtml };
})();
