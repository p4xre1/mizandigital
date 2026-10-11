import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { casesService } from '@/lib/cases/service';
import { DIFFICULTY_LABELS, LAW_LABELS, type CaseArticle, type PublicCase } from '@/lib/cases/model';

const LETTERS = ['أ', 'ب', 'ج', 'د'];

interface Solved { picked: number; correctIndex: number; explanation: string; articles: CaseArticle[] }

/**
 * لعبة «من الواقعة إلى الحل»: يقرأ الزائر القصة، ويخمّن الجواب.
 * الخطأ يعرض تلميحاً فقط ويعطّل الخيار. الصواب يكشف الشرح ونصوص المواد.
 * الإجابة لا تُحمَّل في الصفحة قبل الصواب، لأن التصحيح يتم على الخادم.
 */
export function CasePlayer({ slug }: { slug: string }) {
  const [item, setItem] = useState<PublicCase | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [wrong, setWrong] = useState<number[]>([]);
  const [hint, setHint] = useState('');
  const [solved, setSolved] = useState<Solved | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);
  // يرفع الرقم عند تغيير الحالة أو الخروج، فتُهمل الاستجابات المتأخرة.
  const token = useRef(0);

  useEffect(() => {
    token.current += 1;
    const current = token.current;
    setItem(undefined); setWrong([]); setHint(''); setSolved(null); setAttempts(0); setError(''); setBusy(false);
    casesService.publicOne(slug)
      .then(data => { if (current === token.current) setItem(data); })
      .catch(() => { if (current === token.current) setError('تعذر تحميل الحالة. تحقق من اتصالك ثم أعد المحاولة.'); });
    return () => { token.current += 1; };
  }, [slug]);

  async function choose(index: number) {
    if (!item || busy || solved || wrong.includes(index)) return;
    const current = token.current;
    setBusy(true); setError(''); setAttempts(n => n + 1);
    try {
      const res = await casesService.check(item.slug, index);
      if (current !== token.current) return;
      if (res.status === 'correct') {
        setSolved({ picked: index, correctIndex: res.correctIndex, explanation: res.explanation, articles: res.articles });
        setHint('');
      } else if (res.status === 'wrong') {
        setWrong(prev => [...prev, index]);
        setHint(res.hint);
      } else {
        setError('تعذر التحقق من الإجابة الآن. حاول مرة أخرى.');
      }
    } catch {
      if (current === token.current) setError('تعذر التحقق من الإجابة الآن. حاول مرة أخرى.');
    } finally {
      if (current === token.current) setBusy(false);
    }
  }

  if (error && !item) return <p role="alert" className="rounded-xl border border-border bg-card p-5">{error}</p>;
  if (item === undefined) return <p role="status">جارٍ تحميل الحالة...</p>;
  if (item === null) return <p className="rounded-xl border border-border bg-card p-5">هذه الحالة غير موجودة أو لم تُنشر بعد. <Link className="font-bold text-primary underline" to="/pro-tools/cases">تصفح الحالات المنشورة</Link></p>;

  const paragraphs = item.story.split(/\n\s*\n/).filter(Boolean);
  return <article className="space-y-8" dir="rtl">
    <header className="space-y-3">
      <div className="flex flex-wrap gap-2 text-base">
        <span className="rounded-lg border border-border px-3 py-1">{LAW_LABELS[item.law_code]}</span>
        <span className="rounded-lg border border-border px-3 py-1">الصعوبة: {DIFFICULTY_LABELS[item.difficulty]}</span>
      </div>
      <h1 className="text-3xl font-black">{item.title}</h1>
    </header>

    {item.image_url && <figure className="overflow-hidden rounded-xl border border-border">
      <img src={item.image_url} alt={item.image_alt} loading="lazy" className="aspect-[3/2] w-full object-cover" />
    </figure>}

    <section className="space-y-4" aria-labelledby="case-story">
      <h2 id="case-story" className="text-xl font-bold">الواقعة</h2>
      {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-wrap text-lg leading-9">{p}</p>)}
    </section>

    <section className="space-y-4" aria-labelledby="case-question">
      <h2 id="case-question" className="text-xl font-bold">المسألة</h2>
      <p className="font-bold leading-8">{item.question}</p>
      <div role="group" aria-label="خيارات الجواب" className="grid gap-3">
        {item.options.map((option, index) => {
          const isWrong = wrong.includes(index);
          const isCorrect = solved?.correctIndex === index;
          const disabled = Boolean(solved) || isWrong || busy;
          return <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => choose(index)}
            className={`flex items-start gap-3 rounded-xl border p-4 text-right leading-7 transition disabled:cursor-not-allowed ${
              isCorrect ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950' :
              isWrong ? 'border-border bg-muted text-foreground/80 line-through' :
              'border-border bg-card hover:border-primary'
            }`}
          >
            <span className="font-bold">{LETTERS[index]}.</span>
            <span>{option}</span>
          </button>;
        })}
      </div>
      <p role="status" className="min-h-6 font-bold">
        {solved ? 'أحسنت، هذه الإجابة صحيحة.' : hint ? `تلميح: ${hint}` : busy ? 'جارٍ التحقق...' : ''}
      </p>
      {error && <p role="alert" className="text-base text-destructive">{error}</p>}
      <p className="text-base text-foreground/80">عدد المحاولات: {attempts}</p>
    </section>

    {solved && <section className="space-y-4 rounded-xl border border-border bg-card p-5" aria-labelledby="case-solution">
      <h2 id="case-solution" className="text-xl font-bold">الحل</h2>
      <p className="whitespace-pre-wrap leading-8">{solved.explanation}</p>
      {solved.articles.length > 0 && <div className="space-y-3">
        <h3 className="font-bold">المواد المرجعية</h3>
        {solved.articles.map((a, i) => <blockquote key={i} className="border-r-4 border-primary bg-muted p-4 leading-8">
          <p className="mb-2 text-base font-bold">{LAW_LABELS[a.law]} — {a.law === 'constitution-2011' ? 'الفصل' : 'المادة'} {a.article}</p>
          <p className="whitespace-pre-wrap">{a.text}</p>
        </blockquote>)}
      </div>}
      <Link className="inline-block font-bold text-primary underline" to="/pro-tools/cases">حالات أخرى</Link>
    </section>}

    <footer className="space-y-2 border-t border-border pt-4 text-base text-foreground/80">
      <p>الأسماء والوقائع في هذه الحالة وهمية، ووُضعت لأغراض تعليمية.</p>
      <p>أداة تعليمية لا تغني عن النص الرسمي أو الاستشارة المهنية.</p>
      {item.reviewed_by && <p>مراجعة: {item.reviewed_by}{item.reviewed_on ? ` — ${item.reviewed_on}` : ''}</p>}
    </footer>
  </article>;
}
