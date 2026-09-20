export type ToolSlug = 'versions' | 'cases' | 'references' | 'workspace' | 'alerts' | 'deadlines';
export interface Tool { slug: ToolSlug; title: string; description: string; enabled: boolean }
export interface Entry {
  id: string; tool_slug: ToolSlug; title: string; topic: string; source_url: string;
  source_reference: string; reviewed_by: string; reviewed_on: string | null;
  published: boolean; payload: Record<string, string>; updated_at: string;
}
export interface Note { id: string; title: string; body: string; citation: string; tool_slug: 'workspace' | 'cases' }
export interface Field { key: string; label: string; type?: 'date' | 'url' | 'number'; multiline?: boolean }
export const fields: Record<ToolSlug, Field[]> = {
  versions: [
    { key: 'before_date', label: 'تاريخ النسخة السابقة', type: 'date' },
    { key: 'after_date', label: 'تاريخ النسخة الجديدة', type: 'date' },
    { key: 'before_source_url', label: 'رابط مصدر النسخة السابقة', type: 'url' },
    { key: 'before', label: 'النص السابق', multiline: true },
    { key: 'after', label: 'النص الجديد', multiline: true },
  ],
  cases: [
    { key: 'scenario', label: 'وقائع الحالة', multiline: true },
    { key: 'checklist', label: 'عناصر التحليل (عنصر في كل سطر)', multiline: true },
    { key: 'model_answer', label: 'الإجابة النموذجية المراجعة', multiline: true },
  ],
  references: [
    { key: 'from_article', label: 'النص أو الفصل الأصلي' },
    { key: 'to_article', label: 'النص أو الفصل المرتبط' },
    { key: 'relationship', label: 'سبب الإحالة ونوع العلاقة', multiline: true },
    { key: 'target_url', label: 'رابط النص المرتبط', type: 'url' },
  ],
  workspace: [],
  alerts: [
    { key: 'summary', label: 'ملخص التعديل', multiline: true },
    { key: 'effective_date', label: 'تاريخ النفاذ', type: 'date' },
  ],
  deadlines: [
    { key: 'days', label: 'عدد الأيام التقويمية (1–3650)', type: 'number' },
    { key: 'valid_from', label: 'بداية صلاحية القاعدة', type: 'date' },
    { key: 'valid_until', label: 'آخر تاريخ حدث تسمح القاعدة بحسابه', type: 'date' },
    { key: 'assumptions', label: 'شروط التطبيق والاستثناءات (لا تشمل الأداة تمديد العطل أو أيام العمل)', multiline: true },
  ],
};
export function safeSource(url: string): string | undefined {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : undefined; } catch { return undefined; }
}
export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateEntry(entry: Omit<Entry, 'id' | 'updated_at'>): string | null {
  if (!entry.title.trim() || !entry.topic.trim()) return 'العنوان والموضوع مطلوبان.';
  if (entry.source_url && !safeSource(entry.source_url)) return 'يلزم رابط مصدر HTTPS صالح.';
  if (!entry.published) return null;
  if (!safeSource(entry.source_url) || !entry.source_reference.trim() || !entry.reviewed_by.trim() || !entry.reviewed_on || !validDate(entry.reviewed_on) || entry.reviewed_on > new Date().toISOString().slice(0, 10)) return 'النشر يتطلب مصدراً ومرجعاً واسم مراجع وتاريخ مراجعة صحيحاً.';
  for (const field of fields[entry.tool_slug]) {
    const value = entry.payload[field.key] || '';
    if (!value.trim()) return `حقل مطلوب: ${field.label}`;
    if (field.type === 'url' && !safeSource(value)) return `رابط غير صالح: ${field.label}`;
    if (field.type === 'date' && !validDate(value)) return `تاريخ غير صالح: ${field.label}`;
  }
  if (entry.tool_slug === 'versions' && entry.payload.before_date >= entry.payload.after_date) return 'يجب أن تكون النسخة الجديدة أحدث من السابقة.';
  if (entry.tool_slug === 'deadlines') {
    if (!/^\d{1,4}$/.test(entry.payload.days) || +entry.payload.days < 1 || +entry.payload.days > 3650) return 'عدد الأيام يجب أن يكون بين 1 و3650.';
    if (entry.payload.valid_from > entry.payload.valid_until) return 'فترة صلاحية القاعدة غير صحيحة.';
  }
  return null;
}
// Deliberately limited to calendar days, excluding the triggering date.
// No assumption is made about weekends, holidays, service rules or extensions.
export function calculateCalendarDeadline(start: string, payload: Record<string, string>): string {
  if (!validDate(start) || !validDate(payload.valid_from) || !validDate(payload.valid_until)) throw new Error('تاريخ غير صالح.');
  if (start < payload.valid_from || start > payload.valid_until) throw new Error('تاريخ الحدث خارج صلاحية القاعدة المراجعة.');
  const days = Number(payload.days);
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('قاعدة حساب غير صالحة.');
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function exportResearch(notes: Note[]): string {
  return notes.map(note => `${note.title}\n\n${note.body}\n\nالمرجع: ${note.citation || 'غير محدد'}`).join('\n\n--------------------------------\n\n');
}

/* ───────────────────────────────────────────────────────────────────────────
   طبقة التحليل المساعدة (GEO/UX للعمق): دوال خالصة لا تلمس الشبكة ولا
   تخترع أي محتوى قانوني. كلها قابلة للاختبار وحدة بوحدة، وتستعملها الواجهات
   الست في src/components/pro-tools/ToolViews.tsx.
   الحدود مقصودة: مطابقة لفظية بعد تجريد التشكيل، وفرق نصّي على مستوى الجملة
   والكلمة، وحساب آجال تقويمية — لا تقييم قانوني آلي ولا نتيجة نهائية.
─────────────────────────────────────────────────────────────────────────── */

// تشكيل وتطويل وهمزات: البحث يجب أن يطابق «التقادم» بـ«تقادم» و«إلى» بـ«الى».
const DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;
export function normalizeArabic(value: string): string {
  return String(value ?? '')
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// كلمات وظيفية تُستبعد من مفاتيح المطابقة، وإلا صار كل جواب «مطابقاً».
const STOPWORDS = new Set(
  'من في على الى إلى عن ان أن إن التي الذي هذا هذه ذلك مع او أو ثم كما كل بعد قبل بين عند حيث هو هي لا ما اذا إذا قد كان كانت يكون لكن ولكن حتى نحو وفق وفقا دون عبر ضمن عندها به بها له لها فيه فيها عليه عليها أي اي كذلك'.split(' '),
);

function keywords(text: string): string[] {
  return Array.from(
    new Set(
      normalizeArabic(text)
        .split(' ')
        .filter(word => word.length >= 3 || /^\d+$/.test(word))
        .filter(word => !STOPWORDS.has(word)),
    ),
  );
}

/*
 * العربية تلصق حرف العطف والجر وأداة التعريف بالكلمة: «والأجل» و«الأجل» و«للأجل»
 * كلمة واحدة دلالياً. بدون هذا التجريد تفشل المطابقة على نصوص سليمة، فيبدو
 * عنصر التحليل غائباً وهو مذكور. التجريد محافظ: لا يُجرَّد إن بقي أقل من ثلاثة
 * أحرف، فلا يتحوّل «لماذا» إلى «ماذا» في مطابقة قصيرة.
 */
const ATTACHED_PREFIX = /^(?:و|ف|ب|ك|ل|ال)+/;
export function stemArabic(word: string): string {
  const value = String(word ?? '');
  const remainder = value.replace(ATTACHED_PREFIX, '');
  return remainder.length >= 3 ? remainder : value;
}

function stemsOf(words: string[]): string[] {
  return Array.from(new Set(words.map(stemArabic)));
}

// بحث موحّد للواجهات: نفس التطبيع، فلا يفشل البحث بـ«المادة» مقابل «مادة».
export function matchesQuery(text: string, query: string): boolean {
  const needle = normalizeArabic(query);
  if (!needle) return true;
  const haystack = normalizeArabic(text);
  return needle.split(' ').every(token => haystack.includes(token));
}

/* ── 1) قانون عبر الزمن: فرق نصّي بين نسختين ─────────────────────────────── */

export type DiffKind = 'same' | 'removed' | 'added';
export interface DiffSegment { kind: DiffKind; text: string }
export interface DiffResult {
  segments: DiffSegment[];
  addedWords: number;
  removedWords: number;
  unchangedWords: number;
  changeRatio: number; // 0..100
  truncated: boolean; // نصّ ضخم: قُسّم على مستوى المقاطع بلا مطابقة كلمة بكلمة
}

const MAX_DIFF_BLOCKS = 600;
const MAX_WORD_DIFF = 240;

export function splitSentences(text: string): string[] {
  return String(text ?? '')
    .split(/\n+/)
    .flatMap(line => line.split(/(?<=[.؟!?;؛])\s+/))
    .map(part => part.trim())
    .filter(Boolean);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** LCS على تسلسلين، مع حدّ أعلى يحمي الخيط الرئيسي من الانفجار. */
function lcsPairs<T>(a: T[], b: T[], equals: (x: T, y: T) => boolean, cap: number): Array<[number, number]> {
  if (!a.length || !b.length || a.length > cap || b.length > cap) return [];
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] = equals(a[i], b[j])
        ? table[(i + 1) * width + j + 1] + 1
        : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (equals(a[i], b[j])) { pairs.push([i, j]); i += 1; j += 1; }
    else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i += 1;
    else j += 1;
  }
  return pairs;
}

/** فرق على مستوى الكلمة داخل جملة استُبدلت بأخرى — أدق من إظهار الجملتين كاملتين. */
function wordDiff(before: string, after: string): DiffSegment[] {
  const a = before.split(/\s+/).filter(Boolean);
  const b = after.split(/\s+/).filter(Boolean);
  const pairs = lcsPairs(a, b, (x, y) => normalizeArabic(x) === normalizeArabic(y), MAX_WORD_DIFF);
  if (!pairs.length) {
    return [
      ...(a.length ? [{ kind: 'removed' as DiffKind, text: a.join(' ') }] : []),
      ...(b.length ? [{ kind: 'added' as DiffKind, text: b.join(' ') }] : []),
    ];
  }
  const out: DiffSegment[] = [];
  const push = (kind: DiffKind, words: string[]) => {
    if (words.length) out.push({ kind, text: words.join(' ') });
  };
  let ai = 0;
  let bi = 0;
  for (const [x, y] of pairs) {
    push('removed', a.slice(ai, x));
    push('added', b.slice(bi, y));
    push('same', a.slice(x, x + 1));
    ai = x + 1;
    bi = y + 1;
  }
  push('removed', a.slice(ai));
  push('added', b.slice(bi));
  return out;
}

export function diffText(before: string, after: string): DiffResult {
  const left = splitSentences(before);
  const right = splitSentences(after);
  const pairs = lcsPairs(left, right, (x, y) => normalizeArabic(x) === normalizeArabic(y), MAX_DIFF_BLOCKS);
  const truncated = (left.length > MAX_DIFF_BLOCKS || right.length > MAX_DIFF_BLOCKS) && !pairs.length;
  const raw: DiffSegment[] = [];
  let li = 0;
  let ri = 0;
  const emit = (removed: string[], added: string[]) => {
    if (!removed.length && !added.length) return;
    if (removed.length === added.length && removed.length > 0) {
      removed.forEach((sentence, index) => raw.push(...wordDiff(sentence, added[index])));
      return;
    }
    if (removed.length) raw.push({ kind: 'removed', text: removed.join('\n') });
    if (added.length) raw.push({ kind: 'added', text: added.join('\n') });
  };
  for (const [x, y] of pairs) {
    emit(left.slice(li, x), right.slice(ri, y));
    raw.push({ kind: 'same', text: left[x] });
    li = x + 1;
    ri = y + 1;
  }
  emit(left.slice(li), right.slice(ri));
  // دمج المقاطع المتجاورة من النوع نفسه بعد توليد كتل الكلمات.
  const segments: DiffSegment[] = [];
  for (const segment of raw) {
    const last = segments[segments.length - 1];
    if (last && last.kind === segment.kind) last.text = `${last.text} ${segment.text}`;
    else segments.push({ ...segment });
  }
  let addedWords = 0;
  let removedWords = 0;
  let unchangedWords = 0;
  for (const segment of segments) {
    const words = countWords(segment.text);
    if (segment.kind === 'added') addedWords += words;
    else if (segment.kind === 'removed') removedWords += words;
    else unchangedWords += words;
  }
  const total = addedWords + removedWords + unchangedWords;
  return {
    segments,
    addedWords,
    removedWords,
    unchangedWords,
    changeRatio: total ? Math.round(((addedWords + removedWords) / total) * 100) : 0,
    truncated,
  };
}

/* ── 2) من الواقعة إلى الحل: تغطية عناصر التحليل ───────────────────────────── */

export interface CoverageItem { item: string; matched: boolean; found: string[]; missing: string[] }
export interface Coverage { items: CoverageItem[]; covered: number; total: number; ratio: number }

/**
 * مطابقة لفظية بين إجابة الطالب وعناصر التحليل المراجعة: تكشف العنصر الذي لم
 * يُذكر بكلمة منه. ليست تنقيطاً آلياً — لم تُبنَ على معنى ولا على صحة قانونية،
 * والواجهة تقول ذلك صراحة. العنصر الذي لا يحمل كلمات دلالية يُترك للتقويم الذاتي.
 */
export function coverageCheck(answer: string, checklist: string): Coverage {
  const tokens = stemsOf(normalizeArabic(answer).split(' ').filter(Boolean));
  const tokenSet = new Set(tokens);
  // على الجواب الطويل جداً نكتفي بالتطابق التام: المقارنة البادئات تربّع المسألة.
  const allowPrefix = tokens.length <= 5000;
  const find = (key: string): boolean => {
    if (tokenSet.has(key)) return true;
    if (!allowPrefix || key.length < 4) return false;
    return tokens.some(token => token.length >= 4 && (token.startsWith(key) || key.startsWith(token)));
  };
  const items = String(checklist ?? '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((item): CoverageItem => {
      const keys = stemsOf(keywords(item));
      if (!keys.length) return { item, matched: false, found: [], missing: [] };
      const found = keys.filter(find);
      const missing = keys.filter(key => !find(key));
      return { item, matched: found.length >= Math.max(1, Math.ceil(keys.length * 0.34)), found, missing };
    });
  const scored = items.filter(item => item.missing.length || item.found.length);
  const covered = scored.filter(item => item.matched).length;
  return { items, covered, total: scored.length, ratio: scored.length ? Math.round((covered / scored.length) * 100) : 0 };
}


/* ── 3) خريطة الإحالات: فهرسة النص ↔ النص ─────────────────────────────────── */

export interface ReferenceIndex {
  articles: string[];
  outgoing: Record<string, string[]>;
  incoming: Record<string, string[]>;
  relationCount: number;
}

export function buildReferenceIndex(entries: Entry[]): ReferenceIndex {
  const outgoing: Record<string, Set<string>> = {};
  const incoming: Record<string, Set<string>> = {};
  let relationCount = 0;
  for (const entry of entries) {
    if (entry.tool_slug !== 'references') continue;
    const from = (entry.payload.from_article || '').trim();
    const to = (entry.payload.to_article || '').trim();
    if (!from || !to) continue;
    relationCount += 1;
    (outgoing[from] ||= new Set()).add(to);
    (incoming[to] ||= new Set()).add(from);
  }
  const articles = Array.from(new Set([...Object.keys(outgoing), ...Object.keys(incoming)])).sort();
  const toLists = (source: Record<string, Set<string>>): Record<string, string[]> =>
    Object.fromEntries(Object.entries(source).map(([key, value]) => [key, Array.from(value).sort()]));
  return { articles, outgoing: toLists(outgoing), incoming: toLists(incoming), relationCount };
}

/** كل العلاقات التي تخصّ نصاً: صادرة منه أو واردة إليه. */
export function relatedReferences(entries: Entry[], article: string): Entry[] {
  const key = article.trim();
  if (!key) return [];
  return entries.filter(entry => entry.tool_slug === 'references'
    && ((entry.payload.from_article || '').trim() === key || (entry.payload.to_article || '').trim() === key));
}

/* ── 4) راقب النص: أقرب المواعيد النافذة ───────────────────────────────────── */

export function upcomingAmendments(entries: Entry[], from: string, days = 30): Entry[] {
  if (!validDate(from) || !Number.isFinite(days) || days < 0) return [];
  const start = new Date(`${from}T00:00:00Z`);
  const limit = new Date(start);
  limit.setUTCDate(limit.getUTCDate() + days);
  const to = limit.toISOString().slice(0, 10);
  return entries
    .filter(entry => validDate(entry.payload.effective_date || ''))
    .filter(entry => entry.payload.effective_date >= from && entry.payload.effective_date <= to)
    .sort((a, b) => (a.payload.effective_date < b.payload.effective_date ? -1 : 1));
}

/** ترتيب المتابعة: الأقرب نفاذاً أولاً، أو الأحدث تحديثاً أولاً. */
export function sortAlerts(entries: Entry[], mode: 'effective' | 'recent'): Entry[] {
  const copy = [...entries];
  if (mode === 'effective') {
    return copy.sort((a, b) => {
      const left = a.payload.effective_date || '9999-12-31';
      const right = b.payload.effective_date || '9999-12-31';
      if (left === right) return a.title.localeCompare(b.title, 'ar');
      return left < right ? -1 : 1;
    });
  }
  return copy.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

/* ── 5) حاسبة الآجال: الاتجاه المعاكس والسياق ───────────────────────────────── */

/**
 * الاتجاه المعاكس: من آخر أجل إلى آخر تاريخ حدث يسمح به.
 * نفس حدود calculateCalendarDeadline: أيام تقويمية، يوم الحدث مستبعد، وبلا
 * تمديد عطل أو أيام عمل — وتفشل مغلقة خارج نطاق صلاحية القاعدة المراجعة.
 */
export function reverseCalendarDeadline(deadline: string, payload: Record<string, string>): string {
  if (!validDate(deadline) || !validDate(payload.valid_from) || !validDate(payload.valid_until)) throw new Error('تاريخ غير صالح.');
  const days = Number(payload.days);
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('قاعدة حساب غير صالحة.');
  if (deadline < payload.valid_from || deadline > payload.valid_until) throw new Error('تاريخ الأجل خارج صلاحية القاعدة المراجعة.');
  const date = new Date(`${deadline}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  const result = date.toISOString().slice(0, 10);
  if (result < payload.valid_from) throw new Error('أقدم تاريخ حدث تقبله القاعدة لا يبلغ هذا الأجل.');
  return result;
}

export function weekdayLabel(date: string): string {
  if (!validDate(date)) return '';
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('ar-MA', { weekday: 'long', timeZone: 'UTC' });
}

// العطلة الأسبوعية في المغرب: السبت والأحد. تُعرض للعلم فقط — الحساب لا يمدّد.
export function isWeekend(date: string): boolean {
  if (!validDate(date)) return false;
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 6 || day === 0;
}

export function deadlineSummary(start: string, result: string, payload: Record<string, string>): string {
  return [
    `تاريخ الحدث: ${start} (${weekdayLabel(start)})`,
    `النتيجة (${payload.days} يوماً تقويمياً، يوم الحدث مستبعد): ${result} (${weekdayLabel(result)})`,
    `صلاحية القاعدة: ${payload.valid_from} إلى ${payload.valid_until}`,
    payload.assumptions ? `شروط التطبيق: ${payload.assumptions}` : '',
    'حساب إرشادي لا يشمل تمديد العطل أو أيام العمل أو آجال التبليغ، ويجب التحقق منه في النص الرسمي.',
  ].filter(Boolean).join('\n');
}

/* ── 6) ملف البحث: تصدير وعدّ ─────────────────────────────────────────────── */

export function exportResearchMarkdown(notes: Note[]): string {
  const header = `# ملف البحث القانوني — ميزان الرقمية\n\nعدد الملاحظات: ${notes.length}\n\n`;
  return header + notes
    .map(note => `## ${note.title}\n\n${note.body}\n\n> المرجع: ${note.citation || 'غير محدد'}`)
    .join('\n\n---\n\n');
}

export function noteWordCount(text: string): number {
  return countWords(String(text ?? ''));
}

export function searchNotes(notes: Note[], query: string): Note[] {
  if (!normalizeArabic(query)) return notes;
  return notes.filter(note => matchesQuery(`${note.title} ${note.body} ${note.citation}`, query));
}

/** فرق الأيام بين تاريخين (UTC) — يُستعمل لعرض «بعد كم ينتفذ». */
export function daysUntil(target: string, from: string): number | null {
  if (!validDate(target) || !validDate(from)) return null;
  return Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/** صيغة عربية سليمة للفرق: «اليوم» و«غداً» و«بعد يومين» و«بعد 5 أيام» و«بعد 20 يوماً». */
export function relativeDayLabel(target: string, from: string): string {
  const diff = daysUntil(target, from);
  if (diff === null) return '';
  if (diff === 0) return 'اليوم';
  if (diff === 1) return 'غداً';
  if (diff === 2) return 'بعد يومين';
  if (diff === -1) return 'منذ يوم';
  if (diff === -2) return 'منذ يومين';
  const days = Math.abs(diff);
  const unit = days <= 10 ? 'أيام' : 'يوماً';
  return diff > 0 ? `بعد ${days} ${unit}` : `منذ ${days} ${unit}`;
}
