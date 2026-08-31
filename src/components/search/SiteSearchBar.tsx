import { FormEvent, useState } from "react"
import { Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface SiteSearchBarProps {
  className?: string
}

export default function SiteSearchBar({ className = "" }: SiteSearchBarProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div dir="rtl" className={`mx-auto w-full max-w-2xl ${className}`}>
      <form
        onSubmit={submit}
        role="search"
        className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-md transition focus-within:border-primary/60 focus-within:shadow-lg"
      >
        <Search size={20} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="site-search" className="sr-only">البحث في جميع محتويات ميزان الرقمية</label>
        <input
          id="site-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في المقالات، الأخبار، القوانين، الملخصات، المصطلحات، الكليات والندوات..."
          className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm outline-none"
        />
        <button type="submit" className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90">
          بحث
        </button>
      </form>
    </div>
  )
}
