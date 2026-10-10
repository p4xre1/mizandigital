# Deployment handoff status (verified 2026-10-10)

This note checks each item in the handoff (`RECONCILE.md`, `APPLY-PATCH.md`,
`FINAL-REPORT.md`) against the current `abdo` tree (`9809a29`). The handoff was
written against an older base (`00946b2`), and most of its fixes are already in
the tree under the same or equivalent names.

## Checklist

| # | Handoff item | Status | Evidence |
|---|---|---|---|
| 1 | Migration filename collision `20260920000000_*` | ✅ No collision | Single file with that name; no duplicate in `supabase/migrations/`. |
| 2 | `ReactionBar.tsx`, `DEPLOY-SUPABASE.md`, `APPLY-PATCH.md` collisions | ✅ Resolved | Only one version exists in the tree; the reactions system is `content_reactions` (`20260918000000`, `20260922000000`). |
| 3 | `quiz_attempts_insert` `WITH CHECK (true)` for anon | ✅ Fixed | `20260920000000` drops it and adds `quiz_attempts_no_direct_anon_insert` (`WITH CHECK (false)`) plus a bounded authenticated insert policy. Nothing later re-creates a permissive policy. |
| 4 | Self-granting `xp` / `rank` via `mizan_profiles` | ✅ `rank` fixed; ⚠️ `xp` partially fixed | `rank` is derived from `xp` by trigger `apply_profile_rank` (`20260924000000`), so it cannot be written directly. `xp` is capped only per update (jump > 3000 blocked). A user can still set `xp` to any value up to +3000 per write, since the client syncs `xp` (`src/lib/profiles/service.ts`). See Open item A. |
| 5 | `quiz_questions_public_read` exposes `answer` / `explanation` to anon | ❌ **Not fixed** | The policy from `20260914000000` (`USING is_published = true`) is never dropped. The `quiz_questions_public` view was added, but the base policy remains, so the view does not hide answers. See Open item B. |
| 6 | `user_role` default `'editor'` (every profile is admin) | ✅ Fixed | `20260919010000` sets the default to `'member'` and demotes existing `editor` rows. The `20260924` signup trigger inserts `'member'`. |
| 7 | `toSafeJsonLd` in `SchemaOrg.tsx` | ✅ Equivalent fix present | `src/lib/seo/jsonLd.ts` `escapeJsonLd` escapes `<`, `>`, `&`, U+2028, U+2029. `SchemaOrg.tsx` uses `jsonLdProps`. `tests/jsonld-escape.test.ts` covers it. |
| 8 | Clerk upgrade to 5.61.9 | ➖ Not applicable | Clerk has been removed. Auth is Supabase (`functions/_shared/auth.js`). |
| 9 | `deploy/paste-1.sql`, `deploy/paste-2.sql` | ✅ Present | Both exist. They are reference bundles that point to the migration files. |

## Verification run on this branch

- `pnpm install --frozen-lockfile`: OK
- `pnpm typecheck` (`tsc --noEmit`): exit 0
- `pnpm test` (vitest): **117 files passed, 1 skipped; 1855 tests passed, 33 skipped, 0 failed**
- `pnpm build`: exit 0, 355 routes prerendered, CSP hashes generated

The build regenerates tracked artifacts (`public/sitemap.xml`, `public/reference/*`,
`src/data/laws.client.json`, and similar). Those changes were reverted and are not
part of this PR.

## Open items (must be resolved before treating quiz security as closed)

### A. XP is still client-writable within the jump limit

`saveMyProfile` upserts `xp` from the client, so a hard lock on the column would break
progress sync. The correct fix is to award XP only in a SECURITY DEFINER function
(for example, a server-side `sync_progression` RPC that recomputes XP from attempt
records) and revoke direct `UPDATE (xp, credits)` from `authenticated`. This is a
product-level change and is not included here.

### B. Quiz answers are readable by anon

Fix sketch:

1. Migration: `DROP POLICY IF EXISTS "quiz_questions_public_read" ON public.quiz_questions;`
   and grant SELECT on `quiz_questions_public` (already exists) to anon/authenticated.
2. Frontend, `src/lib/quiz/repository.ts` `loadCmsQuestions`: select from
   `quiz_questions_public` instead of `quiz_questions`, and stop filtering on `answer`.
3. Grade CMS questions via `check_quiz_answer` (`attemptService.checkAnswerSecure`).
   `QuizRunner.tsx:457` and `src/lib/quiz/engine.ts:160` currently grade from the local
   `answer` field.
4. Admin reads keep working through `quiz_questions_admin_write` (`FOR ALL`, `is_admin()`).

Doing step 1 without steps 2 and 3 would empty the public CMS question bank, so the
migration is intentionally not included in this PR.

## Deployment order (unchanged from `DEPLOY-SUPABASE.md`)

1. Deploy the frontend that calls `submit_quiz_attempt` before applying `20260920000000`.
2. Apply `deploy/paste-1.sql` (payments, reactions), then `deploy/paste-2.sql` (governance)
   as separate runs. Combining them can fail with `unsafe use of new value member of enum type user_role`.
3. Verify in the Supabase SQL editor:
   ```sql
   SELECT column_default FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role';  -- expect 'member'
   SELECT policyname FROM pg_policies
    WHERE tablename='quiz_questions' AND policyname='quiz_questions_public_read';  -- expect 0 rows once item B is fixed
   ```
