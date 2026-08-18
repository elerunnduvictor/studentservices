/* ═══════════════════════════════════════════════════════════════════════════
   WORKBOOK CONTROLLER

   One controller drives all three pages. A page says which workbook it is; this
   builds the sub-tabs, loads each sheet from its table, wires a Grid, and owns
   saving. Adding a fourth workbook later means adding a schema entry, not a
   fourth copy of this file.

   Saving is explicit, not per-keystroke. PMs work in bursts — retype a column,
   fix a typo, undo — and a hub that re-rendered on every keystroke would be
   showing half-finished thinking to the whole organisation.
   ═══════════════════════════════════════════════════════════════════════════ */

import { Grid } from "./grid.js";

const SS = window.SS;

export async function mountWorkbook(bookKey) {
  const book = SS.WORKBOOKS[bookKey];
  document.body.dataset.book = book.accent;

  const ok = await SS.shell.requireEditor(bookKey);
  if (!ok) return;

  /**
   * Sheets and columns a PM has added since the last deploy.
   *
   * The built-in sheets stay defined in schema.js and the database holds only
   * what has been added on top, so the two can never contradict each other:
   * there is one definition of "Employee Directory", plus whatever has been
   * bolted onto it. Extras are merged in here, once, before anything renders.
   */
  async function applyCustomisations() {
    let extraSheets = [], extraColumns = [];
    try {
      [extraSheets, extraColumns] = await Promise.all([
        SS.db.select("pm_sheets", { filter: { workbook: `eq.${bookKey}`, hidden: "eq.false" },
                                    order: "sort_order.asc" }),
        SS.db.select("pm_columns", { filter: { hidden: "eq.false" }, order: "sort_order.asc" }),
      ]);
    } catch {
      // patch-11 not applied yet, or the tables are unreachable. The built-in
      // sheets are complete on their own, so carry on rather than failing.
      return;
    }

    extraSheets.forEach((s) => {
      if (book.sheets.some((x) => x.key === s.sheet_key)) return;
      book.sheets.push({
        key: s.sheet_key, label: s.label, table: s.table_name,
        order: s.order_by || "sort_order.asc,id.asc", custom: true, columns: [],
      });
    });

    extraColumns.forEach((c) => {
      const sheet = book.sheets.find((x) => x.key === c.sheet_key);
      if (!sheet || sheet.columns.some((x) => x.key === c.col_key)) return;
      sheet.columns.push({
        key: c.col_key, label: c.label, type: c.type || "text",
        width: c.width || 150, help: c.help || undefined,
        required: !!c.required, readOnly: !!c.read_only,
        options: Array.isArray(c.options) ? c.options : undefined,
      });
    });
  }

  /**
   * The reader's role on the hub, which is not the same question as "may they
   * edit". Every PM editor can open the workbooks; only an admin may read who
   * has been looking at what.
   */
  let hubRole = "none";
  try {
    const me = await SS.db.rpc("hub_me");
    const row = Array.isArray(me) ? me[0] : me;
    hubRole = (row && row.role) || "none";
  } catch { /* access control not applied yet — treat as unrestricted */ hubRole = "admin"; }

  // A workbook they may not read should not be offered at all. Hiding the tab
  // after the fact would still leave the page reachable by URL, so the guard
  // below refuses the mount as well.
  Object.entries(SS.WORKBOOKS).forEach(([key, wb]) => {
    if (wb.adminOnly && hubRole !== "admin") {
      document.querySelectorAll('.tab[data-book="' + key + '"]').forEach((t) => t.remove());
    }
  });

  if (book.adminOnly && hubRole !== "admin") {
    document.getElementById("gridHost").innerHTML =
      '<div class="empty-state"><div><strong>Not available to you</strong>' +
      '<p style="margin-top:8px;max-width:46ch">Usage data records what individual ' +
      'people looked at, so it is limited to the VP and the project managers. ' +
      'Everything else in the PM Hub is open to you as usual.</p></div></div>';
    // Queried directly rather than through `els`, which is not built yet at
    // this point in the sequence.
    const t = document.getElementById("bookTitle");
    const st = document.getElementById("bookSubtitle");
    if (t) t.textContent = book.label;
    if (st) st.textContent = "Restricted";
    return;
  }

  await applyCustomisations();

  const state = { sheet: book.sheets[0], grids: new Map(), loaded: new Map() };

  const els = {
    title: document.getElementById("bookTitle"),
    subtitle: document.getElementById("bookSubtitle"),
    subtabs: document.getElementById("subtabs"),
    gridHost: document.getElementById("gridHost"),
    search: document.getElementById("search"),
    saveBtn: document.getElementById("saveBtn"),
    addBtn: document.getElementById("addBtn"),
    exportBtn: document.getElementById("exportBtn"),
    revertBtn: document.getElementById("revertBtn"),
    saveState: document.getElementById("saveState"),
    rowCount: document.getElementById("rowCount"),
    statusMsg: document.getElementById("statusMsg"),
  };

  els.title.textContent = book.label;
  els.subtitle.textContent = book.subtitle;

  /* ── sub-tabs (a workbook can hold several sheets) ────────────────────── */
  if (book.sheets.length > 1) {
    els.subtabs.hidden = false;
    book.sheets.forEach((sheet) => {
      const b = document.createElement("button");
      b.className = "subtab";
      b.dataset.sheet = sheet.key;
      b.innerHTML = `${sheet.label}<span class="n" data-n="${sheet.key}"></span>`;
      b.addEventListener("click", () => selectSheet(sheet));
      els.subtabs.append(b);
    });
  }

  function setDirtyUI(count) {
    const dirty = count > 0;
    els.saveBtn.disabled = !dirty;
    els.revertBtn.disabled = !dirty;
    els.saveState.className = "save-state" + (dirty ? " is-dirty" : "");
    els.saveState.innerHTML =
      `<span class="pip"></span>${dirty ? `${count} unsaved change${count === 1 ? "" : "s"}` : "All changes saved"}`;
    window.onbeforeunload = dirty ? (e) => { e.preventDefault(); e.returnValue = ""; } : null;
  }

  async function selectSheet(sheet) {
    const current = state.grids.get(state.sheet.key);
    if (current && current.dirtyCount > 0) {
      const go = confirm(
        `${state.sheet.label} has ${current.dirtyCount} unsaved change(s).\n\n` +
        `Switching sheets keeps them staged — they are only written when you press Save. Continue?`
      );
      if (!go) return;
    }
    state.sheet = sheet;
    document.querySelectorAll(".subtab").forEach((t) =>
      t.classList.toggle("is-active", t.dataset.sheet === sheet.key));
    els.search.value = "";
    await showSheet(sheet);
  }

  async function showSheet(sheet) {
    els.gridHost.innerHTML =
      `<div class="empty-state"><div><div class="spinner"></div>Loading ${sheet.label}…</div></div>`;

    let grid = state.grids.get(sheet.key);
    if (!grid) {
      const host = document.createElement("div");
      host.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column";
      grid = new Grid({
        mount: host,
        columns: sheet.columns.map((c) => ({ ...c })),
        // Not every sheet is keyed by `id` — hub_access is keyed by email — and
        // without this the grid would stage updates against a column that does
        // not exist and every save would quietly target nothing.
        idKey: sheet.idKey || "id",
        // Per sheet, so widening Comment on the OKR sheet does not resize a
        // column that happens to share its name elsewhere.
        storageKey: bookKey + ":" + sheet.key,
        onDirty: setDirtyUI,
        onStatus: ({ rows, total, message }) => {
          els.rowCount.textContent =
            rows === total ? `${total} rows` : `${rows} of ${total} rows`;
          const n = document.querySelector(`[data-n="${sheet.key}"]`);
          if (n) n.textContent = total;
          if (message) els.statusMsg.textContent = message;
        },
      });
      grid.__host = host;
      state.grids.set(sheet.key, grid);
    }

    els.gridHost.innerHTML = "";
    els.gridHost.append(grid.__host);

    // The roster backs the reporting-line check on this sheet and the Student
    // Employees one. Awaited before the first paint so cells are not drawn
    // unmarked and then marked a moment later.
    if (sheet.columns.some((c) => c.check)) { try { await loadRoster(); } catch { /* flag nothing */ } }

    if (!state.loaded.get(sheet.key)) {
      try {
        // `filter` is what makes a department tab work: the four department
        // sheets are the same `employees` table narrowed to one department, so
        // a person edited on Digital Operations is the same row as on the
        // Employee Directory rather than a second copy of them.
        const rows = await SS.db.select(sheet.table, { order: sheet.order, filter: sheet.filter });
        grid.setRows(rows);
        state.loaded.set(sheet.key, true);
      } catch (err) {
        els.gridHost.innerHTML =
          `<div class="empty-state"><div><strong>Could not load ${sheet.label}</strong>` +
          `<p style="margin-top:8px;max-width:48ch">${err.message}</p></div></div>`;
        return;
      }
    } else {
      grid.render();
    }
    // Reference sheets (the Dashboard, the KPI Overview) are read from the
    // workbook and shown as-is; there is nothing to add a row to.
    els.addBtn.disabled = !!sheet.readOnly;
    els.addBtn.title = sheet.readOnly ? "This sheet is reference data" : "Add a row";

    setDirtyUI(grid.dirtyCount);
    grid.wrap.focus({ preventScroll: true });
  }

  /* ── save ─────────────────────────────────────────────────────────────── */
  async function save() {
    const sheet = state.sheet;
    const grid = state.grids.get(sheet.key);
    if (!grid) return;
    // Ctrl+S is usually pressed with a cell still open. Fold it in first.
    grid.commitOpenEditor();
    const { updates, inserts, deletes } = grid.pendingChanges();
    if (!updates.length && !inserts.length && !deletes.length) return;

    els.saveBtn.disabled = true;
    els.saveState.className = "save-state is-saving";
    els.saveState.innerHTML = '<span class="pip"></span>Saving…';

    // Strip virtual columns — they are computed for display and have no column
    // in the table behind this sheet.
    const real = (rec) => {
      const out = {};
      sheet.columns.forEach((c) => {
        if (!c.virtual && !c.readOnly && rec[c.key] !== undefined) out[c.key] = rec[c.key];
      });
      return out;
    };

    try {
      if (deletes.length) await SS.db.remove(sheet.table, deletes, sheet.idKey || "id");
      for (const rec of inserts) await SS.db.insert(sheet.table, [real(rec)]);
      for (const patch of updates) {
        const body = real(patch);
        const key = sheet.idKey || "id";
        if (Object.keys(body).length) await SS.db.update(sheet.table, patch[key], body, key);
      }

      // Re-read so server defaults, real ids and any trigger output land in the
      // grid — an optimistic local patch would drift from the database.
      const rows = await SS.db.select(sheet.table, { order: sheet.order, filter: sheet.filter });
      grid.setRows(rows);
      grid.markSaved();

      const n = updates.length + inserts.length + deletes.length;
      SS.shell.toast(
        "Saved to the database",
        `${n} change${n === 1 ? "" : "s"} written. The hub picks this up on its next load.`,
        "ok"
      );
      els.statusMsg.textContent = "Last saved " + new Date().toLocaleTimeString();
    } catch (err) {
      SS.shell.toast("Nothing was saved", err.message, "err");
      setDirtyUI(grid.dirtyCount);
    }
  }

  /* ── export ───────────────────────────────────────────────────────────── */
  function exportCsv() {
    const sheet = state.sheet;
    const grid = state.grids.get(sheet.key);
    if (!grid) return;
    grid.commitOpenEditor();
    const cols = sheet.columns.filter((c) => !c.virtual);
    const esc = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [cols.map((c) => esc(c.label)).join(",")];
    grid.view.forEach((i) => lines.push(cols.map((c) => esc(grid.rows[i][c.key])).join(",")));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${sheet.label.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ── wiring ───────────────────────────────────────────────────────────── */
  els.saveBtn.addEventListener("click", save);
  // A row added on a filtered sheet is seeded with what that sheet filters on,
  // so it does not vanish the moment it is saved.
  els.addBtn.addEventListener("click", () =>
    state.grids.get(state.sheet.key)?.addRow(null, state.sheet.seed || {}));
  els.exportBtn.addEventListener("click", exportCsv);
  els.revertBtn.addEventListener("click", async () => {
    const grid = state.grids.get(state.sheet.key);
    if (!grid || !grid.dirtyCount) return;
    if (!confirm(`Discard ${grid.dirtyCount} unsaved change(s) and reload from the database?`)) return;
    state.loaded.set(state.sheet.key, false);
    await showSheet(state.sheet);
  });

  /* ── changing the shape of a sheet ────────────────────────────────────── */
  function toolbarButton(label, title, onClick) {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = label;
    b.title = title;
    b.addEventListener("click", onClick);
    els.addBtn.after(b);
    return b;
  }

  const TYPES = ["text", "longtext", "number", "percent", "date", "url", "select", "boolean"];

  toolbarButton("Add column", "Add a new column to this sheet", async () => {
    const sheet = state.sheet;
    if (sheet.readOnly) {
      return SS.shell.toast("Reference sheet", "This sheet is read from the workbook.", "err");
    }
    const label = prompt("Column heading, as it should appear:");
    if (!label) return;
    // The database requires a plain lower-case identifier; derive one rather
    // than making a PM think about SQL naming.
    const suggested = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")
                           .replace(/^_+|_+$/g, "").slice(0, 40) || "new_column";
    const type = (prompt(`Type — one of:\n${TYPES.join(", ")}`, "text") || "text").trim().toLowerCase();
    if (!TYPES.includes(type)) {
      return SS.shell.toast("Unknown type", `"${type}" is not one of: ${TYPES.join(", ")}`, "err");
    }
    try {
      await SS.db.rpc("pm_add_column", {
        p_sheet_key: sheet.key, p_table: sheet.table, p_col_key: suggested,
        p_label: label.trim(), p_type: type, p_width: type === "longtext" ? 200 : 150,
      });
      SS.shell.toast("Column added", `"${label.trim()}" is now on ${sheet.label}. Reloading…`, "ok");
      setTimeout(() => location.reload(), 900);
    } catch (err) {
      SS.shell.toast("Could not add the column", err.message, "err");
    }
  });

  toolbarButton("Delete row", "Delete the selected row (right-click a row for more)", () => {
    const grid = state.grids.get(state.sheet.key);
    if (!grid || !grid.view.length) return;
    if (state.sheet.readOnly) {
      return SS.shell.toast("Reference sheet", "This sheet is read from the workbook.", "err");
    }
    const vi = grid.active.r;
    const row = grid.rows[grid.view[vi]];
    const label = row && (row.name || row.employee_name || row.employee ||
                          row.sub_key_result || row.kpi_measure || `row ${vi + 1}`);
    if (!confirm(`Delete "${String(label).slice(0, 60)}"?\n\n` +
                 `It is removed from the database when you press Save, and Ctrl+Z will not bring it back.`)) return;
    grid.deleteRows([vi]);
  });

  /**
   * Removing a column.
   *
   * Two different things wear the same word. A column a PM added is theirs and
   * can genuinely be dropped. A built-in column is read elsewhere — the hub's
   * views select `employees.name` and `kpis.band_green` by name — so dropping
   * one would break the public site for everyone, from a button in a browser.
   * Those are hidden instead: reversible, and only for the person who chose it.
   */
  toolbarButton("Remove column", "Hide a column, or delete one you added", async () => {
    const grid = state.grids.get(state.sheet.key);
    if (!grid) return;
    const builtIn = new Set((state.sheet.columns || []).map((c) => c.key));
    const list = grid.columns
      .map((c, i) => `${i + 1}. ${c.label}${c.hidden ? "  (hidden)" : ""}` +
                     `${builtIn.has(c.key) ? "" : "  [added]"}`)
      .join("\n");
    const pick = prompt(`Which column?\n\n${list}\n\nEnter its number:`);
    if (!pick) return;
    const col = grid.columns[Number(pick) - 1];
    if (!col) return SS.shell.toast("No such column", `There is no column ${pick}.`, "err");

    if (builtIn.has(col.key)) {
      if (col.hidden) { grid.setColumnHidden(col.key, false); return SS.shell.toast("Shown again", `"${col.label}" is back.`, "ok"); }
      grid.setColumnHidden(col.key, true);
      return SS.shell.toast("Column hidden", `"${col.label}" is off this sheet for you. ` +
        `Its data is untouched — "Reset sizes" brings it back.`, "ok");
    }

    if (!confirm(`Delete the column "${col.label}" and everything in it?\n\n` +
                 `You added this column, so it can be removed for good. This cannot be undone.`)) return;
    try {
      await SS.db.rpc("pm_drop_column", {
        p_sheet_key: state.sheet.key, p_table: state.sheet.table, p_col_key: col.key,
      });
      SS.shell.toast("Column deleted", `"${col.label}" is gone. Reloading…`, "ok");
      setTimeout(() => location.reload(), 900);
    } catch (err) {
      SS.shell.toast("Could not delete the column", err.message, "err");
    }
  });

  toolbarButton("Reset sizes", "Put every column and row back to its original size", () => {
    const grid = state.grids.get(state.sheet.key);
    if (!grid) return;
    grid.resetSizes();
    SS.shell.toast("Sizes reset", `${state.sheet.label} is back to its original layout.`, "ok");
  });

  toolbarButton("New sheet", "Create a new sheet in this workbook", async () => {
    const label = prompt("Name for the new sheet:");
    if (!label) return;
    const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")
                     .replace(/^_+|_+$/g, "").slice(0, 40);
    if (!key || !/^[a-z]/.test(key)) {
      return SS.shell.toast("Name it differently", "Start the name with a letter.", "err");
    }
    try {
      await SS.db.rpc("pm_create_sheet", {
        p_workbook: bookKey, p_sheet_key: key, p_label: label.trim(),
      });
      // A sheet with no columns is a blank wall, so give it a first one.
      await SS.db.rpc("pm_add_column", {
        p_sheet_key: key, p_table: "sheet_" + key, p_col_key: "name",
        p_label: "Name", p_type: "text", p_width: 200,
      });
      SS.shell.toast("Sheet created", `"${label.trim()}" is ready. Reloading…`, "ok");
      setTimeout(() => location.reload(), 900);
    } catch (err) {
      SS.shell.toast("Could not create the sheet", err.message, "err");
    }
  });

  let searchTimer;
  els.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.grids.get(state.sheet.key)?.setFilter(els.search.value);
    }, 120);
  });

  document.addEventListener("keydown", (e) => {
    if (!e.key || !(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "s") { e.preventDefault(); save(); }
    else if (k === "f") { e.preventDefault(); els.search.select(); }
  });

  if (book.sheets.length > 1) {
    document.querySelector(".subtab")?.classList.add("is-active");
  }
  await showSheet(state.sheet);
}
