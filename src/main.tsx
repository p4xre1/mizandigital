import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./styles/globals.css";

// Initialize Sentry right at application startup
Sentry.init({
  dsn: "https://77de552d11e5d7ee2057c42d19a77b05@o4511905591328768.ingest.de.sentry.io/4511905637269584",
  dataCollection: {
    // userInfo: false,
    // httpBodies: []
  },
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  // Tracing
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Enable logs to be sent to Sentry
  enableLogs: true
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element '#root' not found in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);