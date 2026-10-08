# دليل تصميم وتحرير صفحات المسارات المهنية (`/careers`)

هذا الملف يصف **كيف صُممت صفحات المسارات** وأين يُعدَّل كل شيء، حتى يمكن تحرير مسار آخر (مثل `avocat` أو `notaire`) بنفس الطريقة دون إعادة الاكتشاف.

- الصفحة الركنية: `src/pages/public/careers/CareersPage.tsx`
- صفحة المسار: `src/pages/public/careers/CareerDetailPage.tsx`
- البيانات: `src/data/careers.json` (مصفوفة مسارات، المفتاح `slug`)
- النصوص المشتركة (تُستعمل في الواجهة وفي HTML الثابت): `shared/careers/copy.js`
- توليد HTML الثابت: `scripts/lib/career-pages.mjs`
- الاختبارات: `tests/careers-*.test.ts` (9 ملفات)

---

## 1. تحرير مسار آخر: خطوات سريعة

1. افتح `src/data/careers.json` وابحث عن `"slug": "<slug>"`.
2. عدّل الحقول التالية (الشرح في القسم 4):
   - `title_ar` / `title_fr` / `short_description` / `work_model_ar`
   - `employment_modes` (أين يمكن العمل؟)
   - `typical_degree`, `age_requirement`, `training_after_admission` (بطاقة الحقائق)
   - `entry_path` (خطوات الولوج، ٤ خطوات موصى بها، `step` يبدأ من 1 بالترتيب)
   - `requirements` (الجدول، ٦ صفوف في مسار المفوض القضائي)
   - `legal_framework` (القوانين والمراجع) و`sources` (المصادر)
   - `best_for`, `skills`, `main_areas`, `lexicon_term_ids`, `related_career_ids`
   - `review_status`, `last_reviewed`
3. الحفاظ على تنسيق الملف: مسافتان للإزاحة. أعد الكتابة بـ Python:
   ```python
   import json
   d = json.load(open('src/data/careers.json', encoding='utf8'))
   # ... عدّل ...
   open('src/data/careers.json','w',encoding='utf8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
   ```
   (هذا التنسيق يطابق الملف الأصلي حرفياً، فلا يظهر في الـ diff إلا التغيير الفعلي.)
4. شغّل الاختبارات: `npx vitest run tests/careers-*.test.ts` و`npx tsc --noEmit`.
5. إن كان المسار يحمل أرقام نصوص أو مواد (مثل الحالة الموثّقة للمفوض القضائي)، انظر القسم 6 (الاستثناءات).

---

## 2. بنية صفحة المسار (`/careers/<slug>`) بالترتيب

| # | القسم | المكوّن / الموقع | الحقول في البيانات |
|---|---|---|---|
| 1 | الرأسية: العنوان الفرنسي، الجواب المختصر، شارة طبيعة العمل، تنبيه التوجيه | `CareerDetailPage` (أعلى الصفحة) | `title_ar`, `title_fr`, `work_model_ar` |
| 2 | بطاقة الحقائق (طبيعة العمل، العمل الحر، أين، الشهادة، طريقة الولوج، شرط السن، آخر مراجعة، حالة التحقق) | `section#career-facts-title` | `work_model_ar`, `can_freelance`, `employment_modes`, `typical_degree`, `quiz_config.competition_path`, `age_requirement.note_ar`, `last_reviewed`, `review_status` |
| 3 | خطوات الولوج | `CareerRoadmapTimeline` | `entry_path` |
| 4 | المهارات | `section#career-skills-title` | `skills` |
| 5 | «هل يناسبك هذا المسار؟» | `section#career-fit-title` | `best_for` |
| 6 | مصطلحات يجب معرفتها | `CareerLexiconTerms` | `lexicon_term_ids` |
| 7 | أقرب كليات الحقوق (إن كان القانون مطلوباً) | `NearbyLawSchools` | `requirements`, `requires_legal_education` |
| 8 | الاختبار (تمارين تعليمية) | `section#career-quiz-title` | `quiz_config` |
| 9 | القوانين والمراجع المنظمة للمسار | `CareerLaws` | `legal_framework` |
| 10 | الشروط (جدول) + المصادر والإطارات المرجعية | `section#career-requirements-title` + لوحة المصادر | `requirements`, `sources` |
| 11 | خطة التدريب | `CareerTrainingPlan` | `training_after_admission` |
| 12 | مسارات قريبة | `section#career-related-title` | `related_career_ids` |
| 13 | إخلاء المسؤولية | `CareerDisclaimer` (guidance) | — |

---

## 3. بنية الصفحة الركنية (`/careers`)

1. الهيرو: H1 بتدرج `from-primary/15 via-card to-primary/5`، فقرة تنبيه قصيرة تشير إلى `#careers-disclaimer`، زر إلى `#careers-filters`.
2. الفلاتر `CareerFilters` (`id="careers-filters"`): عنوان «صفِّ المسارات حسب وضعك»، تلميح، سطر النصيحة الأخضر، عدد النتائج.
3. بطاقات المسارات `CareerCard` (الشبكة المعروضة حسب الفلاتر؛ تحقّق من عدد البطاقات المعروضة وزر «عرض الكل» في الكود قبل الاعتماد عليهما).
4. قسم المقارنة (قطعة خلفية `bg-slate-100` مع عناوين زرقاء) — `careers-comparison-title`.
5. الشهادة مقابل المباراة (قائمة مؤطّرة) — `careers-degree-competition-title`.
6. «مهنة حرة أم وظيفة عمومية؟» — `careers-decision-tree-title` (بطاقات القرار).
7. أقرب كليات الحقوق `NearbyLawSchools` — `careers-nearby-title`.
8. الأسئلة الشائعة: `<details>` أكورديون، `careers-faq-title`.
9. روابط الدراسة — `careers-links-title`.
10. إخلاء المسؤولية الكامل — `#careers-disclaimer`.

---

## 4. نظام الألوان والأنماط

### 4.1 الألوان الدلالية

| الدلالة | الاستعمال | الفئات |
|---|---|---|
| **أزرق / primary** | العناوين الفرعية، الشارات الأساسية، أرقام الخطوات، الأيقونات | `text-primary`, `bg-primary/10`, `border-primary/20`, `bg-primary/5` |
| **أخضر (زمردي)** | التحقق / المؤكَّد / نصيحة الفلتر / تنبيه المسار (الحالة "معلومات توجيهية") | `text-emerald-800 dark:text-emerald-200`, `bg-emerald-500/15`, `border-emerald-600/30 bg-emerald-500/[0.08]` |
| **كهرماني / amber** | ما ينتظر (غير مؤكد)، تنبيه المسابقة (quiz) | `bg-amber-500/15 text-amber-800 dark:text-amber-200`, `border-amber-500/30` |
| **رمادي / muted** | النص الثانوي، لوحات المصادر، الجداول | `text-muted-foreground`, `bg-muted/30`, `bg-muted/40` |
| **رمادي فاتح (band)** | قطعة المقارنة في الصفحة الركنية | `bg-slate-100 dark:bg-slate-900/60` |

### 4.2 الألوان حسب المجال (كهرماني/أزرق/بنفسجي/أحمر) — المصطلحات
- مدني أزرق، تجاري كهرماني، تنظيم قضائي بنفسجي، جنائي أحمر (بطاقات القاموس، `CareerLexiconTerms`).

### 4.3 الأحجام والمسافات (المعيار المعتمد)

| العنصر | الحجم | الوزن / الارتفاع |
|---|---|---|
| عنوان قسم (h2) | 18px | `font-black` |
| عنوان قسم منبثق (callout) | 20–22px | `font-black` |
| عنوان بطاقة مسار | 20px | `font-black leading-snug` |
| نص بطاقة مسار | 16px | `leading-8` |
| بنود «هل يناسبك» | 17px | `leading-8` |
| تنبيه أخضر / ملاحظات | 15px | `font-bold leading-7` |
| نص ثانوي | 13–14px | `text-muted-foreground` |
| فراغ بين الأقسام | `mt-10` | — |
| فراغ داخل البطاقة | `p-5` إلى `p-6` | — |
| فراغ بين البطاقات | `gap-4` إلى `gap-6` | — |

### 4.4 أنماط المكوّنات
- **Callout أزرق (عنوان قسم)**: `inline-flex items-center gap-2 rounded-xl border border-blue-600/25 bg-blue-50 px-4 py-3 text-[20px] font-black text-blue-800 dark:border-blue-400/30 dark:bg-blue-950/40 dark:text-blue-200`
- **بطاقات المقارنة (٣ ألوان بالترتيب أزرق، أخضر، كهرماني)**: `border-{c}-600/25 bg-{c}-50` مع نسخة داكنة.
- **بطاقة مسار**: `rounded-3xl border border-border bg-card p-5`، شارة `bg-primary/10 text-primary`.
- **لوحة «هل يناسبك»**: `rounded-3xl border border-primary/20 bg-primary/5 p-6 md:p-8`.
- **لوحة القوانين**: نفس لوحة «هل يناسبك»، مع شريط تقدّم `bg-muted` + `bg-primary`، وبطاقات خطوات `rounded-2xl border bg-card p-5 md:p-6` برقم دائري `size-10 bg-primary text-primary-foreground`.
- **لوحة المصادر**: `rounded-3xl border border-border bg-muted/30 p-6 md:p-8`، بطاقات `rounded-2xl border bg-card p-6` بقائمة معلومات (`dl`) تحتوي الحالة وآخر تحقق والرابط.
- **زر الرابط الرسمي**: `rounded-full bg-primary px-4 py-2 font-extrabold text-primary-foreground` مع أيقونة `ExternalLink` ونص «فتح المصدر الرسمي».
- **جدول الشروط**: رأس `bg-muted/40`، خلايا `border-border p-3`، الشارات `rounded-full bg-muted px-2.5 py-1 text-[11.5px]`.
- **تنبيه التوجيه** (`CareerDisclaimer` variant guidance): أخضر. **تنبيه الاختبار** (variant quiz): كهرماني.

---

## 5. ما أُضيف وما أُزيل (لا تعيده)

### أُزيل عمداً
- «لماذا نحن» (الرئيسية) ، «500+ طالب يثقون بنا» ، «4.9 - محتوى أساسي مجاني».
- «+8 مقال»، «أساتذة خبراء»، «جدول مرن».
- نص التنبيه «⚠️ النص القانوني لم يضف بعد إلى أرشيف ميزان.»
- عبارة «لا يوجد نص مستقل منشور في أرشيف ميزان» (تُركت قيمة فارغة لحالة `needs_archive_entry`).
- «⚠️ يحتاج إلى التحقق من المصدر الرسمي» (من الصفحات والبطاقات والـ HTML؛ الثابت `CAREERS_VERIFY_BADGE` باقٍ في الكود لأن اختباراً يتحقق من قيمته).
- «بانتظار إضافة المصدر الرسمي / يحتاج تحققاً» من المصادر الموثّقة.
- الروابط الخام (`https://…`) في المصادر، صارت زر «فتح المصدر الرسمي».
- شارة «يحتاج إلى تحقق» تختفي عن أي شرط حالته `verified`.
- نص «≈ 0 كم» (صار «في مدينتك»).

### أُضيف
- بطاقة المسار المضغوطة (عنوان، فرنسية، وصف مختصر من سطرين، شهادة معتادة، شارة، أزرار).
- فلاتر بعداد مباشر، تنبيه أخضر (`FILTER_ADVISORY`).
- أكورديون للأسئلة الشائعة.
- لوحة المقارنة الملوّنة وبطاقات القرار.
- `CareerLaws` مع شريط تقدّم.
- تحديد `source_ref_ar` لكل شرط (مرجع المادة يظهر بدل الرابط عند غيابه).
- `review_status: "official_text_verified"` ← «متحقق من النصوص الرسمية».

---

## 6. قواعد البيانات والاستثناءات (مهم قبل أي تعديل)

الاختبارات تفرض قواعد حماية:
- **لا أرقام نصوص مُختلقة**: أسماء المراجع (`legal_framework.label_ar`, `relationship_ar`) وعناوين المصادر لا تحتوي أرقاماً، إلا للمسارات المستثناة.
- **الشروط الرقمية (سن، عدد مناصب)** تبقى فارغة ما لم تكن موثّقة من مصدر رسمي.
- **المصادر غير الموثّقة**: `url: ""`، `status: "needs_official_verification"`، `last_verified: null`.
- **الشرط**: `status: "verify_official_source"`، `source_url: null`.
- **`law_slug`** لا يُضبط إلا لسجل موجود في أرشيف ميزان (لقطة `laws.client.json` تُولَّد أثناء البناء من CMS). بدون سجل تبقى القيمة `null` و`verification_status: "needs_archive_entry"`.

### الاستثناء الموثّق الوحيد: `commissaire-judiciaire`
المسار الوحيد الذي تحقّق يدوياً من نصه الرسمي (القانون 46.21، المرسوم 2.25.885). الاختبارات التالية تعرف هذا الاستثناء بالاسم:
- `tests/careers-laws.test.ts`: `NUMBERED_REFERENCE_SLUGS` (أرقام المراجع والمصادر).
- `tests/careers-data.test.ts`: `VERIFIED_TEXT_SLUGS` (السن، الشروط، المصادر، الحالة، `review_status`).
- `tests/careers-architecture.test.ts`: `VERIFIED_TEXT_SLUGS` (أرقام الشروط وعناوين المصادر).

**لتحرير مسار ثانٍ بنفس المستوى من التحقق**: أضف slug إلى هذه المجموعات، وضع الحالات الموثّقة (`verified`) وانسخ `source_ref_ar` بالمرجع.
**لمسار غير موثّق**: لا تُضِف slug، ولا تكتب أرقاماً في النصوص.

---

## 7. قائمة مراجعة قبل الدفع (Commit)

- [ ] `npx tsc --noEmit` بلا أخطاء.
- [ ] `npx vitest run tests/careers-*.test.ts` — 9 ملفات تنجح.
- [ ] لا نص من قائمة «أُزيل عمداً» ظهر من جديد: `grep -rn "لم يضف بعد\|يحتاج إلى التحقق من المصدر الرسمي\|500+" src shared scripts`.
- [ ] الروابط الرسمية تُعرض بزر، لا بالنص الخام.
- [ ] الألوان: أخضر للتحقق والتوجيه، كهرماني لما ينتظر، أزرق للتمييز.
- [ ] `last_reviewed` بصيغة `YYYY-MM-DD`.

---

## 8. سجل التعديلات الرئيسي (commits)

| الـ commit | الوصف |
|---|---|
| `5a3dd0a` | بطاقة مضغوطة، الهيرو، أكورديون، الروابط |
| `98ad408` … `18026f4` | الفلاتر والنصيحة الخضراء |
| `3b937a3` | تدرج الهيرو |
| `0af7a87` | نصيحة خضراء بأيقونة |
| `57e9c3d`، `b2fdf8a`، `24a3fa5`، `e91788e` | عناوين زرقاء منبثقة |
| `985664e` | بطاقات المقارنة الملوّنة |
| `053b49e` | قطعة المقارنة الرمادية |
| `263686d` | أكورديون الأسئلة |
| `862e26a` | تقصير المقدمة |
| `b5751e2` | تدرج صفحة المسار |
| `4d9171c`، `64af9a7`، `2353e43`، `ea672b9` | تكبير «هل يناسبك» والمعجم، لوحة خلفية، تنبيه أخضر |
| `1d69110`، `16c0514`، `01d58d9`، `a327d0f` | بيانات المفوض القضائي (القانون، الجدول، الأرشيف) |
| `d6a4b72`، `4a493fe`، `a6df973` | تنسيق القوانين والمصادر والروابط |
| `2e0e649`، `2806751`، `e389265` | إزالة العبارات المذكورة في القسم 5 |
