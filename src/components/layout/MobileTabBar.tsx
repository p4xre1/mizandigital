import { Link, useParams, useLocation } from "react-router-dom";

const ALLOWED_LANGS = ["ar", "fr", "en", "es"] as const;
type Lang = (typeof ALLOWED_LANGS)[number];

const LABELS: Record<Lang, { home: string; news: string; library: string }> = {
  ar: { home: "الرئيسية", news: "الأخبار", library: "المكتبة" },
  fr: { home: "Accueil", news: "Actualités", library: "Bibliothèque" },
  en: { home: "Home", news: "News", library: "Library" },
  es: { home: "Inicio", news: "Noticias", library: "Biblioteca" },
};

export function MobileTabBar() {
  const { lang: rawLang } = useParams<{ lang?: string }>();
  const location = useLocation();

  const lang: Lang = ALLOWED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : "ar";
  const t = LABELS[lang];

  const isActive = (path: string) =>
    path === `/${lang}` ? location.pathname === path : location.pathname.includes(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-4 py-2 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg justify-between text-sm font-medium">
        <Link
          to={`/${lang}`}
          className={isActive(`/${lang}`) ? "text-primary" : "text-muted-foreground"}
        >
          {t.home}
        </Link>
        <Link
          to={`/${lang}/news`}
          className={isActive(`/${lang}/news`) ? "text-primary" : "text-muted-foreground"}
        >
          {t.news}
        </Link>
        <Link
          to={`/${lang}/library`}
          className={isActive(`/${lang}/library`) ? "text-primary" : "text-muted-foreground"}
        >
          {t.library}
        </Link>
      </div>
    </nav>
  );
}