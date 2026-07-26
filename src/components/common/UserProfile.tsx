"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Bookmark,
  Award,
  Trash2,
  Edit3,
  ShieldAlert,
  FileText,
  UploadCloud,
  Check,
  X,
  File,
  Loader2,
  User,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  LogOut,
  CheckCircle2,
  Lock,
  FileSpreadsheet
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export type Lang = "ar" | "fr" | "en" | "es";

export interface UserData {
  id?: string;
  fullName: string;
  email: string;
  academicRole: "Student" | "Researcher" | "Admin" | string;
  avatarUrl?: string;
  bio?: string;
  downloadsCount?: number;
  savedCount?: number;
}

interface UserProfileProps {
  user: UserData;
  dir?: "rtl" | "ltr";
  lang?: Lang;
  onUpdateUser?: (updated: UserData) => void;
}

const LABELS = {
  downloadedMemos: {
    ar: "تنزيلات المذكرات",
    fr: "Mémorandums téléchargés",
    en: "Downloaded Memorandums",
    es: "Memorandos descargados",
  },
  savedPrecedents: {
    ar: "الأحكام المحفوظة",
    fr: "Jurisprudences enregistrées",
    en: "Saved Precedents",
    es: "Jurisprudencias guardadas",
  },
  verifiedStatus: {
    ar: "الرتبة الأكاديمية",
    fr: "Statut académique",
    en: "Verified Status",
    es: "Estado académico",
  },
  uploadedPapers: {
    ar: "الأوراق والمذكرات المرفوعة",
    fr: "Documents académiques publiés",
    en: "Uploaded Academic Papers",
    es: "Documentos académicos publicados",
  },
  uploadFile: {
    ar: "رفع مستند جديد",
    fr: "Téléverser un fichier",
    en: "Upload File",
    es: "Subir archivo",
  },
  noFilesYet: {
    ar: "لم تقم برفع أي مذكرة أو بحث قانوني حتى الآن.",
    fr: "Aucun document téléchargé pour le moment.",
    en: "No academic papers uploaded yet.",
    es: "Aún no se han subido documentos académicos.",
  },
  editBio: {
    ar: "تعديل السيرة الذاتية",
    fr: "Modifier la biographie",
    en: "Edit Bio",
    es: "Editar biografía",
  },
  noBio: {
    ar: "لم يتم إدخال نبذة أكاديمية بعد.",
    fr: "Aucune biographie fournie.",
    en: "No academic biography provided.",
    es: "No se proporcionó biografía académica.",
  },
  dangerZone: {
    ar: "منطقة الخطر والسيادة",
    fr: "Zone de danger",
    en: "Danger Zone",
    es: "Zona de peligro",
  },
  deleteDesc: {
    ar: "سيؤدي حذف الحساب لمسح جميع التنزيلات والأحكام المحفوظة بشكل نهائي.",
    fr: "La suppression de votre compte effacera définitivement toutes vos données.",
    en: "Deleting your account permanently purges your saved data.",
    es: "Eliminar su cuenta borrará permanentemente todos sus datos.",
  },
  deleteAccount: {
    ar: "حذف الحساب نهائياً",
    fr: "Supprimer le compte",
    en: "Delete Account",
    es: "Eliminar cuenta",
  },
  confirmDeleteTitle: {
    ar: "تأكيد حذف الحساب",
    fr: "Confirmer la suppression",
    en: "Confirm Account Deletion",
    es: "Confirmar eliminación",
  },
  confirmDeleteMsg: {
    ar: "هل أنت تأكد من رغبتك في حذف الحساب؟ لا يمكن التراجع عن هذا الإجراء.",
    fr: "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.",
    en: "Are you sure you want to delete your account? This action cannot be undone.",
    es: "¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.",
  },
  cancel: { ar: "إلغاء", fr: "Annuler", en: "Cancel", es: "Cancelar" },
  save: { ar: "حفظ", fr: "Enregistrer", en: "Save", es: "Guardar" },
  signOut: { ar: "تسجيل الخروج", fr: "Déconnexion", en: "Sign Out", es: "Cerrar sesión" }
} as const;

function t(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key][lang] || LABELS[key].en;
}

// Master SEO Keywords Cloud
const SEO_KEYWORDS = [
  "الأبحاث القانونية",
  "رسائل الماستر",
  "كليات الحقوق FSJES",
  "الاجتهاد القضائي",
  "القانون المغربي",
  "Droit Marocain",
  "Academic Research"
];

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  dir = "rtl",
  lang = "ar",
  onUpdateUser,
}) => {
  // Loading & Action States
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  // Bio Edit State
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(user.bio || "");

  // Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // File List State
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; date: string; url?: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if user prop updates
  useEffect(() => {
    setBioText(user.bio || "");
  }, [user.bio]);

  // Safe Google AdSense Initializer
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.warn("Google AdSense safely handled in UserProfile:", err);
    }
  }, []);

  // Handle Bio Save directly to Supabase DB with session security
const handleSaveBio = async () => {
  try {
    setIsSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.error("No active session found.");
      return;
    }

    // Sanitize input
    const sanitizedBio = bioText.trim();

    // Fixed Supabase 'never' parameter type error using type cast 'as any'
    const { error } = await (supabase.from("profiles") as any)
      .update({ bio: sanitizedBio })
      .eq("id", session.user.id);

    if (error) throw error;

    const updatedUser = { ...user, bio: sanitizedBio };
    if (onUpdateUser) onUpdateUser(updatedUser);
    setIsEditingBio(false);
  } catch (err) {
    console.error("Failed to update bio in Supabase:", err);
  } finally { // Replaced 'font-mono {' with 'finally {'
    setIsSaving(false);
  }
};

  // Upload file with file-extension & 10MB size security validations
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadErrorMsg(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Security Rule 1: Validate Max File Size (10 MB)
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setUploadErrorMsg("حجم الملف يتجاوز الحد المسموح به (10 ميغابايت).");
      return;
    }

    // Security Rule 2: Whitelist File Extensions
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      setUploadErrorMsg("نوع الملف غير مدعوم. المسموح: PDF, DOC, DOCX.");
      return;
    }

    try {
      setIsUploading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setUploadErrorMsg("يرجى تسجيل الدخول لرفع المستندات.");
        return;
      }

      const filePath = `${session.user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      const { error: uploadError } = await supabase.storage
        .from("user-uploads")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("user-uploads")
        .getPublicUrl(filePath);

      const newFile = {
        name: file.name,
        date: new Date().toLocaleDateString(
          lang === "ar" ? "ar-EG" : "en-US"
        ),
        url: publicUrlData.publicUrl,
      };

      setUploadedFiles((prev) => [newFile, ...prev]);
    } catch (err) {
      console.error("Failed to upload file to Supabase:", err);
      setUploadErrorMsg("حدث خطأ أثناء رفع المستند. يرجى المحاولة لاحقاً.");
    } finally {
      setIsUploading(false);
    }
  };

  // Safe Sign-Out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  // Structured Schema.org for SEO
  const jsonLdPerson = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": user.fullName,
    "email": user.email,
    "jobTitle": user.academicRole,
    "description": user.bio || "Mizan Digital Academic Researcher Profile"
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-sans" dir={dir}>
      
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPerson) }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        
        {/* ================= LEFT 70% MAIN WORKSPACE (Col Span 7) ================= */}
        <main className="lg:col-span-7 space-y-8">
          
          {/* Header Member Profile Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white shadow-xl relative overflow-hidden border border-slate-800">
            
            {/* Background Glow */}
            <div className="absolute -top-24 -end-24 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Award size={12} />
                    {user.academicRole}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={11} />
                    Active Member
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {user.fullName}
                </h1>
                <p className="text-xs text-slate-300 font-mono">{user.email}</p>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleSignOut}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200 flex items-center gap-2 active:scale-95 transition-all touch-manipulation cursor-pointer shrink-0"
              >
                <LogOut size={15} className="text-rose-400" />
                <span>{t("signOut", lang)}</span>
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-1 shadow-xs">
              <BookOpen className="mx-auto text-blue-600 mb-1" size={24} />
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {user.downloadsCount ?? 0}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("downloadedMemos", lang)}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-1 shadow-xs">
              <Bookmark className="mx-auto text-amber-500 mb-1" size={24} />
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {user.savedCount ?? 0}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("savedPrecedents", lang)}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-1 shadow-xs">
              <Award className="mx-auto text-emerald-500 mb-1" size={24} />
              <div className="text-2xl font-black text-slate-900 dark:text-white truncate">
                {user.academicRole}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("verifiedStatus", lang)}
              </div>
            </div>
          </div>

          {/* Uploaded Papers & Academic Documents Section */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <span>{t("uploadedPapers", lang)}</span>
              </h3>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-95 touch-manipulation cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UploadCloud size={16} />
                )}
                <span>{t("uploadFile", lang)}</span>
              </button>
            </div>

            {/* Error Banner */}
            {uploadErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{uploadErrorMsg}</span>
              </div>
            )}

            {uploadedFiles.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                <FileSpreadsheet className="mx-auto text-slate-400 opacity-60" size={32} />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("noFilesYet", lang)}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploadedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200 truncate">
                      <File size={18} className="text-amber-500 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ms-2">
                      {f.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Google AdSense Academic Research Banner */}
          <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-center overflow-hidden">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 px-1">
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                <Sparkles size={12} />
                {lang === "ar" ? "إعلانات أبحاث شركاء ميزان" : "Sponsored Academic Ad"}
              </span>
              <span className="font-mono text-[9px] text-slate-500">Google Ads</span>
            </div>
            <div className="min-h-[90px] flex items-center justify-center">
              <ins
                className="adsbygoogle"
                style={{ display: "block", width: "100%", minHeight: "90px" }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                data-ad-slot="5678901234"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            </div>
          </div>

        </main>

        {/* ================= RIGHT 30% SIDEBAR (Col Span 3) ================= */}
        <aside className="lg:col-span-3 space-y-6">
          
          {/* Avatar & Member Profile Card */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-4 shadow-xs">
            <div className="relative inline-block mx-auto">
              <img
                src={
                  user.avatarUrl ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop"
                }
                alt={user.fullName}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 shadow-md"
              />
              <span className="absolute bottom-1 end-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                <span>{user.fullName}</span>
                <ShieldCheck size={16} className="text-blue-500 shrink-0" />
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {user.academicRole}
              </p>
            </div>

            {/* Editable Bio Section */}
            {isEditingBio ? (
              <div className="space-y-2 text-start">
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveBio}
                    disabled={isSaving}
                    className="min-h-[44px] flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform touch-manipulation cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>{t("save", lang)}</span>
                  </button>
                  <button
                    onClick={() => setIsEditingBio(false)}
                    className="min-h-[44px] px-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold active:scale-95 transition-transform touch-manipulation cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed px-1">
                {user.bio || t("noBio", lang)}
              </p>
            )}

            {!isEditingBio && (
              <button
                onClick={() => setIsEditingBio(true)}
                className="min-h-[44px] w-full flex items-center justify-center gap-2 py-2 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all touch-manipulation cursor-pointer"
              >
                <Edit3 size={14} />
                <span>{t("editBio", lang)}</span>
              </button>
            )}
          </div>

          {/* Master SEO Keyword Cloud Widget */}
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>{lang === "ar" ? "وسوم البحث الأكاديمي" : "Academic Tags"}</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {SEO_KEYWORDS.map((kw, i) => (
                <span
                  key={i}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-xl"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>

          {/* Danger Zone Account Deletion */}
          <div className="p-5 rounded-3xl border border-red-500/30 bg-red-500/5 space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs">
              <ShieldAlert size={16} />
              <span>{t("dangerZone", lang)}</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              {t("deleteDesc", lang)}
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="min-h-[44px] w-full flex items-center justify-center gap-2 py-2 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold active:scale-95 transition-all touch-manipulation shadow-xs cursor-pointer"
            >
              <Trash2 size={14} />
              <span>{t("deleteAccount", lang)}</span>
            </button>
          </div>

        </aside>
      </div>

      {/* Account Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in duration-150">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 text-rose-500">
              <ShieldAlert size={18} />
              <span>{t("confirmDeleteTitle", lang)}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
              {t("confirmDeleteMsg", lang)}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 active:scale-95 transition-transform touch-manipulation cursor-pointer"
              >
                {t("cancel", lang)}
              </button>
              <button
                onClick={handleSignOut}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white active:scale-95 transition-transform touch-manipulation cursor-pointer"
              >
                {t("deleteAccount", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Export as Default Export for CMS Dashboard Compatibility
export default UserProfile;