import { Helmet } from "react-helmet-async";

interface MetaHeadProps {
  title: string;
  description: string;
  canonical?: string;
}

export function MetaHead({ title, description, canonical }: MetaHeadProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical ? <link rel="canonical" href={canonical} /> : null}
    </Helmet>
  );
}
