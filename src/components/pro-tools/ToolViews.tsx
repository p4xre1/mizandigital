import { useEffect, useMemo, useState } from 'react';
import {
  calculateCalendarDeadline,
  coverageCheck,
  deadlineSummary,
  diffText,
  exportResearch,
  exportResearchMarkdown,
  isWeekend,
  noteWordCount,
  relatedReferences,
  relativeDayLabel,
  reverseCalendarDeadline,
  safeSource,
  searchNotes,
  weekdayLabel,
  type DiffResult,
  type Entry,
  type Note,
} from '@/lib/pro-tools/model';
import { toolsService } from '@/lib/pro-tools/service';

export const inputClass = 'w-full rounded-lg border border-border bg-background p-3 text-sm';
export const buttonClass = 'rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50';
export const cardClass = 'rounded-xl border border-border bg-card p-5 space-y-4';
const plainButtonClass = 'rounded-lg border border-border px-4 py-2 text-sm font-bold disabled:opacity-50';
const metaClass = 'text-sm text-muted-foreground';
const chipClass = 'rounded-lg border border-border px-3 py-1 text-sm';
const today = () => new Date().toISOString().slice(0, 10);

export function Source({ url, children }: { url: string; children: React.ReactNode }) {
  const href = safeSource(url);
  return href ? <a className="text-primary underline" href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
}

/** نسخ إلى الحافظة مع بديل يدوي — لا نفترض توفّر clipboard في كل سياق. */
export function CopyButton({ text, label, done = 'تم النسخ.', disabled }: { text: string; label: string; done?: string; disabled?: boolean }) {
  const [message, setMessage] = useState('');
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 2500); return () => clearTimeout(timer); }, [message]);
  return <span className="inline-flex items-center gap-2">
    <button type="button" className={plainButtonClass} disabled={disabled || !text} onClick={async () => {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else {
          const area = document.createElement('textarea');
          area.value = text; document.body.append(area); area.select(); document.execCommand('copy'); area.remove();
        }
        setMessage(done);
      } catch { setMessage('تعذر النسخ. حدّد النص وانسخه يدوياً.'); }
    }}>{label}</button>
    <span role="status" className={metaClass}>{message}</span>
  </span>;
}

/* ── قانون عبر الزمن: عرض الفرق ────────────────────────────────────────────── */

const segmentClass: Record<'same' | 'removed' | 'added', string> = {
  same: '',
  removed: 'bg-[#fee2e2] text-[#7f1d1d] dark:bg-[#7f1d1d]/40 dark:text-[#fecaca] line-through rounded px-0.5',
  added: 'bg-[#dcfce7] text-[#14532d] dark:bg-[#14532d]/60 dark:text-[#bbf7d0] rounded px-0.5',
};

function DiffBody({ result }: { result: DiffResult }) {
  return <p className="my-3 whitespace-pre-wrap leading-8">
    {result.segments.map((segment, index) => segment.kind === 'same'
      ? <span key={index}>{segment.text}{' '}</span>
      : <span key={index} className={segmentClass[segment.kind]}>{segment.text}{' '}</span>)}
  </p>;
}

/**
 * معاينة المحرّر: ما سيراه المشترك بالضبط. تُستعمل في لوحة الإدارة قبل النشر
 * (نفس دالتَي الفرق والتغطية المستعملتين في واجهة الأداة) حتى لا يُنشر تعديل
 * لم يقصده المحرّر ولا تبقى إجابة نموذجية لا تغطي عناصر التحليل.
 */
export function DiffPreview({ before, after }: { before: string; after: string }) {
  const diff = useMemo(() => diffText(before, after), [before, after]);
  if (!before.trim() || !after.trim()) return <p className={metaClass}>أدخل النصين لعرض المعاينة.</p>;
  const identical = diff.segments.every(segment => segment.kind === 'same');
  return <div className="space-y-2 rounded-lg border border-border p-3">
    <p className="font-bold">معاينة الفروق التي سيراها المشترك</p>
    <p className={metaClass}>{identical ? 'لا فرق بين النصين: التعديل لن يظهر.' : `أُضيفت ${diff.addedWords} كلمة، وحُذفت ${diff.removedWords} كلمة — نسبة التغيير ${diff.changeRatio}%.`}</p>
    {!identical && <DiffBody result={diff} />}
  </div>;
}

export function CoveragePreview({ answer, checklist }: { answer: string; checklist: string }) {
  const coverage = useMemo(() => coverageCheck(answer, checklist), [answer, checklist]);
  if (!checklist.trim()) return null;
  return <div className="space-y-1 rounded-lg border border-border p-3">
    <p className="font-bold">عناصر التحليل في الإجابة النموذجية: {coverage.covered} من {coverage.total}</p>
    <p className={metaClass}>مطابقة لفظية للمساعدة التحريرية فقط. العنصر غير المذكور لا يعني غياب الفكرة، وراجع النص قبل النشر.</p>
    {coverage.items.filter(item => item.found.length || item.missing.length).map((item, index) => <p key={index} className={metaClass}>
      {item.matched ? '✓' : '×'} {item.item}{item.missing.length ? ` — كلمات غير موجودة: ${item.missing.join('، ')}` : ''}
    </p>)}
  </div>;
}

function Versions({ entry }: { entry: Entry }) {
  const [mode, setMode] = useState<'diff' | 'side'>('diff');
  const payload = entry.payload;
  const diff = useMemo(() => diffText(payload.before || '', payload.after || ''), [payload.before, payload.after]);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={chipClass} aria-pressed={mode === 'diff'} onClick={() => setMode('diff')}>عرض الفروق</button>
      <button type="button" className={chipClass} aria-pressed={mode === 'side'} onClick={() => setMode('side')}>جنباً إلى جنب</button>
      <span className={metaClass}>
        {diff.addedWords + diff.removedWords === 0
          ? 'لا فرق بين النصين المنشورين.'
          : `أُضيفت ${diff.addedWords} كلمة، وحُذفت ${diff.removedWords} كلمة — نسبة التغيير ${diff.changeRatio}%.`}
      </span>
      {diff.truncated && <span className={metaClass}>النصّ طويل: الفروق معروضة على مستوى المقاطع لا الكلمات.</span>}
    </div>
    {diff.segments.every(segment => segment.kind === 'same')
      ? <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-border p-4"><h4 className="font-bold">النسخة السابقة - {payload.before_date}</h4><p className="my-3 whitespace-pre-wrap leading-8">{payload.before}</p><Source url={payload.before_source_url}>مصدر النسخة السابقة</Source></section>
          <section className="rounded-lg border border-border p-4"><h4 className="font-bold">النسخة الجديدة - {payload.after_date}</h4><p className="my-3 whitespace-pre-wrap leading-8">{payload.after}</p><Source url={entry.source_url}>مصدر النسخة الجديدة</Source></section>
        </div>
      : mode === 'diff'
        ? <section className="rounded-lg border border-border p-4">
            <h4 className="font-bold">النص بعد إبراز التعديلات ({payload.before_date} ← {payload.after_date})</h4>
            <DiffBody result={diff} />
            <p className={metaClass}>
              المحذوف مشطوب، والمضاف مظلَّل بالأخضر. <Source url={entry.source_url}>مصدر النسخة الجديدة</Source> و<Source url={payload.before_source_url}>مصدر النسخة السابقة</Source>.
            </p>
          </section>
        : <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border border-border p-4"><h4 className="font-bold">النسخة السابقة - {payload.before_date}</h4><p className="my-3 whitespace-pre-wrap leading-8">{payload.before}</p><Source url={payload.before_source_url}>مصدر النسخة السابقة</Source></section>
            <section className="rounded-lg border border-border p-4"><h4 className="font-bold">النسخة الجديدة - {payload.after_date}</h4><p className="my-3 whitespace-pre-wrap leading-8">{payload.after}</p><Source url={entry.source_url}>مصدر النسخة الجديدة</Source></section>
          </div>}
  </div>;
}

/* ── راقب النص: الموعد النافذ وحالته ───────────────────────────────────────── */

function AmendmentMeta({ entry }: { entry: Entry }) {
  const date = entry.payload.effective_date || '';
  const relative = relativeDayLabel(date, today());
  return <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
    <span className={chipClass}>تاريخ النفاذ: {date}{weekdayLabel(date) ? ` — ${weekdayLabel(date)}` : ''}</span>
    {relative && <span className={chipClass}>{relative}</span>}
    {isWeekend(date) && <span className={chipClass}>نهاية أسبوع — الحساب لا يمدّد الآجال</span>}
    <span className={metaClass}>آخر تحديث في المنصة: {new Date(entry.updated_at).toLocaleDateString('ar-MA')}</span>
  </div>;
}

/* ── حاسبة الآجال: اتجاهان وسياق اليوم ─────────────────────────────────────── */

function Deadline({ entry }: { entry: Entry }) {
  const [mode, setMode] = useState<'forward' | 'backward'>('forward');
  const [date, setDate] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [result, setResult] = useState('');
  const [summary, setSummary] = useState('');
  const payload = entry.payload;
  return <form className="space-y-4" onSubmit={event => {
    event.preventDefault();
    setSummary('');
    try {
      if (mode === 'forward') {
        const computed = calculateCalendarDeadline(date, payload);
        setResult(`النتيجة الأولية: ${computed}${relativeDayLabel(computed, today()) ? ` — ${relativeDayLabel(computed, today())}` : ''}`);
        setSummary(deadlineSummary(date, computed, payload));
      } else {
        const computed = reverseCalendarDeadline(date, payload);
        setResult(`آخر تاريخ حدث يسمح به الأجل: ${computed} (${weekdayLabel(computed)})`);
        setSummary(deadlineSummary(computed, date, payload));
      }
    } catch (error) { setResult((error as Error).message); }
  }}>
    <p className="whitespace-pre-wrap">{payload.assumptions}</p>
    <p>مدة القاعدة: {payload.days} يوماً. صلاحية تاريخ الحدث: {payload.valid_from} إلى {payload.valid_until}.</p>
    <p className="rounded-lg border border-border bg-muted p-3 text-sm leading-7">حساب أيام تقويمية يستبعد يوم الحدث. لا يحتسب تمديد العطل أو آجال التبليغ أو الاستثناءات. النتيجة إرشادية ويجب التحقق منها لدى مختص قبل الاعتماد عليها.</p>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={chipClass} aria-pressed={mode === 'forward'} onClick={() => { setMode('forward'); setResult(''); }}>من تاريخ الحدث إلى الأجل</button>
      <button type="button" className={chipClass} aria-pressed={mode === 'backward'} onClick={() => { setMode('backward'); setResult(''); }}>من آخر أجل إلى آخر تاريخ حدث</button>
    </div>
    <label className="block">{mode === 'forward' ? 'تاريخ الحدث' : 'تاريخ آخر أجل'}<input className={inputClass} type="date" required min={payload.valid_from} max={payload.valid_until} value={date} onChange={e => { setDate(e.target.value); setResult(''); }} /></label>
    {date && <p className={metaClass}>{weekdayLabel(date)}{isWeekend(date) ? ' — نهاية أسبوع، والحساب لا يمدّد الآجال' : ''}</p>}
    <label className="flex gap-2"><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} />قرأت شروط تطبيق القاعدة وحدود الحساب.</label>
    <div className="flex flex-wrap items-center gap-3">
      <button className={buttonClass} disabled={!accepted || !date}>حساب أولي</button>
      {summary && <CopyButton text={summary} label="نسخ النتيجة مع حدودها" />}
    </div>
    <p role="status" className="font-bold">{result}</p>
  </form>;
}

/* ── من الواقعة إلى الحل: تدريب وتغطية ذاتية ───────────────────────────────── */

/*
 * مفتاح مسودة المحاولة يُكتب حرفياً في نداءات التخزين أدناه لا داخل دالة:
 * تدقيق الشفافية في tests/legal-pages-agree.test.ts يقرأ مفاتيح التخزين من
 * النداءات نفسها، فما لا يُرى هناك لا يُفصح عنه في سياسة ملفات الارتباط.
 */

function CasePractice({ entry }: { entry: Entry }) {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const coverage = useMemo(() => coverageCheck(answer, entry.payload.checklist || ''), [answer, entry.payload.checklist]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`mizan:pro-tools:case:${entry.id}`);
      if (saved) { setAnswer(saved); setRestored(true); }
    } catch { /* التخزين المحلي قد يكون معطّلاً: لا نعطّل الأداة بسببه. */ }
  }, [entry.id]);
  useEffect(() => {
    if (!answer) return;
    try { window.localStorage.setItem(`mizan:pro-tools:case:${entry.id}`, answer); } catch { /* كما سبق */ }
  }, [answer, entry.id]);
  return <div className="space-y-4">
    <p className="whitespace-pre-wrap leading-8">{entry.payload.scenario}</p>
    <label className="block">تحليلك القانوني<textarea className={inputClass} rows={5} maxLength={30000} value={answer} onChange={e => setAnswer(e.target.value)} /></label>
    {restored && <p className={metaClass}>استُرجعت محاولتك المحفوظة في هذا المتصفح. <button type="button" className={plainButtonClass} onClick={() => { setAnswer(''); setRestored(false); try { window.localStorage.removeItem(`mizan:pro-tools:case:${entry.id}`); } catch { /* ignore */ } }}>بدء محاولة جديدة</button></p>}
    {answer.trim() && <p className={metaClass}>{noteWordCount(answer)} كلمة في إجابتك.</p>}
    <div className="flex flex-wrap gap-3">
      <button className={buttonClass} disabled={!answer.trim()} onClick={() => setRevealed(true)}>مقارنة مع الإجابة المراجعة</button>
      <button className={buttonClass} disabled={!answer.trim() || busy} onClick={async () => {
        setBusy(true);
        try { await toolsService.saveNote({ tool_slug: 'cases', title: entry.title, body: answer, citation: `${entry.source_reference}\n${entry.source_url}` }); setMessage('تم حفظ الإجابة في دفتر إجاباتي.'); }
        catch { setMessage('تعذر حفظ الإجابة.'); } finally { setBusy(false); }
      }}>حفظ إجابتي</button>
      <CopyButton text={answer} label="نسخ إجابتي" disabled={!answer.trim()} />
    </div>
    <p role="status">{message}</p>
    {revealed && <div className="space-y-3 rounded-lg bg-muted p-4">
      <h4 className="font-bold">تقييم ذاتي، وليس تنقيطاً آلياً</h4>
      {coverage.total > 0 && <p className={metaClass}>تغطية لفظية لعناصر التحليل: {coverage.covered} من {coverage.total} ({coverage.ratio}%). المطابقة على الكلمات لا على المعنى، وراجع بنفسك كل عنصر.</p>}
      {coverage.items.map((item, index) => <div key={index} className="space-y-1">
        <label className="flex gap-2"><input type="checkbox" />{item.item}</label>
        {item.found.length > 0 && <p className="pr-6 text-xs text-muted-foreground">ورد في إجابتك: {item.found.join('، ')}</p>}
        {item.missing.length > 0 && <p className="pr-6 text-xs text-muted-foreground">لم يُعثر على كلمات: {item.missing.join('، ')}</p>}
      </div>)}
      <h4 className="font-bold">الإجابة النموذجية</h4><p className="whitespace-pre-wrap leading-8">{entry.payload.model_answer}</p>
      <CopyButton text={entry.payload.model_answer || ''} label="نسخ الإجابة النموذجية" />
    </div>}
  </div>;
}

/* ── خريطة الإحالات: علاقة واحدة وسلسلتها ──────────────────────────────────── */

function ReferenceBody({ entry, siblings, focus }: { entry: Entry; siblings: Entry[]; focus: string }) {
  const payload = entry.payload;
  const outgoing = relatedReferences(siblings, payload.from_article || '');
  const incoming = relatedReferences(siblings, payload.to_article || '');
  const role = focus && focus === payload.to_article ? 'واردة إلى النص المحدد' : focus && focus === payload.from_article ? 'صادرة من النص المحدد' : '';
  return <div className="space-y-3">
    <p className="font-bold">{payload.from_article} ← {payload.to_article}</p>
    {role && <p className={metaClass}>اتجاه العلاقة: {role}.</p>}
    <p className="whitespace-pre-wrap">{payload.relationship}</p>
    <Source url={payload.target_url}>فتح النص المرتبط</Source>
    {(outgoing.length > 1 || incoming.length > 1) && <div className="rounded-lg border border-border p-3 text-sm">
      <p className="font-bold">سلسلة الإحالات</p>
      {outgoing.length > 1 && <p className={metaClass}>صادرة من {payload.from_article}: {outgoing.map(item => item.payload.to_article).join('، ')}</p>}
      {incoming.length > 1 && <p className={metaClass}>واردة إلى {payload.to_article}: {incoming.map(item => item.payload.from_article).join('، ')}</p>}
    </div>}
  </div>;
}

export function EntryView({ entry, siblings = [], focus = '', newSince = '' }: { entry: Entry; siblings?: Entry[]; focus?: string; newSince?: string }) {
  const p = entry.payload;
  const isNew = Boolean(newSince) && entry.updated_at > newSince;
  return <article className={cardClass}>
    <div>
      <p className={metaClass}>{entry.topic}</p>
      <h3 className="mt-1 text-lg font-bold">{entry.title}{isNew && <span className="ms-2 rounded border border-primary px-2 py-0.5 text-xs font-bold text-primary">جديد</span>}</h3>
    </div>
    {entry.tool_slug === 'versions' && <Versions entry={entry} />}
    {entry.tool_slug === 'cases' && <CasePractice entry={entry} />}
    {entry.tool_slug === 'references' && <ReferenceBody entry={entry} siblings={siblings} focus={focus} />}
    {entry.tool_slug === 'alerts' && <div><p className="whitespace-pre-wrap leading-8">{p.summary}</p><AmendmentMeta entry={entry} /></div>}
    {entry.tool_slug === 'deadlines' && <Deadline entry={entry} />}
    <footer className="border-t border-border pt-3 text-sm text-muted-foreground space-y-2">
      <Source url={entry.source_url}>{entry.source_reference}</Source>
      <p>مراجعة: {entry.reviewed_by} - {entry.reviewed_on}</p>
    </footer>
  </article>;
}

/* ── ملف البحث: بحث وعدّ وتصدير ───────────────────────────────────────────── */

export function Workspace({ mode = 'workspace' }: { mode?: 'workspace' | 'cases' }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState<Partial<Note>>({ title: '', body: '', citation: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    let active = true;
    toolsService.notes(mode).then(data => { if (active) setNotes(data); }).catch(() => { if (active) setMessage('تعذر تحميل ملاحظاتك. حاول تحديث الصفحة.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const saved = await toolsService.saveNote({ ...draft, tool_slug: mode });
      setNotes(prev => [saved, ...prev.filter(n => n.id !== saved.id)]);
      setDraft({ title: '', body: '', citation: '' }); setMessage('تم الحفظ.');
    } catch { setMessage('تعذر الحفظ. تحقق من اتصالك وصلاحية اشتراكك.'); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm('حذف هذه الملاحظة نهائياً؟')) return;
    setBusy(true);
    try { await toolsService.deleteNote(id); setNotes(prev => prev.filter(n => n.id !== id)); if (draft.id === id) setDraft({ title: '', body: '', citation: '' }); }
    catch { setMessage('تعذر الحذف.'); } finally { setBusy(false); }
  }
  function download(content: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const visible = searchNotes(notes, query);
  const totalWords = notes.reduce((sum, note) => sum + noteWordCount(`${note.title} ${note.body}`), 0);
  return <section className="space-y-5">
    <h2 className="text-xl font-bold">{mode === 'cases' ? 'دفتر إجاباتي وتقدمي' : 'ملف البحث الخاص بي'}</h2>
    <p className="text-sm text-muted-foreground">ملاحظات خاصة بحسابك. تجنب إدخال بيانات حساسة تخص أطراف القضايا.</p>
    <form className={cardClass} onSubmit={save}>
      <label className="block">عنوان الملف أو التمرين<input className={inputClass} required maxLength={200} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="block">الملاحظات أو الإجابة<textarea className={inputClass} rows={6} maxLength={30000} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /></label>
      <p className="text-sm text-muted-foreground">{noteWordCount(draft.body || '')} كلمة في هذا الحقل.</p>
      <label className="block">المراجع والنسخ المعتمدة<textarea className={inputClass} maxLength={2000} value={draft.citation} onChange={e => setDraft({ ...draft, citation: e.target.value })} /></label>
      <div className="flex gap-3"><button className={buttonClass} disabled={busy || loading}>حفظ</button>{draft.id && <button type="button" onClick={() => setDraft({ title: '', body: '', citation: '' })}>إلغاء التعديل</button>}</div>
    </form>
    <p role="status">{message}</p>
    {loading ? <p>جارٍ التحميل...</p> : <>
      {notes.length > 0 && <>
        <p className="text-sm text-muted-foreground">{notes.length} ملاحظة محفوظة، بمجموع {totalWords} كلمة.</p>
        <label className="block">بحث في ملاحظاتي<input className={inputClass} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="كلمة من العنوان أو المتن أو المرجع" /></label>
        {query && <p className="text-sm text-muted-foreground">{visible.length} من {notes.length} ملاحظة تطابق «{query}».</p>}
      </>}
      <div className="flex flex-wrap gap-3">
        <button className={buttonClass} disabled={!notes.length} onClick={() => download(exportResearch(notes), 'mizan-research.txt', 'text/plain;charset=utf-8')}>تصدير جميع الملاحظات والمراجع TXT</button>
        <button className={plainButtonClass} disabled={!notes.length} onClick={() => download(exportResearchMarkdown(notes), 'mizan-research.md', 'text/markdown;charset=utf-8')}>تصدير Markdown بمراجع مقتبسة</button>
      </div>
      {!notes.length && <p>لا توجد ملاحظات محفوظة بعد.</p>}
      {notes.length > 0 && !visible.length && <p className={metaClass}>لا ملاحظة تطابق هذا البحث.</p>}
      {visible.map(note => <article className={cardClass} key={note.id}>
        <h3 className="font-bold">{note.title}</h3><p className="whitespace-pre-wrap">{note.body}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{note.citation}</p>
        <p className="text-xs text-muted-foreground">{noteWordCount(`${note.title} ${note.body}`)} كلمة</p>
        <div className="flex flex-wrap items-center gap-4">
          <button disabled={busy} onClick={() => setDraft({ id: note.id, title: note.title, body: note.body, citation: note.citation })}>تعديل</button>
          <button disabled={busy} onClick={() => remove(note.id)}>حذف</button>
          <CopyButton text={`${note.title}\n\n${note.body}\n\nالمرجع: ${note.citation || 'غير محدد'}`} label="نسخ مع المرجع" />
        </div>
      </article>)}
    </>}
  </section>;
}
