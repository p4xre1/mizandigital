import React, { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "@/routes";
import { I18nProvider } from "@/lib/i18n";
import { trackPageView, trackScrollDepth } from "@/lib/analytics";
import { queryClient } from "@/lib/query-client";

export default function App(): React.JSX.Element {
  const [pathname, setPathname] = useState(
    () => router.state.location.pathname
  );

  useEffect(() => {
    let trackedDepths = new Set<number>();
    let ticking = false;

    trackPageView(window.location.pathname);

    const unsubscribe = router.subscribe((state) => {
      if (!state.location) return;

      setPathname(state.location.pathname);

      if (state.navigation.state === "idle") {
        trackPageView(state.location.pathname);
        trackedDepths = new Set<number>();
      }
    });

    const handleScroll = () => {
      if (ticking) return;

      window.requestAnimationFrame(() => {
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;

        if (docHeight > 0) {
          const scrollPercent = Math.round(
            (window.scrollY / docHeight) * 100
          );

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
    <QueryClientProvider client={queryClient}>
      <I18nProvider pathname={pathname}>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  );
}