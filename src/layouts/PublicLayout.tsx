import { Outlet } from "react-router-dom"
import { Header, Footer } from "./PublicNavigation"
// AdsterraAd removed
// SocialBarAd removed
// PopunderAd removed

export default function PublicLayout({
  theme,
  menuOpen,
  onToggleTheme,
  onToggleMenu,
  onCloseMenu,
}: {
  theme: "light" | "dark"
  menuOpen: boolean
  onToggleTheme: () => void
  onToggleMenu: () => void
  onCloseMenu?: () => void
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        theme={theme}
        menuOpen={menuOpen}
        onToggleTheme={onToggleTheme}
        onToggleMenu={onToggleMenu}
        onCloseMenu={onCloseMenu}
      />

      {/* إعلان علوي — وحدة Adsterra (Banner 320x50)، يظهر فـ كل الصفحات العامة */}
      <div className="flex justify-center bg-muted/20 py-1.5" data-pdf-exclude="true">
        {/* Ad removed */}
      </div>

      <Outlet />

      {/* إعلان سفلي قبل الفوتر — وحدة Adsterra (Banner 300x250) */}
      <div className="flex justify-center border-t border-border bg-muted/20 py-4" data-pdf-exclude="true">
        {/* Ad removed */}
      </div>

      <Footer />

      {/*
        وحدات الربح (Monetization) على مستوى التخطيط العام — مرة واحدة فقط
        لكل الصفحات العامة، بلا ما تأثر على CSP ديال باقي الموقع (نفس
        معمارية الإطار المعزول /ads/frame.html المستعملة أعلاه). طالما
        scriptSrc ديالهم مازال يحتوي "REPLACE-WITH-YOUR-DOMAIN"، AdsterraAd
        ما غاديش يحمّل حتى إطار — شوف SocialBarAd.tsx / PopunderAd.tsx.
      */}
      {/* SocialBarAd removed */}
      {/* PopunderAd removed */}
    </div>
  )
}