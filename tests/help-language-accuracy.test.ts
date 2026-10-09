// قياس دقة بوابة اللغة: كم رسالة عربية/دارجة رُفضت خطأً (false reject)،
// وكم رسالة غير عربية قُبلت خطأً (false accept). العينة مصنّفة يدوياً وصغيرة،
// والأرقام تخص هذه العينة وحدها، لا تعميماً على كل الاستعمال.
//
// الفئات الغامضة (مثل سؤال فرنسي فيه كلمتان عربيتان) لا تدخل في المقاييس،
// وتُعرض في اختبار منفصل لتوثيق القرار.

import { describe, expect, test } from "vitest"
import { analyzeLanguage, detectLanguage } from "../shared/help/language.js"
import { runPipeline } from "../shared/help/pipeline.js"

type Sample = { text: string; category: string }

/** يجب أن تُقبل: عربية فصحى، دارجة بالعربية، دارجة بالحروف اللاتينية، عربية مختلطة بمصطلحات. */
const SHOULD_ACCEPT: Sample[] = [
  // عربية فصحى
  ..."كيف أبحث في الأرشيف؟|ما هي ميزان الرقمية؟|ما معنى الالتزام في القانون؟|أين أجد ملفات السداسي الأول؟|ما الفرق بين البطلان والفسخ؟|كيف أحمل ملفات PDF من S1؟|هل يمكنني الاطلاع على المعجم القانوني؟|ما هي شروط صحة العقد في القانون المغربي؟|أريد معرفة مواعيد التسجيل في الكليات|شرح مبدأ حسن النية في العقود|ما معنى الاستئناف والنقض؟|ما هو القانون المنظم لعقود الشغل؟|كم عدد الكليات المدرجة في الدليل؟|أين تجد المقالات والمنهجيات؟|كيف أصل إلى صفحة الأخبار؟|ما الفرق بين الحيازة والملكية؟|ما الذي يميز الجريمة عن المخالفة؟|هل الأرشيف مجاني؟|ما هي مدة التقادم في الالتزامات؟|كيف أحسن طريقة المراجعة قبل الامتحان؟|ما معنى الدهير الشريف؟|أين تقع صفحة الأسئلة الشائعة؟|ما حكم الإخلال بالالتزام التعاقدي؟|كيف أستعمل محرك البحث في الموقع؟|ما هي خطوات إنشاء حساب جديد؟|ما أهم مصادر القانون المغربي؟|هل يمكن تحميل المحاضرات بصيغة PDF؟|ما هو الفرق بين الجنحة والجناية؟|ما معنى الخطأ التقصيري؟|كيف أستفيد من قسم المعجم؟".split("|").map((text) => ({ text, category: "msa" })),
  // دارجة بالحروف العربية
  ..."شنو هو الأرشيف؟|كيفاش نقدر ندير تسجيل فالموقع؟|واش كاين شي ملخصات للسداسي الأول؟|بغيت نعرف شنو هو المعجم|فين كاين الأرشيف؟|علاش ما كيحلش الموقع؟|شحال من كلية كاينة فالدليل؟".split("|").map((text) => ({ text, category: "darija_arabic" })),
  // دارجة بالحروف اللاتينية (Arabizi)
  ..."wach kayn chi qanoun dyal lkrae|kifach ndir inscription f site|3lach ma kaynch lkhdma|chno hiya lmo7ami|wach lmawqe3 fih lqanoun|kayn chi archive f site|bghit nmout|salam 3lik kifach nqalbo 3la lmo7ami|chokran bzaf|bslama".split("|").map((text) => ({ text, category: "darija_latin" })),
  // عربية مختلطة بمصطلحات فرنسية أو إنجليزية
  ..."ما هو le contrat de bail؟|ما معنى contract في الموقع؟|ما معنى responsabilité civile في القانون؟|ما الفرق بين الكفالة et الضمان؟|شرح المصطلح La prescription في المعجم|ما هي مدة الـ prescription؟|ما هو الفرق بين بطلان et فسخ؟".split("|").map((text) => ({ text, category: "mixed_ar_fr_en" })),
]

/** يجب أن تُرفض: فرنسية، إنجليزية، إسبانية، سيريلية، صينية، أو بلا أي كلمة مفهومة بالعربية. */
const SHOULD_REJECT: Sample[] = [
  ...["What is the contract?", "How do I search the archive?", "Can you explain the difference between nullity and termination?", "hello, I need help with my exam", "thank you very much", "Please tell me about the law archive", "I passed my exam today"].map((text) => ({ text, category: "english" })),
  ...["Comment chercher dans le lexique ?", "Quelle est la différence entre un contrat et une convention ?", "Bonjour, je voudrais des informations sur l'université", "Merci beaucoup pour votre aide", "Où puis-je télécharger les cours ?", "Je n'ai pas compris la responsabilité civile", "Qu'est-ce que la prescription extinctive ?"].map((text) => ({ text, category: "french" })),
  ...["¿Cómo busco en el archivo?", "¿Qué es un contrato de arrendamiento?"].map((text) => ({ text, category: "spanish" })),
  ...["Как найти статью?", "Что такое договор?"].map((text) => ({ text, category: "cyrillic" })),
  ...["什么是合同？", "如何搜索档案？"].map((text) => ({ text, category: "cjk" })),
  // فرنسية فيها كلمة عربية واحدة: ترفض لأن العربية لم تحمل السؤال
  ...["Qu'est-ce que le بطلان ?", "Donnez-moi la définition de la prescription extinctive"].map((text) => ({ text, category: "french_with_one_arabic_term" })),
]

/** الأمثلة الغامضة: لا تدخل في المقاييس. القرار الموثّق مذكور في كل حالة. */
const AMBIGUOUS: Array<{ text: string; note: string }> = [
  {
    text: "Quelle est la différence entre بطلان et فسخ ?",
    note: "فرنسية بكلمتين عربيتين مفهومتين: تُقبل لأن الغرض (مصطلحان قانونيان) مفهوم بالعربية",
  },
]

function classify(samples: Sample[]) {
  return samples.map((s) => ({ ...s, lang: analyzeLanguage(s.text).lang, accepted: detectLanguage(s.text) !== "other" }))
}

describe("قياس دقة بوابة اللغة على العينة المصنّفة", () => {
  const accepts = classify(SHOULD_ACCEPT)
  const rejects = classify(SHOULD_REJECT)

  test("العربية والدارجة والمختلط تُقبل بلا رفض خاطئ", () => {
    const falseRejects = accepts.filter((s) => !s.accepted)
    console.info(
      `[language] false rejects: ${falseRejects.length}/${accepts.length}`,
      falseRejects.map((s) => `${s.category}: ${s.text}`),
    )
    expect(falseRejects.map((s) => s.text)).toEqual([])
  })

  test("الفرنسية والإنجليزية وغيرها تُرفض بلا قبول خاطئ", () => {
    const falseAccepts = rejects.filter((s) => s.accepted)
    console.info(
      `[language] false accepts: ${falseAccepts.length}/${rejects.length}`,
      falseAccepts.map((s) => `${s.category}: ${s.text}`),
    )
    expect(falseAccepts.map((s) => s.text)).toEqual([])
  })

  test("نسب الخطأ حسب الفئة تُطبع للمراجعة", () => {
    const byCategory = new Map<string, { total: number; wrong: number }>()
    for (const s of [...accepts.map((x) => ({ ...x, want: true })), ...rejects.map((x) => ({ ...x, want: false }))]) {
      const row = byCategory.get(s.category) ?? { total: 0, wrong: 0 }
      row.total += 1
      if (s.accepted !== s.want) row.wrong += 1
      byCategory.set(s.category, row)
    }
    const report = [...byCategory.entries()].map(([cat, r]) => `${cat}: ${r.wrong}/${r.total}`)
    console.info("[language] error by category:", report.join(" | "))
    expect(byCategory.size).toBeGreaterThanOrEqual(8)
  })

  test("الحالة الغامضة تُعالج بالقرار الموثّق في AMBIGUOUS", () => {
    for (const { text, note } of AMBIGUOUS) {
      expect(note.length).toBeGreaterThan(0)
      // القرار الموثّق: تُقبل.
      expect(detectLanguage(text)).toBe("ar")
    }
  })

  test("رسالة الإشعار في الرد الفعلي عربية خالصة، بلا أي حرف لاتيني", () => {
    const result = runPipeline("What is the contract?", {})
    expect(result.mode).toBe("unsupported_language")
    expect(result.answer).toContain("العربية")
    expect(/\p{Script=Latin}/u.test(result.answer)).toBe(false)
  })
})

/**
 * عينة مستقلة كُتبت بعد ضبط القواميس، ولم تُستعمل في تعديلها. النتيجة عليها هي التقدير الأصدق،
 * وتُطبع أخطاؤها كما هي، ولا يُعدَّل القاموس لإخفائها (ذلك تلويث للعينة).
 */
const HELD_OUT_ACCEPT: Sample[] = [
  ..."ممكن تعطيني معلومات على الكليات في الرباط؟|شرح ليا الفرق بين الكراء والبيع|ash kayn f lmaktaba dyal lmawqe?|3afak 9olli chno howa lmo3jam|wach mumkin tcharli lmo3jam?|kifach nlqa lqanoun dyal lkhedma|ما معنى الكفالة en droit؟|شنو هي les conditions dyal lbail?|كيف أستخدم le site؟|الأرشيف بالفرنسية؟|ماذا يعني Article 1 من القانون؟|bghit n3ref chno howa lmawdou3".split("|").map((text) => ({ text, category: "heldout_accept" })),
]
const HELD_OUT_REJECT: Sample[] = [
  ..."Can I download the PDF files of the courses?|Where is the archive located on the website?|I need a lawyer for my divorce|Je voudrais savoir comment fonctionne le lexique|Peux-tu m'expliquer la prescription ?|Wie kann ich das Archiv finden?|Ciao, come stai?|Hola, ¿qué es la prescripción?|Привет, как дела?|おはようございます|Thanks, what's the difference between civil and criminal law?|Quel est le délai de prescription ? الفرق|Bonjour|ok thanks|mais pourquoi?".split("|").map((text) => ({ text, category: "heldout_reject" })),
]

const KNOWN_HELD_OUT_MISSES = [
  "3afak 9olli chno howa lmo3jam",
  "wach mumkin tcharli lmo3jam?",
  "bghit n3ref chno howa lmawdou3",
]

describe("عينة مستقلة (held-out): التقدير الصادق للدقة", () => {
  test("تُطبع النتائج كما هي دون تعديل القاموس", () => {
    const acc = classify(HELD_OUT_ACCEPT)
    const rej = classify(HELD_OUT_REJECT)
    const falseRejects = acc.filter((s) => !s.accepted).map((s) => s.text)
    const falseAccepts = rej.filter((s) => s.accepted).map((s) => s.text)
    console.info(`[language:held-out] false rejects: ${falseRejects.length}/${acc.length}`, falseRejects)
    console.info(`[language:held-out] false accepts: ${falseAccepts.length}/${rej.length}`, falseAccepts)
    // القبول الخاطئ للأجنبية هو الخطأ الأخطر (يفتح الباب لجواب غير مفهوم)، ويجب أن يبقى صفراً.
    expect(falseAccepts).toEqual([])
    // الرفض الخاطئ معروف: دارجة لاتينية فيها كلمات خارج القاموس (lmo3jam، lmawdou3).
    // تُثبَّت القائمة هنا كما هي، فإن تغيّرت يجب أن يكون التغيير مقصوداً ومذكوراً في التوثيق.
    expect([...falseRejects].sort()).toEqual([...KNOWN_HELD_OUT_MISSES].sort())
  })
})
