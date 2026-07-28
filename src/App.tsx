import React, { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "@/routes";
import { I18nProvider } from "@/lib/i18n";
import { trackPageView, trackScrollDepth } from "@/lib/analytics";

/**
 * Root Application Component for Mizan Digital (www.mizan.page)
 * Wraps the application with global state providers (I18n),
 * auto-tracks route navigation & scroll depth telemetry,
 * and renders the central client-side router.
 */
export default function App(): React.JSX.Element {
  // 1. Auto-track Page Navigation & Scroll Milestones
  useEffect(() => {
    // Keep track of scroll depths for the current active page
    let trackedDepths = new Set<number>();

    // Track initial load
    trackPageView(window.location.pathname);

    // Subscribe to client-side route transitions
    const unsubscribe = router.subscribe((state) => {
      if (state.navigation.state === "idle" && state.location) {
        // Track new page view
        trackPageView(state.location.pathname);
        
        // Reset scroll milestones for the new route
        trackedDepths = new Set<number>();
      }
    });

    // 2. Auto-track Scroll Depth Milestones (25%, 50%, 75%, 100%)
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      const milestones: (25 | 50 | 75 | 100)[] = [25, 50, 75, 100];

      milestones.forEach((depth) => {
        if (scrollPercent >= depth && !trackedDepths.has(depth)) {
          trackedDepths.add(depth);
          trackScrollDepth(depth, window.location.pathname);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}