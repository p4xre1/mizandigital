import React from "react";
import { useI18n, serifFont, sansFont } from "@/lib/i18n";
import { Scale } from "lucide-react";

export default function FamilyLaw() {
  const { lang, dir } = useI18n();

  return (
    <div
      className="max-w-7xl mx-auto p-6 space-y-6 text-foreground"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      <div className="border-b border-border pb-4">
        <h1
          className="text-3xl font-extrabold flex items-center gap-3"
          style={{ fontFamily: serifFont(lang) }}
        >
          <Scale className="text-primary" size={32} />
          <span>
            {lang === "fr"
              ? "Droit de la Famille"
              : lang === "en"
              ? "Family Law"
              : "قانون الأسرة / المدونة"}
          </span>
        </h1>
      </div>

      <div className="p-8 border border-dashed border-border rounded-2xl text-center text-muted-foreground">
        {/* Custom design/components for Family Law go here */}
        قانون الأسرة - Moudawana Section
      </div>
    </div>
  );
}