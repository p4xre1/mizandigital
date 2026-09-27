/**
 * Public checkout is intentionally disabled: all Mizan content is free and ad-free.
 * This endpoint remains as a compatibility response for old clients/bookmarks.
 */
export async function onRequestPost() {
  return new Response(
    JSON.stringify({ error: "payments_disabled", message: "All Mizan resources are free. No payment was taken." }),
    { status: 410, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
