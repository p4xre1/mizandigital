import { Outlet } from "react-router-dom"
import { Header, Footer } from "./PublicNavigation"
import HelpAssistant from "@/components/help/HelpAssistant"

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

      <Outlet />

      <Footer />

      <HelpAssistant />
    </div>
  )
}
