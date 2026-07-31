export default function LegalPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Legal Policies</h1>
        <p className="text-muted-foreground">Privacy, terms, and cookie information are grouped here to support the footer links.</p>
      </header>

      <section id="privacy" className="rounded-2xl border border-border bg-background p-6 space-y-2">
        <h2 className="text-xl font-semibold">Privacy</h2>
        <p className="text-sm leading-6 text-muted-foreground">Public reading behavior is tracked only for analytics and product improvement.</p>
      </section>

      <section id="terms" className="rounded-2xl border border-border bg-background p-6 space-y-2">
        <h2 className="text-xl font-semibold">Terms</h2>
        <p className="text-sm leading-6 text-muted-foreground">Content is informational and not a substitute for legal advice.</p>
      </section>

      <section id="cookies" className="rounded-2xl border border-border bg-background p-6 space-y-2">
        <h2 className="text-xl font-semibold">Cookies</h2>
        <p className="text-sm leading-6 text-muted-foreground">The site uses cookies for session handling, analytics, and ad delivery.</p>
      </section>
    </main>
  );
}
