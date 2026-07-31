export const onRequestGet = async () =>
  Response.json({
    status: "ok",
    source: "mizan-edge",
    metrics: ["page_view", "scroll_depth", "cta_click"],
  });
