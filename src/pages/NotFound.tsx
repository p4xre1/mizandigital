import { Link } from "react-router-dom";
import { Scale, Search, Home } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../lib/i18n";
import { useSeo } from "../lib/seo";

export default function NotFound(): React.JSX.Element {
  const { lang, dir } = useI18n();

  useSeo(
    {
      title:
        lang === "ar"
          ? "الصفحة غير موجودة (404)"
          : lang === "fr"
          ? "Page non trouvée (404)"
          : lang === "es"
          ? "Página no encontrada (404)"
          : "Page Not Found (404)",
      description: "منصة ميزان — المجلة القانونية الرقمية",
      path: "/404",
      lang,
      noindex: true,
    },
    [lang]
  );

  return (
    <div
      className="min-h-[75vh] flex items-center justify-center px-6 py-16 bg-background transition-colors duration-200"
      dir={dir}
    >
      <div className="text-center max-w-md">
        {/* Visual Icon Header */}
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Scale size={36} className="text-primary/70" aria-hidden="true" />
        </div>

        {/* Status Code & Title */}
        <h1 className="text-6xl font-extrabold text-foreground mb-2 font-mono tracking-tight">
          404
        </h1>
        <h2
          className="text-xl sm:text-2xl font-bold text-foreground mb-3"
          style={{ fontFamily: serifFont(lang) }}
        >
          {lang === "ar" && "الصفحة غير موجودة"}
          {lang === "fr" && "Page non trouvée"}
          {lang === "en" && "Page Not Found"}
          {lang === "es" && "Página no encontrada"}
        </h2>

        {/* Descriptive Message */}
        <p
          className="text-muted-foreground text-sm mb-8 leading-relaxed"
          style={{ fontFamily: sansFont(lang) }}
        >
          {lang === "ar" &&
            "عذراً، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها. تحقق من الرابط أو ابحث في المكتبة القانونية."}
          {lang === "fr" &&
            "Désolé, la page que vous recherchez n'est pas disponible ou a été déplacée. Vérifiez le lien ou recherchez dans la bibliothèque."}
          {lang === "en" &&
            "Sorry, the page you are looking for is unavailable or has been moved. Check the URL or search the legal library."}
          {lang === "es" &&
            "Lo sentimos, la página que busca no está disponible o ha sido movida. Verifique el enlace o busque en la biblioteca."}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={`/${lang}`}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm shadow-sm min-h-[44px]"
            style={{ fontFamily: sansFont(lang) }}
          >
            <Home size={16} aria-hidden="true" />
            <span>
              {lang === "ar" && "العودة للرئيسية"}
              {lang === "fr" && "Retour à l'accueil"}
              {lang === "en" && "Back to Home"}
              {lang === "es" && "Volver al inicio"}
            </span>
          </Link>

          <Link
            to={`/${lang}/archive`}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-border text-foreground bg-card rounded-xl hover:border-primary hover:text-primary transition-colors text-sm min-h-[44px]"
            style={{ fontFamily: sansFont(lang) }}
          >
            <Search size={16} aria-hidden="true" />
            <span>
              {lang === "ar" && "البحث في ميزان"}
              {lang === "fr" && "Rechercher sur Mizan"}
              {lang === "en" && "Search Mizan"}
              {lang === "es" && "Buscar en Mizan"}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}