import { CAREERS_DISCLAIMER, CAREERS_QUIZ_DISCLAIMER } from "../../../shared/careers/copy.js";

/**
 * إخلاء المسؤولية الإلزامي في كل صفحة من صفحات المسارات المهنية.
 *
 * النسختان (التوجيه المهني / التدريب) تأتيان من shared/careers/copy.js، وهي
 * نفس الوحدة التي يستعملها مولّد الملفات الثابتة — فلا يمكن أن يقرأ الزاحف
 * نصاً مختلفاً عمّا يقرأه الطالب.
 */
export function CareerDisclaimer({
  variant = "guidance",
  className = "",
}: {
  variant?: "guidance" | "quiz";
  className?: string;
}) {
  const isQuiz = variant === "quiz";
  const text = isQuiz ? CAREERS_QUIZ_DISCLAIMER : CAREERS_DISCLAIMER;

  return (
    <aside
      role="note"
      aria-label={isQuiz ? "تنبيه حول التمارين التعليمية" : "إخلاء مسؤولية"}
      data-careers-disclaimer={variant}
      className={`rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-[12.5px] leading-7 text-foreground ${className}`}
    >
      <p className="font-extrabold">
        {isQuiz ? "تنبيه: تمارين تعليمية غير رسمية" : "تنبيه: معلومات توجيهية فقط"}
      </p>
      {text.split("\n").map((line) => (
        <p key={line} className="mt-1 whitespace-pre-line">
          {line}
        </p>
      ))}
    </aside>
  );
}

export default CareerDisclaimer;
