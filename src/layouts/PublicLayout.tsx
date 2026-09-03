import { Outlet } from "react-router-dom"
import { Header, Footer } from "./PublicNavigation"
import { AdsterraAd } from "../components/ads/AdsterraAd"

export default function PublicLayout({
  theme,
  menuOpen,
  onToggleTheme,
  onToggleMenu,
}: {
  theme: "light" | "dark"
  menuOpen: boolean
  onToggleTheme: () => void
  onToggleMenu: () => void
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        theme={theme}
        menuOpen={menuOpen}
        onToggleTheme={onToggleTheme}
        onToggleMenu={onToggleMenu}
      />

      {/* إعلان علوي — وحدة Adsterra (Banner 320x50)، يظهر فـ كل الصفحات العامة */}
      <div className="flex justify-center bg-muted/20 py-1.5" data-pdf-exclude="true">
        <AdsterraAd
          variant="banner"
          atOptions={{ key: "702a39df87d3de1636adc1321a0a06ee", height: 50, width: 320 }}
          scriptSrc="//www.highrevenueformat.com/702a39df87d3de1636adc1321a0a06ee/invoke.js"
          className="min-h-[50px] w-[320px]"
        />
      </div>

      <Outlet />

      {/* إعلان سفلي قبل الفوتر — وحدة Adsterra (Banner 300x250) */}
      <div className="flex justify-center border-t border-border bg-muted/20 py-4" data-pdf-exclude="true">
        <AdsterraAd
          variant="banner"
          atOptions={{ key: "596caeba8a6e81b049c0c8f8f0586950", height: 250, width: 300 }}
          scriptSrc="//www.highrevenueformat.com/596caeba8a6e81b049c0c8f8f0586950/invoke.js"
          className="min-h-[250px] w-[300px]"
        />
      </div>

      <Footer />

      {/*
        وحدات إعلانية عامة بلا حجم مرئي (Popunder / Social Bar) — تُحمَّل
        مرة واحدة فـ كل صفحة عامة، بنفس منطق العزل عبر iframe المستعمل فوق
        (شبكة ProfitableRateCPM، نفس آلية العزل المستعملة مع Adsterra).
        الوحدتان ما كيتحملوش حتى الزائر يوافق على الكوكيز أولاً (نفس منطق
        Google Analytics فهاد المشروع) — شوف requireConsent فـ AdsterraAd.tsx.
      */}
      <AdsterraAd
        variant="popunder"
        scriptSrc="//pl31171139.profitableratecpmnetwork.com/12/81/c2/1281c23a986c79fb5176d6d6fe0f9886.js"
      />
      <AdsterraAd
        variant="socialbar"
        scriptSrc="//pl31171140.profitableratecpmnetwork.com/67/50/77/675077e6b9802c730bc0b4de4caecd4d.js"
      />
    </div>
  )
}