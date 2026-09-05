import { useEffect, useRef, useState } from "react"
import { Languages, Check, Search, Loader2 } from "lucide-react"

declare global {
  interface Window {
    google?: any
    googleTranslateElementInit?: () => void
  }
}

// لائحة شبه كاملة للغات التي يدعمها محرك Google للترجمة (الأكواد كما
// يتعرّف عليها Google Website Translator تحديداً — بعضها يختلف عن ISO
// القياسي، مثل "iw" للعبرية و"zh-CN"/"zh-TW" للصينية).
const LANGUAGES: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "zh-CN", name: "中文 (简体)" },
  { code: "zh-TW", name: "中文 (繁體)" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "hi", name: "हिन्दी" },
  { code: "ur", name: "اردو" },
  { code: "fa", name: "فارسی" },
  { code: "tr", name: "Türkçe" },
  { code: "iw", name: "עברית" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "Polski" },
  { code: "sv", name: "Svenska" },
  { code: "no", name: "Norsk" },
  { code: "da", name: "Dansk" },
  { code: "fi", name: "Suomi" },
  { code: "el", name: "Ελληνικά" },
  { code: "cs", name: "Čeština" },
  { code: "sk", name: "Slovenčina" },
  { code: "ro", name: "Română" },
  { code: "hu", name: "Magyar" },
  { code: "uk", name: "Українська" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "th", name: "ไทย" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ms", name: "Bahasa Melayu" },
  { code: "tl", name: "Filipino" },
  { code: "bn", name: "বাংলা" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "pa", name: "ਪੰਜਾਬੀ" },
  { code: "gu", name: "ગુજરાતી" },
  { code: "mr", name: "मराठी" },
  { code: "kn", name: "ಕನ್ನಡ" },
  { code: "ml", name: "മലയാളം" },
  { code: "si", name: "සිංහල" },
  { code: "ne", name: "नेपाली" },
  { code: "km", name: "ខ្មែរ" },
  { code: "lo", name: "ລາວ" },
  { code: "my", name: "မြန်မာ" },
  { code: "sw", name: "Kiswahili" },
  { code: "am", name: "አማርኛ" },
  { code: "ha", name: "Hausa" },
  { code: "yo", name: "Yorùbá" },
  { code: "ig", name: "Igbo" },
  { code: "zu", name: "isiZulu" },
  { code: "xh", name: "isiXhosa" },
  { code: "st", name: "Sesotho" },
  { code: "sn", name: "Shona" },
  { code: "ny", name: "Chichewa" },
  { code: "so", name: "Soomaali" },
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Shqip" },
  { code: "hy", name: "Հայերեն" },
  { code: "az", name: "Azərbaycan" },
  { code: "eu", name: "Euskara" },
  { code: "be", name: "Беларуская" },
  { code: "bs", name: "Bosanski" },
  { code: "bg", name: "Български" },
  { code: "ca", name: "Català" },
  { code: "hr", name: "Hrvatski" },
  { code: "et", name: "Eesti" },
  { code: "gl", name: "Galego" },
  { code: "ka", name: "ქართული" },
  { code: "is", name: "Íslenska" },
  { code: "ga", name: "Gaeilge" },
  { code: "kk", name: "Қазақша" },
  { code: "ky", name: "Кыргызча" },
  { code: "lv", name: "Latviešu" },
  { code: "lt", name: "Lietuvių" },
  { code: "lb", name: "Lëtzebuergesch" },
  { code: "mk", name: "Македонски" },
  { code: "mt", name: "Malti" },
  { code: "mn", name: "Монгол" },
  { code: "sr", name: "Српски" },
  { code: "sl", name: "Slovenščina" },
  { code: "tg", name: "Тоҷикӣ" },
  { code: "uz", name: "Oʻzbekcha" },
  { code: "cy", name: "Cymraeg" },
  { code: "yi", name: "ייִדיש" },
  { code: "ps", name: "پښتو" },
  { code: "co", name: "Corsu" },
  { code: "fy", name: "Frysk" },
  { code: "gd", name: "Gàidhlig" },
  { code: "ht", name: "Kreyòl Ayisyen" },
  { code: "haw", name: "ʻŌlelo Hawaiʻi" },
  { code: "hmn", name: "Hmoob" },
  { code: "jw", name: "Basa Jawa" },
  { code: "su", name: "Basa Sunda" },
  { code: "la", name: "Latina" },
  { code: "eo", name: "Esperanto" },
  { code: "mg", name: "Malagasy" },
  { code: "mi", name: "Māori" },
  { code: "sm", name: "Gagana Sāmoa" },
  { code: "sd", name: "سنڌي" },
  { code: "ceb", name: "Cebuano" },
  { code: "ku", name: "Kurdî" },
]

const SCRIPT_ID = "google-translate-script"
const ELEMENT_ID = "google_translate_element"
const STORAGE_KEY = "mizan_translate_lang"
const SOURCE_LANG = "ar"

function fireChangeEvent(el: HTMLSelectElement) {
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

function waitForCombo(maxAttempts = 60, intervalMs = 100): Promise<HTMLSelectElement | null> {
  return new Promise((resolve) => {
    let attempts = 0
    const timer = setInterval(() => {
      attempts += 1
      const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo")
      if (combo) {
        clearInterval(timer)
        resolve(combo)
      } else if (attempts >= maxAttempts) {
        clearInterval(timer)
        resolve(null)
      }
    }, intervalMs)
  })
}

let scriptLoadPromise: Promise<void> | null = null

// تحميل مُفرد (idempotent) لسكريبت Google Website Translator — يُحمَّل مرة
// واحدة فقط بغض النظر عن عدد مرات فتح القارئ للأداة عبر عدة مقالات
function ensureScriptLoaded(): Promise<void> {
  if (window.google?.translate?.TranslateElement) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise((resolve) => {
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        { pageLanguage: SOURCE_LANG, autoDisplay: false },
        ELEMENT_ID
      )
      resolve()
    }
    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
    script.async = true
    document.body.appendChild(script)
  })

  return scriptLoadPromise
}

/**
 * أداة ترجمة صفحة المقال إلى أي لغة يختارها القارئ، عبر محرك Google
 * للترجمة (مجاني، بلا حدود استخدام أو مفتاح API) — بواجهة منسدلة مخصّصة
 * بالعربية بدل شريط Google الافتراضي. الترجمة تتم بالكامل داخل نفس
 * الصفحة (بدون تنقّل لرابط جديد أو مسار لغة منفصل /en, /fr...).
 */
export function ArticleTranslateWidget({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeLang, setActiveLang] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement | null>(null)
  const appliedFromStorage = useRef(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // إعادة تطبيق آخر لغة اختارها القارئ تلقائياً عند فتح مقال آخر، حتى لا
  // يضطر لإعادة الاختيار في كل صفحة
  useEffect(() => {
    if (appliedFromStorage.current) return
    appliedFromStorage.current = true
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && stored !== SOURCE_LANG) {
      applyLanguage(stored, { silent: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyLanguage = async (code: string, opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true)
    await ensureScriptLoaded()
    const combo = await waitForCombo()
    if (combo) {
      combo.value = code
      fireChangeEvent(combo)
    }
    setActiveLang(code === SOURCE_LANG ? null : code)
    window.localStorage.setItem(STORAGE_KEY, code)
    setLoading(false)
    setOpen(false)
  }

  const filteredLanguages = LANGUAGES.filter((l) =>
    l.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  const activeLabel = LANGUAGES.find((l) => l.code === activeLang)?.name

  return (
    <div ref={containerRef} className={`relative inline-block notranslate ${className}`} translate="no">
      {/* حاوية مخفية يُدرج فيها Google عنصر التحكم الفعلي بالترجمة —
          مهم: لازم تبقى فـ الـ layout (بلا display:none)، لأن سكريبت
          Google Translate خاصو يقيس/يبني عنصر <select class="goog-te-combo">
          بداخلها فعلياً، وإلا الترجمة ما كتخدمش (الكومبو يبقى فارغ أو بلا
          تأثير حتى لو تبدّلت قيمته). كنخبّيوها بصرياً عبر إخراجها برّا
          الشاشة (position/overflow) بدل hidden/display:none */}
      <div
        id={ELEMENT_ID}
        aria-hidden="true"
        style={{ position: "fixed", top: "-9999px", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
      />

      {/* إخفاء واجهة Google الافتراضية (الشريط العلوي، تمييز النص، الفقاعات) لصالح القائمة المخصصة أدناه */}
      <style>{`
        .goog-te-banner-frame.skiptranslate { display: none !important; }
        body { top: 0 !important; }
        .goog-text-highlight { background: none !important; box-shadow: none !important; }
        .goog-tooltip, .goog-tooltip:hover { display: none !important; }
        #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
      `}</style>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="ترجمة هذه الصفحة إلى لغة أخرى"
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
          activeLang ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Languages size={13} />}
        <span>{activeLabel || "ترجمة"}</span>
      </button>

      {open && (
        <div
          dir="rtl"
          className="absolute z-50 mt-2 flex max-h-80 w-64 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن لغة..."
                className="w-full rounded-md border border-border bg-background py-1.5 pr-8 pl-2 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => applyLanguage(SOURCE_LANG)}
            className={`flex items-center justify-between px-3 py-2 text-xs transition hover:bg-muted ${
              !activeLang ? "font-bold text-primary" : "text-foreground"
            }`}
          >
            <span>الأصل (العربية)</span>
            {!activeLang && <Check size={13} />}
          </button>

          <div className="flex-1 overflow-y-auto">
            {filteredLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => applyLanguage(lang.code)}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs transition hover:bg-muted ${
                  activeLang === lang.code ? "font-bold text-primary" : "text-foreground"
                }`}
              >
                <span>{lang.name}</span>
                {activeLang === lang.code && <Check size={13} />}
              </button>
            ))}
            {filteredLanguages.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">لا توجد نتائج</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}