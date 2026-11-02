/* ═══════════════════════════════════════════════════════════════════════════
   CAP SELF-ASSESSMENT FORMS — the PDF builder

   Turns one form from cap-forms-content.js into a fillable PDF, in the
   browser, with pdf-lib. Holds layout only: every word comes from the content
   file, every colour from the page's own CSS tokens (passed in by
   cap-forms.js), so a wording change never touches this file.

     CAPFormsBuilder.build(form, palette, PDFLib)  ->  Promise<Uint8Array>

   PDFLib is passed in rather than read from window so the same code runs in
   Node for checking (eval this file with a stub `window`, hand it
   require("pdf-lib")).

   What goes into the file is the static form and nothing else: no name, no
   email, no date, no value in any field. The answers a reader types live in
   their copy of the PDF on their own device and never pass through here.

   ── Layout ──

   US Letter, 54pt side margins, the same 504pt column and field sizes as the
   reference PDFs. Each block (a rating area, a question and its box, a list)
   is measured before it is drawn, and moves whole to the next page when it
   does not fit, so a question never ends up on one page and its answer box on
   the next. A step heading travels with its first block for the same reason.

   ── Look ──

   The Bridge's, in the fonts every PDF reader has: Times Bold where the Bridge
   uses its serif (the title, the step headings), Helvetica where it uses Jost.
   One accent, the Bridge teal, and only for rules and marks (bullets, the
   closing bar): at 3.6:1 on white it is too light for small text, so all text
   is --text or --text-muted. Fields have no fill and a thin dark-grey border,
   so they print in black and white and Acrobat's field highlighting still
   shows through. Panels are a light warm grey.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var PAGE_W = 612, PAGE_H = 792;
  var LEFT = 54, WIDTH = 504;
  var TOP = 726;          // first content line, below the page header
  var BOTTOM = 70;        // last content line, above the page footer
  var GAP = 14;           // between blocks
  var BOX_H = 96;         // default answer box, as in the reference PDFs
  var FONT_SIZE_FIELD = 10;
  var FOOTER_NOTE = "Your answers stay in this file on your device. They are not sent to or stored by the Bridge.";

  /* ── Colour ─────────────────────────────────────────────────────────────── */

  /** A CSS colour token (#rgb, #rrggbb, rgb(), rgba()) as 0..255 channels,
   *  with any transparency flattened onto white paper. */
  function parseColor(css) {
    var s = String(css || "").trim();
    var m, r, g, b, a = 1;
    if ((m = /^#([0-9a-f]{3})$/i.exec(s))) {
      r = parseInt(m[1][0] + m[1][0], 16); g = parseInt(m[1][1] + m[1][1], 16); b = parseInt(m[1][2] + m[1][2], 16);
    } else if ((m = /^#([0-9a-f]{6})$/i.exec(s))) {
      r = parseInt(m[1].slice(0, 2), 16); g = parseInt(m[1].slice(2, 4), 16); b = parseInt(m[1].slice(4, 6), 16);
    } else if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s))) {
      r = +m[1]; g = +m[2]; b = +m[3]; if (m[4] != null) a = +m[4];
    } else {
      throw new Error("CAP forms: cannot read colour " + JSON.stringify(css));
    }
    return [r, g, b].map(function (c) { return Math.round(c * a + 255 * (1 - a)); });
  }

  /* ── Text ───────────────────────────────────────────────────────────────── */

  /** Greedy word wrap to `width` points. A single word wider than the line is
   *  broken by character rather than allowed to run off the page. */
  function wrap(text, font, size, width) {
    var lines = [];
    String(text).split("\n").forEach(function (para) {
      var line = "";
      para.split(/\s+/).filter(Boolean).forEach(function (word) {
        var next = line ? line + " " + word : word;
        if (font.widthOfTextAtSize(next, size) <= width) { line = next; return; }
        if (line) lines.push(line);
        while (font.widthOfTextAtSize(word, size) > width) {
          var cut = word.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > width) cut--;
          lines.push(word.slice(0, cut));
          word = word.slice(cut);
        }
        line = word;
      });
      lines.push(line);
    });
    return lines;
  }

  function usesItalic(form) {
    function any(blocks) {
      return (blocks || []).some(function (b) { return b.italic || any(b.blocks); });
    }
    return form.steps.some(function (s) { return any(s.blocks); });
  }

  async function build(form, palette, PDFLib) {
    var rgb = PDFLib.rgb;
    function pdfColor(c) { return rgb(c[0] / 255, c[1] / 255, c[2] / 255); }

    var col = {};
    ["accent", "text", "muted", "panel", "rule", "paper"].forEach(function (k) {
      if (!palette || !palette[k]) throw new Error("CAP forms: palette is missing " + k);
      col[k] = pdfColor(parseColor(palette[k]));
    });
    // Field borders and radio rings: the dark grey of the page's muted text.
    col.field = col.muted;

    /* updateMetadata off: otherwise pdf-lib stamps the creation time, the one
       thing in the file that would differ from reader to reader. Without it
       every download of a form is byte-for-byte the same file. */
    var doc = await PDFLib.PDFDocument.create({ updateMetadata: false });
    doc.setTitle(form.title, { showInWindowTitleBar: true });
    doc.setSubject("Student Services CAP self-assessment");
    doc.setAuthor("Student Services");
    doc.setCreator("Student Services Bridge");
    doc.setLanguage("en-US");

    var font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    var bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    // Embedded only when a block asks for it, so a form without italics is
    // the same file it was before italics existed.
    var italic = usesItalic(form) ? await doc.embedFont(PDFLib.StandardFonts.HelveticaOblique) : null;
    var serif = await doc.embedFont(PDFLib.StandardFonts.TimesRomanBold);
    var pdfForm = doc.getForm();

    /** Letter-spaced text (the wordmark, "STEP 1"): the PDF's own character
     *  spacing, so the text stays one selectable run. */
    function tracked(p, text, x, yy, size, f, color, spacing) {
      p.pushOperators(PDFLib.setCharacterSpacing(spacing));
      p.drawText(text, { x: x, y: yy, size: size, font: f, color: color });
      p.pushOperators(PDFLib.setCharacterSpacing(0));
      return f.widthOfTextAtSize(text, size) + spacing * text.length;
    }

    /* A field has no fill and no border of its own: it is see-through onto
       white paper, so Acrobat's blue field highlight is not hidden behind an
       opaque box. Its outline is drawn on the page instead (fieldFrame),
       because a reader that redraws a field (pdfium does, once it has been
       typed in) may leave the field's own border out, on screen and in print. */
    var FIELD_LOOK = { textColor: col.text, backgroundColor: undefined, borderColor: undefined, borderWidth: 0 };

    function fieldFrame(p, x, yy, w, h) {
      p.drawRectangle({ x: x, y: yy, width: w, height: h, borderColor: col.field, borderWidth: 0.75 });
    }

    var pages = [];
    var page, y;

    function newPage() {
      page = doc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      y = TOP;
    }

    /** Puts `item` ({ height, draw(page, top) }) on the current page, or on a
     *  fresh one when it would cross the bottom margin. */
    function place(item) {
      if (y - item.height < BOTTOM && y < TOP) newPage();
      item.draw(page, y);
      y -= item.height + GAP;
    }

    function tooltip(field, text) {
      field.acroField.dict.set(PDFLib.PDFName.of("TU"), PDFLib.PDFHexString.fromText(text));
    }

    function textField(name, label, p, x, top, w, h, multiline) {
      var f = pdfForm.createTextField(name);
      if (multiline) f.enableMultiline();
      f.enableScrolling();
      fieldFrame(p, x, top - h, w, h);
      f.addToPage(p, Object.assign({ x: x, y: top - h, width: w, height: h, font: font }, FIELD_LOOK));
      f.setFontSize(FONT_SIZE_FIELD);
      tooltip(f, label);
      return f;
    }

    /* pdf-lib names each radio button's "on" state 0, 1, 2 and keeps the real
       values in an /Opt array beside them. Acrobat reads /Opt, but MuPDF-based
       readers and anything that exports the form data report the bare index —
       a rating of "1" instead of "Meets". Name the states by value, as the
       reference PDFs do, and drop /Opt so every reader sees the same answer. */
    function nameRadioStates(group, levels) {
      var N = PDFLib.PDFName;
      group.acroField.getWidgets().forEach(function (widget, i) {
        var ap = widget.dict.lookup(N.of("AP"));
        ["N", "D", "R"].forEach(function (kind) {
          var states = ap && ap.lookup(N.of(kind));
          var on = states && states.get(N.of(String(i)));
          if (!on) return;
          states.delete(N.of(String(i)));
          states.set(N.of(levels[i].value), on);
        });
        widget.dict.set(N.of("AS"), N.of("Off"));
      });
      group.acroField.dict.delete(N.of("Opt"));
    }

    /* ── Measured pieces ── */

    /** Wrapped lines at a fixed leading, with an optional hanging indent. */
    function lines(text, opts) {
      var f = opts.serif ? serif : opts.bold ? bold : opts.italic ? italic : font;
      var size = opts.size || 10, lead = opts.lead || size * 1.38;
      var indent = opts.indent || 0;
      var ls = wrap(text, f, size, (opts.width || WIDTH) - indent);
      return {
        height: ls.length * lead,
        draw: function (p, top, x) {
          ls.forEach(function (l, i) {
            p.drawText(l, { x: (x || LEFT) + indent, y: top - size - i * lead, size: size, font: f,
              color: opts.color || col.text });
          });
        },
      };
    }

    /** Pieces stacked top to bottom with `gap` points between them, measured
     *  and drawn as one block. `x`, when given, is passed on to each piece
     *  (a panel's inner left edge). */
    function stack(parts, gap) {
      gap = gap || 0;
      parts = parts.filter(Boolean);
      return {
        height: parts.reduce(function (h, part, i) { return h + part.height + (i ? gap : 0); }, 0),
        draw: function (p, top, x) {
          parts.forEach(function (part) { part.draw(p, top, x); top -= part.height + gap; });
        },
      };
    }

    function spacer(h) { return { height: h, draw: function () {} }; }

    function bulletList(items, opts) {
      opts = opts || {};
      var x = opts.x || LEFT;
      var rows = items.map(function (t) { return lines(t, { size: 10, indent: 14, width: WIDTH - (x - LEFT) }); });
      return {
        height: rows.reduce(function (h, r) { return h + r.height + 2; }, 0),
        draw: function (p, top) {
          rows.forEach(function (r) {
            p.drawText("•", { x: x + 3, y: top - 10, size: 10, font: bold, color: col.accent });
            r.draw(p, top, x);
            top -= r.height + 2;
          });
        },
      };
    }

    /** "1. Title" in bold. */
    function numberedTitle(number, title) {
      var label = lines(title, { bold: true, size: 11, indent: number != null ? 18 : 0 });
      return {
        height: label.height,
        draw: function (p, top) {
          if (number != null) {
            p.drawText(number + ".", { x: LEFT, y: top - 11, size: 11, font: bold, color: col.text });
          }
          label.draw(p, top);
        },
      };
    }

    /* ── Blocks ── */

    /** A thin accent rule, then "STEP 1" letter-spaced and the rest of the
     *  title in Times Bold. The same 26pt as the bar it replaced, so pages
     *  break where they did. A title with no "Step N:" is drawn whole. */
    function stepHeading(title) {
      var m = /^Step\s+(\d+)\s*:\s*(.*)$/i.exec(title);
      return {
        height: 26,
        draw: function (p, top) {
          p.drawLine({ start: { x: LEFT, y: top - 1 }, end: { x: LEFT + WIDTH, y: top - 1 },
            thickness: 1.25, color: col.accent });
          var x = LEFT;
          if (m) x += tracked(p, "STEP " + m[1], LEFT, top - 19, 8, bold, col.muted, 1.4) + 12;
          p.drawText(m ? m[2] : title, { x: x, y: top - 20, size: 14, font: serif, color: col.text });
        },
      };
    }

    /** A small bold label ("Comment:") over a multiline box. */
    function commentBox(c, tip, h) {
      var label = lines(c.label, { bold: true, size: 9.5 });
      h = h || 56;
      return stack([label, {
        height: h,
        draw: function (p, top) { textField(c.field, tip, p, LEFT, top, WIDTH, h, true); },
      }], 4);
    }

    function ratingBlock(b, levels) {
      var head = numberedTitle(b.number, b.title);
      var desc = lines(b.description, { color: col.muted });
      // With a "Select:" label in front, the three options close up to fit.
      var x0 = b.select ? LEFT + 48 : LEFT + 2, step = b.select ? 152 : 168;
      var row = {
        height: 14,
        draw: function (p, top) {
          if (b.select) {
            p.drawText(b.select, { x: LEFT, y: top - 10.5, size: 9.5, font: bold, color: col.text });
          }
          var group = pdfForm.createRadioGroup(b.field);
          levels.forEach(function (lvl, i) {
            var x = x0 + i * step;
            // A dark ring and dot: clear on screen, in grey print, and under
            // Acrobat's highlight.
            group.addOptionToPage(lvl.value, p, {
              x: x, y: top - 13, width: 13, height: 13,
              textColor: col.text, backgroundColor: undefined, borderColor: col.field, borderWidth: 1,
            });
            p.drawText(lvl.label, { x: x + 19, y: top - 10.5, size: 10, font: font, color: col.text });
          });
          group.disableOffToggling();
          group.enableRequired();
          /* pdf-lib gives every radio button a white fill whatever it is
             told (text fields take "none"). Drop it and redraw, so the rings
             are see-through like the other fields; then name the states. */
          group.acroField.getWidgets().forEach(function (w) {
            var mk = w.getAppearanceCharacteristics();
            if (mk) mk.dict.delete(PDFLib.PDFName.of("BG"));
          });
          group.defaultUpdateAppearances();
          nameRadioStates(group, levels);
          tooltip(group, b.title + " rating: " + levels.map(function (l) { return l.label; }).join(", "));
        },
      };
      var comment = b.comment ? commentBox(b.comment, b.title + " comment") : null;
      return stack([head, desc, row, comment], 6);
    }

    /** A title, a prompt and a dropdown on one line under it, then an
     *  optional comment box. The dropdown starts empty and is limited to its
     *  options (no typing), so every saved copy holds one of them. */
    function choiceBlock(b) {
      var head = numberedTitle(b.number, b.title);
      var promptW = font.widthOfTextAtSize(b.prompt, 10);
      var row = {
        height: 20,
        draw: function (p, top) {
          p.drawText(b.prompt, { x: LEFT, y: top - 13.5, size: 10, font: font, color: col.muted });
          var dd = pdfForm.createDropdown(b.field);
          dd.addOptions(b.options);
          fieldFrame(p, LEFT + promptW + 10, top - 20, 190, 20);
          dd.addToPage(p, Object.assign({ x: LEFT + promptW + 10, y: top - 20, width: 190, height: 20, font: font },
            FIELD_LOOK));
          dd.setFontSize(FONT_SIZE_FIELD);
          tooltip(dd, b.title + ": " + b.prompt.replace(/:$/, ""));
        },
      };
      var comment = b.comment ? commentBox(b.comment, b.title + " comment") : null;
      return stack([head, row, comment], 6);
    }

    function answerBlock(b) {
      var parts = [];
      var prompts = (b.prompts || []).slice();
      if (b.title) {
        parts.push(numberedTitle(b.number, b.title));
      } else if (b.number != null && prompts.length) {
        parts.push(numberedTitle(b.number, prompts.shift()));
      }
      prompts.forEach(function (t) { parts.push(lines(t, { color: col.muted })); });
      if (b.examples) {
        parts.push(lines(b.examples.label, { bold: true, size: 10 }));
        parts.push(bulletList(b.examples.items));
      }
      var h = b.height || BOX_H;
      var label = [b.number != null ? b.number + "." : "", b.title || (b.prompts || [])[0] || ""].join(" ").trim();
      parts.push({
        height: h,
        draw: function (p, top) { textField(b.field, "Your answer: " + label, p, LEFT, top, WIDTH, h, true); },
      });
      return stack(parts, 5);
    }

    function blockItem(b) {
      if (b.type === "text") return lines(b.text, { italic: b.italic });
      if (b.type === "list") {
        return stack([b.label ? lines(b.label, { bold: true }) : null, bulletList(b.items)], 4);
      }
      if (b.type === "rating") return ratingBlock(b, form.ratingScale.levels);
      if (b.type === "choice") return choiceBlock(b);
      if (b.type === "answer") return answerBlock(b);
      if (b.type === "group") {
        return stack([lines(b.title, { bold: true, size: 11 })].concat(b.blocks.map(blockItem)), 8);
      }
      throw new Error("CAP forms: unknown block type " + JSON.stringify(b.type));
    }

    /* ── First page: title, purpose, who/when, how-to, rating scale ── */

    newPage();
    place(stack([
      lines(form.title, { serif: true, size: 22, lead: 26 }),
      form.subtitle ? lines(form.subtitle, { size: 11, color: col.muted }) : null,
    ], 4));
    place(lines(form.purpose, { size: 10.5 }));

    place((function identityRow() {
      var labels = form.identity.labels || {}, tips = form.identity.tips || {};
      var cells = [
        { key: "name", label: labels.name || "NAME", tip: tips.name || "Your name", x: LEFT, w: 187 },
        { key: "supervisor", label: labels.supervisor || "SUPERVISOR", tip: tips.supervisor || "Your supervisor",
          x: 253, w: 187 },
        { key: "date", label: labels.date || "DATE", tip: tips.date || "Date", x: 451, w: 107 },
      ];
      return {
        height: 34,
        draw: function (p, top) {
          cells.forEach(function (c) {
            p.drawText(c.label, { x: c.x, y: top - 8, size: 7.5, font: bold, color: col.muted });
            textField(form.identity[c.key], c.tip, p, c.x, top - 13, c.w, 20, false);
          });
        },
      };
    })());

    /** A warm-grey panel around `content`, which is measured against the
     *  panel's inner width and drawn at the inner left edge. */
    var INNER = WIDTH - 28;
    function panel(content) {
      return {
        height: content.height + 24,
        draw: function (p, top) {
          p.drawRectangle({ x: LEFT, y: top - content.height - 24, width: WIDTH, height: content.height + 24,
            color: col.panel, borderColor: col.rule, borderWidth: 0.75 });
          content.draw(p, top - 12, LEFT + 14);
        },
      };
    }

    place(panel(stack([
      lines("How to fill in this PDF", { bold: true, size: 10.5, width: INNER }),
      // Smaller than a body list.
      (function () {
        var rows = form.howTo.map(function (t) { return lines(t, { size: 9.5, lead: 13, indent: 14, width: INNER }); });
        return {
          height: rows.reduce(function (h, r) { return h + r.height + 2; }, 0),
          draw: function (p, top, x) {
            rows.forEach(function (r) {
              p.drawText("•", { x: x + 3, y: top - 9.5, size: 9.5, font: bold, color: col.accent });
              r.draw(p, top, x);
              top -= r.height + 2;
            });
          },
        };
      })(),
    ], 5)));

    if (form.ratingScale) {
      var scaleRows = form.ratingScale.levels.map(function (lvl) {
        var name = lvl.label + " ";
        var nameW = bold.widthOfTextAtSize(name, 10);
        var rest = lines(lvl.detail, { color: col.muted, indent: 14 + nameW, width: INNER });
        return {
          height: rest.height + 2,
          draw: function (p, top, x) {
            p.drawText("•", { x: x + 3, y: top - 10, size: 10, font: bold, color: col.accent });
            p.drawText(name, { x: x + 14, y: top - 10, size: 10, font: bold, color: col.text });
            rest.draw(p, top, x);
          },
        };
      });
      place(panel(stack([lines(form.ratingScale.intro, { bold: true, width: INNER })].concat(scaleRows), 4)));
    }

    /* ── The steps ── */

    form.steps.forEach(function (step) {
      var items = step.blocks.map(blockItem);
      // The heading never sits alone at the foot of a page.
      place(stack([stepHeading(step.title), items[0]], GAP));
      items.slice(1).forEach(place);
    });

    place((function closing() {
      var text = lines(form.closing, { width: WIDTH - 16, bold: form.closingBold });
      return {
        height: text.height + 4,
        draw: function (p, top) {
          p.drawRectangle({ x: LEFT, y: top - text.height - 4, width: 3, height: text.height + 4, color: col.accent });
          text.draw(p, top - 1, LEFT + 13);
        },
      };
    })());

    /* ── Header and footer, once the page count is known ── */

    pages.forEach(function (p, i) {
      tracked(p, "STUDENT SERVICES · CAP", LEFT, PAGE_H - 34, 7.5, bold, col.text, 1.5);
      var tw = font.widthOfTextAtSize(form.title, 8.5);
      p.drawText(form.title, { x: LEFT + WIDTH - tw, y: PAGE_H - 34, size: 8.5, font: font, color: col.muted });
      p.drawLine({ start: { x: LEFT, y: PAGE_H - 44 }, end: { x: LEFT + WIDTH, y: PAGE_H - 44 },
        thickness: 0.75, color: col.accent });

      p.drawLine({ start: { x: LEFT, y: 52 }, end: { x: LEFT + WIDTH, y: 52 }, thickness: 0.75, color: col.rule });
      p.drawText(FOOTER_NOTE, { x: LEFT, y: 38, size: 8, font: font, color: col.muted });
      var num = "Page " + (i + 1) + " of " + pages.length;
      var nw = font.widthOfTextAtSize(num, 8);
      p.drawText(num, { x: LEFT + WIDTH - nw, y: 38, size: 8, font: font, color: col.muted });
    });

    return doc.save();
  }

  window.CAPFormsBuilder = { build: build, parseColor: parseColor };
})();
