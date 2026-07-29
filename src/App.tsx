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
  useEffect(() => {
    let trackedDepths = new Set<number>();

    // 1. Track Initial Page Load
    trackPageView(window.location.pathname);

    // 2. Subscribe to Client-side Route Transitions
    const unsubscribe = router.subscribe((state) => {
      if (state.navigation.state === "idle" && state.location) {
        const newPath = state.location.pathname;

        // Track new page view
        trackPageView(newPath);

        // Reset scroll depth milestones for the new page route
        trackedDepths = new Set<number>();
      }
    });

    // 3. Auto-track Scroll Depth Milestones (25%, 50%, 75%, 100%)
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;

      // Throttle calculation to display frame rate using requestAnimationFrame
      window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;

        if (docHeight > 0) {
          const scrollPercent = Math.round((scrollTop / docHeight) * 100);
          const milestones: (25 | 50 | 75 | 100)[] = [25, 50, 75, 100];

          milestones.forEach((depth) => {
            if (scrollPercent >= depth && !trackedDepths.has(depth)) {
              trackedDepths.add(depth);
              trackScrollDepth(depth, window.location.pathname);
            }
          });
        }

        ticking = false;
      });

      ticking = true;
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
