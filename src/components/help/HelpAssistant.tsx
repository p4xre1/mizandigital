import { useState } from "react"
import { useLocation } from "react-router-dom"
import { MessageCircle, X } from "lucide-react"
import HelpChat from "./HelpChat"

/** زر عائم يفتح مساعد الموقع. يختفي في صفحة /help لأن الصفحة تعرض المحادثة كاملة. */
export default function HelpAssistant() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  if (pathname === "/help" || pathname.startsWith("/admin")) return null

  return (
    <>
      {open && (
        <section
          aria-label="مساعد الموقع"
          className="fixed bottom-20 start-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border border-border bg-background p-4 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">مساعد ميزان</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-muted"
              aria-label="إغلاق المساعد"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <HelpChat compact />
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "إغلاق مساعد الموقع" : "فتح مساعد الموقع"}
        className="fixed bottom-4 start-4 z-50 inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
      >
        <MessageCircle className="size-5" aria-hidden="true" />
      </button>
    </>
  )
}
