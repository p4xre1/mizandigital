# Security Threat Model — Mizan.page

Status: working document, branch `arena/682d28e7-mizandigital`.
Scope: the public website, the Cloudflare Pages Functions in `functions/`, the Supabase database (`supabase/migrations/`), the admin CMS under `/admin`, the AI help assistant, and the CI workflows in `.github/workflows/`.

This document does **not** claim the platform is fully secure. It lists assets, actors, trust boundaries, and the threats we considered, and it points to the controls and to what is still open. See `docs/security-controls-matrix.md` for the status of each control.

## 1. System summary

| Layer | Technology | Where it runs |
|---|---|---|
| Static site | Vite + React, prerendered HTML | Cloudflare Pages (`dist/`) |
| Server endpoints | Pages Functions (`functions/`) | Cloudflare Workers runtime |
| Database and auth | Supabase (Postgres, RLS, Auth) | Supabase project |
| Uploads | Cloudflare R2, presigned PUT | R2 bucket |
| Rate-limit store | Cloudflare KV (`RATE_LIMIT_KV`), optional | Cloudflare |
| Bot check | Cloudflare Turnstile (optional on some endpoints) | Cloudflare |
| Payments | Stripe webhook (checkout routes return 410) | Stripe → `functions/api/billing/webhook.js` |
| Translation | Lingva / LibreTranslate via `functions/api/translate.js` | External providers |

Browser code runs with the public Supabase anon key only. That key is public by design and is protected by RLS.

## 2. Assets

1. **Personal data of users**: email, names, profile rows (`profiles`, `mizan_profiles`), deletion requests, billing rows (`payments`, grants).
2. **Credentials and server secrets**: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `R2_*` keys, `TURNSTILE_SECRET_KEY`, `IP_HASH_SALT`, `LIBRETRANSLATE_API_KEY`. None of these may appear in `src/`, `shared/`, `public/`, `dist/`, or git history.
3. **Admin capability**: CMS writes, user administration, R2 deletion.
4. **Integrity of content**: articles, quizzes, help-assistant Q&A. Content is served to everyone, so tampering affects every visitor.
5. **Availability**: the site, paid quota of external translation providers, Supabase and R2 quotas.
6. **Brand and SEO trust**: a defaced or redirect-hijacked page harms users and rankings.

## 3. Actors

| Actor | Trust level | Typical capability |
|---|---|---|
| Anonymous visitor | Untrusted | Reads public content, posts comments, uses quiz, uses translate |
| Authenticated user | Low trust | Own profile, own deletion request, help assistant (login required) |
| Admin / editor | High trust, still bounded by RLS and `requireAdmin` | CMS, R2 upload/delete |
| Attacker with a stolen user session | Untrusted | Same as the user whose session was taken |
| Attacker on the network | Untrusted | Observes or modifies traffic if TLS or HSTS fail |
| Malicious content author | Untrusted | Injects markup through CMS fields |
| Automated scraper / bot | Untrusted | High-volume reads, form spam, AI-assistant abuse |
| Social engineer (in chat) | Untrusted | Impersonation, fake authority, requests for other users' data, prompt injection |
| Supply-chain attacker | Untrusted | Malicious npm package, compromised GitHub Action tag |

## 4. Trust boundaries

1. **Browser ↔ Pages Functions** (any `/api/*` request). All input is validated server-side. Client-side checks are only UX.
2. **Functions ↔ Supabase**. Functions use the user's JWT (RLS applies) or the service role (RLS bypassed). Service-role use is listed in section 7.
3. **Database ↔ views and SECURITY DEFINER functions**. Views and functions run with the owner's rights unless `security_invoker` is set and `search_path` is pinned. See DB-01 to DB-04.
4. **Functions ↔ external providers** (Stripe, Lingva/LibreTranslate, Turnstile). Responses are treated as untrusted input.
5. **CI ↔ GitHub**. Workflows hold tokens; third-party actions run with those tokens.
6. **Build ↔ output**. Secrets must not reach the bundle. Build-time CSP hashes are computed from the output.

## 5. Threats and controls (summary)

Each row links to the status table in `docs/security-controls-matrix.md`.

| # | Threat | Main control | Verified how |
|---|---|---|---|
| T1 | Anonymous user reads another user's data through a database view | DB-01: `security_invoker`, revoke from `anon`/`authenticated` | PGlite test, before/after migration |
| T2 | Anonymous user deletes reactions | DB-02: drop `reactions_user_delete` | PGlite test |
| T3 | Search-path hijack of SECURITY DEFINER functions | DB-03: pin `search_path` | PGlite test + migration statement |
| T4 | Anonymous role holds excess privileges on profile/audit tables | DB-04: revoke `anon` ALL | PGlite test |
| T5 | Server error details leak internal state (upstream text, migration names, stack hints) | `functions/_shared/errors.js`; responses no longer include `detail` | Static tests; delete test updated |
| T6 | Memory exhaustion by oversized or chunked request bodies | `functions/_shared/bodyLimit.js` (streamed byte limits); `readJsonBody` uses it | Unit tests in `tests/security.test.ts`, `tests/security-hardening.test.ts` |
| T7 | Secrets committed to the repo or bundle | Secret pattern scan over `src`, `shared`, `public`, `dist` | Static test (NOT run against production) |
| T8 | Clickjacking, script injection through weak CSP | `public/_headers` (already in base): `frame-ancestors`, `object-src 'none'`, no `unsafe-eval`, HSTS. Regression test added | Static test on the file; live headers NOT RUN |
| T9 | Supply-chain compromise via CI actions | Workflow `permissions:` set to read-only; third-party actions pinned to SHAs | Static test enforces both |
| T10 | Social engineering of the AI assistant (impersonation, fake authority, prompt injection, off-topic) | Input screening, output sanitizer, refusal, strike lock | `tests/help-*.test.ts` |
| T11 | AI assistant abused for cost (many requests) | Login, per-user daily quota, per-IP limit, fail-closed when no shared store | `tests/help-chat-endpoint.test.ts` |
| T12 | Translation endpoint used as free quota for others | Per-IP rate limit (60 per 10 min); body and text caps | Reviewed, not load-tested. **Open: cost risk** |
| T13 | Bot spam on comments | Honeypot, minimum fill time, Turnstile when configured, DB guard trigger | Existing tests; live NOT RUN |
| T14 | Forged Stripe webhook / replayed events | Signature check and replay lock | Reviewed; webhook tests exist. Live NOT RUN |
| T15 | Open redirect through `public/_redirects` | Redirect targets are relative paths | Reviewed the target format |
| T16 | Caching of private responses | API responses use `Cache-Control: no-store`; service worker only retires old caches | Reviewed code |

## 6. Out of scope or not yet assessed

These were **not** fully reviewed in this pass. Do not assume they are safe.

- Comment authorization and output escaping in the comments UI (XSS review not completed).
- `signup-risk` business logic beyond body handling.
- Storage bucket policies in Supabase (`storage.objects`).
- CORS posture of every function in `functions/` (only `[[path]].js` and `translate.js` were reviewed).
- Admin UI authorization beyond the server checks (`requireAdmin`) and RLS.
- Dependency vulnerabilities in dev tooling (see `docs/security-controls-matrix.md`, item CI-03).
- Physical, staff, and account-recovery processes at the hosting providers.
- Live production configuration: no production test was run or authorized.

## 7. Known privileged paths

- `functions/api/billing/webhook.js` uses `SUPABASE_SERVICE_ROLE_KEY` to write payment rows. It verifies the Stripe signature before acting.
- `functions/_shared/helpConfig.js` uses the service role to read help-assistant rules on the server. The browser never receives it.
- Admin R2 endpoints (`functions/api/r2/*.js`) use `requireAdmin` and R2 credentials.
- SECURITY DEFINER functions in migrations (see DB-03) run with owner rights.

## 8. Residual risks (accepted for now)

- If `RATE_LIMIT_KV` is not bound, rate limits fall back to an in-memory store per worker. Limits are best effort then.
- If `HELP_ALLOW_MEMORY_LIMITER=1` is set, the AI assistant runs without a shared store and **without the strike lockout**. This is an explicit operator choice.
- The translation endpoint can still generate provider cost within its per-IP limit.
- Users behind shared IPs can share rate-limit budgets.
- A single compromised admin account can change CMS content for all visitors.

## 9. Review triggers

Update this model when any of these change: a new table or view, a new function that uses the service role, a new external provider, a new upload type, a new CI action, or a change to the AI assistant's inputs or tools.
