import { useI18n, serifFont, sansFont } from "../lib/i18n";
import { useSeo } from "../lib/seo";

export default function About() {
  const { lang, dir } = useI18n();

  useSeo(
    {
      title:
        lang === "ar"
          ? "من نحن"
          : lang === "fr"
          ? "À propos de nous"
          : lang === "es"
          ? "Sobre nosotros"
          : "About Us",
      description:
        "منصة ميزان هي المجلة القانونية الرقمية الأولى المتخصصة في توثيق وأرشفة المحتوى القانوني المغربي.",
      path: "/about",
      lang,
    },
    [lang]
  );

  return (
    <div className="bg-background transition-colors duration-200" dir={dir}>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20 text-center">
          <h1
            className="text-3xl md:text-4xl font-extrabold mb-4"
            style={{ fontFamily: serifFont(lang) }}
          >
            {lang === "ar" && "من نحن — منصة ميزان"}
            {lang === "fr" && "À propos de nous — Plateforme Mizan"}
            {lang === "en" && "About Us — Mizan Platform"}
            {lang === "es" && "Sobre nosotros — Plataforma Mizan"}
          </h1>
          <p
            className="text-blue-100/90 text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: sansFont(lang) }}
          >
            {lang === "ar" &&
              "منصة ميزان هي المجلة القانونية الرقمية الأولى المتخصصة في توثيق وأرشفة المحتوى القانوني المغربي، وتخدم الطلاب والباحثين والمهنيين في مجال الحقوق."}
            {lang === "fr" &&
              "Mizan est la première revue juridique numérique spécialisée dans la documentation et l'archivage du contenu juridique marocain, au service des étudiants, chercheurs et professionnels du droit."}
            {lang === "en" &&
              "Mizan is the leading digital legal journal dedicated to documenting and archiving Moroccan legal content, serving students, researchers, and legal professionals."}
            {lang === "es" &&
              "Mizan es la primera revista jurídica digital especializada en documentar y archivar el contenido jurídico marroquí, al servicio de estudiantes, investigadores y profesionales del derecho."}
          </p>
        </div>
      </section>
    </div>
  );
}