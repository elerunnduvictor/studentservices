/* ═══════════════════════════════════════════════════════════════════════════
   PROCESS DOCUMENTATION — SHARED FORM

   One modal, three ways in:
     PROC.form.openCreate()        steward, blank
     PROC.form.openEdit(row)       steward, their own row — full fields while
                                    unlocked (Draft / Needs Changes), a plain
                                    read-only view once it isn't
     PROC.form.openReview(row)     reviewer — every field read-only, plus the
                                    two fields that are actually theirs to set:
                                    Status and a note

   Status, the note, and the reviewed-by/at stamp never appear as inputs on
   the steward's own form — not because the database would refuse them (it
   would, via process_guard()), but because a field a person cannot use has no
   business being drawn in front of them.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const SS = window.SS;
  const PROC = (window.PROC = window.PROC || {});
  const escapeHtml = SS.escapeHtml;

  const IMPACT_OPTIONS = ["Students", "Internal Teams", "BYU-Pathway Partners", "External Partners"];
  const FREQUENCY_OPTIONS = ["Daily", "Weekly", "Monthly", "Per Term", "Annual", "As Needed"];
  const UNLOCKED_STATUSES = ["Draft", "Needs Changes"];

  let root = null;      // modal DOM, built once
  let els = {};
  let session = null;   // { mode, row, tools, steps, docs, impacts }

  function buildModal() {
    if (root) return;
    root = document.createElement("div");
    root.className = "proc-modal-backdrop";
    root.hidden = true;
    root.innerHTML = `
      <div class="proc-modal-card" role="dialog" aria-modal="true" aria-labelledby="procModalTitle">
        <div class="proc-modal-header">
          <h2 id="procModalTitle" class="proc-modal-title"></h2>
          <button type="button" class="proc-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="proc-modal-body"></div>
        <div class="proc-modal-footer">
          <span class="proc-modal-error" role="alert"></span>
          <div class="proc-modal-actions"></div>
        </div>
      </div>`;
    document.body.append(root);

    els.title = root.querySelector(".proc-modal-title");
    els.body = root.querySelector(".proc-modal-body");
    els.error = root.querySelector(".proc-modal-error");
    els.actions = root.querySelector(".proc-modal-actions");

    root.querySelector(".proc-modal-close").addEventListener("click", close);
    root.addEventListener("click", (e) => { if (e.target === root) close(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !root.hidden) close();
    });
  }

  function close() {
    if (root) root.hidden = true;
    session = null;
  }

  /* ── field builders ────────────────────────────────────────────────────── */

  /** `full`: spans both columns of the modal body's grid. Half-width fields
   *  are paired by the order they're emitted in, two per row. */
  function field(label, inner, hint, full) {
    return `<div class="proc-field${full ? " proc-field-full" : ""}">
      <label class="proc-label">${escapeHtml(label)}</label>
      ${inner}
      ${hint ? `<div class="proc-hint">${escapeHtml(hint)}</div>` : ""}
    </div>`;
  }

  function readonlyValue(v) {
    return `<div class="proc-readonly-value">${escapeHtml(v || "—")}</div>`;
  }

  function departmentOptions(selected) {
    const opts = PROC.departments.map((d) =>
      `<option value="${escapeHtml(d.name)}"${d.name === selected ? " selected" : ""}>${escapeHtml(d.name)}</option>`);
    return `<option value=""${selected ? "" : " selected"}>Select a department…</option>` + opts.join("");
  }

  function renderChips(list, cls) {
    return list.map((v, i) =>
      `<span class="proc-chip" data-${cls}-index="${i}">${escapeHtml(v)}
         <button type="button" class="proc-chip-remove" data-remove-${cls}="${i}" aria-label="Remove">&times;</button>
       </span>`).join("");
  }

  /* ── the editable body ─────────────────────────────────────────────────── */

  function renderEditable() {
    const row = session.row || {};
    els.body.innerHTML = `
      ${field("Process Name", `<input type="text" class="proc-input" id="pfName" value="${escapeHtml(row.process_name || "")}" required>`)}
      ${field("Steward", `<input type="text" class="proc-input" id="pfStewardName" value="${escapeHtml(row.steward_name || (PROC.steward && PROC.steward.full_name) || "")}" required>`)}

      ${field("Steward Role", `<input type="text" class="proc-input" id="pfStewardRole" value="${escapeHtml(row.steward_role || (PROC.steward && PROC.steward.job_title) || "")}">`)}
      ${field("Department", `<select class="proc-select" id="pfDepartment">
          ${departmentOptions(row.department || (PROC.steward && PROC.steward.department) || "")}
        </select>`)}

      ${field("Process Frequency", `<select class="proc-select" id="pfFrequency">
          <option value=""${row.frequency ? "" : " selected"}>Select…</option>
          ${FREQUENCY_OPTIONS.map((opt) =>
            `<option value="${opt}"${row.frequency === opt ? " selected" : ""}>${opt}</option>`).join("")}
        </select>`)}
      ${field("Who Does This Impact?", `<div class="proc-checkbox-row" id="pfImpacts">
          ${IMPACT_OPTIONS.map((opt) => `
            <label class="proc-checkbox">
              <input type="checkbox" value="${escapeHtml(opt)}" ${session.impacts.includes(opt) ? "checked" : ""}>
              ${escapeHtml(opt)}
            </label>`).join("")}
        </div>`)}

      ${field("Tools & Systems Used", `
          <div class="proc-chip-input">
            <div class="proc-chips" id="pfToolsChips">${renderChips(session.tools, "tool")}</div>
            <div class="proc-chip-add">
              <input type="text" class="proc-input" id="pfToolInput" placeholder="Type a tool or system, then Add">
              <button type="button" class="proc-btn proc-btn-secondary" id="pfToolAdd">Add</button>
            </div>
          </div>`,
          "Quick list, no need to explain each one.")}
      ${field("Is This Process Already Documented Somewhere?", `
          <div class="proc-toggle" id="pfHasDoc">
            <button type="button" class="proc-toggle-btn${row.has_existing_doc ? " is-active" : ""}" data-doc="yes">Yes</button>
            <button type="button" class="proc-toggle-btn${row.has_existing_doc ? "" : " is-active"}" data-doc="no">No</button>
          </div>
          <div class="proc-field" id="pfStorageWrap" ${row.has_existing_doc ? "" : "hidden"}>
            <label class="proc-label">Storage Location URL</label>
            <input type="url" class="proc-input" id="pfStorageUrl" value="${escapeHtml(row.storage_location_url || "")}" placeholder="https://…">
          </div>`)}

      ${field("Process Description",
          `<textarea class="proc-textarea" id="pfDescription" rows="3">${escapeHtml(row.description || "")}</textarea>`,
          "2–3 sentences: what is this process, why does it exist, and who does it serve?", true)}

      ${field("Process Workflow", `
          <div class="proc-steps" id="pfSteps"></div>
          <button type="button" class="proc-btn proc-btn-secondary" id="pfStepAdd">+ Add step</button>`,
          "Quick step-by-step, start to finish. Doesn't need to be polished.", true)}

      ${field("Supporting Documents (optional)", `
          <div class="proc-docs" id="pfDocs"></div>
          <button type="button" class="proc-btn proc-btn-secondary" id="pfDocAdd">+ Add document</button>`,
          "Links to forms, checklists, or reference material. Leave empty if none.", true)}
    `;

    wireToolChips();
    wireHasDoc();
    renderSteps();
    renderDocs();

    document.getElementById("pfStepAdd").addEventListener("click", () => {
      session.steps.push("");
      renderSteps();
    });
    document.getElementById("pfDocAdd").addEventListener("click", () => {
      session.docs.push({ title: "", url: "" });
      renderDocs();
    });
  }

  function wireToolChips() {
    const input = document.getElementById("pfToolInput");
    const addTool = () => {
      const v = input.value.trim();
      if (!v) return;
      session.tools.push(v);
      input.value = "";
      document.getElementById("pfToolsChips").innerHTML = renderChips(session.tools, "tool");
      wireChipRemovals("tool", session.tools);
    };
    document.getElementById("pfToolAdd").addEventListener("click", addTool);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addTool(); }
    });
    wireChipRemovals("tool", session.tools);
  }

  function wireChipRemovals(cls, list) {
    root.querySelectorAll(`[data-remove-${cls}]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        list.splice(Number(btn.getAttribute(`data-remove-${cls}`)), 1);
        document.getElementById("pfToolsChips").innerHTML = renderChips(list, cls);
        wireChipRemovals(cls, list);
      });
    });
  }

  function wireHasDoc() {
    const wrap = document.getElementById("pfHasDoc");
    const storageWrap = document.getElementById("pfStorageWrap");
    wrap.querySelectorAll("[data-doc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const yes = btn.dataset.doc === "yes";
        wrap.querySelectorAll("[data-doc]").forEach((b) => b.classList.toggle("is-active", b === btn));
        storageWrap.hidden = !yes;
        if (!yes) document.getElementById("pfStorageUrl").value = "";
      });
    });
  }

  function renderSteps() {
    const el = document.getElementById("pfSteps");
    el.innerHTML = session.steps.map((s, i) => `
      <div class="proc-step-row">
        <span class="proc-step-num">${i + 1}</span>
        <input type="text" class="proc-input" data-step="${i}" value="${escapeHtml(s)}" placeholder="Describe this step">
        <button type="button" class="proc-icon-btn" data-step-up="${i}" title="Move up" ${i === 0 ? "disabled" : ""}>&uarr;</button>
        <button type="button" class="proc-icon-btn" data-step-down="${i}" title="Move down" ${i === session.steps.length - 1 ? "disabled" : ""}>&darr;</button>
        <button type="button" class="proc-icon-btn proc-icon-remove" data-step-remove="${i}" title="Remove">&times;</button>
      </div>`).join("") || `<div class="proc-hint">No steps yet.</div>`;

    el.querySelectorAll("[data-step]").forEach((inp) => {
      inp.addEventListener("input", () => { session.steps[Number(inp.dataset.step)] = inp.value; });
    });
    el.querySelectorAll("[data-step-up]").forEach((btn) => btn.addEventListener("click", () => {
      const i = Number(btn.dataset.stepUp);
      [session.steps[i - 1], session.steps[i]] = [session.steps[i], session.steps[i - 1]];
      renderSteps();
    }));
    el.querySelectorAll("[data-step-down]").forEach((btn) => btn.addEventListener("click", () => {
      const i = Number(btn.dataset.stepDown);
      [session.steps[i + 1], session.steps[i]] = [session.steps[i], session.steps[i + 1]];
      renderSteps();
    }));
    el.querySelectorAll("[data-step-remove]").forEach((btn) => btn.addEventListener("click", () => {
      session.steps.splice(Number(btn.dataset.stepRemove), 1);
      renderSteps();
    }));
  }

  function renderDocs() {
    const el = document.getElementById("pfDocs");
    el.innerHTML = session.docs.map((d, i) => `
      <div class="proc-doc-row">
        <input type="text" class="proc-input" data-doc-title="${i}" value="${escapeHtml(d.title || "")}" placeholder="Title">
        <input type="url" class="proc-input" data-doc-url="${i}" value="${escapeHtml(d.url || "")}" placeholder="https://…">
        <button type="button" class="proc-icon-btn proc-icon-remove" data-doc-remove="${i}" title="Remove">&times;</button>
      </div>`).join("") || `<div class="proc-hint">None added.</div>`;

    el.querySelectorAll("[data-doc-title]").forEach((inp) => {
      inp.addEventListener("input", () => { session.docs[Number(inp.dataset.docTitle)].title = inp.value; });
    });
    el.querySelectorAll("[data-doc-url]").forEach((inp) => {
      inp.addEventListener("input", () => { session.docs[Number(inp.dataset.docUrl)].url = inp.value; });
    });
    el.querySelectorAll("[data-doc-remove]").forEach((btn) => btn.addEventListener("click", () => {
      session.docs.splice(Number(btn.dataset.docRemove), 1);
      renderDocs();
    }));
  }

  /* ── the read-only body (locked steward view, and the top of the reviewer view) ── */

  function renderReadonlyFields(row) {
    return `
      ${field("Process Name", readonlyValue(row.process_name))}
      ${field("Steward", readonlyValue(row.steward_name))}

      ${field("Steward Role", readonlyValue(row.steward_role))}
      ${field("Department", readonlyValue(row.department))}

      ${field("Process Frequency", readonlyValue(row.frequency))}
      ${field("Who Does This Impact?", readonlyValue((row.population_impacted || []).join(", ")))}

      ${field("Tools & Systems Used", readonlyValue((row.tools_systems || []).join(", ")))}
      ${field("Is This Process Already Documented Somewhere?",
          row.has_existing_doc
            ? (row.storage_location_url
                ? `<div class="proc-readonly-value">Yes — <a href="${escapeHtml(row.storage_location_url)}" target="_blank" rel="noopener">${escapeHtml(row.storage_location_url)}</a></div>`
                : readonlyValue("Yes — (no URL given)"))
            : readonlyValue("No"))}

      ${field("Process Description", readonlyValue(row.description), null, true)}

      ${field("Process Workflow", (row.workflow_steps || []).length
          ? `<ol class="proc-readonly-list">${(row.workflow_steps || [])
              .map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
          : readonlyValue(""), null, true)}

      ${field("Supporting Documents", (row.supporting_documents || []).length
          ? `<ul class="proc-readonly-list">${(row.supporting_documents || [])
              .map((d) => `<li><a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">${escapeHtml(d.title || d.url)}</a></li>`)
              .join("")}</ul>`
          : readonlyValue(""), null, true)}
    `;
  }

  /* ── modes ─────────────────────────────────────────────────────────────── */

  function newSession(mode, row) {
    row = row || {};
    session = {
      mode,
      row,
      tools: (row.tools_systems || []).slice(),
      steps: (row.workflow_steps || []).slice(),
      docs: (row.supporting_documents || []).map((d) => Object.assign({}, d)),
      impacts: (row.population_impacted || []).slice(),
    };
  }

  /** process_name, steward_name, and department are NOT NULL in the database. */
  function validateRequired(payload) {
    if (!payload.process_name) return "Process Name is required.";
    if (!payload.steward_name) return "Steward is required.";
    if (!payload.department) return "Department is required.";
    return null;
  }

  function collectEditablePayload() {
    const impacts = Array.from(document.querySelectorAll('#pfImpacts input[type="checkbox"]:checked'))
      .map((c) => c.value);
    const hasDoc = root.querySelector('[data-doc="yes"]').classList.contains("is-active");
    return {
      process_name: document.getElementById("pfName").value.trim(),
      steward_name: document.getElementById("pfStewardName").value.trim(),
      steward_role: document.getElementById("pfStewardRole").value.trim(),
      department: document.getElementById("pfDepartment").value || null,
      population_impacted: impacts,
      frequency: document.getElementById("pfFrequency").value || null,
      description: document.getElementById("pfDescription").value.trim(),
      tools_systems: session.tools.filter(Boolean),
      has_existing_doc: hasDoc,
      storage_location_url: hasDoc ? (document.getElementById("pfStorageUrl").value.trim() || null) : null,
      workflow_steps: session.steps.map((s) => s.trim()).filter(Boolean),
      supporting_documents: session.docs
        .map((d) => ({ title: (d.title || "").trim(), url: (d.url || "").trim() }))
        .filter((d) => d.url),
    };
  }

  function openCreate() {
    buildModal();
    newSession("create", {});
    els.title.textContent = "New Process";
    els.error.textContent = "";
    renderEditable();
    els.actions.innerHTML = `
      <button type="button" class="proc-btn proc-btn-secondary" id="pfCancel">Cancel</button>
      <button type="button" class="proc-btn proc-btn-primary" id="pfSaveDraft">Save as Draft</button>
      <button type="button" class="proc-btn proc-btn-primary" id="pfSubmit">Save &amp; Submit</button>`;
    document.getElementById("pfCancel").addEventListener("click", close);
    document.getElementById("pfSaveDraft").addEventListener("click", () => submitCreate("Draft"));
    document.getElementById("pfSubmit").addEventListener("click", () => submitCreate("Submitted"));
    root.hidden = false;
  }

  async function submitCreate(status) {
    els.error.textContent = "";
    const payload = collectEditablePayload();
    const problem = validateRequired(payload);
    if (problem) { els.error.textContent = problem; return; }
    try {
      await PROC.create(Object.assign(payload, { status }));
      close();
    } catch (err) {
      els.error.textContent = err.message || "Could not save.";
    }
  }

  function openEdit(row) {
    buildModal();
    const unlocked = UNLOCKED_STATUSES.indexOf(row.status) !== -1;
    newSession(unlocked ? "edit" : "view", row);
    els.title.textContent = row.process_name || "Process";
    els.error.textContent = "";

    if (!unlocked) {
      els.body.innerHTML =
        `<div class="proc-lock-note">This process is <strong>${escapeHtml(row.status)}</strong> and can't be
         edited right now${row.status === "Needs Changes" ? "" : " — it's with a reviewer"}.</div>` +
        renderReadonlyFields(row);
      els.actions.innerHTML = `<button type="button" class="proc-btn proc-btn-secondary" id="pfCancel">Close</button>`;
      document.getElementById("pfCancel").addEventListener("click", close);
      root.hidden = false;
      return;
    }

    renderEditable();
    // process_guard() (a BEFORE UPDATE trigger) lets a steward's own row move
    // to exactly one status: Submitted — a jump straight to Reviewed or
    // Archived is refused with a raised exception. Draft and Needs Changes
    // are both unlocked, and both can go to Submitted the same way.
    els.actions.innerHTML = `
      <button type="button" class="proc-btn proc-btn-secondary" id="pfCancel">Cancel</button>
      <button type="button" class="proc-btn proc-btn-primary" id="pfSave">Save ${row.status === "Needs Changes" ? "as Needs Changes" : "as Draft"}</button>
      <button type="button" class="proc-btn proc-btn-primary" id="pfSubmit">Save &amp; Submit</button>
    `;
    document.getElementById("pfCancel").addEventListener("click", close);
    document.getElementById("pfSave").addEventListener("click", () => submitEdit(row.id, row.status));
    document.getElementById("pfSubmit").addEventListener("click", () => submitEdit(row.id, "Submitted"));
    root.hidden = false;
  }

  async function submitEdit(id, status) {
    els.error.textContent = "";
    const payload = collectEditablePayload();
    const problem = validateRequired(payload);
    if (problem) { els.error.textContent = problem; return; }
    payload.status = status;
    try {
      await PROC.save(id, payload);
      close();
    } catch (err) {
      els.error.textContent = err.message || "Could not save.";
    }
  }

  const STATUS_OPTIONS = ["Submitted", "Reviewed", "Needs Changes", "Archived"];
  // A decision is only pending on these two — Draft hasn't reached a reviewer
  // yet, and Reviewed/Archived already have one. Matches process_guard(): a
  // reviewer changing status on any of those isn't what this flow is for.
  const DECIDABLE_STATUSES = ["Submitted", "Needs Changes"];
  // A reviewer may reopen a settled row for the biannual-audit case — send it
  // back to Needs Changes, which process_guard() already treats as unlocked
  // for the steward (Draft and Needs Changes are its only two writable
  // statuses). Nothing else about the trigger needed to change: it stamps
  // reviewed_by/reviewed_at on any reviewer status change already, and RLS's
  // admin branch has no status restriction of its own.
  const REOPENABLE_STATUSES = ["Reviewed", "Archived"];

  function openReview(row) {
    buildModal();
    newSession("review", row);
    els.title.textContent = row.process_name || "Process";
    els.error.textContent = "";

    if (DECIDABLE_STATUSES.indexOf(row.status) === -1) {
      // Already decided (or not yet submitted) — a plain read-only view.
      // Status/note are shown, not editable; reviewed_by/reviewed_at give
      // the decision its provenance.
      const reopenable = REOPENABLE_STATUSES.indexOf(row.status) !== -1;
      els.body.innerHTML = renderReadonlyFields(row) + `
        ${field("Status", readonlyValue(row.status), null, true)}
        ${field("Note to the Steward", readonlyValue(row.status_note), null, true)}
        ${row.reviewed_by ? field("Reviewed By", readonlyValue(row.reviewed_by + (row.reviewed_at ? " — " + PROC.formatDate(row.reviewed_at) : "")), null, true) : ""}
        ${reopenable ? `<div id="pfReopenWrap" hidden>
            ${field("Reason for Reopening (optional)",
                `<textarea class="proc-textarea" id="pfReopenNote" rows="3"></textarea>`,
                "Shown to the steward as “Note to the Steward” once this is sent back to Needs Changes.", true)}
          </div>` : ""}
      `;
      els.actions.innerHTML =
        (reopenable ? `<button type="button" class="proc-btn proc-btn-secondary" id="pfReopenStart">Reopen for Changes</button>` : "") +
        `<button type="button" class="proc-btn proc-btn-secondary" id="pfCancel">Close</button>` +
        (reopenable ? `<button type="button" class="proc-btn proc-btn-primary" id="pfReopenConfirm" hidden>Confirm Reopen</button>` : "");
      document.getElementById("pfCancel").addEventListener("click", close);

      if (reopenable) {
        const startBtn = document.getElementById("pfReopenStart");
        const confirmBtn = document.getElementById("pfReopenConfirm");
        const wrap = document.getElementById("pfReopenWrap");
        startBtn.addEventListener("click", () => {
          wrap.hidden = false;
          startBtn.hidden = true;
          confirmBtn.hidden = false;
        });
        confirmBtn.addEventListener("click", async () => {
          els.error.textContent = "";
          try {
            await PROC.review(row.id, {
              status: "Needs Changes",
              status_note: document.getElementById("pfReopenNote").value.trim(),
            });
            close();
          } catch (err) {
            els.error.textContent = err.message || "Could not reopen this process.";
          }
        });
      }

      root.hidden = false;
      return;
    }

    els.body.innerHTML = renderReadonlyFields(row) + `
      ${field("Status", `<select class="proc-select" id="pfStatus">
          ${STATUS_OPTIONS.map((s) => `<option value="${s}"${row.status === s ? " selected" : ""}>${s}</option>`).join("")}
        </select>`, null, true)}
      ${field("Note to the Steward", `<textarea class="proc-textarea" id="pfStatusNote" rows="3">${escapeHtml(row.status_note || "")}</textarea>`,
          "Shown to the steward, especially useful when sending this back as Needs Changes.", true)}
    `;
    els.actions.innerHTML = `
      <button type="button" class="proc-btn proc-btn-secondary" id="pfCancel">Cancel</button>
      <button type="button" class="proc-btn proc-btn-primary" id="pfSaveReview">Save Review</button>`;
    document.getElementById("pfCancel").addEventListener("click", close);
    document.getElementById("pfSaveReview").addEventListener("click", async () => {
      els.error.textContent = "";
      try {
        await PROC.review(row.id, {
          status: document.getElementById("pfStatus").value,
          status_note: document.getElementById("pfStatusNote").value.trim(),
        });
        close();
      } catch (err) {
        els.error.textContent = err.message || "Could not save the review.";
      }
    });
    root.hidden = false;
  }

  PROC.form = { openCreate, openEdit, openReview, close };
})();
