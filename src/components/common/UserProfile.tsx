"use client";

import React, { useState, useRef } from "react";
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
} from "lucide-react";

export type Lang = "ar" | "fr" | "en" | "es";

export interface UserData {
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
    en: "Uploaded Academic Resumes",
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
    ar: "منطقة الخطر",
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
} as const;

function t(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key][lang] || LABELS[key].en;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  dir = "rtl",
  lang = "ar",
  onUpdateUser,
}) => {
  // Bio edit state
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(user.bio || "");

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; date: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Bio Save
  const handleSaveBio = () => {
    const updatedUser = { ...user, bio: bioText };
    try {
      localStorage.setItem("mizan_user", JSON.stringify(updatedUser));
    } catch {
      // Storage error
    }
    if (onUpdateUser) onUpdateUser(updatedUser);
    setIsEditingBio(false);
  };

  // Handle File Upload Simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFile = {
        name: files[0].name,
        date: new Date().toLocaleDateString(
          lang === "ar" ? "ar-EG" : "en-US"
        ),
      };
      setUploadedFiles((prev) => [newFile, ...prev]);
    }
  };

  // Handle Account Deletion
  const handleConfirmDelete = () => {
    try {
      localStorage.removeItem("mizan_user");
    } catch {
      // Storage error
    }
    window.location.href = "/";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" dir={dir}>
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* LEFT 70% MAIN WORKSPACE (Col Span 7) */}
        <main className="lg:col-span-7 space-y-8">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {user.academicRole}
              </span>
              <h1
                className="text-2xl font-bold"
                style={{
                  fontFamily:
                    lang === "ar"
                      ? "var(--font-serif-ar)"
                      : "var(--font-serif-en)",
                }}
              >
                {user.fullName}
              </h1>
              <p className="text-xs text-slate-300">{user.email}</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-1 shadow-sm">
              <BookOpen className="mx-auto text-blue-600 mb-1" size={22} />
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {user.downloadsCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t("downloadedMemos", lang)}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-1 shadow-sm">
              <Bookmark className="mx-auto text-amber-500 mb-1" size={22} />
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {user.savedCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t("savedPrecedents", lang)}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-1 shadow-sm">
              <Award className="mx-auto text-emerald-500 mb-1" size={22} />
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {user.academicRole}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t("verifiedStatus", lang)}
              </div>
            </div>
          </div>

          {/* Uploaded Papers & Academic Resumes */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer"
              >
                <UploadCloud size={15} />
                <span>{t("uploadFile", lang)}</span>
              </button>
            </div>

            {uploadedFiles.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("noFilesYet", lang)}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploadedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200 truncate">
                      <File size={16} className="text-amber-500 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {f.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* RIGHT 30% SIDEBAR (Col Span 3) */}
        <aside className="lg:col-span-3 space-y-6">
          {/* Avatar & Profile Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-4 shadow-sm">
            <img
              src={
                user.avatarUrl ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop"
              }
              alt="Avatar"
              className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-amber-500/40 shadow-sm"
            />
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {user.fullName}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveBio}
                    className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Check size={13} /> {t("save", lang)}
                  </button>
                  <button
                    onClick={() => setIsEditingBio(false)}
                    className="py-1.5 px-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed px-2">
                {user.bio || t("noBio", lang)}
              </p>
            )}

            {!isEditingBio && (
              <button
                onClick={() => setIsEditingBio(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Edit3 size={13} />
                <span>{t("editBio", lang)}</span>
              </button>
            )}
          </div>

          {/* Danger Zone */}
          <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs">
              <ShieldAlert size={15} />
              <span>{t("dangerZone", lang)}</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              {t("deleteDesc", lang)}
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{t("deleteAccount", lang)}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t("confirmDeleteTitle", lang)}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
              {t("confirmDeleteMsg", lang)}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {t("cancel", lang)}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white"
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