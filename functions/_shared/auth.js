// functions/_shared/auth.js
//
// يتحقق من هوية المستخدم وصلاحياته الإدارية عبر نظام Supabase Auth
// الموجود أصلاً (لا يُنشئ أي نظام مصادقة موازٍ). يستخدم فقط الرمز
// (JWT) القادم من المتصفح + مفتاح anon العلني — لا حاجة لمفتاح
// service_role هنا لأن قراءة عمود admin_god_mode لصفه الخاص مسموحة
// أصلاً عبر سياسة "profiles_select_policy" الحالية.
//
// إن لم يكن المستخدم مسجلاً للدخول، أو لم يكن admin_god_mode = true،
// تُرجع الدالة null (غير مصرّح).

/**
 * @returns {Promise<{ id: string, email: string } | null>}
 */
export async function requireAdmin(request, env) {
  const authHeader = request.headers.get("Authorization") || ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()
  if (!token) return null

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase env vars missing on the server (SUPABASE_URL / SUPABASE_ANON_KEY)")
  }

  // 1) تحقّق من صلاحية الرمز واستخراج هوية المستخدم
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  })
  if (!userRes.ok) return null
  const user = await userRes.json()
  if (!user || !user.id) return null

  // 2) تحقّق من admin_god_mode عبر profiles (بنفس رمز المستخدم — يمر عبر RLS)
  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=admin_god_mode`,
    { headers: { Authorization: `Bearer ${token}`, apikey: anonKey } }
  )
  if (!profileRes.ok) return null
  const rows = await profileRes.json()
  const isAdmin = Array.isArray(rows) && rows[0]?.admin_god_mode === true
  if (!isAdmin) return null

  return { id: user.id, email: user.email }
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}
