/**
 * مراساة موضع القراءة عند تبديل وضع القراءة الأقصى.
 * ─────────────────────────────────────────────────────────────────────
 * إعادة ترتيب الصفحة (إخفاء الهيدر/الأعمدة الجانبية، توسيط العمود) تغيّر
 * إزاحة كل عنصر، فإبقاء window.scrollY كما هو يُقفز بالنص من تحت العين.
 * الحل: قبل التبديل نحفظ «رقم العنصر الظاهر أعلى الشاشة» من بين عناصر تحمل
 * data-reader-anchor (تضيفها مكوّنة ArticleContent على كل كتلة)، وبعد أن
 * يلتقط React التخطيط الجديد نعيد التمرير إلى العنصر نفسه بغضّ النظر عن
 * تغيّر إزاحته.
 *
 * التمرير لحظي (behavior: "instant") لا متحرك — المستخدم توقّع أن يبقى
 * موضع القراءة ثابتاً، لا أن يشاهد رحلة صفحة، وهذا أيضاً ما يطلبه
 * prefers-reduced-motion.
 */

/** عناصر المقال القابلة للمراساة — بترتيب المستند نفسه. */
export function collectReaderAnchors(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>("[data-reader-anchor]"))
}

/**
 * رقم آخر عنصر تجاوزت حافته العلوية «خطّ التوقّف» (أعلى الشاشة تقريباً).
 * العناصر بترتيب المستند، فأول عنصر لم يتجاوزه هو ما بعد نقطة التوقف.
 */
export function topAnchorIndex(anchors: HTMLElement[], stopLine = 96): number {
  let index = 0
  for (let i = 0; i < anchors.length; i += 1) {
    if (anchors[i].getBoundingClientRect().top <= stopLine) index = i
    else break
  }
  return index
}

/** تمرير لحظي يضع العنصر المُراسَط تحت خطّ التوقّف مباشرة. */
export function scrollToAnchor(anchors: HTMLElement[], index: number, offset = 72): void {
  const el = anchors[index]
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: Math.max(0, top), behavior: "instant" as ScrollBehavior })
}
