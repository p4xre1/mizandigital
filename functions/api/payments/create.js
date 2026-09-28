/**
 * Credit package checkout is disabled because Mizan is free for everyone.
 * Kept as a compatibility endpoint so older clients receive a clear response.
 */
export async function onRequestPost() {
  return new Response(
    JSON.stringify({ error: "payments_disabled", message: "All Mizan resources are free. No payment was taken." }),
    { status: 410, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
