// shared/seo/meta-copy.js
//
// ─────────────────────────────────────────────────────────────────────────────
// نصّ العناوين والأوصاف — مصدر واحد يطبّق نفس القواعد في ثلاث جهات
// ─────────────────────────────────────────────────────────────────────────────
// كانت العناوين تُبنى في أربعة places مختلفة: SEOHead في المتصفح، دالة
// usePageTitle مستقلة بقواعد أخرى، scripts/prerender.mjs بنُسخته، و
// scripts/lib/meta-description.mjs نسخةً طبق الأصل من src/lib/seo/description.ts.
// كل نسخة تنحرف قليلاً، والنتيجة التي رآها زاحف التدقيق: عنوان وصفحة واحد
// يتكررّر على كل المسارات التي لا ملف ثابت لها. الملف هنا هو الطبقة الوحيدة
// التي تعرف الأطوال والعلامة؛ والمتصفح والبناء والفحص كلها تستورده.
//
// القواعد المستعملة (من توصيات جولة الميتا):
//   <title>      هدف 60 حرفاً، سقف 65 — مع العلامة «| ميزان الرقمية» إن اتّسع.
//   description  بين 140 و160 حرفاً — لا حشو ولا بتر، تُكمَّل بعبارة سياقية.
//   صفحات بلا فهرسة (بحث، دخول، ملف، أسعار، لوحة تحكم) لها نصّها الخاص لا نصّ
//   الرئيسية، وتُعلَّم noindex من السياسة نفسها (isIndexablePath).

import { isIndexablePath, normalizePath } from "./url-policy.js";

export const BRAND = "ميزان الرقمية";
export const BRAND_SUFFIX = ` | ${BRAND}`;

/*
 * الأسماء البديلة للعلامة — للسياقات الإنجليزية/التقنية وحدها، تُنشر في
 * JSON-LD تحت alternateName (Organization/WebSite). وُضعت هنا بجانب BRAND
 * لأن تدقيق GEO رصد تبايناً في التسمية بين <title> وog:site_name والبيانات
 * المهيكلة: كانت العقدة تُسمّى «منصة الميزان الرقمية» مرة و«Mizan.page»
 * أخرى. الآن الثلاث طبقات تقرأ الاسم الواحد من هذا الملف.
 */
export const BRAND_ALTERNATE_NAMES = ["Mizan Digital", "Mizan"];

export const MIN_TITLE = 20;
export const MAX_TITLE = 60;
export const HARD_MAX_TITLE = 65;
export const MIN_DESC = 140;
export const MAX_DESC = 160;

const TRAILING_PUNCT = /[\s,:،؛.\u2026-]+$/;

/** قصّ على حدّ كلمة مع علامة الحذف، بلا قطع في وسط كلمة. */
function clampWords(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = cut.lastIndexOf(" ");
  const head = at > max * 0.6 ? cut.slice(0, at) : cut;
  return `${head.replace(TRAILING_PUNCT, "")}…`;
}

/**
 * عنوان ميتا منسّق: يسقط العلامة عند الطول قبل أي بتر، يقطع عند رأس موضوعي
 * («العنوان: تفصيل») إن أمكن، ثم يُلحق العلامة إن كان قصيراً جداً.
 * العملية idempotent: fitTitle(fitTitle(x)) === fitTitle(x).
 *
 * @param {string} input العنوان الخام كما تولّده الصفحة
 * @param {{ max?: number, hardMax?: number, suffix?: string }} [options]
 */
export function fitTitle(input, options = {}) {
  const max = options.max ?? MAX_TITLE;
  const hardMax = options.hardMax ?? HARD_MAX_TITLE;
  const suffix = options.suffix ?? BRAND_SUFFIX;

  let out = String(input ?? "").replace(/\s+/g, " ").trim();
  if (!out) return BRAND;

  // 1) أطول من الهدف؟ آخر مقطع هو العلامة غالباً — أسقطها قبل أي بتر.
  if (out.length > max && out.endsWith(suffix)) out = out.slice(0, -suffix.length).trim();

  // 2) لا يزال فوق السقف: اترك المقطع الأخير (سياق القسم) بدل اسم الصفحة.
  while (out.length > hardMax && out.includes(" | ")) {
    out = out.slice(0, out.lastIndexOf(" | ")).trim();
  }

  // 3) الحلقات الطويلة «اسم الكلية… | كليات الحقوق بالمغرب» فرغ منها أعلاه؛
  //    إن بقي أطول فالأرجح أن التفصيل بعد النقطتين — المقدمة هي المفتاح.
  if (out.length > hardMax) {
    // «اسم الكلية: تفصيل الجلسة» — المقدمة وحدها تبقى مفهومة ومطابقة لما
    // يبحث عنه الطالب، والقطع هنا أسبق من البتر بحرف الحذف.
    const colon = out.search(/[:\u061F]\s/);
    if (colon >= MIN_TITLE) out = out.slice(0, colon).replace(TRAILING_PUNCT, "").trim();
  }

  // 3.ب) الجملة التالفة («… في ضوء أحكام القانون رقم 65.99 المتعلق بمدونة
  // الشغل») أطول من السقف: حذف الذيل بعد آخر أداة ربط أبقى من بترها بحرف
  // حذف في وسط عبارة، ويترك الكلمة المفتاحية كاملة.
  if (out.length > hardMax) {
    const tail = out.search(/\s+(?:المتعلق|المتعلقة|المتعلقة بـ|وفق|بحسب|بمناسبة|حول|في إطار)\s/);
    if (tail >= 45) out = out.slice(0, tail).replace(TRAILING_PUNCT, "").trim();
  }

  // 4) أخيراً: قصّ على حدّ كلمة.
  if (out.length > hardMax) out = clampWords(out, hardMax);

  // 5) قصير جداً: ألحق العلامة كي لا يظهر العنوان مبتوراً في نتيجة البحث.
  if (out.length < MIN_TITLE && !out.includes("ميزان")) out = `${out}${suffix}`;

  return out;
}

/*
 * «كلية العلوم القانونية والاقتصادية والاجتماعية بتطوان» = 48 حرفاً قبل أن
 * يُضاف إليها شيء، فتخرج كل صفحات الكليات فوق السقف. الصيغة المستعملة في
 * العرف الطلابي والإعلام «كلية الحقوق بتطوان» تختصر 30 حرفاً وتُبقي الكلمة
 * المفتاحية التي يبحثها الطالب. الاسم الكامل يبقى في H1 والنصّ.
 */
const FACULTY_LONG = /كلية\s+العلوم\s+القانونية\s+والاقتصادية\s+والاجتماعية/;
const FACULTY_SHORT = "كلية الحقوق";

/** @param {string} name */
export function abbreviateFaculty(name) {
  const text = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!FACULTY_LONG.test(text)) return text;
  return text
    .replace(FACULTY_LONG, FACULTY_SHORT)
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * وصل جملة سياقية بوصف قصير: إن كان النص ينتهي بنقطة نكتفي بمسافة، وإلا
 * فضلة « — ». النسخة القديمة كانت تُنتج «…بالمغرب. — وهذه…» في كل ملف PDF.
 */
export function joinClauses(base, extra) {
  const a = String(base ?? "").replace(/\s+/g, " ").trim();
  const b = String(extra ?? "").replace(/\s+/g, " ").trim();
  if (!b) return a;
  if (!a) return b;
  if (/[.!?\u061F]$/.test(a)) return `${a} ${b}`;
  return `${a} \u2014 ${b}`;
}

function truncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const at = cut.lastIndexOf(" ");
  const head = at > maxLen * 0.7 ? cut.slice(0, at) : cut;
  return `${head.replace(TRAILING_PUNCT, "")}\u2026`;
}

/** عبارة ختامية قصيرة تُضاف عند القِصَر فقط، لتبقى الجملة مفيدة لا حشواً. */
export const DESC_TAIL =
  "المزيد من الشروحات والملخصات القانونية المجانية داخل منصة ميزان الرقمية.";

/**
 * وصف ميتا مضمون الطول (140–160) انطلاقاً من نصّ أساسي، يُكمَل بعناصر سياقية
 * عند القِصَر فقط — والعنصر الإضافي يُقَصّ على حدّ كلمة إن لم يتّسع المقام،
 * فلا نبتر نصّ الصفحة نفسه لالحاق حشو. نفس الدالة يستعملها المتصفح
 * (src/lib/seo/description.ts) والبناء (scripts/lib/meta-description.mjs)
 * والفاحص، فلا فرق عمّا تراه الزاحفة وما يراه المستخدم بعد hydration.
 *
 * @param {string|null|undefined} primary
 * @param {(string|null|undefined)[]} [fallbackParts]
 */
export function buildMetaDescription(primary, fallbackParts = []) {
  const base = String(primary ?? "").replace(/\s+/g, " ").trim();
  if (base.length >= MIN_DESC) return truncate(base, MAX_DESC);

  const parts = [...fallbackParts, DESC_TAIL].filter((part) => String(part ?? "").trim());

  let combined = base;
  for (const part of parts) {
    if (combined.length >= MIN_DESC) break;
    const room = MAX_DESC - combined.length - 3; // « — » وعلامة الحذف
    if (room < 24) break; // لا مجال لعبارة مفيدة: نُبقي الوصف كما هو بلا بتر
    const clause = String(part).trim();
    combined = joinClauses(combined, clause.length <= room ? clause : clampWords(clause, room));
  }

  return combined.length > MAX_DESC ? truncate(combined, MAX_DESC) : combined;
}

/*
 * نصوص المسارات التطبيقية التي لا تُفهرس. كل مسار بجملة تعريف واحدة على الأقل
 * تخصّه وحده: التكرار بين /login و/signin و/search كان يجعلها تبدو للزاحف
 * نسخة من الرئيسية، وهي المسارات التي ملأت تقرير «Non-canonical».
 * العناوين هنا أقصر من السقف عمداً: لا فائدة من اسم صفحة في نتائج البحث،
 * والهدف أن تحمل og:title النصّ نفسه عند المشاركة.
 */
export const UTILITY_ROUTES = {
  "/login": {
    title: "تسجيل الدخول إلى حسابك | ميزان الرقمية",
    description:
      "ادخل إلى حسابك في منصة ميزان الرقمية لملفك الشخصي ومحتواك المحفوظ واشتراك ميزان برو. القاموس القانوني والأرشيف والمقالات تبقى متاحة لكل الطلبة دون تسجيل دخول.",
  },
  "/signup": {
    title: "إنشاء حساب مجاني | ميزان الرقمية",
    description:
      "سجّل حساباً مجانياً في منصة ميزان الرقمية لتحفظ الملخصات والمصطلحات وتتابع نقاطك في الاختبارات الذاتية. التسجيل يتم بالبريد أو بحساب Google بلا وسيلة أداء.",
  },
  "/signin": {
    title: "تسجيل الدخول — مسار بديل | ميزان الرقمية",
    description:
      "مسار قديم لتسجيل الدخول في منصة ميزان الرقمية يُحوَّل إلى صفحة الدخول الرئيسية. استخدم /login لولوج حسابك والوصول إلى ملفك والمحتوى المحفوظ واشتراك ميزان برو.",
  },
  "/forgot-password": {
    title: "استعادة كلمة المرور | ميزان الرقمية",
    description:
      "أعد تعيين كلمة مرور حسابك في منصة ميزان الرقمية عبر رابط يُرسل إلى بريدك المسجل. إن لم تصل خلال دقائق راجع مجلد غير المرغوب أو راسل فريق الدعم.",
  },
  "/profile": {
    title: "الملف الشخصي للطالب | ميزان الرقمية",
    description:
      "ملفك في منصة ميزان الرقمية: بياناتك وكليتك ومستواك ونقاط اختباراتك واشتراك ميزان برو. يمكنك إخفاء بروفايلك العام في أي وقت، والمحتوى القانوني يبقى مجانياً.",
  },
  "/saved": {
    title: "المحتوى المحفوظ | ميزان الرقمية",
    description:
      "قائمة ما وسّمتَه في منصة ميزان الرقمية من مصطلحات القاموس والملخصات والمقالات لتعود إليها قبل الامتحان. تُعرض بعد تسجيل الدخول فلا مكان لها في محركات البحث.",
  },
  "/payments": {
    title: "الكريدتس والفواتير | ميزان الرقمية",
    description:
      "أدرِ رصيد الكريدتس وفواتير اشتراك ميزان برو: الكريدتس لاختبارات تحديد المستوى والتحديات وتخصيص البروفايل. الأسعار معروضة للعامة في صفحة الأسعار.",
  },
  "/search": {
    title: "البحث في محتوى ميزان | ميزان الرقمية",
    description:
      "ابحث في محتوى منصة ميزان الرقمية: 250 مصطلحاً في القاموس القانوني العربي\u2013الفرنسي، وملخصات ومحاضرات الأرشيف الدراسي حسب الفصول، والمقالات والأخبار ودليل الكليات.",
  },
  "/guidelines": {
    title: "إرشادات المجتمع | ميزان الرقمية",
    description:
      "إرشادات المجتمع في منصة ميزان الرقمية: قواعد النشر والتعليق والمشاركة، والمصادر القانونية المقبولة في المحتوى. صفحة داخلية تُعرض في المنصة بلا حاجة إلى فهرسة.",
  },
  "/admin": {
    title: "لوحة تحكم المنصة | ميزان الرقمية",
    description:
      "لوحة فريق التحرير في منصة ميزان الرقمية: مراجعة المقالات والمصطلحات المنشورة، وإدارة المستخدمين والاشتراكات، وضبط الأرشيف. هذه المنطقة خارج البحث.",
  },
  "/pro-tools": {
    title: "أدوات ميزان برو | ميزان الرقمية",
    description:
      "أدوات ميزان برو في منصة ميزان الرقمية: تتبّع تعديلات النصوص، وتمارين الواقعة إلى الحل، وخريطة الإحالات، والتنبيهات، وحساب الآجال، وملف بحث — باشتراك نشط.",
  },
};

/**
 * نصّ المسارات غير القابلة للفهرسة: يُرجع العنوان والوصف والراوبوت من نفس
 * المصدر. المسار المفهرس لا يحتاج هنا شيئاً — صفحته الثابتة تحمل نصّها.
 *
 * @param {string} pathname
 */
export function utilityMeta(pathname) {
  const path = normalizePath(pathname);
  if (isIndexablePath(path)) return null;
  const found = UTILITY_ROUTES[path];
  if (found) return { ...found, noindex: true, path };
  return {
    title: `${BRAND} \u2014 صفحة داخل المنصة`,
    description: `هذه صفحة داخل منصة ${BRAND} تتطلب جلسة مستخدم، فلا فهرسة لها ولا محتوى يُقرأ بلا JavaScript. للمحتوى القانوني المفتوح: القاموس، الأرشيف الدراسي، المقالات والأخبار ودليل الكليات.`,
    noindex: true,
    path,
  };
}
