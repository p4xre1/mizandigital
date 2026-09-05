import { useCallback, useEffect, useState } from "react"

export type Theme = "light" | "dark"

// مفتاح التخزين المحلي لتفضيل الوضع الليلي/النهاري. عند وجود قيمة محفوظة
// هنا، تُعتبر "تجاوزاً يدوياً" من طرف المستخدم ولا تُستبدل تلقائياً حتى
// لو تغيّر تفضيل نظام التشغيل لاحقاً.
const THEME_STORAGE_KEY = "mizan_theme"
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)"

const readStoredTheme = (): Theme | null => {
  if (typeof window === "undefined") return null
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored === "light" || stored === "dark" ? stored : null
}

const readSystemTheme = (): Theme => {
  if (typeof window === "undefined" || !window.matchMedia) return "dark"
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light"
}

const applyThemeToDocument = (theme: Theme) => {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.style.colorScheme = theme
}

/**
 * hook قابل لإعادة الاستخدام لإدارة الوضع الليلي/النهاري عبر المنصة:
 * - يعتمد افتراضياً على تفضيل نظام التشغيل/الجهاز
 *   (prefers-color-scheme)، بما فيها الهواتف المحمولة.
 * - أي تبديل يدوي من طرف المستخدم يُحفظ فـ localStorage تحت
 *   المفتاح "mizan_theme" ويُعطى الأولوية بشكل دائم على تفضيل النظام.
 * - إن لم يسبق للمستخدم تبديل الوضع يدوياً، يبقى الموقع متزامناً بشكل
 *   حي مع تغييرات تفضيل النظام (مثال: التفعيل التلقائي الليلي بالهاتف).
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? readSystemTheme())
  // هل قام المستخدم بتجاوز تفضيل النظام يدوياً خلال هذه الجلسة/سابقاً؟
  const [hasManualOverride, setHasManualOverride] = useState<boolean>(() => readStoredTheme() !== null)

  // مزامنة الـ <html> class + colorScheme فور تغيّر الحالة
  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  // الاستماع الحي لتغيّر تفضيل النظام (مثلاً تفعيل "الوضع الليلي" التلقائي
  // بالهاتف عند الغروب)، لكن فقط طالما لم يقم المستخدم بتجاوز يدوي
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY)

    const handleSystemChange = (event: MediaQueryListEvent) => {
      if (hasManualOverride) return
      setThemeState(event.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleSystemChange)
    return () => mediaQuery.removeEventListener("change", handleSystemChange)
  }, [hasManualOverride])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    setHasManualOverride(true)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  // إعادة الضبط على تفضيل النظام (مسح التجاوز اليدوي) — غير مُستخدَمة
  // حالياً بالواجهة لكن مُتاحة لأي زر "استخدام إعداد الجهاز" مستقبلاً
  const resetToSystemTheme = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(THEME_STORAGE_KEY)
    }
    setHasManualOverride(false)
    setThemeState(readSystemTheme())
  }, [])

  return { theme, setTheme, toggleTheme, hasManualOverride, resetToSystemTheme }
}
