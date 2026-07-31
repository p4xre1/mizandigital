import { Link } from "react-router-dom";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Contact Mizan Digital</h1>
        <p className="text-muted-foreground">Use this page for editorial, partnership, and support requests.</p>
      </header>
      <section className="rounded-2xl border border-border bg-background p-6 space-y-3">
        <p className="text-sm leading-6 text-foreground">For now, this is a simple public contact destination that replaces the dead footer link.</p>
        <Link to="/ar" className="inline-flex text-primary underline-offset-4 hover:underline">Return home</Link>
      </section>
    </main>
  );
}
