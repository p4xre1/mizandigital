# Incident Response — Mizan.page

This is a working runbook. It assumes a small team. Names, phone numbers, and contact addresses are **placeholders** and must be filled in by the owner before the document is relied on.

| Role | Name / contact |
|---|---|
| Incident lead | `[TO FILL]` |
| Database owner (Supabase project) | `[TO FILL]` |
| Hosting owner (Cloudflare Pages/Workers, R2, KV) | `[TO FILL]` |
| Payments owner (Stripe) | `[TO FILL]` |
| Repository owner (GitHub) | `[TO FILL]` |
| Legal / data-protection contact | `[TO FILL]` |

## 1. Severity

- **SEV-1**: confirmed exposure of personal data, payment data, or service-role credentials; or the site serving malicious code.
- **SEV-2**: a control is bypassed but no data is confirmed exposed; or abuse causing cost or outage.
- **SEV-3**: a weakness with no known exploitation (for example, a dependency advisory).

## 2. First hour

1. Open an incident record (date, time in Africa/Casablanca, reporter, what was seen). Do not paste secrets into it.
2. Assign the incident lead. Keep one channel for coordination.
3. Preserve evidence: export relevant logs before they rotate. Do not edit production rows to "fix" evidence.
4. Decide on containment (section 3) within the hour, even if the cause is unknown.

## 3. Containment options (choose the smallest that works)

| Situation | Action | Reversible? |
|---|---|---|
| Suspected leaked service-role key | Rotate `SUPABASE_SERVICE_ROLE_KEY` in the Supabase dashboard; update the Cloudflare Pages secret; redeploy | Rotation is one-way; plan the redeploy window |
| Suspected leaked R2 key | Create new R2 API token, revoke old, update `R2_*` secrets | One-way |
| Suspected leaked Stripe webhook secret | Roll the endpoint secret in Stripe; update `STRIPE_WEBHOOK_SECRET` | One-way |
| Suspected leaked Turnstile secret | Rotate in Cloudflare; update `TURNSTILE_SECRET_KEY` | One-way |
| Suspected leaked translation API key | Rotate at the provider; update `LIBRETRANSLATE_API_KEY` | One-way |
| AI assistant abuse or social engineering at scale | Remove or change `HELP_ALLOWED_ORIGINS`; disable help via CMS settings; confirm `HELP_ALLOW_MEMORY_LIMITER` is not set | Reversible |
| Abusive comments | Use the comments moderation tools; tighten the anti-abuse trigger if needed | Reversible |
| Translate cost abuse | Lower the rate-limit constants in `functions/api/translate.js` and redeploy; or disable the route | Reversible |
| Database exposure through a view or policy | Apply a narrowing migration (never a data-deleting one). Rollback steps are at the bottom of each migration | Forward-only fix is preferred |
| Compromised admin account | Disable the user in Supabase Auth; revoke sessions; review `audit_logs` | Reversible |
| Compromised CI or GitHub token | Revoke the token in GitHub; review recent workflow runs; check branch protections | Reversible |

**Do not** delete user rows, delete migrations, or force-push over history to hide an event.

## 4. Investigation

- **Logs**: Cloudflare Pages/Workers logs (`[scope] …` lines from `logServerError`; the AI assistant emits `logSecurityEvent` with `requestId` and a hashed user id). Supabase logs for auth and PostgREST. Stripe event log for billing.
- **Database**: check `audit_logs`, `pending_deletions`, `payments`, and recent `reactions` changes, using the service role in a read-only session.
- **Scope**: which tables, which users, which time range. Count affected rows; do not export personal data beyond what the investigation needs.
- **Cause**: map to a control in `docs/security-controls-matrix.md`. If none applies, add a new row.

## 5. Eradication and recovery

1. Fix the cause with the smallest change. Add a regression test where possible.
2. Run the checks in `docs/security-testing.md` section 1.
3. Deploy. Verify the live behavior that was affected (the NOT RUN list is a starting point).
4. Keep the containment in place until the fix is verified.

## 6. Notification

- Decide with the legal contact whether personal-data notification is required. Morocco's personal-data law is Law 09-08, enforced by the CNDP. **Confirm current obligations with counsel**; this document does not state them.
- Inform affected users only after the facts are confirmed and the legal contact has approved the wording.
- Do not publish exploit details until the fix is live.

## 7. After the incident

- Write a short post-incident note: timeline, impact, cause, fix, follow-ups. Keep secrets out of it.
- Update `docs/security-threat-model.md` and `docs/security-controls-matrix.md`.
- Add a test that would have caught the issue.

## 8. Useful locations

- Migrations: `supabase/migrations/` (rollback steps at the bottom of each security migration).
- Headers: `public/_headers`.
- Error helper: `functions/_shared/errors.js`.
- Body limits: `functions/_shared/bodyLimit.js`.
- Help assistant controls: `functions/_shared/helpSecurity.js`, `functions/api/help/chat.js`.
