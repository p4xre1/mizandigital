import { Link } from "react-router";
import { Scale, ArrowRight, Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16" dir="rtl">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Scale size={36} className="text-primary opacity-40" />
        </div>
        <h1 className="text-6xl font-bold text-foreground mb-3 font-mono">404</h1>
        <h2 className="text-xl font-bold text-foreground mb-3" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>
          الصفحة غير موجودة
        </h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
          عذراً، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها. تحقق من الرابط أو ابحث في المكتبة.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm"
            style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
            <Home size={15} /> العودة للرئيسية
          </Link>
          <Link to="/search"
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-border text-gray-700 rounded-xl hover:border-primary hover:text-primary transition-colors text-sm"
            style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
            <Search size={15} /> البحث في ميزان
          </Link>
        </div>
      </div>
    </div>
  );
}
