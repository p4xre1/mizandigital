import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LockKeyhole, ArrowLeft, BookOpenCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AEOHead } from '@/components/seo/AEOHead';
import { canonicalFor } from '@/lib/canonical';
import { EntryView, Workspace, buttonClass, cardClass, inputClass } from '@/components/pro-tools/ToolViews';
import { toolsService } from '@/lib/pro-tools/service';
import {
  buildReferenceIndex,
  matchesQuery,
  relatedReferences,
  sortAlerts,
  upcomingAmendments,
  type Entry,
  type Tool,
} from '@/lib/pro-tools/model';

/** آخر زيارة للأداة (تُخزَّن محلياً فقط ولا تُرسل لأي جهة). */
function readSeen(slug: string): string {
  try { return window.localStorage.getItem(`mizan:pro-tools:seen:${slug}`) || ''; } catch { return ''; }
}
function markSeen(slug: string): void {
  try { window.localStorage.setItem(`mizan:pro-tools:seen:${slug}`, new Date().toISOString()); } catch { /* التخزين المحلي معطّل: نتجاهل */ }
}

function Content({ tool }: { tool: Tool }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [followedOnly, setFollowedOnly] = useState(false);
  const [alertOrder, setAlertOrder] = useState<'effective' | 'recent'>('effective');
  const [focusArticle, setFocusArticle] = useState('');
  const [seen, setSeen] = useState('');
  useEffect(() => {
    let active = true;
    if (tool.slug === 'workspace') { setLoading(false); return; }
    Promise.all([toolsService.entries(tool.slug), tool.slug === 'alerts' ? toolsService.follows() : Promise.resolve([])])
      .then(([data, follows]) => { if (active) { setEntries(data.filter(e => e.published)); setTopics(follows.map(f => f.topic)); } })
      .catch(() => { if (active) setError('تعذر تحميل المحتوى. تحقق من اتصالك واشتراكك ثم أعد فتح الأداة.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tool.slug]);
  // مؤشر «جديد منذ آخر زيارة» يُقرأ بعد التحميل: التخزين المحلي ليس جزءاً من الحالة الأولية.
  useEffect(() => { setSeen(tool.slug === 'alerts' ? readSeen(tool.slug) : ''); }, [tool.slug]);
  if (tool.slug === 'workspace') return <Workspace />;
  if (loading) return <p role="status">جارٍ تحميل المحتوى المحمي...</p>;
  const referenceIndex = tool.slug === 'references' ? buildReferenceIndex(entries) : null;
  const upcoming = tool.slug === 'alerts' ? upcomingAmendments(entries, new Date().toISOString().slice(0, 10), 30) : [];
  const filteredByArticle = tool.slug === 'references' && focusArticle ? relatedReferences(entries, focusArticle) : entries;
  const ordered = tool.slug === 'alerts' ? sortAlerts(filteredByArticle, alertOrder) : filteredByArticle;
  const visible = ordered.filter(e => matchesQuery(`${e.title} ${e.topic} ${Object.values(e.payload).join(' ')}`, query) && (!followedOnly || topics.includes(e.topic)));
  return <div className="space-y-5">
    <p role="alert">{error}</p>
    {tool.slug === 'alerts' && <section className={cardClass}>
      <h2 className="font-bold">المواضيع التي أتابعها</h2><p className="text-sm text-muted-foreground">تنبيهات داخل المنصة من محتوى ينشره فريق التحرير. لا تُرسل رسائل بريد ولا تُراقب المصادر آلياً.</p>
      <div className="flex flex-wrap gap-2">{Array.from(new Set([...entries.map(e => e.topic), ...topics])).map(topic => <button key={topic} disabled={busy} aria-pressed={topics.includes(topic)} className="rounded-lg border border-border px-3 py-2 text-sm" onClick={async () => {
        setBusy(true); setError('');
        try {
          if (topics.includes(topic)) { await toolsService.unfollow(topic); setTopics(prev => prev.filter(t => t !== topic)); }
          else { await toolsService.follow(topic); setTopics(prev => [...prev, topic]); }
        } catch { setError('تعذر تحديث المتابعة. حاول مرة أخرى.'); } finally { setBusy(false); }
      }}>{topics.includes(topic) ? 'إلغاء متابعة: ' : 'متابعة: '}{topic}</button>)}</div>
      <label className="flex gap-2"><input type="checkbox" checked={followedOnly} onChange={e => setFollowedOnly(e.target.checked)} />عرض المواضيع التي أتابعها فقط</label>
    </section>}
    {tool.slug === 'references' && referenceIndex && referenceIndex.articles.length > 0 && <section className={cardClass}>
      <h2 className="font-bold">خريطة الإحالات المنشورة</h2>
      <p className="text-sm text-muted-foreground">
        {referenceIndex.relationCount} علاقة موثقة بين {referenceIndex.articles.length} نصّاً. اختر نصاً لعرض إحالاته الصادرة والواردة، أو أزل الاختيار لعرض الكل.
      </p>
      <div className="flex flex-wrap gap-2">
        {referenceIndex.articles.map(article => <button key={article} type="button" disabled={busy} aria-pressed={focusArticle === article}
          className="rounded-lg border border-border px-3 py-2 text-sm"
          onClick={() => setFocusArticle(prev => prev === article ? '' : article)}>
          {article} ({(referenceIndex.outgoing[article] || []).length} صادرة، {(referenceIndex.incoming[article] || []).length} واردة)
        </button>)}
      </div>
    </section>}

    {tool.slug === 'alerts' && upcoming.length > 0 && <section className={cardClass}>
      <h2 className="font-bold">تنفذ خلال 30 يوماً ({upcoming.length})</h2>
      <ul className="space-y-1 text-sm">
        {upcoming.map(item => <li key={item.id}>
          <span className="font-bold">{item.payload.effective_date}</span> — {item.title} <span className="text-muted-foreground">({item.topic})</span>
        </li>)}
      </ul>
    </section>}

    {tool.slug === 'alerts' && <section className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">ما الجديد منذ آخر زيارة</h2>
          <p className="text-sm text-muted-foreground">
            {seen ? `آخر زيارة سُجّلت في ${new Date(seen).toLocaleString('ar-MA')}.` : 'هذه زيارتك الأولى المسجلة في هذا المتصفح.'}
            {' '}المؤشر أدناه يعتمد على تاريخ تحديث المادة داخل المنصة.
          </p>
        </div>
        <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" disabled={busy} onClick={() => { markSeen(tool.slug); setSeen(new Date().toISOString()); }}>تعليم الكل كمقروء</button>
      </div>
      <label className="flex flex-wrap items-center gap-3 text-sm">
        <span>ترتيب العرض</span>
        <select className={`${inputClass} max-w-[260px]`} value={alertOrder} onChange={e => setAlertOrder(e.target.value === 'recent' ? 'recent' : 'effective')}>
          <option value="effective">الأقرب نفاذاً أولاً</option>
          <option value="recent">الأحدث تحديثاً أولاً</option>
        </select>
      </label>
    </section>}

    <label className="block">بحث في العنوان أو الموضوع أو النص<input className={inputClass} value={query} onChange={e => setQuery(e.target.value)} type="search" /></label>
    <p className="text-sm text-muted-foreground">{visible.length} نتيجة{focusArticle ? ` للنص المحدد «${focusArticle}»` : ''}</p>
    {!visible.length && !error && <p className={cardClass}>لا توجد مواد منشورة مطابقة حالياً. لن تعرض المنصة نصوصاً أو قواعد غير مراجعة.</p>}
    {visible.map(entry => <EntryView key={`${entry.id}:${entry.updated_at}`} entry={entry} siblings={entries} focus={focusArticle} newSince={tool.slug === 'alerts' ? seen : ''} />)}
    {tool.slug === 'cases' && <Workspace mode="cases" />}
  </div>;
}

function ToolsSession({ signedIn }: { signedIn: boolean }) {
  const { slug } = useParams();
  const [tools, setTools] = useState<Tool[]>([]);
  const [access, setAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load(initial = true) {
      if (initial) { setLoading(true); setAccess(false); }
      setError('');
      try {
        const [catalog, allowed] = await Promise.all([toolsService.catalog(), signedIn ? toolsService.access() : Promise.resolve(false)]);
        if (active) { setTools(catalog); setAccess(allowed === true); }
      } catch { if (active) { setAccess(false); setError('الأدوات غير متاحة حالياً. يرجى المحاولة لاحقاً؛ قد يكون إعداد قاعدة البيانات غير مكتمل.'); } }
      finally { if (active) setLoading(false); }
    }
    void load();
    // Revalidate membership on return and expiry; local storage never grants access.
    const recheck = () => { if (document.visibilityState === 'visible') void load(false); };
    window.addEventListener('focus', recheck);
    const timer = window.setInterval(recheck, 60000);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', recheck); };
  }, [signedIn, retry, slug]);
  const tool = tools.find(t => t.slug === slug);
  return <main className="container-wide max-w-6xl py-10 space-y-8" dir="rtl">
    <AEOHead title={tool ? `${tool.title} — أدوات ميزان برو` : 'أدوات ميزان برو'} description="أدوات البحث والتدريب القانوني باشتراك Pro، بمحتوى موثق ومراجع." canonicalUrl={canonicalFor(`/pro-tools${slug ? `/${slug}` : ''}`)} noindex={Boolean(slug)} />
    <header className="space-y-4">
      <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1 text-sm"><BookOpenCheck className="size-4" /> ميزان Pro</span>
      <h1 className="text-3xl font-black">{tool?.title || 'أدواتك للبحث والتدريب القانوني'}</h1>
      <p className="max-w-3xl leading-8 text-muted-foreground">{tool?.description || 'من النص القانوني إلى التطبيق العملي. ست أدوات متخصصة، بمصادر واضحة وملاحظات خاصة بك.'}</p>
      {slug && <Link className="text-primary underline" to="/pro-tools">جميع الأدوات</Link>}
    </header>
    {loading ? <p role="status">جارٍ التحقق من إتاحة الأدوات والاشتراك...</p> : error ? <div role="alert" className={cardClass}><p>{error}</p><button className={buttonClass} onClick={() => setRetry(n => n + 1)}>إعادة المحاولة</button></div> : slug ? (
      !tool ? <p>الأداة غير موجودة.</p> : !tool.enabled ? <p className={cardClass}>هذه الأداة غير مفعلة حالياً. ستتاح بعد تجهيز محتواها ومراجعته.</p> : !access ? <section className={cardClass}>
        <LockKeyhole className="size-6 text-muted-foreground" /><h2 className="text-xl font-bold">هذه الأداة حصرية لمشتركي Pro</h2>
        <p>يلزم حساب باشتراك فعّال وغير منتهٍ للوصول إلى المحتوى وحفظ العمل.</p>
        <div className="flex flex-wrap gap-4"><Link className={buttonClass} to="/pricing">عرض خطط Pro</Link>{!signedIn && <Link className="text-primary underline" to={`/login?next=${encodeURIComponent(`/pro-tools/${slug}`)}`}>تسجيل الدخول</Link>}</div>
      </section> : <Content key={tool.slug} tool={tool} />
    ) : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {tools.map((item, index) => <article key={item.slug} className={`${cardClass} flex flex-col`}>
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">0{index + 1}</span><span className="rounded border border-border px-2 py-1 text-xs">{item.enabled ? 'Pro فقط' : 'قريباً'}</span></div>
        <h2 className="text-xl font-bold">{item.title}</h2><p className="flex-1 text-sm leading-7 text-muted-foreground">{item.description}</p>
        <Link className="inline-flex items-center gap-2 font-bold text-primary" to={`/pro-tools/${item.slug}`}>{item.enabled ? 'فتح الأداة' : 'تفاصيل الأداة'}<ArrowLeft className="size-4" /></Link>
      </article>)}
    </div>}
    <p className="text-sm leading-7 text-muted-foreground">أدوات مساعدة للتعلم والبحث، لا تغني عن النص الرسمي أو الاستشارة المهنية. التغطية تقتصر على المواد المنشورة والمراجعة.</p>
  </main>;
}
export default function ProToolsPage() {
  const { user, initialized } = useAuth();
  if (!initialized) return <p className="p-10" dir="rtl">جارٍ التحقق من الحساب...</p>;
  return <ToolsSession key={user?.id || 'guest'} signedIn={Boolean(user)} />;
}
