import { StrictMode, lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { isClerkEnabled, CLERK_PUBLISHABLE_KEY } from "./lib/clerk/config"
import "./lib/security/globalGuard"
import "./styles/fonts.css"
import "./styles/globals.css"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element '#root' not found in index.html")
}

// Lazy load Clerk only when enabled - saves 225KB on landing when disabled
const ClerkProviderWrapper = lazy(async () => {
  const { ClerkProvider } = await import("@clerk/clerk-react")
  return {
    default: ({ children }: { children: React.ReactNode }) => (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY as string}>{children}</ClerkProvider>
    ),
  }
})

// Fallback آمن أثناء تحميل حزمة Clerk (vendor-clerk): نعرض سبينر خفيف
// بدلاً من <App /> — لأن عرض App قبل اكتمال <ClerkProvider> كان يجعل
// SignedIn/SignedOut ترمي: "SignedOut can only be used within the
// <ClerkProvider /> component" فتُسقط التطبيق في شاشة بيضاء.
function ClerkBootFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background" dir="rtl">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        />
        <span className="text-sm font-semibold">جارٍ التحميل…</span>
      </div>
    </div>
  )
}

function Root() {
  if (isClerkEnabled) {
    return (
      <StrictMode>
        <Suspense fallback={<ClerkBootFallback />}>
          <ClerkProviderWrapper>
            <App />
          </ClerkProviderWrapper>
        </Suspense>
      </StrictMode>
    )
  }
  return (
    <StrictMode>
      <App />
    </StrictMode>
  )
}

createRoot(rootElement).render(<Root />)
