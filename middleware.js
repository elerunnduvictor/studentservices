/* ═══════════════════════════════════════════════════════════════════════════
   THE FRONT DOOR, ON THE SERVER

   js/auth-guard.js sends a *person* to the login page. It does nothing to a
   request: curl ignores it, and every page, script and photograph was served
   to anyone who asked. That was tolerable while the pages were empty shells,
   and stopped being tolerable as the last thing left in them — 53 staff
   photographs, with names in the paths — is personal data.

   This runs on Vercel's edge before a file is served, so a request without a
   valid session gets nothing to serve.

   ── What counts as a session ──

   The Supabase access token the browser already holds, put in a cookie so the
   server can see it (localStorage is invisible here). Its signature is checked
   against the project's JWT secret and its expiry against the clock. Nothing
   else is trusted: a cookie can be written by anyone, so presence proves
   nothing and only the signature does.

   The project signs with HS256 — its own anon key says so — which Web Crypto
   verifies locally. No round trip to Supabase per request.

   ── Turning it on ──

   Two environment variables, both set in the Vercel project:

     SUPABASE_JWT_SECRET   Supabase → Settings → API → JWT Settings
     HUB_GATE=on           the switch

   Without HUB_GATE=on this passes every request through untouched. That is
   deliberate: this file can lock out the whole organisation if the cookie or
   refresh path is wrong, so it ships inert and is switched on once a preview
   deployment has been signed into successfully. Unsetting the variable is the
   way back if anything goes wrong — no redeploy, no revert.

   If HUB_GATE is on and SUPABASE_JWT_SECRET is missing, it fails OPEN and logs
   loudly. A misconfigured secret would otherwise refuse everyone including the
   people who could fix it, and an outage of the whole hub is a worse failure
   than a day of the exposure this closes.
   ═══════════════════════════════════════════════════════════════════════════ */

/* No `config.matcher`, deliberately.

   It was ["/((?!_vercel|_next/static).*)"] — a negative-lookahead pattern,
   which is a Next.js convention. This is not a Next.js project, and after two
   deploys with HUB_GATE=on the site was still answering every request, with no
   way from outside to tell whether the matcher was excluding everything or the
   middleware was not running at all.

   With no matcher, every request reaches the function and the exclusions are
   made below in code, where they are plain to read and cannot be silently
   misparsed. */

/* What the two sign-in pages need to render and run. Anything not here
   requires a session — including every other page, script and photograph.

   Taken from the <script> and <link> tags of login/index.html and
   pm/signin.html rather than written from memory: a missing entry means the
   sign-in page cannot load, which is the one failure that cannot be recovered
   from inside the app.

   The PM Hub is the same deployment on another host, where vercel.json rewrites
   /signin to /pm/signin. Middleware sees the un-prefixed path, so both spellings
   are listed. */
const OPEN = new Set([
  "/login",
  "/login/",
  "/login/index.html",
  "/login/login.css",
  "/js/login.js",
  "/js/shared.js",
  "/shared/js/config.js",
  "/shared/js/hub-access.js",
  "/shared/js/data-service.js",
  "/favicon.svg",

  // PM Hub sign-in, on its own host and on this one.
  "/signin",
  "/signin.html",
  "/pm/signin",
  "/pm/signin.html",
  "/css/app.css",
  "/pm/css/app.css",
  "/js/shell.js",
  "/pm/js/shell.js",
]);

/** The cookie the browser sets alongside its own copy of the session. */
const COOKIE = "ss_gate";

function b64urlToBytes(s) {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodePayload(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

/** The token, or null. Null covers every kind of wrong: malformed, forged,
    signed with another key, or simply expired. */
async function validSession(token, secret) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify(
      "HMAC", key, b64urlToBytes(parts[2]), enc.encode(parts[0] + "." + parts[1]));
    if (!ok) return null;
    const payload = decodePayload(parts[1]);
    // A token with no expiry is not a session; the anon key is exactly that,
    // signed with the same secret and valid until 2036, so this is what stops
    // it being handed in as one.
    if (!payload || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 <= Date.now()) return null;
    if (payload.role === "anon") return null;
    return payload;
  } catch {
    return null;
  }
}

function wantsHtml(request) {
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Vercel's own internals, which the matcher used to exclude.
  if (path.startsWith("/_vercel") || path.startsWith("/_next/")) return;

  /* A probe, so "is the gate running?" is answerable from outside.
     Reports the switch and whether the secret is present — never its value,
     and nothing about any person. Answering before the HUB_GATE check is the
     point: it has to speak while the gate is off, because "off" is one of the
     answers it exists to give. */
  if (path === "/__gate") {
    return new Response(
      "gate=" + (process.env.HUB_GATE === "on" ? "on" : "off") +
      " secret=" + (process.env.SUPABASE_JWT_SECRET ? "present" : "missing"),
      { status: 200, headers: { "content-type": "text/plain; charset=utf-8",
                                "cache-control": "no-store" } });
  }

  if (process.env.HUB_GATE !== "on") return;              // inert until switched on

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    // Fail open, loudly. See the header: refusing everyone because a variable
    // is missing locks out the people who would fix it.
    console.error("[gate] HUB_GATE=on but SUPABASE_JWT_SECRET is not set — passing everything through");
    return;
  }

  if (OPEN.has(path)) return;

  const token = request.cookies.get(COOKIE)?.value;
  if (await validSession(token, secret)) return;

  /* A page gets sent to sign in, with where it was headed so it can be
     returned there. Anything else — a script, a stylesheet, a photograph —
     gets a flat 401: redirecting an <img> to an HTML page just produces a
     broken image and a confusing network tab. */
  if (wantsHtml(request)) {
    const to = new URL(path.startsWith("/pm/") || path === "/signin" ? "/signin" : "/login/index.html", url);
    to.searchParams.set("next", path + url.search);
    return Response.redirect(to, 302);
  }
  return new Response("Sign in required.", {
    status: 401,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
