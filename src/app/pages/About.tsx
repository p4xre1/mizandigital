import { Scale, Users, BookOpen, GraduationCap, Globe, Award } from "lucide-react";

const TEAM = [
  { name: "د. محمد العلوي", role: "رئيس التحرير", specialty: "أستاذ القانون الخاص — جامعة محمد الخامس" },
  { name: "ذ. سارة بنعلي", role: "مديرة الأرشيف", specialty: "دكتوراه في القانون الجنائي — جامعة الحسن الثاني" },
  { name: "ذ. يوسف الإدريسي", role: "محرر أول", specialty: "ماستر في القانون الدولي — جامعة القاضي عياض" },
  { name: "ذ. أمينة الزهراء", role: "مسؤولة المحتوى الجامعي", specialty: "دكتورة في القانون الإداري — جامعة محمد الأول" },
];

const PARTNERS = [
  "جامعة محمد الخامس — الرباط",
  "جامعة الحسن الثاني — الدار البيضاء",
  "جامعة القاضي عياض — مراكش",
  "جامعة محمد الأول — وجدة",
  "جامعة ابن طفيل — القنيطرة",
  "جامعة عبد المالك السعدي — تطوان",
];

const VALUES = [
  { icon: <Scale size={22} />, title: "الدقة القانونية", desc: "كل وثيقة تخضع لمراجعة أكاديمية دقيقة قبل نشرها." },
  { icon: <BookOpen size={22} />, title: "الوصول المفتوح", desc: "نؤمن بأن المعرفة القانونية حق للجميع، لا امتياز لأقلية." },
  { icon: <GraduationCap size={22} />, title: "الدعم الأكاديمي", desc: "نرافق الطالب من السنة الأولى حتى أطروحة الدكتوراه." },
  { icon: <Globe size={22} />, title: "التعددية اللغوية", desc: "محتوى بالعربية، الفرنسية، والإسبانية لاستيعاب الباحثين المغاربة." },
];

export default function About() {
  return (
    <div className="bg-background" dir="rtl">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Scale size={32} className="text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>
            من نحن — منصة ميزان
          </h1>
          <p className="text-blue-100 text-base md:text-lg max-w-2xl mx-auto" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
            منصة ميزان هي المجلة القانونية الرقمية الأولى المتخصصة في توثيق وأرشفة المحتوى القانوني المغربي، وتخدم الطلاب والباحثين والمهنيين في مجال الحقوق.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[["12,400+", "وثيقة قانونية"], ["18", "جامعة شريكة"], ["28,000+", "باحث مسجّل"], ["2018", "سنة التأسيس"]].map(([v, l]) => (
            <div key={l}>
              <div className="text-3xl font-bold text-primary mb-1">{v}</div>
              <div className="text-sm text-muted-foreground" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>رسالتنا وقيمنا</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {VALUES.map(v => (
            <div key={v.title} className="bg-white border border-border rounded-xl p-5 flex gap-4 hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-primary shrink-0">{v.icon}</div>
              <div>
                <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>{v.title}</h3>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section id="team" className="bg-gray-50 border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>هيئة التحرير</h2>
          <p className="text-center text-sm text-muted-foreground mb-10" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>نخبة من أساتذة القانون والباحثين الأكاديميين المغاربة</p>
          <div className="grid md:grid-cols-2 gap-5">
            {TEAM.map(m => (
              <div key={m.name} className="bg-white border border-border rounded-xl p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-primary font-bold text-lg shrink-0" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>
                  {m.name.charAt(3)}
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>{m.name}</div>
                  <div className="text-xs text-primary font-medium" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{m.role}</div>
                  <div className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{m.specialty}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="max-w-5xl mx-auto px-6 py-14">
        <h2 className="text-2xl font-bold text-foreground mb-2 text-center" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>شركاؤنا الأكاديميون</h2>
        <p className="text-center text-sm text-muted-foreground mb-10" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>نتعاون مع أبرز كليات الحقوق في المملكة المغربية</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PARTNERS.map(p => (
            <div key={p} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0"><Award size={14} className="text-primary" /></div>
              <span className="text-sm text-foreground" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{p}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
