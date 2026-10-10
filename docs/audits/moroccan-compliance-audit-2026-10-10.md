# Mizan.page — Moroccan legal-compliance and technical-gap audit

- **Date:** 2026-10-10 (Africa/Casablanca)
- **Branch:** `arena/682d28e7-mizandigital` (base `6a345c7c2d0c9fd721849df9abb84fd7c7c8ec9f`)
- **Scope:** routes, legal pages, Supabase schema/RLS/grants/cron, Cloudflare Pages Functions, cookies and browser storage, analytics, auth, logs, storage, retention, third-party services, Moroccan statutes listed in §6.
- **Status of this document:** engineering and legal-readiness evidence for the owner and Moroccan counsel. It is **not** a legal opinion, **not** a CNDP filing, and **not** a statement that Mizan is compliant.
- **Relationship to earlier work:** `docs/audits/cndp-law-09-08-audit-2026-09-26.md` is the prior audit. This document does not repeat its inventory. It records (a) statute and CNDP text verified against official sources this pass, (b) new or re-confirmed code and migration evidence with line references, and (c) the proposed text changes. Where this document agrees with the earlier audit, the earlier audit's B-section is cited.

## 0. Method, limits, and what was not done

**Method.** Read-only static review of the working tree; greps and reads of `src/`, `functions/`, `shared/`, `supabase/migrations/`, `public/_headers`, `index.html`, `dist/` (existing build output, not rebuilt); fetches of official CNDP pages and the Law 09-08 consolidated text (CNDP-hosted Bulletin Officiel PDF); the Law 05-20 official Bulletin Officiel PDF (DGSSI-hosted); Law 2-00 and Law 31-08 via WIPO Lex.

**Limits (important).**
- The live Supabase project, Cloudflare account, Stripe account, and Google settings were **not** inspected. Effective RLS, grants, cron jobs, regions, backup settings, and DPAs are unverified. Migration files are evidence of intended state, not of what is running.
- No production or staging tests were run. No database, Cloudflare, or provider command was executed against any environment.
- `dist/` is the build output already present in the workspace; it was not rebuilt, so it may not match `src/`.
- Official Law 2-00 text was not fetched from the Bulletin Officiel; WIPO Lex was used. Commercial Code Article 26 and the accounting-retention rule were only seen in secondary copies (see §6, §9).
- The prior audit's F214/F211 conflict is carried forward unresolved.

**Changes made in this pass.** This document only. No code, migration, legal text, or configuration was modified. `src/content/legal/policies.js` was **not** edited (reason in §8).

---

## 1. Summary of findings (ranked)

Ranking reflects privacy impact if the migration state is live. Each item is "verified in repo" unless marked otherwise. Live status for every item is **OWNER CONFIRMATION REQUIRED**.

| # | Finding | Severity | Evidence |
|---|---|---|---|
| 1 | Any **authenticated** user can read every `page_views` row (visitor id, session id, user agent, referrer, path). Policy `authenticated can read page views` is `USING (true)` and no later migration narrows it. | High | `supabase/migrations/20260828224315_create_page_views_analytics.sql:49-56` |
| 2 | `credit_transactions` has a public `SELECT USING (true)` policy, commented "temporary". No later migration removes it. | High | `supabase/migrations/20260921000000_payments_and_credits.sql:99-100` |
| 3 | `mizan_profiles` public-read policy is row-based only (`is_public = true`). Anonymous REST clients can read **all columns** of public rows; the browser masks some fields, which is not a database boundary. | High | `supabase/migrations/20260914000000_quiz_engine_and_rpg.sql:240-244`; `src/lib/profiles/service.ts:96-130, 415-436` |
| 4 | Account purge is **not scheduled anywhere in the repository**. The policy says the Auth account is deleted "automatically (scheduled task, not a manual step)". | High (privacy promise unverified) | `src/content/legal/policies.js:206`; no `cron.schedule` for it; `DEPLOY-SUPABASE.md:478` lists it as a manual check |
| 5 | `audit_logs.user_id` references `auth.users(id)` with **no `ON DELETE` action**. The profile trigger writes audit rows on UPDATE/DELETE of `profiles`, so the deletion request can create rows that block the later Auth delete. Latent until #4 runs. | High (latent) | `supabase/migrations/20260823182123_remote_schema.sql:290-296, 1263, 1311` |
| 6 | Published privacy text says CVs are never published ("لا يُنشر أبداً" includes "سيرتك الذاتية"), but the resume feature publishes a resume at `/resume/<username>` when `is_public` is true, and the CV file is served from a bucket that the 2026-10-11 migration makes private. | High (contradiction) | `src/content/legal/policies.js:68-76, 308, 725`; `src/components/profile/ResumeEditor.tsx:146`; `supabase/migrations/20260929000000_school_annonce_resume_links.sql:79-95` |
| 7 | `reactions_public_read` is `USING (true)`. `reactions.user_ref` holds an anonymous identifier (from `localStorage`) or a user id, so reactors are linkable across rows. | Medium | `supabase/migrations/20260922000000_reactions.sql:9, 70-71`; `src/lib/reactions/service.ts:14` |
| 8 | `functions/api/comments.js:55` writes the **raw client IP** to logs in plain text (`ip=${getClientIp(request)}`), contrary to the stated "raw IP not stored" posture. | Medium | `functions/api/comments.js:55` |
| 9 | IP fingerprint uses SHA-256 with `IP_HASH_SALT || ""`. If the salt is unset, the hash of an IPv4 address is brute-forceable (small input space). Production salt setting is unverified. | Medium | `functions/_shared/guard.js:69-73`; `functions/api/account/signup-risk.js:31`; `functions/api/comments.js:68` (same pattern) |
| 10 | Rate-limit KV keys (`rl:<bucket>:<key>:<window>`) are built from the caller's key. Some callers pass the **raw user id** (`account/delete.js:58`, `r2/presign.js:132`, `r2/delete.js:55`), and `translate.js:165` passes the **raw client IP**. Hashed keys are used only by comments, signup-risk, and quiz submit. | Medium | `functions/_shared/guard.js:88`; the call sites listed |
| 11 | `/api/translate` is unauthenticated and accepts up to 400 texts of 8,000 characters per request, forwarding them to third-party machine-translation providers (Google gtx, MyMemory, public Lingva instances, optional LibreTranslate). Visitor IP is **not** forwarded (verified). | Medium (abuse, transfer disclosure) | `functions/api/translate.js:34-36, 181-200`; `shared/i18n/providers.js:198-276` |
| 12 | Retention cron jobs exist for `page_views` (180 days) and comment IP/user-agent provenance (90 days), **conditional on `pg_cron` being installed**. Neither period appears in the published policy. Job installation is unverified. | Medium (disclosure gap) | `supabase/migrations/20260829120000_page_views_bot_filter_and_retention.sql:83-98`; `supabase/migrations/20260911000000_comments_anti_spam_and_input_hardening.sql:262-285` |
| 13 | Published text says `last_ip_address` is "مجردة بملح" (salted hash). The column is `inet` (raw address) and no application code writes it. | Medium (inaccurate disclosure) | `src/content/legal/policies.js:381`; `supabase/migrations/20260823182123_remote_schema.sql:1047`; no writer found |
| 14 | Published text says the consent record stores a "browser fingerprint". The code stores the `User-Agent` string. | Low (inaccurate disclosure) | `src/content/legal/policies.js:382`; `src/lib/legal/consent.ts:161-170`; `supabase/migrations/20260925000000_legal_consents.sql:76, 110-115` |
| 15 | Published text describes an analytics queue `mizan:analytics:queue` sent to `/api/analytics` every 10 seconds. No caller of `track()` exists and the `/api/analytics*` routes do not exist under `functions/`. The real page-view path writes straight to Supabase (#1). | Medium (inaccurate disclosure) | `src/content/legal/policies.js:603, 102-106 (cookie row)`; `src/lib/analytics/interactionTracker.ts`; `src/hooks/useTrackView.ts:84` |
| 16 | `audit_logs` keeps full before/after row snapshots of `profiles` plus `inet_client_addr()`. The policy says retained tables are kept "بلا بيانات تعريفية" (without identifying data). No retention job exists for `audit_logs`. | Medium (inaccurate disclosure + retention) | `supabase/migrations/20260823182123_remote_schema.sql:290-296`; `src/content/legal/policies.js:55, 209` |
| 17 | The AI help assistant is **not described** in the privacy or terms text. Verified behaviour (no server-side conversation rows, no client persistence, no external AI API, log lines without message text) is favourable but unpublished. | Medium (disclosure gap) | `src/content/legal/policies.js` (no match for assistant); `functions/api/help/chat.js`; `src/components/help/HelpChat.tsx:17` |
| 18 | Cookie table lists `mizan:gmail:token` as an optional integration. The Gmail connector is a **simulation**: `connectGmail()` stores `mock_gmail_token_<timestamp>` and writes status with hard-coded counts; the page itself says it runs in mock mode. Gmail API calls exist but use the stored token. | Medium (inaccurate; latent risk) | `src/lib/integrations/gmailService.ts:91-93, 233-266`; `src/pages/admin/GmailInboxPage.tsx:366`; `src/content/legal/policies.js` cookie table |
| 19 | Deletion reason is sent in the **URL query string** (`DELETE /api/account/delete?reason=…`). URLs are commonly logged. | Low | `src/components/profile/DeleteAccountSection.tsx:93`; `functions/api/account/delete.js:74-84` |
| 20 | `DELETED_TABLES` omits `resumes`. The `resumes` row cascades from `mizan_profiles`, but **CV files in storage are not removed by a table cascade**. Storage clean-up is not in the repository. | Medium | `src/content/legal/policies.js:32-41`; `supabase/migrations/20260929000000_school_annonce_resume_links.sql:58-70` |
| 21 | Cloudflare Turnstile verification sends `remoteip` (client IP) to Cloudflare when available. Not disclosed as an IP recipient. | Low | `functions/_shared/guard.js:190-192` |
| 22 | Copyright text does not cite Law 2-00. Official legislative, administrative, and judicial texts are excluded from protection by Law 2-00 Article 8(a). | Low | `src/content/legal/policies.js:808`; WIPO Lex (§9) |
| 23 | Policy citation "المادة 26 من مدونة التجارة" for a ten-year accounting-retention duty. The Article 26 text found (secondary copy) covers **correspondence** retention, not the accounting-record rule. | Medium (citation accuracy) | `src/content/legal/policies.js:48`; secondary text only (§9) |
| 24 | Published text promises notice of material changes "قبل 15 يوماً". No notice mechanism was found. | Low | `src/content/legal/policies.js:527` |
| 25 | Contact page promises replies in "2 إلى 5 أيام عمل". No SLA mechanism was found; Law 09-08 Article 8 sets ten days for rectification requests. | Low | `src/pages/public/ContactPage.tsx:58`; statute text §6 |
| 26 | Published text says the platform is "مجانية بالكامل" (fully free). The codebase includes payment, credit, and Pro-subscription backends and a public payments page (prior audit B12). The only `pricing` route found is under the admin area and redirects to the admin dashboard. Whether paid flows are live is unverified. | Medium (requires owner confirmation) | `src/content/legal/policies.js:232, 655, 657`; `src/routes/AppRoutes.tsx:209` (admin-nested); `functions/api/billing/*` |

**Positive verified controls (for balance):**
- Signup consent checkbox is unchecked by default and required before account creation (`src/pages/auth/LoginPage.tsx:103-166, 306-315`). This matches the CNDP "no pre-ticked box" guidance (§6).
- Account deletion requires a typed confirmation (`src/components/profile/DeleteAccountSection.tsx:18, 40`) and is a soft delete with a 30-day restore window (`functions/api/account/delete.js:1-30`).
- Browser bundle: the only JWT in `dist/` decodes to `role: anon`. No `service_role` string, Stripe secret, `whsec_`, or `sk_live` was found in `dist/` (`dist/` not rebuilt). `.env.example` is the only tracked env file.
- Google Analytics code starts with `analytics_storage: denied` and `anonymize_ip: true` (`src/lib/analytics/gtag.ts:59, 73`).
- Help assistant: no content written to any table; only external fetch is the account-status read with the user's own token; security logs carry request ids, hashed user keys, and reason codes, not message text (`functions/_shared/helpSecurity.js`; `functions/api/help/chat.js:67-211`).
- Migration `20261010000000_security_hardening_db.sql` addresses DB-01 to DB-04 from the earlier review. It does not touch `page_views`, `credit_transactions`, `reactions_public_read`, `mizan_profiles`, `resumes`, or the comments policy (checked by grep).

---

## 2. Reviewed legal and public pages

No duplicate pages were created. Routes and SEO metadata were not changed.

| Route | Component | Content source | Notes |
|---|---|---|---|
| `/privacy` | `src/pages/public/PrivacyPolicyPage.tsx` | `src/content/legal/policies.js` (privacy block) | Does not mention the AI assistant. Contains items 2, 13–16, 20, 23 above. |
| `/cookies` | `src/pages/public/CookiePolicyPage.tsx` | `policies.js` `COOKIE_TABLE` + cookie block | Items 14, 15, 18 above. GA loading behaviour (§5, R7). |
| `/terms` | `src/pages/public/TermsPage.tsx` | `policies.js` (terms block) | "Free" wording (#26); deletion wording (#4). |
| `/guidelines` | `src/pages/public/GuidelinesPage.tsx` | `policies.js` | Community rules; not reviewed in depth. |
| `/contact` | `src/pages/public/ContactPage.tsx` | hard-coded `contact@mizan.page` (via `CONTACT_EMAIL`) | 2–5 working day promise (#25). |
| `/about`, `/faq` | `AboutPage.tsx`, `FAQPage.tsx` | page-local text | Not reviewed for statements in this pass. |
| `/help` | `src/pages/public/HelpPage.tsx` | page-local text | Assistant disclaimer present: "المساعد يجيب من محتوى الموقع فقط، ولا يقدم استشارة قانونية في حالتك الشخصية." |
| Copyright | `src/layouts/PublicNavigation.tsx:379` (footer) and `policies.js` copyright block (~line 808) | footer string + policy text | Footer: "© <year> ميزان الرقمية — جميع الحقوق محفوظة". Policy text lacks Law 2-00 (#22). |
| Privacy-request route | `policies.js` (email to `CONTACT_EMAIL`, "طلب حذف حساب - GDPR") | e-mail | No in-app export, rectification, or opposition form was found in this pass. |

---

## 3. Data-flow and provider inventory

"Provider" means a service that receives or hosts data, as shown by code or CSP. Locations are **unverified** unless stated.

| Provider / service | What reaches it | Triggered by | Code evidence | Location / transfer status |
|---|---|---|---|---|
| **Supabase** (Auth, Postgres, Storage, Edge, cron) | Accounts, profiles, quiz data, comments, reactions, page views, payments, consents, audit rows, CV files | Almost every authenticated and many anonymous actions | `src/lib/supabase*`; `index.html`/CSP `connect-src` lists the project host | **Region unknown.** CNDP guidance treats storage on servers abroad as a transfer request (§6). OWNER CONFIRMATION REQUIRED. |
| **Cloudflare** (Pages hosting, Pages Functions, KV, Turnstile, logs) | Request metadata (IP, UA, path), rate-limit keys, consent-independent logs, Turnstile tokens and `remoteip` | Every request; signup, comments, help chat | `public/_headers`; `functions/_shared/guard.js:69-92, 190-192`; `functions/api/*` | Global edge; **region of KV and log retention unknown**. Turnstile receives client IP (#21). |
| **Google Analytics** (ID from `VITE_GA_ID`) | Pseudonymous browser identifiers, page URLs, Consent Mode state | Script load after first interaction or idle; `gtag` default `analytics_storage: denied` | `src/lib/analytics/gtag.ts:53-73`; CSP `script-src`/`connect-src` lists Google hosts | **Transfer to Google (outside Morocco).** Script is fetched before the user's choice (§5, R7). |
| **Stripe** (conditional) | Purchaser data, Stripe customer/subscription ids, webhook events | Only when checkout routes are enabled and configured | `functions/api/billing/checkout.js`, `pro-checkout.js`, `webhook.js`; `shared/billing/stripe.js`; `.env.example:105-110` | **Transfer to Stripe (outside Morocco, likely)**; enablement unknown (#26). |
| **Machine translation** (Google gtx, MyMemory, Lingva instances, LibreTranslate optional) | Article text chosen for translation (public content); no visitor IP forwarded | User clicks translate on an article | `functions/api/translate.js:82, 142, 181-215`; `shared/i18n/providers.js:198-276`; CSP `connect-src` | **Transfer / third-party processing (outside Morocco).** Public Lingva instances are third-party community services (#11). |
| **Google OAuth / Google sign-in** | Email, profile basics on sign-in | User chooses "Google" | `src/lib/auth/*`; `src/pages/auth/LoginPage.tsx:285` | Scope and Google-side handling unverified (prior audit B1). |
| **Google Gmail API** (not active) | Would read support mailbox | Admin only, but currently mock | `src/lib/integrations/gmailService.ts:91, 323-429` | **Not active.** Mock token only (#18). |
| **Google Search Console** (admin) | URL inspection with page URLs | Admin only | prior audit B16 | Not re-verified. |
| **Font and asset hosts** | None (fonts self-hosted: `font-src 'self' data:`) | — | `public/_headers` CSP | No font-provider transfer found. |
| **Cloudflare R2** (`*.r2.dev`, `r2.cloudflarestorage.com` in CSP) | Uploaded images/files, if used | Uploads (not traced this pass) | `public/_headers` CSP | Use and content unverified. |

**AI processing.** The help assistant runs deterministic code in the Function (`shared/help/*`). Verified: no external AI API call in `functions/api/help/chat.js` (its only fetch is the account-status read). The question therefore does **not** leave Mizan's infrastructure for an AI vendor. This does **not** remove transfer questions for the infrastructure that runs it (Cloudflare, Supabase), as the task requires. Location of that infrastructure is unverified.

---

## 4. Data inventory by category

Columns follow the requested fields: purpose, authenticated or not, storage and processing location, access, retention and deletion, external providers and transfers. "Retention" states only what the repository establishes.

| Category | Fields / tables | Purpose (as stated in code) | Who can create it | Who can read it (per migrations) | Storage / location | Retention and deletion (verified) | Providers / transfers |
|---|---|---|---|---|---|---|---|
| Account and authentication | `auth.users` (email, provider), session token in `localStorage` key `AUTH_STORAGE_KEY` | Sign-in | User | User (own) | Supabase Auth — **region unknown** | Soft delete → 30-day window → Auth delete **not scheduled** (#4) | Supabase; Google if used; Turnstile at signup |
| Profile (private) | `profiles` (email, bonus credits, referral, `last_ip_address` — #13) | Account operation | User | Owner only (`profiles_select_policy`) | Supabase Postgres | In `DELETED_TABLES`; depends on #4 and #5 | Supabase |
| Profile (public subset) | `mizan_profiles` (username, display name, avatar, role, rank, XP, badges, city, bio, years, interests, occupation, etc.) | Public profile and leaderboard | User | **Anyone**, row-level only (`is_public = true`), all columns (#3) | Supabase | In `DELETED_TABLES` | Supabase |
| Resume and CV | `resumes` (headline, summary, skills, education, experience, `cv_file_path`, `is_public`), storage bucket `cv-files` | Public resume and CV file | User (authenticated) | Owner; **public when `is_public`** (#6) | Supabase Postgres + Storage | `resumes` **not** in `DELETED_TABLES` (#20); cascade from `mizan_profiles` only; storage objects not cleaned by cascade | Supabase |
| Consent evidence | `legal_consents` (document, policy version, method, `user_agent`, time) | Proof of acceptance | User at signup | Owner (`legal_consents_owner_select`) | Supabase Postgres | In `DELETED_TABLES`; counsel to decide if evidence must be kept (§11) | Supabase |
| Learning progress | `quiz_attempts`, local `mizan:quiz:progress:v1/v2` + checksum | Progress and ranks | Authenticated insert with limits; **anon direct insert denied** (`quiz_attempts_no_direct_anon_insert`, `WITH CHECK (false)`, 2026-09-20) | Admin read policy; owner sync path | Browser `localStorage` + Supabase | `quiz_attempts` in `DELETED_TABLES`; local data remains until cleared | Supabase |
| Reactions and anonymous id | `reactions` (`user_ref`, `target_id`, type), local `mizan:anon:user_ref:v1` | Likes, saves | Anonymous and authenticated | **Public read** `USING (true)` (#7) | Supabase + `localStorage` | In `DELETED_TABLES`; local id kept "until sign-in" | Supabase |
| Public comments | `comments` (author name free text, content, `client_ip_hash`, `user_agent`, approval) | Public discussion | Anonymous (Turnstile + rate limit) | Public read of approved rows | Supabase | IP/UA provenance cron 90 days, conditional on `pg_cron` (#12). Comment content: no retention stated. | Supabase; Turnstile (`remoteip`) |
| Reports and moderation | `reports`, `moderation_actions` | Community moderation | Authenticated | Admin | Supabase | `reports` in `DELETED_TABLES`; `moderation_actions` retained (policy: "بلا بيانات تعريفية" — #16) | Supabase. Reported text may describe third parties — see §7 (sensitive/allegation data). |
| Page-view analytics | `page_views` (visitor id, session id, path, referrer, UA), `interaction_events` | Visit counts | **Anonymous insert** `WITH CHECK (true)`; the browser always sends it (no consent gate) | **Any authenticated user** (#1) | Supabase | Cron cleanup at 180 days if `pg_cron` present (#12) | Supabase |
| Google Analytics | `_ga`, `_ga_*` (cookies set by Google tag) | Analytics | Browser (after load) | Google | Google | Per Google settings (not verified) | **Google** (transfer) |
| Payments and credits | `payments`, `credit_transactions`, `payment_risk_events`, `transactions` (schema), Stripe ids | Purchases, ledger, fraud review | Authenticated (plus manual flow) | Owner read on `payments`; **`credit_transactions` public read (#2)** | Supabase | Anonymisation RPC exists; **scheduling unverified**; accounting-retention citation unverified (#23) | Stripe if enabled |
| AI help assistant | Question text (not stored), quota counters (`rl:` keys with user id; lockout keys with hashed user id), security log lines (request id, hashed user key, reason code) | Answering site questions | Anonymous (IP limit) or authenticated (account gate) | Not stored in any table | Cloudflare KV and Function logs — **retention unverified** | No conversation storage (verified) | None external (verified) |
| Machine translation | Article text sent to providers; cached response in Cache API | Translation of public articles | Anonymous | Not stored by Mizan tables | Cloudflare Cache API; providers | Cache TTL not verified | Google / MyMemory / Lingva / LibreTranslate |
| Security and rate limiting | IP fingerprint (`fingerprint`), rate-limit keys, `rate_limit_events` (`ip_hash`), signup risk | Abuse prevention | System | Admin/server | Cloudflare KV, Supabase | Not established (except comments cron) | Cloudflare |
| Server logs | Console warnings incl. **raw IP** in `comments.js:55` (#8); security events | Operations | System | Cloudflare log access | Cloudflare logs | **Retention unverified** (owner) | Cloudflare |
| Audit logs | `audit_logs` (user id, full old/new `profiles` rows, `inet_client_addr()`), `admin_audit_logs` | Accountability | System (trigger on `profiles` UPDATE/DELETE) | Admin | Supabase | **No retention job**; FK blocks Auth delete (#5) | Supabase |
| Gmail / support mailbox | Local mock token and status; no real mailbox read | Admin support (planned) | Admin | Admin | Browser `localStorage` (mock) | Mock | Google (not active) |
| Account deletion request | `profiles.account_status`, `pending_deletion` date, deletion reason (URL) | Soft delete | User | Owner / admin | Supabase; browser history / server URL logs (#19) | 30-day window | Supabase |

---

## 5. CNDP requirements matrix

**Status key:**
- **VERIFIED-STATUTE**: text verified in the official Law 09-08 consolidated text (§6).
- **VERIFIED-CNDP**: text verified on an official CNDP page (§6).
- **VERIFIED-CODE** / **VERIFIED-MIG**: verified in the repository; migration evidence is not live evidence.
- **OWNER**: fact needed from the operator, with documentary proof.
- **COUNSEL**: legal interpretation required. Not concluded here.
- **NOT TRIGGERED**: no feature found that triggers it. Not a proof of absence.

| ID | Requirement | Source | Status | Evidence / gap |
|---|---|---|---|---|
| R1 | Notify processing to the CNDP before implementation (declaration, or authorisation where required); receipt delivered within 24 hours | Law 09-08 Arts 12(2), 13–14, 19; CNDP "Notifier un traitement" | **OWNER** — no receipt number in repo; **do not claim a declaration exists** | No `récépissé` or authorisation number in repo, pages, or docs (grep). |
| R2 | Correct form (F214 simplified vs F211 normal; F112/F113 authorisation) | CNDP "Notifier un traitement" page | **COUNSEL / CNDP clarification** | The F214 page title conflicts with the "simplified" label on the same CNDP page (prior audit, Summary item 1). A draft clarification request exists, unsent: `docs/audits/cndp-follow-up-checklist-and-f214-f211-draft.md`. |
| R3 | Authorisation before processing **sensitive data** (origin, political, religious or philosophical opinions, union membership, health, genetic) | Law 09-08 Arts 1(3), 12(1)(a), 21; CNDP notify page | **COUNSEL** — voluntary entries (comments, CV summary, reports) could contain sensitive data | Form fields are free text; no sensitive-data classifier or warning was found. Whether intentional processing exists: OWNER. |
| R4 | Authorisation for **conviction/offence/safety-measure data** (only public bodies and judicial auxiliaries may process it) | Law 09-08 Arts 12(1)(d), 49; CNDP notify page | **COUNSEL** — reports and comments may describe alleged offences | `reports` and comments are free text. No classifier or refusal rule was found (`reports` migration/prior audit B11). Recommend a counsel decision on handling and on the notice. |
| R5 | Authorisation where processing uses the **national ID number (CIN)** | Law 09-08 Art 12(1)(e) | **NOT TRIGGERED on current evidence; COUNSEL to confirm for CV uploads** | No CIN field in forms or `resumes` schema. CV files are uploaded documents whose content is not inspected. |
| R6 | Information at collection: identity of controller, purposes, recipients, mandatory/optional answers, rights, receipt number | Law 09-08 Art 5(1); CNDP website guide §4 | **OWNER (identity, receipt) + partially VERIFIED-CODE** | Policies name "ميزان الرقمية" and a contact e-mail; no legal entity, registration, or address found. Purposes are listed. Receipt number absent (R1). |
| R7 | Consent: free, specific, informed, explicit (`indubitablement`); no pre-ticked box; consent before cookies using personal data | Law 09-08 Arts 1(9), 4, 21(2); CNDP guide §4 and §10 | **Partially VERIFIED-CODE** — signup box unchecked (good). Analytics: GA script loads before choice (`gtag.ts:53-73`); page-view writer has no consent check (`useTrackView.ts`). | **COUNSEL** on whether GA loading before consent and the `visitor_id` localStorage key comply with CNDP §10. Recommend consent-gated load and writer before any compliance claim. |
| R8 | Data quality and minimisation (adequate, relevant, not excessive) | Law 09-08 Art 3(1)(a)–(d) | **COUNSEL + VERIFIED-CODE gaps** | `audit_logs` full row snapshots (#16); comment `user_agent` (#12); `page_views.referrer` and `user_agent`; `legal_consents.user_agent`. |
| R9 | Retention limited to need; declaration must state duration | Law 09-08 Arts 3(1)(e), 15(f), 55; CNDP guide §8 | **OWNER** | Only page views (180 d) and comment provenance (90 d) have code-defined periods, conditional on cron (#12). No period for comment content, audit logs, reports, payments, or legal consents. Policy gives no periods. Do not state periods until confirmed. |
| R10 | Access right, free and without delay | Law 09-08 Art 7 | **PARTIAL** — e-mail route only | No user-facing access export found in this pass. An admin route `userdata` exists (`src/routes/AppRoutes.tsx`); its export behaviour was not verified. |
| R11 | Rectification or erasure, free, within 10 days | Law 09-08 Art 8(a) | **PARTIAL** | Profile edit exists (VERIFIED-CODE, `MyProfilePage.tsx`). Erasure path is soft delete with unscheduled purge (#4). Policy SLA (#25) must be aligned by the operator. |
| R12 | Opposition, free, for legitimate reasons; opposition to prospection free | Law 09-08 Arts 9, 10 | **NOT TRIGGERED on current evidence** | No marketing-e-mail code found (grep for newsletter/unsubscribe/prospection; hits unrelated). Confirm with operator. |
| R13 | Security measures appropriate to risk | Law 09-08 Art 23(1); Art 58; CNDP guide §7 | **VERIFIED-MIG issues** (#1–#3, #7, #8, #9, #10) | Live RLS not verified. Several migration policies are broader than the stated design. |
| R14 | Processor selection and processing contract (DPA) | Law 09-08 Art 23(2)–(3); CNDP guide §7 | **OWNER** | Supabase, Cloudflare, Stripe, Google, translation providers: no DPA in repo. |
| R15 | Transfers outside Morocco: adequate protection, express consent, or CNDP authorisation; declare foreign transfers | Law 09-08 Arts 15(e), 43, 44, 60; CNDP transfer page; CNDP guide §3 | **OWNER + COUNSEL** | The CNDP guide says hosting on servers abroad triggers a transfer request. Supabase, Cloudflare, Google, Stripe, and the translation providers are probably or possibly abroad, but no region is in the repository. CNDP also says a transfer request is handled only after the underlying processing is approved (F118 page). **Do not claim transfers are lawful.** |
| R16 | Direct marketing rules | Law 09-08 Art 10 | **NOT TRIGGERED** (see R12) | — |
| R17 | Data subjects informed of risks of open networks | Law 09-08 Art 5(4) | **COUNSEL** | Not in policy text. Recommend wording review. |
| R18 | Minors | No Moroccan minors' rule verified in this pass | **COUNSEL** | No age question or gate found (grep: `قاصر|minor|date_of_birth`). Platform is for students; age profile unknown. |
| R19 | Privacy notice in general terms | CNDP guide §4 | **VERIFIED-CODE (exists)** with content gaps (§8) | `/privacy`, `/cookies`, `/terms` exist. |
| R20 | CNDP clause "traitement notifié… récépissé n°" | CNDP guide §5.1 | **OWNER** — do not add until R1 proven | — |
| R21 | Cookies: purpose, means to refuse, consent before non-essential cookies | CNDP guide §10; Law 09-08 Art 4 | **Partially VERIFIED-CODE** — banner exists; `mizan-cookie-consent` key; GA loads pre-choice; localStorage `visitor_id` written unconditionally (`useTrackView.ts:9-15`). | **COUNSEL** on classification of localStorage identifiers as cookies for CNDP purposes. |

**Verified conflicts with the published notice** (summary of #6, #13–#16, #18, #20, #26): the notice currently says things the code does not do, or does not say things the code does. These must be fixed or justified before any compliance claim is made.

---

## 6. Law references: verified statute vs recommendation vs legal-review question

### 6.1 Verified statutory text (official sources read this pass)

| Instrument | Provision | What the text says (paraphrase) | Source |
|---|---|---|---|
| Law 09-08 (Dahir 1-09-15, 22 safar 1430 / 18 Feb 2009) | Art 1(1), 1(3), 1(5), 1(6), 1(9), 1(10) | Definitions: personal data (including sound and image; identifiable persons, including by identification number or specific elements), sensitive data, controller, processor, consent (free, specific, informed), communication. | CNDP-hosted BO PDF (§9) |
| Law 09-08 | Art 2(2)(a)–(b), 2(4) | Applies when the controller is established in Morocco, or uses means located in Morocco; does not apply to purely personal or domestic processing or to defence and security processing. | same |
| Law 09-08 | Art 3(1)(a)–(e) | Lawful, purpose-limited, adequate and non-excessive, accurate, and kept only as long as needed for the purposes. | same |
| Law 09-08 | Art 4 | Processing only if the data subject has **unambiguously** consented, unless another ground applies (legal obligation, contract, vital interest, public interest, legitimate interest of the controller or recipient, subject to rights). | same |
| Law 09-08 | Art 5(1)–(4) | Prior express, precise, unambiguous information: controller identity, purposes, recipients, whether answers are mandatory, rights, and the declaration/authorisation receipt. Forms must carry it. Open networks: information unless the person already knows. | same |
| Law 09-08 | Art 7, 8, 9 | Access (free, without delay), rectification/erasure/locking (free, within ten days), objection for legitimate reasons. | same |
| Law 09-08 | Art 10 | Direct prospection by e-mail only with prior consent, with an easy opt-out. | same |
| Law 09-08 | Art 12(1)(a)–(f), 12(2) | Authorisation for sensitive data, further-purpose use, genetic data, **offence/conviction/safety-measure data**, **national ID number**, and certain interconnections; declaration otherwise. | same |
| Law 09-08 | Art 13–15 | Declaration content: controller identity and address; purposes; categories of data and persons; recipients; **foreign transfers**; **retention duration**; rights service; security summary; subcontracting. Changes must be notified "sans délai". | same |
| Law 09-08 | Art 19–20 | Receipt within 24 hours; processing may start on receipt; the CNDP may require authorisation within 8 days if there are manifest dangers. | same |
| Law 09-08 | Art 21 | Sensitive data: authorisation, granted on express consent or where processing is indispensable to legal or statutory functions; other grounds listed in 21(3). | same |
| Law 09-08 | Art 23(1)–(3) | Appropriate technical and organisational security; choose compliant processors; written processing contract. | same |
| Law 09-08 | Art 43, 44 | Transfer only to a State with sufficient protection; derogations include express consent, contract, public interest, and CNDP express authorisation (44(3)). | same |
| Law 09-08 | Art 49 | Offence and conviction data may be processed only by courts, public authorities, public-service bodies in their remit, judicial auxiliaries, and the copyright body. | same |
| Law 09-08 | Art 53, 55, 57, 58, 60 | Penalties include refusal of rights (53), over-retention (55), processing without express consent for sensitive data (57), security failures (58), unlawful transfer (60). | same |
| Law 2-00 (copyright, as amended) | Art 8(a) | Protection does not extend to official legislative, administrative, or judicial texts or their official translations. | WIPO Lex (§9) — **secondary-hosted text; verify on the BO** |
| Law 31-08 (consumer protection) | Art 1–2 | Defines consumer (natural or legal person acquiring or using goods or services for non-professional needs) and supplier (any person acting in a professional or commercial capacity); suppliers must inform on prices and service terms. | WIPO Lex (§9) — snippet-level verification |
| Law 05-20 (cybersecurity) | Art 1 (official BO) | Sets security rules for: State and public entities (designated "entité"); vital-infrastructure operators; and "opérateurs" including telecom operators, ISPs, cybersecurity service providers, **digital service providers** and **publishers of Internet platforms**. | DGSSI-hosted BO PDF (§9) |
| Law 05-20 | Art 2 (official BO) | Defines "prestataire de services numériques" (including online services that let consumers or professionals conclude sale or service contracts, and search and cloud/hosting services) and "hébergement". | same |
| Commercial Code (Law 15-95) | Art 26 | Retention of **correspondence** for ten years — as found in a secondary copy. **Not verified on official text.** The payments citation in policy needs correction (#23). | secondary copy (§9) |
| Accounting law (Law 9-88) | Ten-year retention for accounting documents | Reported in secondary sources only. **Not verified on official text.** | secondary sources (§9) |

### 6.2 CNDP guidance (official CNDP pages, read this pass)

- **Website guide** (`/conformite-des-sites-web/`): notify before processing (declaration or authorisation); transfer request for servers abroad; informed-collection content; mandatory processor contract; retention; no pre-ticked consent box; consent before cookies that use personal data; explain how to refuse cookies.
- **Notify a processing** (`/notifier-un-traitement/`): declaration required for all processing unless excluded, exempt, or subject to authorisation; authorisation required for sensitive data, offence/conviction data, national ID number, purpose change, genetic data, and interconnection. Forms F214 (described as simplified), F211 (normal), F113/F112 (authorisation), F118 (transfer). Receipt within 24 hours; decision on authorisation within 8 days of a declaration; 2 months for authorisation and transfer opinions.
- **Transfers abroad** (`/transfert-de-donnees-a-letranger/`): transfer only to countries on the CNDP list (deliberation 236-2015) or under the Article 44 cases; a transfer authorisation is granted only after the underlying processing has an approved declaration or authorisation.

### 6.3 Recommendations, not statutory requirements

- Publish a page that lists processors and their regions once confirmed (good practice, supports R14–R15).
- Align public SLA text with statutory timings (ten days for rectification under Art 8).
- Remove the unverified "automatic" purge claim until a scheduled job exists and has run (aggregate evidence only).
- Avoid "fully free" or "no sales" marketing claims until billing status is confirmed.

### 6.4 Legal-review questions (not concluded)

1. Whether Law 05-20 Article 1 operator duties apply to Mizan as an "éditeur de plateforme Internet" or "prestataire de services numériques", and which obligations follow.
2. Whether the free service is a supply to a "consumer" under Law 31-08, and whether live paid features change that.
3. Whether Google Analytics loading before consent, and the localStorage `visitor_id`, comply with CNDP §10 and Law 09-08 Art 4.
4. Whether comments, reports, and CV content can contain sensitive data or offence data, and what handling is required (R3–R4).
5. Whether the accounting and commercial retention rules support the payment-record retention wording, and which article applies.
6. Whether "consent evidence" (`legal_consents`) may be erased in a deletion, or must be kept as proof.
7. Whether minors are in the user base and what Law 09-08 requires for them (R18).
8. Whether Law 53-05 (electronic exchange of legal data) applies. No e-signature or certification feature was found in `src/`, `functions/`, `shared/`, or migrations (grep). Not concluded.

---

## 7. Technical vulnerabilities and gaps

Live status is **OWNER CONFIRMATION REQUIRED** for every item. Fixes are described, not applied. Any migration must be staged first (see the earlier CV-01 decision and the security brief: stage, approve, then production; forward-fix only).

| ID | Severity | Gap | Evidence | Recommended direction (not applied) |
|---|---|---|---|---|
| T1 | High | `page_views` readable by every authenticated user (#1). Anonymous users can also insert rows (`WITH CHECK (true)`), enabling data-poisoning. | `20260828224315_create_page_views_analytics.sql:40-56` | Restrict `SELECT` to the admin role, or expose aggregates through a definer function. Keep anon insert only if it is needed. Test admin dashboard on staging first. |
| T2 | High | `credit_transactions` public `SELECT USING (true)` (#2). | `20260921000000_payments_and_credits.sql:99-100` | Restrict read to owner and admin, as in the earlier `owner reads own credit transactions` policy. Check the two conflicting table definitions (prior audit B12) before any change. |
| T3 | High | `mizan_profiles` direct anon read exposes all columns of public rows (#3). Browser masking only. | `20260914000000_quiz_engine_and_rpg.sql:240-244`; `src/lib/profiles/service.ts:96-130, 415-436` | Use an RPC or view that exposes only the public subset (a `get_public_profile` function exists in `20260917000000` at line 388; its output columns were not reviewed, so verify it before relying on it). Add column-level restrictions and switch the front end to it. |
| T4 | High | Account purge not scheduled in the repository (#4). | Absence of `cron.schedule` for the purge; `DEPLOY-SUPABASE.md:478` manual check | Owner confirms whether a schedule exists in the Supabase dashboard. If not, implement only after T5 and on staging. Do not run the purge against production without approval. |
| T5 | High (latent) | `audit_logs_user_id_fkey` has no `ON DELETE` clause (#5). The deletion request updates `profiles`, which fires the audit trigger. | `20260823182123_remote_schema.sql:290-296, 1263, 1311` | Choose a policy for audit rows (set `user_id` to null on delete, or anonymise). Stage and test with a disposable account. Do not change production without approval. |
| T6 | High (contradiction) | Resume publication vs "CV never published" (#6). CV files are in `cv-files`; the 2026-10-11 migration makes the bucket private and serves files via signed URL. Its status is unverified. | `src/content/legal/policies.js:68-76`; `ResumeEditor.tsx:146`; `20261011000000_cv_files_private_bucket.sql` | Product decision: keep publication and correct the notice, or disable publication. Keep CV-01 staging rule: **do not apply `20261011000000` to production without approval**. |
| T7 | Medium | `reactions` public read exposes `user_ref` (#7). | `20260922000000_reactions.sql:9, 70-71` | Expose counts only (view or function). Remove `user_ref` from public select. |
| T8 | Medium | Raw IP in logs (#8). | `functions/api/comments.js:55` | Log only the hashed value (or nothing). Do not log IP in plain text. |
| T9 | Medium | Unsalted hash fallback (#9). | `functions/_shared/guard.js:69-73`; `signup-risk.js:31`; `comments.js` | Fail closed when `IP_HASH_SALT` is missing, or use a keyed HMAC. Owner confirms production setting. |
| T10 | Medium | Raw user id and raw client IP used as rate-limit keys (#10). | `functions/_shared/guard.js:88`; `account/delete.js:58`; `r2/presign.js:132`; `r2/delete.js:55`; `translate.js:165` | Hash every key with a server-side secret before use; keep the key namespace bucket-specific. |
| T11 | Medium | Open translation proxy accepting arbitrary text; third-party providers (#11). | `functions/api/translate.js:34-36, 181-200`; `shared/i18n/providers.js` | Restrict input to published article identifiers, or add a per-IP budget and disclose providers. Remove public Lingva instances if not needed. |
| T12 | Medium | Retention jobs depend on `pg_cron` (#12). | Migration `IF EXISTS (pg_extension)` guards | Owner confirms `pg_cron` and job list. Add an aggregate check to the operational checklist. |
| T13 | Medium | Gmail connector writes a mock token to `localStorage` and upserts `access_token_encrypted`, which is **not** a column in the `integrations` table (the schema has `encrypted_token`). The upsert fails silently. | `src/lib/integrations/gmailService.ts:233-266`; `20260916120000_schema_gap_fixes.sql:41-51` | Keep disabled until a real OAuth design exists. Any future token must be server-side and encrypted; never in `localStorage`. |
| T14 | Low | Deletion reason in URL query (#19). | `DeleteAccountSection.tsx:93`; `delete.js:74-84` | Send reason in the JSON body. Keep the 500-character cap. |
| T15 | Low | Turnstile `remoteip` to Cloudflare (#21). | `functions/_shared/guard.js:190-192` | Disclose. Consider omitting `remoteip` if the Turnstile check does not need it. |
| T16 | Info | `dist/` contains no `service_role` string, Stripe secret, or webhook secret; the one JWT decodes to `role: anon`. | `dist/` (not rebuilt) | Re-run the bundle secret scan after each build. |
| T17 | Info | Help assistant does not persist conversations and logs no message text. | `functions/api/help/chat.js`; `functions/_shared/helpSecurity.js`; `src/components/help/HelpChat.tsx:17` | Keep this property; add a test if not present. |
| T18 | Medium | Payment creation endpoints lack visible caller authentication (prior audit B12, not re-verified here). | `functions/api/payments/create.js` (per prior audit) | Follow prior audit recommendation; billing move remains deferred per the user's decision. |
| T19 | Low | `interaction_events` anon insert `WITH CHECK (true)`. | `20260911030000_interaction_tracking_and_audience.sql:106-113` | Rate-limit or restrict; no personal data required. |
| T20 | Medium | Policy/Code mismatch on `last_ip_address`, consent fingerprint, analytics queue, `audit_logs` content (#13–#16). | §1 | Correct text (§8) before any compliance statement. |

**Hardening migration status.** `20261010000000_security_hardening_db.sql` (DB-01 to DB-04) is in the repository. Live application is unverified. The migration does not touch the tables above except `reactions_user_delete` and `audit_logs` anon revoke.

---

## 8. Proposed text changes for existing policy text

**No edits were made** to `src/content/legal/policies.js`, `version.js`, or any page. Reason: several corrections depend on facts only the operator can confirm (purge schedule, `pg_cron` status, page-view consent decision, billing status, provider regions, retention periods). Publishing them now would either repeat unverified claims or remove disclosures before the decision is made. The proposals below are ready to apply once those facts are confirmed. Text in square brackets is a placeholder for an operator fact. Do not replace a bracket with an invented value.

| # | Location (current) | Current text (summary) | Problem | Proposed text (Arabic draft) | Dependency |
|---|---|---|---|---|---|
| P1 | `policies.js:603` and cookie row `mizan:analytics:queue` (~line 102) | Queue flushed every 10 seconds to `/api/analytics` | No caller, no route (#15) | حذف الوصف. أضف: "عند فتح صفحة عامة يُسجَّل صف في جدول زيارات الصفحات في قاعدة بيانات الموقع يتضمن المسار والمرجع ونص وكيل المستخدم ومعرّف زائر ومعرّف جلسة يُخزَّن الأول في متصفحك. مدة الاحتفاظ: [بعد التأكيد]." | Owner decision: consent gate for page views (R7, T1) |
| P2 | `policies.js:381` | `last_ip_address` "(مجردة بملح)" | Field is raw `inet`; no writer found (#13) | احذف الحقل من القائمة، أو اكتب: "حقل عنوان IP للآخر تسجيل دخول محفوظ في المخطط ولا يُملأ حالياً." | Owner confirms no writer (grep done) |
| P3 | `policies.js:382` | "وبصمة المتصفح" | Stored value is User-Agent (#14) | "ونص وكيل المستخدم (User-Agent) الخاص بمتصفحك." | None |
| P4 | `policies.js:420, 515` | "IP مجرد بملح" | Salt presence unverified; no-salt fallback exists (#9) | "يُخزَّن عنوان IP بعد تجزئته (hash) لأغراض الحماية من الإساءة وتحديد المعدل. [تأكيد: ملح التجزئة مضبوط في الإنتاج]." | Owner confirms salt; T9 fixed |
| P5 | `policies.js:206` | "يُحذف حساب auth.users آلياً (مهمة مجدولة، لا إجراء يدوي)" | No schedule in repo (#4) | "بعد انقضاء المهلة تُنفَّذ إجراءات الحذف النهائي: [وصف الجدولة المؤكدة، أو: تُنفَّذ يدوياً على دفعات]." | T4, T5 |
| P6 | `policies.js:208, 209` | Retained tables "بلا بيانات تعريفية" | `audit_logs` keeps user id and profile snapshots (#16) | "سجلات التدقيق الإدارية تحتوي على معرّف الحساب ونسخ من بيانات الملف الشخصي قبل التعديل أو الحذف. مدة الاحتفاظ بها: [محددة من المشغّل]." | Owner decides retention (R9) |
| P7 | `policies.js:48, 208` | "المادة 26 من مدونة التجارة" for ten-year accounting retention | Article 26 text found covers correspondence; accounting rule source unverified (#23) | Replace with "[المرجع القانوني المحاسبي، بعد التحقق من النص الرسمي]" and state the period only once verified. | Counsel verifies (§6.4 Q5) |
| P8 | `policies.js` cookie row `mizan:gmail:token` | "تكامل اختياري" | Simulation, not a live connector (#18) | Remove the row until a real OAuth flow exists, or state: "تكامل Gmail غير مفعّل حالياً؛ لا يُقرأ أي بريد." | Owner confirms no live Gmail read |
| P9 | New section in privacy (after the cookies section) | Missing | AI assistant not described (#17) | "مساعد ميزان (صفحة المساعدة): يُرسل نص سؤالك إلى خادم ميزان لإعداد جواب من محتوى الموقع المنشور. لا يُحفظ نص المحادثة في قاعدة البيانات، ولا تُحفظ في متصفحك بعد تحديث الصفحة. لا يُرسل نص السؤال إلى خدمة ذكاء اصطناعي خارجية. تُسجَّل أحداث أمنية بمعرّفات تقنية ورموز أسباب فقط. تُحفظ عدادات الحدّ من الاستعمال لمدة [محددة من المشغّل]." | None beyond owner confirmation of KV retention |
| P10 | Retention statements | Missing for page views and comment provenance | Verified code periods (#12) | "تُحذف زيارات الصفحات بعد 180 يوماً، وتُحذف بصمات IP وUser-Agent من التعليقات بعد 90 يوماً." | Only after `pg_cron` job confirmed |
| P11 | `policies.js:808` (copyright) | Generic rights statement | Law 2-00 not cited (#22) | "المحتوى التعليمي والتحريري الأصلي لميزان الرقمية محمي بموجب القانون رقم 2-00 المتعلق بحقوق المؤلف والحقوق المجاورة. لا تشمل الحماية النصوص التشريعية والإدارية والقضائية الرسمية ولا ترجماتها الرسمية (المادة 8 أ). [مراجعة نطاق الاستثناء قبل النشر]." | Counsel review |
| P12 | `policies.js:620` ("القانون 09-08") | Law named without reference | Reference is verified (Dahir 1-09-15) | "القانون رقم 09-08 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي، الصادر بتنفيذه الظهير الشريف رقم 1-09-15 بتاريخ 22 صفر 1430 (18 فبراير 2009)." | None |
| P13 | `policies.js` privacy-request paragraphs | "طلب حذف حساب - GDPR" (GDPR wording) | Mixes a GDPR label into a Moroccan notice | Replace "GDPR" with "طلب ممارسة الحقوق (القانون 09-08)". | None |
| P14 | `policies.js:527` | "قبل 15 يوماً" | No mechanism found (#24) | Remove the number unless the operator commits to it: "نُعلن التغييرات الجوهرية على الموقع، ويُشار إلى تاريخ آخر تحديث أعلى الصفحة." | Operator decision |
| P15 | `ContactPage.tsx:58` | "2 إلى 5 أيام عمل" | No SLA mechanism; statute sets ten days for rectification (#25) | "نحاول الرد على طلبات الخصوصية في أقرب وقت. تُنفَّذ طلبات التصحيح في الآجال التي يحددها القانون رقم 09-08." | Operator decision |
| P16 | `policies.js:232, 655, 657` | "المنصة مجانية بالكامل" / "بلا إعلانات" | Billing code exists (#26) | Hold until billing status confirmed. If paid features are off, state it. If on, add supplier information required under Law 31-08 and check Law 05-20 applicability (§6.4 Q1–Q2). | Owner confirms billing |
| P17 | Cookie section (GA) | Consent described | GA loads before choice (R7) | Hold until consent-gated loading is implemented. Then state: "تحليلات Google تُفعَّل فقط بعد موافقتك." | Technical change + counsel (§6.4 Q3) |
| P18 | Privacy "private fields" list (`policies.js:68-76`) | "سيرتك الذاتية" listed under "لا يُنشر أبداً" | Contradicts resume publication (#6) | Either remove the item and explain CV publication as an opt-in, or disable publication (product). | Product decision |
| P19 | Processors and regions section (new) | Missing | R14–R15 | "مزوّدو الخدمات الذين يعالجون بياناتك: [اسم، الدور، المنطقة]. تُنقل بعض البيانات إلى خارج المغرب عند [الحالات المؤكدة]، وفق الشروط القانونية التي [يحددها المشغّل والجهة المختصة]." | Owner facts + counsel |
| P20 | Deletion section | Deletion reason | Reason in URL (#19) | After T14: "قد تُحفظ ملاحظة الحذف (إن كتبتها) مع طلب الحذف." | T14 |

**Items that must not be added** without documentary proof: controller legal entity, registered address, CNDP receipt or authorisation number, CNDP certification or "compliant" statements, retention periods not confirmed by the operator, transfer countries, processor regions.

---

## 9. Official citations and links

Fetched or read this pass. "Official" means published by the issuing body or the Bulletin Officiel host.

- CNDP — Conformité des sites web (guidelines): https://www.cndp.ma/conformite-des-sites-web/ — official, read.
- CNDP — Notifier un traitement: https://www.cndp.ma/notifier-un-traitement/ — official, read (page 1 of 2).
- CNDP — Transfert de données à l'étranger: https://www.cndp.ma/transfert-de-donnees-a-letranger/ — official, read.
- Law 09-08 consolidated text, Bulletin Officiel PDF hosted by CNDP: https://www.cndp.ma/wp-content/uploads/2023/11/Loi-09-08-Fr.pdf — official publication; articles read: 1–23, 29–44 (Articles 24–28 not read), 49, 53–61, 63–67 (in part; chunks 0–3, 5–7 of 8, chunk 4 not read).
- Law 09-08 Bulletin Officiel (Casablanca Bourse copy, same text): https://media.casablanca-bourse.com/sites/default/files/Protection_personnes_physiques_loi0908.pdf — search snippet only.
- Law 05-20 Bulletin Officiel n° 6906 (DGSSI-hosted PDF): https://www.dgssi.gov.ma/sites/default/files/legislative/brochure/2023-03/loi%2005-20.pdf — official, Articles 1–2 read.
- Law 2-00 (copyright), WIPO Lex: https://www.wipo.int/wipolex/fr/legislation/details/19766 — Article 8(a) read in snippet; not the BO text.
- Law 31-08 (consumer protection), WIPO Lex: https://www.wipo.int/wipolex/fr/legislation/details/19773 — Articles 1–2 read in snippet.
- Decree 2-09-165 (implementing Law 09-08), referenced in an Adala PDF: https://adala.justice.gov.ma/api/uploads/2024/04/30/Protection%20des%20personnes%20physiques-1714464099884.pdf — seen in search snippet; not fully read.
- Commercial Code (Law 15-95), Article 26: secondary copy at https://www.studocu.com/row/document/universite-hassan-ii-de-casablanca/procedure-penale/code-de-commerce-marocain/12485028 — **not official; not relied on for any conclusion except the mismatch in #23.**
- Accounting Law 9-88 ten-year retention: secondary commentary only (e.g., https://adala.ai/blog/obligations-comptables-sarl-maroc-2026/ and https://chy.ma/guide-complet-loi-comptable-9-88-maroc/) — **not verified; not used as a source.**

**Not reached:** adala.justice.gov.ma homepage (listed in the brief) was not fetched; the Adala PDF above was reached through search.

---

## 10. Tests executed and results

| Command | Scope | Result |
|---|---|---|
| `npx vitest run tests/legal-pages-agree.test.ts tests/admin-retention-migration.test.ts` | Legal pages agree with each other; retention migration contract | **2 files passed; 70 tests passed (26 + 44); 0 failed.** |

**What these results mean.** They check that the legal pages and migrations are internally consistent. They **do not** check that the published statements are true. Several published statements are contradicted by the code (§1, #6, #13–#16, #18, #20) and the tests still pass. No test was added in this pass; the earlier suite was not extended.

Not run in this pass: full `npm test`, `npx tsc --noEmit`, `npm run build`, any database or staging test, and any browser test. No code changed, so the earlier clarification-layer results (`e3b4e73`) are unaffected.

---

## 11. Questions for the operator and Moroccan counsel

**Operator (facts and documents needed):**
1. Who is the controller (legal entity, registration, registered address)? Who is the contact for privacy requests?
2. Is there a CNDP receipt (récépissé) or authorisation for the site? If yes, provide the number and date. If no, confirm no compliance claim will be made.
3. Which region hosts the Supabase project, storage buckets, Cloudflare KV/Pages logs, and any Stripe account? Provide the DPA and transfer documents you hold.
4. Is the account-purge job scheduled in the Supabase dashboard? Provide its name, owner, schedule, and last successful run (aggregate evidence only). Is `pg_cron` installed?
5. Has the 2026-09-21 `credit_transactions` public read policy and the 2026-08-28 `page_views` read policy been changed in the live database? Provide the live policy export.
6. Were `20261010000000` and `20261011000000` applied to production? Was `20261011000000` tested on staging (CV-01 rule)?
7. Are Stripe checkout and Pro subscriptions live? Are visitors charged anywhere? Is "free" still accurate?
8. Is `IP_HASH_SALT` set in production, and is it distinct per environment?
9. Are the Gmail, Google sign-in, and any mail-provider paths live? Which mail provider sends the contact replies?
10. What are the Cloudflare KV and log retention settings? What are the Supabase backup and log retention settings?
11. Are minors allowed to register? Is an age question planned?
12. Is the site meant to publish CVs publicly (resume feature), or should publication be disabled?
13. Who is allowed to read reports, and how long are they kept? Do reports contain third-party allegations?
14. Is there a form or export for access requests (Law 09-08 Art 7)? How are rectification requests handled within ten days?

**Moroccan counsel (interpretation):**
1. Does Law 09-08 apply to the operator under Art 2 (establishment or means in Morocco)?
2. Which CNDP form applies (F214 vs F211; F112/F113), and what should be asked of the CNDP given the conflict on the CNDP page?
3. Does the site collect sensitive data (Art 1(3), 21) or offence/conviction data (Art 12(1)(d), 49) through comments, reports, or CVs, and what must be done?
4. Are the Google Analytics load before consent and the localStorage `visitor_id` compliant with the CNDP cookie guidance and Art 4? What consent design is required?
5. Are foreign transfers (Supabase, Cloudflare, Google, Stripe, translation providers) covered by Art 43/44, and is an F118 request needed? Can the operator rely on Art 44 consent for any transfer?
6. Should consent evidence (`legal_consents`) be retained after deletion as proof?
7. Which accounting or commercial retention rule applies to payment and audit records, and what is the correct article?
8. Does Law 05-20 Article 1 apply to Mizan (as an "éditeur de plateforme Internet" or "prestataire de services numériques"), and does it impose incident notification or audit duties?
9. Does Law 31-08 apply to the free service and to paid features if enabled?
10. Does Law 53-05 apply to any planned feature?
11. Is the copyright exclusion in Law 2-00 Art 8(a) correctly stated for official texts republished with commentary or translation?

---

## 12. What was not done (explicit)

- No deployment to any environment.
- No database command, migration apply, or production test.
- No CNDP filing, form, or correspondence. The draft clarification request in `docs/audits/cndp-follow-up-checklist-and-f214-f211-draft.md` was not sent.
- No claim that a CNDP declaration, authorisation, or receipt exists.
- No edit to `src/content/legal/policies.js` or any public page (§8 explains why).
- No edit to any migration, function, or configuration.
- The earlier clarification-layer commit `e3b4e73` was not changed.
