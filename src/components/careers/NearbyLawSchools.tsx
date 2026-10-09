import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { LEGAL_EDUCATION_MESSAGES, SECTION_TITLES } from "../../../shared/careers/copy.js";
import { MOROCCO_CITIES, searchCities } from "@/lib/careers/data";
import { formatDistanceKm } from "@/lib/careers/distance";
import { loadSchools, rankSchoolsForCity } from "@/lib/careers/schools";
import { useAuth } from "@/lib/auth/AuthProvider";
import { saveCityToProfile } from "@/lib/careers/trainingService";
import type {
  CareerRecord,
  CareerSchoolRecord,
  LegalEducationNeed,
  RankedSchool,
} from "@/lib/careers/types";

/**
 * «هل تحتاج إلى دراسة القانون أولاً؟» — اختيار مدينة اختياري ثم أقرب ثلاث
 * كليات حقوق بمسافة خط مستقيم.
 *
 * الخصوصية والحدود (غير قابلة للتفاوض في هذه الميزة):
 *   • لا GPS، ولا عنوان دقيق، ولا رقم هاتف، ولا استدعاء أي خدمة خرائط.
 *   • الاختيار اختياري: بلا اختيار تُعرض دعوة محايدة لا بطاقات فارغة.
 *   • لا يُرسل اختيار المدينة إلى Supabase للزائر (ولا يوجد له أصلاً ما يُرسل).
 *   • للمسجّل: لا تُكتب المدينة إلا بعد الضغط على «حفظ مدينتي في ملفي»
 *     (تُحدَّث `mizan_profiles.city` لصفه هو فقط — الطبقة التي يكتب فيها
 *     محرّر /profile المدينة، وبوابة النشر فيها `share_location`).
 *   • الترتيب مسافة خط مستقيم تقريبية، وليس «أفضل كلية» ولا مشورة قبول.
 */

/** شريحة مدينة: مستطيلة مدوّرة، تتلوّن بالأزرق حين تُختار. */
const cityChip = (active: boolean) =>
  `min-h-11 rounded-full border px-4 py-2 text-[15px] font-extrabold transition ${
    active
      ? "border-blue-700 bg-blue-700 text-white"
      : "border-blue-600/30 bg-white text-blue-800 hover:bg-blue-50 dark:bg-transparent dark:text-blue-200 dark:hover:bg-blue-950/40"
  }`;

const searchKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "");

export function NearbyLawSchools({
  career,
  legalEducation,
  className = "",
}: {
  career?: CareerRecord;
  legalEducation?: LegalEducationNeed;
  className?: string;
}) {
  const need = legalEducation ?? career?.requires_legal_education ?? "depends";
  const { user, profile } = useAuth();

  const [query, setQuery] = useState("");
  const [cityId, setCityId] = useState<string | null>(null);
  const [schools, setSchools] = useState<CareerSchoolRecord[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const listId = useId();

  // دليل الكليات (ملف JSON) يُحمَّل عند الحاجة فقط — استيراد ديناميكي لملف
  // البيانات داخل loadSchools، فالواجهة لا تدفع ثمن 58 kB لمن لا يختار مدينة.
  useEffect(() => {
    let mounted = true;
    loadSchools()
      .then((rows) => {
        if (mounted) setSchools(rows);
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // المدينة المحفوظة في ملف المستخدم (إن وُجدت) تُعرض كمرجع، ولا تُستبدل
  // تلقائياً: الترشيح يعمل على الاختيار المحلي، والكتابة تحدث بزر صريح فقط.
  const savedCity = user ? (profile?.city ?? "").trim() : "";

  const options = useMemo(() => searchCities(query, 8), [query]);
  const selectedCity = cityId ? MOROCCO_CITIES.find((city) => city.id === cityId) : undefined;

  const savingWouldReplace = Boolean(savedCity) && Boolean(selectedCity) && selectedCity!.name_ar !== savedCity;

  const ranked: RankedSchool[] = useMemo(
    () => rankSchoolsForCity(schools, selectedCity, 3),
    [schools, selectedCity]
  );

  if (need === "not_required") return null;

  const message = LEGAL_EDUCATION_MESSAGES[need] || LEGAL_EDUCATION_MESSAGES.depends;

  const handleSelect = (id: string) => {
    setCityId(id);
    setQuery(MOROCCO_CITIES.find((city) => city.id === id)?.name_ar ?? "");
    setSaveState("idle");
    setSaveMessage(null);
  };

  const handleSaveCity = async () => {
    if (!selectedCity) return;
    // فعل صريح: لا يُستدعى هذا إلا بنقرة المستخدم على الزر أدناه.
    setSaveState("saving");
    const result = await saveCityToProfile(selectedCity.name_ar);
    if (result.ok) {
      setSaveState("saved");
      setSaveMessage("حُفظت مدينتك في ملفك الشخصي.");
    } else {
      setSaveState("error");
      setSaveMessage(result.reason ?? "تعذر حفظ المدينة.");
    }
  };

  return (
    <section
      aria-labelledby="career-nearby-schools-title"
      className={`rounded-3xl border border-blue-600/20 bg-card p-6 ${className}`}
      data-career-nearby="section"
    >
      <h2 id="career-nearby-schools-title" className="text-[22px] font-black text-blue-800 dark:text-blue-200">
        {SECTION_TITLES.schools}
      </h2>
      <p className="mt-3 max-w-3xl text-[16px] leading-8 text-foreground">{message}</p>

      <div className="mt-6">
        <label htmlFor={`${listId}-city`} className="block text-[16px] font-extrabold text-foreground">
          اختر مدينتك — اختياري
        </label>
        <div className="mt-3 flex items-center gap-2 rounded-xl border-2 border-blue-600/30 bg-blue-50 px-4 dark:bg-blue-950/40">
          <Search className="size-5 text-blue-700 dark:text-blue-300" aria-hidden="true" />
          <input
            id={`${listId}-city`}
            type="search"
            name="career-city"
            autoComplete="off"
            spellCheck={false}
            placeholder="ابحث عن مدينة…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-controls={listId}
            className="min-h-12 w-full bg-transparent py-2 text-[16px] font-bold text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul id={listId} className="mt-4 flex flex-wrap gap-2.5" aria-label="المدن">
          <li>
            <button
              type="button"
              onClick={() => {
                setCityId(null);
                setQuery("");
              }}
              aria-pressed={cityId === null}
              className={cityChip(cityId === null)}
            >
              بلا تحديد مدينة
            </button>
          </li>
          {options.map((city) => (
            <li key={city.id}>
              <button
                type="button"
                onClick={() => handleSelect(city.id)}
                aria-pressed={cityId === city.id}
                title={city.region_ar}
                className={cityChip(cityId === city.id)}
              >
                {city.name_ar}
              </button>
            </li>
          ))}
          {options.length === 0 ? (
            <li className="w-full rounded-xl bg-muted/40 px-4 py-3 text-[15px] text-foreground">
              لا مدينة مطابقة. يمكنك المتابعة من <Link className="font-bold text-primary" to="/schools">دليل الكليات</Link>.
            </li>
          ) : null}
        </ul>
      </div>

      {!selectedCity ? (
        <p className="mt-6 rounded-2xl border border-emerald-600/25 bg-emerald-50 p-5 text-[16px] leading-8 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-100">
          اختر مدينتك (اختياري) لعرض أقرب ثلاث كليات للحقوق بمسافة تقريبية بخط مستقيم. لا نطلب أي عنوان دقيق ولا
          بيانات موقع، واختيارك يبقى في متصفحك ما لم تضغط زر الحفظ صراحةً.
          {savedCity ? (
            <span className="mt-2 block font-extrabold">
              مدينتك المحفوظة في ملفك: {savedCity} — لن نستبدلها إلا إذا ضغطت زر الحفظ.
            </span>
          ) : null}
        </p>
      ) : (
        <>
          {loadError ? (
            <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-[13px] font-bold text-foreground">
              تعذر تحميل دليل الكليات في متصفحك الآن. يمكنك المتابعة من{" "}
              <Link className="text-primary" to="/schools">صفحة الكليات</Link>.
            </p>
          ) : (
            <ul className="mt-6 grid gap-4 md:grid-cols-3" data-career-nearby="results">
              {ranked.map(({ school, distanceKm }) => (
                <li key={school.slug || school.id} className="rounded-2xl border border-blue-600/20 bg-blue-50 p-5 dark:bg-blue-950/40">
                  <p className="text-[17px] font-extrabold leading-7 text-foreground">
                    <Link className="hover:text-primary" to={`/schools/${school.slug || school.id}`}>
                      {school.short_name || school.name}
                    </Link>
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-3 text-[15px] text-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {school.city || school.location?.city_ar || "المغرب"}
                    </span>
                    {/* المسافة بين مدينتين (لا بين الأحياء): أقل من كم تعني نفس المدينة. */}
                    <span aria-label={distanceKm < 1 ? "في مدينتك" : `المسافة التقريبية ${formatDistanceKm(distanceKm)}`}>
                      {distanceKm < 1 ? "في مدينتك" : formatDistanceKm(distanceKm)}
                    </span>
                    {school.officialUrl ? (
                      <a
                        className="font-bold text-primary"
                        href={school.officialUrl}
                        target="_blank"
                        rel="noopener"
                      >
                        الموقع الرسمي للكلية
                      </a>
                    ) : null}
                  </p>
                </li>
              ))}
              {ranked.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-border p-4 text-[13px] text-muted-foreground">
                  لا تتوفر إحداثيات صالحة لكلية من هذه المدينة في بيانات ميزان. استعمل{" "}
                  <Link className="font-bold text-primary" to="/schools">دليل الكليات</Link> لتصفح كل المؤسسات.
                </li>
              ) : null}
            </ul>
          )}

          <p className="mt-3 text-[12.5px] leading-6 text-muted-foreground">
            المسافات تقريبية بخط مستقيم وليست مسافات طريق أو وقت سفر. تحقق من التخصصات وشروط التسجيل من الموقع
            الرسمي للكلية.
          </p>

          {user ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveCity}
                disabled={saveState === "saving"}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-[13px] font-extrabold text-primary transition hover:bg-primary/5 disabled:opacity-60"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                حفظ مدينتي في ملفي
              </button>
              {savingWouldReplace ? (
                <p className="text-[12px] font-bold text-muted-foreground" role="status">
                  مدينتك المحفوظة حالياً: <span className="text-foreground">{savedCity}</span> — الحفظ هنا يحدّثها
                  بالمدينة المختارة، ولا يشاركها مع أي طرف.
                </p>
              ) : null}
              {saveMessage ? (
                <p
                  className={`inline-flex items-center gap-1.5 text-[12.5px] font-bold ${
                    saveState === "saved" ? "text-emerald-600" : "text-amber-600"
                  }`}
                  role="status"
                >
                  {saveState === "error" ? <AlertCircle className="size-3.5" aria-hidden="true" /> : null}
                  {saveMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default NearbyLawSchools;
