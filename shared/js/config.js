/* ═══════════════════════════════════════════════════════════════════════════
   SUPABASE CONNECTION — shared by the hub and the PM console

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

  // The PM console's address is deliberately absent from this file. The hub
  // never links to it and should not advertise it — editors go there directly.

  // When Supabase is unreachable or not yet configured, the hub falls back to
  // the data files bundled with the page so it still renders. Set false to make
  // failures loud instead.
  ALLOW_STATIC_FALLBACK: true,
};

window.SS_CONFIG.isConfigured = Boolean(
  window.SS_CONFIG.SUPABASE_URL && window.SS_CONFIG.SUPABASE_ANON_KEY
);
