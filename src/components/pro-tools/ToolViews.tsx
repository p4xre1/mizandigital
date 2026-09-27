import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthProvider';
import { calculateCalendarDeadline, exportResearch, safeSource, type Entry, type Note } from '@/lib/pro-tools/model';
import { createResearchPdf } from '@/lib/pro-tools/pdfExport';
import { toolsService } from '@/lib/pro-tools/service';
export const inputClass = 'w-full rounded-lg border border-border bg-background p-3 text-sm';
export const buttonClass = 'rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50';
export const cardClass = 'rounded-xl border border-border bg-card p-5 space-y-4';
export function Source({ url, children }: { url: string; children: React.ReactNode }) {
  const href = safeSource(url);
  return href ? <a className="text-primary underline" href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
}

export function Workspace({ mode = 'workspace' }: { mode?: 'workspace' | 'cases' }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState<Partial<Note>>({ title: '', body: '', citation: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    if (!user) { setNotes([]); setLoading(false); return () => { active = false; }; }
    toolsService.notes(mode).then(data => { if (active) setNotes(data); }).catch(() => { if (active) setMessage('تعذر تحميل ملاحظاتك. حاول تحديث الصفحة.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode, user]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const saved = await toolsService.saveNote({ ...draft, tool_slug: mode });
      setNotes(prev => [saved, ...prev.filter(n => n.id !== saved.id)]);
      setDraft({ title: '', body: '', citation: '' }); setMessage('تم الحفظ.');
    } catch { setMessage('تعذر الحفظ. تحقق من اتصالك ثم حاول مرة أخرى.'); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm('حذف هذه الملاحظة نهائياً؟')) return;
    setBusy(true);
    try { await toolsService.deleteNote(id); setNotes(prev => prev.filter(n => n.id !== id)); if (draft.id === id) setDraft({ title: '', body: '', citation: '' }); }
    catch { setMessage('تعذر الحذف.'); } finally { setBusy(false); }
  }
  function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function download() {
    saveBlob(new Blob(['\uFEFF', exportResearch(notes)], { type: 'text/plain;charset=utf-8' }), 'mizan-research.txt');
  }
  function downloadPdf() {
    try {
      saveBlob(createResearchPdf(notes), 'mizan-research.pdf');
      setMessage('تم تجهيز ملف PDF للتنزيل.');
    } catch {
      setMessage('تعذر إنشاء ملف PDF في هذا المتصفح. حاول تصدير TXT بدلاً منه.');
    }
  }
  if (!user) return <section className={cardClass} dir="rtl">
    <h2 className="text-xl font-bold">{mode === 'cases' ? 'دفتر إجاباتي وتقدمي' : 'ملف البحث الخاص بي'}</h2>
    <p className="text-sm text-muted-foreground">الأداة مجانية. سجّل الدخول مجاناً لحفظ ملاحظاتك الخاصة.</p>
    <Link className="font-bold text-primary underline" to={`/login?next=${encodeURIComponent(mode === 'cases' ? '/pro-tools/cases' : '/pro-tools/workspace')}`}>تسجيل الدخول أو إنشاء حساب</Link>
  </section>;
  return <section className="space-y-5">
    <h2 className="text-xl font-bold">{mode === 'cases' ? 'دفتر إجاباتي وتقدمي' : 'ملف البحث الخاص بي'}</h2>
    <p className="text-sm text-muted-foreground">ملاحظات خاصة بحسابك. تجنب إدخال بيانات حساسة تخص أطراف القضايا.</p>
    <form className={cardClass} onSubmit={save}>
      <label className="block">عنوان الملف أو التمرين<input className={inputClass} required maxLength={200} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="block">الملاحظات أو الإجابة<textarea className={inputClass} rows={6} maxLength={30000} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /></label>
      <label className="block">المراجع والنسخ المعتمدة<textarea className={inputClass} maxLength={2000} value={draft.citation} onChange={e => setDraft({ ...draft, citation: e.target.value })} /></label>
      <div className="flex gap-3"><button className={buttonClass} disabled={busy || loading}>حفظ</button>{draft.id && <button type="button" onClick={() => setDraft({ title: '', body: '', citation: '' })}>إلغاء التعديل</button>}</div>
    </form>
    <p role="status">{message}</p>
    {loading ? <p>جارٍ التحميل...</p> : <>
      <div className="flex flex-wrap gap-3">
        <button className={buttonClass} disabled={!notes.length || busy} onClick={download}>تصدير جميع الملاحظات والمراجع TXT</button>
        <button className={buttonClass} disabled={!notes.length || busy} onClick={downloadPdf}>تصدير جميع الملاحظات والمراجع PDF</button>
      </div>
      {!notes.length && <p>لا توجد ملاحظات محفوظة بعد.</p>}
      {notes.map(note => <article className={cardClass} key={note.id}>
        <h3 className="font-bold">{note.title}</h3><p className="whitespace-pre-wrap">{note.body}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{note.citation}</p>
        <div className="flex gap-4"><button disabled={busy} onClick={() => setDraft({ id: note.id, title: note.title, body: note.body, citation: note.citation })}>تعديل</button><button disabled={busy} onClick={() => remove(note.id)}>حذف</button></div>
      </article>)}
    </>}
  </section>;
}

function CasePractice({ entry, signedIn }: { entry: Entry; signedIn: boolean }) {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return <div className="space-y-4">
    <p className="whitespace-pre-wrap leading-8">{entry.payload.scenario}</p>
    <label className="block">تحليلك القانوني<textarea className={inputClass} rows={5} maxLength={30000} value={answer} onChange={e => setAnswer(e.target.value)} /></label>
    <div className="flex flex-wrap gap-3">
      <button className={buttonClass} disabled={!answer.trim()} onClick={() => setRevealed(true)}>مقارنة مع الإجابة المراجعة</button>
      <button className={buttonClass} disabled={!answer.trim() || busy || !signedIn} onClick={async () => {
        setBusy(true);
        try { await toolsService.saveNote({ tool_slug: 'cases', title: entry.title, body: answer, citation: `${entry.source_reference}\n${entry.source_url}` }); setMessage('تم حفظ الإجابة في دفتر إجاباتي.'); }
        catch { setMessage('تعذر حفظ الإجابة.'); } finally { setBusy(false); }
      }}>حفظ إجابتي</button>
    </div>
    {!signedIn && <Link className="font-bold text-primary underline" to={`/login?next=${encodeURIComponent('/pro-tools/cases')}`}>سجّل الدخول مجاناً لحفظ إجابتك</Link>}
    <p role="status">{message}</p>
    {revealed && <div className="space-y-3 rounded-lg bg-muted p-4">
      <h4 className="font-bold">تقييم ذاتي، وليس تنقيطاً آلياً</h4>
      {(entry.payload.checklist || '').split('\n').filter(Boolean).map((line, i) => <label key={i} className="flex gap-2"><input type="checkbox" />{line}</label>)}
      <h4 className="font-bold">الإجابة النموذجية</h4><p className="whitespace-pre-wrap leading-8">{entry.payload.model_answer}</p>
    </div>}
  </div>;
}
function Deadline({ entry }: { entry: Entry }) {
  const [date, setDate] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [result, setResult] = useState('');
  return <form className="space-y-4" onSubmit={e => {
    e.preventDefault();
    try { setResult(`النتيجة الأولية: ${calculateCalendarDeadline(date, entry.payload)}`); }
    catch (error) { setResult((error as Error).message); }
  }}>
    <p className="whitespace-pre-wrap">{entry.payload.assumptions}</p>
    <p>مدة القاعدة: {entry.payload.days} يوماً. صلاحية تاريخ الحدث: {entry.payload.valid_from} إلى {entry.payload.valid_until}.</p>
    <p className="rounded-lg border border-border bg-muted p-3 text-sm leading-7">حساب أيام تقويمية يستبعد يوم الحدث. لا يحتسب تمديد العطل أو آجال التبليغ أو الاستثناءات. النتيجة إرشادية ويجب التحقق منها لدى مختص قبل الاعتماد عليها.</p>
    <label className="block">تاريخ الحدث<input className={inputClass} type="date" required min={entry.payload.valid_from} max={entry.payload.valid_until} value={date} onChange={e => { setDate(e.target.value); setResult(''); }} /></label>
    <label className="flex gap-2"><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} />قرأت شروط تطبيق القاعدة وحدود الحساب.</label>
    <button className={buttonClass} disabled={!accepted}>حساب أولي</button><p role="status" className="font-bold">{result}</p>
  </form>;
}
export function EntryView({ entry, signedIn = false }: { entry: Entry; signedIn?: boolean }) {
  const p = entry.payload;
  return <article className={cardClass}>
    <div><p className="text-sm text-muted-foreground">{entry.topic}</p><h3 className="mt-1 text-lg font-bold">{entry.title}</h3></div>
    {entry.tool_slug === 'versions' && <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-lg border border-border p-4"><h4 className="font-bold">النسخة السابقة - {p.before_date}</h4><p className="my-3 whitespace-pre-wrap leading-8">{p.before}</p><Source url={p.before_source_url}>مصدر النسخة السابقة</Source></section>
      <section className="rounded-lg border border-border p-4"><h4 className="font-bold">النسخة الجديدة - {p.after_date}</h4><p className="my-3 whitespace-pre-wrap leading-8">{p.after}</p><Source url={entry.source_url}>مصدر النسخة الجديدة</Source></section>
    </div>}
    {entry.tool_slug === 'cases' && <CasePractice entry={entry} signedIn={signedIn} />}
    {entry.tool_slug === 'references' && <div className="space-y-3"><p className="font-bold">{p.from_article} ← {p.to_article}</p><p className="whitespace-pre-wrap">{p.relationship}</p><Source url={p.target_url}>فتح النص المرتبط</Source></div>}
    {entry.tool_slug === 'alerts' && <div><p className="whitespace-pre-wrap leading-8">{p.summary}</p><p className="mt-3 text-sm">تاريخ النفاذ: {p.effective_date}</p><p className="text-sm">آخر تحديث في المنصة: {new Date(entry.updated_at).toLocaleDateString('ar-MA')}</p></div>}
    {entry.tool_slug === 'deadlines' && <Deadline entry={entry} />}
    <footer className="border-t border-border pt-3 text-sm text-muted-foreground space-y-2">
      <Source url={entry.source_url}>{entry.source_reference}</Source>
      <p>مراجعة: {entry.reviewed_by} - {entry.reviewed_on}</p>
    </footer>
  </article>;
}
