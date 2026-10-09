# Security Controls Matrix — Mizan.page

Status legend:
- **FIXED-TESTED**: code or migration changed, and an automated test covers it.
- **FIXED-STATIC**: changed, checked by reading or by a static test only.
- **VERIFIED-DESIGN**: existing control reviewed; behavior not re-tested in this pass.
- **OPEN**: known issue, not fixed here.
- **NOT RUN**: needs a live environment or authorization. The command is given.

"Not applied" means the migration exists in git but has not been run on any database by this work.

## Database (Supabase)

| ID | Finding | Control | Status | Evidence |
|---|---|---|---|---|
| DB-01 | Views `pending_deletions`, `orphaned_billing`, `unattached_credit_grants` owned by postgres without `security_invoker`; `authenticated` could read other users' emails and payment rows through them | `ALTER VIEW … SET (security_invoker = true)`; revoke from PUBLIC/anon/authenticated; grant SELECT to service_role | FIXED-TESTED (migration not applied) | `supabase/migrations/20261010000000_security_hardening_db.sql`; `tests/security-db-policies.test.ts` (PGlite, before and after) |
| DB-02 | Policy `reactions_user_delete` with `USING (true)` let any client delete any reaction | Drop the policy; admin keeps `reactions_admin_all` | FIXED-TESTED (not applied) | Same migration; PGlite test |
| DB-03 | SECURITY DEFINER functions without pinned `search_path` | `ALTER FUNCTION … SET search_path = public, pg_temp` for five functions | FIXED-TESTED (not applied) | Migration; PGlite test checks config |
| DB-04 | `anon` held ALL on `profiles` and `audit_logs` (RLS limited rows, but the grant was excess) | `REVOKE ALL … FROM anon` | FIXED-TESTED (not applied) | Migration; PGlite test. Checked: `profiles` reads by the client happen only after sign-in (`AuthProvider.loadAdminFlag`) |
| DB-05 | `mizan_profiles_public_read` is public by design (`is_public = true`) | Intentional. Not changed | VERIFIED-DESIGN | Migration `20260914000000` |
| DB-06 | Migration `20260926000000` (account deletion RPC) reported as not applied on the live database | None in this work | OPEN (live state unknown) | Stated in code comments in `functions/api/account/delete.js`; not checked live |
| DB-07 | RLS-audit script flagged `AS` as a table (false positive from `CREATE TABLE … AS`) | Noted | Closed (false positive) | Not reported as a finding |

Apply order for the pending migrations is in `docs/security-deployment-checklist.md`.

## API (Pages Functions)

| ID | Finding | Control | Status | Evidence |
|---|---|---|---|---|
| API-01 | Error responses included upstream text or `e.message` (account delete/restore, billing webhook, quiz submit, R2 delete/presign) | Responses are generic; details go to `logServerError` with scrubbing | FIXED-TESTED | `functions/_shared/errors.js`; `tests/security-hardening.test.ts`; `tests/soft-delete.test.ts` (the 503 body no longer exposes the migration id) |
| API-02 | Request bodies read fully before size check (`readJsonBody`, `request.json()`), so chunked bodies without `Content-Length` could be buffered | Streamed byte-capped reader; `readJsonBody` now uses it; quiz submit, R2 presign, R2 delete use it | FIXED-TESTED | `functions/_shared/bodyLimit.js`; `tests/security.test.ts`; `tests/security-hardening.test.ts` |
| API-03 | `translate.js` body cap is 256 KB while `MAX_TEXTS=400` × `MAX_TEXT_CHARS=8000` allows about 3.2 MB of text. Full-size requests would get 413 | Left unchanged to avoid changing behavior in a security pass | OPEN (functional mismatch) | `functions/api/translate.js` lines 34–36, 174 |
| API-04 | Translate endpoint can generate external provider cost (up to 400 texts per request, 60 requests per 10 min per IP) | Per-IP rate limit, text caps | OPEN (cost risk, not a confidentiality issue) | Reviewed |
| API-05 | Rate-limit fallback is per worker when `RATE_LIMIT_KV` is unbound | Operator must bind KV | OPEN (configuration) | `functions/_shared/guard.js` |
| API-06 | Public MCP and markdown endpoints send `Access-Control-Allow-Origin: *` | Intentional: public content only | VERIFIED-DESIGN | `functions/[[path]].js` |
| API-07 | Billing checkout routes | Return 410 | VERIFIED-DESIGN | Reviewed |
| API-08 | Stripe webhook: signature check and replay lock; no acknowledge without service key | Existing | VERIFIED-DESIGN, webhook test in repo | `functions/api/billing/webhook.js` |
| API-09 | Comments endpoint: honeypot, time gate, Turnstile when configured, DB guard trigger | Existing | VERIFIED-DESIGN; XSS review NOT COMPLETED | `functions/api/comments.js`, migration `comments_anti_abuse_guard` |
| API-10 | Comments XSS in the UI, `signup-risk` business logic, storage policies, CORS on all functions | Not reviewed | OPEN (not assessed) | See threat model section 6 |

## Headers and browser

Note: `public/_headers` is **unchanged** in this branch compared with its base commit `6a345c7`. The controls below were already present. This work adds regression tests (`tests/security-hardening.test.ts`) that read the file, so a later edit that weakens them fails CI.

| ID | Finding | Control | Status | Evidence |
|---|---|---|---|---|
| WEB-01 | CSP must not allow `unsafe-eval` | Present in base; regression test | VERIFIED-STATIC (pre-existing) | `tests/security-hardening.test.ts` |
| WEB-02 | `object-src 'none'` | Present in base; regression test | VERIFIED-STATIC (pre-existing) | Same test |
| WEB-03 | `frame-ancestors` restricted | Present in base (`'self'`); regression test | VERIFIED-STATIC (pre-existing) | Same test |
| WEB-04 | HSTS | Present in base; regression test | VERIFIED-STATIC (file only) | Same test; live header NOT RUN |
| WEB-05 | Trusted Types directive broke React 18 rendering | Removed in base, with an explanation in `_headers` | VERIFIED-DESIGN | `public/_headers` comments |
| WEB-06 | Build-time CSP hashes must match the bundle | Build checks; `dist/_headers` generated with the hash | VERIFIED-DESIGN | `npm run build` output `[csp-hashes] ✓` |
| WEB-07 | Legacy service worker | Only retires caches and unregisters; caches nothing | VERIFIED-DESIGN | `public/sw.js` |
| WEB-08 | Live headers (HSTS, CSP, frame-ancestors) | Not checked against production | NOT RUN | `curl -sI https://www.mizan.page/` |

## Secrets

| ID | Finding | Control | Status | Evidence |
|---|---|---|---|---|
| SEC-01 | Secret patterns in `src`, `shared`, `public`, `dist` | Static scan test | FIXED-STATIC (passes) | `tests/security-hardening.test.ts` |
| SEC-02 | Anon JWT in `src/lib/supabase/client.ts` and `scripts/lib/cms-content.mjs` | Public by design (anon role, RLS). Not a secret | VERIFIED-DESIGN | Reviewed |
| SEC-03 | `VITE_` variables must never hold secret values | Grep review: no secret names with `VITE_` prefix | VERIFIED-DESIGN | `git grep` review |
| SEC-04 | Scrubber for logs (JWT, Bearer, Stripe-style keys, secret-looking key=value) | `scrub()` in `errors.js` | FIXED-TESTED | `tests/security-hardening.test.ts` |

## CI and supply chain

| ID | Finding | Control | Status | Evidence |
|---|---|---|---|---|
| CI-01 | Five workflows lacked top-level `permissions:` (default token scope) | Added to `ci`, `codeql`, `dependency-audit`, `geo-audit`, `seo-audit`. `refresh-content` already had `contents: write` in base and keeps it for its commit | FIXED-TESTED | `tests/security-hardening.test.ts`; YAML parsed |
| CI-02 | Third-party actions referenced by mutable tags | Pinned to commit SHAs (`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`, `github/codeql-action/{init,analyze}`) | FIXED-TESTED | Static test enforces 40-hex pins |
| CI-03 | Dev dependencies: 8 advisories (4 high, 4 moderate): `vitest`, `wrangler`, `miniflare`, `sharp` (dev), `undici`, `source-map-js`, `smol-toml`, `@vitest/mocker` | Not upgraded in this pass (major-version changes). Production audit is 0 | OPEN | `npm audit --json` (dev included). Build and test tooling only, not shipped to visitors |
| CI-04 | `pull_request_target` misuse | None present | FIXED-TESTED (static) | `tests/security-hardening.test.ts` |
| CI-05 | Production dependency audit | 0 vulnerabilities | VERIFIED | `npm audit --omit=dev` |

## AI help assistant

| ID | Finding | Control | Status | Evidence |
|---|---|---|---|---|
| AI-01 | Anonymous use would drain quota | Login required; daily quota per user | FIXED-TESTED | `tests/help-chat-endpoint.test.ts` |
| AI-02 | Cross-origin use | Origin gate with `HELP_ALLOWED_ORIGINS` | FIXED-TESTED | `tests/help-chat-security.test.ts` |
| AI-03 | Prompt injection, markup, scripts in questions | Screening before the model or retrieval; markup rejected in admin content | FIXED-TESTED | `tests/help-security.test.ts`, `tests/help-social-engineering.test.ts` |
| AI-04 | Social engineering (impersonation, fake authority, other users' data, roleplay) | Refusal and stop; 3 strikes per hour lockout when KV is bound | FIXED-TESTED. Lock thresholds are a design choice | `tests/help-social-engineering.test.ts` |
| AI-05 | Lockout bypass when `HELP_ALLOW_MEMORY_LIMITER=1` | The memory option disables the lockout. Operator choice | OPEN (accepted, document in deployment) | `functions/api/help/chat.js` |
| AI-06 | Unsafe output | Output sanitizer and refusal | FIXED-TESTED | `tests/help-security.test.ts` |
| AI-07 | Model-based answers | None yet: retrieval-only, no LLM key. Re-assess before adding a model | VERIFIED-DESIGN | `docs/ai-security.md` |

## Not started or not in scope

- Penetration test: not performed.
- Load or abuse testing against production: not performed (NOT RUN; not authorized).
- Certification of any kind: none. This matrix is a measured internal record, not an external assurance.
