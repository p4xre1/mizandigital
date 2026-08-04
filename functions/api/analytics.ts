export const onRequestGet = async () => {
  return Response.json({
    status: "ok",
    source: "mizan-edge",
    metrics: ["page_view", "scroll_depth", "cta_click"],
  });
};

export const onRequestPost = async ({ request }: { request: Request }) => {
  try {
    const payload = await request.json().catch(() => ({}));
    
    return Response.json(
      {
        status: "ok",
        received: true,
        timestamp: new Date().toISOString(),
        data: payload,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  } catch {
    return Response.json({ status: "ok" }, { status: 200 });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};