/* ═══════════════ FIELD NOTES ═══════════════
   The third register on this page: one note per person per week — what the
   week held, anything in the way, and what comes next.

   ── Weeks, not ages ──

   The issue register beside this one buckets by rolling sevens, so that an
   issue raised on Sunday evening is not "last week" by Monday morning. A field
   note is the opposite case: it is *about* a calendar week, and its own
   `week_of` says which. So Current / Last / Backlog compare that Monday
   against this one, and how long ago the note was typed never comes into it.
   Someone writing Monday morning about the week just gone picks last week's
   Monday in the form, and the note lands where they meant it to.

   ── Who sees what ──

   Your own notes, always; everyone's if you are a director or an admin. That
   is enforced by row-level security in supabase/field-notes.sql, not here —
   this file only decides whether to offer the tab at all, so that a partner is
   not shown a door into an empty room.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const SS = (window.SS = window.SS || {});
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  /* The same four the issue register offers. Kept in step by eye rather than
     shared, because the two forms are free to diverge — a note is filed
     against the writer's own department, an issue against the one that owns
     the problem. */
  const DEPARTMENTS = [
    "Student Records, Registration, and Support",
    "Enrollment & Retention",
    "Dean of Students",
    "Digital Operations",
  ];

  const WEEKS_OFFERED = 8;        // this week and the seven before it, in the form

  let NOTES = null;               // every note this reader may see
  let LOADED = false;
  let BUCKET = "current";
  const f = { dept: "", person: "" };

  /* ── days and weeks ──────────────────────────────────────────────────────
     All of this works in plain yyyy-mm-dd strings. Dates from the database are
     days, not instants, and turning them into Date objects invites a timezone
     to move them: "2026-09-21" parsed as UTC and read back in Denver is the
     20th, which is a Sunday, which is the wrong week. */
  const pad = (n) => String(n).padStart(2, "0");

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /** The Monday of the week a given day falls in. */
  function mondayOf(iso) {
    const d = new Date(iso + "T12:00:00Z");     // midday, so no shift can cross a day
    const back = (d.getUTCDay() + 6) % 7;       // Monday = 0
    d.setUTCDate(d.getUTCDate() - back);
    return d.toISOString().slice(0, 10);
  }

  function addDays(iso, n) {
    const d = new Date(iso + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function shortDay(iso) {
    if (!iso) return "";
    const p = String(iso).slice(0, 10).split("-");
    if (p.length !== 3) return String(iso);
    return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1];
  }
  function longDay(iso) {
    if (!iso) return "";
    const p = String(iso).slice(0, 10).split("-");
    if (p.length !== 3) return String(iso);
    return MONTHS[Number(p[1]) - 1] + " " + Number(p[2]) + ", " + p[0];
  }

  /** The week a note belongs to, as the tabs divide them. */
  function bucketOf(note) {
    const thisWeek = mondayOf(todayISO());
    const lastWeek = addDays(thisWeek, -7);
    const w = String(note.week_of || "").slice(0, 10);
    if (w >= thisWeek) return "current";        // a note filed ahead sits with this week
    if (w === lastWeek) return "last";
    return "backlog";
  }

  const BUCKETS = [
    { id: "current", label: "Current Week", blurb: "Notes about the week we are in." },
    { id: "last",    label: "Last Week",    blurb: "Notes about the week just gone." },
    { id: "backlog", label: "Backlog",      blurb: "Every week before that." },
  ];

  /* ── who is reading ──────────────────────────────────────────────────── */
  const access = () => (window.SS && window.SS.access) || null;
  const myEmail = () => String((access() && access().email) || "").toLowerCase();
  const isMine = (n) => !!myEmail() && String(n.created_by || "").toLowerCase() === myEmail();

  function deptColor(name) {
    const c = window.DEPT_COLORS && window.DEPT_COLORS[name];
    return (c && c.bg) || "var(--text-dim)";
  }

  /* ── drawing ─────────────────────────────────────────────────────────── */

  function noteCard(n) {
    const part = (cls, title, body) => body && String(body).trim()
      ? `<div class="fn-part ${cls}"><h4>${esc(title)}</h4><p>${esc(String(body).trim())}</p></div>`
      : "";
    const written = String(n.note_date || "").slice(0, 10);
    const week = String(n.week_of || "").slice(0, 10);
    return `
      <article class="fn-note${isMine(n) ? " is-mine" : ""}" style="--ei-dept:${deptColor(n.department)}">
        <div class="fn-note-head">
          <span class="fn-who">${esc(n.person || "Someone")}</span>
          ${isMine(n) ? `<span class="fn-mine-tag">Yours</span>` : ""}
          <span class="fn-dept">${esc(n.department || "")}</span>
          <span class="fn-when">Week of ${esc(shortDay(week))}${
            written && written !== week ? ` &middot; written ${esc(shortDay(written))}` : ""}</span>
        </div>
        <div class="fn-body">
          ${part("is-notes", "Notes", n.notes)}
          ${part("is-blockers", "Blockers or challenges", n.blockers)}
          ${part("is-focus", "Focus for next week", n.focus)}
        </div>
      </article>`;
  }

  function renderTabs(counts) {
    const nav = el("fnTabs");
    if (!nav) return;
    nav.innerHTML = BUCKETS.map((b) => `
      <button type="button" class="ei-tab${b.id === BUCKET ? " is-on" : ""}" role="tab"
              data-bucket="${b.id}" aria-selected="${b.id === BUCKET}"
              tabindex="${b.id === BUCKET ? 0 : -1}" title="${esc(b.blurb)}">
        ${esc(b.label)}
        <span class="ei-tab-n${counts[b.id] ? "" : " is-quiet"}">${counts[b.id] || 0}</span>
      </button>`).join("");
  }

  function fillFilters() {
    const depts = [...new Set(NOTES.map((n) => n.department).filter(Boolean))].sort();
    const people = [...new Set(NOTES.map((n) => n.person).filter(Boolean))].sort();
    const opts = (list) => list.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
    const d = el("fnDept"), p = el("fnPerson");
    if (d) { d.innerHTML = `<option value="">All departments</option>` + opts(depts); d.value = f.dept; }
    // One person's own notes are the only ones most readers have, so a person
    // filter that offers a list of one is noise. It appears once there are two.
    if (p) {
      p.hidden = people.length < 2;
      p.innerHTML = `<option value="">Everyone</option>` + opts(people);
      p.value = f.person;
    }
  }

  function render() {
    const host = el("fnList");
    if (!host) return;
    if (!NOTES) {
      host.innerHTML = `<div class="ei-empty"><strong>Loading the field notes&hellip;</strong></div>`;
      return;
    }

    const counts = { current: 0, last: 0, backlog: 0 };
    NOTES.forEach((n) => { counts[bucketOf(n)]++; });
    renderTabs(counts);

    const matches = (n) => bucketOf(n) === BUCKET
      && (!f.dept || n.department === f.dept)
      && (!f.person || n.person === f.person);
    const shown = NOTES.filter(matches);
    const inBucket = NOTES.filter((n) => bucketOf(n) === BUCKET).length;
    const filtering = !!(f.dept || f.person);

    const count = el("fnCount");
    if (count) {
      count.textContent = filtering && inBucket
        ? `Showing ${shown.length} of ${inBucket} note${inBucket === 1 ? "" : "s"}`
        : "";
    }

    if (!shown.length) {
      const bucket = BUCKETS.find((b) => b.id === BUCKET);
      host.innerHTML = inBucket
        ? `<div class="ei-empty"><strong>Nothing matches.</strong>
             <p>No notes here match these filters.
               <button type="button" class="fn-link" data-clear>Clear the filters</button></p></div>`
        : `<div class="ei-empty"><strong>No notes for this week yet.</strong>
             <p>${esc(bucket ? bucket.blurb : "")} Yours would be the first.</p></div>`;
      return;
    }

    host.innerHTML = shown.map(noteCard).join("");
  }

  /* ── the form ────────────────────────────────────────────────────────── */

  /** The Mondays the form offers, newest first, named for how people say them. */
  function weekOptions() {
    const thisWeek = mondayOf(todayISO());
    const out = [];
    for (let i = 0; i < WEEKS_OFFERED; i++) {
      const w = addDays(thisWeek, -7 * i);
      out.push({
        value: w,
        label: i === 0 ? `This week (${shortDay(w)})`
             : i === 1 ? `Last week (${shortDay(w)})`
             : `Week of ${longDay(w)}`,
      });
    }
    return out;
  }

  function fillForm() {
    const today = todayISO();
    const date = el("fnDate"), week = el("fnWeek"), person = el("fnPersonIn"), dept = el("fnDeptIn");
    if (date) { date.value = today; date.max = today; }
    if (week) {
      week.innerHTML = weekOptions()
        .map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join("");
      week.value = mondayOf(today);
    }
    // Prefilled, not fixed: most people are writing their own note, and the
    // occasional one written for a colleague should not need a workaround.
    if (person && !person.value) {
      const a = access();
      person.value = (a && (a.fullName || (a.scope && a.scope.person))) || "";
    }
    if (dept) {
      dept.innerHTML = `<option value="">&mdash;</option>` +
        DEPARTMENTS.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
      const mine = access() && access().scope && access().scope.department;
      if (mine && DEPARTMENTS.indexOf(mine) >= 0) dept.value = mine;
    }
  }

  function say(text, bad) {
    const box = el("fnSay");
    if (!box) return;
    box.textContent = text || "";
    box.hidden = !text;
    box.classList.toggle("is-bad", !!bad);
  }

  async function submit(e) {
    e.preventDefault();
    const form = el("fnForm"), btn = el("fnSubmit");
    if (!form.reportValidity()) return;
    const d = new FormData(form);
    const text = (k) => String(d.get(k) || "").trim();

    const body = {
      note_date: text("note_date") || todayISO(),
      week_of: text("week_of"),
      person: text("person"),
      department: text("department"),
      notes: text("notes"),
      blockers: text("blockers") || null,
      focus: text("focus"),
      // created_by and created_at are stamped by the database from the session,
      // which is the only account of who wrote this that cannot be typed wrong.
    };

    btn.disabled = true;
    try {
      await SS.db.insert("field_notes", [body]);
      el("fnDialog").close();
      form.reset();
      say("Your field note is posted.");
      setTimeout(() => say(""), 4000);
      LOADED = false;
      await load(true);
    } catch (err) {
      say("That did not save: " + ((err && err.message) || err), true);
    } finally {
      btn.disabled = false;
    }
  }

  /* ── loading ─────────────────────────────────────────────────────────── */

  async function load(force) {
    if (LOADED && !force) return;
    LOADED = true;
    try {
      NOTES = await SS.db.select("v_field_notes", { order: "week_of.desc,created_at.desc" }) || [];
    } catch (err) {
      NOTES = [];
      const text = String((err && err.message) || err);
      // The table arrives with supabase/field-notes.sql; until that is run the
      // tab should say so rather than looking like an outage.
      say(/PGRST205|does not exist|not find/i.test(text)
        ? "Field Notes is not switched on yet — supabase/field-notes.sql has not been run."
        : "The field notes could not be loaded: " + text, true);
    }
    fillFilters();
    render();
    const n = el("fnViewCount");
    if (n && NOTES) {
      const mine = NOTES.filter((x) => bucketOf(x) === "current").length;
      n.textContent = mine || "";
      n.hidden = !mine;
    }
  }

  /* ── wiring ──────────────────────────────────────────────────────────── */

  function wire() {
    const tabs = el("fnTabs");
    if (tabs) {
      tabs.addEventListener("click", (e) => {
        const b = e.target.closest("[data-bucket]");
        if (!b) return;
        BUCKET = b.dataset.bucket;
        render();
      });
      tabs.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const all = [...tabs.querySelectorAll(".ei-tab")];
        const i = all.indexOf(document.activeElement);
        if (i < 0) return;
        const next = all[(i + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
        next.focus();
        BUCKET = next.dataset.bucket;
        render();
      });
    }

    const d = el("fnDept"), p = el("fnPerson");
    if (d) d.addEventListener("change", (e) => { f.dept = e.target.value; render(); });
    if (p) p.addEventListener("change", (e) => { f.person = e.target.value; render(); });

    const list = el("fnList");
    if (list) list.addEventListener("click", (e) => {
      if (!e.target.closest("[data-clear]")) return;
      f.dept = ""; f.person = "";
      fillFilters();
      render();
    });

    // "Raise it in Emerging Issues" takes them there rather than telling them
    // where it is.
    const intro = document.querySelector(".fn-intro");
    if (intro) intro.addEventListener("click", (e) => {
      const b = e.target.closest("[data-goto]");
      if (!b) return;
      const tab = el("eiViewRegister");
      if (tab) tab.click();
    });

    const add = el("fnAdd");
    if (add) add.addEventListener("click", () => {
      fillForm();
      say("");
      el("fnDialog").showModal();
    });
    const cancel = el("fnCancel");
    if (cancel) cancel.addEventListener("click", () => el("fnDialog").close());
    const form = el("fnForm");
    if (form) form.addEventListener("submit", submit);

    // The week follows the date unless the writer moves it themselves.
    const date = el("fnDate"), week = el("fnWeek");
    if (date && week) date.addEventListener("change", () => {
      if (!date.value) return;
      const m = mondayOf(date.value);
      if ([...week.options].some((o) => o.value === m)) week.value = m;
    });
  }

  /** Called by the view switch when this tab is opened. */
  function show() { load(false); }

  async function start() {
    // Nothing is readable from outside Student Services, so nothing is offered.
    const a = access();
    if (a && a.ready) { try { await a.ready; } catch (err) { /* stays "none" */ } }
    if (!a || !a.isStudentServices) return;

    const tab = el("eiViewNotes");
    if (tab) tab.hidden = false;
    const add = el("fnAdd");
    if (add) add.hidden = false;
    wire();
    if (location.hash.indexOf("#notes") === 0) load(false);
  }

  SS.fieldNotes = { show, load, bucketOf, mondayOf, weekOptions };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
