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
    // { key, dir } — null means the order the sheet was loaded in, which is
    // the workbook's own order and worth being able to get back to.
    this.sort = null;
    this.seq = -1;               // temp keys for new rows count down

    // Sizing a sheet is work, and work should not be thrown away on refresh.
    // Column widths and row heights are remembered per sheet against this key.
    this.storageKey = opts.storageKey ? "ss-grid-size:" + opts.storageKey : null;
    this.rowHeights = new Map();  // view-independent: keyed by the row's own id
    // Captured before anything remembered is applied, so "reset" has something
    // truthful to go back to.
    this._defaultWidths = this.columns.map((c) => [c.key, c.width || 150]);
    this._restoreSizes();

    this._build();
    this._bindKeys();
  }

  /* ── remembered sizes ─────────────────────────────────────────────────── */

  _restoreSizes() {
    if (!this.storageKey) return;
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || "{}");
      Object.entries(saved.columns || {}).forEach(([key, w]) => {
        const col = this.columns.find((c) => c.key === key);
        if (col && Number(w) > 0) col.width = Number(w);
      });
      Object.entries(saved.rows || {}).forEach(([id, h]) => {
        if (Number(h) > 0) this.rowHeights.set(String(id), Number(h));
      });
      (saved.hidden || []).forEach((key) => {
        const col = this.columns.find((c) => c.key === key);
        if (col) col.hidden = true;
      });
    } catch { /* corrupt or unavailable — fall back to the defaults */ }
  }

  /** The columns actually on screen. Hidden ones keep their data untouched. */
  get visibleColumns() {
    return this.columns.filter((c) => !c.hidden);
  }

  setColumnHidden(key, hidden) {
    const col = this.columns.find((c) => c.key === key);
    if (!col) return;
    col.hidden = !!hidden;
    // Keep the active cell on a column that still exists.
    if (this.active.c >= this.visibleColumns.length) {
      this.active.c = Math.max(0, this.visibleColumns.length - 1);
    }
    this.render();
    this._persistSizes();
  }

  _persistSizes() {
    if (!this.storageKey) return;
    try {
      const columns = {};
      this.columns.forEach((c) => { if (c.width) columns[c.key] = c.width; });
      const rows = {};
      this.rowHeights.forEach((h, id) => { rows[id] = h; });
      const hidden = this.columns.filter((c) => c.hidden).map((c) => c.key);
      localStorage.setItem(this.storageKey, JSON.stringify({ columns, rows, hidden }));
    } catch { /* quota or private mode: sizing still works for this session */ }
  }

  /** Put every column and row back to the size the sheet was designed with. */
  resetSizes() {
    this.rowHeights.clear();
    this.columns.forEach((c) => { c.hidden = false; });
    if (this.storageKey) {
      try { localStorage.removeItem(this.storageKey); } catch { /* nothing to do */ }
    }
    (this._defaultWidths || []).forEach(([key, w]) => {
      const col = this.columns.find((c) => c.key === key);
      if (col) col.width = w;
    });
    this.render();
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
    } else {
      const cols = this.columns;
      this.view = this.rows.reduce((acc, row, i) => {
        const hay = cols.map((c) => row[c.key] ?? "").join(" ").toLowerCase();
        if (hay.includes(this.filter)) acc.push(i);
        return acc;
      }, []);
    }
    this._applySort();
  }

  /**
   * Compare two cell values.
   *
   * Values in a sheet are text as far as the database is concerned, so "10"
   * would sort before "9" on a plain string compare. Numbers and dates are
   * therefore recognised and compared as themselves; everything else is
   * compared with `localeCompare`, which puts "Ángela" next to "Angela"
   * instead of after "Zoe" and is the reason this is not a `<` comparison.
   *
   * Blanks always sink to the bottom, whichever direction is chosen — an empty
   * cell is the absence of an answer, not the smallest one, and a column sorted
   * to find the largest value should not open on a screen of empties.
   */
  _compare(a, b) {
    const ea = a === null || a === undefined || String(a).trim() === "";
    const eb = b === null || b === undefined || String(b).trim() === "";
    if (ea && eb) return 0;
    if (ea) return 1;
    if (eb) return -1;

    if (typeof a === "boolean" || typeof b === "boolean") {
      return (a === b) ? 0 : (a ? -1 : 1);
    }
    const na = Number(String(a).replace(/[,%$\s]/g, ""));
    const nb = Number(String(b).replace(/[,%$\s]/g, ""));
    if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== "" && String(b).trim() !== "") {
      if (na !== nb) return na - nb;
    }
    const da = Date.parse(a), db = Date.parse(b);
    if (!Number.isNaN(da) && !Number.isNaN(db) && /\d{4}-\d{2}-\d{2}/.test(String(a))) {
      if (da !== db) return da - db;
    }
    return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
  }

  _applySort() {
    if (!this.sort) return;                       // the sheet's own order
    const { key, dir } = this.sort;
    const sign = dir === "desc" ? -1 : 1;
    const rows = this.rows;
    // Sorting the *view* rather than the rows themselves: `this.rows` is what
    // edits, undo and the save patch are addressed against, so reordering it
    // would move the ground under them.
    this.view = this.view.slice().sort((ia, ib) => {
      if (key === "__added") {
        // Insertion order. New rows carry negative temporary keys, so they are
        // compared by position instead and stay at the end where they were
        // typed.
        const ka = Number(rows[ia][this.idKey]), kb = Number(rows[ib][this.idKey]);
        const va = Number.isFinite(ka) && ka > 0 ? ka : Infinity;
        const vb = Number.isFinite(kb) && kb > 0 ? kb : Infinity;
        return (va - vb) * sign || (ia - ib);
      }
      const c = this._compare(rows[ia][key], rows[ib][key]);
      return c * sign || (ia - ib);              // stable: original order breaks ties
    });
  }

  /** Cycle a column: ascending, descending, then back to the sheet's order. */
  sortBy(key) {
    if (!this.sort || this.sort.key !== key) this.sort = { key, dir: "asc" };
    else if (this.sort.dir === "asc") this.sort = { key, dir: "desc" };
    else this.sort = null;
    this._applyFilter();
    this.active = { r: 0, c: this.active.c };
    this.render();
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
    if (vi >= 0) this.focus(vi, this.visibleColumns.findIndex((c) => !c.readOnly));
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

  /**
   * Fold any half-typed cell into the data.
   *
   * Called before saving or exporting. Without it, a PM who types a value and
   * reaches straight for Ctrl+S saves everything *except* the cell they were
   * looking at — the worst kind of silent loss, because the screen shows the
   * new value the whole time.
   */
  commitOpenEditor() { this._commitEdit(); }

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

    // Keyboard and clipboard listen on the document, not on this.wrap.
    //
    // They used to be on the wrapper, which meant they only fired while it held
    // focus — and committing an edit re-renders the table, destroying the input
    // that had focus and handing it to <body>. From that moment Ctrl+Z, Ctrl+V
    // and the arrow keys all went nowhere, with nothing on screen to suggest
    // why. Listening on the document and deciding for ourselves whether this
    // grid should act removes that whole class of dead-keyboard bug.
    document.addEventListener("keydown", (e) => this._onKeyDown(e));
    document.addEventListener("paste", (e) => { if (this._shouldHandle(e)) this._onPaste(e); });
    document.addEventListener("copy", (e) => { if (this._shouldHandle(e)) this._onCopy(e); });
  }

  /**
   * Should this grid act on a document-level key or clipboard event?
   *
   * Three things to get right: a grid whose sheet is not on screen has been
   * detached and must stay silent; typing into the search box or any other
   * field is not grid input; and focus sitting on <body> — the usual state
   * after a re-render — must still count as "the grid is what you are using".
   */
  _shouldHandle(e) {
    if (!this.wrap.isConnected) return false;
    const t = e.target;
    if (t === this.wrap || this.wrap.contains(t)) return true;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) {
      return false;
    }
    return true;
  }

  render() {
    // header
    this.thead.innerHTML = "";
    const tr = document.createElement("tr");
    const corner = document.createElement("th");
    corner.className = "gutter sortable";
    corner.textContent = "#";
    // The row number is insertion order, so this column is "recently added":
    // descending puts the newest rows on top.
    corner.title = "Sort by when the row was added";
    if (this.sort && this.sort.key === "__added") {
      corner.classList.add("is-sorted");
      corner.textContent = this.sort.dir === "asc" ? "# ↑" : "# ↓";
    }
    corner.addEventListener("click", () => this.sortBy("__added"));
    tr.append(corner);
    this.visibleColumns.forEach((col, ci) => {
      const th = document.createElement("th");
      th.style.width = (col.width || 150) + "px";
      if (col.tone) th.classList.add("tone-" + col.tone);
      const inner = document.createElement("div");
      inner.className = "th-inner";
      inner.textContent = col.label;
      // Click the label to sort; the resize handle beside it stops the event,
      // so dragging a column wider never reorders the sheet underneath.
      th.classList.add("sortable");
      const sorted = this.sort && this.sort.key === col.key;
      if (sorted) {
        th.classList.add("is-sorted");
        const arrow = document.createElement("span");
        arrow.className = "th-arrow";
        arrow.textContent = this.sort.dir === "asc" ? "↑" : "↓";
        inner.append(arrow);
      }
      th.addEventListener("click", (e) => {
        if (e.target.classList.contains("col-resize")) return;
        this.sortBy(col.key);
      });
      if (col.required) {
        const s = document.createElement("span");
        s.className = "req"; s.textContent = "*"; s.title = "Required";
        inner.append(s);
      }
      const handle = document.createElement("div");
      handle.className = "col-resize";
      handle.addEventListener("mousedown", (e) => this._startResize(e, ci, th));
      handle.addEventListener("click", (e) => e.stopPropagation());
      inner.append(handle);
      th.append(inner);
      th.title = (col.help || col.label) + "\n\n" +
        "Click to sort - again to reverse, a third time for the sheet's own order.";
      tr.append(th);
    });
    this.thead.append(tr);

    // body
    this.tbody.innerHTML = "";
    if (!this.view.length) {
      const empty = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = this.visibleColumns.length + 1;
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
      // Drag the bottom edge of the row number to set that row's height, the
      // way a spreadsheet does. Rows size themselves to their content by
      // default; this is for when a PM wants one row taller to read a long
      // comment, or shorter to get more on screen.
      const rh = document.createElement("div");
      rh.className = "row-resize";
      rh.title = "Drag to change this row's height";
      rh.addEventListener("mousedown", (e) => this._startRowResize(e, key, tr2));
      g.append(rh);
      tr2.append(g);

      const h = this.rowHeights.get(String(key));
      if (h) tr2.classList.add("is-sized"), tr2.style.height = h + "px";

      const dirtyCols = new Set(this.inserted.has(key) ? [] : this.changedCells(row));
      this.visibleColumns.forEach((col, ci) => {
        const td = document.createElement("td");
        td.dataset.c = ci;
        // A column can carry a standing colour, the way a block of cells is
        // shaded in the workbook — the green/yellow/red performance bands, the
        // gold employee block on the KPI matrix tabs. This is the column's own
        // meaning, not a reaction to the value, so it is painted here rather
        // than worked out per cell.
        if (col.tone) td.classList.add("tone-" + col.tone);
        if (dirtyCols.has(col.key)) td.classList.add("is-dirty");
        if (vi === this.active.r && ci === this.active.c) td.classList.add("is-active");
        td.append(this._renderCell(col, row[col.key], row));
        // A column may vet its own values. This is not validation in the sense
        // of refusing the edit — the cell still saves — it only marks a value
        // that will not do what the person entering it expects. The reporting
        // line is the case it was built for: "Anne E Owen" for "Anne E. Owen"
        // matched nobody, so four people silently vanished from their manager's
        // view with nothing on screen to suggest anything was wrong.
        if (col.check) {
          let problem = null;
          try { problem = col.check(row[col.key], row); }
          catch { /* a broken check must never break the sheet */ }
          if (problem) {
            td.classList.add("is-flagged");
            td.title = problem;
          }
        }
        tr2.append(td);
      });
      frag.append(tr2);
    });
    this.tbody.append(frag);
    // The handle lives on a cell, so it has to be re-attached each time the
    // rows are rebuilt — the element it was sitting on no longer exists.
    this._placeFillHandle();
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

  /**
   * Move the active cell.
   *
   * This repaints two classes; it does not re-render. Rebuilding the table here
   * broke double-click outright: a browser only raises `dblclick` when both
   * clicks land on the same element, and the first mousedown was replacing every
   * node under the cursor. It also meant an arrow key rebuilt 150 rows to move
   * one outline.
   */
  focus(r, c) {
    if (this.view.length === 0) return;
    const prev = { r: this.active.r, c: this.active.c };
    this.active.r = Math.max(0, Math.min(this.view.length - 1, r));
    this.active.c = Math.max(0, Math.min(this.visibleColumns.length - 1, c));
    this._paintActive(prev);
    this._scrollIntoView();
    this.wrap.focus({ preventScroll: true });
  }

  _paintActive(prev) {
    if (prev) {
      this._cellEl(prev.r, prev.c)?.classList.remove("is-active");
      this.tbody.querySelector(`tr[data-v="${prev.r}"]`)?.classList.remove("is-current");
    }
    this._cellEl(this.active.r, this.active.c)?.classList.add("is-active");
    this.tbody.querySelector(`tr[data-v="${this.active.r}"]`)?.classList.add("is-current");
    this._placeFillHandle();
  }

  /* ── fill handle ──────────────────────────────────────────────────────────
     The small square at the bottom-right of the active cell. Drag it down (or
     up) to copy that value into the cells it passes over, the way Excel does —
     which is how one answer gets applied to a run of rows without typing it
     fifteen times.

     One element, moved, rather than one per cell: the table is re-rendered on
     every edit, and a handle per row would be thousands of nodes that exist to
     let you grab one.
     ──────────────────────────────────────────────────────────────────────── */

  _placeFillHandle() {
    const cell = this._cellEl(this.active.r, this.active.c);
    const col = this.visibleColumns[this.active.c];
    if (this._fill) this._fill.remove();
    // Nothing to drag from a column that cannot be written to.
    if (!cell || !col || col.readOnly || this.editing) { this._fill = null; return; }

    const h = document.createElement("div");
    h.className = "fill-handle";
    h.title = [
      "Drag down to fill the cells below with this value.",
      "Double-click to fill to the last row.",
      "Hold Ctrl while dragging to count up instead of copying.",
    ].join("\n");
    h.addEventListener("mousedown", (e) => this._startFill(e));
    h.addEventListener("dblclick", (e) => {
      e.preventDefault(); e.stopPropagation();
      this._doFill(this.active.r, this.view.length - 1, false);
    });
    cell.append(h);
    this._fill = h;
  }

  _startFill(e) {
    e.preventDefault();
    e.stopPropagation();               // not a click on the cell underneath
    this._commitEdit();

    const from = this.active.r;
    let to = from;
    const paint = () => {
      this.tbody.querySelectorAll("td.is-fill-preview")
        .forEach((td) => td.classList.remove("is-fill-preview"));
      const lo = Math.min(from, to), hi = Math.max(from, to);
      for (let r = lo; r <= hi; r++) {
        if (r !== from) this._cellEl(r, this.active.c)?.classList.add("is-fill-preview");
      }
    };

    const move = (ev) => {
      const tr = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("tr[data-v]");
      // Outside the rows — keep the last row it was over rather than snapping
      // back, so dragging past the bottom edge still fills to the bottom.
      if (!tr || !this.tbody.contains(tr)) return;
      const v = Number(tr.dataset.v);
      if (v !== to) { to = v; paint(); }
    };
    const up = (ev) => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.classList.remove("is-filling");
      this.tbody.querySelectorAll("td.is-fill-preview")
        .forEach((td) => td.classList.remove("is-fill-preview"));
      if (to !== from) this._doFill(from, to, ev.ctrlKey || ev.metaKey);
    };
    document.body.classList.add("is-filling");
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  /**
   * Write the value at view row `from` into every row through `to`.
   *
   * `series` counts up instead of copying: 3, 4, 5 — and for text ending in a
   * number, "Week 1" becomes "Week 2". Copying is the default because that is
   * what a single dragged cell does in Excel, and because filling a column of
   * fifteen rows with fifteen different numbers is almost never what was meant.
   */
  _doFill(from, to, series) {
    const col = this.visibleColumns[this.active.c];
    const srcIdx = this.view[from];
    if (!col || col.readOnly || srcIdx == null) return;

    const source = this.rows[srcIdx][col.key];
    const step = to >= from ? 1 : -1;
    const cells = [];

    // Split a trailing number off the end once, not inside the loop.
    const m = series && source != null ? String(source).match(/^(.*?)(-?\d+(?:\.\d+)?)$/) : null;

    let n = 0;
    for (let r = from + step; step > 0 ? r <= to : r >= to; r += step) {
      n++;
      const rowIdx = this.view[r];
      if (rowIdx == null) continue;
      let value = source;
      if (m) {
        const next = Number(m[2]) + n * step;
        value = m[1] + (m[2].includes(".") ? next.toFixed(m[2].split(".")[1].length) : String(next));
        if (typeof source === "number") value = Number(value);
      }
      const before = this.rows[rowIdx][col.key] ?? null;
      const after = value === "" ? null : value;
      if (String(before ?? "") === String(after ?? "")) continue;
      this.setValue(rowIdx, col.key, after, { silent: true });
      cells.push({ rowIdx, colKey: col.key, before, after });
    }

    // One undo step for the whole drag: it was one gesture, so Ctrl+Z should
    // put all of it back, not peel it off a row at a time.
    if (cells.length) {
      this.undoStack.push({ type: "bulk", cells });
      this.redoStack = [];
      this.render();
      this._emitDirty();
      this.onStatus({ filled: cells.length });
    }
  }

  /** Ctrl+D / Ctrl+R: copy from the cell above, or the one to the left. */
  fillFrom(direction) {
    const col = this.visibleColumns[this.active.c];
    if (!col || col.readOnly) return;
    if (direction === "down") {
      if (this.active.r < 1) return;
      const src = this.view[this.active.r - 1], dst = this.view[this.active.r];
      if (src == null || dst == null) return;
      this.setValue(dst, col.key, this.rows[src][col.key]);
    } else {
      if (this.active.c < 1) return;
      const prev = this.visibleColumns[this.active.c - 1];
      const rowIdx = this.view[this.active.r];
      if (!prev || rowIdx == null) return;
      this.setValue(rowIdx, col.key, this.rows[rowIdx][prev.key]);
    }
    this.render();
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

    // A click inside the open editor belongs to the editor, not to the grid.
    //
    // This used to fall through to _commitEdit() below, which was fatal for a
    // dropdown: pressing the arrow on a <select> destroyed the element on
    // mousedown, so the list it was about to open no longer existed and nothing
    // appeared to happen. The same applied to selecting text with the mouse
    // inside a cell being edited.
    if (this.editing && e.target.closest(".cell-input")) return;

    // A <td> can't hold focus, so the browser's default would hand focus to the
    // body and the grid would stop hearing the keyboard. Suppress it and put
    // focus on the scroll container ourselves — this is what makes a click
    // followed by typing work the way it does in a spreadsheet.
    e.preventDefault();

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

  _bindKeys() { /* wiring lives in _build, on the document */ }

  _onKeyDown(e) {
    if (!e.key) return;

    // While an editor is open, its own keydown listener handles Enter, Tab and
    // Escape and stops them here. Everything else — including the browser's
    // native undo inside the input — is left alone on purpose.
    if (this.editing) return;
    if (!this._shouldHandle(e)) return;

    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
    if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); this.redo(); return; }
    if (mod && e.key === "Enter") { e.preventDefault(); this.addRow(this.active.r); return; }
    // The two fill shortcuts every spreadsheet has. Ctrl+D takes the value from
    // the cell above, Ctrl+R from the cell to the left — the keyboard version
    // of dragging the handle one step.
    if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); this.fillFrom("down"); return; }
    if (mod && e.key.toLowerCase() === "r") { e.preventDefault(); this.fillFrom("right"); return; }
    // Ctrl+C / Ctrl+V / Ctrl+S / Ctrl+F belong to the copy, paste and page
    // handlers — swallowing them here would break all four.
    if (mod) return;

    const { r, c } = this.active;
    switch (e.key) {
      case "ArrowUp":    e.preventDefault(); this.focus(r - 1, c); return;
      case "ArrowDown":  e.preventDefault(); this.focus(r + 1, c); return;
      case "ArrowLeft":  e.preventDefault(); this.focus(r, c - 1); return;
      case "ArrowRight": e.preventDefault(); this.focus(r, c + 1); return;
      case "Home":       e.preventDefault(); this.focus(r, 0); return;
      case "End":        e.preventDefault(); this.focus(r, this.visibleColumns.length - 1); return;
      case "PageDown":   e.preventDefault(); this.focus(r + 12, c); return;
      case "PageUp":     e.preventDefault(); this.focus(r - 12, c); return;
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) c === 0 ? this.focus(r - 1, this.visibleColumns.length - 1) : this.focus(r, c - 1);
        else c === this.visibleColumns.length - 1 ? this.focus(r + 1, 0) : this.focus(r, c + 1);
        return;
      case "Enter":      e.preventDefault(); this.beginEdit(); return;
      case "F2":         e.preventDefault(); this.beginEdit(); return;
      case "Delete": {
        // Delete clears the cell outright — this is the "wipe it and start
        // again" path, now that typing continues the text instead.
        e.preventDefault();
        const col = this.visibleColumns[c];
        if (col && !col.readOnly) { this.setValue(this.view[r], col.key, null); this.render(); this._keepFocus(); }
        return;
      }
      case "Backspace":
        // Opens the editor with the last character removed, which is what
        // Backspace means everywhere else.
        e.preventDefault();
        this.beginEdit();
        if (this.editing && this.editing.input.value) {
          const v = this.editing.input.value;
          this.editing.input.value = v.slice(0, -1);
          this._autoGrow?.(this.editing.input);
        }
        return;
      default: break;
    }

    if (!KEY_NAV.has(e.key) && e.key.length === 1) {
      e.preventDefault();
      this.beginEdit(e.key);
    }
  }

  /** Take keyboard focus back after a re-render, unless the user moved it. */
  _keepFocus() {
    if (!document.activeElement || document.activeElement === document.body) {
      this.wrap.focus({ preventScroll: true });
    }
  }

  beginEdit(seedChar = null) {
    if (this.editing) return;
    const { r, c } = this.active;
    const col = this.visibleColumns[c];
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
    }

    // What is already in the cell is *always* the starting value, and a typed
    // character is appended to it rather than replacing it.
    //
    // Excel replaces on type and selects-all on F2, and that is what this used
    // to do — but here it meant a PM opening a cell to fix one word lost the
    // whole sentence to the next keystroke, with the only way back being undo.
    // Losing work by default is the wrong trade. To replace a value outright,
    // select the cell and press Delete first, or select-all inside the editor.
    const existing = row[col.key] ?? "";
    if (col.type !== "select") {
      if (col.type === "longtext") {
        input = document.createElement("textarea");
        input.className = "cell-input";
      } else {
        input = document.createElement("input");
        input.className = "cell-input";
        input.type = col.type === "date" ? "date" : "text";
        if (col.type === "number" || col.type === "percent") input.inputMode = "decimal";
      }
      input.value = seedChar === null ? String(existing) : String(existing) + seedChar;
    }

    td.innerHTML = "";
    td.append(input);
    this.editing = { r, c, col, rowIdx, input };
    input.focus();

    // Caret at the end, nothing selected — so the next keystroke continues the
    // text instead of wiping it.
    if (input.setSelectionRange && input.type !== "date") {
      const n = input.value.length;
      try { input.setSelectionRange(n, n); } catch { /* type doesn't support it */ }
    }

    // Opening a dropdown should show the options, not present a closed box that
    // has to be clicked a second time. showPicker needs the call to descend
    // from a real user gesture, which a double-click or keypress is; where it
    // is unavailable the editor still works, it just waits for the click.
    if (col.type === "select" && typeof input.showPicker === "function") {
      try { input.showPicker(); } catch { /* not user-activated — harmless */ }
    }

    if (col.type === "longtext") this._autoGrow(input);
    input.addEventListener("input", () => {
      if (col.type === "longtext") this._autoGrow(input);
    });
    input.addEventListener("keydown", (e) => this._editKeys(e));
    input.addEventListener("blur", () => this._commitEdit());
  }

  /** Grow a textarea editor to fit what has been typed into it. */
  _autoGrow(input) {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight + 2, 320) + "px";
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
    const { col, rowIdx, input } = this.editing;
    const raw = input.value;
    this.editing = null;
    const parsed = this._parse(col, raw);
    this.setValue(rowIdx, col.key, parsed);
    this.render();
    // The render just destroyed the focused input. Reclaim focus so the next
    // Ctrl+Z or arrow key still reaches the grid — but not if the blur happened
    // because the PM clicked the search box or a toolbar button.
    this._keepFocus();
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
    const col = this.visibleColumns[this.active.c];
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
        const col = this.visibleColumns[this.active.c + dc];
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
    document.body.classList.add("is-resizing");
    const move = (ev) => {
      const w = Math.max(60, startW + ev.clientX - startX);
      this.visibleColumns[ci].width = w;
      th.style.width = w + "px";
    };
    const up = () => {
      handle.classList.remove("dragging");
      document.body.classList.remove("is-resizing");
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      // Re-render so the cells follow the header, then remember the new width.
      this.render();
      this._persistSizes();
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  _startRowResize(e, rowKey, tr) {
    e.preventDefault(); e.stopPropagation();
    const startY = e.clientY;
    const startH = tr.getBoundingClientRect().height;
    const handle = e.currentTarget;
    handle.classList.add("dragging");
    document.body.classList.add("is-resizing-row");
    const move = (ev) => {
      const h = Math.max(28, startH + ev.clientY - startY);
      tr.style.height = h + "px";
      tr.classList.add("is-sized");
      this.rowHeights.set(String(rowKey), h);
    };
    const up = () => {
      handle.classList.remove("dragging");
      document.body.classList.remove("is-resizing-row");
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      this._persistSizes();
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

    // Close on a click *outside* the menu.
    //
    // The `menu.contains` check is the whole point. Without it this closed on
    // any mousedown at all, including one on its own buttons: the menu was
    // removed between mousedown and mouseup, so the browser never dispatched
    // the click, and every item — Delete row, Insert row below, Duplicate row —
    // silently did nothing.
    this._closeCtxBound = (ev) => {
      if (menu.contains(ev.target)) return;
      this._closeContext();
    };
    setTimeout(() => document.addEventListener("mousedown", this._closeCtxBound), 0);
  }

  _closeContext() {
    if (this._closeCtxBound) {
      document.removeEventListener("mousedown", this._closeCtxBound);
      this._closeCtxBound = null;
    }
    if (this._ctx) { this._ctx.remove(); this._ctx = null; }
  }
}
