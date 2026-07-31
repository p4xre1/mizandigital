interface SourcesCitedProps {
  sources: Array<{ label: string; href: string }>;
}

export function SourcesCited({ sources }: SourcesCitedProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Sources</h2>
      <ul className="space-y-2 text-sm">
        {sources.map((source) => (
          <li key={source.href}>
            <a className="text-primary underline-offset-4 hover:underline" href={source.href} target="_blank" rel="noreferrer">
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
