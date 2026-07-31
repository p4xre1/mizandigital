interface GlossaryTermPageProps {
  term?: string;
}

export default function GlossaryTermPage({ term = "term" }: GlossaryTermPageProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">{term}</h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">A canonical definition page can be rendered here.</p>
    </main>
  );
}
