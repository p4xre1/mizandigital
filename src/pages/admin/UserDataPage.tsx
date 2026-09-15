import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Database, Download, Trash2, ShieldCheck, Mail, User, Trophy, Coins, FileText, Flag, Search, AlertTriangle, CheckCircle2 } from "lucide-react"

export default function UserDataPage() {
  const [userId, setUserId] = useState("")
  const [email, setEmail] = useState("")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    const id = userId.trim() || email.trim()
    if (!id) return
    setLoading(true)
    try {
      // Try by id first, then by email
      let profileQuery = (supabase as any).from("profiles").select("*")
      let profileRes
      if (id.includes("@")) {
        profileRes = await profileQuery.eq("email", id).maybeSingle()
      } else {
        profileRes = await profileQuery.eq("id", id).maybeSingle()
      }
      const uid = profileRes.data?.id || id

      const [profile, mizanProfile, attempts, payments, transactions, reactions, reports, quizAttempts] = await Promise.all([
        profileRes,
        (supabase as any).from("mizan_profiles").select("*").eq("id", uid).maybeSingle(),
        (supabase as any).from("profiles").select("*").eq("id", uid).maybeSingle(),
        (supabase as any).from("payments").select("*").eq("user_ref", uid).limit(50),
        (supabase as any).from("credit_transactions").select("*").eq("user_ref", uid).limit(50),
        (supabase as any).from("reactions").select("*").eq("user_ref", uid).limit(50),
        (supabase as any).from("reports").select("*").or(`reporter_ref.eq.${uid},target_id.eq.${uid}`).limit(20),
        (supabase as any).from("quiz_attempts").select("*").eq("user_ref", uid).limit(50),
      ])

      setData({
        profile: profileRes.data,
        mizanProfile: mizanProfile.data,
        payments: payments.data,
        transactions: transactions.data,
        reactions: reactions.data,
        reports: reports.data,
        quizAttempts: quizAttempts.data,
        uid,
      })
    } finally {
      setLoading(false)
    }
  }

  const exportJson = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `user-${data.uid || "export"}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!data?.uid) return
    if (!confirm(`هل أنت متأكد من حذف المستخدم ${data.uid}؟ سيتم حذف: الملف الشخصي، mizan_profiles، محاولات، مدفوعات، معاملات كريدتس، تفاعلات، بلاغات. سيُحتفظ بـ audit_logs فقط. الاشتراك النشط لا يُسترد.`)) return
    setDeleting(true)
    try {
      // Delete in order
      await (supabase as any).from("reactions").delete().eq("user_ref", data.uid)
      await (supabase as any).from("credit_transactions").delete().eq("user_ref", data.uid)
      await (supabase as any).from("payments").delete().eq("user_ref", data.uid)
      await (supabase as any).from("quiz_attempts").delete().eq("user_ref", data.uid)
      await (supabase as any).from("reports").delete().eq("reporter_ref", data.uid)
      await (supabase as any).from("mizan_profiles").delete().eq("id", data.uid)
      await (supabase as any).from("profiles").delete().eq("id", data.uid)
      alert("تم حذف المستخدم وكل بياناته — تذكر حذف Clerk أيضاً من لوحة Clerk")
      setData(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل الحذف")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-600"><Database className="size-6" /></span>
        <div>
          <h1 className="text-xl font-black text-foreground">بيانات المستخدم GDPR — تحكم كامل</h1>
          <p className="text-[12px] text-muted-foreground">تصدير وحذف بيانات المستخدم — يلبي GDPR — لا حذف ذاتي، فقط عبر الإدارة</p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <h3 className="flex items-center gap-2 text-[12px] font-extrabold text-amber-900 dark:text-amber-200"><AlertTriangle className="size-4" /> سياسة حذف الحساب الجديدة</h3>
        <ul className="mt-2 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
          <li>لا يوجد زر حذف ذاتي في /profile — لمنع التحايل (إنشاء، شراء، حذف، إعادة إنشاء)</li>
          <li>الحذف فقط عبر طلب إلى contact@mizan.page بعنوان "طلب حذف حساب - GDPR" — خلال 30 يوم</li>
          <li>سيُحذف: profiles, mizan_profiles, quiz_attempts, payments, credit_transactions, reactions, reports</li>
          <li>سيُحتفظ: audit_logs, moderation_actions (بلا بيانات تعريفية) لأغراض قانونية</li>
          <li>الاشتراك النشط لا يُسترد عند الحذف — ننصح المستخدم بالانتظار حتى انتهاء اشتراكه</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-[13px] font-extrabold text-foreground">البحث عن مستخدم</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="معرف المستخدم (UUID)" className="w-full rounded-xl border border-border bg-background py-2.5 pr-10 pl-3 text-[13px]" />
          </div>
          <div className="relative flex-1">
            <Mail className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="أو البريد الإلكتروني" className="w-full rounded-xl border border-border bg-background py-2.5 pr-10 pl-3 text-[13px]" dir="ltr" />
          </div>
          <button onClick={fetchData} disabled={loading} className="rounded-xl bg-primary px-5 py-2.5 text-[12px] font-bold text-primary-foreground disabled:opacity-60">{loading ? "جارٍ..." : "جلب البيانات"}</button>
          {data && (
            <>
              <button onClick={exportJson} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-[11px] font-bold"><Download className="size-4" /> تصدير JSON</button>
              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2.5 text-[11px] font-bold text-white disabled:opacity-60"><Trash2 className="size-4" /> حذف GDPR</button>
            </>
          )}
        </div>
      </div>

      {loading ? <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p> : data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-foreground"><User className="size-4" /> الملف الشخصي (profiles)</h3>
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-muted p-3 text-[11px]">{JSON.stringify(data.profile, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-foreground"><Trophy className="size-4 text-amber-500" /> ملف ميزان (mizan_profiles) — XP، رتبة D-SSS</h3>
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-muted p-3 text-[11px]">{JSON.stringify(data.mizanProfile, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-foreground"><FileText className="size-4" /> محاولات الاختبارات ({data.quizAttempts?.length || 0})</h3>
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-muted p-3 text-[11px]">{JSON.stringify(data.quizAttempts, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-foreground"><Coins className="size-4" /> المدفوعات ({data.payments?.length || 0}) — Mizan Pro 49/399</h3>
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-muted p-3 text-[11px]">{JSON.stringify(data.payments, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-foreground"><Coins className="size-4" /> معاملات الكريدتس ({data.transactions?.length || 0})</h3>
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-muted p-3 text-[11px]">{JSON.stringify(data.transactions, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-foreground"><Flag className="size-4" /> التفاعلات والبلاغات</h3>
            <p className="mt-2 text-[11px] text-muted-foreground">تفاعلات: {data.reactions?.length || 0} — بلاغات: {data.reports?.length || 0}</p>
            <pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-muted p-3 text-[11px]">{JSON.stringify({ reactions: data.reactions, reports: data.reports }, null, 2)}</pre>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Database className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">أدخل معرف المستخدم أو البريد لعرض بياناته</p>
          <p className="mt-1 text-[12px] text-muted-foreground">يلبي متطلبات GDPR للوصول والتصدير والحذف — لا حذف ذاتي، فقط عبر الإدارة</p>
        </div>
      )}
    </div>
  )
}
