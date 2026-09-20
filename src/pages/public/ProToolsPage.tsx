import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LockKeyhole, ArrowLeft, BookOpenCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AEOHead } from '@/components/seo/AEOHead';
import { canonicalFor } from '@/lib/canonical';
import { EntryView, Workspace, buttonClass, cardClass, inputClass } from '@/components/pro-tools/ToolViews';
import { toolsService } from '@/lib/pro-tools/service';
import type { Entry, Tool } from '@/lib/pro-tools/model';

function Content({ tool }: { tool: Tool }) {
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
    Promise.all([toolsService.entries(tool.slug), tool.slug === 'alerts' ? toolsService.follows() : Promise.resolve([])])
      .then(([data, follows]) => { if (active) { setEntries(data.filter(e => e.published)); setTopics(follows.map(f => f.topic)); } })
      .catch(() => { if (active) setError('تعذر تحميل المحتوى. تحقق من اتصالك واشتراكك ثم أعد فتح الأداة.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tool.slug]);
  if (tool.slug === 'workspace') return <Workspace />;
  if (loading) return <p role="status">جارٍ تحميل المحتوى المحمي...</p>;
  const visible = entries.filter(e => `${e.title} ${e.topic} ${Object.values(e.payload).join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (!followedOnly || topics.includes(e.topic)));
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
    <label className="block">بحث في العنوان أو الموضوع أو النص<input className={inputClass} value={query} onChange={e => setQuery(e.target.value)} type="search" /></label>
    <p className="text-sm text-muted-foreground">{visible.length} نتيجة</p>
    {!visible.length && !error && <p className={cardClass}>لا توجد مواد منشورة مطابقة حالياً. لن تعرض المنصة نصوصاً أو قواعد غير مراجعة.</p>}
    {visible.map(entry => <EntryView key={`${entry.id}:${entry.updated_at}`} entry={entry} />)}
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
