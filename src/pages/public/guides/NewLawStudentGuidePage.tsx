import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { AEOHead, FAQSection } from "../../../components/seo/AEOHead"
import lexiconData from "../../../data/lexicon.client.json"
import newsData from "../../../data/news.json"
import schoolsData from "../../../data/schools.json"

/**
 * «دليل طالب الحقوق الجديد في المغرب» — صفحة ركنية لأول أسبوع في الكلية.
 * المثال المطبوع في الصفحة (مصطلح، كلية، خبر) يقرأ من ملفات البيانات نفسها التي
 * تقرأها الصفحات الحيّة، فلا تعدّل الصفحة يدياً ثم تنسى أن المثال صار قديماً.
 */
const TITLE = "دليل طالب الحقوق الجديد في المغرب 2026 | ميزان"

/* 140–160 حرفاً، ومطابق حرفياً للوصف المطبوع في scripts/prerender.mjs. */
const DESCRIPTION =
  "دليل عملي لأول أسبوع في كلية الحقوق بالمغرب: كيف تدرس، وكيف تقرأ نصّاً قانونياً، وما الموارد المجانية التي تكفيك وحدها — بأمثلة من منصة ميزان الرقمية."

const TERM_SAMPLE_ID = "obligation"

type LexiconCard = {
  id: string
  term_ar?: string
  term_fr?: string
  definition?: string
  simple_explanation?: string
  examples?: string[]
  exam_keywords?: string[]
  related_terms?: string[]
  review_status?: string
}

type NewsCard = {
  id: string
  title?: string
  summary?: string
  date?: string
  category?: string
}
type SchoolCard = {
  id?: string
  name?: string
  short_name?: string
  city?: string
  filieres?: string[]
}

const WEEK_PLAN: Array<{ day: string; what: string; where: ReactNode }> = [
  {
    day: "اليوم 1–2",
    what: "اعرف بنية الفصل: وحدات، معاملاتها، ونمط الاختبار (تطبيقي أم نظري).",
    where: "إعلان الكلية ومجلس القسم.",
  },
  {
    day: "اليوم 3",
    what: "اجمع السلاسل (cours) التي ستعتمد عليها، وحدّد مصدراً واحداً لكل مادة لا ثلاثة.",
    where: "مكتبة الكلية، وموارد القسم على موقع المؤسسة.",
  },
  {
    day: "اليوم 4–5",
    what: "ابدأ من ملخّص واحد لكل مادة لتثبيت البنية، ثم عد إلى المحاضرة للتفصيل.",
    where: (
      <Link to="/archive" className="font-bold text-[#2563eb]">
        أرشيف ميزان حسب الفصل
      </Link>
    ),
  },
  {
    day: "اليوم 6",
    what: "اكتب بطاقة مصطلحاتك الخاصة: ثلاث كلمات قانونية في اليوم تشرحها بنفسك.",
    where: (
      <Link to="/lexicon" className="font-bold text-[#2563eb]">
        المعجم القانوني
      </Link>
    ),
  },
  {
    day: "اليوم 7",
    what: "جرّب سؤال دورة سابقة في الوقت المحدد، وصحّح لنفسك بعناصر الإجابة.",
    where: (
      <Link to="/archive" className="font-bold text-[#2563eb]">
        أسئلة الامتحانات السابقة
      </Link>
    ),
  },
]

const RESOURCES: Array<{
  name: string
  kind: string
  use: string
  href?: string
}> = [
  {
    name: "ملخّص الفصل",
    kind: "مراجعة",
    use: "تثبيت بنية المادة قبل المحاضرة وبعدها.",
    href: "/archive",
  },
  {
    name: "المعجم القانوني",
    kind: "مصطلحات",
    use: "عندما يتعثر الفهم عند كلمة، لا عند الجملة كلها.",
    href: "/lexicon",
  },
  {
    name: "النص القانوني الرسمي",
    kind: "مرجع",
    use: "للتأكد من العبارة سارية المفعول، لا للحفظ اليومي.",
    href: "https://www.sgg.gov.ma",
  },
  {
    name: "إعلان الكلية",
    kind: "مواعيد",
    use: "اللجان، التداريب، المباريات، ونتائج التدقيق.",
    href: "/schools",
  },
  {
    name: "مجموعة مراجعة",
    kind: "تدريب",
    use: "شرح زميل لك سؤالاً واحداً يساوي ثلاث قراءات صامتة.",
  },
]

const FAQS = [
  {
    question: "هل أشتري الكتب في الأسبوع الأول؟",
    answer:
      "لا تنتظر نهاية الأسبوع الأول: ابدأ بالسلاسل التي يحدّدها أستاذ المادة، واقتنِ كتاباً واحداً فقط حين تعرف نمط الاختبار. معظم الطلبة يشترون في أول أسبوع ما لا يفتحونه أبداً، لأن القائمة لم تُبنَ على طريقة التصحيح بل على عنوان مألوف.",
  },
  {
    question: "كم ساعة أحتاج يومياً في الحقوق؟",
    answer:
      "ساعة إلى ساعتين بتركيز تُنهيان أسبوعك، بشرط أن تكونا على المادة الحالية لا على ما تراكم. الفرق في الحقوق ليس عدد الساعات بل عدد المرات التي أغلقت فيها الكتاب وحاولت استرجاع القاعدة من ذاكرتك؛ القراءة المتكررة وحدها تُشعرك بالمعرفة دون أن تثبّتها.",
  },
  {
    question: "كيف أبدأ مراجعة امتحان القانون المدني؟",
    answer:
      "اربعة خطوات: اكتب تعريف المفاهيم الأساسية في الصفحة الأولى، ثم ارسم مخطط أركان الحكم وشروطه، ثم حلّ سؤال دورة سابقة في الوقت المحدد، ثم صحّح بعناصر الإجابة وراجع ما أخطأت فيه فقط. من هنا تبدأ البطاقة في المعجم ثم الفصل في النص الرسمي.",
  },
]

export default function NewLawStudentGuidePage() {
  // القراءة من ملفات البيانات نفسها التي تقرأها الصفحات الحيّة: حين يُضاف
  // مصطلح أو يتغيّر آخر خبر، تتحدّث هذه الصفحة معه دون تحرير يدوي.
  const lexicon = lexiconData as unknown as LexiconCard[]
  const terms = lexicon.filter((t) => t && t.term_ar)
  const news = newsData as unknown as NewsCard[]
  const schools = schoolsData as unknown as SchoolCard[]
  const term = terms.find((t) => t.id === TERM_SAMPLE_ID) ?? terms[0]
  const latestNews = [...news].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0]
  const faculty = schools.find((sc) => (sc.city || "").includes("طنجة")) ?? schools[0]
  const termsCount = terms.length

  return (
    <div className="bg-white dark:bg-[#0f172a]">
      <AEOHead
        title={TITLE}
        description={DESCRIPTION}
        keywords={[
          "دليل طالب الحقوق",
          "السنة الأولى حقوق المغرب",
          "مراجعة القانون المدني",
          "كلية الحقوق طنجة",
          "طريقة الدراسة في الحقوق",
        ]}
        faq={FAQS}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "الأدلة", url: "/guides" },
          {
            name: "دليل الطالب الجديد",
            url: "/guides/new-law-student-morocco",
          },
        ]}
        schema={{
          "@type": "HowTo",
          name: "كيف تبدأ أسبوعك الأول في كلية الحقوق",
          description: DESCRIPTION,
          totalTime: "PT7D",
          step: WEEK_PLAN.map((s, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: s.day,
          })),
        }}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#2563eb]">أدلة الطالب</p>
        <h1 className="mt-3 text-[26px] sm:text-[32px] font-extrabold leading-tight text-[#0f172a] dark:text-white">
          دليل طالب الحقوق الجديد في المغرب 2026
          {/* نصّ H1 = نصّ <title> حرفياً؛ العلامة تُقرأ ولا تُعرض، فلا يختلف
              عنوان العنصر عن عنوان الوسم عند التقييم البشري أو الآلي. */}
          <span className="sr-only"> | ميزان</span>
        </h1>
        <p className="mt-4 lead text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          <strong>
            أول أسبوع في الحقوق لا يحتاج مكتبة، يحتاج نظاماً: مصدر واحد لكل مادة، بطاقة مصطلحات كل يوم، وسؤال
            دورة واحدة في نهاية الأسبوع.
          </strong>{" "}
          هذا الدليل يمشي بك في سبعة أيام، ويُريك أمثلة حقيقية من المنصة لا شرحاً نظرياً.
        </p>

        {/* ── الأسبوع الأول ─────────────────────────────────────────────── */}
        <section id="first-week" className="mt-10">
          <h2 className="text-[20px] font-extrabold text-[#0f172a] dark:text-white">
            الأسبوع الأول: ما تفعله يوماً بيوم
          </h2>
          <ol className="mt-4 space-y-3">
            {WEEK_PLAN.map((step) => (
              <li key={step.day} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-[12px] font-extrabold text-[#2563eb]">{step.day}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">
                  {step.what}
                </p>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{step.where}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── مثال من المعجم ─────────────────────────────────────────────── */}
        <section id="example" className="mt-10">
          <h2 className="text-[20px] font-extrabold text-[#0f172a] dark:text-white">
            مثال: كيف تقرأ بطاقة مصطلح
          </h2>
          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-slate-50 dark:bg-slate-800/40">
            <p className="text-[17px] font-extrabold text-[#0f172a] dark:text-white">
              {term?.term_ar}{" "}
              <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">
                {term?.term_fr}
              </span>
            </p>
            {term?.simple_explanation && (
              <p className="mt-3 text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">
                {term.simple_explanation}
              </p>
            )}
            {term?.examples && term.examples.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 list-disc pr-5">
                {term.examples.slice(0, 3).map((ex) => (
                  <li key={ex}>{ex}</li>
                ))}
              </ul>
            )}
            {term?.exam_keywords && term.exam_keywords.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="كلمات مفتاحية للمراجعة">
                {term.exam_keywords.map((k) => (
                  <li
                    key={k}
                    className="rounded-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300"
                  >
                    {k}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[12px] text-slate-500 dark:text-slate-400">
              هذه البطاقة واحدة من {termsCount} بطاقة في{" "}
              <Link to="/lexicon" className="font-bold text-[#2563eb]">
                المعجم القانوني
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ── جدول الموارد ───────────────────────────────────────────────── */}
        <section id="resources" className="mt-10">
          <h2 className="text-[20px] font-extrabold text-[#0f172a] dark:text-white">
            ما يكفيك من الموارد في السنة الأولى
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table
              className="w-full text-right text-[13px]"
              aria-label="الموارد التي يحتاجها طالب الحقوق في السنة الأولى"
            >
              <caption className="sr-only">المورد، نوعه، ومتى تستخدمه</caption>
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
                {RESOURCES.map((r) => (
                  <tr key={r.name} className="border-b border-slate-100 dark:border-slate-800 align-top">
                    <th scope="row" className="py-3 font-bold text-[#0f172a] dark:text-white">
                      {!r.href ? (
                        r.name
                      ) : r.href.startsWith("/") ? (
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
          <p className="mt-3 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            ولا تعرف أي مورد يناسبك بعد؟ القائمة المقارنة بالمصادر الرسمية في{" "}
            <Link to="/guides/free-legal-resources-morocco" className="font-bold text-[#2563eb]">
              دليل الموارد المجانية
            </Link>
            .
          </p>
        </section>

        {/* ── نصائح للمراجعة ─────────────────────────────────────────────── */}
        <section id="revision-tips" className="mt-10">
          <h2 className="text-[20px] font-extrabold text-[#0f172a] dark:text-white">نصائح للمراجعة</h2>
          <ul className="mt-4 space-y-3">
            {[
              "اكتب القاعدة بيدك في جملة واحدة، ثم أغلق الكتاب وارجع إليها. إن لم تستطع، فأنت لم تفهمها بعد.",
              "لا تحفظ رقم الفصل وحده: احفظ معه الحالة التي يُطبَّق فيها، لأن الأسئلة التطبيقية تسأل عن الحالة لا عن الرقم.",
              "قارن كل مصطلحين متجاورين (البيع والهبة، الرهن والكفالة) بجدول من ثلاثة أسطر: المحل، الأثر، السبب.",
              "خصّص آخر ساعة من الأسبوع لدورة أسئلة سابقة، لا لقراءة جديدة؛ التصحيح هو ما يرفع النقط.",
              "تابع المستجدات التشريعية لِمادّتك: سؤال «ما رأيك في التعديل الأخير» يظهر في الامتحانات أكثر مما تتوقع.",
            ].map((tip) => (
              <li
                key={tip}
                className="flex gap-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300"
              >
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[#2563eb]" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── من كليّتك ومن مستجدّات المنصة ──────────────────────────────── */}
        <section id="from-the-data" className="mt-10 grid gap-4 sm:grid-cols-2">
          {faculty && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <h2 className="text-[15px] font-extrabold text-[#0f172a] dark:text-white">
                مثال من دليل الكليات
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                {faculty.name}
                {faculty.city ? ` — ${faculty.city}` : ""}.
                {Array.isArray(faculty.filieres) && faculty.filieres.length
                  ? ` من مسالكها: ${faculty.filieres.slice(0, 3).join("، ")}.`
                  : ""}
              </p>
              <Link to="/schools" className="mt-3 inline-block text-[13px] font-bold text-[#2563eb]">
                كل كليات الحقوق ←
              </Link>
            </div>
          )}
          {latestNews && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <h2 className="text-[15px] font-extrabold text-[#0f172a] dark:text-white">آخر مستجد منشور</h2>
              <p className="mt-2 text-[13px] font-bold text-[#0f172a] dark:text-white">{latestNews.title}</p>
              {latestNews.summary && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {latestNews.summary}
                </p>
              )}
              <Link
                to={`/news/${latestNews.id}`}
                className="mt-3 inline-block text-[13px] font-bold text-[#2563eb]"
              >
                اقرأ الخبر ←
              </Link>
            </div>
          )}
        </section>

        {/* ── الأسئلة الشائعة (مرئية + FAQPage في JSON-LD) ───────────────── */}
        <FAQSection faqs={FAQS} />

        <section id="next" className="mt-10 rounded-2xl bg-[#eff6ff] dark:bg-[#2563eb]/10 p-6">
          <h2 className="text-[17px] font-extrabold text-[#0f172a] dark:text-white">خطوتك التالية</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            ابدأ من الفصل الذي تدرسه الآن من الأرشيف، واحفظ بطاقة مصطلح واحدة اليوم، واحفظ رابط{" "}
            <Link to="/platform" className="font-bold text-[#2563eb]">
              صفحة المنصة
            </Link>{" "}
            لتعرف ما يُضاف عليها.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-bold">
            <li>
              <Link to="/archive" className="text-[#2563eb]">
                الملخصات
              </Link>
            </li>
            <li>
              <Link to="/lexicon" className="text-[#2563eb]">
                المعجم القانوني
              </Link>
            </li>
            <li>
              <Link to="/schools" className="text-[#2563eb]">
                الكليات
              </Link>
            </li>
            <li>
              <Link to="/news" className="text-[#2563eb]">
                المستجدات
              </Link>
            </li>
          </ul>
        </section>
      </article>
    </div>
  )
}
