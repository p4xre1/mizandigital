interface AnswerBlockProps {
  answer: string;
}

export function AnswerBlock({ answer }: AnswerBlockProps) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <p className="text-base leading-7 text-foreground">{answer}</p>
    </section>
  );
}
