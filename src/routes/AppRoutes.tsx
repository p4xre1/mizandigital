import { Suspense, lazy, useEffect, useState } from "react"
import { Routes, Route, Navigate, useParams, useSearchParams, useNavigate } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import PublicLayout from "@/layouts/PublicLayout"
import { HomePage } from "@/pages/public/HomePage"

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
const AdminQuizzesPage = lazy(() => import("@/pages/admin/quizzes/QuizzesPage"))
const ModerationPage = lazy(() => import("@/pages/admin/ModerationPage"))
const PaymentsAdminPage = lazy(() => import("@/pages/admin/PaymentsAdminPage"))
const UsersManagementPage = lazy(() => import("@/pages/admin/UsersManagementPage"))
const UserDataPage = lazy(() => import("@/pages/admin/UserDataPage"))
const PricingManagementPage = lazy(() => import("@/pages/admin/PricingManagementPage"))
const LimitsMonitoringPage = lazy(() => import("@/pages/admin/LimitsMonitoringPage"))
const IntelligencePage = lazy(() => import("@/pages/admin/IntelligencePage"))
const FraudPreventionPage = lazy(() => import("@/pages/admin/FraudPreventionPage"))
const SiteControlPage = lazy(() => import("@/pages/admin/SiteControlPage"))
const PagesManagementPage = lazy(() => import("@/pages/admin/PagesManagementPage"))
const HomeManagementPage = lazy(() => import("@/pages/admin/HomeManagementPage"))
const SeoManagementPage = lazy(() => import("@/pages/admin/SeoManagementPage"))
const TrendingTopicsPage = lazy(() => import("@/pages/admin/TrendingTopicsPage"))
const ContentAnalyticsPage = lazy(() => import("@/pages/admin/ContentAnalyticsPage"))
const ContentOptimizationPage = lazy(() => import("@/pages/admin/ContentOptimizationPage"))
const GmailInboxPage = lazy(() => import("@/pages/admin/GmailInboxPage"))
const LawTrendsPage = lazy(() => import("@/pages/admin/LawTrendsPage"))

const QuizHubPage = lazy(() => import("@/pages/public/quiz/QuizHubPage").then((m) => ({ default: m.QuizHubPage })))
const UniversityQuizPage = lazy(() => import("@/pages/public/quiz/UniversityQuizPage").then((m) => ({ default: m.UniversityQuizPage })))
const GeneralQuizPage = lazy(() => import("@/pages/public/quiz/GeneralQuizPage").then((m) => ({ default: m.GeneralQuizPage })))
const ConcoursQuizPage = lazy(() => import("@/pages/public/quiz/ConcoursQuizPage").then((m) => ({ default: m.ConcoursQuizPage })))
const InterviewQuizPage = lazy(() => import("@/pages/public/quiz/InterviewQuizPage").then((m) => ({ default: m.InterviewQuizPage })))
const PlacementQuizPage = lazy(() => import("@/pages/public/quiz/PlacementQuizPage").then((m) => ({ default: m.PlacementQuizPage })))
const MyProfilePage = lazy(() => import("@/pages/public/MyProfilePage").then((m) => ({ default: m.MyProfilePage })))
const PublicProfilePage = lazy(() => import("@/pages/public/PublicProfilePage").then((m) => ({ default: m.PublicProfilePage })))
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
const PaymentsPage = lazy(() => import("@/pages/public/PaymentsPage").then((m) => ({ default: m.PaymentsPage })))
const GuidelinesPage = lazy(() => import("@/pages/public/GuidelinesPage").then((m) => ({ default: m.GuidelinesPage })))
const PricingPage = lazy(() => import("@/pages/public/PricingPage").then((m) => ({ default: m.PricingPage })))
const SavedContentPage = lazy(() => import("@/pages/public/SavedContentPage").then((m) => ({ default: m.SavedContentPage })))
const NotFound = lazy(() => import("@/pages/public/NotFound").then((m) => ({ default: m.NotFound })))

function ArticleWrapper() { const { slug } = useParams<{ slug: string }>(); return <ArticlePage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function EventWrapper() { const { slug } = useParams<{ slug: string }>(); return <EventPage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function SchoolWrapper() { const { slug } = useParams<{ slug: string }>(); return <SchoolPage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function TermWrapper() { const { slug } = useParams<{ slug: string }>(); return <TermPage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function ArchiveWrapper() { const [searchParams] = useSearchParams(); return <ArchivePage initialSemester={searchParams.get("semester") ?? undefined} /> }

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
    import("@/lib/supabase/client").then(({ supabase }) => {
      if (!mounted) return
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) { if (mounted) { setAllowed(false); setChecking(false) }; return }
        const { data: profile, error } = await supabase.from("profiles").select("admin_god_mode").eq("id", data.user.id).maybeSingle()
        if (mounted) { setAllowed(!error && profile?.admin_god_mode === true); setChecking(false) }
      })
    })
    return () => { mounted = false }
  }, [])
  if (checking) return <div className="flex min-h-screen items-center justify-center" dir="rtl"><p className="text-sm font-bold text-muted-foreground">جارٍ التحقق من صلاحيات الإدارة...</p></div>
  return allowed ? <>{children}</> : <Navigate to="/" replace />
}

interface AppRoutesProps { session: Session | null | undefined; theme: "light" | "dark"; menuOpen: boolean; onToggleTheme: () => void; onToggleMenu: () => void; onCloseMenu?: () => void }

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" dir="rtl">
      <p className="text-sm font-bold text-muted-foreground">جارٍ تحميل الصفحة...</p>
    </div>
  )
}

export default function AppRoutes({ session, theme, menuOpen, onToggleTheme, onToggleMenu, onCloseMenu }: AppRoutesProps) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout theme={theme} menuOpen={menuOpen} onToggleTheme={onToggleTheme} onToggleMenu={onToggleMenu} onCloseMenu={onCloseMenu} />}>
          <Route path="/" element={<HomePage />} /><Route path="/search" element={<SearchPage />} /><Route path="/archive" element={<ArchiveWrapper />} /><Route path="/pdf/:slug" element={<PdfDownloadPage />} /><Route path="/download/:id" element={<DownloadGatePage />} />
          <Route path="/s1" element={<Navigate to="/archive?semester=S1" replace />} /><Route path="/s2" element={<Navigate to="/archive?semester=S2" replace />} /><Route path="/s3" element={<Navigate to="/archive?semester=S3" replace />} /><Route path="/s4" element={<Navigate to="/archive?semester=S4" replace />} /><Route path="/s5" element={<Navigate to="/archive?semester=S5" replace />} /><Route path="/s6" element={<Navigate to="/archive?semester=S6" replace />} />
          <Route path="/news" element={<NewsPage />} /><Route path="/news/:slug" element={<ArticleWrapper />} /><Route path="/articles" element={<ArticlesPage />} /><Route path="/articles/:slug" element={<ArticleWrapper />} />
          <Route path="/events" element={<EventsPage />} /><Route path="/events/:slug" element={<EventWrapper />} /><Route path="/schools" element={<SchoolsPage />} /><Route path="/schools/:slug" element={<SchoolWrapper />} />
          <Route path="/quiz" element={<QuizHubPage />} /><Route path="/quiz/university" element={<UniversityQuizPage />} /><Route path="/quiz/general" element={<GeneralQuizPage />} /><Route path="/quiz/concours" element={<ConcoursQuizPage />} /><Route path="/quiz/interview" element={<InterviewQuizPage />} /><Route path="/quiz/placement" element={<PlacementQuizPage />} /><Route path="/profile" element={<MyProfilePage />} /><Route path="/u/:username" element={<PublicProfilePage />} />
          <Route path="/lexicon" element={<LexiconPage />} /><Route path="/lexicon/:slug" element={<TermWrapper />} /><Route path="/about" element={<AboutPage />} /><Route path="/contact" element={<ContactPage />} /><Route path="/faq" element={<FAQPage />} /><Route path="/privacy" element={<PrivacyPolicyPage />} /><Route path="/cookies" element={<CookiePolicyPage />} /><Route path="/terms" element={<TermsPage />} /><Route path="/payments" element={<PaymentsPage />} /><Route path="/pricing" element={<PricingPage />} /><Route path="/saved" element={<SavedContentPage />} /><Route path="/guidelines" element={<GuidelinesPage />} /><Route path="*" element={<NotFound />} />
        </Route>
        {/* صفحة المصادقة الموحّدة (Supabase Auth) تتكفّل بتحويل المستخدم
            المسجّل إلى وجهته: /admin/dashboard للإدارة و/profile للبقية. */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<Navigate to="/login?mode=signup" replace />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/login?mode=password" replace />} />
        <Route path="/admin" element={session === undefined ? <div className="flex min-h-screen items-center justify-center" dir="rtl"><p className="text-sm font-bold text-muted-foreground">جارٍ التحقق من الجلسة...</p></div> : session === null ? <Navigate to="/login" replace /> : <AdminGate><AdminLayout /></AdminGate>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="control" element={<SiteControlPage />} />
          <Route path="home" element={<HomeManagementPage />} />
          <Route path="pages" element={<PagesManagementPage />} />
          <Route path="seo" element={<SeoManagementPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="articles" element={<AdminArticlesPage />} /><Route path="articles/new" element={<ArticleEditorWrapper />} /><Route path="articles/edit/:id" element={<ArticleEditorWrapper />} />
          <Route path="news" element={<NewsManagementPage />} />
          <Route path="comments" element={<CommentsPage />} />
          <Route path="faculties" element={<FacultiesPage />} />
          <Route path="lexicon" element={<LexiconPageAdmin />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="seminars" element={<SeminarsPage />} />
          <Route path="laws" element={<LawsPage />} />
          <Route path="quizzes" element={<AdminQuizzesPage />} />
          <Route path="trends" element={<TrendingTopicsPage />} />
          <Route path="content-analytics" element={<ContentAnalyticsPage />} />
          <Route path="content-optimization" element={<ContentOptimizationPage />} />
          <Route path="gmail" element={<GmailInboxPage />} />
          <Route path="law-trends" element={<LawTrendsPage />} />
          <Route path="moderation" element={<ModerationPage />} />
          <Route path="payments" element={<PaymentsAdminPage />} />
          <Route path="fraud" element={<FraudPreventionPage />} />
          <Route path="intelligence" element={<IntelligencePage />} />
          <Route path="limits" element={<LimitsMonitoringPage />} />
          <Route path="pricing" element={<PricingManagementPage />} />
          <Route path="users" element={<UsersManagementPage />} />
          <Route path="userdata" element={<UserDataPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
