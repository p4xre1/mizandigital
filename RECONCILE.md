# مصالحة العملين — جلستان أنتجتا تنفيذين مختلفين لنفس الميزات

## الوضع الحالي

| | هذه الجلسة | الجلسة الأخرى |
|---|---|---|
| الفرع | `arena/01a08dd7-mizandigital` | `arena/01a0a69e-mizandigital` |
| مدفوع إلى GitHub؟ | ❌ **لا** (لا يوجد egress) | ✅ نعم |
| ملفات | 85 | 27 |
| اختبارات | 353 / 11 ملفاً | 257 |
| مسارات البناء | 321 | 320 |

**لا يمكن دمجهما آلياً.** كلاهما بنى نفس الميزات من الصفر بأسماء ومخططات
مختلفة.

---

## ⚠ تصادمات الأسماء — ملف بنفس الاسم ومحتوى مختلف

هذه الخمسة ستدهس بعضها لو طُبّق العملان معاً:

```
supabase/migrations/20260920000000_protect_progression_and_quiz_answers.sql
src/components/reactions/ReactionBar.tsx
DEPLOY-SUPABASE.md
APPLY-PATCH.md
mizan-session-changes.patch
```

الأخطر هو **ملف الترحيل**: نفس اسم الملف بالضبط (`20260920000000_...`)
ومحتوى مختلف. إن وُجد الاثنان في `supabase/migrations/` فواحد سيدهس الآخر،
وإن طُبّق أحدهما ثم نُسخ الثاني فلن يُعاد تطبيقه لأن الاسم مُسجَّل.

---

## ⚠ مخططان متوازيان لنفس الميزة (التفاعلات)

| | هذه الجلسة | الجلسة الأخرى |
|---|---|---|
| الجداول | `content_reactions` | `reactions` + `reaction_counts` |
| أنواع التفاعل | like, save | like, helpful, bookmark, fire, insightful |
| أنواع المحتوى | 7 (article, news, school, term, pdf, law, event) | — |
| الحجب | REVOKE من anon + بلا سياسة INSERT تصريحية | — |

تشغيل الترحيلين معاً يُنتج **نظامي تفاعل متوازيين**. اختر واحداً.

---

## ✅ ثغرة وجدتها الجلسة الأخرى وفاتتني في تدقيقي

أقولها صراحة: **هذا خطأ في تدقيقي.**

`quiz_attempts_insert` معرّفة هكذا:

```sql
CREATE POLICY "quiz_attempts_insert" ON public.quiz_attempts
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);
```

`WITH CHECK (true)` يعني أن **أي صف مقبول**، والسياسة تمنح الحق لـ `anon`
أيضاً. القيد الوحيد هو `score >= 0 AND score <= 100`، و`quiz_leaderboard`
ممنوحة لـ `anon`. فأي زائر يستطيع إدراج محاولة مزيفة بـ `score = 100`
وتصدّر لوحة المتصدرين.

تدقيقي رصد ثغرة أخرى في نفس الجدول (قراءة الإجابات عبر
`quiz_questions_public_read`) لكنه **لم يرصد** هذه. إصلاح الجلسة الأخرى
(`submit_quiz_attempt` يحتسب XP في الخادم) يعالجها، وهو أفضل من إصلاحي.

---

## الثغرتان اللتان أصلحتهما هذه الجلسة — تأكد أنهما مغطاتان

1. **منح النفس xp/rank عبر `mizan_profiles`** — سياسة `FOR ALL` بشرط
   `owner_id = auth.uid()` فقط، والمُشغّل الموجود يحمي أعمدة الفوترة وحدها.
   مُثبَت بالاختبار: `SET xp=999999` و`SET rank='SSS'` نجحا.
   → الجلسة الأخرى تعالج هذا بـ "trigger blocks XP jumps >3000". **هذا ليس
   كافياً**: الحد يمنع القفزات الكبيرة فقط، فيبقى `SET xp=2999` ممكناً،
   ويبقى `rank` قابلاً للكتابة مباشرة. تحقّق من أن `rank` محمي أيضاً.

2. **قراءة إجابات الاختبارات كزائر** — `quiz_questions_public_read`
   تُعيد `answer` و`explanation`.
   → الجلسة الأخرى تعالجها بـ view `quiz_questions_public` بلا عمود `answer`.
   **تنبيه مهم:** حجب العمود عبر view لا يكفي وحده إن بقيت السياسة الأصلية
   على الجدول. تحقّق أن `quiz_questions_public_read` **حُذفت**، لا أنها
   تُركت بجانب الـ view.

3. **`user_role` بلا قيمة لغير المتمتعين بصلاحية** — `DEFAULT 'editor'`
   و`is_admin()` تعتبر editor مشرفاً، و29 سياسة RLS مبنية عليها.
   → **لم أرَ ما يدل على أن الجلسة الأخرى عالجت هذا.** تحقّق:
   ```sql
   SELECT column_default FROM information_schema.columns
   WHERE table_name='profiles' AND column_name='role';
   -- إن كان 'editor' فالثغرة ما زالت قائمة
   ```

---

## التوصية

عمل الجلسة الأخرى **مدفوع وآمن**، وعمل هذه الجلسة موجود فقط في هذا الـ
sandbox. فالطريق العملي:

1. ارفع `patch.txt` إلى الجلسة الأخرى (الاسم بلا مسافات — هذا كان سبب
   الفشل السابق).
2. اطلب منها **مقارنة لا استبدال**:
   - احتفظ بخطتها للتفاعلات والمدفوعات (أُنجِزت ودُفعت).
   - خذ من patch.txt ما لا تملكه: `20260919000000` + `20260919010000`
     (إصلاح `user_role`)، و`deploy/paste-1.sql` + `paste-2.sql`،
     وإصلاح `toSafeJsonLd` في `SchemaOrg.tsx`، وترقية Clerk إلى 5.61.9.
   - **لا** تطبّق `20260920000000` من patch.txt — الاسم متصادم ولديها
     نسخة تعالج الثغرة نفسها.

3. تحقّق من النقاط الثلاث في القسم السابق قبل النشر.

---

## ملفات الرفع (بلا مسافات في الأسماء)

```
patch.txt              708 KB — الرقعة كاملة
patch_part_00.txt      200 KB ┐
patch_part_01.txt      200 KB │ إن فشل رفع الملف الكبير، ارفع الأربعة
patch_part_02.txt      200 KB │ ثم: cat patch_part_*.txt > patch.txt
patch_part_03.txt      107 KB ┘
```

مُتحقَّق: الأجزاء الأربعة بعد دمجها تعطي نفس md5
(`91442c12a466dd4a218ff0dfc75a18e8`) وتنجح مع `git apply --check` على
`origin/abdo`.