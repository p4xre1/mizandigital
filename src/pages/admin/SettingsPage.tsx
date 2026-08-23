import React, { useState, useEffect } from "react"
import { Settings, Loader2, Check, AlertCircle, KeyRound, Mail, Eye, EyeOff } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { supabase } from "../../lib/supabase/client"

interface SettingsPageProps {
  onNavigate?: (path: string) => void
  currentPath?: string
}

export function SettingsPage({ onNavigate, currentPath = "/admin/settings" }: SettingsPageProps) {
  const [email, setEmail] = useState<string>("")
  const [loadingUser, setLoadingUser] = useState<boolean>(true)

  const [newPassword, setNewPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email || "")
      setLoadingUser(false)
    }
    fetchUser()
  }, [])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 8) {
      setError("يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.")
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      setSuccess(true)
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      console.error("خطأ أثناء تحديث كلمة المرور:", err)
      setError(err?.message || "تعذر تحديث كلمة المرور. يرجى المحاولة مرة أخرى.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout currentPath={currentPath} onNavigate={onNavigate}>
      <div className="mx-auto max-w-xl space-y-6" dir="rtl">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
            <Settings className="size-5 text-primary" />
            الإعدادات
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">إدارة بيانات حساب المشرف وكلمة المرور.</p>
        </div>

        {/* بطاقة معلومات الحساب */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Mail className="size-4 text-primary" />
            بيانات الحساب
          </h2>
          {loadingUser ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> جاري التحميل...
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              البريد الإلكتروني: <span className="font-bold text-foreground" dir="ltr">{email}</span>
            </p>
          )}
        </div>

        {/* بطاقة تغيير كلمة المرور */}
        <form
          onSubmit={handleChangePassword}
          className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <KeyRound className="size-4 text-primary" />
            تغيير كلمة المرور
          </h2>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check className="size-4 shrink-0" />
              <span>تم تحديث كلمة المرور بنجاح.</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">كلمة المرور الجديدة</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 pl-9 text-xs text-foreground outline-none transition focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">تأكيد كلمة المرور</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد إدخال كلمة المرور"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            <span>حفظ كلمة المرور</span>
          </button>
        </form>
      </div>
    </AdminLayout>
  )
}

export default SettingsPage
