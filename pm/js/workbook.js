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

    if (!state.loaded.get(sheet.key)) {
      try {
        const rows = await SS.db.select(sheet.table, { order: sheet.order });
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
    setDirtyUI(grid.dirtyCount);
    grid.wrap.focus({ preventScroll: true });
  }

  /* ── save ─────────────────────────────────────────────────────────────── */
  async function save() {
    const sheet = state.sheet;
    const grid = state.grids.get(sheet.key);
    if (!grid) return;
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
      if (deletes.length) await SS.db.remove(sheet.table, deletes);
      for (const rec of inserts) await SS.db.insert(sheet.table, [real(rec)]);
      for (const patch of updates) {
        const body = real(patch);
        if (Object.keys(body).length) await SS.db.update(sheet.table, patch.id, body);
      }

      // Re-read so server defaults, real ids and any trigger output land in the
      // grid — an optimistic local patch would drift from the database.
      const rows = await SS.db.select(sheet.table, { order: sheet.order });
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
  els.addBtn.addEventListener("click", () => state.grids.get(state.sheet.key)?.addRow());
  els.exportBtn.addEventListener("click", exportCsv);
  els.revertBtn.addEventListener("click", async () => {
    const grid = state.grids.get(state.sheet.key);
    if (!grid || !grid.dirtyCount) return;
    if (!confirm(`Discard ${grid.dirtyCount} unsaved change(s) and reload from the database?`)) return;
    state.loaded.set(state.sheet.key, false);
    await showSheet(state.sheet);
  });

  let searchTimer;
  els.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.grids.get(state.sheet.key)?.setFilter(els.search.value);
    }, 120);
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); els.search.focus(); }
  });

  if (book.sheets.length > 1) {
    document.querySelector(".subtab")?.classList.add("is-active");
  }
  await showSheet(state.sheet);
}
