export const onRequestGet = async ({ params }: { params: { lang?: string } }) => Response.json({ lang: params.lang || "ar", feed: [] });
