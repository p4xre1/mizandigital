import React from "react";
import { useI18n, serifFont, sansFont } from "@/lib/i18n";
import { Scroll } from "lucide-react";

export default function ConstitutionalLaw() {
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
          <Scroll className="text-primary" size={32} />
          <span>
            {lang === "fr"
              ? "Droit Constitutionnel"
              : lang === "en"
              ? "Constitutional Law"
              : "القانون الدستوري"}
          </span>
        </h1>
      </div>

      <div className="p-8 border border-dashed border-border rounded-2xl text-center text-muted-foreground bg-card/40">
        <p className="text-lg font-medium">
          {lang === "fr"
            ? "Section Droit Constitutionnel"
            : lang === "en"
            ? "Constitutional Law Section"
            : "قسم القانون الدستوري"}
        </p>
      </div>
    </div>
  );
}