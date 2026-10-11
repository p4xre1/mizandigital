import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { casesService } from '@/lib/cases/service';
import { DIFFICULTY_LABELS, LAW_LABELS, type LawCode, type PublicCase } from '@/lib/cases/model';

/** فهرس الحالات المنشورة، مع تصفية حسب القانون. مجاني ولا يتطلب تسجيلاً. */
export function CaseList() {
  const [items, setItems] = useState<PublicCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [law, setLaw] = useState<'all' | LawCode>('all');

  useEffect(() => {
    let active = true;
    casesService.publicList()
      .then(data => { if (active) setItems(data); })
      .catch(() => { if (active) setError('تعذر تحميل الحالات. تحقق من اتصالك ثم أعد فتح الصفحة.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visible = items.filter(item => law === 'all' || item.law_code === law);

  return <section className="space-y-5" aria-labelledby="cases-heading">
    <div className="space-y-2">
      <h2 id="cases-heading" className="text-2xl font-black">من الواقعة إلى الحل</h2>
      <p className="leading-8 text-foreground/80">اقرأ الواقعة، وخمّن الجواب الصحيح من بين أربعة خيارات، ثم اطلع على الشرح والمواد المرجعية.</p>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية حسب القانون">
      {(['all', 'constitution-2011', 'mudawana-70-03'] as const).map(value => <button
        key={value}
        type="button"
        aria-pressed={law === value}
        onClick={() => setLaw(value)}
        className={`rounded-lg border px-3 py-2 text-base ${law === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
      >{value === 'all' ? 'الكل' : LAW_LABELS[value]}</button>)}
    </div>
    {loading && <p role="status">جارٍ تحميل الحالات...</p>}
    {error && <p role="alert" className="rounded-xl border border-border bg-card p-5">{error}</p>}
    {!loading && !error && !visible.length && <p className="rounded-xl border border-border bg-card p-5">لا توجد حالات منشورة بعد في هذا القسم.</p>}
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {visible.map(item => <article key={item.slug} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        {item.image_url && <img src={item.image_url} alt={item.image_alt} loading="lazy" className="aspect-[3/2] w-full object-cover" />}
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded border border-border px-2 py-1">{LAW_LABELS[item.law_code]}</span>
            <span className="rounded border border-border px-2 py-1">{DIFFICULTY_LABELS[item.difficulty]}</span>
          </div>
          <h3 className="text-lg font-bold">{item.title}</h3>
          <p className="line-clamp-3 flex-1 text-base leading-7 text-foreground/80">{item.story.split(/\n\s*\n/)[0]}</p>
          <Link className="font-bold text-primary underline" to={`/pro-tools/cases/${item.slug}`}>ابدأ الحالة</Link>
        </div>
      </article>)}
    </div>
  </section>;
}
