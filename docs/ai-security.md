# AI Assistant Security — Mizan.page

This covers the site help assistant (`/help`, floating button, `POST /api/help/chat`) and its admin CMS (`/admin`). It describes the controls that exist, how they were tested, and what is not claimed.

## 1. What the assistant is

- Answers questions about **the Mizan.page website only**, in **Arabic only**, from content that an administrator enters in the CMS (Q&A entries, messages, rules).
- **Retrieval only** in the current version: it selects matching CMS entries. **No large language model is connected** and no LLM key is configured.
- Does **not** give legal advice. Its messages say so.
- Requires login. Each user has a daily question quota.

Because there is no model, the main risks are abuse of the endpoint (cost, scraping), social engineering to obtain other users' data or internal information, off-topic use, and unsafe content in admin-entered answers. The controls below address these.

## 2. Request pipeline (`functions/api/help/chat.js`)

In order:
1. **Origin gate** (`checkOrigin`): when a request carries an `Origin` header, it must equal the site origin or be listed in `HELP_ALLOWED_ORIGINS`; otherwise it is refused. Requests without an `Origin` header are not refused by this gate. Login (step 5) still applies to them.
2. **Shared limiter required**: `RATE_LIMIT_KV` must be bound. Without it the endpoint returns 503. The memory fallback is available only if `HELP_ALLOW_MEMORY_LIMITER=1` is set, and that setting also disables the strike lockout (see section 5).
3. **Lockout check**: a user with recent strikes is refused without further processing.
4. **Per-IP limit** (20 requests per 10 minutes), then **daily per-user quota** (20 questions per user per day). Both numbers are design defaults, not confirmed business rules.
5. **Login and account status**: the user's session must be valid, and `profiles.account_status` must be exactly `active`; any other value returns 403 `account_restricted`. If the profile lookup fails, the endpoint returns 503 (fail closed).
6. **Bounded body** and shape validation.
7. **Screening** (`shared/help/guardrails.js`, `functions/_shared/helpSecurity.js`): refuses markup and script-like input, prompt-injection phrases, social-engineering attempts (impersonation, fake authority, requests for other users' data or internals, roleplay tricks, attack intent), off-topic and non-Arabic input.
8. **Strike**: a social-engineering block records a strike. Three strikes in one hour lock the user out for one hour from the last strike. The threshold is a design choice, not a confirmed policy.
9. **Retrieval** from CMS entries only.
10. **Output check** (`shared/help/answer.js`, `sanitizeAnswerResult`): the answer is checked before it is returned, and markup is removed or the answer is replaced with the default refusal message.
11. **Audit events** (`logSecurityEvent`) with a request id and a hashed user id. Raw questions are not logged by this path.

Every refusal returns a fixed message from CMS settings with a safe default.

## 3. Admin CMS controls

- Only admins can edit assistant content (RLS and `requireAdmin`).
- Q&A text, defense phrases, and messages are validated on save. Markup is rejected in admin content.
- A preview uses the same output check as the public endpoint, so an admin sees what a visitor would get.
- Migrations: `20261008000000_help_assistant_cms.sql`, `20261009000000_help_assistant_hardening.sql`. The second is pending on production unless confirmed otherwise. See the deployment checklist.

## 4. Language and scope

- Non-Arabic input is refused. Language detection is a heuristic and can misclassify short or mixed text.
- Off-topic questions are refused with the configured message.
- Legal questions are answered only with the site's own content and a referral to the site. The assistant does not interpret law for a specific case.

## 5. Known limits (be explicit with operators)

- **Memory limiter opt-in** (`HELP_ALLOW_MEMORY_LIMITER=1`): per-worker limits, and **no strike lockout**. Do not use in production.
- **Heuristic screening** can be bypassed by a determined attacker who rewrites the input. The defenses reduce the surface; they do not prove that every attack fails.
- **Retrieval-only** means answers are limited to what the CMS contains. Incorrect CMS content produces incorrect answers.
- **No model evaluation** has been run against adversarial datasets in this work.
- **Cost and scraping**: quotas limit one user, but an attacker with many accounts can still consume resources. Cloudflare bot and rate rules (outside this repository) are needed and are not verified here.
- Users behind shared IPs can share the IP limit.
- The origin gate only applies when the browser sends an `Origin` header. Non-browser clients can omit it; they still need a valid login and count against the quotas.

## 6. Tests

- `tests/help-chat-endpoint.test.ts`: login, quota, Arabic-only, input validation, admin settings, social-engineering block and lockout.
- `tests/help-chat-security.test.ts`, `tests/help-security.test.ts`: origin gate, screening, sanitizer.
- `tests/help-social-engineering.test.ts`: social-engineering phrases and refusal behavior.
- `tests/help-cms.test.ts`, `tests/help-language.test.ts`, `tests/help-assistant.test.ts`: CMS validation, language gate, pipeline.

All of these ran in this branch and passed (see `docs/security-testing.md`). They use mocks for Supabase and KV. **Not run**: the assistant against a real Supabase project, and against a real browser session.

## 7. Operating rules

- Do not connect an LLM without a new review of this document, including prompt-injection tests and data-leak tests with retrieved content.
- Do not add tools (actions that change data or call external services) to the assistant without a threat-model update.
- Do not put personal data into CMS answers.
- Keep the default refusal messages short and do not reveal which rule fired.

## 8. What is not claimed

This is not a certified system, and no certification or external audit exists for it. The controls are defense in depth, measured by the tests above. A determined attacker can still find gaps in the heuristic screening, in the CMS, or in the surrounding infrastructure.
