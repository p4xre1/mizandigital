import React from "react";
import { useI18n, serifFont, sansFont } from "@/lib/i18n";
import { FileText } from "lucide-react";

export default function LegalTexts() {
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
          <FileText className="text-primary" size={32} />
          <span>
            {lang === "fr"
              ? "Textes Juridiques / Lois"
              : lang === "en"
              ? "Legal Texts / Laws"
              : "النصوص القانونية / القوانين"}
          </span>
        </h1>
      </div>

      <div className="p-8 border border-dashed border-border rounded-2xl text-center text-muted-foreground bg-card/40">
        <p className="text-lg font-medium">
          {lang === "fr"
            ? "Section Textes Juridiques"
            : lang === "en"
            ? "Legal Texts Section"
            : "قسم النصوص القانونية والقوانين"}
        </p>
      </div>
    </div>
  );
}