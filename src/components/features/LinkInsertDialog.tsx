import { useEffect, useState } from "react"
import { Link as LinkIcon, Search, ExternalLink, Loader2, X, FileText, Newspaper } from "lucide-react"
import { searchLinkableContent, type LinkableResult } from "../../lib/content/searchLinkableContent"

interface LinkInsertDialogProps {
  initialText: string
  onClose: () => void
  onInsert: (text: string, url: string) => void
}

/**
 * أداة إدراج الروابط (الداخلية والخارجية) داخل محرر النصوص. تعوّض
 * window.prompt() القديمة بواجهة بحث حقيقية عن المقالات/الأخبار المنشورة
 * للربط الداخلي السريع، مع تبويب مستقل للروابط الخارجية.
 */
export function LinkInsertDialog({ initialText, onClose, onInsert }: LinkInsertDialogProps) {
  const [mode, setMode] = useState<"internal" | "external">("internal")
  const [linkText, setLinkText] = useState(initialText)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LinkableResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [externalUrl, setExternalUrl] = useState("https://")

  // بحث فوري (debounced) فـ المقالات والأخبار عند الكتابة
  useEffect(() => {
    if (mode !== "internal") return
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const found = await searchLinkableContent(q)
        setResults(found)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, mode])

  const canInsert =
    linkText.trim() !== "" &&
    (mode === "internal" ? !!selectedPath : externalUrl.trim() !== "" && externalUrl.trim() !== "https://")

  const handleConfirm = () => {
    if (!canInsert) return
    const url = mode === "internal" ? selectedPath! : externalUrl.trim()
    onInsert(linkText.trim(), url)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <LinkIcon className="size-4 text-primary" />
            إدراج رابط
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* تبويبات: داخلي / خارجي */}
        <div className="flex gap-1 border-b border-border px-4 pt-3">
          <button
            type="button"
            onClick={() => setMode("internal")}
            className={`rounded-t-lg px-3 py-2 text-xs font-bold transition ${
              mode === "internal"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            رابط داخلي (من المنصة)
          </button>
          <button
            type="button"
            onClick={() => setMode("external")}
            className={`rounded-t-lg px-3 py-2 text-xs font-bold transition ${
              mode === "external"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            رابط خارجي
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">نص الرابط الظاهر</label>
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="النص اللي غادي يظهر كرابط..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          {mode === "internal" ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن مقال أو خبر منشور بالمنصة..."
                  className="w-full rounded-lg border border-border bg-background py-2 pe-3 ps-8 text-xs text-foreground outline-none focus:border-primary"
                />
                {searching && (
                  <Loader2 className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="max-h-56 space-y-1 overflow-y-auto">
                {results.length === 0 && query.trim() && !searching && (
                  <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">
                    لا توجد نتائج مطابقة.
                  </p>
                )}
                {results.map((r) => (
                  <button
                    key={r.path}
                    type="button"
                    onClick={() => {
                      setSelectedPath(r.path)
                      if (!linkText.trim() || linkText === initialText) setLinkText(r.title)
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-right text-xs transition ${
                      selectedPath === r.path
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {r.type === "article" ? (
                      <FileText className="size-3.5 shrink-0" />
                    ) : (
                      <Newspaper className="size-3.5 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{r.title}</span>
                  </button>
                ))}
              </div>

              {selectedPath && (
                <p className="text-[11px] text-muted-foreground">
                  الرابط المختار: <span className="font-mono text-foreground">{selectedPath}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                الرابط الإلكتروني (URL)
              </label>
              <div className="relative">
                <ExternalLink className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-border bg-background py-2 pe-3 ps-8 text-xs text-foreground outline-none focus:border-primary"
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                سيُفتح هذا الرابط فـ نافذة/تبويب جديد تلقائياً.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canInsert}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            إدراج الرابط
          </button>
        </div>
      </div>
    </div>
  )
}
