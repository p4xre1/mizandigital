// scripts/enrich-lexicon.mjs
//
// ─────────────────────────────────────────────────────────────────────────────
// إثراء بيانات المعجم والكليات والأخبار بحقول يقرأها الذكاء الاصطناعي
// ─────────────────────────────────────────────────────────────────────────────
// يضيف هذا السكربت حقولاً إلى `src/data/lexicon.json` (شرح مبسط بالعربية
// والفرنسية، أمثلة، كلمات مفتاحية للامتحان، مصطلحات ذات صلة، الرابط القانوني،
// تاريخ المراجعة وحالة المراجعة)، ثم يفصّل `legal_sources` بالحقول نفسها التي
// تطلبها بطاقات المصادر (article_number / quotation / quotation_type /
// source_url / last_verified). ويضيف `short_name` للكليات و`tags` للأخبار.
//
// ثلاث قواعد تحكم كل ما يفعله السكربت:
//
//  1. **لا اختلاق لنصّ قانوني.** لا يُكتب رقم فصل ولا عبارة «نصّ رسمي» لم تكن
//     موجودة في البيانات. `legal_sources` لا يُلمس بنيوياً إلا بإعادة تسمية ما
//     كان موجوداً (number → article_number، phrase → quotation) مع الإبقاء على
//     الحقلين الأصليين لأن `TermPage.tsx` يقرأهما. من هنا لا تُضاف مصطلحاتٌ
//     جديدة إلى الشجرة القانونية هنا؛ ذلك عمل تحريري على دفعات (انظر
//     LEGAL_SOURCES_GUIDE.md).
//
//  2. **`quotation_type` صادق مع مصدره.** «exact» فقط للمصطلحات التي يقول الدليل صراحة
//     إن نصّها استُخرج حرفياً من PDF الرسمي (الدفعتان الثانية والثالثة)،
//     و«excerpt» لما جاء من نتائج بحث أو من مصادر منشورة غير كاملة (الدفعة
//     الأولى وكل ما لا يعرفه الدليل).
//
//  3. **idempotent.** لا يُكتب حقل فوق حقل موجود، فالتشغيل الثاني لا يغيّر
//     شيئاً. الحالة المرجعية: «لا تغيير» بعد أول تشغيل.
//
// التشغيل: `pnpm seo:enrich` (ليس داخل `prebuild`: السكربت يعدّل بيانات
// متتبَّعة في git، وتركه يعمل مع كل بناء يجعل مصدر التغيير ضجيجاً في الـdiff).

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalLexicon, lexiconSlug } from "../shared/seo/url-policy.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LEXICON = join(ROOT, "src/data/lexicon.json");
const SCHOOLS = join(ROOT, "src/data/schools.json");
const NEWS = join(ROOT, "src/data/news.json");

/** تاريخ هذه الجولة من الإثراء الآلي — يُبلَّغ كـ«آخر مراجعة آلية» لا كتحرير. */
const REVIEW_DATE = "2026-09-20";

/*
 * المصطلحات التي تحقّق منها الدليل من النصّ الرسمي الحرفي (LEGAL_SOURCES_GUIDE.md،
 * الدفعتان الثانية والثالثة: نصّ PDF الكامل لق.ل.ع). هذه وحدها تستحق
 * quotation_type = "exact".
 */
const VERBATIM_IDS = new Set([
  "obligation",
  "contrat",
  "nullite",
  "preuve",
  "prescription",
  "consentement",
  "erreur",
  "violence-vice",
  "dol",
  "force-majeure",
]);

/*
 * دفعة الدليل الأولى: نصّ مأخوذ من مصدر رسمي عبر البحث (اقتباس منتقى لا كامل)
 * + كل من يملك legal_sources ولم يُذكر في الدليل ← "excerpt".
 */
const CURATED_FIRST_BATCH = new Set([
  "personne-morale",
  "mariage",
  "divorce",
  "garde",
  "pension-alimentaire",
  "crime",
  "delit",
  "contravention",
]);

/** بوابات رسمية معتمدة كما يسمّيها الدليل — روابط بوابات لا روابط نصوص. */
const SOURCE_PORTALS = [
  { match: /الالتزامات والعقود|ق\.ل\.ع|DOC/i, url: "https://adala.justice.gov.ma" },
  { match: /القانون الجنائي|زجر/i, url: "https://adala.justice.gov.ma" },
  { match: /الأسرة|مدونة الأسرة/i, url: "https://social.gov.ma" },
];
const DEFAULT_PORTAL = "https://www.sgg.gov.ma";

/** تصنيف عربية ← مقابل فرنسي موجز، للعبارة الفرنسية المبسّطة. */
const CATEGORY_FR = {
  "قانون مدني": "droit civil",
  "القانون المدني": "droit civil",
  "قانون الالتزامات والعقود": "droit des obligations",
  "قانون جنائي": "droit pénal",
  "القانون الجنائي": "droit pénal",
  "مسطرة مدنية": "procédure civile",
  "المسطرة المدنية": "procédure civile",
  "مسطرة جنائية": "procédure pénale",
  "المسطرة الجنائية": "procédure pénale",
  "مدونة التجارة": "droit commercial",
  "قانون تجاري": "droit commercial",
  "قانون الشغل": "droit du travail",
  "مدونة الأسرة": "droit de la famille",
  "قانون الأسرة": "droit de la famille",
  "العقار": "droit foncier",
  "قانون عقاري": "droit immobilier",
  "الحريات العامة": "droits et libertés",
  "القانون الدستوري": "droit constitutionnel",
  "القانون الإداري": "droit administratif",
  "القانون الدولي": "droit international",
  "المالية العامة": "finances publiques",
  "التأمين": "droit des assurances",
  "حماية المستهلك": "droit de la consommation",
  "المعطيات الشخصية": "protection des données",
  "القضاء": "organisation judiciaire",
  "المهن القانونية": "professions judiciaires",
};

const STOP_WORDS = new Set([
  "في", "من", "على", "إلى", "عن", "التي", "الذي", "هذا", "هذه", "بين", "مع",
  "أو", "و", "لا", "ما", "قد", "أن", "إن", "كل", "بعض", "غير", "عبر", "خلال",
  "كما", "لها", "له", "هم", "هو", "هي", "ثم", "حيث", "بما", "وفق", "حسب",
]);

const clean = (text) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/[؛;]\s*$/g, ".")
    .trim();

const ensurePeriod = (text) => {
  const t = clean(text);
  if (!t) return t;
  return /[.!؟]$/.test(t) ? t : `${t}.`;
};

const clipWords = (text, max) => {
  const t = clean(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,:،.]+$/, "")}`;
};

/**
 * شرح مبسّط بالعربية من التعريف المنشور نفسه: لا معلومة جديدة، فقط صياغة
 * أطول جملة مفيدة بدل جملة موصولة. «بعبارة بسيطة:» يفتح السطر لأن بطاقات
 * الذكاء الاصطناعي تلتقطه كبداية إجابة.
 */
function simpleExplanationAr(item) {
  const base = clean(item.definition || item.note || "");
  if (!base) return `مصطلح «${item.term_ar}» من ${item.category || "القانون المغربي"}؛ راجع التعريف أعلاه والأمثلة قبل الحفظ.`;

  const first = base.split(/(?<=[.!؟])\s+/)[0];
  const simplified = first
    .replace(/^(هو|هي|تُعَدّ|تُعد|يُقصد به|المقصود به|يعني|يقصد بـ)\s+/u, "")
    .replace(/\s*,\s*(?:أي|بمعنى|أيضاً)\s*/u, "، ")
    .replace(/^[«"']|[»"']$/g, "");

  return ensurePeriod(`بعبارة بسيطة: ${clipWords(simplified, 150)}`);
}

function simpleExplanationFr(item) {
  const termFr = clean(item.term_fr);
  const domain = CATEGORY_FR[clean(item.category)] || "droit marocain";
  if (!termFr) {
    return `Notion de ${domain} en droit marocain ; voir la définition détaillée dans la fiche arabe.`;
  }
  return `« ${termFr} » : notion de ${domain} en droit marocain, définie dans la fiche arabe de Mizan.`;
}

/** كلمات بحث يكتبها الطالب فعلاً في الامتحان وعند المراجعة. */
function examKeywords(item) {
  const term = clean(item.term_ar);
  const out = [`تعريف ${term}`, `${term} في القانون المغربي`];

  if (item.term_fr) out.push(clean(item.term_fr));
  if (item.category) out.push(`${term} ${clean(item.category)}`);
  out.push(`أمثلة عن ${term}`);

  const codes = (item.legal_sources || []).map((s) => clean(s.code_short || s.code_ar)).filter(Boolean);
  if (codes.length) out.push(`${term} ${codes[0]}`);

  return [...new Set(out.filter(Boolean))].slice(0, 6);
}

/**
 * أمثلة عربية: إحالة موجودة في البيانات، تمرين مقارنة مع مصطلح مجاور، ثم
 * تمرين صياغة. كلها نشاط دراسي لا واقعة قانونية مُختلَقة.
 */
function examplesAr(item, related) {
  const out = [];
  const source = (item.legal_sources || [])[0];

  if (source) {
    const code = clean(source.code_ar || source.code_short || "النص الرسمي");
    const number = clean((source.articles || [])[0]?.number || "");
    out.push(
      number
        ? `عند مراجعة «${item.term_ar}» تُقرأ الإحالة الواردة في البيانات تحت رقم ${number} من ${code}.`
        : `«${item.term_ar}» ورد في بيانات هذا الملف ضمن ${code}.`
    );
  }

  if (related[0]) {
    out.push(`تمرين: قارن بين «${item.term_ar}» و«${related[0].term_ar}» مع بيان الأثر العملي لكل منهما.`);
  }

  if (item.category) {
    out.push(`في امتحان ${clean(item.category)}: أعد صياغة تعريف «${item.term_ar}» في جملة واحدة قبل حفظه.`);
  }

  if (out.length < 2) {
    out.push(`ابحث عن نصّ ${clean(item.term_ar)} في القاموس ثم اربطه بمادته وفصله في جدول مراجعة.`);
  }

  return out.slice(0, 3).map(ensurePeriod);
}

function examplesFr(item, related) {
  const out = [];
  const termFr = clean(item.term_fr) || clean(item.term_ar);
  const source = (item.legal_sources || [])[0];

  if (source) {
    const number = clean((source.articles || [])[0]?.number || "");
    out.push(
      number
        ? `Pour « ${termFr} », vérifier l'article ${number} cité dans la fiche.`
        : `« ${termFr} » : se reporter à la source marocaine indiquée dans la fiche.`
    );
  }

  const relatedFr = clean(related[0]?.term_fr || related[0]?.term_ar);
  if (relatedFr) {
    out.push(`Exercice : distinguer « ${termFr} » et « ${relatedFr} » et en tirer la conséquence pratique.`);
  }

  if (out.length < 2) {
    out.push(`Fiche « ${termFr} » : lire la définition arabe, puis résumer la notion en une phrase.`);
  }

  return out.slice(0, 3).map(ensurePeriod);
}

/** بوابة رسمية منصوص عليها في الدليل، لا رابط نصّ مُختلَق. */
function portalFor(source) {
  const hay = `${source.code_ar || ""} ${source.code_fr || ""} ${source.code_short || ""}`;
  for (const { match, url } of SOURCE_PORTALS) if (match.test(hay)) return url;
  return DEFAULT_PORTAL;
}

function enrichLegalSources(item) {
  const sources = item.legal_sources;
  if (!Array.isArray(sources) || !sources.length) return sources;

  const type = VERBATIM_IDS.has(item.id) ? "exact" : "excerpt";

  return sources.map((source) => ({
    ...source,
    source_url: source.source_url || portalFor(source),
    last_verified: source.last_verified || REVIEW_DATE,
    articles: Array.isArray(source.articles)
      ? source.articles.map((article) => ({
          ...article,
          article_number: String(article.article_number ?? article.number ?? "").trim(),
          quotation: article.quotation || clean(article.phrase || ""),
          quotation_type: article.quotation_type || type,
          // الحقلان الأصليان (number/phrase) يبقيان: TermPage يقرأهما، وحذفهما
          // كان سيكسر واجهة «الشجرة القانونية» مقابل حقل مرادف.
        }))
      : source.articles,
  }));
}

const STOP_GRAMS = new Set(["في القانون", "من القانون", "القانون المغربي", "هو", "أي", "الذي", "التي", "إلى", "على", "عن", "بين", "هذا", "ما"]);

const wordsOf = (text) =>
  clean(text)
    .replace(/[«»"'().,:،؛!؟?]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_GRAMS.has(word));

const bigrams = (text) => {
  const words = wordsOf(text);
  const out = new Set();
  for (let i = 0; i < words.length - 1; i += 1) out.add(`${words[i]} ${words[i + 1]}`);
  return out;
};

/**
 * مصطلحات ذات صلة بالترجيح لا بالتجاور: الاختبار الأول كان يأخذ أوائل نفس
 * التصنيف، فتُخرَج أربعون صفحة «قانون مدني» على اللائحة نفسها — صلة بلا معنى،
 * وحين سُقِّط الترتيب بالأبجدية صارت ذيول اللائحات مكرّرة (absence، bail،…).
 * لذلك تُحسب نقاط على الملف كله:
 *   +40 توأم يحمل الاسم العربي نفسه بمقابل فرنسي مختلف (الرهن الحيازي/حيازية)
 *   +3  كلٌّ منهما يَرِد اسم الآخر في تعريفه
 *   +2  لكل ثنائية كلمات مشتركة في التعريف (إلى حدّ 6)
 *   +1  لكل كلمة مشتركة (إلى حدّ 2) — يفصل بين المتعادلين ولا يعلو على الإشارة الحقيقية
 *   +1  نفس التصنيف
 * والقرب في ترتيب الملف يُقدَّم عند التساوي، لأن lexicon.json مرتّب موضوعياً.
 */
function rankRelated(item, index, ownBigrams, ownWords, mentioners) {
  const scored = [];

  for (const candidate of lexicon) {
    if (candidate.id === item.id) continue;

    const cache = index.get(candidate.id);
    let score = 0;
    if (clean(candidate.term_ar) === clean(item.term_ar)) score += 40;
    if (mentioners.has(candidate.id)) score += 3;
    score += Math.min(6, countShared(ownBigrams, cache.bigrams) * 2);
    score += Math.min(2, countShared(ownWords, cache.words)); // كلمات مفردة: ضجيج أكثر من إشارة
    if (clean(candidate.category) === clean(item.category)) score += 1;
    if (score <= 0) continue;

    scored.push({ id: candidate.id, score, distance: Math.abs(candidate.__index - item.__index) });
  }

  scored.sort((a, b) => b.score - a.score || a.distance - b.distance || a.id.localeCompare(b.id, "en"));
  return scored.slice(0, 5).map((entry) => entry.id);
}

function countShared(a, b) {
  let n = 0;
  for (const value of a) if (b.has(value)) n += 1;
  return n;
}

/*
 * بطاقات تحريرية لخمس كلمات مفتاحية (زائد التوأم الثاني لـ«الرهن الحيازي»):
 * صياغة إنسانية للشرح المبسط والأمثلة بدل القالب. لا شيء هنا يخترع نصّاً
 * قانونياً — الأرقام والأوصاف مأخوذة من `legal_sources` الموجودة ومن التعريف
 * المنشور؛ والعبارة الثالثة في كل لائحة تمرين مقارنات لا واقعة.
 * تُطبَّق بعد التوليد وتُعلَّم `enrichment_source: "editorial"` فلا تُدهس عند
 `--refresh`.
 */
const CURATED = {
  prescription: {
    simple_explanation:
      "بعبارة بسيطة: إذا تأخرت في المطالبة بحقك المدة التي حدّدها القانون، يسقط حقك في رفع الدعوى. الحق نفسه لا يزول، لكن الحماية القضائية له تنتهي.",
    simple_explanation_fr:
      "En termes simples : si vous n'agissez pas dans le délai fixé par la loi, votre action se prescrit. Le droit ne disparaît pas, mais il cesse d'être protégé en justice.",
    examples: [
      "الدعوى الناشئة عن الالتزام تسقط بالتقادم بمضي المدة التي يحددها القانون (الفصل 371 من ق.ل.ع).",
      "المحكمة لا تطبّق التقادم من تلقاء نفسها: على المدين أن يتمسّك به صراحة في جوابه (الفصل 372).",
      "لا يجوز التنازل عن التقادم قبل اكتماله، أما بعد اكتماله فيجوز (الفصل 373).",
    ],
    examples_fr: [
      "L'action née d'une obligation s'éteint par la prescription au délai fixé par la loi (art. 371 DOC).",
      "Le juge ne peut soulever la prescription d'office : le débiteur doit l'invoquer expressément (art. 372).",
      "On ne peut renoncer à la prescription par avance, mais on le peut une fois le délai accompli (art. 373).",
    ],
    exam_keywords: [
      "آجال التقادم",
      "سقوط الدعوى",
      "انقطاع التقادم",
      "التقادم المسقط",
      "التنازل عن التقادم",
      "التقادم في القانون المغربي",
    ],
  },

  obligation: {
    simple_explanation:
      "بعبارة بسيطة: رابطة قانون بين شخصين، يلتزم أحدهما وهو المدين تجاه الآخر وهو الدائن بأداء شيء ما: دفع مبلغ، أو تسليم شيء، أو القيام بعمل، أو الامتناع عنه.",
    simple_explanation_fr:
      "Une obligation est un lien de droit entre un créancier et un débiteur : ce dernier doit donner, faire ou ne pas faire quelque chose.",
    examples: [
      "من اقترض مبلغاً صار مديناً بأدائه في الأجل المتفق عليه، وصاحب المال دائناً له.",
      "الالتزام بتسليم شيء يتحقق بنقل حيازة الشيء فعلياً، لا بتسليم وثيقة تملك فقط.",
      "تمرين: بيّن الفرق بين الوفاء بالالتزام وبين انقضائه بالمقاصة أو بالإبراء.",
    ],
    examples_fr: [
      "L'emprunteur devient débiteur de la somme à restituer à l'échéance ; le prêteur est créancier.",
      "L'obligation de donner s'exécute par la mise à disposition effective de la chose.",
      "Exercice : distinguer l'exécution de l'obligation de son extinction par compensation ou remise.",
    ],
    exam_keywords: [
      "أركان الالتزام",
      "الدائن والمدين",
      "الوفاء بالالتزام",
      "عدم تنفيذ الالتزام",
      "المسؤولية العقدية",
      "الالتزام في القانون المغربي",
    ],
  },

  vente: {
    simple_explanation:
      "بعبارة بسيطة: عقد تنقل به ملكية شيء إلى مشترٍ مقابل ثمن متفق عليه؛ فيلتزم البائع بتسليم المبيع وضمان الاستحقاق، ويلتزم المشتري بدفع الثمن.",
    simple_explanation_fr:
      "La vente est le contrat par lequel une partie transfère la propriété d'une chose à une autre moyennant un prix convenu.",
    examples: [
      "بيع سيارة بثمن محدد: البائع ملزم بتسليمها وضمان عدم التعرض للمشتري في انتفاعه.",
      "اتفاق بلا ثمن محدّد لا يسمى بيعاً: قد يكون هبة أو وعداً بالبيع بأحكام أخرى.",
      "تمرين: ميّز بين البيع والوعد بالبيع من حيث الإلزام بنقل الملكية.",
    ],
    examples_fr: [
      "Vente d'une voiture à un prix déterminé : le vendeur doit délivrer la chose et garantir l'éviction.",
      "Sans prix déterminé, il n'y a pas vente : le contrat peut être une donation ou un pacte de préférence.",
      "Exercice : comparer la vente et la promesse de vente quant à l'obligation de transférer la propriété.",
    ],
    exam_keywords: [
      "أركان البيع",
      "التزامات البائع",
      "التزامات المشتري",
      "ضمان الاستحقاق",
      "الثمن في البيع",
      "البيع في القانون المغربي",
    ],
  },

  erreur: {
    simple_explanation:
      "بعبارة بسيطة: أن تنعقد إرادتك على شيء لأنك توهمت أمراً على خلاف الحقيقة؛ والغلط في صفة جوهرية للمحل أو في شخص المتعاقد يجعل العقد قابلاً للإبطال.",
    simple_explanation_fr:
      "L'erreur est une fausse représentation qui vicie le consentement : le contrat est annulable lorsqu'elle porte sur une qualité essentielle.",
    examples: [
      "من اشترى قلادة ظاناً أنها من الذهب فإذا هي مذهّبة: قد يكون غلطه في صفة جوهرية.",
      "الغلط في الحساب أو في الكتابة لا يبطل العقد، بل يُصحَّح بالرجوع إلى الأصل.",
      "تمرين: بيّن متى يكون الغلط في الشخص causaً للتعاقد لا مجرد دافع إليه.",
    ],
    examples_fr: [
      "Acheter un collier cru en or alors qu'il est plaqué peut constituer une erreur sur une qualité essentielle.",
      "L'erreur de compte ou de rédaction n'annule pas le contrat : elle se corrige.",
      "Exercice : distinguer l'erreur obstacle de l'erreur-défaut de la simple motivation erronée.",
    ],
    exam_keywords: [
      "عيوب الرضا",
      "الغلط الجوهري",
      "إبطال العقد",
      "الغلط في صفة جوهرية",
      "الغلط في القانون المغربي",
    ],
  },

  nantissement: {
    simple_explanation:
      "بعبارة بسيطة: ضمانة يعطيها المدين لدائنه على منقول، يُسلَّم إلى الدائن أو إلى من يتفقان عليه، فيبقى في يده إلى أن يُسدَّد الدين.",
    simple_explanation_fr:
      "Le nantissement est une sûreté sur un meuble remis au créancier ou à un tiers convenu, qui le retient jusqu'au paiement.",
    examples: [
      "من رهن ساعة لدينه فليس للدائن التصرف فيها، وإنما يحبسها ضماناً إلى أن يستوفي حقه.",
      "ما يميّز الرهن الحيازي هو انتقال الحيازة إلى الدائن، لا مجرد الاتفاق المكتوب.",
      "تمرين: قارن بين الرهن الحيازي والكفالة من حيث حق الأفضلية وحق التتبع.",
    ],
    examples_fr: [
      "Le créancier nanti retient la chose sans pouvoir en disposer ; il garantit ainsi son paiement.",
      "Ce qui caractérise le nantissement, c'est le dessaisissement du débiteur, non le simple écrit.",
      "Exercice : comparer le nantissement et le cautionnement quant au droit de préférence et au droit de suite.",
    ],
    exam_keywords: [
      "الرهن الحيازي",
      "انتقال الحيازة",
      "حق الأفضلية",
      "انقضاء الرهن",
      "رهن المنقول في القانون المغربي",
    ],
  },

  "gage-civil": {
    simple_explanation:
      "بعبارة بسيطة: عقد يسلّم بموجبه المدين شيئاً منقولاً إلى دائنه يبقى في يده ضماناً للدين، فإذا تأخّر الأداء جاز للدائن أن يستوفي دينه من ثمن ذلك الشيء.",
    simple_explanation_fr:
      "Le gage est le contrat par lequel le débiteur remet un meuble au créancier en garantie de sa créance.",
    examples: [
      "مدين سلّم معداته إلى دائنه ضماناً للدين: لا يستعيدها قبل الوفاء بما التزم به.",
      "إذا هلك الشيء المرهون في يد الدائن بلا تفريط منه انقضى الرهن، وبقي الدين في ذمة المدين.",
      "تمرين: ميّز بين الرهن الحيازي والرهن الرسمي من حيث الحيازة والشهر.",
    ],
    examples_fr: [
      "Le débiteur qui remet ses matériels en gage ne les récupère qu'après paiement de la créance.",
      "La perte de la chose entre les mains du créancier non fautif éteint le gage, la dette demeurant.",
      "Exercice : opposer le gage mobilier à l'hypothèque quant à la possession et à la publicité.",
    ],
    exam_keywords: [
      "عقد الرهن",
      "الشيء المرهون",
      "حيازة الدائن",
      "الرهن في القانون المغربي",
      "الفرق بين الرهن والكفالة",
    ],
  },
};

/*
 * حالات عجز فيها الترتيب الآلي عن إيجاد وصلتين: مصطلح فريد في تصنيفه
 * («قانون البيئة» له سجلّان فقط). الصلة هنا قرار تحريري — معانٍ متجاورة في
 * المادة نفسها، لا تشابه نصّي — وتُطبَّق بعد التوليد مثل CURATED.
 */
const CURATED_LINKS = {
  "developpement-durable": ["etude-impact", "domaine-public", "service-public", "droits-de-lhomme"],

  // الغلط أحد عيوب الرضا: توأمه التدليس والإكراه والغبن، ثم الرضا (محل البحث)
  // والبطلان (الأثر). الترتيب الآلي كان يُلحق بالمجموعة مصطلحات مالٍ لا معنى
  // لها في هذا السياق.
  erreur: ["dol", "violence-vice", "lesion", "consentement", "nullite"],

  // التقادم: المسقط يمسّ الالتزام والإثبات والتنفيذ، والمكسب يقوم على الحيازة،
  // والإبراء نظير المسقط من جهة التنازل عن الحق.
  prescription: ["obligation", "preuve", "execution", "possession", "remise-de-dette"],
};

/* ── 1. lexicon.json ─────────────────────────────────────────────────────── */

const lexiconRaw = await readFile(LEXICON, "utf8");
const lexicon = JSON.parse(lexiconRaw);
if (!Array.isArray(lexicon)) throw new Error("lexicon.json: لائحة متوقعة");

const byId = new Map(lexicon.map((item) => [item.id, item]));

const relationIndex = new Map();
lexicon.forEach((item, position) => {
  item.__index = position;
  relationIndex.set(item.id, { bigrams: bigrams(item.definition), words: new Set(wordsOf(item.definition)) });
});
const categoryIndex = new Map();
for (const item of lexicon) {
  const key = clean(item.category) || "غير مصنف";
  if (!categoryIndex.has(key)) categoryIndex.set(key, []);
  categoryIndex.get(key).push(item);
}

// إشارات متبادلة على مستوى الملف كله: مصطلح مذكور نصّاً في تعريف غيره ← صلة
// حقيقية، لا مجرد كائنين في الرفّ نفسه.
const termMentions = new Map();
for (const item of lexicon) {
  const definition = clean(item.definition);
  if (!definition) continue;
  for (const other of lexicon) {
    if (other.id === item.id) continue;
    const name = clean(other.term_ar);
    if (name.length >= 3 && definition.includes(name)) {
      if (!termMentions.has(other.id)) termMentions.set(other.id, []);
      termMentions.get(other.id).push(item.id);
    }
  }
}

// نفس تسلسل prerender و enhance-lexicon: مجموعة تكرار واحدة، وإلا اختلف
// canonical_url المولَّد هنا عن الرابط الثابت للصفحة.
const slugSeen = new Set();

// `--refresh` يُعيد حساب الحقول المولَّدة (الصلات والأمثلة والكلمات) بعد تغيير
// قواعد التوليد، ويترك legal_sources كما هو: النصوص القانونية لا يولّدها هذا
// السكربت. بلا الراية الحقل الموجود لا يُمسّ (idempotence).
const REFRESH = process.argv.includes("--refresh");

/*
 * `--check` لا يكتب شيئاً: يولّد ما يولّده الوضع العادي في الذاكرة ويقارنه بما
 * هو موجود على القرص. بهذا يصير السكربت قابلًا للاستدعاء في CI («هل البيانات
 * مطابقة للمولّد؟») دون أن يخاطر بتعديل ملفات تتبّعها Git.
 */
const CHECK = process.argv.includes("--check");
const drift = [];

/** الكتابة الوحيدة المسموحة: تقارن أولاً، وتُبلّغ الانحراف بدل صمته. */
async function commit(file, beforeRaw, value) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  const label = file.split("/").pop();
  if (next === beforeRaw) return;

  const before = JSON.parse(beforeRaw);
  const changed = value
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => JSON.stringify(item) !== JSON.stringify(before[index]))
    .map(({ item }) => item.id || item.name || "?");
  drift.push({ label, changed });

  if (CHECK) return;
  await writeFile(file, next, "utf8");
}
const DERIVED = [
  "simple_explanation",
  "simple_explanation_fr",
  "examples",
  "examples_fr",
  "exam_keywords",
  "related_terms",
];
if (REFRESH) {
  for (const item of lexicon) for (const field of DERIVED) delete item[field];
}

let added = 0;
let skipped = 0;
const warnings = [];

for (const item of lexicon) {
  if (!item.id) {
    warnings.push(`سجلّ بلا id: ${clean(item.term_ar)} — تُرِك كما هو.`);
    skipped += 1;
    continue;
  }

  const slug = lexiconSlug(item, slugSeen);
  const mentioners = new Set((termMentions.get(item.id) || []).map((id) => id));
  const relatedIds =
    item.related_terms && item.related_terms.length
      ? item.related_terms
      : rankRelated(item, relationIndex, relationIndex.get(item.id).bigrams, relationIndex.get(item.id).words, mentioners);

  const relatedItems = relatedIds.map((id) => byId.get(id)).filter(Boolean);
  const before = JSON.stringify(item);

  if (!item.simple_explanation) item.simple_explanation = simpleExplanationAr(item);
  if (!item.simple_explanation_fr) item.simple_explanation_fr = simpleExplanationFr(item);
  if (!Array.isArray(item.examples) || !item.examples.length) item.examples = examplesAr(item, relatedItems);
  if (!Array.isArray(item.examples_fr) || !item.examples_fr.length) item.examples_fr = examplesFr(item, relatedItems);
  if (!Array.isArray(item.exam_keywords) || !item.exam_keywords.length) item.exam_keywords = examKeywords(item);
  // قائمة فارغة = لا صلة حُسِبت، لا «صفر وصلات» مقصود: تُعاد هنا دائماً.
  if (!Array.isArray(item.related_terms) || !item.related_terms.length) {
    item.related_terms = relatedIds.slice(0, 5);
  }
  if (!item.canonical_url) item.canonical_url = canonicalLexicon(slug);
  if (!item.last_reviewed) item.last_reviewed = REVIEW_DATE;
  if (!item.review_status) {
    item.review_status =
      VERBATIM_IDS.has(item.id) || CURATED_FIRST_BATCH.has(item.id) ? "published" : "internal_review";
  }
  if (item.legal_sources) item.legal_sources = enrichLegalSources(item);

  // البطاقات المحرَّرة يدوياً تُطبَّق دائماً على نفسها (مصدرها editorial) ولا
  // تُترك للقالب؛ وسواها يُعلَّم auto حتى يعرف المحرّر ما الذي بحاجة إلى مراجعة.
  const curatedEntry = CURATED[item.id];
  if (curatedEntry) {
    Object.assign(item, curatedEntry, { enrichment_source: "editorial" });
  } else if (!item.enrichment_source) {
    item.enrichment_source = "auto";
  }

  if (CURATED_LINKS[item.id]) item.related_terms = CURATED_LINKS[item.id];

  if (JSON.stringify(item) !== before) added += 1;

  if ((item.related_terms || []).length < 2) {
    warnings.push(`${item.id}: أقلّ من وصلتين ذات صلة — مراجعة تحريرية.`);
  }
}

// فحص ما بعد التوليد: لا حقل فارغ، لا id وهمي، لا رابط بشرطة.
for (const item of lexicon) {
  for (const id of item.related_terms || []) {
    if (!byId.has(id)) throw new Error(`${item.id}: related_terms يشير إلى id غير موجود (${id})`);
  }
  if (item.canonical_url?.endsWith("/")) throw new Error(`${item.id}: canonical_url بشرطة نهاية`);
  for (const example of item.examples || []) {
    if (example.length < 20) throw new Error(`${item.id}: مثال أقصر من أن يكون مفيداً: ${example}`);
  }
}

for (const item of lexicon) delete item.__index;

await commit(LEXICON, lexiconRaw, lexicon);
console.log(`✓ lexicon.json: ${added}/${lexicon.length} سجلاً أُثرِي، ${skipped} تُرِك كما هو.`);

/* ── 2. schools.json: short_name ─────────────────────────────────────────── */

const schoolsRaw = await readFile(SCHOOLS, "utf8");
const schools = JSON.parse(schoolsRaw);
let schoolsTouched = 0;

for (const school of schools) {
  if (school.short_name) continue;

  // «كلية العلوم القانونية والاقتصادية والاجتماعية — عين السبع» ← «كلية الحقوق
  // عين السبع»: الاسم المختصر الذي يكتبه الطالب فعلاً، للروابط والبطاقات.
  const base = clean(school.name)
    .replace(/كلية\s+العلوم\s+القانونية\s+والاقتصادية\s+والاجتماعية/g, "كلية الحقوق")
    .replace(/\s*[—–-]\s*/g, " ")
    .replace(/جامعة\s+.*$/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  school.short_name = base || `كلية الحقوق ${clean(school.city)}`.trim();
  schoolsTouched += 1;
}

await commit(SCHOOLS, schoolsRaw, schools);
console.log(`✓ schools.json: ${schoolsTouched}/${schools.length} كلية أضيف إليها short_name.`);

/* ── 3. news.json: tags ──────────────────────────────────────────────────── */

const newsRaw = await readFile(NEWS, "utf8");
const news = JSON.parse(newsRaw);
let newsTouched = 0;

for (const item of news) {
  if (Array.isArray(item.tags) && item.tags.length) continue;

  const tokens = clean(item.title)
    .replace(/[«»"'().,:،؛!؟?]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

  const numbers = clean(item.title).match(/\d+(?:\.\d+)?/g) || [];

  const tags = [
    ...(item.category ? [clean(item.category)] : []),
    ...numbers.map((n) => `رقم ${n}`),
    ...tokens,
  ]
    .filter((tag, index, list) => tag && list.indexOf(tag) === index)
    .slice(0, 5);

  item.tags = tags;
  newsTouched += 1;
}

await commit(NEWS, newsRaw, news);
console.log(`✓ news.json: ${newsTouched}/${news.length} خبراً أضيف إليه tags.`);

for (const warning of warnings.slice(0, 8)) console.log(`  ℹ ${warning}`);

if (CHECK) {
  if (drift.length) {
    for (const { label, changed } of drift) {
      console.log(`  ✗ ${label}: ${changed.length} سجلاً غير مطابق للمولّد (${changed.slice(0, 6).join("، ")}${changed.length > 6 ? "…" : ""}).`);
    }
    console.log("\nالبيانات ليست مطابقة لِمَا يولّده هذا السكربت: شغّل `pnpm seo:enrich` ثم أعد التشغيل.");
    process.exitCode = 1;
  } else {
    console.log("✓ lexicon/schools/news مطابقة للمولّد — لا شيء للكتابة (--check).");
  }
  process.exit(process.exitCode || 0);
}

// إعادة القراءة للتأكد أن JSON صالح (لا فاصلة زائدة ولا هروب كسور).
for (const [file, value] of [
  [LEXICON, lexicon],
  [SCHOOLS, schools],
  [NEWS, news],
]) {
  const parsed = JSON.parse(await readFile(file, "utf8"));
  if (parsed.length !== value.length) throw new Error(`عدد السجلات تغيّر عند إعادة القراءة في ${file}`);
}
console.log("✓ الملفات الثلاثة صالحة JSON بعد الكتابة.");
