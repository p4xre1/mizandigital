import { useState, useMemo, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import docsData from "../../data/docs.json"
import { supabase } from "../../lib/supabase/client"
import { useWebMCPTool } from "../../lib/webmcp/useWebMCPTool"
import {
  FolderDown,
  BookOpen,
  Search,
  Filter,
  FileText,
  GraduationCap,
  Download,
  CheckCircle2,
  Sparkles,
  Tag,
  ArrowLeft,
  AlertCircle,
  FileSpreadsheet,
  Award,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Scale
} from "lucide-react"

interface ArchivePageProps {
  initialSemester?: string
}

interface ArchiveItem {
  id: string
  semester: string
  module: string
  title: string
  type: string
  branch: string
  author: string
  fileSize: string
  fileFormat: string
  downloads: number
  downloadUrl: string
  date?: string | null
}

// السداسي الخاص بالنصوص القانونية العامة (غير المرتبطة بفصل دراسي معيّن)
const GENERAL_LAW_SEMESTER = "عام"

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "PDF"
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

// 1) مواد الفصول الدراسية المحلية (docs.json) — تُحدَّث يدوياً ضمن المستودع
function normalizeLocalDoc(raw: any): ArchiveItem {
  return {
    id: `doc-${raw.id}`,
    semester: raw.semester || "S1",
    module: raw.module || "مادة دراسية",
    title: raw.title,
    type: "ملخصات",
    branch: raw.systemTag || "عام",
    author: raw.professor || "منصة ميزان الرقمية",
    fileSize: "PDF",
    fileFormat: "PDF",
    downloads: 0,
    downloadUrl: raw.fileUrl || "#",
    date: raw.updatedAt || null,
  }
}

// 2) مستندات الفصول الدراسية المرفوعة من لوحة التحكم (جدول pdf_summaries)
function normalizePdfSummary(raw: any): ArchiveItem {
  return {
    id: `pdf-${raw.id}`,
    semester: raw.semester || "S1",
    module: raw.faculty?.name || "مادة دراسية",
    title: raw.title,
    type: "ملخصات",
    branch: raw.faculty?.name || "عام",
    author: raw.professor || "منصة ميزان الرقمية",
    fileSize: formatFileSize(raw.file_size_bytes),
    fileFormat: "PDF",
    downloads: raw.download_count || 0,
    downloadUrl: raw.file_url,
    date: raw.created_at || null,
  }
}

// 3) النصوص القانونية العامة المضافة من لوحة التحكم (جدول laws) — غير مرتبطة بفصل دراسي
function normalizeLaw(raw: any): ArchiveItem {
  return {
    id: `law-${raw.id}`,
    semester: GENERAL_LAW_SEMESTER,
    module: raw.law_number ? `القانون رقم ${raw.law_number}` : "نص تشريعي",
    title: raw.title,
    type: "نصوص قانونية",
    branch: raw.category?.name_ar || raw.category?.name || "عام",
    author: raw.official_gazette_number ? `الجريدة الرسمية عدد ${raw.official_gazette_number}` : "منصة ميزان الرقمية",
    fileSize: "PDF",
    fileFormat: "PDF",
    downloads: 0,
    downloadUrl: raw.pdf_url || "#",
    date: raw.publication_date || null,
  }
}

const SEMESTERS = [
  { id: "all", label: "جميع الفصول" },
  { id: "S1", label: "الفصل S1" },
  { id: "S2", label: "الفصل S2" },
  { id: "S3", label: "الفصل S3" },
  { id: "S4", label: "الفصل S4" },
  { id: "S5", label: "الفصل S5" },
  { id: "S6", label: "الفصل S6" },
  { id: GENERAL_LAW_SEMESTER, label: "قوانين ونصوص عامة" }
]

const RESOURCE_TYPES = ["الكل", "ملخصات", "محاضرات", "امتحانات", "بحوث", "نصوص قانونية"]

export function ArchivePage({ initialSemester }: ArchivePageProps) {
  const params = useParams<{ semester?: string }>()
  const activeSemesterParam = initialSemester || params.semester || "all"

  const [selectedSemester, setSelectedSemester] = useState<string>(activeSemesterParam)
  const [selectedType, setSelectedType] = useState<string>("الكل")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [cmsDocs, setCmsDocs] = useState<ArchiveItem[]>([])
  const [cmsLaws, setCmsLaws] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // جلب مستندات الفصول الدراسية والنصوص القانونية المضافة من لوحة التحكم (CMS)
  useEffect(() => {
    const fetchArchiveData = async () => {
      try {
        const [pdfRes, lawsRes] = await Promise.all([
          supabase
            .from("pdf_summaries")
            .select("*, faculty:faculties(id, name, city, slug)")
            .order("created_at", { ascending: false }),
          (supabase as any)
            .from("laws")
            .select("*, category:categories(id, name, name_fr, slug)")
            .order("created_at", { ascending: false }),
        ])

        if (pdfRes.data) setCmsDocs(pdfRes.data.map(normalizePdfSummary))
        if (lawsRes.data) setCmsLaws(lawsRes.data.map(normalizeLaw))
        if (lawsRes.error) {
          // جدول "laws" قد لا يكون قد أُنشئ بعد على قاعدة البيانات، لا نعتبره خطأ حرجاً
          console.warn("تعذر جلب النصوص القانونية العامة (تحقق من وجود جدول laws):", lawsRes.error)
        }
      } catch (err) {
        console.error("خطأ أثناء جلب بيانات الأرشيف من لوحة التحكم:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchArchiveData()
  }, [])

  // دمج جميع مصادر الأرشيف: الملفات المحلية (docs.json) + مستندات لوحة التحكم + القوانين العامة
  const fullCatalog = useMemo<ArchiveItem[]>(() => {
    const localDocs = (docsData as any[]).map(normalizeLocalDoc)
    return [...cmsDocs, ...localDocs, ...cmsLaws]
  }, [cmsDocs, cmsLaws])

  // File Explorer view mode state ('grid' or 'list')
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Filter items based on Semester, Resource Type, and Search Query
  const filteredCatalog = useMemo(() => {
    return fullCatalog.filter((item) => {
      // Semester Filter
      if (selectedSemester !== "all" && item.semester !== selectedSemester) {
        return false
      }

      // Type Filter
      if (selectedType !== "الكل" && item.type !== selectedType) {
        return false
      }

      // Search Query Filter
      if (!searchQuery.trim()) return true

      const query = searchQuery.toLowerCase()
      return (
        item.module.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query) ||
        item.branch.toLowerCase().includes(query) ||
        item.author.toLowerCase().includes(query)
      )
    })
  }, [fullCatalog, selectedSemester, selectedType, searchQuery])

  // أداة WebMCP تجريبية: تتيح لوكيل ذكاء اصطناعي البحث في أرشيف الوثائق
  // والملخصات الدراسية والنصوص القانونية مباشرة (Chrome 146+ خلف علم تجريبي)
  useWebMCPTool({
    name: "search_archive_documents",
    description: "يبحث في أرشيف منصة الميزان الرقمية عن ملخصات دراسية أو نصوص قانونية عامة، مع إمكانية التصفية حسب الفصل الدراسي.",
    properties: {
      query: { type: "string", description: "كلمة أو عبارة للبحث في عناوين الوثائق" },
      semester: {
        type: "string",
        description: "الفصل الدراسي المطلوب تصفية النتائج حسبه",
        enum: ["all", "S1", "S2", "S3", "S4", "S5", "S6", GENERAL_LAW_SEMESTER],
      },
    },
    required: ["query"],
    execute: ({ query, semester }) => {
      setSearchQuery(String(query || ""))
      if (semester) setSelectedSemester(String(semester))
      return { content: [{ type: "text", text: `تم تطبيق البحث عن: ${query}` }] }
    },
  })

  // Schema.org Structured Data for Archive Collection
  const archiveSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "الأرشيف الدراسي الأكاديمي لكليات الحقوق بالمغرب",
    "description": "تصفح وحمل ملخصات ومحاضرات ونماذج امتحانات العلوم القانونية بكليات الحقوق المغربية للفصول S1 إلى S6.",
    "url": "https://www.mizan.page/archive",
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": filteredCatalog.length,
      "itemListElement": filteredCatalog.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": `${item.module} - ${item.title}`,
        "description": `مادة ${item.module} - ${item.type} (${item.semester})`
      }))
    }
  }

  return (
    <>
      <SEOHead
        title={`الأرشيف الدراسي ${selectedSemester !== "all" ? `- الفصل ${selectedSemester}` : "الشامل"}`}
        canonicalUrl="https://www.mizan.page/archive"
        description="تصفح وحمّل مجاناً أفضل ملخصات، محاضرات، ونماذج امتحانات كليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب لجميع السداسيات (S1 - S6)."
        keywords={[
          "الأرشيف الدراسي القانوني",
          "ملخصات القانون المغربي",
          "امتحانات FSJES",
          "دروس S1 S2 S3 S4 S5 S6",
          "القانون الخاص والعام بالمغرب"
        ]}
        schema={archiveSchema}
      />

      <main className="min-h-screen bg-background text-foreground" dir="rtl">
        <div className="container mx-auto max-w-6xl px-4 py-10">
          {/* Header Section */}
          <header className="mb-8 text-center md:text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 mb-3">
              <FolderDown size={16} />
              <span>المرفق الأكاديمي الموحد</span>
            </div>
            <h1 className="text-3xl font-black text-foreground md:text-4xl">
              الأرشيف الدراسي لكليات الحقوق
              {selectedSemester !== "all" && (
                <span className="text-primary"> ({selectedSemester})</span>
              )}
            </h1>
            <p className="mt-2 text-base text-muted-foreground max-w-2xl">
              تصفح وحمّل المراجع العلمية، المحاضرات المكتوبة، الملخصات الممركزة، ونماذج الامتحانات المرفقة بعناصر الإجابة لجميع السداسيات.
            </p>
          </header>

          {/* Search & Filters Controls */}
          <div className="mb-6 flex flex-col gap-4 bg-card p-4 md:p-6 rounded-2xl border border-border shadow-sm">
            {/* Top Controls: Search Input & Semester Tabs */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="ابحث عن وحدة دراسية (مثلاً: المسطرة المدنية)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background pr-10 pl-4 py-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                />
              </div>

              {/* Semester Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                {SEMESTERS.map((sem) => (
                  <button
                    key={sem.id}
                    type="button"
                    onClick={() => setSelectedSemester(sem.id)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shrink-0 ${
                      selectedSemester === sem.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sem.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resource Type Sub-Filters */}
            <div className="flex items-center gap-2 pt-3 border-t border-border/60 overflow-x-auto">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                <Filter size={13} />
                نوع الملف:
              </span>
              {RESOURCE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition shrink-0 ${
                    selectedType === type
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Switcher Toolbar (File Explorer Style) */}
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 border border-border p-3.5 rounded-2xl backdrop-blur-md">
            <span className="text-xs font-bold text-muted-foreground">
              عدد النتائج المعروضة: <span className="text-primary">{filteredCatalog.length} عنصر</span>
            </span>

            <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="عرض شبكي (Grid View)"
              >
                <LayoutGrid size={15} />
                <span>شبكة</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="قائمة مفصلة (File Explorer View)"
              >
                <List size={15} />
                <span>قائمة تفصيلية</span>
              </button>
            </div>
          </div>

          {/* Catalog Container (Adapts dynamically to Grid or List view) */}
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : filteredCatalog.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "flex flex-col space-y-3"
              }
            >
              {filteredCatalog.map((item) => (
                <article
                  key={item.id}
                  className={`group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md ${
                    viewMode === "list"
                      ? "!flex !flex-row !items-center !justify-between !py-4 gap-4"
                      : "flex flex-col justify-between"
                  }`}
                >
                  <div className={viewMode === "list" ? "space-y-1 flex-1" : "space-y-2"}>
                    {/* Card Top Badges (Hidden or compact in list view) */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
                        <Layers size={12} />
                        {item.semester}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        <Tag size={11} />
                        {item.type}
                      </span>
                    </div>

                    {/* Module Name */}
                    <span className="block text-xs font-extrabold text-primary">
                      {item.module}
                    </span>

                    {/* File Title */}
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition leading-snug">
                      {item.title}
                    </h3>

                    {/* Metadata Specs (Shown fully in grid, simplified in list) */}
                    {viewMode === "grid" && (
                      <div className="space-y-1.5 pt-3 border-t border-border/60 text-xs text-muted-foreground mt-3">
                        <div className="flex items-center justify-between">
                          <span>المؤلف / المصدر:</span>
                          <span className="font-semibold text-foreground truncate max-w-[150px]">
                            {item.author}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span>الشعبة:</span>
                          <span className="font-medium text-foreground">{item.branch}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span>الحجم والصيغة:</span>
                          <span className="font-mono text-foreground font-semibold">
                            {item.fileSize} ({item.fileFormat})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div
                    className={
                      viewMode === "list"
                        ? "shrink-0 flex items-center gap-4"
                        : "mt-5 pt-3 border-t border-border flex items-center justify-between"
                    }
                  >
                    {viewMode === "grid" ? (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {item.downloads} تحميل
                      </span>
                    ) : (
                      <div className="hidden sm:flex flex-col text-left text-xs text-muted-foreground">
                        <span className="font-mono font-semibold text-foreground">{item.fileSize}</span>
                        <span>{item.downloads} تحميل</span>
                      </div>
                    )}

                    <Link
                      to={`/download/${item.id}`}
                      title={`تحميل ${item.title}`}
                      state={{
                        title: item.title,
                        downloadUrl: item.downloadUrl,
                        fileSize: item.fileSize,
                        fileFormat: item.fileFormat,
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90 shrink-0"
                    >
                      <Download size={14} />
                      <span>تحميل الملف</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* Empty Search State */
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <AlertCircle size={44} className="mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-bold text-foreground">لم يتم العثور على أي ملفات</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                لم نجد نتائج تطابق خيارات البحث الحالية. حاول تغيير الفصول أو إعادة ضبط الفلاتر.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSemester("all")
                  setSelectedType("الكل")
                  setSearchQuery("")
                }}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
              >
                إعادة ضبط جميع الفلاتر
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}