import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

/**
 * منطقة الخطر: حذف الحساب (حذف ناعم بمهلة 30 يوماً).
 *
 * ── لماذا تأكيد بالكتابة لا بنقرة ───────────────────────────────────────────
 * لأن الإجراء يغيّر حالة الحساب كله. زرّ تأكيد واحد يُضغط بالخطأ (أو من طفل،
 * أو من جلسة مفتوحة على جهاز مشترك) كان يكفي لبدء العدّ التنازلي. الكتابة
 * تجعل التراجع عن الخطأ مستحيلاً بلا انتباه.
 *
 * ── لماذا نُظهر العدّاد لا رسالة نجاح فقط ───────────────────────────────────
 * «تم الحذف» كذبة: الحساب ما زال قائماً ثلاثين يوماً. إخفاء ذلك يجعل المستخدم
 * يعتقد أن بياناته مُحيت فوراً، وهو خلاف ما يحدث وخلاف ما تقوله سياسة
 * الخصوصية. الصدق هنا ليس تفصيلاً بل متطلب قانوني.
 */

const CONFIRM_PHRASE = "احذف حسابي"
const GRACE_DAYS = 30

type Status = "active" | "pending_deletion" | "suspended" | null

interface Props {
  /** اسم المستخدم المطلوب كتابته للتأكيد — أدقّ من عبارة ثابتة. */
  username?: string | null
  onDeleted?: () => void
}

export function DeleteAccountSection({ username, onDeleted }: Props) {
  const [status, setStatus] = useState<Status>(null)
  const [requestedAt, setRequestedAt] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  const required = username?.trim() ? username.trim() : CONFIRM_PHRASE

  // ── قراءة الحالة الحالية ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    async function load() {
      // نطلب العمودين فقط. إن لم يكن الترحيل 13 مطبَّقاً فعمود account_status
      // غير موجود وسيرفض PostgREST الطلب — عندها نبقى في الحالة الافتراضية
      // بدل كسر الصفحة كلها.
      const { data, error: err } = await supabase
        .from("profiles")
        .select("account_status, deletion_requested_at")
        .maybeSingle()
      if (!alive) return
      if (err || !data) return
      const next = (data as { account_status?: Status; deletion_requested_at?: string | null })
      setStatus(next.account_status ?? null)
      setRequestedAt(next.deletion_requested_at ?? null)
    }
    void load()
    return () => {
      alive = false
    }
  }, [])

  // ── العدّاد التنازلي ─────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "pending_deletion" || !requestedAt) {
      setDaysLeft(null)
      return
    }
    const tick = () => {
      const due = new Date(requestedAt).getTime() + GRACE_DAYS * 86_400_000
      const left = Math.ceil((due - Date.now()) / 86_400_000)
      setDaysLeft(Math.max(0, left))
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [status, requestedAt])

  // ── طلب الحذف ────────────────────────────────────────────────────────────
  const requestDeletion = useCallback(async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setError("انتهت الجلسة — سجّل الدخول من جديد ثم أعد المحاولة.")
        return
      }
      const url = `/api/account/delete${reason.trim() ? `?reason=${encodeURIComponent(reason.trim().slice(0, 500))}` : ""}`
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        // 503 = الترحيل غير مطبَّق على القاعدة. رسالة صريحة لا «خطأ عام».
        setError(
          res.status === 503
            ? "خاصية الحذف غير مفعّلة بعد على الخادم (ينقص ترحيل قاعدة البيانات)."
            : body?.error || `تعذّر تسجيل الطلب (${res.status}).`
        )
        return
      }

      setStatus("pending_deletion")
      setRequestedAt(new Date().toISOString())
      setConfirming(false)
      setTyped("")
      setNotice(body?.message || "تم تسجيل طلب الحذف.")
      onDeleted?.()
    } catch {
      setError("تعذّر الاتصال بالخادم — تحقّق من الشبكة وأعد المحاولة.")
    } finally {
      setBusy(false)
    }
  }, [onDeleted, reason])

  // ── التراجع خلال المهلة ──────────────────────────────────────────────────
  const cancelDeletion = useCallback(async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setError("انتهت الجلسة — سجّل الدخول من جديد ثم أعد المحاولة.")
        return
      }
      const res = await fetch("/api/account/restore", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          res.status === 503
            ? "خاصية الاستعادة غير مفعّلة بعد على الخادم (ينقص ترحيل قاعدة البيانات)."
            : body?.error || `تعذّرت الاستعادة (${res.status}).`
        )
        return
      }
      setStatus("active")
      setRequestedAt(null)
      setNotice(body?.message || "تم إلغاء طلب الحذف.")
    } catch {
      setError("تعذّر الاتصال بالخادم — تحقّق من الشبكة وأعد المحاولة.")
    } finally {
      setBusy(false)
    }
  }, [])

  const pending = status === "pending_deletion"
  const matches = typed.trim() === required

  return (
    <section
      id="delete-account"
      className="mt-6 rounded-3xl border border-destructive/30 bg-card p-6"
      aria-labelledby="delete-account-heading"
    >
      <h2 id="delete-account-heading" className="text-[15px] font-extrabold text-destructive">
        حذف الحساب
      </h2>

      {notice && (
        <p className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-[12.5px] leading-6 text-foreground" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-[12.5px] leading-6 text-destructive" role="alert">
          {error}
        </p>
      )}

      {pending ? (
        <div className="mt-3 space-y-3">
          <p className="text-[12.5px] leading-6 text-muted-foreground">
            حسابك في <strong className="text-foreground">مهلة الحذف</strong>. بياناتك ما زالت
            محفوظة وحسابك ما زال قائماً، وسيُخفى نهائياً بعد انقضاء المهلة.
          </p>
          {daysLeft !== null && (
            <p className="text-[13px] font-bold text-foreground" aria-live="polite">
              بقي {daysLeft} {daysLeft === 1 ? "يوم" : daysLeft === 2 ? "يومان" : "يوماً"} على الإخفاء النهائي
            </p>
          )}
          <p className="text-[12px] leading-6 text-muted-foreground">
            يمكنك التراجع الآن بنفسك، أو مراسلة الإدارة خلال المهلة. بعد الإخفاء النهائي
            تُفصل هويتك عن سجلاتك المالية التي يبقى الاحتفاظ بها واجباً قانونياً
            (المادة 26 من مدونة التجارة)، ولا يمكن استعادة الحساب.
          </p>
          <button
            type="button"
            onClick={() => void cancelDeletion()}
            disabled={busy}
            className="rounded-xl bg-primary px-4 py-2 text-[12.5px] font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "جارٍ الاستعادة…" : "التراجع عن الحذف واستعادة حسابي"}
          </button>
        </div>
      ) : confirming ? (
        <div className="mt-3 space-y-3">
          <p className="text-[12.5px] leading-6 text-muted-foreground">
            سيُحذف حسابك وبروفايلك العام ونقاط خبرتك ورتبتك بعد مهلة {GRACE_DAYS} يوماً.
            سجلات اختباراتك وتفاعلاتك تُحذف معها. لا يمكن التراجع بعد الإخفاء النهائي.
          </p>

          <label className="block text-[12.5px] font-bold text-foreground" htmlFor="confirm-phrase">
            اكتب <span className="font-mono text-destructive">{required}</span> للتأكيد
          </label>
          <input
            id="confirm-phrase"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            dir="rtl"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary"
            aria-describedby="confirm-help"
          />
          <p id="confirm-help" className="text-[11.5px] text-muted-foreground">
            التأكيد بالكتابة يمنع الحذف العرضي.
          </p>

          <label className="block text-[12.5px] font-bold text-foreground" htmlFor="delete-reason">
            سبب المغادرة <span className="font-normal text-muted-foreground">(اختياري)</span>
          </label>
          <textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            rows={2}
            dir="rtl"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary"
            placeholder="يساعدنا على تحسين المنصة — لا يُشترط للمحو."
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void requestDeletion()}
              disabled={busy || !matches}
              className="rounded-xl bg-destructive px-4 py-2 text-[12.5px] font-bold text-destructive-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "جارٍ التسجيل…" : "تأكيد طلب الحذف"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false)
                setTyped("")
                setError(null)
              }}
              disabled={busy}
              className="rounded-xl border border-border px-4 py-2 text-[12.5px] font-bold text-foreground transition hover:bg-muted/50 disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-[12.5px] leading-6 text-muted-foreground">
            طلب الحذف يبدأ مهلة {GRACE_DAYS} يوماً تتراجع فيها متى شئت، ثم يُخفى الحساب
            نهائياً. نحتفظ فقط بما يوجبه القانون من سجلات مالية، مفصولة عن هويتك.
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirming(true)
              setError(null)
              setNotice(null)
            }}
            className="rounded-xl border border-destructive/50 px-4 py-2 text-[12.5px] font-bold text-destructive transition hover:bg-destructive/5"
          >
            طلب حذف حسابي
          </button>
        </div>
      )}
    </section>
  )
}

export default DeleteAccountSection
