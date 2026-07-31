interface KeyFactsBoxProps {
  facts: Array<{ label: string; value: string }>;
}

export function KeyFactsBox({ facts }: KeyFactsBoxProps) {
  return (
    <aside className="rounded-2xl border border-border bg-muted/30 p-5">
      <ul className="space-y-2 text-sm">
        {facts.map((fact) => (
          <li key={fact.label} className="flex justify-between gap-4">
            <span className="font-medium text-muted-foreground">{fact.label}</span>
            <span className="text-right text-foreground">{fact.value}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
