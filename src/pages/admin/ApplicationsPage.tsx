import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BriefcaseBusiness,
  FileText,
  Filter,
  Inbox,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import EmptyState from "../../components/ui/EmptyState"
import {
  fetchApplications,
  setApplicationStatus,
} from "../../lib/resumes/service"
import type { Application, ApplicationStatus, AnnonceType } from "../../types/resume"

interface ApplicationRow extends Application {
  mizan_profiles?: {
    username: string
    display_name: string
    role?: string | null
  } | null
}

interface ApplicationsPageProps {
  onNavigate?: (path: string) => void
}

const STATUS_OPTIONS: Array<{ value: ApplicationStatus; label: string; className: string }> = [
  { value: "pending", label: "قيد الانتظار", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { value: "viewed", label: "شوهدت", className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { value: "shortlisted", label: "تم اختيارها", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { value: "rejected", label: "مرفوضة", className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
]

const TYPE_LABELS: Record<AnnonceType, string> = {
  event: "فعالية",
  seminar: "ندوة",
  news: "مستجد",
}

/**
 * طلبات التقديم — /admin/applications.
 * كل الطلبات الواردة على الإعلانات (مباريات/ندوات/توظيف) مع السيرة المقدمة.
 */
export default function ApplicationsPage({ onNavigate }: ApplicationsPageProps) {
  const [rows, setRows] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all")
  const [typeFilter, setTypeFilter] = useState<"all" | AnnonceType>("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchApplications()
    setRows(data as unknown as ApplicationRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false
      if (typeFilter !== "all" && row.annonce_type !== typeFilter) return false
      if (
        q &&
        !`${row.annonce_title ?? ""} ${row.mizan_profiles?.display_name ?? ""} ${row.mizan_profiles?.username ?? ""}`
          .toLowerCase()
          .includes(q)
      )
        return false
      return true
    })
  }, [rows, searchQuery, statusFilter, typeFilter])

  const counts = useMemo(() => {
    const acc: Record<ApplicationStatus, number> = { pending: 0, viewed: 0, shortlisted: 0, rejected: 0 }
    rows.forEach((row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1
    })
    return acc
  }, [rows])

  const handleChangeStatus = async (id: string, status: ApplicationStatus) => {
    setUpdatingId(id)
    setError(null)
    const result = await setApplicationStatus(id, status)
    setUpdatingId(null)
    if (!result.ok) {
      setError(result.error ?? "تعذر تحديث الحالة.")
      return
    }
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)))
  }

  const resetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setTypeFilter("all")
  }

  return (
    <AdminLayout currentPath="/admin/applications" onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-xl font-black text-foreground">طلبات التقديم على الإعلانات</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            السير الذاتية المقدَّمة على المباريات والندوات والمستجدات — غيّر حالة كل طلب حسب المتابعة.
          </p>
        </div>

        {/* عدادات الحالات */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(statusFilter === option.value ? "all" : option.value)}
              className={`rounded-2xl border p-3 text-right transition ${
                statusFilter === option.value ? "border-primary" : "border-border hover:border-primary/40"
              } bg-card`}
            >
              <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${option.className}`}>
                {option.label}
              </span>
              <p className="mt-1.5 text-lg font-black text-foreground">{counts[option.value] ?? 0}</p>
            </button>
          ))}
        </div>

        {/* البحث والفلاتر */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم المُقدِّم أو عنوان الإعلان..."
              className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-8 text-xs text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 shrink-0 text-muted-foreground" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | AnnonceType)}
              className="cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">كل الإعلانات</option>
              <option value="event">فعاليات</option>
              <option value="seminar">ندوات</option>
              <option value="news">مستجدات</option>
            </select>
            {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/50 px-2.5 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                <span className="hidden md:inline">تصفية</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={rows.length === 0 ? "لا توجد طلبات بعد" : "لا نتائج مطابقة"}
            description={
              rows.length === 0
                ? "عندما يقدم المستخدمو سيرهم على الإعلانات ستظهر هنا."
                : "جرّب تغيير الفلاتر أو البحث."
            }
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((row) => (
              <li key={row.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                        {TYPE_LABELS[row.annonce_type] ?? row.annonce_type}
                      </span>
                      <h3 className="text-[13.5px] font-extrabold text-foreground">
                        {row.annonce_title || "إعلان بدون عنوان"}
                      </h3>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[11.5px] text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {row.mizan_profiles?.display_name || "مستخدم"}
                        <span className="mr-1 font-normal">({row.mizan_profiles?.username || "—"})</span>
                      </span>
                      <span>{new Date(row.applied_at ?? Date.now()).toLocaleDateString("ar-MA")}</span>
                      <a
                        href={`/resume/${row.mizan_profiles?.username ?? ""}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                      >
                        <FileText className="size-3.5" />
                        عرض السيرة
                      </a>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {updatingId === row.id ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <select
                        value={row.status}
                        onChange={(e) => void handleChangeStatus(row.id, e.target.value as ApplicationStatus)}
                        className="cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-primary"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <BriefcaseBusiness className="size-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  )
}
