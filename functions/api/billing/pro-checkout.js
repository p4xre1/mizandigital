/**
 * Public subscription checkout is permanently disabled. All Mizan features are free.
 * The route remains only to return a clear response to old clients/bookmarks.
 */
export async function onRequestPost() {
  return new Response(
    JSON.stringify({ error: "payments_disabled", message: "All Mizan resources are free. No payment was taken." }),
    { status: 410, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
