function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const onRequestGet = async ({ params }: { params: { slug?: string } }) => {
  const slug = escapeHtml(params.slug || "unknown-article");

  return new Response(
    `<!doctype html><html lang="ar"><head><meta charset="utf-8"><title>${slug}</title></head><body><main><article><h1>${slug}</h1><p>Direct answer: this article endpoint serves server-rendered HTML for crawlers and readers.</p></article></main></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
};

