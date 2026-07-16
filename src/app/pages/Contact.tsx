import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";
import { submitContact, ValidationError, isSupabaseConfigured } from "../lib/supabase";
import { trackEvent } from "../lib/analytics";
import { isValidEmail, looksLikeSpam, sanitizeText, throttle } from "../lib/security";

const ERR: Record<string, string> = {
  name_too_short: "الرجاء إدخال اسم صحيح.",
  invalid_email: "عنوان البريد الإلكتروني غير صالح.",
  message_too_short: "الرسالة قصيرة جداً (10 أحرف على الأقل).",
  spam_detected: "تعذّر إرسال الرسالة — تم رصد محتوى مشبوه.",
  rate_limited: "لقد أرسلت رسالة للتو. الرجاء الانتظار قليلاً قبل المحاولة مجدداً.",
  generic: "حدث خطأ أثناء الإرسال. الرجاء المحاولة لاحقاً.",
};

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  // Honeypot: real users never fill this hidden field; bots do.
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Honeypot — silently drop bot submissions (pretend success).
    if (website.trim() !== "") { setSent(true); return; }

    // 2. Client-side validation for immediate feedback.
    if (sanitizeText(form.name, 120).length < 2) { setError(ERR.name_too_short); return; }
    if (!isValidEmail(form.email)) { setError(ERR.invalid_email); return; }
    if (sanitizeText(form.message, 5000).length < 10) { setError(ERR.message_too_short); return; }
    if (looksLikeSpam(`${form.name} ${form.subject} ${form.message}`)) { setError(ERR.spam_detected); return; }

    // 3. Rate limit — one submission per 30s per browser.
    const wait = throttle("contact", 30_000);
    if (wait > 0) { setError(ERR.rate_limited); return; }

    setLoading(true);
    try {
      await submitContact(form);
      trackEvent("contact_form_submit", { subject: form.subject });
      setSent(true);
    } catch (err) {
      if (err instanceof ValidationError) {
        setError(ERR[err.message] || ERR.generic);
      } else if (!isSupabaseConfigured) {
        // Backend not wired up yet — allow demo success only when unconfigured.
        setSent(true);
      } else {
        console.error("Contact submit failed:", err);
        setError(ERR.generic);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-14" dir="rtl">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-foreground mb-3" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>اتصل بنا</h1>
        <p className="text-muted-foreground max-w-xl mx-auto" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
          فريق ميزان في خدمتكم — للاستفسارات الأكاديمية، الشراكات، أو اقتراح محتوى.
        </p>
      </div>

      <div className="grid md:grid-cols-[1fr_340px] gap-10">
        {/* Form */}
        <div className="bg-white border border-border rounded-2xl p-7">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle size={48} className="text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>تم الإرسال بنجاح!</h3>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                شكراً لتواصلك معنا. سيرد عليك فريقنا خلال 24-48 ساعة.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Honeypot — visually hidden & removed from tab order; bots fill it, humans don't */}
              <div aria-hidden="true" className="absolute w-px h-px overflow-hidden -left-[9999px]">
                <label>Website
                  <input type="text" tabIndex={-1} autoComplete="off" value={website}
                    onChange={e => setWebsite(e.target.value)} />
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>الاسم الكامل *</label>
                  <input required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="محمد أمين"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-gray-50 focus:outline-none focus:border-primary transition-colors text-right"
                    style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>البريد الإلكتروني *</label>
                  <input required type="email" maxLength={254} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="example@email.com"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-gray-50 focus:outline-none focus:border-primary transition-colors"
                    dir="ltr" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>الموضوع</label>
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-gray-50 focus:outline-none focus:border-primary transition-colors text-right"
                  style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                  <option value="">اختر موضوعاً</option>
                  <option>استفسار أكاديمي</option>
                  <option>اقتراح محتوى</option>
                  <option>طلب شراكة</option>
                  <option>الإبلاغ عن خطأ</option>
                  <option>أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>الرسالة *</label>
                <textarea required maxLength={5000} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  rows={5} placeholder="اكتب رسالتك هنا..."
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-gray-50 focus:outline-none focus:border-primary transition-colors resize-none text-right"
                  style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }} />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                {loading ? "جاري الإرسال..." : <><Send size={15} /> إرسال الرسالة</>}
              </button>
            </form>
          )}
        </div>

        {/* Info */}
        <aside className="space-y-5">
          {[
            { icon: <Mail size={18} />, label: "البريد الإلكتروني", value: "contact@mizan.ma" },
            { icon: <Phone size={18} />, label: "الهاتف", value: "+212 5 37 XX XX XX" },
            { icon: <MapPin size={18} />, label: "العنوان", value: "الرباط، المملكة المغربية" },
          ].map(c => (
            <div key={c.label} className="bg-white border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-primary shrink-0">{c.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{c.label}</p>
                <p className="text-sm font-semibold text-foreground">{c.value}</p>
              </div>
            </div>
          ))}

          <div className="bg-accent border border-blue-100 rounded-xl p-5">
            <h4 className="font-bold text-primary mb-2 text-sm" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>ساعات العمل</h4>
            <div className="space-y-1.5 text-xs" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
              <div className="flex justify-between text-foreground">
                <span>الإثنين — الجمعة</span><span className="font-medium">09:00 — 17:00</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>السبت</span><span>09:00 — 13:00</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>الأحد</span><span>مغلق</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
