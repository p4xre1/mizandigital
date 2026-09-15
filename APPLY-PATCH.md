# كيفية تطبيق التغييرات في جلسة جديدة

## إذا كان لديك ملف patch

```bash
git clone https://github.com/p4xre1/mizandigital.git
cd mizandigital
git checkout abdo
git checkout -b feature/session-work

# تحقق أولاً
git apply --check ../mizan-session-changes.patch

# طبق
git apply ../mizan-session-changes.patch

# أو إذا كان هناك تعارض بسيط
git apply --3way ../mizan-session-changes.patch

# تحقق
pnpm install
pnpm typecheck
pnpm test
pnpm build

git add -A
git commit -m "Session work: payments, governance, reactions, security hardening"
git push -u origin feature/session-work
```

ثم افتح PR من `feature/session-work` → `abdo`.

## إذا لم يكن لديك patch (هذه الجلسة)

هذه الجلسة تحتوي على 4 ترقيات SQL و 12 ملف TypeScript جديد:

### ملفات جديدة
- `supabase/migrations/20260920000000_protect_progression_and_quiz_answers.sql`
- `supabase/migrations/20260921000000_payments_and_credits.sql`
- `supabase/migrations/20260922000000_reactions.sql`
- `supabase/migrations/20260923000000_governance_and_reports.sql`
- `src/lib/quiz/secureProgress.ts`
- `src/lib/quiz/attemptService.ts`
- `src/lib/payments/types.ts`
- `src/lib/payments/service.ts`
- `src/lib/reactions/service.ts`
- `src/lib/governance/service.ts`
- `src/components/reactions/ReactionBar.tsx`
- `src/components/governance/ReportDialog.tsx`
- `src/components/payments/PackageCard.tsx`
- `src/pages/public/PaymentsPage.tsx`
- `src/pages/public/GuidelinesPage.tsx`
- `src/pages/admin/ModerationPage.tsx`
- `src/pages/admin/PaymentsAdminPage.tsx`
- `functions/api/payments/create.js`
- `functions/api/quiz/submit.js`

### ملفات معدلة
- `src/lib/quiz/progressStore.ts` — حماية checksum + حدود
- `src/components/quiz/QuizRunner.tsx` — إرسال آمن عبر RPC
- `src/pages/public/ArticlePage.tsx` — تفاعلات + إبلاغ
- `src/routes/AppRoutes.tsx` — مسارات جديدة /payments, /guidelines, /admin/moderation, /admin/payments
- `src/layouts/PublicNavigation.tsx` — روابط جديدة
- `src/components/layout/AdminSidebar.tsx` — روابط إدارية جديدة

## مشكلة رفع الملفات في Arena

Arena لا تقبل ملفات `.patch` مباشرة. الحلول:

1. **غيّر الامتداد إلى `.txt`** بدون مسافات في الاسم:
   - `mizan-session-changes.patch` → `mizan.patch.txt`

2. **أو انسخ المحتوى مباشرة في الشات** كـ code block:
   ```
   ```diff
   ... محتوى patch ...
   ```

3. **أو استعمل ZIP** لكن أخبر الجلسة الجديدة أنه ZIP يحتوي patch

## التحقق النهائي

```bash
pnpm typecheck # يجب أن يكون نظيفاً
pnpm test      # 257 اختبار
pnpm build     # 320 route
```
