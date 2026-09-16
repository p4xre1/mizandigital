import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import type { MizanProfile } from "@/types/quiz"
import { getRankDefinition, getRankForXp, type RankDefinition } from "@/lib/quiz/ranks"
import {
  ensureMyProfile,
  fetchMyProfile,
  saveMyProfile,
  syncProgression,
  type MyProfile,
  type SyncResult,
} from "@/lib/profiles/service"

/**
 * AuthProvider — Supabase Auth هو مزوّد الهوية الوحيد في ميزان.
 * -----------------------------------------------------------------------
 * (أُزيل Clerk بالكامل: لا ClerkProvider ولا useUser ولا مفتاح VITE_CLERK_*.)
 *
 * ماذا يوفّر هذا المزوّد؟
 *   • session / user       — جلسة Supabase الحالية (من المفتاح sb-mizan-auth).
 *   • profile              — صف mizan_profiles الخاص بالحساب (owner_id = auth.uid()).
 *   • rank / rankProgress  — رتبة البروفايل كما رجّعتها القاعدة (مشتقة من xp).
 *   • isAdmin              — من profiles.admin_god_mode أو role editor/super_admin.
 *   • signIn / signUp / signOut / resetPassword / signInWithGoogle.
 *   • saveProfile          — حفظ البروفايل المخصص + التقدّم في السحابة.
 *
 * مبدأ التصميم: المزامنة لا تحجب الواجهة. `initialized` تصبح true فور معرفة
 * الحالة (جلسة أو لا)، وكل فشل شبكي يُبلَّغ عبر `syncError` بدل أن يُسقط
 * التطبيق.
 */

export interface AuthContextValue {
  /** هل حُسمت حالة الجلسة الأولى؟ (false = ما زلنا نقرأ الكوكي) */
  initialized: boolean
  session: Session | null
  user: User | null
  /** بروفايل mizan_profiles السحابي — null للزائر أو قبل اكتمال الجلب. */
  profile: MyProfile | null
  profileLoading: boolean
  /** الرتبة المطبّقة على البروفايل (من القاعدة، أو من xp المحلي للزائر). */
  rank: RankDefinition
  isAdmin: boolean
  isPro: boolean
  syncError: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (input: {
    email: string
    password: string
    fullName?: string
    username?: string
  }) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<MyProfile | null>
  saveProfile: (profile: MizanProfile, localProgress?: LocalProgress) => Promise<SyncResult>
  pushProgress: (progress: LocalProgress) => Promise<SyncResult>
}

export interface LocalProgress {
  xp: number
  credits: number
  badges: string[]
  streakDays: number
  placementCompleted: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const OAUTH_PROVIDER = "google" as const

function describeAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? "")
  const lower = message.toLowerCase()
  if (lower.includes("invalid login credentials")) return "بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور."
  if (lower.includes("email not confirmed")) return "بريدك الإلكتروني غير مؤكَّد بعد — افتح رابط التأكيد في رسالتنا."
  if (lower.includes("already registered") || lower.includes("already been registered"))
    return "هذا البريد مسجَّل مسبقاً — جرّب تسجيل الدخول."
  if (lower.includes("password should be at least")) return "كلمة المرور قصيرة جداً (6 أحرف على الأقل)."
  if (lower.includes("rate limit") || lower.includes("too many")) return "محاولات كثيرة في وقت قصير — انتظر دقيقة."
  if (lower.includes("failed to fetch") || lower.includes("network")) return "تعذّر الاتصال بالخادم — تحقق من الإنترنت."
  return message || "حدث خطأ غير متوقع."
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /* ---------------------------------------------------------------- *
   * تحميل البروفايل + صلاحيات الإدارة
   * ---------------------------------------------------------------- */

  const loadAdminFlag = useCallback(async (supabase: SupabaseClient, userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("admin_god_mode, role")
        .eq("id", userId)
        .maybeSingle()
      if (error || !data) {
        if (mountedRef.current) setIsAdmin(false)
        return
      }
      const row = data as { admin_god_mode?: boolean | null; role?: string | null }
      if (mountedRef.current) {
        setIsAdmin(row.admin_god_mode === true || row.role === "super_admin" || row.role === "editor")
      }
    } catch {
      if (mountedRef.current) setIsAdmin(false)
    }
  }, [])

  const loadProfile = useCallback(
    async (userId: string, options: { create?: boolean } = {}) => {
      if (!userId) {
        setProfile(null)
        return null
      }
      setProfileLoading(true)
      try {
        const existing = await fetchMyProfile(userId)
        if (existing) {
          if (mountedRef.current) setProfile(existing)
          return existing
        }
        if (options.create === false) {
          if (mountedRef.current) setProfile(null)
          return null
        }
        // حساب بلا بروفايل (سجّل قبل ترحيل 20260924000000): ننشئه الآن
        const { supabase } = await import("@/lib/supabase/client")
        const user = (await supabase.auth.getUser()).data.user
        const created = await ensureMyProfile(userId, {
          displayName:
            (user?.user_metadata?.full_name as string | undefined) ??
            (user?.user_metadata?.name as string | undefined) ??
            user?.email?.split("@")[0] ??
            null,
          username: (user?.user_metadata?.username as string | undefined) ?? null,
          avatarUrl: (user?.user_metadata?.avatar_url as string | undefined) ?? null,
        })
        if (mountedRef.current) setProfile(created)
        return created
      } finally {
        if (mountedRef.current) setProfileLoading(false)
      }
    },
    []
  )

  /* ---------------------------------------------------------------- *
   * دورة حياة الجلسة
   * ---------------------------------------------------------------- */

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    const bootstrap = async () => {
      const { supabase } = await import("@/lib/supabase/client")
      if (cancelled) return

      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      const current = data.session
      setSession(current)
      setInitialized(true)

      if (current?.user) {
        await loadAdminFlag(supabase, current.user.id)
        await loadProfile(current.user.id)
      }

      const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (!mountedRef.current) return
        setSession(nextSession)
        setInitialized(true)
        if (nextSession?.user) {
          setSyncError(null)
          await loadAdminFlag(supabase, nextSession.user.id)
          await loadProfile(nextSession.user.id)
        } else {
          setProfile(null)
          setIsAdmin(false)
        }
      })
      unsubscribe = () => subscription.subscription.unsubscribe()
    }

    void bootstrap()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [loadAdminFlag, loadProfile])

  /* ---------------------------------------------------------------- *
   * عمليات المصادقة
   * ---------------------------------------------------------------- */

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { supabase } = await import("@/lib/supabase/client")
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) return { error: describeAuthError(error) }
      const userId = data.user?.id
      if (userId) {
        const { supabase: client } = await import("@/lib/supabase/client")
        await loadAdminFlag(client, userId)
        await loadProfile(userId)
      }
      return { error: null }
    } catch (error) {
      return { error: describeAuthError(error) }
    }
  }, [loadAdminFlag, loadProfile])

  const signUp = useCallback(
    async (input: { email: string; password: string; fullName?: string; username?: string }) => {
      try {
        const { supabase } = await import("@/lib/supabase/client")
        const redirect =
          typeof window === "undefined" ? undefined : `${window.location.origin}/profile`
        const { data, error } = await supabase.auth.signUp({
          email: input.email.trim(),
          password: input.password,
          options: {
            emailRedirectTo: redirect,
            data: {
              full_name: input.fullName?.trim() || input.email.split("@")[0],
              username: input.username?.trim().toLowerCase() || undefined,
            },
          },
        })
        if (error) return { error: describeAuthError(error), needsEmailConfirmation: false }

        // المشغّل handle_new_user ينشئ profiles + mizan_profiles تلقائياً.
        // إن كانت الجلسة جاهزة (تأكيد البريد معطّل) نحمّل البروفايل فوراً.
        const userId = data.user?.id
        if (userId && data.session) {
          await loadAdminFlag(supabase, userId)
          await loadProfile(userId)
        }
        return { error: null, needsEmailConfirmation: !data.session }
      } catch (error) {
        return { error: describeAuthError(error), needsEmailConfirmation: false }
      }
    },
    [loadAdminFlag, loadProfile]
  )

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    try {
      const { supabase } = await import("@/lib/supabase/client")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: OAUTH_PROVIDER,
        options: {
          redirectTo: redirectTo ?? (typeof window === "undefined" ? undefined : `${window.location.origin}/profile`),
          queryParams: { prompt: "select_account" },
        },
      })
      return { error: error ? describeAuthError(error) : null }
    } catch (error) {
      return { error: describeAuthError(error) }
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { supabase } = await import("@/lib/supabase/client")
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/login?mode=password`,
      })
      return { error: error ? describeAuthError(error) : null }
    } catch (error) {
      return { error: describeAuthError(error) }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      const { supabase } = await import("@/lib/supabase/client")
      await supabase.auth.signOut()
    } catch {
      /* تجاهل: الخروج المحلي يكفي */
    } finally {
      if (mountedRef.current) {
        setSession(null)
        setProfile(null)
        setIsAdmin(false)
        setSyncError(null)
      }
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return null
    return loadProfile(userId, { create: false })
  }, [loadProfile, session])

  /* ---------------------------------------------------------------- *
   * حفظ البروفايل والتقدّم
   * ---------------------------------------------------------------- */

  const saveProfile = useCallback(
    async (next: MizanProfile, localProgress?: LocalProgress): Promise<SyncResult> => {
      const userId = session?.user?.id
      if (!userId) {
        return { synced: false, reason: "سجّل الدخول أولاً لحفظ بروفايلك ومزامنة رتبتك." }
      }
      const progress = localProgress ?? {
        xp: profile?.xp ?? 0,
        credits: profile?.credits ?? 0,
        badges: profile?.badges ?? [],
        streakDays: profile?.streakDays ?? 0,
        placementCompleted: profile?.placementCompleted ?? false,
      }
      const result = await saveMyProfile(userId, next, progress, { isPublic: next.isPublic ?? true })
      if (result.synced) {
        setSyncError(null)
        await loadProfile(userId, { create: false })
      } else if (result.reason) {
        setSyncError(result.reason)
      }
      return result
    },
    [loadProfile, profile, session]
  )

  const pushProgress = useCallback(
    async (progress: LocalProgress): Promise<SyncResult> => {
      const userId = session?.user?.id
      if (!userId) return { synced: false, reason: "بلا جلسة" }
      const result = await syncProgression(userId, progress)
      if (result.synced) {
        setSyncError(null)
        // نُحدّث الرتبة المعروضة فوراً من جواب الخادم
        setProfile((current) =>
          current
            ? {
                ...current,
                xp: Math.max(current.xp, progress.xp),
                credits: progress.credits,
                badges: progress.badges,
                streakDays: progress.streakDays,
                rank: result.rank ?? current.rank,
              }
            : current
        )
      }
      return result
    },
    [session]
  )

  /* ---------------------------------------------------------------- *
   * القيم المشتقة
   * ---------------------------------------------------------------- */

  const rank = useMemo(() => {
    if (profile) return getRankDefinition(profile.rank)
    return getRankForXp(0)
  }, [profile])

  const value = useMemo<AuthContextValue>(
    () => ({
      initialized,
      session,
      user: session?.user ?? null,
      profile,
      profileLoading,
      rank,
      isAdmin,
      isPro: profile?.isPro ?? false,
      syncError,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      signOut,
      refreshProfile,
      saveProfile,
      pushProgress,
    }),
    [
      initialized,
      session,
      profile,
      profileLoading,
      rank,
      isAdmin,
      syncError,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      signOut,
      refreshProfile,
      saveProfile,
      pushProgress,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth — الخطاف الموحّد للمصادقة.
 *
 * بعكس Clerk، لا يرمي أبداً إذا غاب المزوّد: يُرجع حالة "زائر" حتى تبقى
 * الصفحات العامة قابلة للرسم (وهو ما كان يفعله ClerkErrorBoundary سابقاً).
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context) return context
  return GUEST_AUTH
}

const NOOP_ASYNC = async (): Promise<{ error: string | null }> => ({ error: null })

const GUEST_AUTH: AuthContextValue = {
  initialized: true,
  session: null,
  user: null,
  profile: null,
  profileLoading: false,
  rank: getRankForXp(0),
  isAdmin: false,
  isPro: false,
  syncError: null,
  signIn: NOOP_ASYNC,
  signUp: async () => ({ error: null, needsEmailConfirmation: false }),
  signInWithGoogle: NOOP_ASYNC,
  resetPassword: NOOP_ASYNC,
  signOut: async () => {},
  refreshProfile: async () => null,
  saveProfile: async () => ({ synced: false, reason: "بلا جلسة" }),
  pushProgress: async () => ({ synced: false, reason: "بلا جلسة" }),
}

/** اختصار شائع: هل يوجد مستخدم مسجّل؟ */
export function useIsSignedIn(): boolean {
  return Boolean(useAuth().user)
}
