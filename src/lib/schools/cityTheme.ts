/**
 * هوية بصرية لكل مدينة تحتضن كلية حقوق.
 *
 * لماذا؟ أغلب الكليات لا تملك شعاراً منشوراً في المستودع، فكانت البطاقات كلها
 * تعرض حرفاً واحداً على مربع أزرق. هنا لكل مدينة لون مميز ونجمة زليج بعدد
 * رؤوس وزاوية خاصة بها، فتتميز المدن بصرياً حتى دون صورة.
 *
 * القاعدة: الشعار الحقيقي للكلية يبقى دائماً أولوية. الهوية الخاصة بالمدينة
 * بديل عند غياب الشعار، ولا تُنسب إلى أي مؤسسة.
 */

export interface CityTheme {
  /** لونان للتدرّج، ولون ثالث للحدّ والنقطة المركزية. */
  from: string;
  to: string;
  accent: string;
  /** عدد رؤوس النجمة (6 أو 8 أو 10 أو 12). */
  points: 6 | 8 | 10 | 12;
  /** نسبة نصف القطر الداخلي إلى الخارجي (كلما صغرت صارت النجمة أدق). */
  inner: number;
}

const PALETTE: CityTheme[] = [
  { from: "#2563eb", to: "#06b6d4", accent: "#bae6fd", points: 8, inner: 0.55 }, // 0 أزرق سماوي
  { from: "#7c3aed", to: "#db2777", accent: "#f5d0fe", points: 10, inner: 0.6 }, // 1 بنفسجي وردي
  { from: "#d97706", to: "#dc2626", accent: "#fde68a", points: 12, inner: 0.62 }, // 2 ذهبي أحمر
  { from: "#059669", to: "#0d9488", accent: "#a7f3d0", points: 8, inner: 0.5 }, // 3 زمردي
  { from: "#e11d48", to: "#f97316", accent: "#fecdd3", points: 6, inner: 0.5 }, // 4 قرمزي برتقالي
  { from: "#4f46e5", to: "#0ea5e9", accent: "#c7d2fe", points: 10, inner: 0.56 }, // 5 نيلي
  { from: "#65a30d", to: "#ca8a04", accent: "#d9f99d", points: 8, inner: 0.58 }, // 6 أخضر زيتي
  { from: "#0f766e", to: "#1d4ed8", accent: "#99f6e4", points: 12, inner: 0.5 }, // 7 تركوازي
  { from: "#b45309", to: "#7c2d12", accent: "#fed7aa", points: 6, inner: 0.55 }, // 8 نحاسي
  { from: "#be185d", to: "#6d28d9", accent: "#fbcfe8", points: 8, inner: 0.52 }, // 9 فوشيا
  { from: "#0891b2", to: "#84cc16", accent: "#cffafe", points: 10, inner: 0.54 }, // 10 بحري وليموني
  { from: "#9333ea", to: "#f59e0b", accent: "#e9d5ff", points: 12, inner: 0.6 }, // 11 أرجواني ذهبي
  { from: "#334155", to: "#0284c7", accent: "#cbd5e1", points: 6, inner: 0.48 }, // 12 رمادي أزرق
  { from: "#c2410c", to: "#a16207", accent: "#ffedd5", points: 10, inner: 0.58 }, // 13 طيني
  { from: "#16a34a", to: "#2563eb", accent: "#dcfce7", points: 6, inner: 0.56 }, // 14 أخضر أزرق
  { from: "#db2777", to: "#4338ca", accent: "#fce7f3", points: 12, inner: 0.56 }, // 15 وردي نيلي
  { from: "#0e7490", to: "#7e22ce", accent: "#a5f3fc", points: 8, inner: 0.6 }, // 16 سماوي بنفسجي
];

/** مدن معروفة في دليل الكليات، ومكان كل واحدة في اللوحة ثابت حتى لا تتغير الألوان بين الزيارات. */
const KNOWN_CITIES: Record<string, number> = {
  "الدار البيضاء": 0,
  "الرباط": 1,
  "مراكش": 2,
  "طنجة": 3,
  "أكادير": 4,
  "الناظور": 5,
  "القنيطرة": 6,
  "فاس": 7,
  "سطات": 8,
  "المحمدية": 9,
  "سلا": 10,
  "مكناس": 11,
  "وجدة": 12,
  "تطوان": 13,
  "الجديدة": 14,
  "قلعة السراغنة": 15,
  "أيت ملول": 16,
};

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** هوية المدينة. المدينة غير المعروفة تأخذ لوحة ثابتة بحسب اسمها. */
export function cityTheme(city: string | null | undefined): CityTheme {
  const name = (city ?? "").trim();
  const index = name && name in KNOWN_CITIES ? KNOWN_CITIES[name] : hash(name) % PALETTE.length;
  return PALETTE[index];
}

/** نقاط نجمة منتظمة بعدد الرؤوس المطلوب، لاستعمالها في SVG. */
export function starPolygon(points: number, inner: number, size = 48): string {
  const c = size / 2;
  const outer = size / 2 - 2;
  const r = outer * inner;
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : r;
    const angle = (Math.PI * i) / points - Math.PI / 2;
    out.push(`${(c + radius * Math.cos(angle)).toFixed(2)},${(c + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return out.join(" ");
}
