/* ═══════════════════════════════════════════════════════════════════════════
   GRID ENGINE

   An editable spreadsheet over an array of row objects. It owns selection,
   keyboard navigation, in-place editing, dirty tracking and clipboard; it does
   not own persistence — the page hands it `onSave(changes)` and decides what a
   save means.

   Deliberate choices:
     • Edits are staged, never written per keystroke. A PM can fix a typo, tab
       away and undo without three round-trips hitting the hub.
     • Pasting a block from Excel fills the region to the right and below, the
       way Excel does — this is how a month of KPI values arrives in practice.
     • Every column declares a type; the type decides the editor, the alignment
       and how the value is parsed back out.
   ═══════════════════════════════════════════════════════════════════════════ */

const KEY_NAV = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Tab", "Enter", "Escape", "Delete", "Backspace", "Home", "End", "PageUp", "PageDown",
]);

export class Grid {
  /**
   * @param {object} opts
   *   mount     — container element
   *   columns   — [{ key, label, type, width, options, readOnly, required, render }]
   *   rows      — array of plain row objects (mutated only through the grid)
   *   idKey     — primary key field, default "id"
   *   onSave    — async ({ updates, inserts, deletes }) => void
   *   onDirty   — (count) => void
   */
  constructor(opts) {
    this.mount = opts.mount;
    this.columns = opts.columns;
    this.idKey = opts.idKey || "id";
    this.onSave = opts.onSave || (async () => {});
    this.onDirty = opts.onDirty || (() => {});
    this.onStatus = opts.onStatus || (() => {});

    this.rows = [];
    this.view = [];              // filtered indices into this.rows
    this.filter = "";
    this.active = { r: 0, c: 0 };
    this.editing = null;
    this.baseline = new Map();   // rowKey -> row as the database last gave it
    this.inserted = new Set();   // rowKeys created in this session
    this.deleted = [];           // full row objects removed
    this.undoStack = [];
    this.redoStack = [];
    this.seq = -1;               // temp keys for new rows count down

    this._build();
    this._bindKeys();
  }

  /* ── data ─────────────────────────────────────────────────────────────── */

  setRows(rows) {
    this.rows = rows.map((r) => ({ ...r }));
    // What the database last told us. "Changed" is derived by comparing against
    // this rather than tracked by hand, so undo, redo, paste and typing a value
    // back to its original all agree without any extra bookkeeping.
    this.baseline = new Map(this.rows.map((r) => [this.rowKey(r), { ...r }]));
    this.inserted.clear();
    this.deleted = [];
    this.undoStack = [];
    this.redoStack = [];
    this._applyFilter();
    this.render();
    this._emitDirty();
  }

  /** Columns on this row that differ from what the database gave us. */
  changedCells(row) {
    const base = this.baseline?.get(this.rowKey(row));
    if (!base) return [];
    return this.columns
      .filter((c) => !c.virtual && !c.readOnly)
      .filter((c) => String(row[c.key] ?? "") !== String(base[c.key] ?? ""))
      .map((c) => c.key);
  }

  setFilter(text) {
    this.filter = (text || "").trim().toLowerCase();
    this._applyFilter();
    this.active = { r: 0, c: this.active.c };
    this.render();
  }

  _applyFilter() {
    if (!this.filter) {
      this.view = this.rows.map((_, i) => i);
      return;
    }
    const cols = this.columns;
    this.view = this.rows.reduce((acc, row, i) => {
      const hay = cols.map((c) => row[c.key] ?? "").join(" ").toLowerCase();
      if (hay.includes(this.filter)) acc.push(i);
      return acc;
    }, []);
  }

  rowKey(row) { return row[this.idKey]; }

  get dirtyCount() {
    let n = 0;
    this.rows.forEach((r) => {
      if (!this.inserted.has(this.rowKey(r))) n += this.changedCells(r).length;
    });
    return n + this.inserted.size + this.deleted.length;
  }

  _emitDirty() { this.onDirty(this.dirtyCount); }

  /* ── editing ──────────────────────────────────────────────────────────── */

  /** Stage a value change, recording it for undo. */
  setValue(rowIdx, colKey, value, { silent = false } = {}) {
    const row = this.rows[rowIdx];
    if (!row) return;
    const col = this.columns.find((c) => c.key === colKey);
    if (!col || col.readOnly) return;

    const before = row[colKey] ?? null;
    const after = value === "" ? null : value;
    if (String(before ?? "") === String(after ?? "")) return;

    row[colKey] = after;
    if (!silent) {
      this.undoStack.push({ type: "set", rowIdx, colKey, before, after });
      this.redoStack = [];
    }
    this._emitDirty();
  }

  undo() {
    const op = this.undoStack.pop();
    if (!op) return;
    this.redoStack.push(op);
    if (op.type === "set") {
      this.rows[op.rowIdx][op.colKey] = op.before;
    } else if (op.type === "bulk") {
      op.cells.forEach((c) => { this.rows[c.rowIdx][c.colKey] = c.before; });
    } else if (op.type === "insert") {
      const i = this.rows.findIndex((r) => this.rowKey(r) === op.key);
      if (i >= 0) { op.row = this.rows[i]; op.at = i; this.rows.splice(i, 1); }
      this.inserted.delete(op.key);
    }
    this._applyFilter();
    this.render();
    this._emitDirty();
  }

  redo() {
    const op = this.redoStack.pop();
    if (!op) return;
    this.undoStack.push(op);
    if (op.type === "set") {
      this.rows[op.rowIdx][op.colKey] = op.after;
    } else if (op.type === "bulk") {
      op.cells.forEach((c) => { this.rows[c.rowIdx][c.colKey] = c.after; });
    } else if (op.type === "insert" && op.row) {
      this.rows.splice(Math.min(op.at, this.rows.length), 0, op.row);
      this.inserted.add(op.key);
    }
    this._applyFilter();
    this.render();
    this._emitDirty();
  }

  addRow(afterViewIdx = null, seed = {}) {
    const key = this.seq--;
    const row = { [this.idKey]: key };
    this.columns.forEach((c) => { row[c.key] = seed[c.key] ?? null; });
    const at = afterViewIdx === null ? this.rows.length : (this.view[afterViewIdx] ?? this.rows.length - 1) + 1;
    this.rows.splice(at, 0, row);
    this.inserted.add(key);
    this.undoStack.push({ type: "insert", key });
    this._applyFilter();
    this.render();
    this._emitDirty();
    const vi = this.view.indexOf(at);
    if (vi >= 0) this.focus(vi, this.columns.findIndex((c) => !c.readOnly));
    return row;
  }

  deleteRows(viewIdxs) {
    const idxs = [...viewIdxs].map((v) => this.view[v]).filter((i) => i != null).sort((a, b) => b - a);
    idxs.forEach((i) => {
      const row = this.rows[i];
      const key = this.rowKey(row);
      if (this.inserted.has(key)) this.inserted.delete(key);
      else this.deleted.push(row);
      this.rows.splice(i, 1);
    });
    this._applyFilter();
    this.render();
    this._emitDirty();
  }

  /** What needs to go to the database. */
  pendingChanges() {
    const updates = [];
    this.rows.forEach((row) => {
      const key = this.rowKey(row);
      if (this.inserted.has(key)) return;
      const cols = this.changedCells(row);
      if (!cols.length) return;
      const patch = { [this.idKey]: key };
      cols.forEach((c) => { patch[c] = row[c] ?? null; });
      updates.push(patch);
    });
    const inserts = [...this.inserted].map((key) => {
      const row = this.rows.find((r) => this.rowKey(r) === key);
      if (!row) return null;
      const rec = {};
      this.columns.forEach((c) => { if (!c.virtual) rec[c.key] = row[c.key] ?? null; });
      return rec;
    }).filter(Boolean);
    return { updates, inserts, deletes: this.deleted.map((r) => this.rowKey(r)) };
  }

  markSaved() {
    this.baseline = new Map(this.rows.map((r) => [this.rowKey(r), { ...r }]));
    this.inserted.clear();
    this.deleted = [];
    this.undoStack = [];
    this.redoStack = [];
    this.render();
    this._emitDirty();
  }

  /* ── DOM ──────────────────────────────────────────────────────────────── */

  _build() {
    this.mount.innerHTML = "";
    this.wrap = document.createElement("div");
    this.wrap.className = "grid-wrap";
    this.table = document.createElement("table");
    this.table.className = "grid";
    this.thead = document.createElement("thead");
    this.tbody = document.createElement("tbody");
    this.table.append(this.thead, this.tbody);
    this.wrap.append(this.table);
    this.mount.append(this.wrap);

    this.wrap.tabIndex = 0;
    this.wrap.addEventListener("mousedown", (e) => this._onMouseDown(e));
    this.wrap.addEventListener("dblclick", (e) => this._onDblClick(e));
    this.wrap.addEventListener("contextmenu", (e) => this._onContext(e));
    this.wrap.addEventListener("paste", (e) => this._onPaste(e));
    this.wrap.addEventListener("copy", (e) => this._onCopy(e));
  }

  render() {
    // header
    this.thead.innerHTML = "";
    const tr = document.createElement("tr");
    const corner = document.createElement("th");
    corner.className = "gutter";
    corner.textContent = "#";
    tr.append(corner);
    this.columns.forEach((col, ci) => {
      const th = document.createElement("th");
      th.style.width = (col.width || 150) + "px";
      const inner = document.createElement("div");
      inner.className = "th-inner";
      inner.textContent = col.label;
      if (col.required) {
        const s = document.createElement("span");
        s.className = "req"; s.textContent = "*"; s.title = "Required";
        inner.append(s);
      }
      const handle = document.createElement("div");
      handle.className = "col-resize";
      handle.addEventListener("mousedown", (e) => this._startResize(e, ci, th));
      inner.append(handle);
      th.append(inner);
      th.title = col.help || col.label;
      tr.append(th);
    });
    this.thead.append(tr);

    // body
    this.tbody.innerHTML = "";
    if (!this.view.length) {
      const empty = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = this.columns.length + 1;
      td.className = "grid-empty";
      td.textContent = this.filter
        ? `Nothing matches “${this.filter}”.`
        : "No rows yet — use Add row to create the first one.";
      empty.append(td);
      this.tbody.append(empty);
      this.onStatus({ rows: 0, total: this.rows.length });
      return;
    }

    const frag = document.createDocumentFragment();
    this.view.forEach((rowIdx, vi) => {
      const row = this.rows[rowIdx];
      const key = this.rowKey(row);
      const tr2 = document.createElement("tr");
      tr2.dataset.v = vi;
      if (this.inserted.has(key)) tr2.classList.add("is-new");
      if (vi === this.active.r) tr2.classList.add("is-current");

      const g = document.createElement("td");
      g.className = "gutter";
      g.textContent = vi + 1;
      tr2.append(g);

      const dirtyCols = new Set(this.inserted.has(key) ? [] : this.changedCells(row));
      this.columns.forEach((col, ci) => {
        const td = document.createElement("td");
        td.dataset.c = ci;
        if (dirtyCols.has(col.key)) td.classList.add("is-dirty");
        if (vi === this.active.r && ci === this.active.c) td.classList.add("is-active");
        td.append(this._renderCell(col, row[col.key], row));
        tr2.append(td);
      });
      frag.append(tr2);
    });
    this.tbody.append(frag);
    this.onStatus({ rows: this.view.length, total: this.rows.length });
  }

  _renderCell(col, value, row) {
    if (col.render) {
      const custom = col.render(value, row);
      if (custom instanceof Node) return custom;
      const s = document.createElement("span");
      s.className = "cell";
      s.innerHTML = custom ?? "";
      return s;
    }
    const span = document.createElement("span");
    span.className = "cell";
    if (value === null || value === undefined || value === "") {
      span.classList.add("muted");
      span.textContent = col.readOnly ? "" : "—";
      return span;
    }
    switch (col.type) {
      case "number":
        span.classList.add("num");
        span.textContent = String(value);
        break;
      case "percent": {
        const n = Number(value);
        span.classList.add("num");
        span.textContent = Number.isFinite(n)
          ? (Math.abs(n) <= 1 ? Math.round(n * 1000) / 10 + "%" : n + "%")
          : String(value);
        break;
      }
      case "url": {
        const a = document.createElement("a");
        a.href = value; a.target = "_blank"; a.rel = "noopener";
        a.textContent = col.linkLabel || "Open ↗";
        a.addEventListener("click", (e) => e.stopPropagation());
        span.append(a);
        break;
      }
      case "select": {
        const opt = (col.options || []).find((o) => (o.value ?? o) === value);
        const tone = opt && opt.tone ? opt.tone : "grey";
        const pill = document.createElement("span");
        pill.className = "pill " + tone;
        if (opt && opt.glyph) {
          const gl = document.createElement("span");
          gl.className = "glyph"; gl.textContent = opt.glyph;
          pill.append(gl);
        }
        pill.append(document.createTextNode(opt ? (opt.label ?? opt.value ?? opt) : String(value)));
        span.append(pill);
        break;
      }
      default:
        span.textContent = String(value);
    }
    return span;
  }

  /* ── selection & navigation ───────────────────────────────────────────── */

  focus(r, c) {
    if (this.view.length === 0) return;
    this.active.r = Math.max(0, Math.min(this.view.length - 1, r));
    this.active.c = Math.max(0, Math.min(this.columns.length - 1, c));
    this.render();
    this._scrollIntoView();
    this.wrap.focus({ preventScroll: true });
  }

  _cellEl(r, c) {
    const tr = this.tbody.querySelector(`tr[data-v="${r}"]`);
    return tr ? tr.querySelector(`td[data-c="${c}"]`) : null;
  }

  _scrollIntoView() {
    const td = this._cellEl(this.active.r, this.active.c);
    if (!td) return;
    const wrapBox = this.wrap.getBoundingClientRect();
    const box = td.getBoundingClientRect();
    const headH = this.thead.getBoundingClientRect().height;
    const gutterW = 46;
    if (box.top < wrapBox.top + headH) this.wrap.scrollTop -= (wrapBox.top + headH - box.top);
    else if (box.bottom > wrapBox.bottom) this.wrap.scrollTop += (box.bottom - wrapBox.bottom);
    if (box.left < wrapBox.left + gutterW) this.wrap.scrollLeft -= (wrapBox.left + gutterW - box.left);
    else if (box.right > wrapBox.right) this.wrap.scrollLeft += (box.right - wrapBox.right);
  }

  _onMouseDown(e) {
    // Let links inside a cell behave like links.
    if (e.target.closest("a")) return;
    const td = e.target.closest("td");
    if (!td) return;
    const tr = td.closest("tr");
    if (!tr || tr.dataset.v === undefined) return;

    // A <td> can't hold focus, so the browser's default would hand focus to the
    // body and the grid would stop hearing the keyboard. Suppress it and put
    // focus on the scroll container ourselves — this is what makes a click
    // followed by typing work the way it does in a spreadsheet.
    if (!this.editing || !e.target.closest(".cell-input")) e.preventDefault();

    if (td.classList.contains("gutter")) {
      this._commitEdit();
      this.focus(Number(tr.dataset.v), 0);
      return;
    }
    this._commitEdit();
    this.focus(Number(tr.dataset.v), Number(td.dataset.c));
  }

  _onDblClick(e) {
    const td = e.target.closest("td");
    if (!td || td.classList.contains("gutter")) return;
    this.beginEdit();
  }

  _bindKeys() {
    this.wrap.addEventListener("keydown", (e) => {
      if (this.editing) return this._editKeys(e);

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); this.redo(); return; }
      if (mod && e.key === "Enter") { e.preventDefault(); this.addRow(this.active.r); return; }

      const { r, c } = this.active;
      switch (e.key) {
        case "ArrowUp":    e.preventDefault(); this.focus(r - 1, c); return;
        case "ArrowDown":  e.preventDefault(); this.focus(r + 1, c); return;
        case "ArrowLeft":  e.preventDefault(); this.focus(r, c - 1); return;
        case "ArrowRight": e.preventDefault(); this.focus(r, c + 1); return;
        case "Home":       e.preventDefault(); this.focus(r, 0); return;
        case "End":        e.preventDefault(); this.focus(r, this.columns.length - 1); return;
        case "PageDown":   e.preventDefault(); this.focus(r + 12, c); return;
        case "PageUp":     e.preventDefault(); this.focus(r - 12, c); return;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) c === 0 ? this.focus(r - 1, this.columns.length - 1) : this.focus(r, c - 1);
          else c === this.columns.length - 1 ? this.focus(r + 1, 0) : this.focus(r, c + 1);
          return;
        case "Enter":      e.preventDefault(); this.beginEdit(); return;
        case "F2":         e.preventDefault(); this.beginEdit(); return;
        case "Delete":
        case "Backspace": {
          e.preventDefault();
          const col = this.columns[c];
          if (col && !col.readOnly) { this.setValue(this.view[r], col.key, null); this.render(); }
          return;
        }
        default: break;
      }
      // typing replaces the cell, as in Excel
      if (!mod && !KEY_NAV.has(e.key) && e.key.length === 1) {
        this.beginEdit(e.key);
        e.preventDefault();
      }
    });
  }

  beginEdit(seedChar = null) {
    if (this.editing) return;
    const { r, c } = this.active;
    const col = this.columns[c];
    const rowIdx = this.view[r];
    if (!col || col.readOnly || rowIdx == null) return;
    const td = this._cellEl(r, c);
    if (!td) return;
    const row = this.rows[rowIdx];

    let input;
    if (col.type === "select") {
      input = document.createElement("select");
      input.className = "cell-input";
      const blank = document.createElement("option");
      blank.value = ""; blank.textContent = "—";
      input.append(blank);
      (col.options || []).forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o.value ?? o;
        opt.textContent = o.label ?? o.value ?? o;
        input.append(opt);
      });
      input.value = row[col.key] ?? "";
    } else if (col.type === "longtext") {
      input = document.createElement("textarea");
      input.className = "cell-input";
      input.value = seedChar ?? (row[col.key] ?? "");
    } else {
      input = document.createElement("input");
      input.className = "cell-input";
      input.type = col.type === "date" ? "date" : "text";
      if (col.type === "number" || col.type === "percent") input.inputMode = "decimal";
      input.value = seedChar ?? (row[col.key] ?? "");
    }

    td.innerHTML = "";
    td.append(input);
    this.editing = { r, c, col, rowIdx, input };
    input.focus();
    if (input.select && !seedChar) input.select();
    if (seedChar && input.setSelectionRange) {
      const n = input.value.length;
      input.setSelectionRange(n, n);
    }
    input.addEventListener("keydown", (e) => this._editKeys(e));
    input.addEventListener("blur", () => this._commitEdit());
  }

  _editKeys(e) {
    if (!this.editing) return;
    const multiline = this.editing.col.type === "longtext";
    if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation();
      this._cancelEdit();
    } else if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) {
      e.preventDefault(); e.stopPropagation();
      const { r, c } = this.editing;
      this._commitEdit();
      this.focus(r + 1, c);
    } else if (e.key === "Tab") {
      e.preventDefault(); e.stopPropagation();
      const { r, c } = this.editing;
      this._commitEdit();
      e.shiftKey ? this.focus(r, c - 1) : this.focus(r, c + 1);
    }
  }

  _commitEdit() {
    if (!this.editing) return;
    const { col, rowIdx, input, r, c } = this.editing;
    const raw = input.value;
    this.editing = null;
    const parsed = this._parse(col, raw);
    this.setValue(rowIdx, col.key, parsed);
    this.render();
    void r; void c;
  }

  _cancelEdit() {
    if (!this.editing) return;
    const { r, c } = this.editing;
    this.editing = null;
    this.render();
    this.focus(r, c);
  }

  _parse(col, raw) {
    const v = typeof raw === "string" ? raw.trim() : raw;
    if (v === "" || v === null || v === undefined) return null;
    if (col.type === "number") {
      const n = Number(String(v).replace(/,/g, ""));
      return Number.isFinite(n) ? n : v;
    }
    if (col.type === "percent") {
      const s = String(v).replace(/[%,\s]/g, "");
      const n = Number(s);
      if (!Number.isFinite(n)) return v;
      // "85" typed into a fraction column means 85%, not 8500%
      return /%/.test(String(v)) || n > 1 ? n / 100 : n;
    }
    return v;
  }

  /* ── clipboard ────────────────────────────────────────────────────────── */

  _onCopy(e) {
    if (this.editing) return;
    const rowIdx = this.view[this.active.r];
    const col = this.columns[this.active.c];
    if (rowIdx == null || !col) return;
    e.clipboardData.setData("text/plain", String(this.rows[rowIdx][col.key] ?? ""));
    e.preventDefault();
  }

  /**
   * Paste a block copied out of Excel: tab-separated columns, newline rows.
   * Fills right and down from the active cell, creating rows if the block is
   * taller than what is left — that is what "paste a month of values" needs.
   */
  _onPaste(e) {
    if (this.editing) return;
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;
    e.preventDefault();

    const matrix = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));
    const cells = [];
    let created = 0;

    matrix.forEach((line, dr) => {
      let vi = this.active.r + dr;
      if (vi >= this.view.length) {
        this.addRowSilent();
        created++;
        this._applyFilter();
        vi = this.view.length - 1;
      }
      const rowIdx = this.view[vi];
      if (rowIdx == null) return;
      line.forEach((raw, dc) => {
        const col = this.columns[this.active.c + dc];
        if (!col || col.readOnly) return;
        const before = this.rows[rowIdx][col.key] ?? null;
        const after = this._parse(col, raw);
        if (String(before ?? "") === String(after ?? "")) return;
        this.setValue(rowIdx, col.key, after, { silent: true });
        cells.push({ rowIdx, colKey: col.key, before, after });
      });
    });

    if (cells.length) {
      this.undoStack.push({ type: "bulk", cells });
      this.redoStack = [];
    }
    this._applyFilter();
    this.render();
    this._emitDirty();
    this.onStatus({
      rows: this.view.length,
      total: this.rows.length,
      message: `Pasted ${cells.length} cell${cells.length === 1 ? "" : "s"}` +
               (created ? ` · ${created} new row${created === 1 ? "" : "s"}` : ""),
    });
  }

  addRowSilent(seed = {}) {
    const key = this.seq--;
    const row = { [this.idKey]: key };
    this.columns.forEach((c) => { row[c.key] = seed[c.key] ?? null; });
    this.rows.push(row);
    this.inserted.add(key);
    return row;
  }

  /* ── column resize ────────────────────────────────────────────────────── */

  _startResize(e, ci, th) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startW = th.getBoundingClientRect().width;
    const handle = e.currentTarget;
    handle.classList.add("dragging");
    const move = (ev) => {
      const w = Math.max(60, startW + ev.clientX - startX);
      this.columns[ci].width = w;
      th.style.width = w + "px";
    };
    const up = () => {
      handle.classList.remove("dragging");
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  /* ── context menu ─────────────────────────────────────────────────────── */

  _onContext(e) {
    const tr = e.target.closest("tr");
    if (!tr || tr.dataset.v === undefined) return;
    e.preventDefault();
    const vi = Number(tr.dataset.v);
    this.focus(vi, this.active.c);
    this._closeContext();

    const menu = document.createElement("div");
    menu.className = "ctx";
    const item = (label, kbd, fn, danger) => {
      const b = document.createElement("button");
      if (danger) b.className = "danger";
      b.append(document.createTextNode(label));
      if (kbd) { const k = document.createElement("kbd"); k.textContent = kbd; b.append(k); }
      b.addEventListener("click", () => { this._closeContext(); fn(); });
      menu.append(b);
    };
    item("Insert row below", "Ctrl+Enter", () => this.addRow(vi));
    item("Duplicate row", "", () => {
      const src = this.rows[this.view[vi]];
      const seed = {};
      this.columns.forEach((c) => { if (c.key !== this.idKey) seed[c.key] = src[c.key]; });
      this.addRow(vi, seed);
    });
    const sep = document.createElement("div"); sep.className = "sep"; menu.append(sep);
    item("Delete row", "", () => this.deleteRows([vi]), true);

    menu.style.left = Math.min(e.clientX, window.innerWidth - 210) + "px";
    menu.style.top = Math.min(e.clientY, window.innerHeight - 140) + "px";
    document.body.append(menu);
    this._ctx = menu;
    setTimeout(() => document.addEventListener("mousedown", this._closeCtxBound = () => this._closeContext(), { once: true }), 0);
  }

  _closeContext() {
    if (this._ctx) { this._ctx.remove(); this._ctx = null; }
  }
}
