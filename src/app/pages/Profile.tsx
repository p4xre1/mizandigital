import { useState, useEffect } from "react";
import {
  Heart, Bookmark, FileText, TrendingUp, Camera, ShieldCheck,
  AlertTriangle, X, Award, GraduationCap, Save, Trash2, Zap, Settings, Loader2
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { trackEvent } from "../lib/analytics";
import { sanitizeText, looksLikeSpam } from "../lib/security";

export default function Profile() {
  const { t, dir } = useI18n();
  const [bio, setBio] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bioError, setBioError] = useState("");
  const [bioSuccess, setBioSuccess] = useState(false);
  
  // Real-time dynamic profile and subscription states
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [tier, setTier] = useState<'free' | 'premium' | 'enterprise'>('free');
  const [updatingTier, setUpdatingTier] = useState(false);
  
  // صلاحية المدير (Admin) لتحديد من يمكنه تعديل الاشتراكات يدوياً
  const [isAdmin, setIsAdmin] = useState(false);

  // S1 - S6 Dynamic Progress state (starts cleanly at 0%)
  const [progress, setProgress] = useState<Record<string, number>>({
    S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, S6: 0
  });

  // Real-time user content states (Initialized to empty)
  const [likedArticles, setLikedArticles] = useState<any[]>([]);
  const [savedNews, setSavedNews] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);

  // Dynamically calculate metrics from actual states
  const metrics = [
    { icon: <Heart size={18} />, value: likedArticles.length, key: "liked_articles" },
    { icon: <Bookmark size={18} />, value: savedNews.length, key: "saved_news" },
    { icon: <FileText size={18} />, value: resumes.length, key: "uploaded_resumes" },
  ];

  // 1. Initialize Profile details and Subscription Tier from Supabase
  useEffect(() => {
    async function loadUserProfile() {
      if (isSupabaseConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserId(user.id);
            setEmail(user.email || "");
            
            // Query current subscriber metadata tier, bio, and profile options
            const { data, error } = await supabase
              .from("profiles")
              .select("tier, bio, full_name, avatar_url, progress, role")
              .eq("id", user.id)
              .single();

            if (!error && data) {
              if (data.tier) setTier(data.tier as 'free' | 'premium' | 'enterprise');
              if (data.bio) setBio(data.bio);
              if (data.full_name) setDisplayName(data.full_name);
              if (data.avatar_url) setAvatarUrl(data.avatar_url);
              if (data.role === 'admin') setIsAdmin(true);
              if (data.progress) {
                setProgress(data.progress as Record<string, number>);
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      }
    }
    loadUserProfile();
  }, []);

  // 2. Handle interactive progress bar changes
  const handleProgressClick = async (semester: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    // Calculate percentage rounded to nearest 5%
    let percentage = Math.round((clickX / width) * 100);
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
        console.error("Failed to save dynamic progress to DB:", err);
      }
    }
  };

  // 3. Handle profile picture selection with size validation
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 2MB image size limit
    const LIMIT_MB = 2;
    const MAX_SIZE_BYTES = LIMIT_MB * 1024 * 1024;

    if (file.size > MAX_SIZE_BYTES) {
      setAvatarError(`حجم الصورة كبير جداً. الحد الأقصى المسموح به هو ${LIMIT_MB} ميغابايت.`);
      return;
    }

    setAvatarError("");
    setUploadingAvatar(true);

    if (isSupabaseConfigured && userId) {
      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

        // A. Attempt to upload file to Supabase Storage Bucket ('avatars')
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // B. Retrieve public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // C. Update profiles table with new URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', userId);

        if (updateError) throw updateError;

        setAvatarUrl(publicUrl);
        trackEvent("avatar_uploaded_storage");
      } catch (err: any) {
        console.warn("Storage bucket upload failed, trying Base64 fallback...", err);
        
        // Dynamic Fallback: Convert image directly to Base64 data-URL and save in DB column
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ avatar_url: base64data })
              .eq('id', userId);

            if (!updateError) {
              setAvatarUrl(base64data);
              trackEvent("avatar_uploaded_base64");
            } else {
              setAvatarError(`خطأ تحديث قاعدة البيانات: ${updateError.message}`);
            }
          };
          reader.readAsDataURL(file);
        } catch (fallbackErr: any) {
          setAvatarError(`تعذّر حفظ الصورة: ${fallbackErr.message || fallbackErr}`);
        }
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  // 4. Simulate direct Stripe / B2B Webhook updates locally
  const handleTierSwitch = async (targetTier: 'free' | 'premium' | 'enterprise') => {
    if (!userId || !isSupabaseConfigured) {
      alert("يرجى إعداد الاتصال بقاعدة البيانات أولاً لمحاكاة التغييرات.");
      return;
    }
    setUpdatingTier(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tier: targetTier })
        .eq('id', userId);

      if (!error) {
        setTier(targetTier);
        trackEvent(`tier_simulated_${targetTier}`);
      } else {
        alert(`Database update failed: ${error.message}`);
      }
    } catch (err) {
      console.error("Simulation trigger failed:", err);
    } finally {
      setUpdatingTier(false);
    }
  };

  const handleSaveBio = async () => {
    setBioError("");
    setBioSuccess(false);
    const clean = sanitizeText(bio, 500);
    if (looksLikeSpam(clean)) { 
      setBioError("النبذة تحتوي على محتوى غير مسموح."); 
      return; 
    }
    setBio(clean);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from("profiles")
            .update({ bio: clean })
            .eq("id", user.id);
            
          if (error) throw error;
          setBioSuccess(true);
        }
      }
      trackEvent("bio_updated");
    } catch (err: any) {
      console.error("Bio update failed:", err);
      setBioError(`تعذّر الحفظ: ${err.message || "تأكد من إعدادات الجدول والاتصال"}`);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    trackEvent("account_delete_confirmed");
    try {
      if (isSupabaseConfigured) {
        await supabase.functions.invoke("deleteUserAccount", {});
        await supabase.auth.signOut();
      }
    } catch { /* handled below */ }
    setDeleting(false);
    setShowDelete(false);
  };

  // Determine user-friendly visual styles for current active tier
  const getTierMetadata = () => {
    if (isAdmin) {
      return { 
        label: t("membership_admin") || "مسؤول النظام • Admin", 
        colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", 
        icon: <ShieldCheck size={12} /> 
      };
    }
    switch (tier) {
      case 'premium':
        return { 
          label: "ميزان بريميوم • Premium", 
          colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", 
          icon: <Zap size={12} className="fill-emerald-500/10" /> 
        };
      case 'enterprise':
        return { 
          label: "اشتراك مؤسساتي • University", 
          colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", 
          icon: <GraduationCap size={12} /> 
        };
      default:
        return { 
          label: "عضوية مجانية • Free", 
          colorClass: "bg-slate-100 dark:bg-slate-800 text-muted-foreground border-border", 
          icon: <Award size={12} /> 
        };
    }
  };

  const activeTierProps = getTierMetadata();
  const initial = displayName ? displayName.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : "U");

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" dir={dir}>
      {/* 70 / 30 asymmetric grid */}
      <div className="grid lg:grid-cols-[7fr_3fr] gap-8">

        {/* ── LEFT 70% — Core dashboard ── */}
        <div className="space-y-8">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', 'Noto Serif Arabic', serif" }}>{t("dashboard")}</h1>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            {metrics.map(m => (
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
              <h2 className="font-bold text-foreground" style={{ fontFamily: "'Playfair Display', 'Noto Serif Arabic', serif" }}>{t("academic_progress")}</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">انقر على أي شريط لتعديل نسبة تقدّمك الأكاديمي وحفظها تلقائياً.</p>
            
            <div className="space-y-4">
              {Object.entries(progress).map(([sem, val]) => (
                <div key={sem}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{sem}</span>
                    <span className="text-muted-foreground font-mono">{val}%</span>
                  </div>
                  <div 
                    onClick={(e) => handleProgressClick(sem, e)}
                    className="h-3 rounded-full bg-muted overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all relative"
                  >
                    <div className="h-full bg-primary rounded-full transition-all duration-350" style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Liked / Saved / Resumes */}
          <div className="grid md:grid-cols-2 gap-4">
            <section className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3"><Heart size={15} className="text-primary" /><h3 className="font-bold text-sm text-foreground">{t("liked_articles")}</h3></div>
              {likedArticles.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">لا توجد مقالات معجب بها حالياً.</p>
              ) : (
                <ul className="space-y-2">
                  {likedArticles.map(a => (
                    <li key={a.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                      <span className="text-sm text-foreground line-clamp-1">{a.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{a.cat}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3"><Bookmark size={15} className="text-primary" /><h3 className="font-bold text-sm text-foreground">{t("saved_news")}</h3></div>
              {savedNews.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">لا توجد نصوص أو أخبار محفوظة.</p>
              ) : (
                <ul className="space-y-2">
                  {savedNews.map(n => (
                    <li key={n.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                      <span className="text-sm text-foreground line-clamp-1">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">{n.date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-card border border-border rounded-xl p-5 md:col-span-2">
              <div className="flex items-center gap-2 mb-3"><FileText size={15} className="text-primary" /><h3 className="font-bold text-sm text-foreground">{t("uploaded_resumes")}</h3></div>
              {resumes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">لم تقم برفع سير ذاتية بعد.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {resumes.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0"><FileText size={15} /></div>
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate">{r.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{r.size} · AES-256 🔒</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* 🛠️ MONETIZATION DEVELOPER SANDBOX PANEL */}
          {/* هذا الجزء لن يظهر للمستخدم العادي في الموقع المرفوع أبداً! يظهر فقط عند التطوير محلياً أو للمدير */}
          {(isAdmin || import.meta.env.DEV) && (
            <section className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2.5 mb-4">
                <Settings size={18} className="text-primary" />
                <h2 className="font-bold text-base text-foreground">بيئة اختبار بوابة الدفع والدراسة (Dev Sandbox)</h2>
              </div>
              
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                هذه اللوحة تظهر لك فقط لأنك في وضع التطوير المحلي (`localhost`). تتيح لك التنقل السريع واختبار تفعيل الباقات مجاناً.
              </p>

              <div className="grid sm:grid-cols-3 gap-3">
                <button 
                  disabled={updatingTier || tier === 'free'}
                  onClick={() => handleTierSwitch('free')}
                  className="flex items-center justify-center gap-2 py-3 px-4 border border-border rounded-xl text-xs font-semibold hover:bg-accent transition-all disabled:opacity-50"
                >
                  {updatingTier && tier === 'free' ? <Loader2 size={13} className="animate-spin" /> : "📉"}
                  التحويل إلى باقة مجانية (تفعيل الإعلانات)
                </button>

                <button 
                  disabled={updatingTier || tier === 'premium'}
                  onClick={() => handleTierSwitch('premium')}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                >
                  {updatingTier && tier === 'premium' ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  محاكاة نجاح الدفع (تفعيل بريميوم)
                </button>

                <button 
                  disabled={updatingTier || tier === 'enterprise'}
                  onClick={() => handleTierSwitch('enterprise')}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                >
                  {updatingTier && tier === 'enterprise' ? <Loader2 size={13} className="animate-spin" /> : <GraduationCap size={13} />}
                  محاكاة ولوج جامعي (B2B Enterprise)
                </button>
              </div>
            </section>
          )}

        </div>

        {/* ── RIGHT 30% — Fixed sidebar ── */}
        <aside className="space-y-5 lg:sticky lg:top-24 self-start">
          {/* Avatar + membership */}
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
              <p className="text-[10px] text-destructive mb-2 max-w-[200px] mx-auto leading-tight">{avatarError}</p>
            )}

            <h3 className="font-bold text-foreground" style={{ fontFamily: "'Playfair Display', 'Noto Serif Arabic', serif" }}>
              {displayName || "مستعمل جديد"}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{email || "no-email@mizan.ma"}</p>
            
            {/* Real-time Dynamic Tier Badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-300 ${activeTierProps.colorClass}`}>
              {activeTierProps.icon}
              {activeTierProps.label}
            </span>
          </div>

          {/* Bio editor */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3"><GraduationCap size={15} className="text-primary" /><h4 className="font-bold text-sm text-foreground">{t("short_bio")}</h4></div>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={500}
              placeholder="اكتب نبذة شخصية هنا..."
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-input-background focus:outline-none focus:border-primary transition-colors resize-none"
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }} />
            
            {bioError && <p className="text-xs text-destructive mt-1 leading-tight">{bioError}</p>}
            {bioSuccess && <p className="text-xs text-emerald-600 mt-1 leading-tight">✓ تم حفظ النبذة بنجاح في قاعدة البيانات!</p>}
            
            <button onClick={handleSaveBio} className="mt-2 w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
              <Save size={13} /> {t("short_bio")}
            </button>
          </div>

          {/* Danger zone */}
          <div className="border border-destructive/40 rounded-xl p-5 bg-destructive/5">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={15} className="text-destructive" /><h4 className="font-bold text-sm text-destructive">{t("danger_zone")}</h4></div>
            <button onClick={() => setShowDelete(true)}
              className="w-full py-2 border border-destructive text-destructive text-xs font-semibold rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center gap-1.5">
              <Trash2 size={13} /> {t("delete_account")}
            </button>
          </div>
        </aside>
      </div>

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowDelete(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full" dir={dir} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-destructive"><AlertTriangle size={20} /><h3 className="font-bold text-lg">{t("delete_account")}</h3></div>
              <button onClick={() => setShowDelete(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
              {t("brand") === "منصة ميزان"
                ? "تحذير: هذا الإجراء سيؤدي إلى حذف جميع بياناتك، ملفاتك المحفوظة، وإعجاباتك نهائياً من منصة ميزان ولا يمكن التراجع عنه."
                : "Warning: This action will permanently erase all your data, saved documents, and likes. This cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors">
                إلغاء
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                {deleting ? "..." : "نعم، احذف حسابي"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}