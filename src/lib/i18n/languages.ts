// src/lib/i18n/languages.ts
//
// ─────────────────────────────────────────────────────────────────────────────
// سجل اللغات المدعومة في أداة الترجمة
// ─────────────────────────────────────────────────────────────────────────────
// الأكواد هنا هي أكواد Google gtx (نفسها تقريباً ISO 639-1) لأن هذا هو
// المزوّد الأول في السلسلة. الفروقات المعروفة عن ISO موثّقة لكل حالة:
//   iw  → العبرية (ISO الحديث: he). gtx ما زال يقبل iw ويرفض he في بعض
//         الحالات، لذا نُمرّر iw للمزوّدات كلها.
//   zh-CN / zh-TW → الصينية المبسطة/التقليدية (ليست ISO 639-1 خالصة).
//   jw  → الجاوية (Google تستعمل jw بدل jv).
//   tl  → الفلبينية/التاغالوغية.
//   hmn → الهمونجية (ثلاثية الحروف عند Google).
//
// `rtl` تُستعمل لضبط اتجاه الصفحة بعد الترجمة — الترجمة من العربية إلى لغة
// يسارية بلا قلب الاتجاه تُنتج نصاً غير مقروء عملياً.
//
// ملاحظة مهمة: عدد اللغات هنا ليس ادعاءً بجودة الترجمة. المحرّك يُترجم
// آلياً، والترجمة الآلية للنصوص القانونية (مصطلحات، إحالات، أرقام فصول)
// تفقد دقتها غالباً — لهذا تبقى الأداة معلَّمة بأنها ترجمة آلية غير رسمية.

export interface Language {
  /** كود اللغة كما يُمرَّر للمزوّد. */
  code: string
  /** الاسم بلغته الأصلية (يظهر في القائمة). */
  name: string
  /** اسم بالعربية (يظهر كسطر ثانوي ويساعد في البحث). */
  ar: string
  /** اتجاه الكتابة — يُقلب اتجاه المحتوى عند الترجمة إلى لغة يسارية. */
  rtl?: boolean
  /** كود بديل لمزوّد MyMemory حين يختلف. */
  mymemory?: string
}

/** اللغة المصدر للموقع. */
export const SOURCE_LANG = "ar"

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", ar: "الإنجليزية" },
  { code: "fr", name: "Français", ar: "الفرنسية" },
  { code: "es", name: "Español", ar: "الإسبانية" },
  { code: "de", name: "Deutsch", ar: "الألمانية" },
  { code: "it", name: "Italiano", ar: "الإيطالية" },
  { code: "pt", name: "Português", ar: "البرتغالية" },
  { code: "nl", name: "Nederlands", ar: "الهولندية" },
  { code: "ru", name: "Русский", ar: "الروسية" },
  { code: "uk", name: "Українська", ar: "الأوكرانية" },
  { code: "pl", name: "Polski", ar: "البولندية" },
  { code: "cs", name: "Čeština", ar: "التشيكية" },
  { code: "sk", name: "Slovenčina", ar: "السلوفاكية" },
  { code: "sl", name: "Slovenščina", ar: "السلوفينية" },
  { code: "hr", name: "Hrvatski", ar: "الكرواتية" },
  { code: "bs", name: "Bosanski", ar: "البوسنية" },
  { code: "sr", name: "Српски", ar: "الصربية" },
  { code: "mk", name: "Македонски", ar: "المقدونية" },
  { code: "bg", name: "Български", ar: "البلغارية" },
  { code: "ro", name: "Română", ar: "الرومانية" },
  { code: "hu", name: "Magyar", ar: "الهنغارية" },
  { code: "el", name: "Ελληνικά", ar: "اليونانية" },
  { code: "sv", name: "Svenska", ar: "السويدية" },
  { code: "no", name: "Norsk", ar: "النرويجية" },
  { code: "da", name: "Dansk", ar: "الدانماركية" },
  { code: "fi", name: "Suomi", ar: "الفنلندية" },
  { code: "is", name: "Íslenska", ar: "الآيسلندية" },
  { code: "et", name: "Eesti", ar: "الإستونية" },
  { code: "lv", name: "Latviešu", ar: "اللاتفية" },
  { code: "lt", name: "Lietuvių", ar: "الليتوانية" },
  { code: "be", name: "Беларуская", ar: "البيلاروسية" },
  { code: "ga", name: "Gaeilge", ar: "الأيرلندية" },
  { code: "cy", name: "Cymraeg", ar: "الويلزية" },
  { code: "gd", name: "Gàidhlig", ar: "الغيلية الاسكتلندية" },
  { code: "eu", name: "Euskara", ar: "الباسكية" },
  { code: "ca", name: "Català", ar: "الكتالونية" },
  { code: "gl", name: "Galego", ar: "الغاليسية" },
  { code: "mt", name: "Malti", ar: "المالطية" },
  { code: "sq", name: "Shqip", ar: "الألبانية" },
  { code: "hy", name: "Հայերեն", ar: "الأرمنية" },
  { code: "ka", name: "ქართული", ar: "الجورجية" },
  { code: "az", name: "Azərbaycan", ar: "الأذربيجانية" },
  { code: "tr", name: "Türkçe", ar: "التركية" },
  { code: "kk", name: "Қазақша", ar: "الكازاخية" },
  { code: "ky", name: "Кыргызча", ar: "القيرغيزية" },
  { code: "uz", name: "Oʻzbekcha", ar: "الأوزبكية" },
  { code: "tk", name: "Türkmençe", ar: "التركمانية" },
  { code: "tg", name: "Тоҷикӣ", ar: "الطاجيكية" },
  { code: "mn", name: "Монгол", ar: "المنغولية" },
  { code: "zh-CN", name: "中文 (简体)", ar: "الصينية المبسطة" },
  { code: "zh-TW", name: "中文 (繁體)", ar: "الصينية التقليدية" },
  { code: "ja", name: "日本語", ar: "اليابانية" },
  { code: "ko", name: "한국어", ar: "الكورية" },
  { code: "vi", name: "Tiếng Việt", ar: "الفيتنامية" },
  { code: "th", name: "ไทย", ar: "التايلاندية" },
  { code: "lo", name: "ລາວ", ar: "اللاوية" },
  { code: "km", name: "ខ្មែរ", ar: "الخميرية" },
  { code: "my", name: "မြန်မာ", ar: "البورمية" },
  { code: "id", name: "Bahasa Indonesia", ar: "الإندونيسية" },
  { code: "ms", name: "Bahasa Melayu", ar: "الملايوية" },
  { code: "jw", name: "Basa Jawa", ar: "الجاوية" },
  { code: "su", name: "Basa Sunda", ar: "السوندية" },
  { code: "tl", name: "Filipino", ar: "الفلبينية" },
  { code: "ceb", name: "Cebuano", ar: "السيبيوانية" },
  { code: "hi", name: "हिन्दी", ar: "الهندية" },
  { code: "ur", name: "اردو", ar: "الأردية", rtl: true },
  { code: "fa", name: "فارسی", ar: "الفارسية", rtl: true },
  { code: "ps", name: "پښتو", ar: "البشتو", rtl: true },
  { code: "sd", name: "سنڌي", ar: "السندية", rtl: true },
  { code: "ug", name: "ئۇيغۇرچە", ar: "الأويغورية", rtl: true },
  { code: "ku", name: "Kurdî", ar: "الكردية" },
  { code: "he", name: "עברית", ar: "العبرية", rtl: true, mymemory: "he" },
  { code: "yi", name: "ייִדיש", ar: "اليديشية", rtl: true },
  { code: "bn", name: "বাংলা", ar: "البنغالية" },
  { code: "pa", name: "ਪੰਜਾਬੀ", ar: "البنجابية" },
  { code: "gu", name: "ગુજરાતી", ar: "الغوجاراتية" },
  { code: "mr", name: "मराठी", ar: "الماراثية" },
  { code: "ne", name: "नेपाली", ar: "النيبالية" },
  { code: "si", name: "සිංහල", ar: "السنهالية" },
  { code: "ta", name: "தமிழ்", ar: "التاميلية" },
  { code: "te", name: "తెలుగు", ar: "التيلوغوية" },
  { code: "kn", name: "ಕನ್ನಡ", ar: "الكانادية" },
  { code: "ml", name: "മലയാളം", ar: "المالايالامية" },
  { code: "or", name: "ଓଡ଼ିଆ", ar: "الأوريا" },
  { code: "as", name: "অসমীয়া", ar: "الأسامية" },
  { code: "mai", name: "মৈথিলী", ar: "المايثيلية" },
  { code: "sa", name: "संस्कृतम्", ar: "السنسكريتية" },
  { code: "bho", name: "भोजपुरी", ar: "البهوجبورية" },
  { code: "doi", name: "डोगरी", ar: "الدوغرية" },
  { code: "kok", name: "कोंकणी", ar: "الكونكانية" },
  { code: "mni-Mtei", name: "ꯃꯤꯇꯩꯂꯣꯟ", ar: "الميتيلية" },
  { code: "dv", name: "ދިވެހި", ar: "الديفيهية", rtl: true },
  { code: "dz", name: "རྫོང་ཁ", ar: "الزونخاية" },
  { code: "bo", name: "བོད་སྐད་", ar: "التبتية" },
  { code: "sw", name: "Kiswahili", ar: "السواحيلية" },
  { code: "am", name: "አማርኛ", ar: "الأمهرية" },
  { code: "ti", name: "ትግርኛ", ar: "التغرينية" },
  { code: "om", name: "Afaan Oromoo", ar: "الأورومية" },
  { code: "so", name: "Soomaali", ar: "الصومالية" },
  { code: "ha", name: "Hausa", ar: "الهوسا" },
  { code: "yo", name: "Yorùbá", ar: "اليوربا" },
  { code: "ig", name: "Igbo", ar: "الإيغبو" },
  { code: "zu", name: "isiZulu", ar: "الزولو" },
  { code: "xh", name: "isiXhosa", ar: "الكوسا" },
  { code: "af", name: "Afrikaans", ar: "الأفريقانية" },
  { code: "st", name: "Sesotho", ar: "السيسوتو" },
  { code: "sn", name: "Shona", ar: "الشونا" },
  { code: "ny", name: "Chichewa", ar: "الشيشيوا" },
  { code: "rw", name: "Kinyarwanda", ar: "الكينيارواندا" },
  { code: "lg", name: "Luganda", ar: "اللوغاندا" },
  { code: "ln", name: "Lingála", ar: "اللينغالا" },
  { code: "mg", name: "Malagasy", ar: "الملغاشية" },
  { code: "nso", name: "Sepedi", ar: "السبيدي" },
  { code: "ts", name: "Xitsonga", ar: "التسونغا" },
  { code: "tn", name: "Setswana", ar: "التسوانية" },
  { code: "ss", name: "siSwati", ar: "السوازي" },
  { code: "ve", name: "Tshivenḓa", ar: "الفيندا" },
  { code: "nr", name: "isiNdebele", ar: "النديبيلية" },
  { code: "ak", name: "Akan", ar: "الأكانية" },
  { code: "ee", name: "Eʋegbe", ar: "الإيوي" },
  { code: "tw", name: "Twi", ar: "التوي" },
  { code: "wo", name: "Wolof", ar: "الولوفية" },
  { code: "bm", name: "Bamanankan", ar: "البمبارية" },
  { code: "haw", name: "ʻŌlelo Hawaiʻi", ar: "الهاوايية" },
  { code: "mi", name: "Māori", ar: "الماورية" },
  { code: "sm", name: "Gagana Sāmoa", ar: "الساموية" },
  { code: "to", name: "Lea faka-Tonga", ar: "التونغية" },
  { code: "fj", name: "Na Vosa Vakaviti", ar: "الفيجية" },
  { code: "hmn", name: "Hmoob", ar: "الهمونجية" },
  { code: "la", name: "Latina", ar: "اللاتينية" },
  { code: "eo", name: "Esperanto", ar: "الإسبرانتو" },
  { code: "ht", name: "Kreyòl Ayisyen", ar: "الكريولية الهايتية" },
  { code: "qu", name: "Runasimi", ar: "الكيتشوا" },
  { code: "gn", name: "Avañe'ẽ", ar: "الغوارانية" },
  { code: "ay", name: "Aymar aru", ar: "الأيمارا" },
  { code: "co", name: "Corsu", ar: "الكورسيكية" },
  { code: "fy", name: "Frysk", ar: "الفريزية" },
  { code: "lb", name: "Lëtzebuergesch", ar: "اللكسمبورغية" },
  { code: "tt", name: "Татарча", ar: "التتارية" },
  { code: "cv", name: "Чӑвашла", ar: "التشوفاشية" },
  { code: "ba", name: "Башҡортса", ar: "الباشكيرية" },
  { code: "sah", name: "Саха тыла", ar: "الياقوتية" },
  { code: "os", name: "Ирон", ar: "الأوسيتية" },
  { code: "ab", name: "Аҧсуа", ar: "الأبخازية" },
  { code: "ce", name: "Нохчийн", ar: "الشيشانية" },
  { code: "udm", name: "Удмурт", ar: "الأودمورتية" },
  { code: "myv", name: "Эрзянь", ar: "الإرزيا" },
  { code: "mhr", name: "Олык марий", ar: "الماري" },
  { code: "chr", name: "ᏣᎳᎩ", ar: "الشيروكي" },
  { code: "ike", name: "ᐃᓄᒃᑎᑐᑦ", ar: "الإنوكتيتوت" },
  { code: "cr", name: "ᓀᐦᐃᔭᐍᐏᐣ", ar: "الكري" },
  { code: "iu", name: "ᐃᓄᒃᑎᑐᑦ", ar: "الإنكتيتوت" },
]

/** خريطة سريعة code → لغة. */
export const LANGUAGE_MAP: ReadonlyMap<string, Language> = new Map(
  LANGUAGES.map((lang) => [lang.code, lang])
)

/**
 * هل الكود معروف؟
 * العربية هي اللغة المصدر فلا تُعرض كهدف ترجمة، لكنها لغة يعرفها النظام.
 */
export function isKnownLanguage(code: string): boolean {
  return code === SOURCE_LANG || LANGUAGE_MAP.has(code)
}

export function getLanguage(code: string): Language | undefined {
  return LANGUAGE_MAP.get(code)
}

/** هل لغة الهدف تُكتب من اليمين لليسار؟ العربية نفسها كذلك. */
export function isRtlLanguage(code: string): boolean {
  if (code === SOURCE_LANG) return true
  return LANGUAGE_MAP.get(code)?.rtl === true
}

/**
 * بحث متسامح في القائمة — يطابق الاسم الأصلي أو الاسم العربي أو الكود.
 * يُستعمل في حقل البحث داخل الأداة.
 */
export function searchLanguages(query: string): Language[] {
  const q = query.trim().toLowerCase()
  if (!q) return LANGUAGES
  return LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      l.ar.includes(query.trim()) ||
      l.code.toLowerCase().startsWith(q)
  )
}

/** اللغات الأكثر احتمالاً لزوار موقع قانوني مغربي — تُعرض أولاً. */
export const PRIORITY_LANGUAGES = ["en", "fr", "es", "de", "zh-CN", "tr", "ur", "fa", "ru"]

/**
 * القائمة مرتّبة: الأولويات أولاً ثم الباقي أبجدياً بالاسم الأصلي.
 * محسوب مرة واحدة عند التحميل.
 */
export const SORTED_LANGUAGES: Language[] = (() => {
  const priority = PRIORITY_LANGUAGES.map((c) => LANGUAGE_MAP.get(c)).filter(
    (l): l is Language => Boolean(l)
  )
  const rest = LANGUAGES.filter((l) => !PRIORITY_LANGUAGES.includes(l.code)).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  return [...priority, ...rest]
})()
