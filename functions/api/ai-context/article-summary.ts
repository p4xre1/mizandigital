export const onRequestGet = async ({ url }: { url: URL }) => {
  const slug = url.searchParams.get("slug") || "";
  return Response.json({
    slug,
    summary: "A concise extractive summary would be returned here for crawler ingestion.",
  });
};
