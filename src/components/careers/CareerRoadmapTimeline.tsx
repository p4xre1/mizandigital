import type { CareerEntryStep } from "@/lib/careers/types";
import { SECTION_TITLES } from "../../../shared/careers/copy.js";

/**
 * خطوات المسار — قائمة مرتّبة دلالية `<ol>`.
 *
 * القواعد المحفوظة هنا:
 *   • عدد الخطوات ديناميكي: لا يُفرض على كل مسار أربع خطوات.
 *   • النصّ مفهوم بالكامل بلا CSS وبلا أيقونات (الأرقام نصّية داخل `<span>`
 *     تكميلي، وأي معلومة يحملها الرقم موجودة في العبارة «الخطوة n» لقرّاء الشاشة).
 *   • خط الربط بين المراحل تحسين بصري (حدّ جانبي) لا يحمل معلومة.
 *   • RTL: التخطيط بـ flex والحدّ الجانبي المنطقي `border-s`، فلا حاجة لأي offset سالب.
 */
export function CareerRoadmapTimeline({
  steps,
  className = "",
}: {
  steps: CareerEntryStep[];
  className?: string;
}) {
  if (!steps?.length) return null;

  return (
    <section aria-labelledby="career-roadmap-title" className={className}>
      <h2 id="career-roadmap-title" className="text-[18px] font-black text-foreground">
        {SECTION_TITLES.roadmap}
      </h2>
      <ol className="mt-4 space-y-4" data-career-roadmap="ol">
        {steps.map((step) => (
          <li key={`${step.step}-${step.title_ar}`} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-black text-primary-foreground"
            >
              {step.step}
            </span>
            <div className="min-w-0 flex-1 border-s border-primary/20 ps-4">
              <p className="text-[15px] font-extrabold text-foreground">
                <span className="sr-only">{`الخطوة ${step.step}: `}</span>
                {step.title_ar}
              </p>
              <p className="mt-1 text-[13.5px] leading-7 text-muted-foreground">{step.description_ar}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default CareerRoadmapTimeline;
