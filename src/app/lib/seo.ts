import { useEffect } from "react";

export interface SeoOptions {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  path?: string;
  ogImage?: string;
  type?: string;
  keywords?: string[] | string;
  lang?: string;
}

export function useSeo(config: SeoOptions, deps: React.DependencyList = []) {
  useEffect(() => {
    if (config.title) {
      document.title = config.title;
    }

    if (config.description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", config.description);
    }

    if (config.keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement("meta");
        metaKeywords.setAttribute("name", "keywords");
        document.head.appendChild(metaKeywords);
      }
      const keywordsStr = Array.isArray(config.keywords)
        ? config.keywords.join(", ")
        : config.keywords;
      metaKeywords.setAttribute("content", keywordsStr);
    }

    if (config.lang) {
      document.documentElement.lang = config.lang;
    }

    if (config.noindex) {
      let metaRobots = document.querySelector('meta[name="robots"]');
      if (!metaRobots) {
        metaRobots = document.createElement("meta");
        metaRobots.setAttribute("name", "robots");
        document.head.appendChild(metaRobots);
      }
      metaRobots.setAttribute("content", "noindex, nofollow");
    }
  }, deps);
}