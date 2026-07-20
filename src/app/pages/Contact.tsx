import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";
import { submitContact, ValidationError, isSupabaseConfigured } from "../lib/supabase";
import { trackEvent } from "../lib/analytics";
import { isValidEmail, looksLikeSpam, sanitizeText, throttle } from "../lib/security";
import { useI18n, serifFont, sansFont } from "../lib/i18n";
import { useSeo } from "../lib/seo";

// Multi-language Error Messages
const ERR: Record<string, Record<string, string>> = {
  name_too_short: {
    ar: "الرجاء إدخال اسم صحيح.",
    fr: "Veuillez entrer un nom valide.",
    en: "Please enter a valid name.",
    es: "Por favor, introduzca un nombre válido.",
  },
  invalid_email: {
    ar: "عنوان البريد الإلكتروني غير صالح.",
    fr: "Adresse e-mail non valide.",
    en: "Invalid email address.",
    es: "Dirección de correo electrónico no válida.",
  },
  message_too_short: {
    ar: "الرسالة قصيرة جداً (10 أحرف على الأقل).",
    fr: "Le message est trop court (10 caractères minimum).",
    en: "Message is too short (at least 10 characters).",
    es: "El mensaje es demasiado corto (al menos 10 caracteres).",
  },
  spam_detected: {
    ar: "تعذّر إرسال الرسالة — تم رصد محتوى مشبوه.",
    fr: "Impossible d'envoyer le message — contenu suspect détecté.",
    en: "Failed to send — suspicious content detected.",
    es: "No se pudo enviar — contenido sospechoso detectado.",
  },
  rate_limited: {
    ar: "لقد أرسلت رسالة للتو. الرجاء الانتظار قليلاً قبل المحاولة مجدداً.",
    fr: "Vous venez d'envoyer un message. Veuillez patienter avant de réessayer.",
    en: "You recently sent a message. Please wait before trying again.",
    es: "Acaba de enviar un mensaje. Espere un momento antes de volver a intentarlo.",
  },
  generic: {
    ar: "حدث خطأ أثناء الإرسال. الرجاء المحاولة لاحقاً.",
    fr: "Une erreur est survenue. Veuillez réessayer plus tard.",
    en: "An error occurred. Please try again later.",
    es: "Ocurrió un error. Por favor, inténtelo de nuevo más tarde.",
  },
};

export default function Contact() {
  const { lang, dir } = useI18n();

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  // Honeypot field for bot detection
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useSeo(
    {
      title:
        lang === "ar"
          ? "اتصل بنا"
          : lang === "fr"
          ? "Contactez-nous"
          : lang === "es"
          ? "Contáctenos"
          : "Contact Us",
      description: "فريق مجلة ميزان الرقمية في خدمتكم للاستفسارات والشراكات الأكاديمية",
      path: "/contact",
      lang,
    },
    [lang]
  );

  const getErrorMessage = (key: string) => {
    return ERR[key]?.[lang] || ERR[key]?.ar || ERR.generic[lang];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Honeypot check — silently ignore bots
    if (website.trim() !== "") {
      setSent(true);
      return;
    }

    // 2. Client-side validation
    if (sanitizeText(form.name, 120).length < 2) {
      setError(getErrorMessage("name_too_short"));
      return;
    }
    if (!isValidEmail(form.email)) {
      setError(getErrorMessage("invalid_email"));
      return;
    }
    if (sanitizeText(form.message, 5000).length < 10) {
      setError(getErrorMessage("message_too_short"));
      return;
    }
    if (looksLikeSpam(`${form.name} ${form.subject} ${form.message}`)) {
      setError(getErrorMessage("spam_detected"));
      return;
    }

    // 3. Rate limiting (30 seconds interval)
    const wait = throttle("contact", 30_000);
    if (wait > 0) {
      setError(getErrorMessage("rate_limited"));
      return;
    }

    setLoading(true);
    try {
      await submitContact(form);
      trackEvent("contact_form_submit", { subject: form.subject });
      setSent(true);
    } catch (err) {
      if (err instanceof ValidationError) {
        setError(getErrorMessage(err.message));
      } else if (!isSupabaseConfigured) {
        // Fallback demo mode when Supabase isn't configured
        setSent(true);
      } else {
        console.error("Contact submit failed:", err);
        setError(getErrorMessage("generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="max-w-5xl mx-auto px-6 py-14 bg-background transition-colors duration-200"
      dir={dir}
    >
      {/* Title & Subtitle Header */}
      <div className="text-center mb-12">
        <h1
          className="text-3xl font-extrabold text-foreground mb-3"
          style={{ fontFamily: serifFont(lang) }}
        >
          {lang === "ar" && "اتصل بنا"}
          {lang === "fr" && "Contactez-nous"}
          {lang === "en" && "Contact Us"}
          {lang === "es" && "Contáctenos"}
        </h1>
        <p
          className="text-slate-600 dark:text-slate-300 max-w-xl mx-auto text-sm leading-relaxed"
          style={{ fontFamily: sansFont(lang) }}
        >
          {lang === "ar" && "فريق ميزان في خدمتكم — للاستفسارات الأكاديمية، الشراكات، أو اقتراح محتوى."}
          {lang === "fr" && "L'équipe Mizan est à votre service — pour demandes académiques, partenariats ou propositions."}
          {lang === "en" && "The Mizan team is at your service — for academic inquiries, partnerships, or content proposals."}
          {lang === "es" && "El equipo de Mizan está a su servicio — para consultas académicas, alianzas o sugerencias."}
        </p>
      </div>

      <div className="grid md:grid-cols-[1fr_340px] gap-10">
        {/* Contact Form Card */}
        <div className="bg-card border border-border rounded-2xl p-7 shadow-sm">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <h3
                className="text-xl font-bold text-foreground mb-2"
                style={{ fontFamily: serifFont(lang) }}
              >
                {lang === "ar" && "تم الإرسال بنجاح!"}
                {lang === "fr" && "Message envoyé avec succès !"}
                {lang === "en" && "Sent Successfully!"}
                {lang === "es" && "¡Enviado con éxito!"}
              </h3>
              <p
                className="text-sm text-slate-600 dark:text-slate-300 max-w-sm leading-relaxed"
                style={{ fontFamily: sansFont(lang) }}
              >
                {lang === "ar" && "شكراً لتواصلك معنا. سيرد عليك فريقنا خلال 24-48 ساعة."}
                {lang === "fr" && "Merci de nous avoir contactés. Notre équipe répondra sous 24 à 48 heures."}
                {lang === "en" && "Thank you for reaching out. Our team will reply within 24-48 hours."}
                {lang === "es" && "Gracias por contactarnos. Nuestro equipo responderá en 24-48 horas."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Honeypot Input */}
              <div aria-hidden="true" className="absolute w-px h-px overflow-hidden -left-[9999px]">
                <label htmlFor="website-field">Website</label>
                <input
                  id="website-field"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    {lang === "ar" && "الاسم الكامل *"}
                    {lang === "fr" && "Nom complet *"}
                    {lang === "en" && "Full Name *"}
                    {lang === "es" && "Nombre completo *"}
                  </label>
                  <input
                    id="contact-name"
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={lang === "ar" ? "محمد أمين" : "John Doe"}
                    className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-muted/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all min-h-[44px]"
                    style={{ fontFamily: sansFont(lang) }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    {lang === "ar" && "البريد الإلكتروني *"}
                    {lang === "fr" && "Adresse e-mail *"}
                    {lang === "en" && "Email Address *"}
                    {lang === "es" && "Correo electrónico *"}
                  </label>
                  <input
                    id="contact-email"
                    required
                    type="email"
                    maxLength={254}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="example@email.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-muted/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all min-h-[44px]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-subject"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {lang === "ar" && "الموضوع"}
                  {lang === "fr" && "Sujet"}
                  {lang === "en" && "Subject"}
                  {lang === "es" && "Asunto"}
                </label>
                <select
                  id="contact-subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-muted/30 focus:bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all min-h-[44px]"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  <option value="">
                    {lang === "ar" && "اختر موضوعاً"}
                    {lang === "fr" && "Choisissez un sujet"}
                    {lang === "en" && "Select a subject"}
                    {lang === "es" && "Seleccione un asunto"}
                  </option>
                  <option value="Academic Inquiry">
                    {lang === "ar" ? "استفسار أكاديمي" : lang === "fr" ? "Demande académique" : "Academic Inquiry"}
                  </option>
                  <option value="Content Proposal">
                    {lang === "ar" ? "اقتراح محتوى" : lang === "fr" ? "Proposition de contenu" : "Content Proposal"}
                  </option>
                  <option value="Partnership Request">
                    {lang === "ar" ? "طلب شراكة" : lang === "fr" ? "Demande de partenariat" : "Partnership Request"}
                  </option>
                  <option value="Bug Report">
                    {lang === "ar" ? "الإبلاغ عن خطأ" : lang === "fr" ? "Signaler un problème" : "Report an Issue"}
                  </option>
                  <option value="Other">
                    {lang === "ar" ? "أخرى" : lang === "fr" ? "Autre" : "Other"}
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {lang === "ar" && "الرسالة *"}
                  {lang === "fr" && "Message *"}
                  {lang === "en" && "Message *"}
                  {lang === "es" && "Mensaje *"}
                </label>
                <textarea
                  id="contact-message"
                  required
                  maxLength={5000}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={5}
                  placeholder={lang === "ar" ? "اكتب رسالتك هنا..." : "Type your message..."}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-muted/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                  style={{ fontFamily: sansFont(lang) }}
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/50 p-2.5 rounded-lg border border-red-200 dark:border-red-900/50">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60 min-h-[44px] shadow-sm"
                style={{ fontFamily: sansFont(lang) }}
              >
                {loading ? (
                  lang === "ar" ? "جاري الإرسال..." : lang === "fr" ? "Envoi en cours..." : "Sending..."
                ) : (
                  <>
                    <Send size={15} aria-hidden="true" />
                    <span>
                      {lang === "ar" && "إرسال الرسالة"}
                      {lang === "fr" && "Envoyer le message"}
                      {lang === "en" && "Send Message"}
                      {lang === "es" && "Enviar mensaje"}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Info Sidebar */}
        <aside className="space-y-5">
          {[
            {
              icon: <Mail size={18} aria-hidden="true" />,
              label:
                lang === "ar" ? "البريد الإلكتروني" : lang === "fr" ? "Adresse E-mail" : "Email Address",
              value: "contact@mizan.ma",
              href: "mailto:contact@mizan.ma",
            },
            {
              icon: <Phone size={18} aria-hidden="true" />,
              label: lang === "ar" ? "الهاتف" : lang === "fr" ? "Téléphone" : "Phone",
              value: "+212 5 37 00 00 00",
              href: "tel:+212537000000",
            },
            {
              icon: <MapPin size={18} aria-hidden="true" />,
              label: lang === "ar" ? "العنوان" : lang === "fr" ? "Adresse" : "Location",
              value:
                lang === "ar"
                  ? "الرباط، المملكة المغربية"
                  : lang === "fr"
                  ? "Rabat, Royaume du Maroc"
                  : "Rabat, Kingdom of Morocco",
              href: undefined,
            },
          ].map((c, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                {c.icon}
              </div>
              <div>
                <p
                  className="text-xs text-slate-500 dark:text-slate-400"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {c.label}
                </p>
                {c.href ? (
                  <a
                    href={c.href}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {c.value}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-foreground">{c.value}</p>
                )}
              </div>
            </div>
          ))}

          {/* Working Hours Box */}
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-5">
            <h4
              className="font-bold text-primary mb-3 text-sm"
              style={{ fontFamily: serifFont(lang) }}
            >
              {lang === "ar" && "ساعات العمل"}
              {lang === "fr" && "Heures d'ouverture"}
              {lang === "en" && "Working Hours"}
              {lang === "es" && "Horario de atención"}
            </h4>
            <div
              className="space-y-2 text-xs"
              style={{ fontFamily: sansFont(lang) }}
            >
              <div className="flex justify-between text-foreground">
                <span>
                  {lang === "ar" ? "الإثنين — الجمعة" : lang === "fr" ? "Lundi — Vendredi" : "Monday — Friday"}
                </span>
                <span className="font-semibold font-mono">09:00 — 17:00</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{lang === "ar" ? "السبت" : lang === "fr" ? "Samedi" : "Saturday"}</span>
                <span className="font-mono">09:00 — 13:00</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{lang === "ar" ? "الأحد" : lang === "fr" ? "Dimanche" : "Sunday"}</span>
                <span>
                  {lang === "ar" ? "مغلق" : lang === "fr" ? "Fermé" : "Closed"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}