import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Check,
  ChevronLeft,
  Download,
  FileText,
  GraduationCap,
  LibraryBig,
  Menu,
  Moon,
  Search,
  Scale,
  Sun,
  X,
} from "lucide-react";
import documents from "@/data/docs.json";
import lexicon from "@/data/lexicon.json";

type Doc = (typeof documents)[number];
type Term = (typeof lexicon)[number];
type Page = "home" | "s4" | "lexicon";
type Theme = "light" | "dark";

const semesters = ["S1", "S2", "S3", "S4", "S5"] as const;
const s4Modules = [
  "قانون الشركات",
  "التنظيم القضائي",
  "حقوق الإنسان",
  "القانون العقاري",
  "القانون الإداري",
  "المسطرة المدنية",
  "قانون الشغل",
  "القانون الجنائي",
] as const;

const categoryColors: Record<string, string> = {
  "قانون مدني": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "قانون تجاري": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "تنظيم قضائي": "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "قانون إداري": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "قانون عقاري": "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  "حقوق الإنسان": "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  "قانون الشغل": "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
};

function pageFromPath(pathname: string): Page {
  if (pathname.startsWith("/s4")) return "s4";
  if (pathname.startsWith("/lexicon")) return "lexicon";
  return "home";
}

function containsText(values: string[], query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");
  if (!normalizedQuery) return true;
  return values.some((value) =>
    value.toLocaleLowerCase("ar").includes(normalizedQuery)
  );
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("ar-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
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
    <AppLink to="/" onNavigate={onNavigate} className="flex items-center gap-3">
      <span className="brand-mark" aria-hidden="true">
        <Scale size={21} strokeWidth={2.2} />
      </span>
      <span>
        <span className="block text-base font-extrabold tracking-tight text-foreground">
          ميزان الرقمية
        </span>
        <span className="block text-[10px] font-semibold text-muted-foreground">
          المعرفة القانونية للطلبة
        </span>
      </span>
    </AppLink>
  );
}

function Header({
  page,
  theme,
  menuOpen,
  onNavigate,
  onToggleTheme,
  onToggleMenu,
}: {
  page: Page;
  theme: Theme;
  menuOpen: boolean;
  onNavigate: (to: string) => void;
  onToggleTheme: () => void;
  onToggleMenu: () => void;
}) {
  const linkClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-bold transition ${
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  return (
    <header className="site-header">
      <div className="container-wide flex min-h-[72px] items-center justify-between gap-4">
        <Brand onNavigate={onNavigate} />

        <nav
          className={`${menuOpen ? "flex" : "hidden"} absolute inset-x-4 top-[68px] z-20 flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-xl md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
          aria-label="التنقل الرئيسي"
        >
          <AppLink to="/" onNavigate={onNavigate} className={linkClass(page === "home")}>
            الرئيسية
          </AppLink>
          <AppLink to="/s4" onNavigate={onNavigate} className={linkClass(page === "s4")}>
            مركز S4
          </AppLink>
          <AppLink
            to="/lexicon"
            onNavigate={onNavigate}
            className={linkClass(page === "lexicon")}
          >
            القاموس القانوني
          </AppLink>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="icon-button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className="icon-button md:hidden"
            onClick={onToggleMenu}
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          >
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
      <div className="container-wide grid gap-8 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Brand onNavigate={onNavigate} />
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            مكتبة تعليمية عربية تساعد طلبة القانون بالمغرب على الوصول إلى الملخصات، النماذج، والمصطلحات القانونية بسرعة ووضوح.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold text-foreground">استكشف</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <AppLink to="/" onNavigate={onNavigate} className="hover:text-foreground">الرئيسية</AppLink>
            <AppLink to="/s4" onNavigate={onNavigate} className="hover:text-foreground">مركز S4</AppLink>
            <AppLink to="/lexicon" onNavigate={onNavigate} className="hover:text-foreground">القاموس القانوني</AppLink>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold text-foreground">ميزان الرقمية</p>
          <p className="text-sm leading-7 text-muted-foreground">
            محتوى أكاديمي تعليمي موجه لطلبة كليات الحقوق والعلوم القانونية.
          </p>
        </div>
      </div>
      <div className="container-wide border-t border-border py-5 text-xs text-muted-foreground">
        © {new Date().getFullYear()} ميزان الرقمية — جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>}
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder = "ابحث في الملخصات حسب الوحدة أو الأستاذ...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={19} aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="البحث في المحتوى"
      />
      <kbd>Ctrl K</kbd>
    </label>
  );
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
        <a
          href={doc.fileUrl}
          download
          className="download-button"
          aria-label={`تحميل ${doc.title}`}
        >
          <Download size={15} />
          <span>تحميل PDF</span>
        </a>
      </div>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <BookOpen size={28} className="text-primary" />
      <p className="mt-3 font-bold text-foreground">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">جرّب كلمة بحث مختلفة أو اختر تصنيفًا آخر.</p>
    </div>
  );
}

function HomePage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [query, setQuery] = useState("");
  const [semester, setSemester] = useState<(typeof semesters)[number] | "all">("all");
  const filteredDocs = useMemo(
    () =>
      documents.filter((doc) =>
        (semester === "all" || doc.semester === semester) &&
        containsText([doc.title, doc.module, doc.professor], query)
      ),
    [query, semester]
  );

  return (
    <main>
      <section className="hero-section">
        <div className="container-wide grid items-center gap-10 py-14 md:grid-cols-[1.2fr_0.8fr] md:py-20">
          <div>
            <p className="eyebrow">منصة تعليمية مغربية • عربية بالكامل</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.25] tracking-tight text-foreground md:text-6xl">
              مرجعك القانوني،<br /><span className="text-primary">في متناولك.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              ملخصات، نماذج امتحانات، وقاموس قانوني لطلبة كليات الحقوق بالمغرب. محتوى واضح، وصول مباشر، وبدون إعلانات.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <AppLink to="/s4" onNavigate={onNavigate} className="primary-button">
                ابدأ من مركز S4 <ArrowLeft size={17} />
              </AppLink>
              <AppLink to="/lexicon" onNavigate={onNavigate} className="secondary-button">
                تصفح القاموس <BookMarked size={17} />
              </AppLink>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{documents.length}+</strong> ملف دراسي</span>
              <span><strong className="text-foreground">{lexicon.length}+</strong> مصطلح قانوني</span>
              <span><strong className="text-foreground">100%</strong> وصول مباشر</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-visual-glow" />
            <div className="hero-document-sheet">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="file-icon small"><Scale size={17} /></span>
                <span className="badge badge-gold">S4 المميز</span>
              </div>
              <div className="mt-8 space-y-3 opacity-70">
                <div className="h-2 w-2/5 rounded-full bg-primary/50" />
                <div className="h-3 w-4/5 rounded-full bg-foreground/10" />
                <div className="h-3 w-3/5 rounded-full bg-foreground/10" />
                <div className="mt-8 h-24 rounded-2xl bg-primary/10" />
              </div>
              <div className="mt-8 flex items-center gap-3 text-xs font-bold text-muted-foreground">
                <Check size={15} className="text-emerald-500" /> ملفات ثابتة وسريعة
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-wide -mt-5 relative z-10">
        <div className="search-panel">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-foreground">ابحث في المكتبة</p>
              <p className="mt-1 text-xs text-muted-foreground">حسب الوحدة، الأستاذ، أو عنوان الملف</p>
            </div>
            <Search size={21} className="text-primary" />
          </div>
          <SearchField value={query} onChange={setQuery} />
        </div>
      </section>

      <section className="container-wide py-16">
        <SectionHeading
          eyebrow="المسارات الدراسية"
          title="اختر السداسي"
          description="ابدأ من المستوى الذي تدرسه، أو انتقل مباشرة إلى مركز S4 المميز."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {semesters.map((item) => {
            const active = semester === item;
            return item === "S4" ? (
              <AppLink
                key={item}
                to="/s4"
                onNavigate={onNavigate}
                className={`semester-tile featured ${active ? "active" : ""}`}
              >
                <GraduationCap size={21} />
                <span>{item}</span>
                <small>مميز</small>
              </AppLink>
            ) : (
              <button
                key={item}
                type="button"
                className={`semester-tile ${active ? "active" : ""}`}
                onClick={() => setSemester(active ? "all" : item)}
              >
                <BookOpen size={20} />
                <span>{item}</span>
                <small>{documents.filter((doc) => doc.semester === item).length} ملفات</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="container-wide pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="المكتبة الرقمية" title="أحدث الملخصات والنماذج" />
          <span className="mb-7 text-xs text-muted-foreground">{filteredDocs.length} نتيجة</span>
        </div>
        {filteredDocs.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.slice(0, 6).map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
        ) : <EmptyState message="لم نعثر على ملفات مطابقة" />}
      </section>

      <section className="container-wide pb-20">
        <div className="feature-banner">
          <div>
            <span className="badge badge-gold">المسار المميز</span>
            <h2 className="mt-4 text-2xl font-black text-white md:text-3xl">كل ما تحتاجه في S4</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-white/70">
              صفحة مركزة تجمع وحدات السداسي الرابع وملفاتها في مكان واحد، مع تحميل مباشر دون تحويلات أو نوافذ مزعجة.
            </p>
          </div>
          <AppLink to="/s4" onNavigate={onNavigate} className="light-button">استكشف مركز S4 <ChevronLeft size={17} /></AppLink>
        </div>
      </section>
    </main>
  );
}

function S4Page() {
  const [query, setQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("الكل");
  const s4Docs = useMemo(
    () =>
      documents.filter((doc) =>
        doc.semester === "S4" &&
        (selectedModule === "الكل" || doc.module === selectedModule) &&
        containsText([doc.title, doc.module, doc.professor], query)
      ),
    [query, selectedModule]
  );

  return (
    <main className="container-wide py-12 md:py-16">
      <div className="page-intro">
        <span className="badge badge-gold">السداسي الرابع</span>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">مركز S4</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
          مساحة دراسية مرتبة لطلبة السداسي الرابع: وحدات أساسية، ملخصات مركزة، ونماذج امتحانات قابلة للتحميل مباشرة.
        </p>
      </div>

      <div className="mt-9 search-panel">
        <SearchField value={query} onChange={setQuery} placeholder="ابحث داخل ملفات S4..." />
      </div>

      <section className="mt-12">
        <SectionHeading eyebrow="الوحدات الدراسية" title="تصفح حسب الوحدة" />
        <div className="flex flex-wrap gap-2">
          {["الكل", ...s4Modules].map((module) => (
            <button
              type="button"
              key={module}
              onClick={() => setSelectedModule(module)}
              className={`filter-chip ${selectedModule === module ? "active" : ""}`}
            >
              {selectedModule === module && <Check size={14} />}
              {module}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionHeading eyebrow="ملفات S4" title="الملخصات والنماذج" />
          <span className="mb-7 text-xs text-muted-foreground">{s4Docs.length} ملفات</span>
        </div>
        {s4Docs.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {s4Docs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
        ) : <EmptyState message="لا توجد ملفات لهذه الوحدة بعد" />}
      </section>
    </main>
  );
}

function LexiconPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const categories = useMemo(() => ["الكل", ...new Set(lexicon.map((term) => term.category))], []);
  const terms = useMemo(
    () =>
      lexicon.filter((term) =>
        (category === "الكل" || term.category === category) &&
        containsText([term.term_ar, term.term_fr, term.definition], query)
      ),
    [category, query]
  );

  return (
    <main className="container-wide py-12 md:py-16">
      <div className="page-intro">
        <span className="badge badge-gold">مرجع المصطلحات</span>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">القاموس القانوني</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
          مصطلحات قانونية بالعربية والفرنسية مع تعريفات مختصرة تساعدك على مراجعة المفاهيم بسرعة.
        </p>
      </div>

      <div className="mt-9 search-panel">
        <SearchField value={query} onChange={setQuery} placeholder="ابحث عن مصطلح بالعربية أو الفرنسية..." />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setCategory(item)}
            className={`filter-chip ${category === item ? "active" : ""}`}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-muted-foreground">{terms.length} مصطلحًا</p>
          <LibraryBig size={21} className="text-primary" />
        </div>
        {terms.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {terms.map((term: Term) => (
              <article key={term.id} className="lexicon-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-foreground">{term.term_ar}</h2>
                    <p className="mt-1 text-sm font-semibold text-primary" dir="ltr">{term.term_fr}</p>
                  </div>
                  <span className={`badge ${categoryColors[term.category] ?? "badge-muted"}`}>{term.category}</span>
                </div>
                <p className="mt-5 border-t border-border pt-4 text-sm leading-8 text-muted-foreground">{term.definition}</p>
              </article>
            ))}
          </div>
        ) : <EmptyState message="لم نعثر على هذا المصطلح" />}
      </section>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem("mizan-theme");
    return savedTheme === "light" ? "light" : "dark";
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("mizan-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handlePopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    setPage(pageFromPath(to));
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        page={page}
        theme={theme}
        menuOpen={menuOpen}
        onNavigate={navigate}
        onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        onToggleMenu={() => setMenuOpen((open) => !open)}
      />
      {page === "home" && <HomePage onNavigate={navigate} />}
      {page === "s4" && <S4Page />}
      {page === "lexicon" && <LexiconPage />}
      <Footer onNavigate={navigate} />
    </div>
  );
}
