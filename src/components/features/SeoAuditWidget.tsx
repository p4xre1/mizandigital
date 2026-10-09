import { useMemo, useState } from "react"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Gauge,
  Smartphone,
  Monitor,
  Filter,
  FileText,
  Key,
  Heading,
  Image as ImageIcon,
  Link as LinkIcon,
  HelpCircle,
} from "lucide-react"
import { analyzeBodyStructure } from "@/lib/seo/analyzers/text"
import { analyzeBrandConsistency } from "@/lib/seo/analyzers/brandConsistency"
import { analyzeCitationPresentation } from "@/lib/seo/analyzers/sourceQuality"
import { analyzeAnswerFirstStructure } from "@/lib/seo/scoring/aiScores"
import { BRAND, fitTitle } from "@/lib/seo/description"
import { SITE_CONFIG } from "@/lib/seo/schema"
import {
  generateOrganizationSchema as generateComponentOrganizationSchema,
  generateWebsiteSchema as generateComponentWebsiteSchema,
} from "@/components/seo/SchemaOrg"

interface SeoAuditWidgetProps {
  title: string
  description: string
  content: string
  slug?: string
  focusKeyword?: string
  baseUrl?: string
  source?: string
  sourceUrl?: string
}

interface AuditRule {
  id: string
  label: string
  category: "meta" | "content" | "keyword" | "structure"
  status: "pass" | "warn" | "fail"
  score: number // 0 to 100
  message: string
  tip?: string
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

// يهرب الرموز الخاصة بلغة RegExp حتى لا تتسبب الكلمة المفتاحية في كسر التعبير النمطي
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export default function SeoAuditWidget({
  title,
  description,
  content,
  slug = "",
  focusKeyword = "",
  baseUrl = "https://www.mizan.page",
  source = "",
  sourceUrl = "",
}: SeoAuditWidgetProps) {
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop")
  const [filterStatus, setFilterStatus] = useState<"all" | "issues" | "pass">("all")

  // تحليل تدقيق السيو المتقدم
  const audit = useMemo(() => {
    const rules: AuditRule[] = []
    const kw = focusKeyword.trim().toLowerCase()
    const cleanContent = content.trim()
    const words = cleanContent ? cleanContent.split(/\s+/).filter(Boolean) : []
    const wordCount = words.length
    const structure = analyzeBodyStructure(cleanContent)
    const answerFirst = analyzeAnswerFirstStructure(cleanContent)
    const citationPresentation = analyzeCitationPresentation(cleanContent, {
      explicitSource: source,
      explicitSourceUrl: sourceUrl,
    })
    const componentOrganizationSchema = generateComponentOrganizationSchema()
    const componentWebsiteSchema = generateComponentWebsiteSchema()
    const brandConsistency = analyzeBrandConsistency({
      title: fitTitle(title),
      openGraphSiteName: BRAND,
      schemaNames: [
        SITE_CONFIG.name,
        componentOrganizationSchema.name,
        componentWebsiteSchema.name,
        componentWebsiteSchema.publisher.name,
      ],
    })

    // 1. طول العنوان
    const titleLen = title.trim().length
    if (titleLen >= 30 && titleLen <= 60) {
      rules.push({
        id: "title-len",
        category: "meta",
        label: "طول العنوان الرئيسي",
        status: "pass",
        score: 100,
        message: `طول العنوان مثالي (${titleLen} حرف).`,
      })
    } else if (titleLen > 0 && titleLen < 30) {
      rules.push({
        id: "title-len",
        category: "meta",
        label: "طول العنوان الرئيسي",
        status: "warn",
        score: 60,
        message: `العنوان قصير نسبياً (${titleLen} حرف).`,
        tip: "يفضل زيادة طول العنوان ليصل إلى 30-60 حرفاً لجذب انتباه الباحثين.",
      })
    } else if (titleLen > 60) {
      rules.push({
        id: "title-len",
        category: "meta",
        label: "طول العنوان الرئيسي",
        status: "warn",
        score: 50,
        message: `العنوان طويل جداً (${titleLen} حرف). سيتم اقتطاعه في نتائج Google.`,
        tip: "اختصر العنوان ليكون أقل من 60 حرفاً لتفادي اقتطاع الكلمات.",
      })
    } else {
      rules.push({
        id: "title-len",
        category: "meta",
        label: "طول العنوان الرئيسي",
        status: "fail",
        score: 0,
        message: "العنوان الرئيسي مفقود.",
        tip: "أضف عنواناً جذاباً ومحدداً للمقال.",
      })
    }

    // 2. اتساق اسم العلامة بين العنوان وOpen Graph وSchema
    rules.push({
      id: "brand-consistency",
      category: "meta",
      label: "اتساق اسم العلامة التجارية (Brand Consistency)",
      status: brandConsistency.consistent ? "pass" : "warn",
      score: brandConsistency.consistent ? 100 : 40,
      message: brandConsistency.consistent
        ? brandConsistency.evidence.join("؛ ")
        : brandConsistency.issues.join(" "),
      tip: brandConsistency.consistent
        ? undefined
        : `اعتمد الصيغة نفسها «${BRAND}» في العنوان عند ذكر العلامة، وog:site_name، وحقول name في Organization وWebSite وPublisher.`,
    })

    // 3. وصف الميتا (Meta Description)
    const descLen = description.trim().length
    if (descLen >= 120 && descLen <= 160) {
      rules.push({
        id: "desc-len",
        category: "meta",
        label: "وصف الميتا (Meta Description)",
        status: "pass",
        score: 100,
        message: `طول الوصف مثالي (${descLen} حرف).`,
      })
    } else if (descLen > 0) {
      rules.push({
        id: "desc-len",
        category: "meta",
        label: "وصف الميتا (Meta Description)",
        status: "warn",
        score: 50,
        message: `طول الوصف الحالي (${descLen} حرف). النطاق المثالي هو 120-160 حرفاً.`,
        tip: "اكتب وصفاً موجزاً يظهر فائدة المقال مع تضمين الكلمة المفتاحية.",
      })
    } else {
      rules.push({
        id: "desc-len",
        category: "meta",
        label: "وصف الميتا (Meta Description)",
        status: "fail",
        score: 0,
        message: "وصف الميتا غير محدد.",
        tip: "أضف وصف الميتا حيث تحتم محركات البحث وجوده لرفع نسبة النقر (CTR).",
      })
    }

    // 4. طول النص والمحتوى
    if (wordCount >= 300) {
      rules.push({
        id: "content-len",
        category: "content",
        label: "عمق وجودة المحتوى",
        status: "pass",
        score: 100,
        message: `المقال غني ويحتوي على ${wordCount} كلمة.`,
      })
    } else if (wordCount >= 120) {
      rules.push({
        id: "content-len",
        category: "content",
        label: "عمق وجودة المحتوى",
        status: "warn",
        score: 60,
        message: `المقال قصير نسبياً (${wordCount} كلمة).`,
        tip: "حاول إثراء النص بنقاط قانونية وتفاصيل إضافية للوصول إلى 300+ كلمة.",
      })
    } else {
      rules.push({
        id: "content-len",
        category: "content",
        label: "عمق وجودة المحتوى",
        status: "fail",
        score: 0,
        message: `المحتوى ضعيف جداً (${wordCount} كلمة فقط).`,
        tip: "محركات البحث تفضل المقالات الشاملة التي تجيب عن استفسار القارئ بالتفصيل.",
      })
    }

    // 5. فحوصات الكلمة المفتاحية
    if (kw) {
      const inTitle = title.toLowerCase().includes(kw)
      const inDesc = description.toLowerCase().includes(kw)

      // وجود الكلمة في العنوان والوصف
      if (inTitle && inDesc) {
        rules.push({
          id: "kw-meta",
          category: "keyword",
          label: "تضمين الكلمة المفتاحية بالميتا",
          status: "pass",
          score: 100,
          message: "الكلمة المفتاحية موجودة في العنوان والوصف.",
        })
      } else if (inTitle || inDesc) {
        rules.push({
          id: "kw-meta",
          category: "keyword",
          label: "تضمين الكلمة المفتاحية بالميتا",
          status: "warn",
          score: 60,
          message: "الكلمة المفتاحية موجودة في أحدهما فقط (العنوان أو الوصف).",
          tip: "ضَمِّن الكلمة المفتاحية في كل من العنوان والوصف لتعزيز التوافق.",
        })
      } else {
        rules.push({
          id: "kw-meta",
          category: "keyword",
          label: "تضمين الكلمة المفتاحية بالميتا",
          status: "fail",
          score: 0,
          message: "الكلمة المفتاحية غائبة عن العنوان والوصف.",
          tip: "قم بإدراج الكلمة المفتاحية المستهدفة بشكل طبيعي في بداية العنوان والوصف.",
        })
      }

      // كثافة الكلمة المفتاحية في المحتوى
      if (wordCount > 0) {
        const matches = (
          cleanContent.toLowerCase().match(new RegExp(escapeRegExp(kw), "g")) || []
        ).length
        const density = Number(((matches / wordCount) * 100).toFixed(1))

        if (density >= 0.5 && density <= 2.5) {
          rules.push({
            id: "kw-density",
            category: "keyword",
            label: "كثافة الكلمة المفتاحية",
            status: "pass",
            score: 100,
            message: `كثافة مثالية بنسبة ${density}% (${matches} مرات تكرار).`,
          })
        } else if (density > 2.5) {
          rules.push({
            id: "kw-density",
            category: "keyword",
            label: "كثافة الكلمة المفتاحية",
            status: "warn",
            score: 50,
            message: `كثافة مرتفعة (${density}% - ${matches} مرات). حشو كلمات (Keyword Stuffing).`,
            tip: "قلل تكرار الكلمة المفتاحية واستخدم مرادفات قانونية بديلة لتفادي عقوبات Google.",
          })
        } else if (matches > 0) {
          rules.push({
            id: "kw-density",
            category: "keyword",
            label: "كثافة الكلمة المفتاحية",
            status: "warn",
            score: 60,
            message: `كثافة منخفضة (${density}% - تكرار ${matches} مرة).`,
            tip: "حاول ذكر الكلمة المفتاحية في بعض الفقرات الرئيسية بشكل طبيعي.",
          })
        } else {
          rules.push({
            id: "kw-density",
            category: "keyword",
            label: "كثافة الكلمة المفتاحية",
            status: "fail",
            score: 0,
            message: "الكلمة المفتاحية لم تذكر إطلاقاً في متن النص.",
            tip: "أضف الكلمة المفتاحية في الفقرة الأولى والفقرة الختامية للمقال على الأقل.",
          })
        }
      }
    }

    // 6. العناوين الفرعية الهيكلية (H2 / H3)
    const hasHeadings = structure.headings.some((heading) => heading.level >= 2)
    if (hasHeadings) {
      rules.push({
        id: "headings",
        category: "structure",
        label: "العناوين الفرعية (Headings)",
        status: "pass",
        score: 100,
        message: "المقال مقسم باستخدام عناوين فرعية (H2/H3).",
      })
    } else {
      rules.push({
        id: "headings",
        category: "structure",
        label: "العناوين الفرعية (Headings)",
        status: "warn",
        score: 40,
        message: "المقال يفتقر لتقسيم العناوين الفرعية (H2 / H3).",
        tip: "استخدم العناوين (## عنوان فرعي) لتسهيل القراءة وتسهيل الفهرسة.",
      })
    }

    // 7. بنية المحتوى القابلة للاستخراج لمحركات الإجابة
    const hierarchyJumps = structure.headingJumps
    const hierarchyMessage = hierarchyJumps.length
      ? hierarchyJumps.map((jump) => `H${jump.fromLevel} → H${jump.toLevel}`).join("، ")
      : "لا توجد قفزات في مستويات العناوين."
    rules.push({
      id: "heading-hierarchy",
      category: "structure",
      label: "تسلسل مستويات العناوين",
      status: hierarchyJumps.length ? "warn" : "pass",
      score: hierarchyJumps.length ? Math.max(35, 100 - hierarchyJumps.length * 35) : 100,
      message: hierarchyJumps.length
        ? `${hierarchyJumps.length} قفزة في التسلسل: ${hierarchyMessage}`
        : hierarchyMessage,
      tip: hierarchyJumps.length
        ? "لا تنتقل من H2 إلى H4 مباشرة؛ أضف H3 أو أعد مستوى العنوان ليبقى كل عنوان فرعياً متتالياً."
        : undefined,
    })

    const questionHeadingCount = structure.questionHeadings.length
    rules.push({
      id: "question-headings",
      category: "content",
      label: "عناوين بصيغة أسئلة القارئ",
      status: questionHeadingCount >= 2 ? "pass" : "warn",
      score: questionHeadingCount >= 2 ? 100 : questionHeadingCount === 1 ? 65 : 35,
      message: `${questionHeadingCount} عنواناً فرعياً بصيغة سؤال.`,
      tip: questionHeadingCount < 2
        ? "أضف عناوين H2/H3 تصوغ أسئلة حقيقية يبحث عنها القارئ، وأجب عنها مباشرة تحت كل عنوان."
        : undefined,
    })

    const unansweredQuestionSections = answerFirst.questionSections.filter((section) => !section.hasDirectAnswer)
    const answerFirstComplete = answerFirst.hasDirectAnswer && unansweredQuestionSections.length === 0
    rules.push({
      id: "answer-first",
      category: "content",
      label: "الإجابة المباشرة في المقدمة والأقسام",
      status: answerFirstComplete ? "pass" : "warn",
      score: answerFirstComplete ? 100 : answerFirst.hasDirectAnswer ? 65 : 35,
      message: answerFirst.hasDirectAnswer
        ? unansweredQuestionSections.length
          ? `المقدمة مباشرة، لكن ${unansweredQuestionSections.length} عنوان سؤالي لا يتبعه جواب واضح.`
          : `تبدأ المقدمة بإجابة موجزة (${answerFirst.openingWords} كلمة في الجملة الأولى)، وأُجيب عن العناوين السؤالية مباشرة.`
        : answerFirst.openingWords
          ? `لم تُكتشف إجابة مباشرة في البداية (${answerFirst.openingWords} كلمة في أول جملة).`
          : "لا توجد جملة افتتاحية يمكن اقتباسها كجواب مباشر.",
      tip: answerFirstComplete
        ? undefined
        : "ابدأ بتعريف أو جواب واضح في أول فقرة، ثم افتح كل عنوان سؤالي بجواب مباشر؛ انقل التمهيد والسياق إلى ما بعد الإجابة.",
    })

    const hasNamedLinkedSource = citationPresentation.namedLinkedSources.length > 0
    rules.push({
      id: "named-citations",
      category: "structure",
      label: "مصادر مسمّاة بروابط خارجية",
      status: hasNamedLinkedSource ? "pass" : "warn",
      score: hasNamedLinkedSource ? 100 : citationPresentation.outboundLinks.length ? 55 : 20,
      message: hasNamedLinkedSource
        ? `${citationPresentation.namedLinkedSources.length} مصدر مسمّى مرتبط برابط خارجي.`
        : citationPresentation.outboundLinks.length
          ? "توجد روابط خارجية لكن لا يظهر معها اسم مصدر واضح."
          : "لا يوجد رابط خارجي لمصدر مسمّى.",
      tip: hasNamedLinkedSource
        ? undefined
        : "اذكر الجهة أو النص المرجعي بالاسم واربطه بمصدره الرسمي/الأكاديمي؛ لا تكتفِ برابط عام أو «اضغط هنا».",
    })

    const quotationCount = citationPresentation.quotations.length
    const attributedQuoteCount = citationPresentation.attributedQuoteCount
    const allQuotesAttributed = quotationCount > 0 && attributedQuoteCount === quotationCount
    rules.push({
      id: "attributed-quotes",
      category: "content",
      label: "اقتباسات السلطات مع الإسناد",
      status: allQuotesAttributed ? "pass" : "warn",
      score: allQuotesAttributed ? 100 : quotationCount ? Math.round((attributedQuoteCount / quotationCount) * 65) : 30,
      message: quotationCount
        ? `اقتباسات منسوبة: ${attributedQuoteCount}/${quotationCount}.`
        : "لا يتضمن النص اقتباساً مباشراً موثقاً.",
      tip: allQuotesAttributed
        ? undefined
        : "أضف اقتباساً حقيقياً من جهة أو مؤلف مسمّى، وانسبه بوضوح واربط المصدر. تحقّق من اللفظ قبل وضعه بين علامتي اقتباس؛ لا تنشئ اقتباساً من عندك.",
    })

    // 8. الوسائط والروابط
    const hasImages = /!\[.*?\]\(.*?\)/.test(cleanContent)
    const hasLinks = /\[.*?\]\(.*?\)/.test(cleanContent)

    if (hasImages) {
      rules.push({
        id: "images",
        category: "structure",
        label: "الصور والوسائط",
        status: "pass",
        score: 100,
        message: "المقال يحتوي على صور توضيحية.",
      })
    }

    if (hasLinks) {
      rules.push({
        id: "links",
        category: "structure",
        label: "الروابط الخارجية/الداخلية",
        status: "pass",
        score: 100,
        message: "المقال يحتوي على روابط مرجعية.",
      })
    }

    // 9. سلامة الرابط (Slug Check)
    if (slug) {
      const isCleanSlug = /^[a-z0-9-]+$/.test(slug) || /^[\u0600-\u06FF0-9-]+$/.test(slug)
      if (isCleanSlug) {
        rules.push({
          id: "slug-clean",
          category: "meta",
          label: "تركيب الرابط (Slug)",
          status: "pass",
          score: 100,
          message: "رابط المقال منسق وصحيح.",
        })
      } else {
        rules.push({
          id: "slug-clean",
          category: "meta",
          label: "تركيب الرابط (Slug)",
          status: "warn",
          score: 50,
          message: "الرابط يحتوي على رموز خاصة أو مسافات غير مستحبة.",
          tip: "استخدم الشرطات (-) بدلاً من المسافات أو الرموز الغريبة في الرابط.",
        })
      }
    }

    // حساب النتيجة الكلية بناءً على متوسط الدرجات
    const totalScore = Math.round(
      rules.reduce((acc, r) => acc + r.score, 0) / (rules.length || 1)
    )

    return { rules, score: totalScore }
  }, [title, description, content, slug, focusKeyword, source, sourceUrl])

  // التصفية
  const filteredRules = useMemo(() => {
    if (filterStatus === "issues") {
      return audit.rules.filter((r) => r.status === "warn" || r.status === "fail")
    }
    if (filterStatus === "pass") {
      return audit.rules.filter((r) => r.status === "pass")
    }
    return audit.rules
  }, [audit.rules, filterStatus])

  // ألوان النتيجة
  const getScoreTheme = (score: number) => {
    if (score >= 80)
      return {
        badge: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        bar: "bg-emerald-500",
        label: "ممتاز (SEO Ready)",
      }
    if (score >= 50)
      return {
        badge: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        bar: "bg-amber-500",
        label: "يحتاج تحسينات",
      }
    return {
      badge: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      bar: "bg-rose-500",
      label: "ضعيف كلياً",
    }
  }

  const theme = getScoreTheme(audit.score)
  const passCount = audit.rules.filter((r) => r.status === "pass").length
  const issueCount = audit.rules.length - passCount

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm" dir="rtl">
      {/* الترويسة مع النتيجة والعداد */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Gauge className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">تدقيق السيو الشامل (SEO Audit)</h3>
            <p className="text-xs text-muted-foreground">
              فحص التوافق مع معايير محركات البحث ومعاينة Google
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left dir-ltr">
            <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-black", theme.badge)}>
              {audit.score} / 100
            </span>
            <span className="block text-[10px] font-medium text-muted-foreground mt-0.5 dir-rtl">
              {theme.label}
            </span>
          </div>
        </div>
      </div>

      {/* شريط التقدم المرئي */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all duration-500 ease-out", theme.bar)}
          style={{ width: `${audit.score}%` }}
        />
      </div>

      {/* محاكاة النتيجة في محرك البحث Google */}
      <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Search className="size-3.5 text-primary" /> معاينة النتيجة في Google
          </span>
          <div className="flex items-center rounded-lg bg-background border border-border p-0.5">
            <button
              type="button"
              onClick={() => setDeviceView("desktop")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition",
                deviceView === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <Monitor className="size-3" /> حاسوب
            </button>
            <button
              type="button"
              onClick={() => setDeviceView("mobile")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition",
                deviceView === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <Smartphone className="size-3" /> هاتف
            </button>
          </div>
        </div>

        {/* عرض المعاينة */}
        <div
          className={cn(
            "mx-auto rounded-lg bg-background p-3.5 shadow-sm border border-border/60 transition-all dir-rtl",
            deviceView === "mobile" ? "max-w-xs" : "w-full"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="grid size-4 place-items-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
              M
            </div>
            <div className="truncate text-[11px] text-muted-foreground dir-ltr text-right">
              {baseUrl.replace(/^https?:\/\//, "")} › {slug || "article-title"}
            </div>
          </div>
          <div className="truncate text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
            {title || "عنوان المقال سوف يظهر هنا بشكل محاكي..."}
          </div>
          <div className="line-clamp-2 text-xs text-muted-foreground/90 leading-relaxed mt-1">
            {description || "وصف الميتا الخاص بالمقال سيظهر هنا في محرك البحث ليصف محتوى الصفحة..."}
          </div>
        </div>
      </div>

      {/* أزرار التصفية وإحصائيات القواعد */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="size-3.5" />
          <span>تصفية النتائج:</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-bold transition",
              filterStatus === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            الكل ({audit.rules.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("issues")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-bold transition",
              filterStatus === "issues" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            تنبيهات ({issueCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("pass")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-bold transition",
              filterStatus === "pass" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            ناجح ({passCount})
          </button>
        </div>
      </div>

      {/* قائمة نتائج التدقيق */}
      <div className="space-y-2.5 pt-1">
        {filteredRules.length > 0 ? (
          filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="group rounded-xl border border-border/60 bg-card p-3 transition hover:border-border hover:bg-muted/20"
            >
              <div className="flex items-start gap-2.5">
                {rule.status === "pass" && <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />}
                {rule.status === "warn" && <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />}
                {rule.status === "fail" && <XCircle className="size-4 shrink-0 text-rose-500 mt-0.5" />}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{rule.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rule.message}</p>
                  {rule.tip && (
                    <div className="mt-1.5 flex items-start gap-1 rounded-lg bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-300 border border-amber-500/10">
                      <HelpCircle className="size-3.5 shrink-0 mt-0.5" />
                      <span>{rule.tip}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            لا توجد قواعد تنطبق على التصفية المحددة.
          </div>
        )}
      </div>
    </div>
  )
}