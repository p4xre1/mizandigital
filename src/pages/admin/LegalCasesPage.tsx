import { useEffect, useState } from 'react';
import { casesService } from '@/lib/cases/service';
import {
  DIFFICULTY_LABELS, LAW_LABELS, draftFromCase, draftToPayload, emptyDraft, suggestSlug, validateDraft,
  type CaseDraft, type Difficulty, type LawCode, type LegalCase,
} from '@/lib/cases/model';
import { buttonClass, cardClass, inputClass } from '@/components/pro-tools/ToolViews';

const LETTERS = ['أ', 'ب', 'ج', 'د'];

function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('duplicate key') || message.includes('legal_cases_slug_key')) return 'هذا الرابط الثابت مستعمل بالفعل. اختر رابطاً آخر.';
  if (message) return `تعذر الحفظ: ${message}`;
  return 'تعذر الحفظ. تحقق من الحقول وصلاحيات الإدارة.';
}

/** إدارة حالات «من الواقعة إلى الحل»: إنشاء وتعديل وحذف، مع رابط ثابت فريد. */
export default function LegalCasesPage() {
  const [rows, setRows] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<CaseDraft>(emptyDraft);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    casesService.adminList()
      .then(data => { if (active) setRows(data); })
      .catch(error => { if (active) setMessage(errorText(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function update(patch: Partial<CaseDraft>) { setDraft(prev => ({ ...prev, ...patch })); }
  function setOption(index: number, value: string) {
    setDraft(prev => ({ ...prev, options: prev.options.map((o, i) => (i === index ? value : o)) }));
  }
  function setArticle(index: number, patch: Partial<CaseDraft['articles'][number]>) {
    setDraft(prev => ({ ...prev, articles: prev.articles.map((a, i) => (i === index ? { ...a, ...patch } : a)) }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    const problem = validateDraft(draft);
    if (problem) { setMessage(problem); return; }
    setBusy(true);
    try {
      if (await casesService.slugTaken(draft.slug.trim(), draft.id)) {
        setMessage('هذا الرابط الثابت مستعمل بالفعل. اختر رابطاً آخر.');
        return;
      }
      const saved = await casesService.adminSave(draftToPayload(draft));
      setRows(prev => [saved, ...prev.filter(r => r.id !== saved.id)]);
      setDraft(emptyDraft());
      setSlugTouched(false);
      setMessage(`تم حفظ الحالة. الرابط: /pro-tools/cases/${saved.slug}`);
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: LegalCase) {
    if (!window.confirm(`حذف الحالة «${row.title}» نهائياً؟`)) return;
    setBusy(true);
    try {
      await casesService.adminDelete(row.id);
      setRows(prev => prev.filter(r => r.id !== row.id));
      if (draft.id === row.id) setDraft(emptyDraft());
      setMessage('تم الحذف.');
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-6" dir="rtl">
    <header className="space-y-2">
      <h1 className="text-2xl font-black">حالات «من الواقعة إلى الحل»</h1>
      <p className="text-sm leading-7 text-muted-foreground">
        أنشئ حالة من قصة قصيرة وأربعة خيارات ومواد مرجعية. الرابط الثابت يظهر للزائر، ولا يتكرر بين الحالات.
        لا تُنشر حالة قبل تسجيل المراجع، وتُخفى الإجابة عن الزوار حتى يختاروا الصواب.
      </p>
    </header>

    <form className={cardClass} onSubmit={save}>
      <h2 className="text-xl font-bold">{draft.id ? 'تعديل حالة' : 'حالة جديدة'}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">العنوان
          <input className={inputClass} required maxLength={160} value={draft.title}
            onChange={e => {
              const title = e.target.value;
              update({ title, ...(slugTouched || draft.id ? {} : { slug: suggestSlug(title) }) });
            }} />
        </label>
        <label className="block">الرابط الثابت (بالحروف اللاتينية والشرطة)
          <input className={inputClass} required maxLength={120} dir="ltr" value={draft.slug}
            onChange={e => { setSlugTouched(true); update({ slug: e.target.value.toLowerCase() }); }} />
          <span className="text-xs text-muted-foreground">الرابط: /pro-tools/cases/{draft.slug || '...'}</span>
        </label>
        <label className="block">القانون المرجعي
          <select className={inputClass} value={draft.law_code} onChange={e => update({ law_code: e.target.value as LawCode })}>
            {(Object.keys(LAW_LABELS) as LawCode[]).map(code => <option key={code} value={code}>{LAW_LABELS[code]}</option>)}
          </select>
        </label>
        <label className="block">الصعوبة
          <select className={inputClass} value={draft.difficulty} onChange={e => update({ difficulty: e.target.value as Difficulty })}>
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map(d => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
          </select>
        </label>
      </div>

      <label className="block">قصة الواقعة (فقرات مفصولة بسطر فارغ)
        <textarea className={inputClass} rows={8} maxLength={6000} required value={draft.story} onChange={e => update({ story: e.target.value })} />
      </label>
      <label className="block">السؤال
        <input className={inputClass} required maxLength={400} value={draft.question} onChange={e => update({ question: e.target.value })} />
      </label>

      <fieldset className="space-y-3">
        <legend className="font-bold">الخيارات (اختر الخيار الصحيح بالدائرة)</legend>
        {draft.options.map((option, index) => <div key={index} className="flex items-center gap-3">
          <input type="radio" name="answer" aria-label={`الخيار ${LETTERS[index]} هو الصحيح`} checked={draft.answer_index === index} onChange={() => update({ answer_index: index })} />
          <span className="w-6 font-bold">{LETTERS[index]}.</span>
          <input className={inputClass} required maxLength={300} value={option} onChange={e => setOption(index, e.target.value)} />
        </div>)}
      </fieldset>

      <label className="block">التلميح (يظهر بعد الخطأ، ولا يكشف الجواب)
        <input className={inputClass} required maxLength={400} value={draft.hint} onChange={e => update({ hint: e.target.value })} />
      </label>
      <label className="block">الشرح بعد الإجابة الصحيحة
        <textarea className={inputClass} rows={4} maxLength={2000} required value={draft.explanation} onChange={e => update({ explanation: e.target.value })} />
      </label>

      <fieldset className="space-y-3">
        <legend className="font-bold">المواد المرجعية (نص المادة يُنسخ من النص الرسمي حرفياً)</legend>
        {draft.articles.map((a, index) => <div key={index} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_120px]">
          <select className={inputClass} aria-label="القانون" value={a.law} onChange={e => setArticle(index, { law: e.target.value as LawCode })}>
            {(Object.keys(LAW_LABELS) as LawCode[]).map(code => <option key={code} value={code}>{LAW_LABELS[code]}</option>)}
          </select>
          <input className={inputClass} aria-label="رقم المادة أو الفصل" type="number" min={1} max={500} required value={a.article} onChange={e => setArticle(index, { article: e.target.value })} />
          <textarea className={`${inputClass} md:col-span-2`} rows={3} maxLength={5000} required aria-label="نص المادة" value={a.text} onChange={e => setArticle(index, { text: e.target.value })} />
          {draft.articles.length > 1 && <button type="button" className="justify-self-start text-sm text-destructive" onClick={() => update({ articles: draft.articles.filter((_, i) => i !== index) })}>حذف هذه المادة</button>}
        </div>)}
        {draft.articles.length < 6 && <button type="button" className="text-sm font-bold text-primary" onClick={() => update({ articles: [...draft.articles, { law: draft.law_code, article: '', text: '' }] })}>+ إضافة مادة</button>}
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">رابط الصورة (يبدأ بـ / أو https://، اختياري)
          <input className={inputClass} dir="ltr" maxLength={2000} value={draft.image_url} onChange={e => update({ image_url: e.target.value })} />
        </label>
        <label className="block">وصف الصورة للمكفوفين
          <input className={inputClass} maxLength={300} value={draft.image_alt} onChange={e => update({ image_alt: e.target.value })} />
        </label>
      </div>
      {draft.image_url && <img src={draft.image_url} alt={draft.image_alt} className="aspect-[3/2] w-48 rounded-lg border border-border object-cover" />}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">المراجع
          <input className={inputClass} maxLength={160} value={draft.reviewed_by} onChange={e => update({ reviewed_by: e.target.value })} />
        </label>
        <label className="block">تاريخ المراجعة
          <input className={inputClass} type="date" value={draft.reviewed_on} onChange={e => update({ reviewed_on: e.target.value })} />
        </label>
      </div>
      <label className="flex gap-2"><input type="checkbox" checked={draft.published} onChange={e => update({ published: e.target.checked })} />نشر الحالة للزوار</label>

      <div className="flex flex-wrap gap-3">
        <button className={buttonClass} disabled={busy}>{draft.id ? 'حفظ التعديلات' : 'حفظ الحالة'}</button>
        {draft.id && <button type="button" className="text-sm" onClick={() => { setDraft(emptyDraft()); setSlugTouched(false); }}>إلغاء التعديل</button>}
      </div>
    </form>

    <p role="status" className="font-bold">{message}</p>

    {loading ? <p role="status">جارٍ تحميل الحالات...</p> : <div className="space-y-3">
      {!rows.length && <p className={cardClass}>لا توجد حالات بعد.</p>}
      {rows.map(row => <article key={row.id} className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">{row.title}</h3>
            <p className="text-sm text-muted-foreground" dir="ltr">/pro-tools/cases/{row.slug}</p>
          </div>
          <span className="rounded border border-border px-2 py-1 text-xs">{row.published ? 'منشورة' : 'مسودة'}</span>
        </div>
        <div className="flex gap-4 text-sm">
          <button type="button" disabled={busy} onClick={() => { setDraft(draftFromCase(row)); setSlugTouched(true); setMessage(''); window.scrollTo({ top: 0 }); }}>تعديل</button>
          <button type="button" disabled={busy} onClick={() => remove(row)}>حذف</button>
        </div>
      </article>)}
    </div>}
  </div>;
}
