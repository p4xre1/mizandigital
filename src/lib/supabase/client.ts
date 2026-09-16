import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Guaranteed valid HTTP URL to prevent bundle initialization crashes
const supabaseUrl =
  typeof envUrl === 'string' && envUrl.startsWith('http')
    ? envUrl.trim()
    : 'https://rfhjmtdblmarhlfftlmg.supabase.co'

const supabaseAnonKey =
  typeof envKey === 'string' && envKey.length > 0
    ? envKey.trim()
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaGptdGRibG1hcmhsZmZ0bG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTE5NzgsImV4cCI6MjA5OTc4Nzk3OH0.uI2_WCQSERz0jgYPuy1-AiWuVtDcJlFKd7hZsaQ1r5Q'

/**
 * عميل Supabase — مصدر المصادقة الوحيد في التطبيق بعد إزالة Clerk.
 *
 * خيارات auth مضبوطة صراحةً (لا نتركها للافتراضيات) لأن:
 *   • persistSession    → الجلسة تبقى بعد إعادة التحميل (كوكي sb-*).
 *   • autoRefreshToken  → لا تنقطع الجلسة في صفحة مفتوحة طويلاً.
 *   • detectSessionInUrl→ ضروري لعودة Google OAuth ورابط استعادة كلمة المرور.
 *   • flowType: pkce    → الأكثر أماناً لتطبيق SPA بلا خادم خلفي.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'sb-mizan-auth',
  },
})
