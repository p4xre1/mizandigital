# Algorithm and Rule Protection — Mizan.page

Status: working document, last reviewed 2026-10-09.
Scope: which rules, weights, and thresholds the platform computes, where they run, and what a visitor
can read in the static bundle.

> **What this document does not claim.** Nothing in the browser can be made tamper-proof or secret.
> Any code the browser runs can be read, copied, and modified there. Protection here means:
> (a) secrets and authority stay on the server, and (b) operational rules stay out of publicly
> reachable bundles where feasible. Client-side checks are UX and are never authorization.

## 1. Classification

| Class | Meaning | Allowed location | Rule |
|---|---|---|---|
| **Class 1: Public** | Meant for anyone. Educational content, public rules that are already documented, open-source-style heuristics with no tuning value. | Browser bundle, static files, repo | No secret. Keep accessible for SEO and users. |
| **Class 2: Operational** | Not a secret, but it helps an attacker evade or tune around the control: thresholds, weights, rule lists, blocked phrases. | Server only (`functions/`), or a bundle that is not publicly fetchable. Admin-only chunks are **not** a protection, because the file URL is public. | Must not appear in any `dist/` chunk that a visitor can load, unless it is explicitly accepted as Class 1 below. |
| **Class 3: Secret or personal** | Credentials, service-role keys, webhook secrets, salts, personal data. | Server only, behind server auth and RLS | Never in `src/`, `shared/` imported by the client, or `dist/`. |

Acceptance check for Class 2 and 3 is a literal search over `dist/` (section 5).

## 2. Inventory

| Module or rule | Purpose | Class | Where it runs | Bundle exposure (measured on `dist/`, 2026-10-09) | Status |
|---|---|---|---|---|---|
| `shared/help/guardrails.js` (injection, social-engineering, obfuscation screens) | Screens AI-assistant input | 2 | Server: `functions/api/help/chat.js`, `functions/api/admin/help/preview.js` | Literals `obfuscated_payload` and `social_engineering` appear in **no** JS file in `dist/` | **Done.** Admin preview and validation moved server-side (commit `4dde465`). |
| `shared/help/pipeline.js` (answer selection) | Produces assistant answers | 2 | Server only | No match in `dist/` | Done |
| `shared/help/cms.js` validators (`validateQaDraft`, `validateSettingsDraft`) | Admin form checks | 2 | Server: `functions/api/admin/help/validate.js` | Not imported by any page | **Done.** The admin page calls the server. |
| `shared/help/cms-constants.js` (length caps, default reply texts) | Shared limits and defaults | 1 | Client and server | Defaults are the public assistant replies, so this is Class 1 by content | Accepted. Contains no rule logic. |
| `shared/security/signup-risk.js` (sign-up risk scoring: weights, velocity bands) | Scores sign-up abuse | 2 | Server: `functions/api/account/signup-risk.js` | Rule names (`disposable_email_domain`, `ip_daily_velocity`) absent from `dist/`. The client wrapper `src/lib/security/signupRisk.ts` only calls the endpoint. | Good. Keep the scorer server-only. Open: a Supabase "before user created" hook is not implemented (see `docs/algorithms-signup-risk-and-law-drop.md`). |
| `shared/billing/risk.js` (`RISK_RULES`, decline-code sets, lock and card-testing thresholds) | Payment risk heuristics | **2** | Imported by the admin `FraudPreventionPage` | **Exposed.** The rule name `amount_high` is in the public chunk `dist/assets/FraudPreventionPage-*.js`. Other rule literals were not checked individually. | **Open.** Recommended: evaluate server-side in a new admin endpoint, then ship no rules to the browser. Separate change, not yet implemented. |
| `shared/laws/drop-publish.js` (PDF-to-law field extraction, duplicate detection) | Admin helper for law uploads | 1 | Imported by admin `LawsPage` | Date and parsing literals appear in the admin chunk | Accepted as Class 1. It only parses the admin's own file and holds no tuning value. Revisit if duplicate or publish rules become abuse controls. |
| `shared/laws/citations.js` and `scripts/check-law-citations.mjs` | Legal citation audit | 1 | Repo script, build-time | Not in the bundle | Accepted |
| `shared/learning/*`, quiz scoring | Quiz and review logic | 1 for the quiz content, **2 for any server-authoritative score** | Client today | Quiz scoring and XP are computed in the browser | **Open decision.** Whether XP and credits should become server-authoritative is pending a user decision. Until then, do not describe them as protected. |
| Stripe, Supabase service-role, Turnstile secret, `IP_HASH_SALT`, webhook secret | Credentials and salts | 3 | Server env only | Scan of `dist/` for `sk_live_`, `sk_test_`, `service_role`, `whsec_`, and the salt and secret names found **no values**. Only documentation text naming variables matched (`LimitsMonitoringPage`, `policies`, `privacy.html`). | Good. Re-run the scan after each build. |

## 3. Decisions

1. **Admin chunks are not a protection boundary.** A file under `/assets/` is reachable by anyone who
   knows its name. Moving a rule into an admin-only page only changes which page imports it.
   So Class 2 rules must run on the server, or be removed from the bundle.
2. **Shared modules are split by audience.** `cms-constants.js` (Class 1, safe for the client) is
   separate from `cms.js` (Class 2 validators). Client code may import only the first.
3. **Server endpoints re-check and re-run the logic.** The help-assistant admin endpoints require
   `requireAdmin`, use per-admin rate limits, and cap body size. They return results and never the
   rule source.
4. **Reasons are kept server-side.** The public chat endpoint does not return the internal `reason`
   code. Only the admin preview returns it.

## 4. Open items

- **`billing/risk.js` server-side move (Class 2, exposed).** Implement as a separate change: admin
  endpoint `POST /api/admin/billing/risk` that loads the inputs and returns only the decision. Then
  remove the `shared/billing/risk.js` import from `FraudPreventionPage.tsx`. Needs test coverage
  and a decision on the response shape. **Not implemented in this pass.**
- **`drop-publish.js`** is accepted as Class 1 for now. Re-classify if it starts gating publication.
- **XP and credits** (quiz and learning progress) are not server-authoritative. Needs a user decision.
- **Signup-risk Supabase hook** is not configured. Needs dashboard access and a decision.
- The bundle checks below run only on a local build. They have **not** been run against production.

## 5. How to verify (local build)

```bash
npm run build
# Class 2 literals must not appear in any JS file the visitor can load (exclude known-accepted ones):
grep -l "amount_high" dist/assets/*.js                                  # currently: FraudPreventionPage (open item)
grep -l "obfuscated_payload\|social_engineering" dist/assets/*.js        # expected: none
# Class 3 values must not appear (names in documentation text are acceptable):
grep -l -E "sk_live_|sk_test_|whsec_" -r dist --include=*.js --include=*.html   # expected: none
# No source maps shipped:
find dist -name "*.map" | wc -l                                          # expected: 0
```

Automated coverage:

- `tests/admin-chunk-no-rules.test.ts`: the admin help page and its shared constants do not import
  the rule modules, and the built admin chunk contains no help-rule literal.
- `tests/admin-help-endpoints.test.ts`: the admin validate and preview endpoints reject anonymous and
  non-admin callers, cap input, and return no internal stack or config.

## 6. Limits

- Anyone who can run the client code can read Class 1 and Class 2 logic that ships to the browser.
- Thresholds are visible to any attacker who tests the live service. Rate limits and abuse controls
  are best effort when `RATE_LIMIT_KV` is not bound (see `docs/security-threat-model.md`, section 8).
- Obfuscation is not a control. It is not used here and should not be added as a substitute for
  moving logic server-side.
