/* ═══════════════ ALLOW-LIST — REMOVED ═══════════════

   This file held 258 work email addresses: every person with access to the
   hub, as a plain array on a public site. Anyone who guessed the path had the
   whole of Student Services' address book — a ready-made phishing target, and
   the one piece of the organisation that is worth the least to us and the most
   to someone attacking it.

   What it was for: js/login.js consulted it when the sign-in call could not be
   completed — not when the database refused, which is handled separately, but
   when it could not be asked at all. Anyone on the list was let in as a reader
   with no role, so an outage did not lock out the organisation.

   Two things ended that. It stopped being worth anything the moment
   supabase/rls-lockdown.sql closed the datasets to callers without a session:
   a roleless reader now sees nothing, so the branch admitted people to an
   empty hub. And the list had drifted 75 names behind the database years
   before that, refusing real staff at the door.

   Sign-in is now decided by `hub_access` and the signup trigger, and by
   nothing else. If the database cannot be reached, sign-in fails and says so —
   there is no data to read in that state anyway, whichever side of the door
   you are on.

   Nothing loads this file: login/index.html no longer script-tags it and
   login.js no longer reads window.ALLOWED_USERS. It is left in place as a
   record of what was here and why it went, so it does not get regenerated.
   ═══════════════════════════════════════════════════ */
