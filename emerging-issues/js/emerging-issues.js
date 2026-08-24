/* ═══════════════════════════════════════════════════════════════════════════
   EMERGING ISSUES

   "The ideal on this site is that the AI is just saying, here's what's going on
    today and this is a problem, focus on that."            — Ben Packer

   A list does not do that. A list makes you read twenty rows and work out for
   yourself which one matters, which is the job the assistant is eventually
   meant to do. So this page ranks, and — more importantly — it *says why*.

   The ranking is deliberately arithmetic rather than clever: severity, then
   whether a promised date has passed, then how long the issue has gone without
   anyone writing on it. Every issue near the top carries a plain sentence
   explaining its position ("Red · 2 days overdue · no update in 25 days").

   That sentence is the point. When a model is wired in later it will need to
   justify its picks in exactly those terms, so the reasoning is written down in
   the product now, in one function, where it can be read and argued with. If
   the ordering is wrong today, it is wrong in a way somebody can see and fix —
   rather than being an opinion buried in a prompt.

   Access is the database's business. Partners are refused by row-level
   security, so this file never decides who may read anything; it only avoids
   drawing a page that would be empty for them.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* Words, not colours. The colour is how the page paints a level; it is not
     what the level is. Stored this way too — see
     supabase/emerging-issues-severity.sql — so a digest reads "this issue is
     Critical" rather than "this issue is red", and so the level survives being
     read by someone who cannot tell the two hues apart. */
  const SEVERITY = ["Critical", "Moderate", "Low"];
  const STATUS = ["Open", "Investigating", "Monitoring", "Escalated", "Resolved"];
  const DEPARTMENTS = [
    "Student Records, Registration, and Support",
    "Enrollment & Retention",
    "Dean of Students",
    "Digital Operations",
  ];
  const STALE_DAYS = 14;

  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  let ISSUES = [];
  /* department -> its sub-departments, read from the curated `sub_departments`
     table rather than from what people have typed into their own records. The
     free-text values on employees contain "Enrollment Couselling" and "Student
     Data Enaluator"; offering those as choices would spread the typos. */
  let SUBS = {};
  let OPEN_ID = null;                       // which issue is expanded
  const filters = { dept: "", severity: "", status: "", resolved: false };

  /* ── why an issue is where it is ────────────────────────────────────────
     Returns a score and the reasons behind it. The reasons are what get shown;
     the score only orders them. Kept together so the two can never disagree. */
  function triage(i) {
    const why = [];
    let score = 0;

    if (i.severity === "Critical") { score += 100; why.push("Critical"); }
    if (i.severity === "Moderate") { score += 40; }
    if (i.status === "Escalated") { score += 60; why.push("escalated"); }

    if (typeof i.days_to_target === "number") {
      if (i.days_to_target < 0) {
        score += 50 + Math.min(-i.days_to_target, 30);
        why.push(`${-i.days_to_target} ${-i.days_to_target === 1 ? "day" : "days"} overdue`);
      } else if (i.days_to_target <= 7) {
        score += 25;
        why.push(i.days_to_target === 0 ? "due today" : `due in ${i.days_to_target} days`);
      }
    }
    // Silence. An issue nobody has written on is the one that quietly rots, and
    // it is the cheapest thing on this page to detect.
    if (i.days_since_update >= STALE_DAYS) {
      score += 20 + Math.min(i.days_since_update, 60);
      why.push(`no update in ${i.days_since_update} days`);
    }
    return { score, why };
  }

  function chip(kind, text) {
    return `<span class="ei-chip ei-chip-${kind}">${esc(text)}</span>`;
  }

  /** Colour a severity <select> to match the level chosen inside it. */
  function tintSeverity(sel) {
    if (!sel) return;
    sel.className = (sel.className || "").replace(/is-sev-[a-z]+/g, "").trim();
    if (sel.value) sel.classList.add("is-sev-" + sel.value.toLowerCase());
  }
  function watchSeverity(root) {
    (root || document).querySelectorAll('select[name="severity"], #nSeverity')
      .forEach((sel) => {
        tintSeverity(sel);
        if (sel.dataset.tinted) return;
        sel.dataset.tinted = "1";
        sel.addEventListener("change", () => tintSeverity(sel));
      });
  }

  function fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return "—";
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  /* ── the band at the top ───────────────────────────────────────────────── */
  function renderBrief(b) {
    const host = el("eiBrief");
    if (!b) { host.innerHTML = ""; return; }
    const tile = (n, label, tone) =>
      `<div class="ei-stat${tone ? " is-" + tone : ""}${n ? "" : " is-quiet"}">
         <div class="ei-stat-n">${n}</div><div class="ei-stat-l">${esc(label)}</div>
       </div>`;
    host.innerHTML =
      tile(b.open_total || 0, "Open", null) +
      // The view still calls the column red_open — it counts the top level,
      // whatever that level is named. What the reader sees is the word.
      tile(b.red_open || 0, "Critical", "red") +
      tile(b.escalated || 0, "Escalated", "red") +
      tile(b.overdue || 0, "Overdue", "amber") +
      tile(b.due_this_week || 0, "Due this week", "amber") +
      tile(b.going_stale || 0, `No update in ${STALE_DAYS}d`, "amber") +
      tile(b.raised_7d || 0, "Raised this week", null) +
      tile(b.resolved_30d || 0, "Resolved (30d)", "green");
  }

  /* ── one issue ─────────────────────────────────────────────────────────── */
  function issueCard(i) {
    const t = triage(i);
    const open = OPEN_ID === i.id;
    const meta = [
      i.department ? esc(i.department) + (i.sub_department ? " / " + esc(i.sub_department) : "") : null,
      i.owner ? "Owner: " + esc(i.owner) : null,
      `Raised ${fmtDate(i.first_observed)}`,
      i.target_date ? `Target ${fmtDate(i.target_date)}` : null,
    ].filter(Boolean).join(" &nbsp;·&nbsp; ");

    const links = [
      i.linked_kpi ? `<span class="ei-link-tag">KPI: ${esc(i.linked_kpi)}</span>` : "",
      i.linked_okr ? `<span class="ei-link-tag">OKR: ${esc(i.linked_okr)}</span>` : "",
    ].join("");

    return `
      <article class="ei-card${open ? " is-open" : ""}" data-id="${i.id}"
               data-sev="${esc(i.severity)}">
        <button type="button" class="ei-card-head" aria-expanded="${open}">
          <div class="ei-card-marks">
            ${chip("sev-" + String(i.severity || "").toLowerCase(), i.severity)}
            ${chip("status", i.status)}
          </div>
          <div class="ei-card-main">
            <h3 class="ei-card-title">${esc(i.title)}</h3>
            ${t.why.length
              ? `<p class="ei-why">${t.why.map(esc).join(" &nbsp;·&nbsp; ")}</p>`
              : ""}
            <p class="ei-meta">${meta}</p>
            ${links ? `<p class="ei-links">${links}</p>` : ""}
          </div>
          <svg class="ei-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        <div class="ei-card-body" ${open ? "" : "hidden"}>
          ${i.summary ? `<p class="ei-para"><strong>What is happening.</strong> ${esc(i.summary)}</p>` : ""}
          ${i.impact ? `<p class="ei-para"><strong>Who it affects.</strong> ${esc(i.impact)}</p>` : ""}
          <div class="ei-log" data-log="${i.id}">
            <p class="ei-log-loading">Loading updates…</p>
          </div>
          <form class="ei-add-update" data-issue="${i.id}">
            <label class="ei-label" for="note-${i.id}">Add an update</label>
            <textarea id="note-${i.id}" rows="2" required
              placeholder="What changed, what you tried, what you need."></textarea>
            <div class="ei-add-row">
              <select name="status" aria-label="Move status to">
                ${STATUS.map((s) => `<option value="${s}"${s === i.status ? " selected" : ""}>${s}</option>`).join("")}
              </select>
              <select name="severity" aria-label="Change severity">
                ${SEVERITY.map((s) => `<option value="${s}"${s === i.severity ? " selected" : ""}>${s}</option>`).join("")}
              </select>
              <button type="submit" class="ei-btn ei-btn-small">Post update</button>
            </div>
          </form>
        </div>
      </article>`;
  }

  function visible() {
    return ISSUES.filter((i) => {
      if (!filters.resolved && i.status === "Resolved") return false;
      if (filters.dept && i.department !== filters.dept) return false;
      if (filters.severity && i.severity !== filters.severity) return false;
      if (filters.status && i.status !== filters.status) return false;
      return true;
    }).sort((a, b) => {
      const d = triage(b).score - triage(a).score;
      if (d) return d;
      return (b.days_since_update || 0) - (a.days_since_update || 0);
    });
  }

  function renderList() {
    const host = el("eiList");
    const rows = visible();
    el("eiCount").textContent =
      rows.length + (rows.length === 1 ? " issue" : " issues");
    if (!rows.length) {
      host.innerHTML =
        `<div class="ei-empty"><strong>Nothing here.</strong>
           <p>${ISSUES.length ? "No issue matches these filters."
                              : "No issues have been raised yet. Use “Raise an issue” above."}</p>
         </div>`;
      return;
    }
    host.innerHTML = rows.map(issueCard).join("");
    watchSeverity(host);
  }

  /* ── the update log, fetched only when an issue is opened ───────────────── */
  async function loadLog(id) {
    const host = document.querySelector(`[data-log="${id}"]`);
    if (!host) return;
    try {
      const rows = await SS.db.select("emerging_issue_updates", {
        order: "created_at.desc",
        filter: { issue_id: "eq." + id },
      });
      if (!rows.length) {
        host.innerHTML = `<p class="ei-log-empty">No updates yet.</p>`;
        return;
      }
      host.innerHTML = rows.map((u) => `
        <div class="ei-log-item">
          <div class="ei-log-meta">
            ${chip("sev-" + String(u.severity_then || "").toLowerCase(), u.severity_then || "—")}
            <span>${esc(u.status_then || "")}</span>
            <span class="ei-log-who">${esc(u.created_by || "")}</span>
            <span class="ei-log-when">${fmtDate(u.created_at)}</span>
          </div>
          <p class="ei-log-note">${esc(u.note)}</p>
        </div>`).join("");
    } catch (err) {
      host.innerHTML = `<p class="ei-log-empty">Could not load updates — ${esc(err.message)}</p>`;
    }
  }

  /* ── writing ───────────────────────────────────────────────────────────── */
  async function raiseIssue(form) {
    const f = new FormData(form);
    const body = {
      title: (f.get("title") || "").toString().trim(),
      summary: (f.get("summary") || "").toString().trim() || null,
      impact: (f.get("impact") || "").toString().trim() || null,
      department: f.get("department") || null,
      sub_department: (function () {
        const chosen = (f.get("sub_department") || "").toString().trim();
        if (chosen !== OTHER) return chosen || null;
        // "Other" is a prompt, not an answer — store what they named instead.
        return (f.get("sub_department_other") || "").toString().trim() || null;
      })(),
      owner: (f.get("owner") || "").toString().trim() || null,
      severity: f.get("severity") || "Moderate",
      status: f.get("status") || "Open",
      target_date: f.get("target_date") || null,
    };
    if (!body.title) throw new Error("A title is required.");
    await SS.db.insert("emerging_issues", [body]);
  }

  async function postUpdate(form) {
    const id = Number(form.dataset.issue);
    const note = form.querySelector("textarea").value.trim();
    if (!note) return;
    const status = form.querySelector('[name="status"]').value;
    const severity = form.querySelector('[name="severity"]').value;

    // The note first, so the log records the state it was written against, then
    // the issue — otherwise a note explaining a change would be stamped with
    // the state it was explaining the move *away* from.
    await SS.db.insert("emerging_issue_updates", [{ issue_id: id, note: note }]);
    const issue = ISSUES.find((x) => x.id === id);
    if (issue && (issue.status !== status || issue.severity !== severity)) {
      await SS.db.update("emerging_issues", id, { status, severity }, "id");
    }
  }

  function say(msg, bad) {
    const n = el("eiSay");
    n.textContent = msg;
    n.className = "ei-say" + (bad ? " is-bad" : " is-good");
    n.hidden = false;
    clearTimeout(say._t);
    say._t = setTimeout(() => { n.hidden = true; }, 5000);
  }

  /* ── sub-departments ────────────────────────────────────────────────────
     The list depends on the department, and "Other" is always last so there is
     somewhere to put an issue that belongs to none of them. */
  const OTHER = "Other";

  async function loadSubDepartments() {
    try {
      const rows = await SS.db.select("sub_departments", {
        select: "department,name,sort_order", order: "department.asc,sort_order.asc",
      });
      SUBS = {};
      (rows || []).forEach((r) => {
        if (!r.department || !r.name) return;
        (SUBS[r.department] = SUBS[r.department] || []).push(r.name);
      });
    } catch {
      SUBS = {};                 // the field simply falls back to Other only
    }
  }

  function fillSubDepartments(dept) {
    const sel = el("nSubDept");
    const other = el("nSubDeptOther");
    if (!sel) return;
    other.hidden = true;
    other.value = "";

    if (!dept) {
      sel.innerHTML = `<option value="">Choose a department first</option>`;
      sel.disabled = true;
      return;
    }
    const list = SUBS[dept] || [];
    sel.disabled = false;
    sel.innerHTML =
      `<option value="">—</option>` +
      list.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("") +
      `<option value="${OTHER}">${OTHER}</option>`;
  }

  /* ── load ──────────────────────────────────────────────────────────────── */
  async function load() {
    const [rows, brief] = await Promise.all([
      SS.db.select("v_emerging_issues", { order: "id.desc" }),
      SS.db.select("v_emerging_issues_brief", { limit: 1 }),
    ]);
    ISSUES = rows || [];
    renderBrief((brief || [])[0]);
    renderList();
  }

  function fillFilters() {
    const opts = (arr) => arr.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
    el("fDept").innerHTML = `<option value="">All departments</option>` + opts(DEPARTMENTS);
    el("fSeverity").innerHTML = `<option value="">Any severity</option>` + opts(SEVERITY);
    el("fStatus").innerHTML = `<option value="">Any status</option>` + opts(STATUS);
    el("nDepartment").innerHTML = `<option value="">—</option>` + opts(DEPARTMENTS);
    el("nSeverity").innerHTML = opts(SEVERITY);
    el("nStatus").innerHTML = opts(STATUS);
    el("nSeverity").value = "Moderate";
    el("nStatus").value = "Open";
    // The dialog's selects exist from page load, so they are wired once here;
    // the ones inside issue cards are wired each time the list is drawn.
    watchSeverity(document);
  }

  async function start() {
    try { await (window.SS.access && window.SS.access.ready); } catch { /* carry on */ }

    // Anyone not inside Student Services gets the wall — partners, and equally a
    // session whose role never resolved. The database refuses both; saying so
    // plainly beats an empty list that looks like a page which failed to load.
    if (!window.SS.access || !window.SS.access.isStudentServices) {
      el("eiGate").hidden = false;
      el("eiMain").hidden = true;
      return;
    }

    fillFilters();
    await loadSubDepartments();
    fillSubDepartments("");
    try {
      await load();
    } catch (err) {
      // Before supabase/emerging-issues.sql has been run the tables are simply
      // not there, and PostgREST answers 404. That is a setup step, not a
      // fault, and it should not be reported to a reader as a stack trace.
      const notBuiltYet = /404|PGRST205|does not exist/i.test(err.message || "");
      el("eiList").innerHTML = notBuiltYet
        ? `<div class="ei-empty"><strong>The register is not switched on yet.</strong>
             <p>Once <code>supabase/emerging-issues.sql</code> has been run, issues
                raised here will appear in this list.</p></div>`
        : `<div class="ei-empty"><strong>Could not load the register.</strong>
             <p>${esc(err.message)}</p></div>`;
      el("eiRaise").disabled = notBuiltYet;
    }

    // Filters
    ["fDept", "fSeverity", "fStatus"].forEach((id) => {
      el(id).addEventListener("change", () => {
        filters.dept = el("fDept").value;
        filters.severity = el("fSeverity").value;
        filters.status = el("fStatus").value;
        renderList();
      });
    });
    el("fResolved").addEventListener("change", (e) => {
      filters.resolved = e.target.checked;
      renderList();
    });

    // Open and close an issue. Delegated, because the list is redrawn often.
    el("eiList").addEventListener("click", (e) => {
      const head = e.target.closest(".ei-card-head");
      if (!head) return;
      const card = head.closest(".ei-card");
      const id = Number(card.dataset.id);
      OPEN_ID = OPEN_ID === id ? null : id;
      renderList();
      if (OPEN_ID) loadLog(OPEN_ID);
    });

    // Post an update
    el("eiList").addEventListener("submit", async (e) => {
      const form = e.target.closest(".ei-add-update");
      if (!form) return;
      e.preventDefault();
      const btn = form.querySelector("button");
      btn.disabled = true;
      try {
        await postUpdate(form);
        await load();
        if (OPEN_ID) loadLog(OPEN_ID);
        say("Update posted.");
      } catch (err) {
        say(err.message || "Could not post that update.", true);
      } finally { btn.disabled = false; }
    });

    // Raise an issue
    const dlg = el("eiDialog");
    el("eiRaise").addEventListener("click", () => {
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
      el("nTitle").focus();
    });
    el("nDepartment").addEventListener("change", (e) => fillSubDepartments(e.target.value));
    el("nSubDept").addEventListener("change", (e) => {
      const other = el("nSubDeptOther");
      other.hidden = e.target.value !== OTHER;
      if (!other.hidden) other.focus(); else other.value = "";
    });

    el("eiCancel").addEventListener("click", () => dlg.close());

    // Arriving from the home page's "Raise an issue" button. The form lives in
    // one place and is deep-linked to, rather than being built twice.
    if (location.hash === "#raise") {
      history.replaceState(null, "", location.pathname);   // don't re-open on refresh
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      el("nTitle").focus();
    }
    el("eiForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = el("eiSubmit");
      btn.disabled = true;
      try {
        await raiseIssue(e.target);
        dlg.close();
        e.target.reset();
        el("nSeverity").value = "Moderate";
        el("nStatus").value = "Open";
        fillSubDepartments("");
        watchSeverity(document);
        await load();
        say("Issue raised.");
      } catch (err) {
        const oldLevels = /severity_check|check constraint/i.test(err.message || "");
        say(oldLevels
          ? "The database still expects the old Red / Amber / Green levels — run supabase/emerging-issues-severity.sql."
          : (err.message || "Could not raise that issue."), true);
      } finally { btn.disabled = false; }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
