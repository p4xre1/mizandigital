import { Suspense, lazy, useEffect, useState } from "react"
import { Routes, Route, Navigate, useParams, useSearchParams, useNavigate } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"

const PublicLayout = lazy(() => import("@/layouts/PublicLayout"))
const AdminLayout = lazy(() => import("@/components/layout/AdminLayout"))
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"))

const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage"))
const AnalyticsPage = lazy(() => import("@/pages/admin/AnalyticsPage"))
const AdminArticlesPage = lazy(() => import("@/pages/admin/articles/ArticlesPage"))
const ArticleEditorPage = lazy(() => import("@/pages/admin/articles/ArticleEditorPage"))
const FacultiesPage = lazy(() => import("@/pages/admin/faculties/FacultiesPage"))
const LexiconPageAdmin = lazy(() => import("@/pages/admin/lexicon/LexiconPage"))
const LibraryPage = lazy(() => import("@/pages/admin/library/LibraryPage"))
const SeminarsPage = lazy(() => import("@/pages/admin/seminars/SeminarsPage"))
const NewsManagementPage = lazy(() => import("@/pages/admin/NewsManagementPage"))
const CommentsPage = lazy(() => import("@/pages/admin/CommentsPage"))
const LawsPage = lazy(() => import("@/pages/admin/LawsPage"))
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"))

const HomePage = lazy(() => import("@/pages/public/HomePage").then((m) => ({ default: m.HomePage })))
const SearchPage = lazy(() => import("@/pages/public/SearchPage").then((m) => ({ default: m.SearchPage })))
const ArchivePage = lazy(() => import("@/pages/public/ArchivePage").then((m) => ({ default: m.ArchivePage })))
const DownloadGatePage = lazy(() =>
  import("@/pages/public/DownloadGatePage").then((m) => ({ default: m.DownloadGatePage }))
)
const PdfDownloadPage = lazy(() =>
  import("@/pages/public/PdfDownloadPage").then((m) => ({ default: m.PdfDownloadPage }))
)
const NewsPage = lazy(() => import("@/pages/public/NewsPage").then((m) => ({ default: m.NewsPage })))
const ArticlesPage = lazy(() => import("@/pages/public/ArticlesPage").then((m) => ({ default: m.ArticlesPage })))
const ArticlePage = lazy(() => import("@/pages/public/ArticlePage").then((m) => ({ default: m.ArticlePage })))
const EventPage = lazy(() => import("@/pages/public/EventPage").then((m) => ({ default: m.EventPage })))
const EventsPage = lazy(() => import("@/pages/public/EventsPage").then((m) => ({ default: m.EventsPage })))
const SchoolsPage = lazy(() => import("@/pages/public/SchoolsPage").then((m) => ({ default: m.SchoolsPage })))
const SchoolPage = lazy(() => import("@/pages/public/SchoolPage").then((m) => ({ default: m.SchoolPage })))
const LexiconPage = lazy(() => import("@/pages/public/LexiconPage").then((m) => ({ default: m.LexiconPage })))
const TermPage = lazy(() => import("@/pages/public/TermPage").then((m) => ({ default: m.TermPage })))
const AboutPage = lazy(() => import("@/pages/public/AboutPage").then((m) => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import("@/pages/public/ContactPage").then((m) => ({ default: m.ContactPage })))
const FAQPage = lazy(() => import("@/pages/public/FAQPage").then((m) => ({ default: m.FAQPage })))
const PrivacyPolicyPage = lazy(() =>
  import("@/pages/public/PrivacyPolicyPage").then((m) => ({ default: m.PrivacyPolicyPage }))
)
const CookiePolicyPage = lazy(() =>
  import("@/pages/public/CookiePolicyPage").then((m) => ({ default: m.CookiePolicyPage }))
)
const TermsPage = lazy(() => import("@/pages/public/TermsPage").then((m) => ({ default: m.TermsPage })))
const NotFound = lazy(() => import("@/pages/public/NotFound").then((m) => ({ default: m.NotFound })))

function ArticleWrapper() { const { slug } = useParams<{ slug: string }>(); return <ArticlePage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function EventWrapper() { const { slug } = useParams<{ slug: string }>(); return <EventPage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function SchoolWrapper() { const { slug } = useParams<{ slug: string }>(); return <SchoolPage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function TermWrapper() { const { slug } = useParams<{ slug: string }>(); return <TermPage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function ArchiveWrapper() { const [searchParams] = useSearchParams(); return <ArchivePage initialSemester={searchParams.get("semester") ?? undefined} /> }

// ملاحظة إصلاح خلل: كان مسار "articles/edit/:id" يُمرّر ArticleEditorPage مباشرة
// بلا قراءة :id عبر useParams (خلافاً لبقية أغلفة المسارات أعلاه)، فيبقى
// currentArticleId داخل الصفحة دائماً undefined ولا يتم تحميل المقال المطلوب
// تعديله أبداً — زر "تعديل" يفتح نموذج "مقال جديد" فارغاً بدل تحميل المقال
// الفعلي. هاد الغلاف يقرأ :id من الرابط ويمرره كـ prop، ويربط onBack/onNavigate
// بـ useNavigate الحقيقي بدل الاعتماد على props اختيارية تبقى undefined هنا.
function ArticleEditorWrapper() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  return (
    <ArticleEditorPage
      articleId={id}
      onBack={() => navigate("/admin/articles")}
      onNavigate={(path) => navigate(path)}
    />
  )
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { if (mounted) { setAllowed(false); setChecking(false) }; return }
      const { data: profile, error } = await supabase.from("profiles").select("admin_god_mode").eq("id", data.user.id).maybeSingle()
      if (mounted) { setAllowed(!error && profile?.admin_god_mode === true); setChecking(false) }
    })
    return () => { mounted = false }
  }, [])
  if (checking) return <div className="flex min-h-screen items-center justify-center" dir="rtl"><p className="text-sm font-bold text-muted-foreground">جارٍ التحقق من صلاحيات الإدارة...</p></div>
  return allowed ? <>{children}</> : <Navigate to="/" replace />
}

interface AppRoutesProps { session: Session | null | undefined; theme: "light" | "dark"; menuOpen: boolean; onToggleTheme: () => void; onToggleMenu: () => void }

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" dir="rtl">
      <p className="text-sm font-bold text-muted-foreground">جارٍ تحميل الصفحة...</p>
    </div>
  )
}

export default function AppRoutes({ session, theme, menuOpen, onToggleTheme, onToggleMenu }: AppRoutesProps) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout theme={theme} menuOpen={menuOpen} onToggleTheme={onToggleTheme} onToggleMenu={onToggleMenu} />}>
          <Route path="/" element={<HomePage />} /><Route path="/search" element={<SearchPage />} /><Route path="/archive" element={<ArchiveWrapper />} /><Route path="/pdf/:slug" element={<PdfDownloadPage />} /><Route path="/download/:id" element={<DownloadGatePage />} />
          <Route path="/s1" element={<Navigate to="/archive?semester=S1" replace />} /><Route path="/s2" element={<Navigate to="/archive?semester=S2" replace />} /><Route path="/s3" element={<Navigate to="/archive?semester=S3" replace />} /><Route path="/s4" element={<Navigate to="/archive?semester=S4" replace />} /><Route path="/s5" element={<Navigate to="/archive?semester=S5" replace />} /><Route path="/s6" element={<Navigate to="/archive?semester=S6" replace />} />
          <Route path="/news" element={<NewsPage />} /><Route path="/news/:slug" element={<ArticleWrapper />} /><Route path="/articles" element={<ArticlesPage />} /><Route path="/articles/:slug" element={<ArticleWrapper />} />
          <Route path="/events" element={<EventsPage />} /><Route path="/events/:slug" element={<EventWrapper />} /><Route path="/schools" element={<SchoolsPage />} /><Route path="/schools/:slug" element={<SchoolWrapper />} />
          <Route path="/lexicon" element={<LexiconPage />} /><Route path="/lexicon/:slug" element={<TermWrapper />} /><Route path="/about" element={<AboutPage />} /><Route path="/contact" element={<ContactPage />} /><Route path="/faq" element={<FAQPage />} /><Route path="/privacy" element={<PrivacyPolicyPage />} /><Route path="/cookies" element={<CookiePolicyPage />} /><Route path="/terms" element={<TermsPage />} /><Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/login" element={session ? <Navigate to="/admin/dashboard" replace /> : <LoginPage />} />
        <Route path="/admin" element={session === undefined ? <div className="flex min-h-screen items-center justify-center" dir="rtl"><p className="text-sm font-bold text-muted-foreground">جارٍ التحقق من الجلسة...</p></div> : session === null ? <Navigate to="/login" replace /> : <AdminGate><AdminLayout /></AdminGate>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} /><Route path="dashboard" element={<DashboardPage />} /><Route path="analytics" element={<AnalyticsPage />} />
          <Route path="articles" element={<AdminArticlesPage />} /><Route path="articles/new" element={<ArticleEditorWrapper />} /><Route path="articles/edit/:id" element={<ArticleEditorWrapper />} /><Route path="news" element={<NewsManagementPage />} /><Route path="comments" element={<CommentsPage />} /><Route path="faculties" element={<FacultiesPage />} /><Route path="lexicon" element={<LexiconPageAdmin />} /><Route path="library" element={<LibraryPage />} /><Route path="seminars" element={<SeminarsPage />} /><Route path="laws" element={<LawsPage />} /><Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}