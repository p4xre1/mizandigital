# خريطة الملفات — ما يجب إضافته وما يجب تعديله على فرع abdo

مقارنة فعلية بين `origin/abdo` (00946b2)
و HEAD (4330f67).

⚠ المستودع **shallow clone** و`git merge-base` فارغ، فلا يمكن عمل merge
ثلاثي. الأرقام أدناه مقارنة أشجار مباشرة، وهي صحيحة لهذا الغرض.

✅ لا شيء من abdo سيُفقد: الملفات الستة الناقصة عندي هي ملفات الإعلانات
التي حُذفت عمداً. و`clerk-react/` (18 ملفاً) و`.github/` (5 ملفات) متطابقة
في الفرعين. إجمالي الملفات: 319 في abdo → 354 في فرعي.

---

## 1) ملفات جديدة — 41 ملفاً (أضِفها كما هي)

```
./
    DEPLOY-SUPABASE.md   (8 KB)
    vite.preview.config.ts   (827 B)
deploy/
    paste-1.sql   (142 KB)
    paste-2.sql   (5 KB)
functions/_shared/
    clerk.js   (7 KB)
functions/api/account/
    delete.js   (3 KB)
functions/api/billing/
    checkout.js   (12 KB)
    pro-checkout.js   (6 KB)
    webhook.js   (24 KB)
shared/billing/
    risk.js   (8 KB)
    stripe.js   (14 KB)
src/components/billing/
    MizanProCard.tsx   (7 KB)
    ProUpgradeCard.tsx   (8 KB)
src/components/reactions/
    ReactionBar.tsx   (8 KB)
src/lib/admin/
    previewData.ts   (5 KB)
    previewMode.ts   (1 KB)
    useAdminRpc.tsx   (5 KB)
src/lib/analytics/
    interactionTracker.ts   (10 KB)
src/lib/billing/
    useSubscription.ts   (4 KB)
src/pages/admin/
    FraudPreventionPage.tsx   (11 KB)
    IntelligencePage.tsx   (22 KB)
    LimitsMonitoringPage.tsx   (8 KB)
    PricingManagementPage.tsx   (14 KB)
    UserDataPage.tsx   (14 KB)
    UsersManagementPage.tsx   (11 KB)
src/pages/public/
    PricingPage.tsx   (2 KB)
    SavedContentPage.tsx   (8 KB)
supabase/migrations/
    20260911010000_add_news_updated_at_trigger.sql   (4 KB)
    20260911030000_interaction_tracking_and_audience.sql   (18 KB)
    20260911040000_stripe_billing_and_entitlements.sql   (17 KB)
    20260915000000_admin_analytics_and_payment_risk.sql   (34 KB)
    20260916000000_mizan_pro_subscriptions.sql   (18 KB)
    20260917000000_profiles_governance_and_plans.sql   (27 KB)
    20260918000000_content_reactions_and_onboarding.sql   (12 KB)
    20260919000000_user_role_add_member.sql   (2 KB)
    20260919010000_user_role_default_member_and_demote.sql   (4 KB)
    20260920000000_protect_progression_and_quiz_answers.sql   (10 KB)
tests/
    billing-clerk.test.ts   (9 KB)
    billing.test.ts   (20 KB)
    jsonld-escape.test.ts   (1 KB)
    reactions.test.tsx   (3 KB)
```

---

## 2) ملفات موجودة — 36 ملفاً (استبدِل محتواها)

```
./
    .env.example   (6 KB)
    SECURITY.md   (14 KB)
    package.json   (1 KB)
    pnpm-lock.yaml   (112 KB)
    vite.config.ts   (2 KB)
public/
    _headers   (3 KB)
scripts/
    generate-sitemap.mjs   (10 KB)
    prerender.mjs   (62 KB)
src/components/
    CookieConsentBanner.tsx   (2 KB)
src/components/articles/
    ArticleContent.tsx   (6 KB)
    CommentSection.tsx   (13 KB)
src/components/features/
    PdfToMarkdownTool.tsx   (15 KB)
src/components/home/
    HomeFaqSection.tsx   (5 KB)
src/components/layout/
    AdminSidebar.tsx   (6 KB)
src/components/onboarding/
    OnboardingModal.tsx   (11 KB)
src/components/seo/
    SchemaOrg.tsx   (1 KB)
src/hooks/
    useTrackView.ts   (4 KB)
src/layouts/
    PublicLayout.tsx   (574 B)
src/lib/onboarding/
    api.ts   (2 KB)
src/lib/quiz/
    profileService.ts   (6 KB)
src/lib/utils/
    cookieConsent.ts   (1 KB)
src/pages/public/
    ArchivePage.tsx   (22 KB)
    ArticlePage.tsx   (34 KB)
    CookiePolicyPage.tsx   (9 KB)
    DownloadGatePage.tsx   (7 KB)
    EventPage.tsx   (17 KB)
    MyProfilePage.tsx   (32 KB)
    PdfDownloadPage.tsx   (11 KB)
    PrivacyPolicyPage.tsx   (8 KB)
    SchoolPage.tsx   (16 KB)
    TermPage.tsx   (18 KB)
    TermsPage.tsx   (8 KB)
src/routes/
    AppRoutes.tsx   (14 KB)
src/types/
    database.types.ts   (12 KB)
    quiz.ts   (6 KB)
supabase/functions/onboarding/
    index.ts   (6 KB)
```

---

## 3) ملفات تُحذف — 6 ملفاً

```
    public/ads.txt
    public/ads/frame.html
    src/components/ads/AdsterraAd.tsx
    src/components/ads/InContentAd.tsx
    src/components/ads/PopunderAd.tsx
    src/components/ads/SocialBarAd.tsx
```

هذه هي منظومة الإعلانات (Adsterra) التي طُلبت إزالتها. احذفها مع المجلدين
`src/components/ads/` و`public/ads/`.

---

## 4) SQL — لا يُطبَّق تلقائياً

الملفات العشرة الجديدة في `supabase/migrations/` **لا تعمل وحدها**.
استعمل `deploy/paste-1.sql` ثم `deploy/paste-2.sql` (لصقتان منفصلتان).
التفاصيل في `DEPLOY-SUPABASE.md`.

⚠ `supabase/migrations/20260920000000_protect_progression_and_quiz_answers.sql`
غير مضمّن في اللصقتين — يحتاج تعديل الواجهة أولاً.