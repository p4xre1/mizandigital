/**
 * DELETE /api/account/delete
 * GDPR — delete user data
 */

import { verifyClerkToken } from "../../_shared/clerk.js";

export async function onRequestDelete(context) {
  const { request, env } = context;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const token = authHeader.replace("Bearer ", "");
  const clerk = await verifyClerkToken(token, env);
  if (!clerk) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const userId = clerk.userId;

  try {
    // Delete from various tables
    const tables = ["mizan_profiles", "quiz_attempts", "payments", "credit_transactions", "reactions", "reports"];
    for (const table of tables) {
      await fetch(`${supabaseUrl}/rest/v1/${table}?clerk_user_id=eq.${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      await fetch(`${supabaseUrl}/rest/v1/${table}?user_ref=eq.${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
    }

    // Delete from profiles if using Supabase auth id stored somewhere — for Clerk we store in mizan_profiles.clerk_user_id already handled

    return new Response(JSON.stringify({ ok: true, message: "تم حذف بياناتك" }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
