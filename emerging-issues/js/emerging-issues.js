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
  /* Three, not five. "Open / Investigating / Monitoring / Escalated" asked for
     a distinction nobody was drawing: what anyone wanted to know was whether
     this has been worked out yet, whether something is being done, or whether
     it is finished. See supabase/emerging-issues-v2.sql for the remapping of
     what was already raised under the old five. */
  const STATUS = ["Exploring", "Resolution in process", "Resolved"];

  /* ── the three windows ──────────────────────────────────────────────────
     Buckets by age in days, not by calendar week. A calendar week would move
     an issue raised on Sunday evening into "Last Week" on Monday morning,
     roughly twelve hours old — which is not what anybody means by last week.
     Rolling sevens give every issue the same seven days of being new.

     `max` is exclusive: 0-6 days is this week, 7-13 last week, 14+ backlog. */
  const BUCKETS = [
    { id: "current", label: "Current Week", max: 7,
      blurb: "Raised in the last seven days." },
    { id: "last",    label: "Last Week",    max: 14,
      blurb: "Raised seven to fourteen days ago." },
    { id: "backlog", label: "Backlog",      max: Infinity,
      blurb: "Raised more than a fortnight ago and still open." },
  ];
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
  let TAB = "current";                      // which of the three is showing

  /* ── why an issue is where it is ────────────────────────────────────────
     Returns a score and the reasons behind it. The reasons are what get shown;
     the score only orders them. Kept together so the two can never disagree. */
  function triage(i) {
    const why = [];
    let score = 0;

    if (i.severity === "Critical") { score += 100; why.push("Critical"); }
    if (i.severity === "Moderate") { score += 40; }

    /* Nobody has picked this up yet.
       This replaces the old "escalated" rule, and replaces the target-date
       arithmetic that came after it. Both are gone for the same reason: they
       measured a promise somebody had to remember to make. An issue still
       sitting in Exploring after a week made no promise and needs no date to
       be obviously stuck - the register already knows how old it is. */
    if (i.status === "Exploring" && i.age_days >= 7) {
      score += 45;
      why.push(`still exploring after ${i.age_days} days`);
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

  /**
   * Who raised this, for the byline.
   *
   * The name is resolved when the issue is raised and stored on the row — the
   * page cannot look one up, because hub_access is readable only by PM editors
   * and admins, and a staff member reading the register is neither. So this
   * prefers what the database stamped, and only falls back to tidying up the
   * email when a row predates that (or the address was never in hub_access).
   */
  function who(i) {
    const name = (i.raised_by_name || "").trim();
    if (name && name.indexOf("@") === -1) return name;
    const e = (name || i.raised_by || "").trim();
    if (!e) return "someone no longer recorded";
    return e.split("@")[0].replace(/[._]+/g, " ") || e;
  }

  /** Day and time, because "when was this raised" is answered in both. */
  function fmtWhen(d) {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return "—";
    return dt.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  }

  function fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return "—";
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  /* ── when it was raised ─────────────────────────────────────────────────
     How old an issue is, in whole days. Read from `age_days` when the view
     supplies it, and otherwise worked out from when the row was created, so a
     row that has just been inserted and not yet re-read still lands in the
     right tab. */
  function ageDays(i) {
    if (typeof i.age_days === "number") return i.age_days;
    const t = Date.parse(i.created_at || i.first_observed);
    if (isNaN(t)) return 0;
    return Math.max(0, Math.floor((Date.now() - t) / 86400000));
  }

  function bucketOf(i) {
    const age = ageDays(i);
    return (BUCKETS.find((b) => age < b.max) || BUCKETS[BUCKETS.length - 1]).id;
  }

  /* Everything the filters allow, before the tab is applied. The tab counts
     have to be drawn from this rather than from the visible rows, or each tab
     would report the number showing on the tab you are already looking at. */
  function afterFilters() {
    return ISSUES.filter((i) => {
      if (!filters.resolved && i.status === "Resolved") return false;
      if (filters.dept && i.department !== filters.dept) return false;
      if (filters.severity && i.severity !== filters.severity) return false;
      if (filters.status && i.status !== filters.status) return false;
      return true;
    });
  }

  function renderTabs() {
    const host = el("eiTabs");
    if (!host) return;
    const pool = afterFilters();
    host.innerHTML = BUCKETS.map((b) => {
      const n = pool.filter((i) => bucketOf(i) === b.id).length;
      const on = TAB === b.id;
      return `<button type="button" class="ei-tab${on ? " is-on" : ""}"
                role="tab" aria-selected="${on}" data-tab="${b.id}" title="${esc(b.blurb)}">
                <span class="ei-tab-l">${esc(b.label)}</span>
                <span class="ei-tab-n${n ? "" : " is-quiet"}">${n}</span>
              </button>`;
    }).join("");
  }

  /* ── one issue ─────────────────────────────────────────────────────────── */
  function issueCard(i) {
    const t = triage(i);
    const open = OPEN_ID === i.id;
    /* Who raised it and exactly when, from the row the database stamped - not
       from anything typed into the form. `owner` and `target_date` are no
       longer collected; issues raised before that change still carry them, so
       they are still shown when they are there rather than being hidden to
       make the new rows look tidy. */
    const meta = [
      i.department ? esc(i.department) + (i.sub_department ? " / " + esc(i.sub_department) : "") : null,
      `Raised by ${esc(who(i))} · ${fmtWhen(i.created_at || i.first_observed)}`,
      i.owner ? "Owner: " + esc(i.owner) : null,
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
          ${i.summary ? `<p class="ei-para">${esc(i.summary)}</p>` : ""}
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
    return afterFilters().filter((i) => bucketOf(i) === TAB).sort((a, b) => {
      const d = triage(b).score - triage(a).score;
      if (d) return d;
      return (b.days_since_update || 0) - (a.days_since_update || 0);
    });
  }

  function renderList() {
    const host = el("eiList");
    // Tabs first: their counts come from the filters, so they have to be
    // redrawn whenever the filters move, not only when the tab changes.
    renderTabs();
    const rows = visible();
    el("eiCount").textContent =
      rows.length + (rows.length === 1 ? " issue" : " issues");
    if (!rows.length) {
      const tab = BUCKETS.find((b) => b.id === TAB) || BUCKETS[0];
      const elsewhere = afterFilters().length;
      host.innerHTML =
        `<div class="ei-empty"><strong>Nothing in ${esc(tab.label)}.</strong>
           <p>${!ISSUES.length
                 ? "No issues have been raised yet. Use “Raise an issue” above."
                 : elsewhere
                   ? `${esc(tab.blurb)} ${elsewhere} ${elsewhere === 1 ? "issue matches" : "issues match"} these filters in the other tabs.`
                   : "No issue matches these filters."}</p>
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
  /**
   * A short heading for one issue, taken from the first thing it says.
   *
   * The form asks one question now, so there is no separate title to store —
   * but the register still needs something short to put at the head of each
   * card, and a digest still needs a way to name an issue in a sentence. Both
   * are better served by the writer's own opening words than by a truncation
   * at whatever character happens to fall on the limit, so this cuts at the
   * first sentence end or line break and only falls back to a hard trim when
   * the opening runs long.
   */
  const TITLE_MAX = 140;
  function headline(text) {
    const flat = String(text || "").replace(/\s+/g, " ").trim();
    if (!flat) return "Untitled issue";
    const stop = flat.search(/[.!?](\s|$)/);
    let head = (stop > 0 && stop <= TITLE_MAX) ? flat.slice(0, stop + 1) : flat;
    if (head.length > TITLE_MAX) head = head.slice(0, TITLE_MAX - 1).replace(/\s+\S*$/, "") + "…";
    return head;
  }

  async function raiseIssue(form) {
    const f = new FormData(form);
    const summary = (f.get("summary") || "").toString().trim();
    if (!summary) throw new Error("Say what is happening before raising it.");

    const body = {
      // Derived, not asked for. See headline() above.
      title: headline(summary),
      summary: summary,
      department: f.get("department") || null,
      sub_department: (function () {
        const chosen = (f.get("sub_department") || "").toString().trim();
        if (chosen !== OTHER) return chosen || null;
        // "Other" is a prompt, not an answer — store what they named instead.
        return (f.get("sub_department_other") || "").toString().trim() || null;
      })(),
      severity: f.get("severity") || "Moderate",
      status: f.get("status") || "Exploring",
      // owner and target_date are deliberately absent: nobody is asked for
      // either any more. raised_by and created_at are stamped by the database
      // from the signed-in session, which is the only account of who and when
      // that cannot be typed wrong.
    };
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
    // One request, not two. The brief view fed the row of stat tiles that used
    // to sit above the list; the tabs count their own rows from what is already
    // in hand, so a second round trip would buy nothing.
    ISSUES = await SS.db.select("v_emerging_issues", { order: "id.desc" }) || [];
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
    el("nStatus").value = "Exploring";
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

    // Tabs. Delegated, because renderTabs() replaces the buttons each time the
    // counts change and a listener bound to one of them would go with it.
    el("eiTabs").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tab]");
      if (!btn || btn.dataset.tab === TAB) return;
      TAB = btn.dataset.tab;
      OPEN_ID = null;              // an expanded card in one tab is not open in the next
      renderList();
    });

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
      el("nSummary").focus();
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
      el("nSummary").focus();
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
        el("nStatus").value = "Exploring";
        fillSubDepartments("");
        watchSeverity(document);
        // A new issue is by definition in Current Week; showing the reader a
        // different tab would look like it had not saved.
        TAB = BUCKETS[0].id;
        await load();
        say("Issue raised.");
      } catch (err) {
        /* Two different patches can be missing, and each needs its own name.
           A single "check constraint" catch-all used to answer both, which
           meant a status the database had not heard of sent whoever hit it to
           the severity file. */
        const m = err.message || "";
        const oldStatus = /status_check/i.test(m);
        const oldLevels = /severity_check/i.test(m);
        say(
          oldStatus
            ? "The database still expects the old five statuses — run supabase/emerging-issues-v2.sql."
          : oldLevels
            ? "The database still expects the old Red / Amber / Green levels — run supabase/emerging-issues-severity.sql."
          : /check constraint/i.test(m)
            ? "The database refused that value — supabase/emerging-issues-v2.sql may not have been run yet."
            : (m || "Could not raise that issue."), true);
      } finally { btn.disabled = false; }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else { start(); }
})();
