import React from "react";
import { Check, Zap, GraduationCap, ShieldCheck, HelpCircle } from "lucide-react";
import { useI18n, serifFont, sansFont, useLocalizedPath } from "../lib/i18n";
import { trackEvent } from "../lib/analytics";
import { useSeo } from "../lib/seo";

export default function Pricing() {
  const { lang, dir } = useI18n();
  const localizedPath = useLocalizedPath();

  useSeo(
    {
      title:
        lang === "ar"
          ? "خطط الاشتراك والأسعار"
          : lang === "fr"
          ? "Tarifs et Abonnements"
          : lang === "es"
          ? "Planes y Precios"
          : "Pricing & Plans",
      description:
        "استثمر في مسارك القانوني مع باقات منصة ميزان للوصول غير المحدود للمراجع والتحليلات القانونية.",
      path: "/pricing",
      lang,
    },
    [lang]
  );

  const handleCheckoutRedirect = (planKey: string) => {
    trackEvent(`checkout_initiated_${planKey}`);

    const messages: Record<string, string> = {
      ar: `جاري تحويلك إلى بوابة الدفع الآمنة لتفعيل باقة [${planKey.toUpperCase()}]...`,
      fr: `Redirection vers le guichet de paiement sécurisé pour le forfait [${planKey.toUpperCase()}]...`,
      en: `Redirecting to secure Stripe gateway for [${planKey.toUpperCase()}] plan...`,
      es: `Redirigiendo a la pasarela de pago segura para el plan [${planKey.toUpperCase()}]...`,
    };

    alert(messages[lang] || messages.ar);
  };

  return (
    <div
      className="max-w-6xl mx-auto px-4 py-16 bg-background transition-colors duration-200"
      dir={dir}
    >
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4"
          style={{ fontFamily: serifFont(lang) }}
        >
          {lang === "ar" && "استثمر في مسارك القانوني"}
          {lang === "fr" && "Investissez dans votre parcours juridique"}
          {lang === "en" && "Invest in Your Legal Mastery"}
          {lang === "es" && "Invierta en su carrera jurídica"}
        </h1>
        <p
          className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed"
          style={{ fontFamily: sansFont(lang) }}
        >
          {lang === "ar" &&
            "تصفّح موسوعات الأحكام والمذكرات دون إعلانات وبتحليلات معّمقة مصممة خصيصاً للقضاة والطلاب والمحامين."}
          {lang === "fr" &&
            "Consultez les jurisprudences et modèles de conclusions sans publicité, avec des analyses approfondies."}
          {lang === "en" &&
            "Access comprehensive judicial commentary, model briefs, and research tools completely ad-free."}
          {lang === "es" &&
            "Acceda a jurisprudencia comentada, modelos de escritos y herramientas de investigación sin publicidad."}
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* 1. FREE PLAN */}
        <div className="bg-card border border-border rounded-2xl p-8 relative flex flex-col justify-between min-h-[500px] shadow-sm hover:shadow-md transition-shadow">
          <div>
            <h3
              className="text-lg font-bold text-foreground flex items-center gap-2"
              style={{ fontFamily: serifFont(lang) }}
            >
              {lang === "ar" && "الباقة الأساسية"}
              {lang === "fr" && "Formule Basique"}
              {lang === "en" && "Basic Academic"}
              {lang === "es" && "Plan Básico"}
            </h3>
            <p
              className="mt-2 text-xs text-slate-500 dark:text-slate-400"
              style={{ fontFamily: sansFont(lang) }}
            >
              {lang === "ar" && "الولوج اليومي المحدود للبحوث القانونية."}
              {lang === "fr" && "Accès quotidien limité aux recherches juridiques."}
              {lang === "en" && "Essential reading access for standard preparation."}
              {lang === "es" && "Acceso diario limitado para investigación jurídica."}
            </p>
            <div className="mt-6 flex items-baseline text-foreground">
              <span className="text-4xl font-extrabold tracking-tight font-mono">0</span>
              <span
                className="ms-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400"
                style={{ fontFamily: sansFont(lang) }}
              >
                {lang === "ar" && "درهم / أبدًا"}
                {lang === "fr" && "MAD / toujours"}
                {lang === "en" && "MAD / forever"}
                {lang === "es" && "MAD / gratis"}
              </span>
            </div>

            <ul
              className="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300"
              style={{ fontFamily: sansFont(lang) }}
            >
              <li className="flex items-center gap-3">
                <Check size={16} className="text-primary shrink-0" aria-hidden="true" />
                <span>
                  {lang === "ar" && "قراءة المقالات العامة والأحكام الأساسية"}
                  {lang === "fr" && "Lecture des articles publics et arrêts de base"}
                  {lang === "en" && "Read public briefs & standard rulings"}
                  {lang === "es" && "Lectura de artículos públicos y fallos básicos"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-primary shrink-0" aria-hidden="true" />
                <span>
                  {lang === "ar" && "تحديث الملف الشخصي الأكاديمي"}
                  {lang === "fr" && "Mise à jour du profil académique"}
                  {lang === "en" && "Basic academic profile folder"}
                  {lang === "es" && "Actualización de perfil académico"}
                </span>
              </li>
              <li className="text-slate-400 dark:text-slate-500 line-through flex items-center gap-3">
                <XMarker />
                <span>
                  {lang === "ar" && "تصفح هادئ وبدون إعلانات"}
                  {lang === "fr" && "Navigation sans aucune publicité"}
                  {lang === "en" && "Ad-free quiet browsing"}
                  {lang === "es" && "Navegación sin publicidad"}
                </span>
              </li>
            </ul>
          </div>

          <button
            disabled
            className="mt-8 w-full py-3 bg-muted text-muted-foreground rounded-xl text-xs font-semibold cursor-not-allowed min-h-[44px]"
            style={{ fontFamily: sansFont(lang) }}
          >
            {lang === "ar" && "خطتك الحالية"}
            {lang === "fr" && "Votre forfait actuel"}
            {lang === "en" && "Your Current Plan"}
            {lang === "es" && "Su plan actual"}
          </button>
        </div>

        {/* 2. PREMIUM PLAN (POPULAR) */}
        <div className="bg-card border-2 border-primary rounded-2xl p-8 relative flex flex-col justify-between min-h-[520px] shadow-lg transform lg:-translate-y-2">
          <div
            className="absolute top-0 -translate-y-1/2 start-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-full shadow-sm"
            style={{ fontFamily: sansFont(lang) }}
          >
            {lang === "ar" && "الأكثر اختياراً"}
            {lang === "fr" && "Le plus populaire"}
            {lang === "en" && "Most Popular"}
            {lang === "es" && "Más popular"}
          </div>
          <div>
            <h3
              className="text-lg font-bold text-foreground flex items-center gap-2"
              style={{ fontFamily: serifFont(lang) }}
            >
              <Zap size={18} className="text-amber-500 fill-amber-500/20" aria-hidden="true" />
              {lang === "ar" && "ميزان بريميوم"}
              {lang === "fr" && "Mizan Premium"}
              {lang === "en" && "Mizan Premium"}
              {lang === "es" && "Mizan Premium"}
            </h3>
            <p
              className="mt-2 text-xs text-slate-500 dark:text-slate-400"
              style={{ fontFamily: sansFont(lang) }}
            >
              {lang === "ar" && "للمحامين والباحثين عن الكفاءة والسرعة المطلقة."}
              {lang === "fr" && "Pour avocats, juristes et chercheurs exigeants."}
              {lang === "en" && "For legal consultants, lawyers, and serious researchers."}
              {lang === "es" && "Para abogados, consultores e investigadores."}
            </p>
            <div className="mt-6 flex items-baseline text-foreground">
              <span className="text-4xl font-extrabold tracking-tight font-mono">49</span>
              <span
                className="ms-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400"
                style={{ fontFamily: sansFont(lang) }}
              >
                {lang === "ar" && "درهم / شهرياً"}
                {lang === "fr" && "MAD / mois"}
                {lang === "en" && "MAD / month"}
                {lang === "es" && "MAD / mes"}
              </span>
            </div>

            <ul
              className="mt-8 space-y-4 text-sm text-foreground"
              style={{ fontFamily: sansFont(lang) }}
            >
              <li className="flex items-center gap-3">
                <Check size={16} className="text-emerald-500 shrink-0" aria-hidden="true" />
                <span className="font-semibold">
                  {lang === "ar" && "إخفاء تام للإعلانات بنسبة 100%"}
                  {lang === "fr" && "Expérience 100% sans publicité"}
                  {lang === "en" && "100% Ad-Free Experience"}
                  {lang === "es" && "Experiencia 100% libre de publicidad"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-emerald-500 shrink-0" aria-hidden="true" />
                <span>
                  {lang === "ar" && "تحميل قوالب المذكرات بصيغة Word / PDF"}
                  {lang === "fr" && "Téléchargement des modèles Word / PDF"}
                  {lang === "en" && "Download document templates & briefs"}
                  {lang === "es" && "Descarga de modelos en Word / PDF"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-emerald-500 shrink-0" aria-hidden="true" />
                <span>
                  {lang === "ar" && "الولوج للتعليقات الفقهية والتحليلات القضائية"}
                  {lang === "fr" && "Accès aux analyses doctrinales approfondies"}
                  {lang === "en" && "Unlock jurisprudential deep-dives"}
                  {lang === "es" && "Acceso a comentarios doctrinales y análisis"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-emerald-500 shrink-0" aria-hidden="true" />
                <span>
                  {lang === "ar" && "دعم فني عالي الأولوية"}
                  {lang === "fr" && "Support client prioritaire"}
                  {lang === "en" && "Priority customer support channel"}
                  {lang === "es" && "Atención al cliente prioritaria"}
                </span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleCheckoutRedirect("premium")}
            className="mt-8 w-full py-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow hover:bg-primary/90 transition-all min-h-[44px]"
            style={{ fontFamily: sansFont(lang) }}
          >
            {lang === "ar" && "اشترك الآن بأمان"}
            {lang === "fr" && "S'abonner en toute sécurité"}
            {lang === "en" && "Upgrade to Premium Instantly"}
            {lang === "es" && "Suscribirse ahora"}
          </button>
        </div>

        {/* 3. ENTERPRISE / UNIVERSITY PLAN */}
        <div className="bg-card border border-border rounded-2xl p-8 relative flex flex-col justify-between min-h-[500px] shadow-sm hover:shadow-md transition-shadow">
          <div>
            <h3
              className="text-lg font-bold text-foreground flex items-center gap-2"
              style={{ fontFamily: serifFont(lang) }}
            >
              <GraduationCap size={18} className="text-indigo-500" aria-hidden="true" />
              {lang === "ar" && "الولوج الجامعي"}
              {lang === "fr" && "Accès Institutionnel"}
              {lang === "en" && "Institutional B2B"}
              {lang === "es" && "Acceso Institucional"}
            </h3>
            <p
              className="mt-2 text-xs text-slate-500 dark:text-slate-400"
              style={{ fontFamily: sansFont(lang) }}
            >
              {lang === "ar" && "شراكات الجامعات والمكاتب الكبرى."}
              {lang === "fr" && "Partenariats pour universités et grands cabinets."}
              {lang === "en" && "Enterprise licensing for law schools or firms."}
              {lang === "es" && "Para universidades y grandes despachos."}
            </p>
            <div className="mt-6 flex items-baseline text-foreground">
              <span
                className="text-3xl font-extrabold tracking-tight"
                style={{ fontFamily: serifFont(lang) }}
              >
                {lang === "ar" && "عقد مخصص"}
                {lang === "fr" && "Sur devis"}
                {lang === "en" && "Custom"}
                {lang === "es" && "A medida"}
              </span>
            </div>

            <ul
              className="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300"
              style={{ fontFamily: sansFont(lang) }}
            >
              <li className="flex items-center gap-3">
                <Check size={16} className="text-indigo-500 shrink-0" aria-hidden="true" />
                <span>
                  {lang === "ar" && "تفعيل تلقائي بالبريد الجامعي الرسمي"}
                  {lang === "fr" && "Activation automatique via email universitaire"}
                  {lang === "en" && "Instant mapping via institutional email"}
                  {lang === "es" && "Activación por correo institucional"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-indigo-500 shrink-0" aria-hidden="true" />
                <span>
                  {lang === "ar" && "لوحة تحكم إدارية للعمداء والمشرفين"}
                  {lang === "fr" && "Panneau d'administration pour les responsables"}
                  {lang === "en" && "Admin auditing panel for faculty leadership"}
                  {lang === "es" && "Panel de administración para responsables"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-indigo-500 shrink-0" aria-hidden="true" />
                <span>
                  {lang === "ar" && "تكامل مخصص مع أنظمة SSO التابعة لك"}
                  {lang === "fr" && "Intégration SSO / SAML sur mesure"}
                  {lang === "en" && "SAML / SSO connection compatibility"}
                  {lang === "es" && "Integración con sistemas SSO"}
                </span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleCheckoutRedirect("enterprise")}
            className="mt-8 w-full py-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl text-xs font-semibold transition-colors min-h-[44px]"
            style={{ fontFamily: sansFont(lang) }}
          >
            {lang === "ar" && "تواصل مع قسم المبيعات"}
            {lang === "fr" && "Contacter l'équipe commerciale"}
            {lang === "en" && "Contact Academic Sales"}
            {lang === "es" && "Contactar con ventas"}
          </button>
        </div>
      </div>

      {/* Trust Footer */}
      <div className="mt-16 border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500" aria-hidden="true" />
          <span style={{ fontFamily: sansFont(lang) }}>
            {lang === "ar" && "دفع آمن ومشفر 256-بت بواسطة Stripe"}
            {lang === "fr" && "Paiement sécurisé et chiffré 256 bits par Stripe"}
            {lang === "en" && "Securely processed and encrypted by Stripe"}
            {lang === "es" && "Pago seguro y cifrado de 256 bits por Stripe"}
          </span>
        </div>
        <a
          href={localizedPath("/contact")}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          style={{ fontFamily: sansFont(lang) }}
        >
          <HelpCircle size={14} aria-hidden="true" />
          <span>
            {lang === "ar" && "لديك بريد جامعي؟ تعلم كيف تلج مجاناً"}
            {lang === "fr" && "Un email universitaire ? Découvrez l'accès gratuit"}
            {lang === "en" && "Have an institutional email? Learn how to bind free"}
            {lang === "es" && "¿Tiene correo institucional? Acceda gratis"}
          </span>
        </a>
      </div>
    </div>
  );
}

// Localized Cancellation Marker Helper
function XMarker() {
  return (
    <svg
      className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}