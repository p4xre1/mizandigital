import { useEffect } from "react";

export const useNoIndex = () => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    let metaRobots = document.getElementById("meta-robots") as HTMLMetaElement | null;
    let createdDynamicTag = false;

    // Create the meta tag if it doesn't already exist in document head
    if (!metaRobots) {
      metaRobots = document.querySelector('meta[name="robots"]');
    }

    if (!metaRobots) {
      metaRobots = document.createElement("meta");
      metaRobots.id = "meta-robots";
      metaRobots.name = "robots";
      document.head.appendChild(metaRobots);
      createdDynamicTag = true;
    }

    // Set noindex, nofollow while on this page/component
    metaRobots.setAttribute("content", "noindex, nofollow");

    return () => {
      if (!metaRobots) return;

      // Reset back to standard indexable state on unmount
      if (createdDynamicTag) {
        metaRobots.remove();
      } else {
        metaRobots.setAttribute("content", "index, follow, max-image-preview:large");
      }
    };
  }, []);
};