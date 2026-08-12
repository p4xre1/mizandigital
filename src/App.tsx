import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Landmark,
  LibraryBig,
  MapPin,
  Menu,
  Mic2,
  Moon,
  Newspaper,
  Scale,
  Search,
  Share2,
  Sun,
  X,
} from "lucide-react";
import articles from "@/data/articles.json";
import documents from "@/data/docs.json";
import events from "@/data/events.json";
import lexicon from "@/data/lexicon.json";
import schools from "@/data/schools.json";

type Article = (typeof articles)[number];
type Doc = (typeof documents)[number];
type Event = (typeof events)[number];
type School = (typeof schools)[number];
type Term = (typeof lexicon)[number];
type Theme = "light" | "dark";
type ContentFilter = "all" | "article" | "news";
type Page = "home" | "archive" | "news" | "article" | "events" | "event" | "schools" | "school" | "lexicon" | "term" | "not-found";

type Route = {
  page: Page;
  slug?: string;
  semester?: string;
  contentFilter?: ContentFilter;
};

const semesters = ["S1", "S2", "S3", "S4", "S5"] as const;
const allLabel = "الكل";

const categoryColors: Record<string, string> = {
  "قانون مدني": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "قانون تجاري": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "تنظيم قضائي": "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "قانون إداري": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "قانون عقاري": "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  "حقوق الإنسان": "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  "قانون الشغل": "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("ar-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function containsText(values: string[], query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");
  if (!normalizedQuery) return true;
  return values.some((value) => value.toLocaleLowerCase("ar").includes(normalizedQuery));
}

function contentPath(item: Article): string {
  return item.type === "news" ? `/news/${item.slug}` : `/articles/${item.slug}`;
}

function routeFromLocation(): Route {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const search = new URLSearchParams(window.location.search);
  const first = segments[0];
  const slug = segments[1];

  if (!first) return { page: "home" };
  if (first === "s4") return { page: "archive", semester: "S4" };
  if (first === "archive") return { page: "archive", semester: search.get("semester") ?? undefined };
  if (first === "news" && slug) return { page: "article", slug };
  if (first === "news") return { page: "news", contentFilter: "all" };
  if (first === "articles" && slug) return { page: "article", slug };
  if (first === "articles") return { page: "news", contentFilter: "article" };
  if (first === "events" && slug) return { page: "event", slug };
  if (first === "events") return { page: "events" };
  if (first === "schools" && slug) return { page: "school", slug };
  if (first === "schools") return { page: "schools" };
  if (first === "lexicon" && slug) return { page: "term", slug };
  if (first === "lexicon") return { page: "lexicon" };
  return { page: "not-found" };
}

function AppLink({
  to,
  children,
  className = "",
  onNavigate,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onNavigate: (to: string) => void;
}) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigate(to);
      }}
    >
      {children}
    </a>
  );
}

function Brand({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <AppLink to="/" onNavigate={onNavigate} className="flex shrink-0 items-center gap-3">
      <span className="brand-mark" aria-hidden="true"><Scale size={21} strokeWidth={2.2} /></span>
      <span>
        <span className="block text-base font-extrabold tracking-tight text-foreground">ميزان الرقمية</span>
        <span className="block text-[10px] font-semibold text-muted-foreground">المعرفة القانونية للطلبة</span>
      </span>
    </AppLink>
  );
}

function Header({
  route,
  theme,
  menuOpen,
  onNavigate,
  onToggleTheme,
  onToggleMenu,
}: {
  route: Route;
  theme: Theme;
  menuOpen: boolean;
  onNavigate: (to: string) => void;
  onToggleTheme: () => void;
  onToggleMenu: () => void;
}) {
  const linkClass = (active: boolean) =>
    `rounded-full px-3 py-2 text-[0.72rem] font-bold transition lg:px-4 lg:text-sm ${
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;
  const active = (...pages: Page[]) => pages.includes(route.page);

  return (
    <header className="site-header">
      <div className="container-wide flex min-h-[72px] items-center justify-between gap-4">
        <Brand onNavigate={onNavigate} />
        <nav
          className={`${menuOpen ? "flex" : "hidden"} absolute inset-x-4 top-[68px] z-20 flex-col gap-1 rounded-2xl border border-border bg-card p-3 shadow-xl md:static md:flex md:flex-row md:items-center md:gap-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
          aria-label="التنقل الرئيسي"
        >
          <AppLink to="/" onNavigate={onNavigate} className={linkClass(active("home"))}>الرئيسية</AppLink>
          <AppLink to="/archive" onNavigate={onNavigate} className={linkClass(active("archive"))}>المكتبة والملخصات</AppLink>
          <AppLink to="/news" onNavigate={onNavigate} className={linkClass(active("news", "article"))}>الأخبار</AppLink>
          <AppLink to="/lexicon" onNavigate={onNavigate} className={linkClass(active("lexicon", "term"))}>القاموس</AppLink>
          <AppLink to="/events" onNavigate={onNavigate} className={linkClass(active("events", "event"))}>الندوات</AppLink>
          <AppLink to="/schools" onNavigate={onNavigate} className={linkClass(active("schools", "school"))}>كليات الحقوق</AppLink>
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" className="icon-button" onClick={onToggleTheme} aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="icon-button md:hidden" onClick={onToggleMenu} aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <footer className="mt-20 border-t border-border bg-card/60">
      <div className="container-wide grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Brand onNavigate={onNavigate} />
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            منصة عربية مستقلة تجمع الأرشيف الدراسي والمقالات والأخبار والندوات ودليل كليات الحقوق بالمغرب للطالب القانوني.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold text-foreground">استكشف</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <AppLink to="/archive" onNavigate={onNavigate} className="hover:text-foreground">المكتبة والملخصات</AppLink>
            <AppLink to="/news" onNavigate={onNavigate} className="hover:text-foreground">الأخبار والمقالات</AppLink>
            <AppLink to="/events" onNavigate={onNavigate} className="hover:text-foreground">الندوات واللقاءات</AppLink>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold text-foreground">مراجع سريعة</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <AppLink to="/lexicon" onNavigate={onNavigate} className="hover:text-foreground">القاموس القانوني</AppLink>
            <AppLink to="/schools" onNavigate={onNavigate} className="hover:text-foreground">دليل كليات الحقوق</AppLink>
          </div>
        </div>
      </div>
      <div className="container-wide border-t border-border py-5 text-xs text-muted-foreground">© {new Date().getFullYear()} ميزان الرقمية — جميع الحقوق محفوظة.</div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>}
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="search-field">
      <Search size={19} aria-hidden="true" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label="البحث في المحتوى" />
      <kbd>Ctrl K</kbd>
    </label>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("انسخ الرابط التالي:", window.location.href);
    }
  };

  return <button type="button" className="secondary-button !min-h-10 !px-4" onClick={copy}>{copied ? <Check size={16} /> : <Share2 size={16} />}{copied ? "تم النسخ" : "نسخ الرابط"}</button>;
}

function DocumentCard({ doc }: { doc: Doc }) {
  return (
    <article className="document-card group">
      <div className="flex items-start justify-between gap-4">
        <div className="file-icon" aria-hidden="true"><FileText size={21} /></div>
        <span className="badge badge-gold">{doc.semester}</span>
      </div>
      <div className="mt-5">
        <p className="mb-2 text-xs font-bold text-primary">{doc.module}</p>
        <h3 className="text-base font-extrabold leading-7 text-foreground">{doc.title}</h3>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">{doc.professor}</p>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="badge badge-muted">{doc.systemTag}</span>
          <time dateTime={doc.updatedAt}>آخر تحديث: {formatDate(doc.updatedAt)}</time>
        </div>
        <a href={doc.fileUrl} download className="download-button" aria-label={`تحميل ${doc.title}`}><Download size={15} /><span>تحميل PDF</span></a>
      </div>
    </article>
  );
}

function ArticleCard({ item, onNavigate }: { item: Article; onNavigate: (to: string) => void }) {
  const isNews = item.type === "news";
  return (
    <article className="content-card">
      <div className="flex items-center justify-between gap-3">
        <span className="badge badge-muted">{isNews ? "خبر" : item.category}</span>
        <time className="text-[11px] text-muted-foreground" dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
      </div>
      <h3 className="mt-5 text-lg font-extrabold leading-8 text-foreground">{item.title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.excerpt}</p>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock3 size={14} />{item.readingTime}</span>
        <AppLink to={contentPath(item)} onNavigate={onNavigate} className="inline-flex items-center gap-1 font-extrabold text-primary hover:underline">{isNews ? "اقرأ الخبر" : "اقرأ المقال"}<ArrowLeft size={15} /></AppLink>
      </div>
    </article>
  );
}

function EventCard({ event, onNavigate }: { event: Event; onNavigate: (to: string) => void }) {
  return (
    <article className="content-card event-card">
      <div className="flex items-center justify-between gap-3">
        <span className="badge badge-gold">{event.status}</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><CalendarDays size={14} />{formatDate(event.eventDate)}</span>
      </div>
      <h3 className="mt-5 text-lg font-extrabold leading-8 text-foreground">{event.title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{event.excerpt}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Mic2 size={14} />{event.organizer}</span>
        <span className="inline-flex items-center gap-1"><MapPin size={14} />{event.city}</span>
      </div>
      <AppLink to={`/events/${event.slug}`} onNavigate={onNavigate} className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline">عرض بطاقة الندوة <ArrowLeft size={15} /></AppLink>
    </article>
  );
}

function SchoolCard({ school, onNavigate }: { school: School; onNavigate: (to: string) => void }) {
  return (
    <article className="content-card school-card">
      <div className="file-icon small" aria-hidden="true"><Landmark size={17} /></div>
      <h3 className="mt-5 text-lg font-extrabold leading-8 text-foreground">{school.name}</h3>
      <p className="mt-2 text-sm font-bold text-primary">{school.university}</p>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{school.synopsis}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={14} />{school.city}</div>
      <AppLink to={`/schools/${school.slug}`} onNavigate={onNavigate} className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline">صفحة الكلية <ArrowLeft size={15} /></AppLink>
    </article>
  );
}

function TermCard({ term, onNavigate }: { term: Term; onNavigate: (to: string) => void }) {
  return (
    <article className="lexicon-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">{term.term_ar}</h2>
          <p className="mt-1 text-sm font-semibold text-primary" dir="ltr">{term.term_fr}</p>
        </div>
        <span className={`badge ${categoryColors[term.category] ?? "badge-muted"}`}>{term.category}</span>
      </div>
      <p className="mt-5 border-t border-border pt-4 text-sm leading-8 text-muted-foreground">{term.definition}</p>
      <AppLink to={`/lexicon/${term.id}`} onNavigate={onNavigate} className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline">فتح صفحة المصطلح <ArrowLeft size={15} /></AppLink>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="empty-state"><BookOpen size={28} className="text-primary" /><p className="mt-3 font-bold text-foreground">{message}</p><p className="mt-1 text-xs text-muted-foreground">جرّب كلمة بحث مختلفة أو أزل أحد المرشحات.</p></div>;
}

function HomePage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [query, setQuery] = useState("");
  const filteredDocs = useMemo(() => documents.filter((doc) => containsText([doc.title, doc.module, doc.professor], query)), [query]);
  const latestContent = useMemo(() => [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3), []);

  return (
    <main>
      <section className="hero-section">
        <div className="container-wide grid items-center gap-10 py-14 md:grid-cols-[1.2fr_0.8fr] md:py-20">
          <div>
            <p className="eyebrow">منصة تعليمية مغربية • عربية بالكامل</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.25] tracking-tight text-foreground md:text-6xl">مرجعك القانوني،<br /><span className="text-primary">في متناولك.</span></h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">ملخصات ونماذج، مقالات وأخبار، قاموس قانوني، ندوات ودليل لكليات الحقوق بالمغرب. محتوى واضح ووصول مباشر بدون إعلانات.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <AppLink to="/archive" onNavigate={onNavigate} className="primary-button">استكشف الأرشيف <ArrowLeft size={17} /></AppLink>
              <AppLink to="/news" onNavigate={onNavigate} className="secondary-button">تابع الأخبار <Newspaper size={17} /></AppLink>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{documents.length}+</strong> ملف دراسي</span>
              <span><strong className="text-foreground">{lexicon.length}+</strong> مصطلح قانوني</span>
              <span><strong className="text-foreground">{schools.length}</strong> كليات موثقة</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-visual-glow" />
            <div className="hero-document-sheet">
              <div className="flex items-center justify-between border-b border-border pb-4"><span className="file-icon small"><LibraryBig size={17} /></span><span className="badge badge-gold">أرشيف قانوني</span></div>
              <div className="mt-8 space-y-3 opacity-70"><div className="h-2 w-2/5 rounded-full bg-primary/50" /><div className="h-3 w-4/5 rounded-full bg-foreground/10" /><div className="h-3 w-3/5 rounded-full bg-foreground/10" /><div className="mt-8 h-24 rounded-2xl bg-primary/10" /></div>
              <div className="mt-8 flex items-center gap-3 text-xs font-bold text-muted-foreground"><Check size={15} className="text-emerald-500" /> روابط ثابتة وقراءة مباشرة</div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-wide -mt-5 relative z-10">
        <div className="search-panel">
          <div className="mb-3 flex items-center justify-between gap-4"><div><p className="text-sm font-extrabold text-foreground">ابحث في المكتبة</p><p className="mt-1 text-xs text-muted-foreground">حسب الوحدة أو الأستاذ أو عنوان الملف</p></div><Search size={21} className="text-primary" /></div>
          <SearchField value={query} onChange={setQuery} placeholder="ابحث في الملخصات حسب الوحدة أو الأستاذ..." />
        </div>
      </section>

      <section className="container-wide py-16">
        <SectionHeading eyebrow="المسارات الدراسية" title="الأرشيف حسب السداسي" description="انتقل مباشرة إلى مواد السداسي الذي تدرسه، ثم صفِّ النتائج بحسب الوحدة أو الأستاذ." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {semesters.map((semester) => <AppLink key={semester} to={`/archive?semester=${semester}`} onNavigate={onNavigate} className={`semester-tile ${semester === "S4" ? "featured" : ""}`}><GraduationCap size={20} /><span>{semester}</span><small>{documents.filter((doc) => doc.semester === semester).length} ملفات</small></AppLink>)}
        </div>
      </section>

      <section className="container-wide pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4"><SectionHeading eyebrow="المكتبة الرقمية" title="أحدث الملخصات والنماذج" /><AppLink to="/archive" onNavigate={onNavigate} className="mb-7 inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline">كل الأرشيف <ArrowLeft size={15} /></AppLink></div>
        {filteredDocs.length > 0 ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filteredDocs.slice(0, 6).map((doc) => <DocumentCard key={doc.id} doc={doc} />)}</div> : <EmptyState message="لم نعثر على ملفات مطابقة" />}
      </section>

      <section className="container-wide pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4"><SectionHeading eyebrow="الأخبار والمقالات" title="آخر ما نُشر" description="محتوى قابل للقراءة والمشاركة عبر رابط مستقل لكل خبر أو مقال." /><AppLink to="/news" onNavigate={onNavigate} className="mb-7 inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline">كل الأخبار <ArrowLeft size={15} /></AppLink></div>
        <div className="grid gap-5 md:grid-cols-3">{latestContent.map((item) => <ArticleCard key={item.id} item={item} onNavigate={onNavigate} />)}</div>
      </section>

      <section className="container-wide pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4"><SectionHeading eyebrow="الندوات واللقاءات" title="أرشيف الأنشطة القانونية" description="بطاقات مرجعية تقود إلى مصدر النشاط الرسمي لدى المؤسسة المنظمة." /><AppLink to="/events" onNavigate={onNavigate} className="mb-7 inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline">كل الندوات <ArrowLeft size={15} /></AppLink></div>
        <div className="grid gap-5 md:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} onNavigate={onNavigate} />)}</div>
      </section>

      <section className="container-wide pb-20">
        <div className="feature-banner">
          <div><span className="badge badge-gold">دليل موثّق</span><h2 className="mt-4 text-2xl font-black text-white md:text-3xl">كليات الحقوق بالمغرب في مكان واحد</h2><p className="mt-2 max-w-xl text-sm leading-7 text-white/70">بطاقة مستقلة لكل كلية مع الجامعة والمدينة والرابط المؤسسي. راجع دائماً المصدر الرسمي للتسجيل والمواعيد والإعلانات.</p></div>
          <AppLink to="/schools" onNavigate={onNavigate} className="light-button">افتح دليل الكليات <ChevronLeft size={17} /></AppLink>
        </div>
      </section>
    </main>
  );
}

function ArchivePage({ initialSemester }: { initialSemester?: string }) {
  const [query, setQuery] = useState("");
  const [semester, setSemester] = useState(initialSemester && semesters.includes(initialSemester as (typeof semesters)[number]) ? initialSemester : allLabel);
  const [module, setModule] = useState(allLabel);
  const modules = useMemo(() => [allLabel, ...new Set(documents.map((doc) => doc.module))], []);

  useEffect(() => { setSemester(initialSemester && semesters.includes(initialSemester as (typeof semesters)[number]) ? initialSemester : allLabel); }, [initialSemester]);
  useEffect(() => { setModule(allLabel); }, [semester]);

  const filteredDocs = useMemo(() => documents.filter((doc) => (semester === allLabel || doc.semester === semester) && (module === allLabel || doc.module === module) && containsText([doc.title, doc.module, doc.professor], query)), [module, query, semester]);

  return (
    <main className="container-wide py-12 md:py-16">
      <div className="page-intro"><span className="badge badge-gold">المكتبة والملخصات</span><h1 className="mt-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">الأرشيف الدراسي</h1><p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">تصفح الملخصات ونماذج الامتحانات حسب السداسي والوحدة والأستاذ، مع تحميل مباشر للملفات المتاحة.</p></div>
      <div className="mt-9 search-panel"><SearchField value={query} onChange={setQuery} placeholder="ابحث داخل الأرشيف حسب العنوان أو الوحدة أو الأستاذ..." /></div>
      <section className="mt-10"><SectionHeading eyebrow="السداسيات" title="اختر السداسي" /><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSemester(allLabel)} className={`filter-chip ${semester === allLabel ? "active" : ""}`}>{semester === allLabel && <Check size={14} />}{allLabel}</button>{semesters.map((item) => <button type="button" key={item} onClick={() => setSemester(item)} className={`filter-chip ${semester === item ? "active" : ""}`}>{semester === item && <Check size={14} />}{item}</button>)}</div></section>
      <section className="mt-10"><SectionHeading eyebrow="الوحدات" title="صفِّ حسب الوحدة" /><div className="flex flex-wrap gap-2">{modules.map((item) => <button type="button" key={item} onClick={() => setModule(item)} className={`filter-chip ${module === item ? "active" : ""}`}>{module === item && <Check size={14} />}{item}</button>)}</div></section>
      <section className="mt-14"><div className="mb-6 flex items-end justify-between gap-4"><SectionHeading eyebrow="نتائج الأرشيف" title="الملخصات والنماذج" /><span className="mb-7 text-xs text-muted-foreground">{filteredDocs.length} ملفات</span></div>{filteredDocs.length > 0 ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filteredDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}</div> : <EmptyState message="لا توجد ملفات مطابقة لهذه المرشحات" />}</section>
    </main>
  );
}

function NewsPage({ initialFilter, onNavigate }: { initialFilter?: ContentFilter; onNavigate: (to: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ContentFilter>(initialFilter ?? "all");
  useEffect(() => { setFilter(initialFilter ?? "all"); }, [initialFilter]);
  const filtered = useMemo(() => [...articles].filter((item) => (filter === "all" || item.type === filter) && containsText([item.title, item.excerpt, item.category, ...item.body], query)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [filter, query]);
  const labels: Record<ContentFilter, string> = { all: "الكل", article: "المقالات", news: "الأخبار" };
  return (
    <main className="container-wide py-12 md:py-16">
      <div className="page-intro"><span className="badge badge-gold">محتوى قابل للقراءة والمشاركة</span><h1 className="mt-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">الأخبار والمقالات</h1><p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">متابعة تحديثات المنصة ومقالات منهجية تساعد طالب القانون في القراءة والتحليل والمراجعة.</p></div>
      <div className="mt-9 search-panel"><SearchField value={query} onChange={setQuery} placeholder="ابحث في الأخبار والمقالات..." /></div>
      <div className="mt-8 flex flex-wrap gap-2">{(Object.keys(labels) as ContentFilter[]).map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={`filter-chip ${filter === item ? "active" : ""}`}>{filter === item && <Check size={14} />}{labels[item]}</button>)}</div>
      <section className="mt-12">{filtered.length > 0 ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <ArticleCard key={item.id} item={item} onNavigate={onNavigate} />)}</div> : <EmptyState message="لم نعثر على خبر أو مقال مطابق" />}</section>
    </main>
  );
}

function LexiconPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(allLabel);
  const categories = useMemo(() => [allLabel, ...new Set(lexicon.map((term) => term.category))], []);
  const terms = useMemo(() => lexicon.filter((term) => (category === allLabel || term.category === category) && containsText([term.term_ar, term.term_fr, term.definition], query)), [category, query]);
  return (
    <main className="container-wide py-12 md:py-16">
      <div className="page-intro"><span className="badge badge-gold">مرجع المصطلحات</span><h1 className="mt-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">القاموس القانوني</h1><p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">مصطلحات قانونية بالعربية والفرنسية مع تعريفات موجزة وصفحة مستقلة قابلة للمشاركة لكل مصطلح.</p></div>
      <div className="mt-9 search-panel"><SearchField value={query} onChange={setQuery} placeholder="ابحث عن مصطلح بالعربية أو الفرنسية..." /></div>
      <div className="mt-8 flex flex-wrap gap-2">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={`filter-chip ${category === item ? "active" : ""}`}>{category === item && <Check size={14} />}{item}</button>)}</div>
      <section className="mt-10"><div className="mb-5 flex items-center justify-between gap-4"><p className="text-sm font-bold text-muted-foreground">{terms.length} مصطلحاً</p><LibraryBig size={21} className="text-primary" /></div>{terms.length > 0 ? <div className="grid gap-4 md:grid-cols-2">{terms.map((term) => <TermCard key={term.id} term={term} onNavigate={onNavigate} />)}</div> : <EmptyState message="لم نعثر على هذا المصطلح" />}</section>
    </main>
  );
}

function EventsPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => events.filter((event) => containsText([event.title, event.excerpt, event.organizer, event.city, ...event.topics], query)).sort((a, b) => b.eventDate.localeCompare(a.eventDate)), [query]);
  return (
    <main className="container-wide py-12 md:py-16">
      <div className="page-intro"><span className="badge badge-gold">أنشطة أكاديمية</span><h1 className="mt-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">الندوات واللقاءات</h1><p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">أرشيف موجز للندوات والفعاليات القانونية مع رابط المصدر الرسمي لكل نشاط.</p></div>
      <div className="mt-9 search-panel"><SearchField value={query} onChange={setQuery} placeholder="ابحث في عنوان الندوة أو المدينة أو الموضوع..." /></div>
      <section className="mt-12">{items.length > 0 ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((event) => <EventCard key={event.id} event={event} onNavigate={onNavigate} />)}</div> : <EmptyState message="لم نعثر على ندوة مطابقة" />}</section>
    </main>
  );
}

function SchoolsPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(allLabel);
  const cities = useMemo(() => [allLabel, ...new Set(schools.map((school) => school.city))], []);
  const items = useMemo(() => schools.filter((school) => (city === allLabel || school.city === city) && containsText([school.name, school.university, school.city, school.synopsis, ...school.studyAreas], query)), [city, query]);
  return (
    <main className="container-wide py-12 md:py-16">
      <div className="page-intro"><span className="badge badge-gold">دليل المؤسسات</span><h1 className="mt-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">كليات الحقوق بالمغرب</h1><p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">دليل أولي لكليات العلوم القانونية والاقتصادية والاجتماعية، بروابط إلى مصادرها الرسمية. تحقق دائماً من موقع المؤسسة قبل اتخاذ أي إجراء إداري.</p></div>
      <div className="mt-9 search-panel"><SearchField value={query} onChange={setQuery} placeholder="ابحث باسم الكلية أو الجامعة أو المدينة..." /></div>
      <div className="mt-8 flex flex-wrap gap-2">{cities.map((item) => <button type="button" key={item} onClick={() => setCity(item)} className={`filter-chip ${city === item ? "active" : ""}`}>{city === item && <Check size={14} />}{item}</button>)}</div>
      <section className="mt-12">{items.length > 0 ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((school) => <SchoolCard key={school.id} school={school} onNavigate={onNavigate} />)}</div> : <EmptyState message="لم نعثر على كلية مطابقة" />}</section>
    </main>
  );
}

function BackLink({ to, label, onNavigate }: { to: string; label: string; onNavigate: (to: string) => void }) {
  return <AppLink to={to} onNavigate={onNavigate} className="mb-7 inline-flex items-center gap-1 text-sm font-extrabold text-primary hover:underline"><ChevronLeft size={18} />{label}</AppLink>;
}

function ArticlePage({ slug, onNavigate }: { slug?: string; onNavigate: (to: string) => void }) {
  const item = articles.find((article) => article.slug === slug);
  if (!item) return <NotFound onNavigate={onNavigate} />;
  const backTo = item.type === "news" ? "/news" : "/articles";
  return (
    <main className="container-reading py-12 md:py-16"><BackLink to={backTo} label={item.type === "news" ? "العودة إلى الأخبار" : "العودة إلى المقالات"} onNavigate={onNavigate} /><article className="reading-card"><header><div className="flex flex-wrap items-center justify-between gap-3"><span className="badge badge-gold">{item.type === "news" ? "خبر" : item.category}</span><time className="text-xs text-muted-foreground" dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time></div><h1 className="mt-6 text-3xl font-black leading-[1.35] tracking-tight text-foreground md:text-5xl">{item.title}</h1><p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">{item.excerpt}</p><div className="mt-6 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={15} />{item.readingTime}</span><CopyLinkButton /></div></header><div className="prose-law mt-10 border-t border-border pt-8">{item.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><aside className="reading-aside mt-10"><h2>خلاصة سريعة</h2><ul>{item.highlights.map((highlight) => <li key={highlight}><Check size={16} />{highlight}</li>)}</ul></aside></article></main>
  );
}

function EventPage({ slug, onNavigate }: { slug?: string; onNavigate: (to: string) => void }) {
  const event = events.find((item) => item.slug === slug);
  if (!event) return <NotFound onNavigate={onNavigate} />;
  return (
    <main className="container-reading py-12 md:py-16"><BackLink to="/events" label="العودة إلى الندوات" onNavigate={onNavigate} /><article className="reading-card"><header><div className="flex flex-wrap items-center justify-between gap-3"><span className="badge badge-gold">{event.status}</span><time className="text-xs text-muted-foreground" dateTime={event.eventDate}>{formatDate(event.eventDate)}</time></div><h1 className="mt-6 text-3xl font-black leading-[1.35] tracking-tight text-foreground md:text-5xl">{event.title}</h1><p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">{event.excerpt}</p><div className="mt-6 flex flex-wrap gap-3"><span className="detail-chip"><Mic2 size={15} />{event.organizer}</span><span className="detail-chip"><MapPin size={15} />{event.city}</span><CopyLinkButton /></div></header><div className="prose-law mt-10 border-t border-border pt-8">{event.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><div className="mt-10 border-t border-border pt-7"><p className="mb-3 text-sm font-extrabold text-foreground">موضوعات الندوة</p><div className="flex flex-wrap gap-2">{event.topics.map((topic) => <span key={topic} className="badge badge-muted">{topic}</span>)}</div><a href={event.sourceUrl} target="_blank" rel="noreferrer" className="primary-button mt-7">{event.sourceLabel}<ExternalLink size={16} /></a></div></article></main>
  );
}

function SchoolPage({ slug, onNavigate }: { slug?: string; onNavigate: (to: string) => void }) {
  const school = schools.find((item) => item.slug === slug);
  if (!school) return <NotFound onNavigate={onNavigate} />;
  return (
    <main className="container-reading py-12 md:py-16"><BackLink to="/schools" label="العودة إلى دليل الكليات" onNavigate={onNavigate} /><article className="reading-card"><header><span className="badge badge-gold">دليل كليات الحقوق</span><h1 className="mt-6 text-3xl font-black leading-[1.35] tracking-tight text-foreground md:text-5xl">{school.name}</h1><p className="mt-4 text-lg font-extrabold text-primary">{school.university}</p><p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">{school.synopsis}</p><div className="mt-6 flex flex-wrap gap-3"><span className="detail-chip"><MapPin size={15} />{school.city}</span><span className="detail-chip"><Building2 size={15} />تم التحقق: {formatDate(school.verifiedAt)}</span><CopyLinkButton /></div></header><div className="prose-law mt-10 border-t border-border pt-8">{school.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><div className="mt-10 border-t border-border pt-7"><p className="mb-3 text-sm font-extrabold text-foreground">مجالات عامة</p><div className="flex flex-wrap gap-2">{school.studyAreas.map((area) => <span key={area} className="badge badge-muted">{area}</span>)}</div><a href={school.officialUrl} target="_blank" rel="noreferrer" className="primary-button mt-7">زيارة الموقع الرسمي <ExternalLink size={16} /></a></div></article></main>
  );
}

function TermPage({ slug, onNavigate }: { slug?: string; onNavigate: (to: string) => void }) {
  const term = lexicon.find((item) => item.id === slug);
  if (!term) return <NotFound onNavigate={onNavigate} />;
  return (
    <main className="container-reading py-12 md:py-16"><BackLink to="/lexicon" label="العودة إلى القاموس" onNavigate={onNavigate} /><article className="reading-card"><header><span className={`badge ${categoryColors[term.category] ?? "badge-muted"}`}>{term.category}</span><h1 className="mt-6 text-4xl font-black tracking-tight text-foreground md:text-6xl">{term.term_ar}</h1><p className="mt-3 text-xl font-bold text-primary" dir="ltr">{term.term_fr}</p><div className="mt-6"><CopyLinkButton /></div></header><div className="term-definition mt-10 border-t border-border pt-8"><p className="text-sm font-extrabold text-muted-foreground">التعريف</p><p className="mt-4 font-serif text-2xl leading-[2] text-foreground md:text-3xl">{term.definition}</p></div></article></main>
  );
}

function NotFound({ onNavigate }: { onNavigate: (to: string) => void }) {
  return <main className="container-wide py-20"><EmptyState message="هذه الصفحة غير متاحة" /><div className="mt-6 text-center"><AppLink to="/" onNavigate={onNavigate} className="primary-button">العودة إلى الرئيسية <ArrowLeft size={17} /></AppLink></div></main>;
}

function pageMetadata(route: Route) {
  const currentArticle = route.page === "article" ? articles.find((item) => item.slug === route.slug) : undefined;
  const currentEvent = route.page === "event" ? events.find((item) => item.slug === route.slug) : undefined;
  const currentSchool = route.page === "school" ? schools.find((item) => item.slug === route.slug) : undefined;
  const currentTerm = route.page === "term" ? lexicon.find((item) => item.id === route.slug) : undefined;
  if (currentArticle) return { title: currentArticle.title, description: currentArticle.excerpt };
  if (currentEvent) return { title: currentEvent.title, description: currentEvent.excerpt };
  if (currentSchool) return { title: currentSchool.name, description: currentSchool.synopsis };
  if (currentTerm) return { title: `${currentTerm.term_ar} | القاموس القانوني`, description: currentTerm.definition };
  const metadata: Partial<Record<Page, { title: string; description: string }>> = {
    home: { title: "ميزان الرقمية | المعرفة القانونية للطلبة", description: "منصة عربية سريعة للملخصات والأخبار والندوات والقاموس ودليل كليات الحقوق بالمغرب." },
    archive: { title: "الأرشيف الدراسي | ميزان الرقمية", description: "ملخصات ونماذج لطلبة الحقوق مصنفة حسب السداسي والوحدة." },
    news: { title: "الأخبار والمقالات | ميزان الرقمية", description: "أخبار المنصة ومقالات قانونية ومنهجية للطلبة." },
    events: { title: "الندوات واللقاءات | ميزان الرقمية", description: "أرشيف للندوات والأنشطة القانونية مع روابط مصادرها الرسمية." },
    schools: { title: "كليات الحقوق بالمغرب | ميزان الرقمية", description: "دليل كليات العلوم القانونية والاقتصادية والاجتماعية وروابطها الرسمية." },
    lexicon: { title: "القاموس القانوني | ميزان الرقمية", description: "مصطلحات قانونية بالعربية والفرنسية مع تعريفات موجزة." },
  };
  return metadata[route.page] ?? { title: "ميزان الرقمية", description: "المعرفة القانونية للطلبة." };
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => routeFromLocation());
  const [theme, setTheme] = useState<Theme>(() => window.localStorage.getItem("mizan-theme") === "light" ? "light" : "dark");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (window.location.pathname === "/s4") {
      window.history.replaceState({}, "", "/archive?semester=S4");
      setRoute(routeFromLocation());
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("mizan-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const metadata = pageMetadata(route);
    document.title = metadata.title;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", metadata.description);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    canonical?.setAttribute("href", `https://www.mizan.page${window.location.pathname === "/" ? "/" : window.location.pathname}`);
  }, [route]);

  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    setRoute(routeFromLocation());
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  let page: ReactNode;
  if (route.page === "home") page = <HomePage onNavigate={navigate} />;
  else if (route.page === "archive") page = <ArchivePage initialSemester={route.semester} />;
  else if (route.page === "news") page = <NewsPage initialFilter={route.contentFilter} onNavigate={navigate} />;
  else if (route.page === "article") page = <ArticlePage slug={route.slug} onNavigate={navigate} />;
  else if (route.page === "events") page = <EventsPage onNavigate={navigate} />;
  else if (route.page === "event") page = <EventPage slug={route.slug} onNavigate={navigate} />;
  else if (route.page === "schools") page = <SchoolsPage onNavigate={navigate} />;
  else if (route.page === "school") page = <SchoolPage slug={route.slug} onNavigate={navigate} />;
  else if (route.page === "lexicon") page = <LexiconPage onNavigate={navigate} />;
  else if (route.page === "term") page = <TermPage slug={route.slug} onNavigate={navigate} />;
  else page = <NotFound onNavigate={navigate} />;

  return <div className="min-h-screen bg-background text-foreground"><Header route={route} theme={theme} menuOpen={menuOpen} onNavigate={navigate} onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")} onToggleMenu={() => setMenuOpen((open) => !open)} />{page}<Footer onNavigate={navigate} /></div>;
}
