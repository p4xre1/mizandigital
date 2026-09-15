import { StrictMode, lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { isClerkEnabled, CLERK_PUBLISHABLE_KEY } from "./lib/clerk/config"
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

function Root() {
  if (isClerkEnabled) {
    return (
      <StrictMode>
        <Suspense fallback={<App />}>
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
