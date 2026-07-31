import { Link } from "react-router-dom";

export function GlossaryIndex() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Glossary</h1>
      <p className="mt-3 text-muted-foreground">Canonical term definitions for public legal and academic searches.</p>
      <Link className="mt-6 inline-flex text-primary underline-offset-4 hover:underline" to="/ar/glossary/contract">
        Sample term page
      </Link>
    </main>
  );
}
