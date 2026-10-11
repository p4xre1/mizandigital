import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AEOHead } from '@/components/seo/AEOHead';
import { canonicalFor } from '@/lib/canonical';
import { ReferenceMap } from '@/components/pro-tools/ReferenceMap';
import { CaseList } from '@/components/cases/CaseList';
import { EntryView, Workspace, buttonClass, cardClass, inputClass } from '@/components/pro-tools/ToolViews';
import { ToolCatalogCard, ToolIcon } from '@/components/pro-tools/ToolCard';
import '@/styles/pro-tools.css';
import { toolsService } from '@/lib/pro-tools/service';
import { OTHER_REFERENCES_LAW, REFERENCE_LAWS, curatedReferences, lawsWithReferences, mergeReferences, referenceFromEntry, referenceMeta, referencesForLaw, type Reference, type ReferenceLaw } from '@/lib/pro-tools/referenceMap';
import { ReferenceInfographicCard } from '@/components/pro-tools/ReferenceInfographicCard';
import type { Entry, Tool } from '@/lib/pro-tools/model';

/**
 * خريطة الإحالات: تقرأ المجموعة المنسّقة المحفوظة في المستودع أولاً، ثم تضيف
 * ما ينشره المحرّر من الجدول. فشل الاتصال لا يُفرغ الصفحة: تبقى المجموعة
 * المنسّقة ظاهرة مع تنبيه، لأن الأداة مجانية ومحتواها الأساسي نصّ رسمي عام
 * لا يخضع لجلسة ولا لاشتراك.
 */
function ReferencesView({ signedIn, lawSlug }: { signedIn: boolean; lawSlug?: string }) {
  const [remote, setRemote] = useState<Reference[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    toolsService.entries('references')
      .then(data => {
        if (!active) return;
        setRemote(data.filter(entry => entry.published).map(entry => referenceFromEntry(entry, {
          sourceUrl: referenceMeta.sourceUrl,
          reviewedBy: referenceMeta.reviewedBy,
          reviewedOn: referenceMeta.reviewedOn,
        })));
      })
      .catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, []);
  const references = useMemo(() => mergeReferences(curatedReferences, remote), [remote]);

  if (lawSlug) {
    const law = [...REFERENCE_LAWS, OTHER_REFERENCES_LAW].find(item => item.slug === lawSlug);
    if (!law) return <p role="alert" className={cardClass}>هذا النص غير موجود في خريطة الإحالات.</p>;
    return <div className="space-y-6">
      <LawTabs current={law.slug} laws={lawsWithReferences(references)} />
      <ReferenceMap
        references={referencesForLaw(references, law.slug)}
        remotePending={unavailable}
        signedIn={signedIn}
        onSave={async (reference) => {
          await toolsService.saveNote({
            tool_slug: 'workspace',
            title: `${reference.fromArticle} ← ${reference.toArticle}`.slice(0, 200),
            body: [reference.relationship, reference.excerpt ? `«${reference.excerpt}»` : ''].filter(Boolean).join('\n\n'),
            citation: [reference.fromText, reference.sourceUrl, reference.targetVerified ? reference.targetUrl : ''].filter(Boolean).join('\n'),
          });
        }}
      />
    </div>;
  }

  return <ReferencesOverview references={references} />;
}

/** تبويب بين النصوص: كل نص له رابط ثابت يصلح للمشاركة والفهرسة. */
function LawTabs({ current, laws }: { current: string; laws: ReferenceLaw[] }) {
  return <nav aria-label="النصوص في خريطة الإحالات" className="flex flex-wrap gap-2">
    {laws.map(law => <Link
      key={law.slug}
      to={`/pro-tools/references/${law.slug}`}
      aria-current={law.slug === current ? 'page' : undefined}
      className={`rounded-lg border px-4 py-2 text-base font-bold ${law.slug === current ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
    >{law.label}</Link>)}
    <Link to="/pro-tools/references" className="rounded-lg border border-border px-4 py-2 text-base font-bold">ملخص الخريطة</Link>
  </nav>;
}

/** الصفحة الرئيسية للخريطة: ملخص، ثم بطاقة لكل نص مع عدد إحالاته. */
function ReferencesOverview({ references }: { references: Reference[] }) {
  return <div className="space-y-6">
    <ReferenceInfographicCard references={references} sourceUrl={referenceMeta.sourceUrl} sourceLabel={referenceMeta.sourceLabel} />
    <section className="grid gap-4 md:grid-cols-2" aria-label="النصوص">
      {lawsWithReferences(references).map((law: ReferenceLaw) => <Link
        key={law.slug}
        to={`/pro-tools/references/${law.slug}`}
        className={`${cardClass} pt-card flex flex-col gap-3 no-underline`}
      >
        <h2 className="text-xl font-bold">{law.label}</h2>
        <p className="text-base leading-7 text-foreground/80">{law.description}</p>
        <p className="text-base font-bold">{referencesForLaw(references, law.slug).length} إحالة في هذا النص</p>
        <span className="mt-auto inline-flex items-center gap-2 font-bold text-primary">فتح خريطة النص وقائمة إحالاته <ArrowLeft className="pt-arrow size-4" aria-hidden /></span>
      </Link>)}
    </section>
  </div>;
}

/**
 * كتالوج احتياطي لخريطة الإحالات وحدها.
 *
 * لماذا؟ الأداة مجانية ومحتواها الأساسي نصّ رسمي عام مودع في المستودع. تعطّل
 * قراءة الجدول يعني تعطّل «مواد التحرير الإضافية» فقط، لا تعطّل الأداة. الأدوات
 * الأخرى ليس لها محتوى محلي فتبقى رسالة الخطأ هي الصواب لها.
 */
const FALLBACK_CATALOG: Tool[] = [{
  slug: 'references',
  title: 'خريطة الإحالات القانونية',
  description: 'ابحث عن الروابط بين النصوص ومصادرها.',
  enabled: true,
}, {
  slug: 'cases',
  title: 'من الواقعة إلى الحل',
  description: 'حالات قانونية تدريبية: اقرأ الواقعة، خمّن الجواب، ثم اطلع على المواد المرجعية.',
  enabled: true,
}];

function Content({ tool, signedIn }: { tool: Tool; signedIn: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [followedOnly, setFollowedOnly] = useState(false);
  useEffect(() => {
    let active = true;
    if (tool.slug === 'workspace') { setLoading(false); return; }
    Promise.all([toolsService.entries(tool.slug), tool.slug === 'alerts' && signedIn ? toolsService.follows() : Promise.resolve([])])
      .then(([data, follows]) => { if (active) { setEntries(data.filter(e => e.published)); setTopics(follows.map(f => f.topic)); } })
      .catch(() => { if (active) setError('تعذر تحميل المحتوى المجاني. تحقق من اتصالك ثم أعد فتح الأداة.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tool.slug, signedIn]);
  if (tool.slug === 'workspace') return <Workspace />;
  if (loading) return <p role="status">جارٍ تحميل المحتوى المجاني...</p>;
  const visible = entries.filter(e => `${e.title} ${e.topic} ${Object.values(e.payload).join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (!followedOnly || topics.includes(e.topic)));
  return <div className="space-y-5">
    <p role="alert">{error}</p>
    {tool.slug === 'cases' && <CaseList />}
    {tool.slug === 'alerts' && signedIn && <section className={cardClass}>
      <h2 className="font-bold">المواضيع التي أتابعها</h2><p className="text-base text-foreground/80">تنبيهات داخل المنصة من محتوى ينشره فريق التحرير. لا تُرسل رسائل بريد ولا تُراقب المصادر آلياً.</p>
      <div className="flex flex-wrap gap-2">{Array.from(new Set([...entries.map(e => e.topic), ...topics])).map(topic => <button key={topic} disabled={busy} aria-pressed={topics.includes(topic)} className="rounded-lg border border-border px-3 py-2 text-base" onClick={async () => {
        setBusy(true); setError('');
        try {
          if (topics.includes(topic)) { await toolsService.unfollow(topic); setTopics(prev => prev.filter(t => t !== topic)); }
          else { await toolsService.follow(topic); setTopics(prev => [...prev, topic]); }
        } catch { setError('تعذر تحديث المتابعة. حاول مرة أخرى.'); } finally { setBusy(false); }
      }}>{topics.includes(topic) ? 'إلغاء متابعة: ' : 'متابعة: '}{topic}</button>)}</div>
      <label className="flex gap-2"><input type="checkbox" checked={followedOnly} onChange={e => setFollowedOnly(e.target.checked)} />عرض المواضيع التي أتابعها فقط</label>
    </section>}
    {tool.slug === 'alerts' && !signedIn && <p className={cardClass}>يمكنك تصفح التنبيهات مجاناً. <Link className="font-bold text-primary underline" to={`/login?next=${encodeURIComponent(`/pro-tools/${tool.slug}`)}`}>سجّل الدخول مجاناً</Link> لحفظ قائمة مواضيعك الشخصية.</p>}
    <label className="block">بحث في العنوان أو الموضوع أو النص<input className={inputClass} value={query} onChange={e => setQuery(e.target.value)} type="search" /></label>
    <p className="text-base text-foreground/80">{visible.length} نتيجة</p>
    {!visible.length && !error && <p className={cardClass}>لا توجد مواد منشورة مطابقة حالياً. لن تعرض المنصة نصوصاً أو قواعد غير مراجعة.</p>}
    {visible.map((entry, i) => <div key={`${entry.id}:${entry.updated_at}`} className="pt-rise" style={{ '--pt-delay': `${Math.min(i, 10) * 70}ms` } as React.CSSProperties}>
      <EntryView entry={entry} signedIn={signedIn} />
    </div>)}
    {tool.slug === 'cases' && <Workspace mode="cases" />}
  </div>;
}

function ToolsSession({ signedIn }: { signedIn: boolean }) {
  const { slug: paramSlug, lawSlug } = useParams();
  // صفحات النصوص (/pro-tools/references/<law>) تابعة لأداة الخريطة.
  const slug = lawSlug ? 'references' : paramSlug;
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load(initial = true) {
      if (initial) setLoading(true);
      setError('');
      try {
        const catalog = await toolsService.catalog();
        if (active) setTools(catalog);
      } catch {
        // خريطة الإحالات تعمل على مجموعة منسّقة محفوظة في المستودع: تعطّل
        // قراءة كتالوج الأدوات يمنع إضافة مواد التحرير إليها، ولا يمنع الأداة
        // نفسها من العمل. الأدوات الأخرى بلا محتوى محلي فتبقى على رسالة الخطأ.
        if (!active) return;
        if (slug === 'references' || slug === 'cases') setTools(FALLBACK_CATALOG);
        else setError('الأدوات غير متاحة حالياً. يرجى المحاولة لاحقاً؛ قد يكون إعداد قاعدة البيانات غير مكتمل.');
      }
      finally { if (active) setLoading(false); }
    }
    void load();
    // Refresh the public catalog when returning to the tab.
    const recheck = () => { if (document.visibilityState === 'visible') void load(false); };
    window.addEventListener('focus', recheck);
    const timer = window.setInterval(recheck, 60000);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', recheck); };
  }, [signedIn, retry, slug]);
  const tool = tools.find(t => t.slug === slug);
  return <main className="container-wide max-w-6xl py-10 space-y-8" dir="rtl">
    <AEOHead title={tool ? `${tool.title} — أدوات ميزان المجانية` : 'أدوات ميزان المجانية'} description="أدوات مجانية للبحث والتدريب القانوني بمحتوى موثق ومراجع." canonicalUrl={canonicalFor(`/pro-tools${lawSlug ? `/references/${lawSlug}` : slug ? `/${slug}` : ''}`)} noindex={Boolean(slug) && !lawSlug} />
    <header className="pt-hero space-y-4 pt-rise">
      <span className="pt-badge pt-badge--live w-fit"><BookOpenCheck className="size-4" /> مجانية للجميع</span>
      <div className="flex items-center gap-4">
        {tool && <ToolIcon slug={tool.slug} className="size-14" />}
        <h1 className="text-3xl font-black leading-tight">{tool?.title || 'أدواتك للبحث والتدريب القانوني'}</h1>
      </div>
      <p className="max-w-3xl leading-8 text-foreground/80">{tool?.description || 'من النص القانوني إلى التطبيق العملي. ست أدوات متخصصة، بمصادر واضحة وملاحظات خاصة بك.'}</p>
      {slug && <Link className="inline-flex items-center gap-2 font-bold text-primary underline-offset-4 hover:underline" to="/pro-tools"><ArrowRight className="size-4" aria-hidden /> جميع الأدوات</Link>}
    </header>
    {loading ? <p role="status">جارٍ تحميل الأدوات المجانية...</p> : error ? <div role="alert" className={cardClass}><p>{error}</p><button className={buttonClass} onClick={() => setRetry(n => n + 1)}>إعادة المحاولة</button></div> : slug ? (
      !tool ? <p>الأداة غير موجودة.</p> : !tool.enabled ? <p className={cardClass}>هذه الأداة قيد الإعداد، وستتاح مجاناً بعد تجهيز محتواها ومراجعته.</p> : tool.slug === 'references' ? <ReferencesView signedIn={signedIn} lawSlug={lawSlug} /> : <Content key={tool.slug} tool={tool} signedIn={signedIn} />
    ) : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {tools.map((item, index) => <ToolCatalogCard key={item.slug} tool={item} index={index} />)}
    </div>}
    <p className="text-base leading-7 text-foreground/80">أدوات مساعدة للتعلم والبحث، لا تغني عن النص الرسمي أو الاستشارة المهنية. التغطية تقتصر على المواد المنشورة والمراجعة.</p>
  </main>;
}
export default function ProToolsPage() {
  const { user, initialized } = useAuth();
  if (!initialized) return <p className="p-10" dir="rtl">جارٍ التحقق من الحساب...</p>;
  return <ToolsSession key={user?.id || 'guest'} signedIn={Boolean(user)} />;
}
