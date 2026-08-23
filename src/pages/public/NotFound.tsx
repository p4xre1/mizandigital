import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { FileQuestion, Home, BookOpen, GraduationCap } from "lucide-react"

export function NotFound() {
  return (
    <>
      <SEOHead
        title="404 - الصفحة غير موجودة"
        description="عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها أو حذفها. يمكنك العودة إلى الصفحة الرئيسية أو استخدام البحث للعثور على المحتوى الذي تريده."
        noindex
      />

      <main className="container mx-auto max-w-3xl px-4 py-20 text-center" dir="rtl">
        {/* Visual Icon */}
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
          <FileQuestion size={40} />
        </div>

        {/* Status Code */}
        <h1 className="text-6xl font-black text-foreground md:text-7xl">404</h1>

        {/* Primary Message */}
        <h2 className="mt-4 text-xl font-bold text-foreground md:text-2xl">
          عذراً، الصفحة التي تبحث عنها غير موجودة
        </h2>

        {/* Explanation */}
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          قد يكون الرابط الذي اتبعته غير صحيح، أو تم تغيير عنوان الصفحة أو حذفها من أرشيف منصة الميزان الرقمية.
        </p>

        {/* Helpful Navigation Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition shadow-sm"
          >
            <Home size={16} />
            <span>العودة للرئيسية</span>
          </Link>

          <Link
            to="/lexicon"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
          >
            <BookOpen size={16} />
            <span>المعجم القانوني</span>
          </Link>

          <Link
            to="/schools"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
          >
            <GraduationCap size={16} />
            <span>دليل الكليات</span>
          </Link>
        </div>
      </main>
    </>
  )
}