import { Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import PublicLayout from "@/layouts/PublicLayout"
import AdminLayout from "@/components/layout/AdminLayout"
import LoginPage from "@/pages/auth/LoginPage"

// Admin Pages
import DashboardPage from "@/pages/admin/DashboardPage"
import AdminArticlesPage from "@/pages/admin/articles/ArticlesPage"
import ArticleEditorPage from "@/pages/admin/articles/ArticleEditorPage"
import FacultiesPage from "@/pages/admin/faculties/FacultiesPage"
import LexiconPageAdmin from "@/pages/admin/lexicon/LexiconPage"
import LibraryPage from "@/pages/admin/library/LibraryPage"
import SeminarsPage from "@/pages/admin/seminars/SeminarsPage"
import NewsManagementPage from "@/pages/admin/NewsManagementPage"

// Public Pages
import {
  HomePage,
  ArchivePage,
  NewsPage,
  ArticlesPage,
  ArticlePage,
  EventsPage,
  EventPage,
  SchoolsPage,
  SchoolPage,
  LexiconPage,
  TermPage,
  NotFound,
} from "@/pages/public/index"

// Helper components for route param mapping (مع فك تشفير النصوص العربية)
function ArticleWrapper() {
  const { slug } = useParams<{ slug: string }>()
  return <ArticlePage slug={slug ? decodeURIComponent(slug) : undefined} />
}

function EventWrapper() {
  const { slug } = useParams<{ slug: string }>()
  return <EventPage slug={slug ? decodeURIComponent(slug) : undefined} />
}

function SchoolWrapper() {
  const { slug } = useParams<{ slug: string }>()
  return <SchoolPage slug={slug ? decodeURIComponent(slug) : undefined} />
}

function TermWrapper() {
  const { slug } = useParams<{ slug: string }>()
  return <TermPage slug={slug ? decodeURIComponent(slug) : undefined} />
}

function ArchiveWrapper() {
  const [searchParams] = useSearchParams()
  const semester = searchParams.get("semester") ?? undefined
  return <ArchivePage initialSemester={semester} />
}

interface AppRoutesProps {
  session: Session | null | undefined
  theme: "light" | "dark"
  menuOpen: boolean
  onToggleTheme: () => void
  onToggleMenu: () => void
}

export default function AppRoutes({
  session,
  theme,
  menuOpen,
  onToggleTheme,
  onToggleMenu,
}: AppRoutesProps) {
  return (
    <Routes>
      {/* ================= PUBLIC ROUTES ================= */}
      <Route
        element={
          <PublicLayout
            theme={theme}
            menuOpen={menuOpen}
            onToggleTheme={onToggleTheme}
            onToggleMenu={onToggleMenu}
          />
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/archive" element={<ArchiveWrapper />} />

        {/* Semester Redirect Shortcuts (/s1, /s2...) */}
        <Route path="/s1" element={<Navigate to="/archive?semester=S1" replace />} />
        <Route path="/s2" element={<Navigate to="/archive?semester=S2" replace />} />
        <Route path="/s3" element={<Navigate to="/archive?semester=S3" replace />} />
        <Route path="/s4" element={<Navigate to="/archive?semester=S4" replace />} />
        <Route path="/s5" element={<Navigate to="/archive?semester=S5" replace />} />
        <Route path="/s6" element={<Navigate to="/archive?semester=S6" replace />} />

        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<ArticleWrapper />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/articles/:slug" element={<ArticleWrapper />} />

        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:slug" element={<EventWrapper />} />

        <Route path="/schools" element={<SchoolsPage />} />
        <Route path="/schools/:slug" element={<SchoolWrapper />} />

        <Route path="/lexicon" element={<LexiconPage />} />
        <Route path="/lexicon/:slug" element={<TermWrapper />} />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ================= AUTH ROUTE ================= */}
      <Route
        path="/login"
        element={session ? <Navigate to="/admin/dashboard" replace /> : <LoginPage />}
      />

      {/* ================= ADMIN ROUTES (PROTECTED) ================= */}
      <Route
        path="/admin"
        element={
          session === undefined ? (
            <div className="flex min-h-screen items-center justify-center" dir="rtl">
              <p className="text-sm font-bold text-muted-foreground">جارٍ التحقق من الجلسة...</p>
            </div>
          ) : session === null ? (
            <Navigate to="/login" replace />
          ) : (
            <AdminLayout />
          )
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="articles" element={<AdminArticlesPage />} />
        <Route path="articles/new" element={<ArticleEditorPage />} />
        <Route path="articles/edit/:id" element={<ArticleEditorPage />} />
        <Route path="news" element={<NewsManagementPage />} />
        <Route path="faculties" element={<FacultiesPage />} />
        <Route path="lexicon" element={<LexiconPageAdmin />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="seminars" element={<SeminarsPage />} />
      </Route>
    </Routes>
  )
}