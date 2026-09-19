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
