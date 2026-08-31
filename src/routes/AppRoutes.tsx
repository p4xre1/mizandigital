import { Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import PublicLayout from "@/layouts/PublicLayout"
import AdminLayout from "@/components/layout/AdminLayout"
import LoginPage from "@/pages/auth/LoginPage"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

import DashboardPage from "@/pages/admin/DashboardPage"
import AnalyticsPage from "@/pages/admin/AnalyticsPage"
import AdminArticlesPage from "@/pages/admin/articles/ArticlesPage"
import ArticleEditorPage from "@/pages/admin/articles/ArticleEditorPage"
import FacultiesPage from "@/pages/admin/faculties/FacultiesPage"
import LexiconPageAdmin from "@/pages/admin/lexicon/LexiconPage"
import LibraryPage from "@/pages/admin/library/LibraryPage"
import SeminarsPage from "@/pages/admin/seminars/SeminarsPage"
import NewsManagementPage from "@/pages/admin/NewsManagementPage"
import CommentsPage from "@/pages/admin/CommentsPage"
import LawsPage from "@/pages/admin/LawsPage"
import SettingsPage from "@/pages/admin/SettingsPage"

import {
  HomePage, SearchPage, ArchivePage, DownloadGatePage, NewsPage, ArticlesPage, ArticlePage,
  EventPage, EventsPage, SchoolsPage, SchoolPage, LexiconPage, TermPage,
  AboutPage, ContactPage, FAQPage, PrivacyPolicyPage, CookiePolicyPage, TermsPage, NotFound,
} from "@/pages/public/index"

function ArticleWrapper() { const { slug } = useParams<{ slug: string }>(); return <ArticlePage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function EventWrapper() { const { slug } = useParams<{ slug: string }>(); return <EventPage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function SchoolWrapper() { const { slug } = useParams<{ slug: string }>(); return <SchoolPage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function TermWrapper() { const { slug } = useParams<{ slug: string }>(); return <TermPage slug={slug ? decodeURIComponent(slug) : undefined} /> }
function ArchiveWrapper() { const [searchParams] = useSearchParams(); return <ArchivePage initialSemester={searchParams.get("semester") ?? undefined} /> }

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

export default function AppRoutes({ session, theme, menuOpen, onToggleTheme, onToggleMenu }: AppRoutesProps) {
  return <Routes>
    <Route element={<PublicLayout theme={theme} menuOpen={menuOpen} onToggleTheme={onToggleTheme} onToggleMenu={onToggleMenu} />}>
      <Route path="/" element={<HomePage />} /><Route path="/search" element={<SearchPage />} /><Route path="/archive" element={<ArchiveWrapper />} /><Route path="/download/:id" element={<DownloadGatePage />} />
      <Route path="/s1" element={<Navigate to="/archive?semester=S1" replace />} /><Route path="/s2" element={<Navigate to="/archive?semester=S2" replace />} /><Route path="/s3" element={<Navigate to="/archive?semester=S3" replace />} /><Route path="/s4" element={<Navigate to="/archive?semester=S4" replace />} /><Route path="/s5" element={<Navigate to="/archive?semester=S5" replace />} /><Route path="/s6" element={<Navigate to="/archive?semester=S6" replace />} />
      <Route path="/news" element={<NewsPage />} /><Route path="/news/:slug" element={<ArticleWrapper />} /><Route path="/articles" element={<ArticlesPage />} /><Route path="/articles/:slug" element={<ArticleWrapper />} />
      <Route path="/events" element={<EventsPage />} /><Route path="/events/:slug" element={<EventWrapper />} /><Route path="/schools" element={<SchoolsPage />} /><Route path="/schools/:slug" element={<SchoolWrapper />} />
      <Route path="/lexicon" element={<LexiconPage />} /><Route path="/lexicon/:slug" element={<TermWrapper />} /><Route path="/about" element={<AboutPage />} /><Route path="/contact" element={<ContactPage />} /><Route path="/faq" element={<FAQPage />} /><Route path="/privacy" element={<PrivacyPolicyPage />} /><Route path="/cookies" element={<CookiePolicyPage />} /><Route path="/terms" element={<TermsPage />} /><Route path="*" element={<NotFound />} />
    </Route>
    <Route path="/login" element={session ? <Navigate to="/admin/dashboard" replace /> : <LoginPage />} />
    <Route path="/admin" element={session === undefined ? <div className="flex min-h-screen items-center justify-center" dir="rtl"><p className="text-sm font-bold text-muted-foreground">جارٍ التحقق من الجلسة...</p></div> : session === null ? <Navigate to="/login" replace /> : <AdminGate><AdminLayout /></AdminGate>}>
      <Route index element={<Navigate to="/admin/dashboard" replace />} /><Route path="dashboard" element={<DashboardPage />} /><Route path="analytics" element={<AnalyticsPage />} />
      <Route path="articles" element={<AdminArticlesPage />} /><Route path="articles/new" element={<ArticleEditorPage />} /><Route path="articles/edit/:id" element={<ArticleEditorPage />} /><Route path="news" element={<NewsManagementPage />} /><Route path="comments" element={<CommentsPage />} /><Route path="faculties" element={<FacultiesPage />} /><Route path="lexicon" element={<LexiconPageAdmin />} /><Route path="library" element={<LibraryPage />} /><Route path="seminars" element={<SeminarsPage />} /><Route path="laws" element={<LawsPage />} /><Route path="settings" element={<SettingsPage />} />
    </Route>
  </Routes>
}