import { Helmet } from "react-helmet-async";

export function ArticleSchema({ title, description }: { title: string; description: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
  };

  return <Helmet><script type="application/ld+json">{JSON.stringify(schema)}</script></Helmet>;
}
