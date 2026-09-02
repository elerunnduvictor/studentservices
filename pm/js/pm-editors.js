/* ═══════════════ PM EDITORS — MOVED ═══════════════

   This file held the seven project managers' work email addresses and was
   loaded by all six PM Hub pages, which made it a static file on a public
   site: anyone who asked for the path got the list. The same mistake as
   js/allowed-users.js (258 addresses) and supabase/access-control.sql (261),
   just smaller.

   The list is now supabase/pm-editors.js, which .vercelignore keeps out of the
   deployment. It is a build-time input for import_sheets.py and nothing else.

   ── What replaced the check it provided ──

   pm/js/shell.js used to require two gates to edit: this list, and the
   `allowed_editors` table. Only the second was ever a boundary — row-level
   security consults that table on every write, and a mistake in it would let a
   write through whatever this file said. The list gated the UI, not the data.

   So the UI now asks `allowed_editors` too, and refuses when it cannot get an
   answer instead of assuming. The sign-in screen dropped its courtesy check
   for the same reason: the signup trigger already refuses an unprovisioned
   address with "This address is not provisioned for Student Services. Contact
   Ben Packer or Jess Swinburne." — the same guidance, one round trip later,
   without publishing who is on the list.

   Nothing loads this file. It is left as a record of what was here and why it
   went, so it does not get regenerated.
   ═══════════════════════════════════════════════════ */
