import React from "react";
import { ExternalLink, Building2, BookOpen, Clock, Users, Calendar, GraduationCap } from "lucide-react";
import { serifFont, sansFont, Lang } from "../../lib/i18n";
import { LawSchool } from "../../data/lawSchools";

interface SchoolHeaderProps {
  school: LawSchool;
  documentCount: number;
  lang: Lang;
}

export default function SchoolHeader({ school, documentCount, lang }: SchoolHeaderProps) {
  const name = school.name[lang] || school.name.ar;
  const university = school.university[lang] || school.university.ar;
  const description = school.description[lang] || school.description.ar;
  const city = school.city[lang] || school.city.ar;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8 shadow-sm flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
      {/* خلفية جمالية ضوئية */}
      <div className="absolute top-0 ltr:right-0 rtl:left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* أيقونة الجامعة */}
      <div className="w-20 h-20 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner">
        <Building2 size={36} className="text-primary/80" />
      </div>

      {/* التفاصيل والبيانات */}
      <div className="flex-1 space-y-3">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1" style={{ fontFamily: sansFont(lang) }}>
            {university} • {city}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2" style={{ fontFamily: serifFont(lang) }}>
            {name}
          </h1>

          {/* رابط الموقع الرسمي للكلية */}
          {school.website && (
            <a
              href={school.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
              style={{ fontFamily: sansFont(lang) }}
            >
              <ExternalLink size={14} />
              {lang === "ar" ? "الموقع الرسمي للكلية" : lang === "fr" ? "Site officiel de la faculté" : "Official Website"}
            </a>
          )}
        </div>

        {/* النبذة التاريخية والوصف */}
        {description && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
            <p style={{ fontFamily: sansFont(lang), lineHeight: "1.8" }}>
              {description}
            </p>
          </div>
        )}

        {/* التخصصات والمسالك المتاحة */}
        {school.programs && school.programs.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {school.programs.map((prog, idx) => {
              const progName = prog[lang] || prog.ar;
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  <GraduationCap size={13} className="text-primary" />
                  {progName}
                </span>
              );
            })}
          </div>
        )}

        {/* إحصائيات ومعلومات سريعة */}
        <div className="flex flex-wrap gap-4 pt-3 border-t border-border mt-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <BookOpen size={14} className="text-primary" />
            <span>
              {documentCount} {lang === "ar" ? "مرجع متاح" : lang === "fr" ? "documents disponibles" : "available documents"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-slate-400" />
            <span>
              {lang === "ar" ? `تأسست سنة ${school.established}` : `Fondée en ${school.established}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-slate-400" />
            <span>
              {school.students} {lang === "ar" ? "طالب" : "étudiants"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-amber-500" />
            <span>
              {lang === "ar" ? "محدث دورياً" : lang === "fr" ? "Mis à jour régulièrement" : "Regularly updated"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}