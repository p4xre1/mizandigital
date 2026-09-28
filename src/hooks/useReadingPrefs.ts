import { useCallback, useEffect, useRef, useState } from "react"

import { useTheme } from "./useTheme"
import {
  READING_PREFS_STORAGE_KEY,
  ensureReaderFontLoaded,
  readReadingPrefs,
  saveReadingPrefs,
  type ReadingPrefs,
  type ReadingPrefsPatch,
} from "@/lib/reading/prefs"

/**
 * حالة تفضيلات القراءة لصفحات المقال — الجسر بين تخزين mizan_reading_prefs
 * وhook السمة الموحّد useTheme.
 *
 * قواعد السمة:
 * ─────────────
 * • «فاتح/داكن/تلقائي»: يوجَّه useTheme كما هو (setTheme / resetToSystemTheme)
 *   فيبقى مفتاح mizan_theme مصدر حقيقة سمة الموقع كامل — زر التبديل في
 *   الهيدر ولوحة القراءة يكتبان في المكان نفسه.
 * • «ورقي»: لا يمسّ سمة الموقع إطلاقاً؛ يُطبَّق كمتغيرات CSS محصورة في غلاف
 *   المقال (.reader-shell) انظر globals.css.
 *
 * المعايرة عند التركيب: إن كان الاختيار المحفوظ «فاتح/داكن» بينما سمة الموقع
 * الفعلية مختلفة (غيّرها المستخدم من هيدر صفحة أخرى)، سمة الموقع هي الفاصلة
 * وتُعاير عليها التفضيلات — لا يظهر للقارئ اختلاف بين ما يراه وما هو محفوظ.
 */
export function useReadingPrefs() {
  const { theme: siteTheme, setTheme, resetToSystemTheme } = useTheme()
  const [prefs, setPrefsState] = useState<ReadingPrefs>(() => readReadingPrefs())
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  // مرة واحدة عند التركيب: إن لم يسبق للزائر حفظ أي تفضيل فلا نكتب في
  // localStorage إطلاقاً (لا داعي لتثبيت الافتراضيات عنده)، وإلا زامنّا
  // السمات على <html> مع المخزن ومعايرة الاختيار الفاتح/داكن على سمة
  // الموقع الفعلية (قد يكون غيّرها من هيدر صفحة أخرى).
  useEffect(() => {
    setPrefsState((prev) => {
      let storedExists = false
      try {
        storedExists = window.localStorage.getItem(READING_PREFS_STORAGE_KEY) != null
      } catch {
        storedExists = false
      }
      if (!storedExists) return prev
      if (prev.theme === "sepia" || prev.theme === "auto") return saveReadingPrefs(prev)
      const resolved = siteTheme === "dark" ? "dark" : "light"
      if (prev.theme === resolved) return saveReadingPrefs(prev)
      return saveReadingPrefs({ ...prev, theme: resolved })
    })
    // عن قصد مرة واحدة — siteTheme قُرئ لحظة التركيب فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // خط القارئ المطلوب: مفضَّل من زيارة سابقة أو مختار الآن — يُحمَّل عند
  // الحاجة فقط (idempotent داخل الوحدة).
  useEffect(() => {
    if (prefs.font !== "default") void ensureReaderFontLoaded(prefs.font)
  }, [prefs.font])

  const update = useCallback(
    (patch: ReadingPrefsPatch) => {
      const next = saveReadingPrefs({ ...prefsRef.current, ...patch })
      prefsRef.current = next
      setPrefsState(next)

      // السمات غير الورقية تُدار من useTheme (يكتب mizan_theme لتبقى الهيدر
      // ولوحة القراءة متطابقين). «ورقي» يعني: اترك سمة الموقع كما هي.
      if (patch.theme === "light") setTheme("light")
      else if (patch.theme === "dark") setTheme("dark")
      else if (patch.theme === "auto") resetToSystemTheme()

      if (patch.font && patch.font !== "default") void ensureReaderFontLoaded(patch.font)
    },
    [setTheme, resetToSystemTheme]
  )

  return { prefs, update }
}
