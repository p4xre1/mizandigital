# Security Testing — Mizan.page

This records what was run, what passed, and what was **not** run. Anything marked NOT RUN has no result and should not be read as passing.

Environment for the results below: sandbox checkout of branch `arena/682d28e7-mizandigital`, Node and npm from the repo, outbound access limited to GitHub, npm registry, and PyPI. The sandbox could **not** reach Supabase, Cloudflare, or Stripe, and no production system was tested.

## 1. Commands and results (this branch)

| Check | Command | Result |
|---|---|---|
| Full unit and integration suite | `npx vitest run` | **104 files, 1595 tests passed** (exit 0) |
| Security and hardening subset | `npx vitest run tests/security-hardening.test.ts tests/security-db-policies.test.ts tests/security.test.ts` | 29 + 13 DB + security suite all passed |
| Database policy tests (PostgreSQL 17 via PGlite) | `npx vitest run tests/security-db-policies.test.ts` | 13 passed: reproduces the leaks before the migration, confirms the fix after |
| AI assistant tests | `npx vitest run tests/help-*.test.ts` | Passed (includes social-engineering and strike lock) |
| Type check | `npx tsc --noEmit` | exit 0 |
| Production build | `npm run build` | exit 0. CSP hashes checked (`[csp-hashes] ✓`) |
| Production dependency audit | `npm audit --omit=dev` | **0 vulnerabilities** |
| Full dependency audit (dev included) | `npm audit --json` | **8 advisories** (4 high, 4 moderate). All in dev tooling. Open: CI-03 |

Notes on the build:
- The prerender step could not fetch CMS tables in this sandbox (`fetch failed` for articles, news, pdf_summaries, laws). The build therefore produced only locally generated pages, and the sitemap dropped 66 entries it could not verify. **This build is not equivalent to a production build with CMS access.** Re-run the build in CI with real environment variables before comparing output.
- The entry bundle budget (40,000 gzip bytes) was not raised. The build passed.

## 2. What the static tests check

`tests/security-hardening.test.ts`:
- Secret patterns (JWT, Bearer, Stripe-style keys, private key blocks) in `src`, `shared`, `public`, and `dist`.
- Error responses do not include upstream text, `detail`, or `e.message` in the changed endpoints.
- `logServerError` is used in the changed catch paths.
- `scrub()` removes JWTs, Bearer tokens, Stripe-style keys, and key=value secrets, and truncates long values.
- Bounded body reads: oversized quiz submit returns 413.
- Every workflow declares top-level `permissions:`.
- No workflow uses `pull_request_target`.
- Every external `uses:` is pinned to a 40-character SHA.
- `public/_headers` contains HSTS, a CSP with no `unsafe-eval`, `object-src 'none'`, and `frame-ancestors`.
- `dist/_headers` has the build-time hash substituted.

`tests/security-db-policies.test.ts`: applies migrations to an in-memory PostgreSQL and checks the grants, RLS, view options, function `search_path`, and the reaction delete policy before and after `20261010000000`. Skips with a reason if the package is missing; the package is present in `devDependencies`, so it runs in CI.

## 3. Measured limits of these tests

- They prove that the code and migration **say** what we intend. They do not prove that production matches.
- The PGlite run uses the migrations in this branch on a fresh database. It does not replay the live database's history.
- Static tests on headers read the file, not the response the CDN sends.
- No test sends attack traffic. There is no fuzzing, no load test, and no penetration test.

## 4. NOT RUN (with the command to run)

These need a live or staging environment, and production testing was not authorized.

| Item | Command or procedure | Why NOT RUN |
|---|---|---|
| Live response headers | `curl -sI https://www.mizan.page/ \| grep -iE "strict-transport\|content-security-policy\|frame-ancestors\|x-content-type"` | No production testing authorized |
| Migrations on a real database | On a staging copy: `psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261010000000_security_hardening_db.sql` (after 20261008 and 20261009) | No database access from the sandbox |
| Anonymous access to the views after migration | `curl -s -H "apikey: $ANON" "$SUPABASE_URL/rest/v1/pending_deletions?select=*"` expecting an error or empty result, never rows | Requires Supabase project |
| Reaction delete as anonymous | `curl -X DELETE -H "apikey: $ANON" "$SUPABASE_URL/rest/v1/reactions?id=eq.<id>"` expecting no rows deleted | Requires Supabase project |
| Oversized body on live functions | `curl -X POST --data-binary @big.json https://www.mizan.page/api/quiz/submit` expecting 413 | Production testing not authorized |
| Stripe webhook signature and replay | Send a signed test event from the Stripe CLI to staging | No Stripe test environment configured in sandbox |
| Turnstile on comments | Submit with and without a valid token on staging | No Turnstile keys in sandbox |
| AI assistant against live Supabase | Log in on staging and send Arabic, non-Arabic, and social-engineering questions | No staging project |
| Translate cost and abuse behavior | Controlled load test against the provider quota | Would spend paid quota; not authorized |
| Dev dependency upgrades | `npm audit fix --dry-run` then a manual review of `vitest`, `wrangler`, `sharp` majors | Major-version changes; separate change |
| CMS prerender with real data | `npm run build` in CI with `SUPABASE_URL` and anon key set | Sandbox cannot reach Supabase |
| Penetration test | External engagement | Not planned in this work |
| Cloudflare WAF, bot rules, rate rules | Dashboard review | Outside the repository; not verified |

## 5. How to report a new result

Add a row to section 1 with the command, the date, and the exact result. If a NOT RUN item is executed, move it to section 1 and cite the environment.
