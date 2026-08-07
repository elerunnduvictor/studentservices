# Setting up the database and the PM Hub

Everything is built and tested. What remains is creating the Supabase project —
which needs your account — and pasting two values into one file.

---

## What I need from you

| # | Thing | Where it goes | Why |
|---|-------|---------------|-----|
| 1 | **Supabase Project URL** | `shared/js/config.js` | Tells both apps which database to talk to |
| 2 | **Supabase anon / public key** | `shared/js/config.js` | Identifies the project. Safe to commit — it grants nothing on its own; the RLS policies decide what a caller may do |
| 3 | **A second domain on your existing Vercel project** | Vercel → Settings → Domains | One project serves both apps; the PM Hub answers on `studentservicespm.vercel.app` |

Do **not** put the `service_role` key anywhere in this repository. It bypasses
row-level security; in a static site it would hand every visitor full write
access to the database.

---

## Steps

### 1. Create the project
supabase.com → New project. Any region close to your users. Save the database
password somewhere safe — you will not need it for this app, but you will for
backups.

### 2. Build the schema
Supabase → SQL Editor → New query → paste the whole of **`supabase/schema.sql`**
→ Run. That creates:

- the five data tables (`okrs`, `employees`, `student_employees`,
  `org_chart_nodes`, `kpis`)
- `allowed_editors` — who may write
- `change_log` — an audit row for every insert, update and delete, with who and when
- row-level security: **anyone may read, only listed editors may write**
- the three `v_hub_*` views the hub reads

### 3. Load the data
Run **`supabase/seed.sql`** the same way. It loads the current contents of the
three workbooks:

| Table | Rows |
|-------|------|
| `okrs` | 50 |
| `employees` | 109 |
| `student_employees` | 85 |
| `org_chart_nodes` | 53 |
| `kpis` | 153 (77 marked Tracking) |
| `allowed_editors` | 7 (the project managers) |

The seed truncates and reloads, and it suspends the audit triggers so an import
is not logged as though a person typed it.

**The source workbooks are no longer in the repository.** They were a one-time
bootstrap: the data now lives in Postgres and PMs edit it through the PM Hub,
so the spreadsheets stopped being the source of truth the moment the import ran.
`import_sheets.py` and `update_workbook.py` are kept as a record of how the data
got here — if you ever need to re-import, drop the workbooks back into
`data-sources/` and run:

```bash
python supabase/import_sheets.py     # reads data-sources/*.xlsx → supabase/seed.sql
```

Be aware that re-importing overwrites whatever PMs have since edited.

### 4. Turn on email sign-in

Supabase → Authentication → **Sign In / Providers → Email**:

| Setting | Value | Why |
|---|---|---|
| Enable email provider | **on** | the PM Hub signs in with email and password |
| **Confirm email** | **off** | this is the one that matters — see below |
| Allow new users to sign up | **on** | a PM sets their own password on first use |

**Confirm email must be off.** With it on, signing up returns a user but no
session and queues a confirmation link — and that link will never arrive.
Supabase's built-in mailer only delivers to members of your Supabase
organisation, so every `@churchofjesuschrist.org` address is silently dropped;
even with a custom sender, a managed Church domain is likely to quarantine it.
An emailed sign-in would strand all seven PMs. With it off, signup returns a
session straight away and no mail is ever sent.

Nothing needs to go under **URL Configuration** — there are no email links to
redirect.

A PM's first visit: enter the address, choose *First time here? Set your
password*, pick a password, and they are in. Afterwards it is an ordinary
sign-in. There is no password reset — if someone forgets theirs, delete the
account under **Authentication → Users** and they can set a new one.

> Anyone can call the signup endpoint, not just the seven. That buys nothing on
> its own: `allowed_editors` is checked by row-level security on every write, so
> an account outside the list can read exactly what the public hub already shows
> and change nothing.

### 4b. Who may edit

Seven people, in `pm/js/pm-editors.js`:

| Person | Scope |
|--------|-------|
| Jess Swinburne | VP of Student Services — Project Manager |
| Elie Gilles Ravel Mambou | Assistant Project Manager |
| Mariela Pezzali | Dean of Students |
| David De-Graft Koomson | Digital Operations |
| Charles Crankson | Enrollment & Retention |
| Moses Abioye | Student Records, Registration & Support |
| Victor Oluwapelumi Elerunndu | Student Records, Registration & Support |

That file is the only list to edit. `import_sheets.py` reads it to fill the
`allowed_editors` table, the sign-in screen checks it for an instant answer, and
row-level security checks the table again on every single write. Add or remove
an address, re-run the import, and access genuinely changes.

### 4c. Reconcile the directory (one time)

The Org Directory workbook had fallen behind the hub on several reporting-line
changes, so seeding from it reverted them. Run **`supabase/reconcile-directory.sql`**
once, after seed.sql. It restores those changes, adds Katelyn Graf and Charles
Crankson, and widens `v_hub_directory` so the hub's directory lists student
employees again as it always did.

The workbook itself has now been corrected too, so a future re-seed carries the
same state and this file is not needed again.

### 4d. Department names and student contractor counts

Run **`supabase/patch-02-departments.sql`** last. It gives the Records
department a single spelling (staff and student employees had drifted apart, so
the hub drew two bars for one team) and moves the per-department student
contractor headcount — the last figure that was still hardcoded — into a
`student_contractor_counts` table that PMs can edit.

### 4e. Security hardening and the org chart

Run these two last:

- **`supabase/patch-03-security.sql`** — clears every advisory Supabase raised.
  It turns on `security_invoker` for the three hub views (they were reading with
  the owner's rights and would have bypassed RLS), pins `search_path` on the
  trigger functions, revokes public EXECUTE on them, and retires `is_editor()`
  entirely — the write policies now ask "is my email in allowed_editors?"
  directly, so no privileged function needs to be callable by clients. It also
  makes `change_log` append-only, so an editor cannot rewrite the record of
  what they did.

- **`supabase/patch-04-org-chart.sql`** — widens `org_chart_nodes` to hold what
  the chart actually draws (tile level, department slug, photo, email, PM flag)
  and reloads all 53 nodes. The table previously held 43 leadership rows with
  none of those fields, so the chart could not have been pointed at it as-is.

- **`supabase/patch-05-performance-standards.sql`** — the last static page. Its
  12 sections and 56 services become `performance_sections` and
  `performance_services`, the key-metric → Power BI lookup becomes
  `performance_metric_links` (including the four metrics deliberately parked as
  "no report for now"), and the intro paragraph goes in `app_text` so it can be
  reworded without a deploy.

**Every page on the hub now reads from the database.**

### 5. Connect the apps
Open `shared/js/config.js` and fill in the two values from
Project Settings → API:

```js
SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi…",
```

That one file connects **both** the hub and the PM Hub.

### 6. Add the PM domain
Both apps ship from **one Vercel project**. In that project:

Settings → Domains → **Add** → `studentservicespm.vercel.app`

`vercel.json` at the repo root reads the Host header and, for that domain only,
serves everything out of `/pm`. Nothing else changes — the hub keeps answering
on its own domain from the repo root, and both read the same
`shared/js/config.js`, so the two values above are deployed once.

The order of the rewrite rules matters. `/shared/:path*` and `/favicon.svg` map
to themselves and must come *before* the `/:path*` catch-all — otherwise the
catch-all rewrites them to `/pm/shared/...`, which does not exist, and the PM
PM Hub loads with no config and no styling.

**Why the PM Hub's sign-in page is `signin.html`, not `index.html`.** Vercel
applies `rewrites` only *after* checking the filesystem, so any path that exists
at the repo root wins over a rewrite. The hub's own `index.html` therefore
shadowed `/` on the PM domain: the domain served the hub, and worse, the auth
gate's redirect to `index.html` bounced signed-out PMs onto the hub homepage
instead of sign-in. Every other PM path is unaffected — nothing else in `pm/`
shares a name with anything at the root.

The fix is the `redirects` entry for `/`, because Vercel processes redirects
*before* the filesystem. If you ever add a root-level file whose name matches a
PM page, the PM domain will silently start serving the hub's copy — check for
that first if the PM Hub behaves strangely.

A custom domain behaves identically: add `pm.yourdomain.org` and change the four
`host` values in `vercel.json`.

**`/pm/...` is closed off on the hub domain.** The console's files live under
`/pm` so one Vercel project can serve both apps, but that path should only ever
be reached through the PM domain. A redirect sends `/pm/...` back to the hub's
front page on any other host — written with `missing` rather than `has`, so it
keeps working if the hub gains another domain. The sign-in gate already refuses
anyone who is not one of the seven; this stops the door being findable at all.

> **Do not put comments in `vercel.json`.** Vercel validates it against a strict
> schema and rejects any unrecognised key — the `"//"` convention for JSON
> comments included, at the top level *and* inside a redirect or rewrite object.
> It does not warn: the build fails and the *previous* deployment stays live, so
> the site looks fine while every new file 404s. If a push seems not to have
> deployed, check that file first.

---

## How the pieces fit

```
   PM Hub                Supabase                    Hub
studentservicespm      ┌──────────────────┐      the Student Services site
   .vercel.app         │  okrs            │
        │              │  employees       │              │
   edit grids ───────► │  student_emps    │ ◄──── read (anon key, RLS: read-only)
   (signed-in          │  org_chart_nodes │              │
    editors only)      │  kpis            │       renders from the same rows
                       │  change_log      │
                       └──────────────────┘
```

A PM edits a grid and presses Save. The hub picks the change up on its next
page load — no export, no rebuild, no copy-paste between spreadsheets.

**If the database is unreachable**, every hub page falls back to the data file
bundled beside it and shows a quiet note in the corner. A dashboard showing
last week's numbers is far more useful than one showing an error.

---

## The one rule that is not in the spreadsheet

KPI colour is **computed, never stored**. `shared/js/kpi-status.js` reads each
KPI's own green/yellow/red bands and tests the current value against them. The
spreadsheet's "Performance Status" column is deliberately not imported — its
formula is wrong, and a stored status goes stale the moment a band or a value
changes.

The same file powers the Colour column in the PM Hub, so an editor sees the
consequence of a value as they type it.

---

## Repository layout

```
/                       the hub (deploy root — unchanged)
  index.html, directory/, okr-progress/, org-chart/, scorecard/,
  performance-standards/, departments/, login/, css/, js/, photos/

pm/                     the PM Hub  → same Vercel project, PM domain
shared/js/              used by both apps
  config.js               ← the two values you paste in
  data-service.js         reads/writes Supabase
  kpi-status.js           the one implementation of KPI colour
  hub-boot.js             loads a hub page's data before rendering it
supabase/               schema.sql, seed.sql, patches, import scripts
docs/                   this file
```

---

## Still to do

- **Realtime**: Supabase can push changes over a websocket, so an open hub page
  would update without a refresh. Straightforward now that the tables are live.
- **`rls_auto_enable()`** is a function in `public` that did not come from this
  schema. patch-03 revoked EXECUTE from every client role but left it in place,
  since something outside this repo may depend on it. Trace where it came from
  and drop it if nothing does.
- **Self-signup** is still open in Supabase Auth. A non-PM can request a sign-in
  link and end up with an empty auth account; they cannot open the PM Hub or
  write anything, because both the client list and `allowed_editors` refuse
  them. Closing it means disabling signups and pre-creating the seven accounts.
