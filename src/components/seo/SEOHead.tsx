import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string;
  articleNumber?: number;
  codeName?: string;
}

export function SEOHead({
  title,
  description,
  canonical = typeof window !== "undefined" ? window.location.href : "",
  keywords = "القانون المغربي, مدونة الأسرة, المسطرة المدنية, مدونة الشغل, الاستشارات القانونية المغرب",
  articleNumber,
  codeName,
}: SEOProps) {
  useEffect(() => {
    // 1. Title tag
    document.title = `${title} | منصة ميزان القانونية المغربية`;

    // 2. Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);

    // 3. Keywords
    let metaKw = document.querySelector('meta[name="keywords"]');
    if (!metaKw) {
      metaKw = document.createElement("meta");
      metaKw.setAttribute("name", "keywords");
      document.head.appendChild(metaKw);
    }
    metaKw.setAttribute("content", keywords);

    // 4. Schema.org Legislation Data for Google Rich Snippets
    if (articleNumber && codeName) {
      const schema = {
        "@context": "https://schema.org",
        "@type": "Legislation",
        "name": `الفصل ${articleNumber} - ${codeName}`,
        "description": description,
        "legislationJurisdiction": "MA", // Morocco Country Code
        "inLanguage": ["ar-MA", "fr-MA"],
      };

      let script = document.getElementById("jsonld-legislation") as HTMLScriptElement;
      if (!script) {
        script = document.createElement("script");
        script.id = "jsonld-legislation";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.text = JSON.stringify(schema);
    }
  }, [title, description, canonical, keywords, articleNumber, codeName]);

  return null;
}