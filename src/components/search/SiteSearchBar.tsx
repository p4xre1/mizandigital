import { FormEvent, useState } from "react"
import { Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function SiteSearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div dir="rtl" className="border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      <form onSubmit={submit} role="search" className="mx-auto flex max-w-5xl items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 shadow-sm focus-within:border-primary/60">
        <Search size={19} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="site-search" className="sr-only">البحث في جميع محتويات ميزان الرقمية</label>
        <input id="site-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في المقالات، الأخبار، القوانين، الملخصات، المصطلحات، الكليات والندوات..." className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none" />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90">بحث</button>
      </form>
    </div>
  )
}
