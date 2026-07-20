import { Navbar } from './components/Navbar';
import { DeveloperBuilder } from './components/DeveloperBuilder';
import { Footer } from './components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans dir-rtl">
      <div>
        <Navbar />
        <main className="p-4 sm:p-6 max-w-7xl mx-auto">
          <DeveloperBuilder />
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm my-6 text-center">
            <h2 className="text-lg font-bold text-slate-800 mb-2">🎓 المساحة التعليمية والمنصة</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl mx-auto">
              أهلاً بك في الواجهة الرئيسية المخصصة للهواتف الذكية والحواسب. كافة المزايا والمحتويات تخضع لشروط الاستخدام وإخلاء المسؤولية القانوني.
            </p>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}