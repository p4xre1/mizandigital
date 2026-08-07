import { Link, useParams, useLocation } from "react-router-dom";
import { Home, Newspaper, BookOpen, User, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const ALLOWED_LANGS = ["ar", "fr", "en", "es"] as const;
type Lang = (typeof ALLOWED_LANGS)[number];

const LABELS: Record<Lang, { home: string; news: string; library: string; profile: string; login: string }> = {
  ar: { home: "الرئيسية", news: "الأخبار", library: "المكتبة", profile: "حسابي", login: "دخول" },
  fr: { home: "Accueil", news: "Actualités", library: "Bibliothèque", profile: "Profil", login: "Connexion" },
  en: { home: "Home", news: "News", library: "Library", profile: "Profile", login: "Login" },
  es: { home: "Inicio", news: "Noticias", library: "Biblioteca", profile: "Perfil", login: "Entrar" },
};

const ICONS = {
  home: Home,
  news: Newspaper,
  library: BookOpen,
  profile: User,
  login: LogIn,
};

export function MobileTabBar() {
  const { lang: rawLang } = useParams<{ lang?: string }>();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  const lang: Lang = ALLOWED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : "ar";
  const t = LABELS[lang];

  // Sync auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) =>
    path === `/${lang}` ? location.pathname === path : location.pathname.startsWith(path);

  const tabs = [
    { key: "home", path: `/${lang}`, icon: ICONS.home, label: t.home },
    { key: "news", path: `/${lang}/news`, icon: ICONS.news, label: t.news },
    { key: "library", path: `/${lang}/library`, icon: ICONS.library, label: t.library },
    {
      key: user ? "profile" : "login",
      path: user ? `/${lang}/profile` : `/${lang}/login`,
      icon: user ? ICONS.profile : ICONS.login,
      label: user ? t.profile : t.login,
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-xl md:hidden safe-area-pb"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.key}
              to={tab.path}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className={`
                group relative flex flex-col items-center justify-center 
                min-h-[56px] min-w-[64px] py-1 px-2
                transition-all duration-200 ease-out
                ${active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {/* Active indicator dot */}
              {active && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-in zoom-in" />
              )}

              <Icon 
                size={22} 
                strokeWidth={active ? 2.5 : 2}
                className={`transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-105"}`}
              />

              <span className={`
                mt-0.5 text-[10px] font-semibold leading-none
                transition-all duration-200
                ${active ? "opacity-100" : "opacity-70"}
              `}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
