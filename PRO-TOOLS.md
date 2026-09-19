# Pro legal tools: implementation and launch checklist

## Routes

- `/pro-tools`: public catalog (linked in desktop/mobile navigation and pricing).
- `/pro-tools/:slug`: authenticated Pro tool, with upgrade/login gates.
- `/admin/pro-tools`: CMS, behind the existing admin route guard and database admin policies.

## What is implemented

| Tool | Initial functionality | CMS content |
| --- | --- | --- |
| `versions` | Search curated old/new text pairs, view dates and both sources side by side | Text pair, dates, source URLs, reference, review metadata |
| `cases` | Read scenarios, write and save answers, reveal reviewed answers, self-check criteria, private answer notebook | Scenario, checklist, model answer |
| `references` | Search article-to-article relationships and open their sources | Both articles, explanation of relationship, target URL |
| `workspace` | Private research notes with citations, create/edit/delete, plain-text export | Enable/disable and catalog copy only; admins cannot read private notes |
| `alerts` | Follow/unfollow topics and filter an in-app amendment feed | Topic, amendment summary, effective date |
| `deadlines` | Reviewed, validity-bounded calendar-day addition, excluding the triggering day, with explicit limitations | Days, valid date range, assumptions and legal source |

These are initial tools, not claims of complete Moroccan legal coverage. No laws,
judgments, exercises, or procedural rules have been invented or seeded. There is
no automatic legal assessment, source scraping, email delivery, graphical law
network, exhaustive version database, or business-day/holiday deadline engine.
All amendment feed content is manually published through the CMS.

## Deploy before use

1. Review the existing schema-drift warnings in `DEPLOY-SUPABASE.md`. This change
   does not resolve earlier migration drift or apply changes to your live project.
2. In staging, ensure earlier migrations through `20260927000000` are applied.
   The new migration needs `profiles.account_status`, `mizan_profiles.owner_id`,
   the existing subscription columns, `auth.uid()` and `public.is_admin()`.
3. Apply `supabase/migrations/20260928000000_pro_legal_tools.sql` through the normal
   Supabase migration process. It runs transactionally and is idempotent: re-running
   it on a partially-applied schema is safe and never deletes data.
4. Deploy the frontend. No new secrets or API keys are required. The normal
   Supabase URL and anon key are sufficient; never put a service-role key in Vite.
5. Open `/admin/pro-tools`. The workspace starts enabled. The other five tools
   start disabled. Create drafts, add source references and review metadata, then
   publish reviewed materials and enable each tool.
6. Leave the deadline tool disabled until a qualified reviewer has validated its
   restricted calculation model for every rule you intend to publish. It does
   not adjust for weekends, holidays, service, suspension, or procedural exceptions.
7. Test with guest, free, active Pro, expired Pro and admin accounts on staging.
   The frontend shows a setup/unavailable error if the migration is missing; it
   never substitutes fabricated premium content or a client-only unlock.

## Access and privacy

- Membership is checked by the `has_pro_tools_access` database function, not the
  existing local-storage subscription hook, XP rank, ad exemption or credit balance.
- The account must be active. The canonical `mizan_profiles` membership must have
  `is_pro`, an active/trialing status, and a non-null future expiry. The explicit
  `subscription_ends_at` takes precedence over `subscription_current_period_end`
  so an admin extension uses the existing billing convention.
- Active admins may preview enabled tools without a paid subscription.
- Existing billing protections must stay enabled; clients must not be allowed to
  write subscription columns. Legacy Pro records with missing expiry fail closed
  and need billing reconciliation, not a frontend exception.
- RLS protects entry reads and private note/follow writes. Disabled tools cannot
  be used via direct table requests. Drafts are admin-only.
- Notes and follows are owner-scoped; CMS admins do not get access to private notes.
  They are deleted on account deletion via foreign-key cascade.
- CMS changes log actor, table, operation, record ID and time in `pro_tools_audit`.
  Only admins can read that log. The audit log does not copy private notes.
- The UI rechecks entitlement and catalog availability on focus and every minute.
  Database policies enforce membership on every request, even between rechecks.
- HTTPS source links are rendered as links; content and exports are plain text.
  Review metadata records the CMS editor's attestation, not automatic source verification.

## Verification

```sh
corepack pnpm typecheck
corepack pnpm test
corepack pnpm exec vite build
```

`tests/pro-tools-rls.test.ts` runs the actual new migration in an ephemeral PostgreSQL
instance using PGlite with fixtures for the existing auth/billing schema. It checks
guest denial, free/expired/suspended/canceled denial, publication requirements,
admin control, disabled-tool enforcement, note privacy, and follow isolation.
It is not a substitute for testing the migration against the full staging schema.
The PGlite dependency is development-only, not included in the application bundle.
