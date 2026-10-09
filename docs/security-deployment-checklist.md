# Security Deployment Checklist — Mizan.page

Use this before deploying the `arena/682d28e7-mizandigital` changes to production. Tick each item with the date and who checked it. Do not mark an item done based on a test that did not run against the environment it describes.

## A. Before deploying

- [ ] **Backup** the production database (Supabase dashboard backup or `pg_dump` by the database owner). Record the backup id.
- [ ] Review the diff for `public/_headers`, `supabase/migrations/`, `functions/`, `.github/workflows/`.
- [ ] Run locally: `npx vitest run`, `npx tsc --noEmit`, `npm run build`. Record the results. Note that the sandbox build did not reach CMS data.
- [ ] Confirm `npm audit --omit=dev` reports 0 vulnerabilities on the commit you deploy.
- [ ] Confirm no secret values are in the diff: search for `service_role`, `sk_live`, `whsec_`, `eyJ` in changed files.

## B. Database migrations (order matters)

Migrations to apply, in order, if not already applied:
1. `20261008000000_help_assistant_cms.sql`: AI assistant CMS tables.
2. `20261009000000_help_assistant_hardening.sql`: AI assistant hardening.
3. `20261010000000_security_hardening_db.sql`: views `security_invoker`, drop `reactions_user_delete`, pin `search_path`, revoke `anon` on `profiles` and `audit_logs`.

Before running:
- [ ] Check which migrations are already recorded in the database (`supabase migration list` or the `supabase_migrations` table). Note the account-deletion migration `20260926000000`: code comments say it is **not applied** on production. Apply it first if it is still missing; the delete endpoint returns 503 without it.
- [ ] Apply on **staging** first. Run the checks in section C.
- [ ] Apply to production in a maintenance window only after staging passes.

Verification SQL after migration 20261010 (run as the database owner; expect the listed values):

```sql
-- DB-01: views respect RLS and are not readable by anon/authenticated
SELECT relname, reloptions FROM pg_class
 WHERE relname IN ('pending_deletions','orphaned_billing','unattached_credit_grants');
-- expect reloptions to contain security_invoker=true

SELECT grantee, privilege_type FROM information_schema.role_table_grants
 WHERE table_name IN ('pending_deletions','orphaned_billing','unattached_credit_grants')
   AND grantee IN ('anon','authenticated','PUBLIC');
-- expect 0 rows

-- DB-02: no permissive delete policy on reactions for clients
SELECT policyname FROM pg_policies WHERE tablename = 'reactions' AND cmd = 'DELETE';
-- expect reactions_admin_all only (or equivalent admin policy), not reactions_user_delete

-- DB-03: search_path pinned
SELECT proname, proconfig FROM pg_proc
 WHERE proname LIKE 'increment_%' OR proname = 'force_comment_unapproved';
-- expect proconfig containing search_path=public, pg_temp

-- DB-04: anon has no table privileges on profiles or audit_logs
SELECT table_name, privilege_type FROM information_schema.role_table_grants
 WHERE grantee = 'anon' AND table_name IN ('profiles','audit_logs');
-- expect 0 rows
```

Rollback (only with a written decision; each re-opens a risk): see the comments at the bottom of `20261010000000_security_hardening_db.sql`. Do not roll back by deleting data.

## C. Live checks after deploy (NOT RUN until someone runs them)

- [ ] `curl -sI https://www.mizan.page/` shows `strict-transport-security`, a `content-security-policy` without `unsafe-eval`, and `frame-ancestors`.
- [ ] The site loads JavaScript (CSP did not block the bundle). Open the browser console on `/` and `/quiz`.
- [ ] Anonymous REST request to `/rest/v1/pending_deletions` returns no rows (error or empty).
- [ ] `POST /api/quiz/submit` with an oversized body returns 413.
- [ ] `POST /api/account/delete` for a signed-in test account returns a generic error body with no migration name.
- [ ] The AI assistant refuses when logged out, and answers Arabic questions when logged in.
- [ ] Admin can still create and publish content at `/admin`.

## D. Configuration (names only; never paste values into tickets)

Required for normal operation:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or the `VITE_` pair for the build)
- `SUPABASE_SERVICE_ROLE_KEY`: server only; required by billing webhook and help config
- `STRIPE_WEBHOOK_SECRET`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `IP_HASH_SALT`

Strongly recommended:
- `RATE_LIMIT_KV`: KV binding. Without it, limits are per worker. The AI assistant returns 503 without it (fail closed).
- `TURNSTILE_SECRET_KEY`

Optional:
- `HELP_ALLOWED_ORIGINS`: extra origins for the AI assistant, comma-separated.
- `LINGVA_INSTANCES`, `LIBRETRANSLATE_URL`, `LIBRETRANSLATE_API_KEY`

Must **not** be set in production:
- `HELP_ALLOW_MEMORY_LIMITER=1`. It disables the AI assistant's shared limiter and its strike lockout.

Checks:
- [ ] No `VITE_` variable holds a secret. The anon key is the only Supabase key that may be public.
- [ ] `HELP_ALLOW_MEMORY_LIMITER` is unset in the production environment.

## E. CI

- [ ] `.github/workflows/*.yml` each declare `permissions:`. Verified in branch by test; confirm the merged workflows are the same.
- [ ] Third-party actions are SHA-pinned. Re-pin with the same method if you update an action.
- [ ] `codeql.yml` has `security-events: write` (needed to upload results).

## F. After deploy

- [ ] Monitor logs for `[... ]` error lines from `logServerError` and `lockout_started` events.
- [ ] Record the deployed commit, the migration list, and these check results in the release notes.
- [ ] Schedule the dev-dependency upgrade (CI-03) as a separate change.

## G. Rollback plan

- Code: redeploy the previous Pages build.
- Migrations: use the commented rollback steps. Each is a deliberate re-opening of a risk; document the decision.
- Headers: revert `public/_headers` to the previous commit and redeploy. Do not remove HSTS or `frame-ancestors` without a written reason.
