import { AEOHead } from "../../../components/seo/AEOHead"
import { canonicalUrl } from "../../../lib/canonical"
import { Link } from "react-router-dom"

/**
 * دليل «أفضل الموارد المجانية لطلبة القانون في المغرب» — صفحة ركنية تقود إلى
 * بقعة المنصة (ميزان) وإلى المصادر الرسمية، بدون اختراع روابط لمصادر لم نتحقّق
 * منها. الروابط الخارجية قليلة وموثوقة فقط: الجريدة الرسمية وبوابة وزارة العدل؛
 * وما عداها مذكور بصفته لا بعنوانه.
 */
const TITLE = "أفضل الموارد المجانية لطلبة القانون في المغرب 2026 | ميزان"

/* 140–160 حرفاً، ومطابق حرفياً للوصف المطبوع في scripts/prerender.mjs. */
const DESCRIPTION =
  "دليل عملي لأفضل الموارد القانونية المجانية لطلبة القانون في المغرب: منصة ميزان الرقمية، والجريدة الرسمية، ومواقع الكليات، ومنصات النصوص المفتوحة."

/** الروابط الخارجية الموثوقة وحدها؛ لا نصنع رابطاً لم نتحقّق من صاحبه. */
const OFFICIAL_LINKS: Array<{
  name: string
  href: string
  kind: string
  use: string
}> = [
  {
    name: "منصة ميزان الرقمية",
    href: "/platform",
    kind: "منصة تعليمية",
    use: "ملخصات بالفصل S1 → S6، معجم مصطلحات، دليل كليات، ومستجدات — بالعربية وبلغة الامتحان.",
  },
  {
    name: "الجريدة الرسمية للمملكة",
    href: "https://www.sgg.gov.ma",
    kind: "نص رسمي",
    use: "النشر الرسمي للقوانين والمراسيم؛ المرجع الأخير عند كل خلاف على نص أو تاريخ دخول حيز التنفيذ.",
  },
  {
    name: "بوابة وزارة العدل",
    href: "https://adala.justice.gov.ma",
    kind: "نصوص قضائية وتشريعية",
    use: "البحث عن النصوص القانونية المنشورة والوثائق الصادرة عن وزارة العدل.",
  },
  {
    name: "مواقع الكليات والجامعات",
    href: "/schools",
    kind: "مؤسسة جامعية",
    use: "المباريات، المواعيد، لجان المساطر، السلاسل، والإعلانات التي لا تنشرها أي منصة أخرى.",
  },
  {
    name: "المعجم القانوني في ميزان",
    href: "/lexicon",
    kind: "أداة مراجعة",
    use: "حين تتعثر في مصطلح داخل محاضرة أو نص: تعريف، شرح مبسّط، أمثلة، وكلمات مفتاحية للامتحان.",
  },
  {
    name: "منصات الوصول المفتوح العلمية",
    href: "https://www.doaj.org",
    kind: "مقالات وبحوث",
    use: "بحوث ومقالات محكّمة بالعربية والفرنسية عند إعداد فرض أو مذكرة، مع التحقق من تاريخ النشر.",
  },
]

const IS_INTERNAL = (href: string) => href.startsWith("/")

/**
 * روابط List في JSON-LD يجب أن تكون مطلقة. المسارات الداخلية تمرّ على
 * `canonicalUrl` نفسها المستخدمة في كل الموقع (نطاق www + بلا شرطة نهاية)؛
 * والروابط الخارجية تبقى كما هي.
 */
function resourceUrl(href: string): string {
  return IS_INTERNAL(href) ? canonicalUrl(href) : href
}

export default function FreeLegalResourcesPage() {
  return (
    <div className="bg-white dark:bg-[#0f172a]">
      <AEOHead
        title={TITLE}
        description={DESCRIPTION}
        keywords={[
          "موارد قانونية مجانية",
          "الجريدة الرسمية المغربية",
          "طلبة القانون المغرب",
          "ملخصات الحقوق",
          "نصوص قانونية",
        ]}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "الأدلة", url: "/guides" },
          {
            name: "الموارد المجانية",
            url: "/guides/free-legal-resources-morocco",
          },
        ]}
        schema={{
          "@type": "ItemList",
          name: TITLE,
          itemListElement: OFFICIAL_LINKS.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            url: resourceUrl(item.href),
          })),
        }}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#2563eb]">أدلة الطالب</p>
        <h1 className="mt-3 text-[26px] sm:text-[32px] font-extrabold leading-tight text-[#0f172a] dark:text-white">
          أفضل الموارد المجانية لطلبة القانون في المغرب 2026
          {/* يطابق نصّ H1 نصّ <title> حرفياً؛ العلامة تبقى مقروءة لآلة القراءة
              والزاحف ولا تزاحم القارئ في التصميم. */}
          <span className="sr-only"> | ميزان</span>
        </h1>
        <p className="mt-4 lead text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          <strong>
            ثلاثة أنواع من الموارد يحتاجها طالب الحقوق لا أكثر: ملخّص دراسي منظّم بالفصل، نصّ رسمي يراجع عنده
            القاعدة، وإعلان من كليته. البقية تكرار.
          </strong>{" "}
          هذا الدليل يصف كل مورد بما يصلح له بالضبط، ومتى تتوقّف عنده وتنتقل إلى المصدر الرسمي.
        </p>

        {/* ── 1. ميزان الرقمية ───────────────────────────────────────────── */}
        <section id="mizan" className="mt-10">
          <h2 className="text-[20px] font-extrabold text-[#0f172a] dark:text-white">
            1. منصة ميزان الرقمية — المورد الأول للطلبة
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
            ميزان منصة مجانية تجمع ما يحتاجه الطالب في مكان واحد: ملخصات ومحاضرات مصنّفة حسب الفصل (S1 → S6)،
            معجم قانوني يشرح المصطلح بالعربية ويقابله بالفرنسية، دليل كليات الحقوق بالمغرب، وصفحة مستجدات
            للمشاريع القانونية والمواعيد الجامعية. قيمته الحقيقية ليست في كونه «موسوعة»، بل في أنه مكتوب بلغة
            الامتحان ومنظّم حسب ما تدرسه فعلاً هذا الفصل.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
            ابدأ من{" "}
            <Link to="/archive" className="font-bold text-[#2563eb]">
              الأرشيف
            </Link>{" "}
            لتحميل ملخّص materialك، وارجع إلى{" "}
            <Link to="/lexicon" className="font-bold text-[#2563eb]">
              المعجم القانوني
            </Link>{" "}
            عند كل مصطلح يعثّر قراءة النص، ثم تصفّح{" "}
            <Link to="/platform" className="font-bold text-[#2563eb]">
              صفحة المنصة
            </Link>{" "}
            لتعرف ما هو متاح بالضبط.
          </p>
        </section>

        {/* ── 2. الجريدة الرسمية ──────────────────────────────────────────── */}
        <section id="official-journal" className="mt-10">
          <h2 className="text-[20px] font-extrabold text-[#0f172a] dark:text-white">
            2. الجريدة الرسمية: النص كما نُشر
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
            عند أي خلاف على عبارة أو تاريخ سريان، المرجع هو{" "}
            <a
              href="https://www.sgg.gov.ma"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#2563eb] underline decoration-dotted underline-offset-4"
            >
              موقع النشر الإلكتروني الرسمي (sgg.gov.ma)
            </a>
            : الجريدة الرسمية ونصوص القوانين المنشورة فيها. لا يُغني ملخّص ولا معجم — بما في ذلك ما تنشره
            ميزان — عن قراءة الفصل في مصدره، خاصة في المواد التي عُدّلت بعد تحرير الملخّص.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
            المنصة تفصل بوضوح بين محتوى تعليمي ومصدر قانوني: بطاقة المصطلح تعرض النص المنشور عند توفره، مع رقم
            الفصل وعبارته كما هي في المصدر.
          </p>
        </section>

        {/* ── 3. مواقع الكليات ───────────────────────────────────────────── */}
        <section id="faculties" className="mt-10">
          <h2 className="text-[20px] font-extrabold text-[#0f172a] dark:text-white">
            3. مواقع الكليات والجامعات
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
            إعلان الكلية هو المصدر الوحيد الموثوق للمواعيد: تاريخ الامتحان، اسم اللجنة، لائحة الناجحين في
            مباراة، أو تغيير طريقة اختبار. هذه لا تنشرها أي منصة عامة. دليل{" "}
            <Link to="/schools" className="font-bold text-[#2563eb]">
              كليات الحقوق في ميزان
            </Link>{" "}
            يجمع لك الجامعة والمدينة والمسالك وسنة الإحداث والرابط الرسمي لكل كلية، فتنطلق منه إلى موقع
            مؤسستك.
          </p>
        </section>

        {/* ── 4. منصات أخرى ───────────────────────────────────────────────── */}
        <section id="other-platforms" className="mt-10">
          <h2 className="text-[20px] font-extrabold text-[#0f172a] dark:text-white">
            4. منصات وموارد أخرى مفيدة
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
            قاعدة بسيطة: كلما ابتعدت عن الجهة الناشرة للنص أو للموعد، زاد احتمال أن تكون المعلومة قديمة. لذلك
            نكتفي هنا بإحالتين عموميتين معروفتين، ونصف البقية بصفتها لا بعناوينها.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table
              className="w-full text-right text-[13px]"
              aria-label="لائحة الموارد المجانية لطلبة القانون بالمغرب"
            >
              <caption className="sr-only">المورد، نوعه، ومتى يستخدمه طالب القانون في المغرب</caption>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th scope="col" className="py-2 font-bold">
                    المورد
                  </th>
                  <th scope="col" className="py-2 font-bold">
                    نوعه
                  </th>
                  <th scope="col" className="py-2 font-bold">
                    متى تستخدمه
                  </th>
                </tr>
              </thead>
              <tbody>
                {OFFICIAL_LINKS.map((r) => (
                  <tr key={r.name} className="border-b border-slate-100 dark:border-slate-800 align-top">
                    <th scope="row" className="py-3 font-bold text-[#0f172a] dark:text-white">
                      {IS_INTERNAL(r.href) ? (
                        <Link to={r.href} className="hover:text-[#2563eb]">
                          {r.name}
                        </Link>
                      ) : (
                        <a
                          href={r.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-dotted underline-offset-4 hover:text-[#2563eb]"
                        >
                          {r.name}
                        </a>
                      )}
                    </th>
                    <td className="py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.kind}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{r.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            ومن الموارد التي تُذكر كثيراً ولا ندرجها برابط: مجموعات المذكرات غير الرسمية، وملفات «أسئلة
            الامتحانات» المتداولة بلا موسم ولا مؤسسة. انتفع بها إن صحّت، لكن لا تُبنِ عليها مراجعتك النهائية؛
            فمصدرها مجهول التاريخ غالباً.
          </p>
        </section>

        {/* ── 5. الخلاصة ──────────────────────────────────────────────────── */}
        <section id="conclusion" className="mt-10">
          <h2 className="text-[20px] font-extrabold text-[#0f172a] dark:text-white">الخلاصة</h2>
          <ol className="mt-3 space-y-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300 list-decimal pr-5">
            <li>
              للمراجعة اليومية: ملخّصات{" "}
              <Link to="/archive" className="font-bold text-[#2563eb]">
                أرشيف ميزان
              </Link>{" "}
              حسب فصلك، ومعجم المصطلحات عند الحاجة.
            </li>
            <li>للتحقق من قاعدة: الجريدة الرسمية، ثم النص كما عُدّل آخر مرة — لا نسخة قديمة متداولة.</li>
            <li>
              للمواعيد والإعلانات: موقع كليتك، ودليل{" "}
              <Link to="/schools" className="font-bold text-[#2563eb]">
                الكليات
              </Link>{" "}
              للوصول إليه.
            </li>
            <li>
              وأول أسبوع في الحقوق له ترتيب خاص في{" "}
              <Link to="/guides/new-law-student-morocco" className="font-bold text-[#2563eb]">
                دليل الطالب الجديد
              </Link>
              .
            </li>
          </ol>
        </section>
      </article>
    </div>
  )
}
