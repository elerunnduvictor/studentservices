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

  function luminance(c) {
    var v = c.map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  /** WCAG contrast ratio of two parsed colours, 1..21. */
  function contrastRatio(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
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

  async function build(form, palette, PDFLib) {
    var rgb = PDFLib.rgb;
    function pdfColor(c) { return rgb(c[0] / 255, c[1] / 255, c[2] / 255); }

    var C = {};
    ["accent", "accentLight", "text", "muted", "panel", "rule", "paper"].forEach(function (k) {
      if (!palette || !palette[k]) throw new Error("CAP forms: palette is missing " + k);
      C[k] = parseColor(palette[k]);
    });
    /* Answer boxes are tinted with the page's light accent. If a palette change
       ever left typed text below 4.5:1 on that tint, fall back to plain paper
       rather than ship boxes people cannot read back. */
    var boxFill = contrastRatio(C.text, C.accentLight) >= 4.5 ? C.accentLight : C.paper;
    var col = {};
    Object.keys(C).forEach(function (k) { col[k] = pdfColor(C[k]); });
    col.box = pdfColor(boxFill);

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
    var pdfForm = doc.getForm();

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
      f.addToPage(p, {
        x: x, y: top - h, width: w, height: h,
        font: font, textColor: col.text, backgroundColor: col.box,
        borderColor: col.accent, borderWidth: 0.9,
      });
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
      var f = opts.bold ? bold : font, size = opts.size || 10, lead = opts.lead || size * 1.38;
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
     *  and drawn as one block. */
    function stack(parts, gap) {
      gap = gap || 0;
      parts = parts.filter(Boolean);
      return {
        height: parts.reduce(function (h, part, i) { return h + part.height + (i ? gap : 0); }, 0),
        draw: function (p, top) {
          parts.forEach(function (part) { part.draw(p, top); top -= part.height + gap; });
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

    /** "1. Title" in bold, the number in the accent colour. */
    function numberedTitle(number, title) {
      var label = lines(title, { bold: true, size: 11, indent: number != null ? 18 : 0 });
      return {
        height: label.height,
        draw: function (p, top) {
          if (number != null) {
            p.drawText(number + ".", { x: LEFT, y: top - 11, size: 11, font: bold, color: col.accent });
          }
          label.draw(p, top);
        },
      };
    }

    /* ── Blocks ── */

    function stepHeading(title) {
      return {
        height: 26,
        draw: function (p, top) {
          p.drawRectangle({ x: LEFT, y: top - 26, width: WIDTH, height: 26, color: col.accentLight });
          p.drawRectangle({ x: LEFT, y: top - 26, width: 4, height: 26, color: col.accent });
          p.drawText(title, { x: LEFT + 14, y: top - 17.5, size: 13, font: bold, color: col.accent });
        },
      };
    }

    function ratingBlock(b, levels) {
      var head = numberedTitle(b.number, b.title);
      var desc = lines(b.description, { color: col.muted });
      var row = {
        height: 14,
        draw: function (p, top) {
          var group = pdfForm.createRadioGroup(b.field);
          levels.forEach(function (lvl, i) {
            var x = LEFT + 2 + i * 168;
            group.addOptionToPage(lvl.value, p, {
              x: x, y: top - 13, width: 13, height: 13,
              textColor: col.accent, backgroundColor: col.paper, borderColor: col.accent, borderWidth: 1,
            });
            p.drawText(lvl.label, { x: x + 19, y: top - 10.5, size: 10, font: font, color: col.text });
          });
          group.disableOffToggling();
          group.enableRequired();
          nameRadioStates(group, levels);
          tooltip(group, b.title + " rating: " + levels.map(function (l) { return l.label; }).join(", "));
        },
      };
      return stack([head, desc, row], 6);
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
      if (b.type === "text") return lines(b.text, {});
      if (b.type === "list") {
        return stack([b.label ? lines(b.label, { bold: true }) : null, bulletList(b.items)], 4);
      }
      if (b.type === "rating") return ratingBlock(b, form.ratingScale.levels);
      if (b.type === "answer") return answerBlock(b);
      throw new Error("CAP forms: unknown block type " + JSON.stringify(b.type));
    }

    /* ── First page: title, purpose, who/when, how-to, rating scale ── */

    newPage();
    place(stack([
      lines(form.title, { bold: true, size: 22, lead: 26, color: col.accent }),
      form.subtitle ? lines(form.subtitle, { size: 11, color: col.muted }) : null,
    ], 4));
    place(lines(form.purpose, { size: 10.5 }));

    place((function identityRow() {
      var cells = [
        { key: "name", label: "NAME", tip: "Your name", x: LEFT, w: 187 },
        { key: "supervisor", label: "SUPERVISOR", tip: "Your supervisor", x: 253, w: 187 },
        { key: "date", label: "DATE", tip: "Date", x: 451, w: 107 },
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

    place((function howToPanel() {
      var inner = WIDTH - 28;
      var title = lines("How to fill in this PDF", { bold: true, size: 10.5, width: inner });
      // Smaller than a body list, and measured against the panel's inner width.
      var list = (function () {
        var rows = form.howTo.map(function (t) { return lines(t, { size: 9.5, lead: 13, indent: 14, width: inner }); });
        return {
          height: rows.reduce(function (h, r) { return h + r.height + 2; }, 0),
          draw: function (p, top) {
            rows.forEach(function (r) {
              p.drawText("•", { x: LEFT + 17, y: top - 9.5, size: 9.5, font: bold, color: col.accent });
              r.draw(p, top, LEFT + 14);
              top -= r.height + 2;
            });
          },
        };
      })();
      var body = stack([title, list], 5);
      return {
        height: body.height + 24,
        draw: function (p, top) {
          p.drawRectangle({ x: LEFT, y: top - body.height - 24, width: WIDTH, height: body.height + 24,
            color: col.panel, borderColor: col.rule, borderWidth: 0.75 });
          title.draw(p, top - 12, LEFT + 14);
          list.draw(p, top - 12 - title.height - 5);
        },
      };
    })());

    if (form.ratingScale) {
      var scaleRows = form.ratingScale.levels.map(function (lvl) {
        var name = lvl.label + ": ";
        var nameW = bold.widthOfTextAtSize(name, 10);
        var rest = lines(lvl.detail, { color: col.muted, indent: 14 + nameW });
        return {
          height: rest.height + 2,
          draw: function (p, top) {
            p.drawText("•", { x: LEFT + 3, y: top - 10, size: 10, font: bold, color: col.accent });
            p.drawText(name, { x: LEFT + 14, y: top - 10, size: 10, font: bold, color: col.text });
            rest.draw(p, top);
          },
        };
      });
      place(stack([lines(form.ratingScale.intro, { bold: true })].concat(scaleRows), 4));
    }

    /* ── The steps ── */

    form.steps.forEach(function (step) {
      var items = step.blocks.map(blockItem);
      // The heading never sits alone at the foot of a page.
      place(stack([stepHeading(step.title), items[0]], GAP));
      items.slice(1).forEach(place);
    });

    place((function closing() {
      var text = lines(form.closing, { width: WIDTH - 16 });
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
      var head = "Student Services · CAP";
      p.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: col.accent });
      p.drawText(head, { x: LEFT, y: PAGE_H - 34, size: 8.5, font: bold, color: col.accent });
      var tw = font.widthOfTextAtSize(form.title, 8.5);
      p.drawText(form.title, { x: LEFT + WIDTH - tw, y: PAGE_H - 34, size: 8.5, font: font, color: col.muted });
      p.drawLine({ start: { x: LEFT, y: PAGE_H - 44 }, end: { x: LEFT + WIDTH, y: PAGE_H - 44 },
        thickness: 0.75, color: col.rule });

      p.drawLine({ start: { x: LEFT, y: 52 }, end: { x: LEFT + WIDTH, y: 52 }, thickness: 0.75, color: col.rule });
      p.drawText(FOOTER_NOTE, { x: LEFT, y: 38, size: 8, font: font, color: col.muted });
      var num = "Page " + (i + 1) + " of " + pages.length;
      var nw = font.widthOfTextAtSize(num, 8);
      p.drawText(num, { x: LEFT + WIDTH - nw, y: 38, size: 8, font: font, color: col.muted });
    });

    return doc.save();
  }

  window.CAPFormsBuilder = { build: build, parseColor: parseColor, contrastRatio: contrastRatio };
})();
