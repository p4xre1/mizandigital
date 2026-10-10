# Help chat: `503 guard_config_unavailable`

This response means `functions/_shared/helpConfig.js` could not load the protected
assistant configuration from Supabase. It is not a question-matching failure or an
expired login. The endpoint intentionally fails closed rather than answering without
the administrator's rules. Do not replace this with default settings or public reads.

## Find the exact cause

1. In browser DevTools → Network, select the failed `POST /api/help/chat` and copy
   its **response** `X-Request-Id`. The help-chat console warning also includes this
   ID after deploying the diagnostic update.
2. In Cloudflare Pages Functions runtime logs for the deployment serving that
   hostname, find the `guard_config_unavailable` event with that `requestId`.
3. Use its server-only `code` and `upstreamStatus`:

| Code | What to check |
| --- | --- |
| `missing_supabase_url` | Set runtime `SUPABASE_URL` (or `VITE_SUPABASE_URL`) for the correct project. |
| `missing_service_key` | Set runtime secret `SUPABASE_SERVICE_ROLE_KEY`, from the same Supabase project as the URL. The anon key is not a substitute. |
| `settings_http` / `qa_http`, status 401 or 403 | Check that the service-role secret is valid, belongs to this project, and that database grants permit the server read. Do not make `help_settings` public. |
| `settings_http` / `qa_http`, status 404 | Check that the CMS migrations were applied to this project and the tables are available through the REST API/schema cache. |
| `settings_http` / `qa_http`, other status | Check Supabase API/database logs for the upstream failure, using the timestamp. |
| `settings_row_missing` | Verify the singleton `help_settings` row (`id = 1`) exists; inspect the CMS migration/seed history. |
| `fetch_timeout` | The configuration fetch exceeded its five-second timeout; investigate Supabase availability and connectivity from the Function. |
| `fetch_failed` | Check runtime URL, connectivity, and whether Supabase returned valid JSON. |
| `unknown` | Investigate a runtime error using the deployment and request ID. |

Older deployments group missing URL/key as `missing_service_key` and timeouts as
`fetch_failed`, and do not log the upstream status. Browser responses deliberately
remain generic: no database response body, secret, or protected configuration is
returned to the client or added to these logs.

## Deployment checklist

- Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the **secret**
  `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare Pages runtime configuration for the
  environment serving the affected hostname. Build-only configuration or a local
  `.env.local` does not establish runtime bindings. Check Production and Preview
  separately, then redeploy after configuration changes.
- Never create `VITE_SUPABASE_SERVICE_ROLE_KEY`: `VITE_` values are public browser
  bundle contents. Never paste secret values into tickets, chat, or logs.
- Verify the migrations in order, following the staging/backup procedure in
  [the deployment checklist](security-deployment-checklist.md):
  - `supabase/migrations/20261008000000_help_assistant_cms.sql`
  - `supabase/migrations/20261009000000_help_assistant_hardening.sql`
- As the database owner, check existence without exposing protected contents:

  ```sql
  select to_regclass('public.help_settings'), to_regclass('public.help_qa');
  -- Both must exist. Then:
  select id from public.help_settings where id = 1;
  -- Expect exactly one row. An empty help_qa table is valid.
  ```

- Bind an actual KV namespace as `RATE_LIMIT_KV`; a text environment variable is
  not a KV binding. Do not enable `HELP_ALLOW_MEMORY_LIMITER` in production.
  Missing KV produces the separate error `service_misconfigured`.
- Retry as a signed-in, active test account. Confirm chat answers normally (or
  returns the configured disabled response), and anonymous requests are refused.
  Successful configuration is cached for up to 60 seconds; failures are not cached.

## Other console messages

`enable_copy.js`, Semalt rank requests with `_source=ext`, and extension `content.js`
messages are unrelated to the assistant configuration loader. `share-modal.js` is
not a script shipped by this repository. Reproduce in a clean browser profile with
extensions disabled and inspect the full script URL in DevTools before attributing
those errors to the site. Do not suppress all console errors or loosen CSP to hide them.
