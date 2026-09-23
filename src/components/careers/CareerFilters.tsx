import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  CAREERS_HUB_COPY,
  FILTER_ADVISORY,
  FILTER_LABELS,
} from "../../../shared/careers/copy.js";
import { CAREERS } from "@/lib/careers/data";
import type { CareerRecord } from "@/lib/careers/types";
import { CareerCard } from "./CareerCard";

/**
 * فلاتر الدليل — اقتراح للقراءة، لا حكم أهلية.
 *
 * قرارات مقصودة:
 *   1) فلتر مستوى الشهادة يستعمل `typical_degree.level` (وصف معتاد في البيانات)
 *      ولا يستبعد مساراً بدعوى أن الطالب «غير مؤهل»: النص الظاهر يقول «قد
 *      يناسب اهتمامك» و«راجع المصدر الرسمي».
 *   2) فلتر السن لا يستبعد شيئاً: البيانات تحمل `age_requirement` بلا أي قيمة
 *      رقمية (لأن القيم غير متحقق منها رسمياً)، فاستبعاد مسار بسبب السن سيكون
 *      حكماً مُفبركاً. الفلتر يعرض تنبيهاً ويرتّب المسارات التي قد توجد فيها
 *      شروط سن قبل غيرها — ومع ذلك يبقى كل المسار مقروءاً.
 *   3) مجالات الاهتمام مرتبطة بقوائم مسارات صريحة (لا استنتاج نصي غامض).
 */

type AgeFilter = (typeof FILTER_LABELS.age)[number] | null;
type WorkFilter = (typeof FILTER_LABELS.work)[number] | null;
type EducationFilter = (typeof FILTER_LABELS.education)[number] | null;
type InterestFilter = (typeof FILTER_LABELS.interest)[number] | null;

const EDUCATION_LEVELS: Record<string, string> = {
  الباكالوريا: "baccalaureate",
  "Bac+2": "bac_plus_2",
  الإجازة: "bachelor_or_equivalent",
  الماستر: "master_or_equivalent",
  الدكتوراه: "doctorate",
};

const WORK_MODELS: Record<string, string> = {
  "وظيفة عمومية": "public_sector",
  "مهنة حرة منظمة": "liberal_regulated",
  "قطاع خاص": "private_sector",
  "تعليم وبحث": "academic",
};

const INTEREST_CAREERS: Record<string, string[]> = {
  "القضاء والمحاكم": ["magistrat", "greffe", "redacteur-judiciaire", "delegue-judiciaire"],
  "التوثيق والعقار": ["notaire", "adoul", "commissaire-judiciaire"],
  "الشركات والأعمال": ["juriste-entreprise", "responsable-conformite", "notaire"],
  "القانون الجنائي": ["avocat", "magistrat", "commissaire-judiciaire"],
  "الإدارة العمومية": [
    "juriste-administration-publique",
    "delegue-judiciaire",
    "redacteur-judiciaire",
  ],
  "البحث والتعليم": ["enseignant-chercheur-droit"],
};

function FilterGroup({
  title,
  values,
  active,
  onSelect,
  idPrefix,
}: {
  title: string;
  values: string[];
  active: string | null;
  onSelect: (value: string | null) => void;
  idPrefix: string;
}) {
  return (
    <div role="group" aria-labelledby={`${idPrefix}-label`} className="mt-3">
      <p id={`${idPrefix}-label`} className="text-[12.5px] font-extrabold text-foreground">
        {title}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {values.map((value) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(isActive ? null : value)}
              className={`min-h-9 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              }`}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CareerFilters() {
  const [education, setEducation] = useState<EducationFilter>(null);
  const [age, setAge] = useState<AgeFilter>(null);
  const [work, setWork] = useState<WorkFilter>(null);
  const [interest, setInterest] = useState<InterestFilter>(null);

  const filtered: CareerRecord[] = useMemo(() => {
    const list = CAREERS.filter((career) => {
      if (education && education !== "لا أعرف بعد") {
        const expected = EDUCATION_LEVELS[education];
        if (expected && career.typical_degree.level !== expected) return false;
      }
      if (work && work !== "لا أعرف بعد") {
        const expected = WORK_MODELS[work];
        if (expected && career.work_model !== expected) return false;
      }
      if (interest) {
        const allowed = INTEREST_CAREERS[interest] ?? [];
        if (!allowed.includes(career.slug)) return false;
      }
      // فلتر السن لا يستبعد أي مسار عن قصد (انظر تعليق الملف أعلى).
      return true;
    });

    if (!age) return list;
    return [...list].sort((a, b) => {
      const aAge = a.age_requirement.has_requirement ? 0 : 1;
      const bAge = b.age_requirement.has_requirement ? 0 : 1;
      return aAge - bAge;
    });
  }, [age, education, interest, work]);

  const hasFilter = Boolean(education || age || work || interest);

  return (
    <section aria-labelledby="career-filters-title" data-career-filters="section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="career-filters-title" className="inline-flex items-center gap-2 text-[18px] font-black text-foreground">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          {CAREERS_HUB_COPY.filtersTitle}
        </h2>
        {hasFilter ? (
          <button
            type="button"
            onClick={() => {
              setEducation(null);
              setAge(null);
              setWork(null);
              setInterest(null);
            }}
            className="text-[12.5px] font-extrabold text-primary underline"
          >
            مسح الاختيارات
          </button>
        ) : null}
      </div>

      <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{CAREERS_HUB_COPY.filtersHint}</p>
      <p className="mt-1 text-[12px] font-bold text-amber-700 dark:text-amber-500">
        {FILTER_ADVISORY.join("، ")}
      </p>

      <div className="rounded-2xl border border-border bg-card p-4">
        <FilterGroup
          idPrefix="filter-education"
          title="المستوى الدراسي"
          values={FILTER_LABELS.education}
          active={education}
          onSelect={(value) => setEducation(value as EducationFilter)}
        />
        <FilterGroup
          idPrefix="filter-age"
          title="السن"
          values={FILTER_LABELS.age}
          active={age}
          onSelect={(value) => setAge(value as AgeFilter)}
        />
        <FilterGroup
          idPrefix="filter-work"
          title="طبيعة العمل"
          values={FILTER_LABELS.work}
          active={work}
          onSelect={(value) => setWork(value as WorkFilter)}
        />
        <FilterGroup
          idPrefix="filter-interest"
          title="مجال الاهتمام"
          values={FILTER_LABELS.interest}
          active={interest}
          onSelect={(value) => setInterest(value as InterestFilter)}
        />

        {age ? (
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-[12.5px] leading-6 text-foreground">
            شرط السن لا يُقارَن برقم في هذه الصفحة: البيانات لا تحمل أي حدّ سنّي متحقق منه، والحدود تُنشر في النص
            التنظيمي أو الإعلان الرسمي. المسارات التي قد تتضمن شرط سن مُرتَّبة أولاً، وراجع مصدرها الرسمي.
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-[12.5px] font-bold text-muted-foreground" role="status">
        {hasFilter ? `${filtered.length} مساراً تطابق اختياراتك — قد يناسب اهتمامك.` : `${CAREERS.length} مساراً في الدليل.`}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-4 text-[13px] leading-7 text-muted-foreground">
          {CAREERS_HUB_COPY.emptyFilterResult}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-career-cards="grid">
          {filtered.map((career) => (
            <CareerCard key={career.slug} career={career} />
          ))}
        </div>
      )}
    </section>
  );
}

export default CareerFilters;
