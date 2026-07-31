import { Helmet } from "react-helmet-async";

export function HreflangTags({ alternates }: { alternates: Array<{ lang: string; href: string }> }) {
  return (
    <Helmet>
      {alternates.map((alternate) => (
        <link key={alternate.lang} rel="alternate" hrefLang={alternate.lang} href={alternate.href} />
      ))}
    </Helmet>
  );
}
