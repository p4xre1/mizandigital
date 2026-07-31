import type { AuthorityLinkRecord } from "../types";

export function resolveOutgoingLinks(links: AuthorityLinkRecord[], sourceSlug: string) {
  return links.filter((link) => link.source_slug === sourceSlug);
}
