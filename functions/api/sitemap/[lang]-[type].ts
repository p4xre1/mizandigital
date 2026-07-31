export const onRequestGet = async ({ params }: { params: { lang?: string; type?: string } }) => {
  return Response.json({ lang: params.lang || "ar", type: params.type || "news" });
};
