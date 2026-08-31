import { Outlet } from "react-router-dom"
import { Header, Footer } from "./PublicNavigation"
import SiteSearchBar from "../components/search/SiteSearchBar"

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
      <SiteSearchBar />
      <Outlet />
      <Footer />
    </div>
  )
}