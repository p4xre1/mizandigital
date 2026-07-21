import { Navbar } from './components/Navbar';
import { DeveloperBuilder } from './components/DeveloperBuilder';
import { Footer } from './components/Footer';
import { useI18n, serifFont, sansFont, type Lang } from './lib/i18n';

// Multilingual helper type
type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({ ar, fr, en, es });

// Translations for the Home page banner
const txt = {
  sectionTitle: t4(
    "🎓 المساحة التعليمية والمنصة",
    "🎓 Espace Éducatif et Plateforme",
    "🎓 Educational Space & Platform",
    "🎓 Espacio Educativo y Plataforma"
  ),
  sectionDesc: t4(
    "أهلاً بك في الواجهة الرئيسية المخصصة للهواتف الذكية والحواسب. كافة المزايا والمحتويات تخضع لشروط الاستخدام وإخلاء المسؤولية القانوني.",
    "Bienvenue sur l'interface principale adaptée aux mobiles et ordinateurs. Tous les contenus sont soumis aux conditions d'utilisation et à la clause de non-responsabilité.",
    "Welcome to the main mobile and desktop portal. All features and content are subject to terms of use and legal disclaimers.",
    "Bienvenido al portal principal para móviles y ordenadores. Todos los contenidos están sujetos a los términos de uso y al aviso legal."
  ),
};

export default function Home() {
  const { lang, dir } = useI18n();

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200" 
      dir={dir}
    >
      <div>
        <Navbar />
        <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
          <DeveloperBuilder />
          
          <section 
            className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center transition-colors"
            aria-labelledby="educational-space-heading"
          >
            <h2 
              id="educational-space-heading"
              className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-2" 
              style={{ fontFamily: serifFont(lang) }}
            >
              {txt.sectionTitle[lang]}
            </h2>
            <p 
              className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl mx-auto" 
              style={{ fontFamily: sansFont(lang) }}
            >
              {txt.sectionDesc[lang]}
            </p>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}