import React from "react";
import { BookOpen, Bookmark, Award, Trash2, Edit3, ShieldAlert, FileText, UploadCloud } from "lucide-react";

interface UserProfileProps {
  user: {
    fullName: string;
    email: string;
    academicRole: "Student" | "Researcher" | "Admin";
    avatarUrl: string;
    bio: string;
    downloadsCount: number;
    savedCount: number;
  };
  dir: "rtl" | "ltr";
  lang: "ar" | "fr" | "en" | "es";
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, dir, lang }) => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10" dir={dir}>
      {/* 70/30 Asymmetric Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        
        {/* LEFT 70% MAIN WORKSPACE (Col Span 7) */}
        <main className="lg:col-span-7 space-y-8">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-md relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {user.academicRole}
              </span>
              <h1 className="text-2xl font-bold" style={{ fontFamily: lang === "ar" ? "var(--font-serif-ar)" : "var(--font-serif-en)" }}>
                {user.fullName}
              </h1>
              <p className="text-xs text-primary-foreground/80">{user.email}</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card text-center space-y-1 shadow-xs">
              <BookOpen className="mx-auto text-primary mb-1" size={22} />
              <div className="text-2xl font-extrabold text-foreground">{user.downloadsCount}</div>
              <div className="text-xs text-muted-foreground">{lang === "ar" ? "تنزيلات المذكرات" : "Downloaded Memorandums"}</div>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card text-center space-y-1 shadow-xs">
              <Bookmark className="mx-auto text-amber-500 mb-1" size={22} />
              <div className="text-2xl font-extrabold text-foreground">{user.savedCount}</div>
              <div className="text-xs text-muted-foreground">{lang === "ar" ? "الأحكام المحفوظة" : "Saved Precedents"}</div>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card text-center space-y-1 shadow-xs">
              <Award className="mx-auto text-emerald-500 mb-1" size={22} />
              <div className="text-2xl font-extrabold text-foreground">{user.academicRole}</div>
              <div className="text-xs text-muted-foreground">{lang === "ar" ? "الرتبة الأكاديمية" : "Verified Status"}</div>
            </div>
          </div>

          {/* Uploaded Resumes & Academic Papers Tracker */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <span>{lang === "ar" ? "الأوراق والمذكرات المرفوعة" : "Uploaded Academic Resumes"}</span>
              </h3>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition">
                <UploadCloud size={14} />
                <span>{lang === "ar" ? "رفع مستند جديد" : "Upload File"}</span>
              </button>
            </div>

            <div className="p-8 rounded-xl border border-dashed border-border text-center space-y-2 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "لم تقم برفع أي مذكرة أو بحث قانوني حتى الآن."
                  : "No academic papers uploaded to Supabase Storage yet."}
              </p>
            </div>
          </div>
        </main>

        {/* RIGHT 30% SIDEBAR (Col Span 3) */}
        <aside className="lg:col-span-3 space-y-6">
          {/* Avatar & Profile Card */}
          <div className="p-6 rounded-2xl border border-border bg-card text-center space-y-4 shadow-xs">
            <img
              src={user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop"}
              alt="Avatar"
              className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-amber-500/40 shadow-sm"
            />
            <div>
              <h4 className="font-bold text-sm text-foreground">{user.fullName}</h4>
              <p className="text-[11px] text-muted-foreground">{user.academicRole}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed px-2">
              {user.bio || (lang === "ar" ? "لم يتم إدخال نبذة أكاديمية بعد." : "No academic biography provided.")}
            </p>
            <button className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-border text-xs font-bold hover:bg-muted transition">
              <Edit3 size={13} />
              <span>{lang === "ar" ? "تعديل السيرة الذاتية" : "Edit Bio"}</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs">
              <ShieldAlert size={15} />
              <span>{lang === "ar" ? "منطقة الخطر" : "Danger Zone"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              {lang === "ar"
                ? "سيؤدي حذف الحساب لمسح جميع التنزيلات والأحكام المحفوظة بشكل نهائي من قاعدة البيانات."
                : "Deleting your account permanently purges your data from Cloudflare D1 and Supabase."}
            </p>
            <button className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition shadow-sm">
              <Trash2 size={13} />
              <span>{lang === "ar" ? "حذف الحساب نهائياً" : "Delete Account"}</span>
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
};