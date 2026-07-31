import { AnswerBlock } from "@/components/content/AnswerBlock";
import { KeyFactsBox } from "@/components/content/KeyFactsBox";
import { SourcesCited } from "@/components/content/SourcesCited";

export function ArticlePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <AnswerBlock answer="This page starts with a direct answer so crawlers and readers can extract the point immediately." />
      <KeyFactsBox facts={[{ label: "Scope", value: "Public legal guidance" }, { label: "Format", value: "Article" }]} />
      <SourcesCited sources={[{ label: "Official Gazette", href: "https://www.mizan.page" }]} />
    </article>
  );
}
