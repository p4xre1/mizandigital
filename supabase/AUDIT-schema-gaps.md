# Mizan Digital — Supabase schema & migration audit

**Date:** 2026-09-16 · **Compared:** live `public` schema dump (38 tables) ↔ `supabase/migrations/*.sql` (29 files, 7 409 lines) ↔ app code (`src/**`, `functions/**`, `supabase/functions/**`).

Every claim below was checked by grepping/parsing the repo this session. Where the pasted dump cannot answer a question, that is stated explicitly at the end.

---

## 0. What matches ✅

| check | result |
|---|---|
| Tables referenced by `.from()` in code | all exist in the live schema **except** `integrations` and `law_trends` (see §1) |
| RPCs called from `src` (26 distinct) | **all 26 are defined** in the migrations, and every call site's parameter names match the function signature |
| RLS enabled | **all 38 live tables** have `ENABLE ROW LEVEL SECURITY` |
| Surviving RLS policies (simulated in migration order, drops applied) | **88** across 33 tables |
| Seeds present | `interest_options` (8 rows), `subscription_plans` (2), `credit_packages`, `community_guidelines` |
| Enum types | `content_status`, `user_role` (+`member` added), `subscription_status`, `payment_status`, `interaction_type`, `audience_type`, `user_rank`, `credit_direction`, `risk_event_type`, `lock_reason`, `content_kind`, `reaction_kind` — all created |
| `documents` in admin code | it is a **storage bucket** (`supabase.storage.from("documents")`), *not* a missing table |

---

## 1. Missing tables — code needs them, nothing creates them

| table | used at | note |
|---|---|---|
| `integrations` | `src/lib/integrations/gmailService.ts:202` (select), `:253` (upsert), `:278` (delete) | Gmail token store. `src/pages/admin/GmailInboxPage.tsx:365` literally tells the admin *«أنشئ جدول `integrations` في Supabase مع تشفير التوكن»* — i.e. it was never written. |
| `law_trends` | `src/lib/integrations/lawTrendsService.ts:165` | `select("*").order("interest")` |
| `article_revisions` | `20260823182123_remote_schema.sql:776`, inside `public.track_article_revision()` | The function is created, `REVOKE`d and `GRANT`ed (lines 1954‑1955) but **no trigger calls it** — grep for `track_article_revision` returns only CREATE FUNCTION / ALTER OWNER / REVOKE / GRANT. Dormant landmine. |

## 2. SQL functions that reference tables which do not exist

| function | missing table | location |
|---|---|---|
| `handle_new_user_tenant_binding()` | `public.tenants` | base:355 **and** `20260919010000_user_role_default_member_and_demote.sql:79` |
| `delete_my_account()` | `public.user_bookmarks` | base:380 |
| `increment_document_downloads(uuid)` | `public.documents_library` | base:433 |

⚠️ `handle_new_user_tenant_binding()` is the sign‑up profile creator. It also does
`INSERT INTO public.profiles (id, tenant_id, tier, role)` — **`profiles` has neither `tenant_id` nor `tier`** in the live schema.
**No `CREATE TRIGGER … ON auth.users` exists in any migration** (verified: 0 matches), so this is dormant *as far as the repo can tell*. If the `on_auth_user_created` trigger does exist in the live DB, **every new sign‑up fails**. → verify in the SQL editor:

```sql
select tgname, tgrelid::regclass from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;
```

## 3. Column drift — two live bugs

### 3.1 `seminars.image_url` — saving a seminar always fails
`src/pages/admin/seminars/SeminarsPage.tsx:170` puts `image_url` into the payload used by `.update()` (`:176`) and `.insert()` (`:182`).
`seminars` is created at `20260823182123_remote_schema.sql:1082‑1094` with 11 columns and **no `image_url`**; no migration adds it; the live schema has none.
⇒ PostgREST `PGRST204: Could not find the 'image_url' column of 'seminars'`.
The comment on line 160 (*«نرسل فقط الأعمدة الموجودة فعلياً في جدول seminars»*) is wrong.

### 3.2 `reaction_counts.total_count` — admin "most engaged" panel is broken
`src/lib/analytics/contentTracking.ts:87` → `.from("reaction_counts").select("*").order("total_count", …)`; the value is read at `:179`.
The real column is `count` (`20260922000000_reactions.sql:25‑32`: `target_type, target_id, reaction_type, count, updated_at`).
`getContentAnalytics()` **is** used — `src/pages/admin/ContentAnalyticsPage.tsx:10`.

*(Checked and cleared: `category` / `faculty` on `articles`, `laws`, `pdf_summaries` are **embed aliases** — `category:categories(name)`, `faculty:faculties(…)` — not missing columns.)*

## 4. RLS — `articles` has no write policy

Simulated final policy state gives `articles` **exactly one** policy:
`"Public and Admin Read Articles" … FOR SELECT` (`20260823182123_remote_schema.sql:1466`). No INSERT / UPDATE / DELETE policy, and none is ever dropped‑and‑recreated.

Yet the CMS writes straight through PostgREST with the **anon** client:

* `src/pages/admin/articles/ArticleEditorPage.tsx:210` → `.update()`
* `src/pages/admin/articles/ArticleEditorPage.tsx:216` → `.insert()`
* `src/pages/admin/articles/ArticlesPage.tsx:84` → `.delete()`
* `src/lib/supabase/client.ts` uses `VITE_SUPABASE_ANON_KEY`; there is **no service‑role client anywhere in `src`**.

⇒ **create / edit / delete of articles from the browser is denied by RLS.**

`20260904120000_fix_admin_authorization_and_rls.sql` rebuilt admin CRUD policies for `news`, `lexicon_terms`, `laws`, `faculties`, `trending_topics` — and **never mentions `articles`** (grep: 0 hits). Every other CMS table has 4 policies:

| table | surviving policies |
|---|---|
| news · laws · faculties · pdf_summaries · seminars · categories · trending_topics | 4 (select/insert/update/delete) |
| **articles** | **1 (select only)** |

Deny‑all by design (RLS on, zero policies, service‑role only) — **correct, no action needed**:
`onboarding_responses` (only `supabase/functions/onboarding/index.ts:88,113` via `supabaseAdmin`), `stripe_webhook_events`, `rate_limit_events`, `payment_risk_events`, `security_locks`.

## 5. Missing `updated_at` triggers

24 triggers survive. These tables declare `updated_at … NOT NULL DEFAULT now()` but have **no `BEFORE UPDATE` trigger**, so the column never advances:

`articles` · `pdf_summaries` · `lexicon_terms` · `transactions`

`20260921000000_payments_and_credits.sql:31` attaches `set_credit_packages_updated_at` to `credit_packages` only.

> **Correction:** an earlier version of this report listed `payments` here. That was wrong — `payments` has **no `updated_at` column at all** (0 occurrences in its `CREATE TABLE`), and nothing in `src` reads one. It tracks state changes via `completed_at`. No trigger is needed and none is created.

## 6. Storage bucket `documents` is never created

Used by `src/pages/admin/library/LibraryPage.tsx:58, 68, 210` and `src/pages/admin/LawsPage.tsx:49, 57`.
`grep "storage\." supabase/migrations/*.sql` → **0 hits**: no `insert into storage.buckets`, no `storage.objects` policy.
A fresh environment (or any re‑provisioning) has no bucket ⇒ every document/law upload fails.

## 7. Six migrations are empty stubs — reproducibility **and** security

These files contain only `-- Migration already applied to the remote Supabase database.`:

```
20260831174938_align_cms_with_production_schema_and_storage.sql
20260831174945_remove_legacy_cms_write_policies.sql      <-- security
20260831174956_add_news_category_relation.sql
20260831175054_seed_news_categories.sql                  <-- the ONLY categories seed
20260831175909_fix_cms_compatibility_and_function_security.sql   <-- security
20260831175929_tighten_rpc_privileges_and_trigger_search_paths.sql  <-- security
```

Consequences for `supabase db reset` / a new project:
* `categories` ships **empty** — no other migration seeds it (grep `insert into … categories` → 0 hits), so `articles.category_id` / `laws.category_id` / `news.category_id` have nothing to point at.
* three hardening migrations are absent ⇒ a fresh DB is **less locked down than production**.

## 8. `content_stats` CHECK is narrower than the writer (latent)

`20260823182123_remote_schema.sql:912`:
`CHECK ("source_type" = ANY (ARRAY['articles','news']))`

`src/lib/analytics/contentTracking.ts:300` forwards `term | pdf | law | event | page | school | quiz` unchanged to `increment_content_views`, which upserts into `content_stats` ⇒ `23514 check_violation`.
Currently **latent**: `trackContentView`, `getContentViews`, `getTrendingForHomepage` have **no callers** (verified). `src/components/articles/ViewCounter.tsx` is safe — its `table` prop is typed `"articles" | "news"`.

## 9. Dead subsystems

**`interaction_events` is never written.** Grep across `src`, `supabase/functions`, `functions` → 0 hits. But the DB carries the whole subsystem: 4 indexes, `trg_interaction_events_filter_bots`, `cleanup_interaction_events`, and 6 analytics RPCs. All of it is unreachable.

**`/api/analytics/track` does not exist.** `src/lib/analytics/interactionTracker.ts:46` beacons every event there; `functions/api/analytics/` is absent (`ls` → no such directory), so the request falls through to `functions/[[path]].js`. `quiz_start`, `quiz_complete`, `reaction`, `save`, `report`, `payment_click` are lost.

**97 migration-defined functions are never called from `src`**, including the entire advanced-analytics family:
`get_audience_breakdown`, `get_heatmap_grid`, `get_dead_click_hotspots`, `get_scroll_depth_distribution`, `get_regional_audience`, `get_interest_correlation`, `get_risk_overview`, `get_risk_events`, `get_locked_accounts`, `get_user_kpis`, `get_rank_distribution`, `get_credit_consumption`, `get_rate_limit_metrics`, `get_quiz_load`, `get_my_entitlements`, `get_my_mizan_pro`, `get_my_saved_content`, `get_my_comment_limits`, `get_public_profile`, `search_profiles`, `quiz_leaderboard`, `admin_*`.
(Many others in that 97 are trigger bodies or internal helpers — expected. These are the user-facing ones.)

## 10. Missing indexes on hot read paths

Every row below is backed by a query that actually exists in `src/`. An earlier version of this table also listed `articles.category_id` / `faculty_id` / `is_featured`, `news.category_id`, `audit_logs.created_at` and `index_status.content_type` — those were **removed**: grep finds **0** uses of `.eq("category_id"`, `.eq("faculty_id"`, `.eq("is_featured"`, `.eq("content_type"` and **0** `from("audit_logs")` calls in `src`. Indexes with no query behind them are pure write overhead.

| table | the query that justifies it |
|---|---|
| `articles` | `ArticlesPage.tsx:68‑69` `.eq("status","published").order("published_at" desc)` |
| `news` | `NewsPage.tsx:51‑52` `.eq("is_published", true).order("published_at" desc)` |
| `content_stats` | `contentTracking.ts:86` `.order("views_count" desc).limit(20)` |
| `community_guidelines` | `governance/service.ts:87` `.eq("is_active", true).order("sort_order")` |
| `seminars` | `SeminarsPage.tsx:95` `.order("event_date" desc)` |
| `index_status` | `AnalyticsPage.tsx:324` `.order("checked_at" desc).limit(30)` |
| `credit_packages` | `payments/service.ts:45‑46` `.eq("is_active", true).order("sort_order")` |
| `law_trends` (new table) | `lawTrendsService.ts:165` `.order("interest" desc).limit(20)` |

> **Correction:** `community_guidelines.slug` **is** already `text NOT NULL UNIQUE` (`20260923000000_governance_and_reports.sql:56`). An earlier version claimed it was not, and the first draft of the fix migration created a redundant unique index for it. Removed.
>
> `interest_options` and `subscription_plans` have **0** query sites in `src` (they are read by SQL functions, not PostgREST), so they get no index.

Well indexed already: `comments` (8), `profiles` (6), `credit_transactions` (6), `transactions` (5), `page_views` (4), `interaction_events` (4), `content_reactions` (4), `reactions` (4), `reports` (4), `payments` (3), `payment_risk_events` (3), `quiz_questions` (3), `quiz_attempts` (3).

## 11. Parallel / duplicated systems (design debt)

| concern | system A (used by the app) | system B (defined, unused) |
|---|---|---|
| reactions | `reactions` + `reaction_counts`, `toggle_reaction`, `get_reaction_summary` | `content_reactions`, `toggle_content_reaction`, `get_content_reactions` |
| identity | `profiles` (11 refs) | `mizan_profiles` (7 refs) — both carry `clerk_user_id`, `is_pro`, `stripe_*`, `subscription_*` |
| payments | `payments` + `credit_packages` + `credit_transactions` | `transactions` (Stripe session/invoice/PI) |

Both copies are live in the schema, so writes can land in one while reads look at the other.

---

## What the pasted dump could **not** tell me

The dump is **columns-only for the `public` schema**. Not verifiable from it, so the rows above were assessed against the migration files instead — and 6 of those are stubs:

* live RLS policies, triggers, functions, indexes, constraints and `GRANT`s
* `storage.buckets` / `storage.objects` policies
* anything on `auth.users` (including the `handle_new_user_tenant_binding` trigger — see §2)
* array element types (`profiles.interests`, `schools.study_areas/body`, `mizan_profiles.interests/badges` show as bare `ARRAY`)
* row counts / seed state

Outbound HTTPS is blocked in this sandbox, so `supabase db pull` / a live query could not be run. To close these gaps, run in the SQL editor:

```sql
select schemaname, tablename, policyname, cmd from pg_policies where schemaname='public' order by 2,4;
select tgrelid::regclass as tbl, tgname from pg_trigger where not tgisinternal order by 1;
select tablename, indexname from pg_indexes where schemaname='public' order by 1;
select id, name, public from storage.buckets;
select tgname from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;
```

## Suggested order of work

1. **§3.1 `seminars.image_url`** and **§4 `articles` write policies** — both break admin flows today.
2. **§3.2 `reaction_counts.total_count`** — one-word fix, admin analytics.
3. **§1 `integrations` / `law_trends`** — create the tables or delete the features.
4. **§5 `updated_at` triggers** (esp. `payments`), **§6 `documents` bucket**, **§10 indexes**.
5. **§7 restore the 6 stub migrations** so a fresh DB matches production.
6. **§9** either wire up `interaction_events` + `/api/analytics/track`, or drop the subsystem.
7. **§11** pick one of each duplicated pair.

A ready-to-review migration for items 1‑5 is in `supabase/migrations/20260916120000_schema_gap_fixes.sql` (not yet applied).
