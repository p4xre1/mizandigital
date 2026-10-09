# Security Architecture — Mizan.page

This describes the security-relevant structure of the platform as it exists on branch `arena/682d28e7-mizandigital`. Read `docs/security-threat-model.md` first.

## 1. Principles

1. **The browser is never trusted.** Every write, quota, and privilege decision is made on the server or in the database.
2. **Defense in depth.** A control at the edge (headers, body limits) does not replace RLS, and RLS does not replace input validation.
3. **Fail closed for new security features.** The help assistant refuses when its config, origin, or shared limiter is missing. Other older endpoints keep their existing fallbacks; see section 6.
4. **Keep it small and reversible.** Migrations add or tighten; they do not delete data. Rollback steps are written at the bottom of each migration.

## 2. Request paths

### 2.1 Static pages
Vite builds HTML, CSS, and JS into `dist/`. `scripts/` generates the CSP hashes and `dist/_headers` at build time. The build fails if the policy does not match the bundle.

### 2.2 `functions/[[path]].js` (catch-all)
Serves routing, MCP and markdown responses (public content, `Access-Control-Allow-Origin: *` by design), and the 404 shell. Responses set `Cache-Control` explicitly.

### 2.3 `functions/api/*`
Every endpoint follows the same order:
1. Method check.
2. Rate limit (`checkRateLimit`, `functions/_shared/guard.js`). KV-backed when `RATE_LIMIT_KV` is bound; otherwise per-worker memory.
3. Bounded body read (`readBoundedJson` / `readBoundedText` in `functions/_shared/bodyLimit.js`, or `readJsonBody`, which now uses the same streamed reader).
4. Shape validation of the parsed body.
5. Auth: `requireAdmin` for admin routes, a verified Supabase JWT for user routes, Stripe signature for the webhook.
6. Database call with the least privilege that works (user JWT where possible).
7. Error response. Internal detail goes to `logServerError` (`functions/_shared/errors.js`), which scrubs tokens and secrets before logging. Clients get a generic message.

### 2.4 AI help assistant (`functions/api/help/chat.js`)
Layers, in order: origin gate (`helpSecurity.js`, `HELP_ALLOWED_ORIGINS`), shared limiter required (KV or explicit memory opt-in), login and account-status check, per-IP limit, per-user daily quota, strike lock, bounded body, input screening (scripts, markup, prompt-injection and social-engineering patterns, off-topic, non-Arabic), retrieval from CMS-controlled Q&A only, output sanitizer, and an audit event for each refusal. The assistant answers only from site content and does not give legal advice. Details: `docs/ai-security.md`.

### 2.5 Uploads (R2)
- `presign.js` validates the file type against an allowlist and returns a short-lived presigned PUT URL. Requires admin.
- `delete.js` validates the object key (no traversal, no empty keys) and requires admin.

### 2.6 Billing
Checkout, pro-checkout, and payments creation routes return 410. The webhook verifies the Stripe signature before it writes anything, and it has a replay lock. If the service key is missing, the webhook returns an error instead of acknowledging the event, so Stripe retries.

## 3. Data layer (Supabase)

- **RLS** is the primary control on every table in `public`. Policies are defined in migrations.
- **Views** must use `security_invoker = true` so that they respect the caller's RLS. Migration `20261010000000` fixes three views that did not (DB-01).
- **SECURITY DEFINER functions** must pin `search_path` (DB-03).
- **Grants** follow least privilege. `anon` should hold no table privileges on sensitive tables (DB-04). Service role is used only for server-side paths listed in the threat model, section 7.
- **Deletes** from user-facing tables are not allowed through the anon or authenticated roles unless a policy says so (DB-02).

## 4. Browser security headers

`public/_headers` sets, among others:
- `Strict-Transport-Security` (HSTS).
- `Content-Security-Policy` with `script-src 'self'` plus a hash for the one inline theme script. No `unsafe-eval`, no `unsafe-inline` for scripts, `object-src 'none'`, `frame-ancestors` restricted, `base-uri` restricted. `style-src` keeps `'unsafe-inline'` because React sets some `style=` attributes at runtime; this is documented in the file.
- `Trusted Types` is not enforced. React 18 creates `<script>` elements through `innerHTML`, which would break rendering without a default policy. Adding Trusted Types needs that policy first.

The live response headers have **not** been verified (see `docs/security-testing.md`, NOT RUN list).

## 5. CI and supply chain

- Every workflow in `.github/workflows/` declares top-level `permissions:`. Most are `contents: read`. `codeql.yml` adds `security-events: write` so results can upload. `refresh-content.yml` keeps `contents: write` because it commits generated content.
- Third-party actions are pinned to commit SHAs with the tag in a comment. A static test fails if a new `uses:` is not pinned.
- Dependency audit: production dependencies had 0 known vulnerabilities at the time of this work. Dev dependencies have 8 (see controls matrix, CI-03).
- The repository must not use `pull_request_target` with checkout of untrusted code. A static test checks this.

## 6. Known gaps in the architecture

- Without `RATE_LIMIT_KV`, limits are per worker and best effort.
- `translate.js` still caps request bodies at 256 KB although its text limits allow more. Behavior is unchanged in this pass (see controls matrix, API-03).
- Some endpoints rely on RLS and the Supabase JWT, not on a server-side check. Each new endpoint needs a review against `docs/security-threat-model.md`.
- The admin UI relies on server checks and RLS; a UI-only check is not a control.

## 7. Client bundle boundary

What may be in `dist/` (the browser-visible build), by class (see `docs/security-algorithm-protection.md`):

- **Class 1 (public):** UI code, public educational content, and shared constants with no rule logic
  (`shared/help/cms-constants.js`).
- **Class 2 (operational rules):** must run on the server (`functions/`). The help-assistant
  guardrails and pipeline are server-only. Admin pages call server endpoints, such as
  `/api/admin/help/validate` and `/api/admin/help/preview`, instead of importing rule modules.
- **Class 3 (secrets and personal data):** never in the bundle. Service-role keys, webhook secrets,
  and salts are read from server environment variables.

Known exception, open: `shared/billing/risk.js` is imported by the admin `FraudPreventionPage`, so its
rule names are in a public chunk. A server-side move is planned as a separate change.

Storage: the `cv-files` bucket is public today. Migration `20261011000000_cv_files_private_bucket.sql`
makes it private, but it is not applied to any environment yet.

Verification: `tests/admin-chunk-no-rules.test.ts` checks the admin chunk after `npm run build`.
