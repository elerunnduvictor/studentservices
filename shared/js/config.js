/* ═══════════════════════════════════════════════════════════════════════════
   SUPABASE CONNECTION — shared by the hub and the PM Hub

   Fill these two values in once and both apps come alive. Everything else in
   the system reads them from here.

   The anon key is *meant* to be public — it identifies the project, it does not
   grant access. What a caller may actually do is decided by the row-level
   security policies in supabase/schema.sql: anyone may read, only signed-in
   editors listed in `allowed_editors` may write. Never put the service_role key
   in this file; it bypasses RLS and would hand every visitor full write access.
   ═══════════════════════════════════════════════════════════════════════════ */

window.SS_CONFIG = {
  // From Supabase → Project Settings → API
  SUPABASE_URL: "https://eikzxbnbtxaeluuyfvpe.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3p4Ym5idHhhZWx1dXlmdnBlIiwicm9sZSI6ImFub24i" +
    "LCJpYXQiOjE3ODYwMjE4ODYsImV4cCI6MjEwMTU5Nzg4Nn0" +
    ".8rrk2KZgRpL5QfzhtteYgnRGR6zxbIWx9KPVIcm-zm0",

  // The PM Hub's address is deliberately absent from this file. The hub
  // never links to it and should not advertise it — editors go there directly.

  // There is no bundled-data fallback any more. The four snapshot files were
  // static files on a public site — 190 people, 76 KPIs with owners, 48 OKRs
  // and the org chart, fetchable by anyone who knew the path — so they were
  // removed, and shared/js/data-service.js keeps each reader's own last
  // successful read in their browser instead. ALLOW_STATIC_FALLBACK used to
  // gate that machinery and is gone with it.
};

window.SS_CONFIG.isConfigured = Boolean(
  window.SS_CONFIG.SUPABASE_URL && window.SS_CONFIG.SUPABASE_ANON_KEY
);

/* ── the session, where the server can see it ──────────────────────────────

   middleware.js runs on Vercel's edge and refuses any request without a valid
   session, so that a page or a photograph cannot be fetched by someone who
   never signed in — js/auth-guard.js only ever redirected a person, and did
   nothing at all to curl.

   The edge cannot read localStorage, which is where both apps keep their
   Supabase session. So the access token is mirrored into a cookie, which is
   the one piece of the session a server sees. It is the same token the page
   already holds and already sends on every request; putting it in a cookie
   moves nothing new into reach.

   Both hubs load this file, which is why the pair live here — the cookie name
   is a contract between these functions and middleware.js, and one copy of a
   contract is easier to keep true than two.

   Not HttpOnly, because the browser sets it. Not a security downgrade: the
   token is in localStorage regardless, and anything able to read the cookie
   could read that. */
window.SS_CONFIG.SESSION_COOKIE = "ss_gate";

/** Mirror an access token into the cookie, for as long as it is valid. */
window.SS_CONFIG.setSessionCookie = function (accessToken, expiresAt) {
  try {
    if (!accessToken) return;
    var now = Math.floor(Date.now() / 1000);
    // A minute short of the token's own expiry, so the cookie never outlives
    // what it carries — the edge would refuse a stale one anyway, and the
    // difference between "no cookie" and "a cookie that fails" is a clearer
    // trip to the sign-in page.
    var maxAge = Math.max(0, (expiresAt || now + 3600) - now - 60);
    if (!maxAge) return;
    document.cookie = window.SS_CONFIG.SESSION_COOKIE + "=" + accessToken +
      ";Path=/;Max-Age=" + maxAge + ";SameSite=Lax" +
      (location.protocol === "https:" ? ";Secure" : "");
  } catch (e) { /* cookies refused; the gate will send them to sign in */ }
};

/** Drop it. Sign-out and the idle timeout both call this. */
window.SS_CONFIG.clearSessionCookie = function () {
  try {
    document.cookie = window.SS_CONFIG.SESSION_COOKIE +
      "=;Path=/;Max-Age=0;SameSite=Lax" +
      (location.protocol === "https:" ? ";Secure" : "");
  } catch (e) { /* nothing to clear */ }
};
