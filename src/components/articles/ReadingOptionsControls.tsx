import { useEffect } from "react"
import {
  AlignLeft, BookOpen, Columns2, MonitorSmartphone, Moon, Sun, Type,
} from "lucide-react"

import {
  ensureAllReaderFontsLoaded,
  ensureReaderFontLoaded,
  READER_FONTS,
  type ReaderFontId,
  type ReaderLineHeight,
  type ReaderTextSize,
  type ReaderThemeChoice,
  type ReadingPrefs,
  type ReadingPrefsPatch,
} from "@/lib/reading/prefs"

interface ReadingOptionsControlsProps {
  prefs: ReadingPrefs
  onPrefsChange: (patch: ReadingPrefsPatch) => void
  width: "Standard" | "Wide"
  onWidthChange: (width: "Standard" | "Wide") => void
  /**
   * القشرة داخل وضع القراءة الأقصى (نافذة «Aa»): تُحمَّل الخطوط الأربعة
   * دفعة واحدة لمعاينة الرقاقات لأن النافذة تُفتح عمداً وبكامل عناصرها.
   * قشرة الشريط الجانبي في الوضع العادي تعاين الخط عند التحويم/التركيز فقط
   * حتى لا تدفع صفحة المقال العادية ثمن الخطوط دون نية اختيار.
   */
  inMaxRead?: boolean
}

/**
 * عناصر خيارات القراءة — مكوّن واحد يُلبَس فيه قشرتان:
 *   1) بطاقة «خيارات القراءة» الجانبية في الوضع العادي (وحجية الجوال).
 *   2) النافذة المنبثقة خلف زر «Aa» في وضع القراءة الأقصى.
 * مصدر واحد للحقيقة: أي تحكّم هنا يتصرف ويُحفظ بالطريقة نفسها في القشرتين.
 *
 * كل الأزرار aria-pressed وأهداف لمسها ≥ 44px (قابلية استعمال على اللمس).
 */

const CHIP_BASE =
  "min-h-[44px] rounded-xl border px-2 text-[12px] font-bold motion-safe:transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
const CHIP_ON = "border-primary/50 bg-primary/10 text-primary shadow-sm"
const CHIP_OFF = "border-border text-muted-foreground hover:bg-muted/70 hover:text-foreground"
const chip = (on: boolean) => `${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`

function SectionLabel({ icon: Icon, children }: { icon: typeof Type; children: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-black text-foreground">
      <Icon size={13} className="text-primary" aria-hidden="true" />
      {children}
    </span>
  )
}

export function ReadingOptionsControls({
  prefs,
  onPrefsChange,
  width,
  onWidthChange,
  inMaxRead = false,
}: ReadingOptionsControlsProps) {
  // معاينة الرقاقات في نافذة القراءة: فتح النافذة نية صريحة، فتُحمَّل الخطوط
  // الأربعة (بعد أن تُخزَّن في كاش المتصفح تُدفَع مرة واحدة عبر الزيارات).
  useEffect(() => {
    if (inMaxRead) void ensureAllReaderFontsLoaded()
  }, [inMaxRead])

  const previewFont = (id: ReaderFontId) => {
    if (id === "default") return
    void ensureReaderFontLoaded(id)
  }

  return (
    <div className="space-y-5 text-xs" dir="rtl">
      {/* الخط — رقاقات تعرض كلمة بعينة خطّها: الاختيار بالعين لا بالاسم */}
      <div className="space-y-2.5">
        <SectionLabel icon={Type}>الخط</SectionLabel>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="خط المقال">
          {READER_FONTS.map((font) => {
            const selected = prefs.font === font.id
            return (
              <button
                key={font.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onPrefsChange({ font: font.id })}
                onPointerEnter={() => previewFont(font.id)}
                onFocus={() => previewFont(font.id)}
                className={`${chip(selected)} flex flex-col items-center gap-0.5 py-1.5`}
              >
                <span className="text-[15px] leading-6" style={{ fontFamily: font.stack }} aria-hidden="true">
                  {font.sample}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">{font.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* حجم النص */}
      <div className="space-y-2.5">
        <SectionLabel icon={AlignLeft}>حجم الخط</SectionLabel>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="حجم خط المقال">
          {([
            { id: "small" as ReaderTextSize, label: "صغير", sample: "text-[13px]" },
            { id: "standard" as ReaderTextSize, label: "عادي", sample: "text-[15px]" },
            { id: "large" as ReaderTextSize, label: "كبير", sample: "text-[18px]" },
          ]).map((size) => (
            <button
              key={size.id}
              type="button"
              aria-pressed={prefs.size === size.id}
              onClick={() => onPrefsChange({ size: size.id })}
              className={`${chip(prefs.size === size.id)} flex flex-col items-center gap-0.5 py-1.5`}
            >
              <span className={`${size.sample} leading-5 font-black`}>أ</span>
              <span className="text-[10px] font-bold">{size.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* تباعد الأسطر — العربية تحتاج تنفّساً أكثر من اللاتينية */}
      <div className="space-y-2.5">
        <SectionLabel icon={AlignLeft}>تباعد الأسطر</SectionLabel>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="تباعد أسطر المقال">
          {([
            { id: "tight" as ReaderLineHeight, label: "ضيّق", value: "1.7", previewGap: "2px" },
            { id: "cozy" as ReaderLineHeight, label: "متوسط", value: "1.9", previewGap: "4px" },
            { id: "relaxed" as ReaderLineHeight, label: "واسع", value: "2.1", previewGap: "6px" },
          ]).map((line) => (
            <button
              key={line.id}
              type="button"
              aria-pressed={prefs.lineHeight === line.id}
              onClick={() => onPrefsChange({ lineHeight: line.id })}
              className={`${chip(prefs.lineHeight === line.id)} flex flex-col items-center justify-center gap-0.5 py-1.5`}
            >
              <span aria-hidden="true" className="flex w-8 flex-col" style={{ gap: line.previewGap }}>
                <span className="h-[2px] rounded-full bg-current opacity-80" />
                <span className="h-[2px] rounded-full bg-current opacity-80" />
                <span className="h-[2px] rounded-full bg-current opacity-80" />
              </span>
              <span className="text-[10px] font-bold">{line.label} ({line.value})</span>
            </button>
          ))}
        </div>
      </div>

      {/* عرض العمود */}
      <div className="space-y-2.5">
        <SectionLabel icon={Columns2}>عرض الصفحة</SectionLabel>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="عرض صفحة المقال">
          {([
            { id: "Standard" as const, label: "عادي" },
            { id: "Wide" as const, label: "عريض" },
          ]).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={width === option.id}
              onClick={() => onWidthChange(option.id)}
              className={`${chip(width === option.id)} py-2.5`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {inMaxRead && (
          <p className="text-[10px] leading-5 text-muted-foreground">
            في وضع القراءة الأقصى يُقيَّد طول السطر (~70 حرفاً) راحةً للعين — «عريض» يُطبَّق في العرض العادي (يفيد الجداول).
          </p>
        )}
      </div>

      {/* المظهر — «ورقي» محصور بغلاف المقال ولا يمسّ سمة الموقع */}
      <div className="space-y-2.5">
        <SectionLabel icon={Sun}>المظهر</SectionLabel>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="مظهر القراءة">
          {([
            { id: "light" as ReaderThemeChoice, label: "فاتح", icon: Sun },
            { id: "dark" as ReaderThemeChoice, label: "داكن", icon: Moon },
            { id: "sepia" as ReaderThemeChoice, label: "ورقي", icon: BookOpen },
            { id: "auto" as ReaderThemeChoice, label: "تلقائي", icon: MonitorSmartphone },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={prefs.theme === id}
              onClick={() => onPrefsChange({ theme: id })}
              className={`${chip(prefs.theme === id)} flex flex-col items-center justify-center gap-1 py-2`}
            >
              <Icon size={15} aria-hidden="true" />
              <span className="text-[9px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
