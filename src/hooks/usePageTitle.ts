// hooks/usePageTitle.ts
import { useEffect } from "react";

export function usePageTitle(title?: string, description?: string) {
  useEffect(() => {
    const defaultTitle = "منصة ميزان | المكتبة القانونية المغربية";
    document.title = title ? `${title} - ميزان` : defaultTitle;

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", description);
    }
  }, [title, description]);
}