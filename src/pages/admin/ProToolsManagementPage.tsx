import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toolsService } from '@/lib/pro-tools/service';
import { fields, validateEntry, type Entry, type Tool } from '@/lib/pro-tools/model';
import { buttonClass, cardClass, inputClass } from '@/components/pro-tools/ToolViews';

function ToolEditor({ initial, onConfigured }: { initial: Tool; onConfigured: (tool: Tool) => void }) {
  const [tool, setTool] = useState(initial);
  const [entries, setEntries] = useState<Entry[]>([]);
  const empty = (): Omit<Entry, 'id' | 'updated_at'> => ({ tool_slug: initial.slug, title: '', topic: '', source_url: '', source_reference: '', reviewed_by: '', reviewed_on: '', published: false, payload: {} });
  const [draft, setDraft] = useState<ReturnType<typeof empty> & { id?: string }>(empty);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    if (initial.slug === 'workspace') { setLoading(false); return; }
    toolsService.entries(initial.slug).then(data => { if (active) setEntries(data); }).catch(() => { if (active) setMessage('تعذر تحميل المواد. أعد فتح الصفحة.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initial.slug]);
  async function configure(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try { const saved = await toolsService.configure(tool); setTool(saved); onConfigured(saved); setMessage('تم حفظ إعدادات الأداة.'); }
    catch { setMessage('تعذر الحفظ. تحقق من صلاحيات الإدارة وترحيل قاعدة البيانات.'); } finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateEntry(draft);
    if (validation) { setMessage(validation); return; }
    setBusy(true); setMessage('');
    try {
      const saved = await toolsService.saveEntry({ ...draft, reviewed_on: draft.reviewed_on || null });
      setEntries(prev => [saved, ...prev.filter(e => e.id !== saved.id)]); setDraft(empty()); setMessage('تم حفظ المادة.');
    } catch { setMessage('تعذر حفظ المادة. تحقق من الحقول المطلوبة وصلاحيات الإدارة.'); } finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <form onSubmit={configure} className={cardClass}>
      <h2 className="text-xl font-bold">إعدادات الأداة</h2>
      <label className="block">الاسم<input className={inputClass} required maxLength={120} value={tool.title} onChange={e => setTool({ ...tool, title: e.target.value })} /></label>
      <label className="block">الوصف<textarea className={inputClass} required maxLength={1000} value={tool.description} onChange={e => setTool({ ...tool, description: e.target.value })} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={tool.enabled} onChange={e => setTool({ ...tool, enabled: e.target.checked })} />تفعيل الأداة لمشتركي Pro</label>
      <p className="text-sm text-muted-foreground">الوصول مدفوع دائماً. تعطيل الأداة يمنع قراءة محتواها وكتابة البيانات من قاعدة البيانات أيضاً.</p>
      <button className={buttonClass} disabled={busy}>حفظ الإعدادات</button>
    </form>
    <p role="status" className="font-bold">{message}</p>
    {initial.slug === 'workspace' ? <p className={cardClass}>مساحة البحث تحتوي بيانات خاصة بكل مستخدم. لا تُعرض الملاحظات الشخصية في لوحة الإدارة.</p> : <>
      {initial.slug === 'deadlines' && <p className={cardClass}>انشر فقط قواعد راجعها مختص. هذه النسخة تدعم الأيام التقويمية مع استبعاد يوم الحدث، دون تعديل العطل أو الاستثناءات. لا تفعّل الأداة لقواعد تتطلب حساباً آخر.</p>}
      <form className={cardClass} onSubmit={save}>
        <h2 className="text-xl font-bold">{draft.id ? 'تعديل مادة' : 'مادة جديدة'}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label>العنوان<input className={inputClass} required maxLength={200} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
          <label>الموضوع (يستخدم للبحث والمتابعة)<input className={inputClass} required maxLength={120} value={draft.topic} onChange={e => setDraft({ ...draft, topic: e.target.value })} /></label>
        </div>
        {fields[initial.slug].map(field => <label className="block" key={field.key}>{field.label}
          {field.multiline ? <textarea className={inputClass} rows={5} maxLength={20000} value={draft.payload[field.key] || ''} onChange={e => setDraft({ ...draft, payload: { ...draft.payload, [field.key]: e.target.value } })} /> : <input className={inputClass} type={field.type || 'text'} min={field.type === 'number' ? 1 : undefined} max={field.type === 'number' ? 3650 : undefined} maxLength={2000} value={draft.payload[field.key] || ''} onChange={e => setDraft({ ...draft, payload: { ...draft.payload, [field.key]: e.target.value } })} />}
        </label>)}
        <label className="block">المصدر الرسمي (HTTPS)<input className={inputClass} type="url" maxLength={2000} value={draft.source_url} onChange={e => setDraft({ ...draft, source_url: e.target.value })} /></label>
        <label className="block">المرجع: القانون، الفصل، الجريدة الرسمية<input className={inputClass} maxLength={1000} value={draft.source_reference} onChange={e => setDraft({ ...draft, source_reference: e.target.value })} /></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label>اسم المراجع<input className={inputClass} maxLength={160} value={draft.reviewed_by} onChange={e => setDraft({ ...draft, reviewed_by: e.target.value })} /></label>
          <label>تاريخ المراجعة<input className={inputClass} type="date" max={new Date().toISOString().slice(0, 10)} value={draft.reviewed_on || ''} onChange={e => setDraft({ ...draft, reviewed_on: e.target.value })} /></label>
        </div>
        <label className="flex gap-2"><input type="checkbox" checked={draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })} />نشر بعد المراجعة (غير محدد = مسودة)</label>
        <div className="flex gap-4"><button className={buttonClass} disabled={busy || loading}>حفظ المادة</button><button type="button" disabled={busy} onClick={() => setDraft(empty())}>مسودة جديدة</button></div>
      </form>
      <section className="space-y-3"><h2 className="text-xl font-bold">المواد ({entries.length})</h2>
        {loading && <p>جارٍ التحميل...</p>}
        {!loading && !entries.length && <p>لا توجد مواد. أضف محتوى موثقاً قبل تفعيل الأداة.</p>}
        {entries.map(entry => <article className={cardClass} key={entry.id}>
          <h3 className="font-bold">{entry.title}</h3><p>{entry.topic} - {entry.published ? 'منشور' : 'مسودة'}</p>
          <div className="flex gap-4"><button disabled={busy} onClick={() => {
            const { updated_at, ...editable } = entry; setDraft(editable); setMessage('تم فتح المادة في النموذج أعلاه.');
          }}>تعديل / إلغاء النشر</button><button disabled={busy} onClick={async () => {
            if (!window.confirm('حذف هذه المادة نهائياً؟')) return;
            setBusy(true);
            try { await toolsService.deleteEntry(entry.id); setEntries(prev => prev.filter(e => e.id !== entry.id)); if (draft.id === entry.id) setDraft(empty()); setMessage('تم الحذف.'); }
            catch { setMessage('تعذر الحذف.'); } finally { setBusy(false); }
          }}>حذف</button></div>
        </article>)}
      </section>
    </>}
  </div>;
}
export default function ProToolsManagementPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    toolsService.catalog().then(data => { if (active) { setTools(data); setSelected(data[0]?.slug || ''); } }).catch(() => { if (active) setError('تعذر تحميل الأدوات. طبّق ترحيل pro_legal_tools وتحقق من الصلاحيات ثم أعد تحميل الصفحة.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const tool = tools.find(t => t.slug === selected);
  return <div dir="rtl" className="space-y-6">
    <header><h1 className="text-2xl font-black">إدارة أدوات Pro القانونية</h1><p className="mt-2 text-muted-foreground">التفعيل، المحتوى، المراجعة والنشر. الاشتراك والتحقق من الصلاحية مفروضان من قاعدة البيانات.</p><Link to="/pro-tools" className="text-primary underline">عرض صفحة الأدوات</Link></header>
    {error && <p role="alert">{error}</p>}{loading && <p>جارٍ التحميل...</p>}
    {tools.length > 0 && <label className="block">اختر الأداة<select className={inputClass} value={selected} onChange={e => setSelected(e.target.value)}>{tools.map(t => <option value={t.slug} key={t.slug}>{t.title}</option>)}</select></label>}
    {tool && <ToolEditor key={tool.slug} initial={tool} onConfigured={saved => setTools(prev => prev.map(t => t.slug === saved.slug ? saved : t))} />}
  </div>;
}
