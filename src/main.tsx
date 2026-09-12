import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClerkProvider } from "@clerk/clerk-react"
import App from "./App"
import { CLERK_PUBLISHABLE_KEY, isClerkEnabled } from "./lib/clerk/config"
import "./styles/fonts.css"
import "./styles/globals.css"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element '#root' not found in index.html")
}

const app = (
  <StrictMode>
    {isClerkEnabled ? (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY as string}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>
)

createRoot(rootElement).render(app)