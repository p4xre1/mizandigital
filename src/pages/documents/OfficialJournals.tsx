import React from "react";
import { useI18n, serifFont, sansFont } from "@/lib/i18n";
import { Newspaper } from "lucide-react";

export default function OfficialJournals() {
  const { lang, dir } = useI18n();

  return (
    <div
      className="max-w-7xl mx-auto p-6 space-y-6 text-foreground min-h-[70vh]"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      <div className="border-b border-border pb-4">
        <h1
          className="text-3xl font-extrabold flex items-center gap-3"
          style={{ fontFamily: serifFont(lang) }}
        >
          <Newspaper className="text-primary" size={32} />
          <span>
            {lang === "fr"
              ? "Journaux Officiels"
              : lang === "en"
              ? "Official Journals"
              : "الجريدة الرسمية"}
          </span>
        </h1>
      </div>

      <div className="p-8 border border-dashed border-border rounded-2xl text-center text-muted-foreground bg-card/40">
        <p className="text-lg font-medium">
          {lang === "fr"
            ? "Section Journaux Officiels"
            : lang === "en"
            ? "Official Journals Section"
            : "قسم الجريدة الرسمية"}
        </p>
      </div>
    </div>
  );
}