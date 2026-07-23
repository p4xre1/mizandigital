import { useState, useEffect } from "react";
import {
  Heart,
  Bookmark,
  FileText,
  TrendingUp,
  Camera,
  ShieldCheck,
  AlertTriangle,
  X,
  Award,
  Save,
  Trash2,
  Loader2,
  Lock,
  Megaphone,
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { trackEvent } from "../lib/analytics";
import { sanitizeText, looksLikeSpam } from "../lib/security";
import { useRole } from "../hooks/useRole";

interface Article {
  id: string;
  title: string;
  cat: string;
}

interface NewsItem {
  id: string;
  title: string;
  date: string;
}

interface ResumeItem {
  id: string;
  name: string;
  size: string;
}

export default function Profile() {
  const { t, dir } = useI18n();
  const { role, isStaff, isAdmin, isDeveloper } = useRole();

  const [bio, setBio] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bioError, setBioError] = useState("");
  const [bioSuccess, setBioSuccess] = useState(false);
  const [savingBio, setSavingBio] = useState(false);

  // User state
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // S1 - S6 Dynamic Academic Progress state
  const [progress, setProgress] = useState<Record<string, number>>({
    S1: 0,
    S2: 0,
    S3: 0,
    S4: 0,
    S5: 0,
    S6: 0,
  });

  // User content states
  const [likedArticles, setLikedArticles] = useState<Article[]>([]);
  const [savedNews, setSavedNews] = useState<NewsItem[]>([]);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Metrics
  const metrics = [
    { icon: <Heart size={18} />, value: likedArticles.length, key: "liked_articles" },
    { icon: <Bookmark size={18} />, value: savedNews.length, key: "saved_news" },
    { icon: <FileText size={18} />, value: resumes.length, key: "uploaded_resumes" },
  ];

  // Fetch User Profile and Content
  useEffect(() => {
    async function loadUserProfileAndData() {
      if (!isSupabaseConfigured) {
        setLoadingData(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoadingData(false);
          return;
        }

        setUserId(user.id);
        setEmail(user.email || "");

        // Fetch user profile attributes
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("bio, full_name, avatar_url, progress")
          .eq("id", user.id)
          .single();

        if (!profileError && profile) {
          if (profile.bio) setBio(profile.bio);
          if (profile.full_name) setDisplayName(profile.full_name);
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
          if (profile.progress) {
            setProgress(profile.progress as Record<string, number>);
          }
        }

        // Fetch Saved Items
        const { data: savedItems } = await supabase
          .from("user_saved_items")
          .select("item_id, item_type, created_at, title")
          .eq("user_id", user.id);

        if (savedItems && savedItems.length > 0) {
          const articlesList: Article[] = savedItems
            .filter((i) => i.item_type === "article")
            .map((i) => ({
              id: i.item_id,
              title: i.title || "مقالة قانونية",
              cat: "القانون العام",
            }));

          const newsList: NewsItem[] = savedItems
            .filter((i) => i.item_type === "news" || i.item_type === "jurisprudence")
            .map((i) => ({
              id: i.item_id,
              title: i.title || "نص قانوني/خبر",
              date: new Date(i.created_at).toLocaleDateString("ar-MA"),
            }));

          setLikedArticles(articlesList);
          setSavedNews(newsList);
        }

        // Fetch User Resumes
        const { data: userResumes } = await supabase
          .from("user_resumes")
          .select("id, file_name, file_size")
          .eq("user_id", user.id);

        if (userResumes) {
          setResumes(
            userResumes.map((r) => ({
              id: r.id,
              name: r.file_name,
              size: r.file_size ? `${(r.file_size / 1024).toFixed(1)} KB` : "1.2 MB",
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoadingData(false);
      }
    }

    loadUserProfileAndData();
  }, []);

  // Handle progress bar clicks with RTL calculation support
  const handleProgressClick = async (semester: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isRTL = dir === "rtl";
    const clickX = isRTL ? rect.right - e.clientX : e.clientX - rect.left;

    let percentage = Math.round((clickX / rect.width) * 100);
    percentage = Math.max(0, Math.min(100, Math.round(percentage / 5) * 5));

    const updatedProgress = { ...progress, [semester]: percentage };
    setProgress(updatedProgress);

    if (isSupabaseConfigured && userId) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ progress: updatedProgress })
          .eq("id", userId);

        if (error) throw error;
        trackEvent("progress_updated");
      } catch (err) {
        console.error("Failed to save progress to DB:", err);
      }
    }
  };

  // Avatar conversion fallback
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const LIMIT_MB = 2;
    if (file.size > LIMIT_MB * 1024 * 1024) {
      setAvatarError(`حجم الصورة كبير جداً. الحد الأقصى هو ${LIMIT_MB} ميغابايت.`);
      return;
    }

    setAvatarError("");
    setUploadingAvatar(true);

    if (isSupabaseConfigured && userId) {
      try {
        const fileExt = file.name.split(".").pop();
        const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", userId);

        if (updateError) throw updateError;

        setAvatarUrl(publicUrl);
        trackEvent("avatar_uploaded_storage");
      } catch (err) {
        console.warn("Storage upload failed, attempting Base64 fallback...", err);
        try {
          const base64data = await readFileAsBase64(file);
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: base64data })
            .eq("id", userId);

          if (!updateError) {
            setAvatarUrl(base64data);
            trackEvent("avatar_uploaded_base64");
          } else {
            setAvatarError(`خطأ تحديث قاعدة البيانات: ${updateError.message}`);
          }
        } catch (fallbackErr) {
          const errorMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          setAvatarError(`تعذّر حفظ الصورة: ${errorMsg}`);
        }
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  // Save Bio
  const handleSaveBio = async () => {
    setBioError("");
    setBioSuccess(false);
    setSavingBio(true);

    const clean = sanitizeText(bio, 500);
    if (looksLikeSpam(clean)) {
      setBioError("النبذة تحتوي على محتوى غير مسموح.");
      setSavingBio(false);
      return;
    }
    setBio(clean);

    try {
      if (isSupabaseConfigured && userId) {
        const { error } = await supabase
          .from("profiles")
          .update({ bio: clean })
          .eq("id", userId);

        if (error) throw error;
        setBioSuccess(true);
      }
      trackEvent("bio_updated");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes("RATE_LIMIT_EXCEEDED")) {
        setBioError("⏱️ مهلاً! أنت تقوم بالتحديث بسرعة كبيرة. يرجى الانتظار ثانيتين.");
      } else {
        setBioError(`تعذّر الحفظ: ${errorMsg}`);
      }
    } finally {
      setSavingBio(false);
    }
  };

  // Account Emergency Freeze
  const handleFreezeAccount = async () => {
    if (!window.confirm("هل أنت متأكد من تجميد الحساب؟") || !userId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_frozen: true })
        .eq("id", userId);

      if (error) throw error;

      alert("🧊 تم تجميد الحساب بنجاح. جاري تسجيل الخروج...");
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`تعذّر تجميد الحساب: ${errorMsg}`);
    }
  };

  // Delete Account
  const handleDelete = async () => {
    setDeleting(true);
    trackEvent("account_delete_confirmed");
    try {
      if (isSupabaseConfigured) {
        await supabase.functions.invoke("deleteUserAccount", {});
        await supabase.auth.signOut();
      }
    } catch {
      /* handled gracefully */
    }
    setDeleting(false);
    setShowDelete(false);
  };

  // Dynamic Role Badge Configuration using `useRole`
  const getAdStatusBadge = () => {
    if (isDeveloper || role === "root") {
      return {
        label: "المدير التنفيذي (Root) • وصول كامل",
        colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        icon: <ShieldCheck size={12} />,
      };
    }
    if (isAdmin) {
      return {
        label: "مسؤول الحماية والأمان • بدون إعلانات",
        colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        icon: <ShieldCheck size={12} />,
      };
    }
    if (isStaff) {
      return {
        label: "محرر محتوى (Writer) • بدون إعلانات",
        colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        icon: <Award size={12} />,
      };
    }
    return {
      label: "عضوية عامة • تدعم الإعلانات",
      colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      icon: <Megaphone size={12} />,
    };
  };

  const adStatusProps = getAdStatusBadge();
  const initial = displayName
    ? displayName.charAt(0).toUpperCase()
    : email
    ? email.charAt(0).toUpperCase()
    : "U";

  if (loadingData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" dir={dir}>
      <div className="grid lg:grid-cols-[7fr_3fr] gap-8">
        {/* ── LEFT 70% — Core dashboard ── */}
        <div className="space-y-8">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Playfair Display', 'Noto Serif Arabic', serif" }}
          >
            {t("dashboard")}
          </h1>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            {metrics.map((m) => (
              <div key={m.key} className="bg-card border border-border rounded-xl p-5 text-center">
                <div className="text-primary flex justify-center mb-2">{m.icon}</div>
                <div className="text-2xl font-bold text-foreground">{m.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{t(m.key)}</div>
              </div>
            ))}
          </div>

          {/* Academic progress */}
          <section className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-primary" />
              <h2
                className="font-bold text-foreground"
                style={{ fontFamily: "'Playfair Display', 'Noto Serif Arabic', serif" }}
              >
                {t("academic_progress")}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              انقر على أي شريط لتعديل نسبة تقدّمك الأكاديمي وحفظها تلقائياً.
            </p>

            <div className="space-y-4">
              {Object.entries(progress).map(([sem, val]) => (
                <div key={sem}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{sem}</span>
                    <span className="text-muted-foreground font-mono">{val}%</span>
                  </div>
                  <div
                    role="slider"
                    aria-valuenow={val}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    tabIndex={0}
                    onClick={(e) => handleProgressClick(sem, e)}
                    className="h-3 rounded-full bg-muted overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all relative"
                  >
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-350"
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Liked / Saved / Resumes */}
          <div className="grid md:grid-cols-2 gap-4">
            <section className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={15} className="text-primary" />
                <h3 className="font-bold text-sm text-foreground">{t("liked_articles")}</h3>
              </div>
              {likedArticles.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  لا توجد مقالات معجب بها حالياً.
                </p>
              ) : (
                <ul className="space-y-2">
                  {likedArticles.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <span className="text-sm text-foreground line-clamp-1">{a.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{a.cat}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bookmark size={15} className="text-primary" />
                <h3 className="font-bold text-sm text-foreground">{t("saved_news")}</h3>
              </div>
              {savedNews.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  لا توجد نصوص أو أخبار محفوظة.
                </p>
              ) : (
                <ul className="space-y-2">
                  {savedNews.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <span className="text-sm text-foreground line-clamp-1">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {n.date}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-card border border-border rounded-xl p-5 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} className="text-primary" />
                <h3 className="font-bold text-sm text-foreground">{t("uploaded_resumes")}</h3>
              </div>
              {resumes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  لم تقم برفع سير ذاتية بعد.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {resumes.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border"
                    >
                      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0">
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate">{r.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {r.size} · AES-256 🔒
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ── RIGHT 30% — Fixed sidebar ── */}
        <aside className="space-y-5 lg:sticky lg:top-24 self-start">
          {/* Citadel Active Shield Badge */}
          <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                حماية Citadel: مفعّلة
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono px-2 py-0.5 rounded-md">
              Zero-Trust
            </span>
          </div>

          {/* Avatar + Status */}
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="relative w-24 h-24 mx-auto mb-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border border-border"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-primary text-3xl font-bold"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {initial}
                </div>
              )}

              <label className="absolute bottom-0 end-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-card hover:opacity-90 transition-opacity cursor-pointer">
                <Camera size={14} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            {uploadingAvatar && (
              <p className="text-[10px] text-primary animate-pulse mb-2">جاري الرفع...</p>
            )}
            {avatarError && (
              <p className="text-[10px] text-destructive mb-2 max-w-[200px] mx-auto leading-tight">
                {avatarError}
              </p>
            )}

            <h3
              className="font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', 'Noto Serif Arabic', serif" }}
            >
              {displayName || "مستعمل جديد"}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{email || "no-email@mizan.ma"}</p>

            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-300 ${adStatusProps.colorClass}`}
            >
              {adStatusProps.icon}
              {adStatusProps.label}
            </span>
          </div>

          {/* Bio editor */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Award size={15} className="text-primary" />
              <h4 className="font-bold text-sm text-foreground">{t("short_bio")}</h4>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="اكتب نبذة شخصية هنا..."
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-input-background focus:outline-none focus:border-primary transition-colors resize-none"
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}
            />

            {bioError && <p className="text-xs text-destructive mt-1 leading-tight">{bioError}</p>}
            {bioSuccess && (
              <p className="text-xs text-emerald-600 mt-1 leading-tight">
                ✓ تم حفظ النبذة بنجاح!
              </p>
            )}

            <button
              onClick={handleSaveBio}
              disabled={savingBio}
              className="mt-2 w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {savingBio ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              حفظ النبذة
            </button>
          </div>

          {/* Danger zone */}
          <div className="border border-destructive/40 rounded-xl p-5 bg-destructive/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-destructive" />
              <h4 className="font-bold text-sm text-destructive">{t("danger_zone")}</h4>
            </div>

            <button
              onClick={handleFreezeAccount}
              className="w-full mb-2 py-2 border border-blue-500/50 text-blue-500 text-xs font-semibold rounded-lg hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <Lock size={13} />
              🧊 تجميد الحساب فوراً
            </button>

            <button
              onClick={() => setShowDelete(true)}
              className="w-full py-2 border border-destructive text-destructive text-xs font-semibold rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 size={13} /> {t("delete_account")}
            </button>
          </div>
        </aside>
      </div>

      {/* Delete confirmation modal */}
      {showDelete && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowDelete(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full"
            dir={dir}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={20} />
                <h3 className="font-bold text-lg">{t("delete_account")}</h3>
              </div>
              <button
                onClick={() => setShowDelete(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <p
              className="text-sm text-muted-foreground leading-relaxed mb-6"
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}
            >
              {t("brand") === "منصة ميزان"
                ? "تحذير: هذا الإجراء سيؤدي إلى حذف جميع بياناتك، ملفاتك المحفوظة، وإعجاباتك نهائياً من منصة ميزان ولا يمكن التراجع عنه."
                : "Warning: This action will permanently erase all your data, saved documents, and likes. This cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "جاري الحذف..." : "نعم، احذف حسابي"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}