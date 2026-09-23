import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { getCareerTerms } from "@/lib/careers/data";
import type { CareerLexiconTerm, CareerRecord } from "@/lib/careers/types";
import { SECTION_TITLES } from "../../../shared/careers/copy.js";

/**
 * «مصطلحات يجب معرفتها لهذا المسار» — شرائح مصطلحات من قاموس ميزان.
 *
 * القواعد:
 *   1) المعرّفات تُحلّ مقابل بيانات القاموس الفعلية (career-lexicon.json
 *      المولَّد من lexicon.json). لا يوجد أي رابط معجم مكتوب داخل careers.json.
 *   2) المعرّف غير الموجود لا يُنتج رابطاً مكسوراً: يُسقَط، ويُنبَّه إليه في
 *      وضع التطوير، ويُسقط كذلك في اختبار البيانات (tests/careers-data.test.ts).
 *   3) كل رابط يستعمل المعرّف القانوني (`/lexicon/<slug>`) الذي يولّده
 *      lexiconSlugMap — نفس الدالة التي تبني ملفات prerender وخريطة الموقع.
 *   4) يعرض 4–8 مصطلحات؛ ما زاد يُقصّ، وما نقص لا يُحشى بمصطلحات غير مرتبطة.
 */

const MAX_CHIPS = 8;
const MIN_CHIPS = 4;

export function CareerLexiconTerms({
  career,
  terms,
  className = "",
}: {
  career?: CareerRecord;
  terms?: CareerLexiconTerm[];
  className?: string;
}) {
  const resolved = terms ?? (career ? getCareerTerms(career) : []);
  const visible = resolved.slice(0, MAX_CHIPS);

  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="career-lexicon-title" className={className} data-career-lexicon="list">
      <h2 id="career-lexicon-title" className="text-[18px] font-black text-foreground">
        {SECTION_TITLES.lexicon}
      </h2>
      <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
        مصطلحات من القاموس القانوني في ميزان الرقمية تساعدك على فهم هذا المسار.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {visible.map((term) => (
          <li key={term.id}>
            <Link
              to={`/lexicon/${term.slug}`}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-bold text-foreground transition hover:border-primary/50"
              data-career-term={term.id}
            >
              <BookOpen className="size-3.5 text-primary" aria-hidden="true" />
              <span>{term.term_ar}</span>
              {term.term_fr ? (
                <span className="text-[11.5px] font-semibold text-muted-foreground" dir="ltr">
                  {term.term_fr}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {resolved.length < MIN_CHIPS ? (
        <p className="mt-2 text-[12px] text-muted-foreground">
          يمكنك توسيع المراجعة من <Link className="font-bold text-primary" to="/lexicon">القاموس القانوني</Link>.
        </p>
      ) : null}
    </section>
  );
}

export default CareerLexiconTerms;
