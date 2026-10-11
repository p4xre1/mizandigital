/*
 * scripts/add-law-lexicon-terms.mjs
 *
 * يضيف 45 مصطلحا قانونيا (36 قانون دستوري + 9 مدونة أسرة) إلى
 * src/data/lexicon.json، بإحالات حرفية إلى نصوص data/laws/*.articles.json —
 * نفس المصدر الذي تُبنى منه بنوك الأسئلة والمدخلات القانونية للمساعد.
 *
 * sكتيب idempotent: إن وُجد أي من المعرّفات في الملف لا يُعاد إضافته.
 * بعد التشغيل: pnpm lexicon:client (أو node scripts/generate-lexicon-client-data.mjs)
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lexiconSlugMap } from "../shared/seo/url-policy.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEX = join(ROOT, "src/data/lexicon.json");
const CONST_SRC = join(ROOT, "data/laws/constitution-2011.articles.json");
const FAM_JSON = join(ROOT, "data/laws/mudawana-70-03.articles.json");

const DOMAIN = "https://www.mizan.page";
const REVIEWED = "2026-10-11";
const SGG = "https://www.sgg.gov.ma";

const constitution = JSON.parse(await readFile(CONST_SRC, "utf8"));
const family = JSON.parse(await readFile(FAM_JSON, "utf8"));
const constMap = Object.fromEntries(constitution.articles.map((a) => [a.number, a.text]));
const famMap = Object.fromEntries(family.articles.map((a) => [a.number, a.text]));

/** مقتطف حرفي: أول جملة إن كانت قصيرة، وإلا أول ~220 حرفا عند حد كلمة. */
function excerpt(text, maxChars = 220) {
  const flat = String(text).replace(/\s+/g, " ").trim();
  const firstSentence = flat.split(/(?<=[.؟!؛])\s+/)[0];
  if (firstSentence.length <= maxChars) return firstSentence;
  const cut = flat.slice(0, maxChars);
  const sp = cut.lastIndexOf(" ");
  return `${cut.slice(0, sp > 100 ? sp : maxChars)}…`;
}

const CONSTITUTION = {
  code_ar: "الدستور المغربي",
  code_short: "دستور 2011",
  code_fr: "Constitution du Royaume du Maroc (2011)",
  map: constMap,
  label: "الفصل",
  short: "دستور 2011",
};

const FAMILY_CODE = {
  code_ar: "مدونة الأسرة (القانون 70.03)",
  code_short: "مدونة 70.03",
  code_fr: "Code de la famille marocain (loi n° 70.03)",
  map: famMap,
  label: "المادة",
  short: "مدونة 70.03",
};

/**
 * مواصفات المصطلحات الجديدة.
 * law: "const" | "fam" — articles: أرقام الفصول/المواد المُقتبسة منها حرفيا.
 */
const TERMS = [
  // ===================== 36 مصطلحا: قانون دستوري =====================
  { id: "monarchie-constitutionnelle", term_ar: "الملكية الدستورية", term_fr: "Monarchie constitutionnelle", category: "قانون دستوري", law: "const", articles: [1],
    definition: "نظام الحكم في المغرب: ملكية دستورية ديمقراطية برلمانية واجتماعية، يحدد الدستور سلطات الملك وقيودها.",
    related: ["parlement", "souverainete", "separation-pouvoirs"] },
  { id: "separation-pouvoirs-constitution", term_ar: "فصل السلط", term_fr: "Séparation des pouvoirs", category: "قانون دستوري", law: "const", articles: [1],
    definition: "الأساس الذي يقوم عليه النظام الدستوري المغربي: استقلال السلط التشريعية والتنفيذية والقضائية مع توازنها وتعاونها.",
    related: ["monarchie-constitutionnelle", "independance-judiciaire", "parlement"] },
  { id: "responsabilite-rendition-comptes", term_ar: "ربط المسؤولية بالمحاسبة", term_fr: "Responsabilité et reddition de comptes", category: "قانون دستوري", law: "const", articles: [1],
    definition: "مبدأ دستوري يجعل كل سلطة وكل سلطة عمومية مسؤولة عن ممارساتها ومحاسبة عنها أمام القانون.",
    related: ["monarchie-constitutionnelle", "separation-pouvoirs-constitution"] },
  { id: "souverainete-nation", term_ar: "السيادة الشعبية", term_fr: "Souveraineté nationale", category: "قانون دستوري", law: "const", articles: [2],
    definition: "السيادة للأمة، تمارسها مباشرة بالاستفتاء وبصفة غير مباشرة بواسطة ممثليها المنتخبين بالاقتراع الحر والنزيه.",
    related: ["souverainete", "referendum", "elections-libres-nizihates"] },
  { id: "langues-officielles", term_ar: "اللغات الرسمية", term_fr: "Langues officielles", category: "قانون دستوري", law: "const", articles: [5],
    definition: "العربية تظل اللغة الرسمية للدولة، والأمازيغية أصبحت كذلك؛ وتعمل الدولة على حماية اللغتين وتطويرهما.",
    related: ["droits-de-lhomme", "egalite-homme-femme"] },
  { id: "hierarchy-lois", term_ar: "التراتبية القانونية", term_fr: "Hiérarchie des normes", category: "قانون دستوري", law: "const", articles: [6],
    definition: "دستورية القواعد القانونية وتراتبيتها ووجوب نشرها مبادئ ملزمة؛ والقانون هو أسمى تعبير عن إرادة الأمة وليس له أثر رجعي.",
    related: ["loi-organique", "abrogation"] },
  { id: "opposition-parlementaire", term_ar: "المعارضة البرلمانية", term_fr: "Opposition parlementaire", category: "قانون دستوري", law: "const", articles: [10],
    definition: "مكانة دستورية تخولها حقوقا تؤهلها للقيام بمهامها في العمل البرلماني وفق ضوابط يحددها القانون التنظيمي.",
    related: ["parlement", "immunite-parlementaire"] },
  { id: "elections-libres-nizihates", term_ar: "الانتخابات الحرة والنزيهة", term_fr: "Élections libres et équitables", category: "قانون دستوري", law: "const", articles: [11],
    definition: "أساس مشروعية التمثيل الديمقراطي، والسلطات العمومية ملزمة بالحياد التام إزاء المترشحين.",
    related: ["souverainete-nation", "candidat", "electeur"] },
  { id: "societe-civile-dustur", term_ar: "المجتمع المدني", term_fr: "Société civile", category: "قانون دستوري", law: "const", articles: [12],
    definition: "تؤسس جمعيات المجتمع المدني والمنظمات غير الحكومية وتمارس أنشطتها بحرية في نطاق احترام الدستور والقانون.",
    related: ["liberte-publique", "liberte-reunion-greve"] },
  { id: "initiative-legislative-citoyenne", term_ar: "مبادرة المواطنين في التشريع", term_fr: "Initiative législative citoyenne", category: "قانون دستوري", law: "const", articles: [14],
    definition: "حق المواطنات والمواطنين في تقديم ملتمسات في مجال التشريع، ضمن شروط وكيفيات يحددها قانون تنظيمي.",
    related: ["parlement", "initiative-legislative-parlement"] },
  { id: "marocains-residant-etranger", term_ar: "المغاربة المقيمون في الخارج", term_fr: "Marocains résidant à l'étranger", category: "قانون دستوري", law: "const", articles: [17],
    definition: "يتمتعون بحقوق المواطنة كاملة، بما فيها حق التصويت والترشيح في الانتخابات، وتعمل الدولة على حماية حقوقهم ومصالحهم.",
    related: ["electeur", "droits-de-lhomme"] },
  { id: "egalite-homme-femme", term_ar: "المساواة بين الرجل والمرأة", term_fr: "Égalité entre l'homme et la femme", category: "قانون دستوري", law: "const", articles: [19],
    definition: "يتمتع الرجل والمرأة على قدم المساواة بالحقوق والحريات المدنية والسياسية والاقتصادية والاجتماعية والثقافية والبيئية، وتعمل الدولة على تمكين المرأة من الشروط اللازمة.",
    related: ["mariage", "droits-de-lhomme"] },
  { id: "droit-vie", term_ar: "الحق في الحياة", term_fr: "Droit à la vie", category: "قانون دستوري", law: "const", articles: [20],
    definition: "الحق في الحياة أول الحقوق لكل إنسان، ويحمي القانون هذا الحق.",
    related: ["droits-de-lhomme", "integrite-physique-morale"] },
  { id: "integrite-physique-morale", term_ar: "السلامة الجسدية والمعنوية", term_fr: "Intégrité physique et morale", category: "قانون دستوري", law: "const", articles: [22],
    definition: "لا يجوز المس بالسلامة الجسدية أو المعنوية لأي شخص في أي ظرف، ولا معاملته معاملة قاسية أو لائنية أو مهينة.",
    related: ["droit-vie", "droits-de-lhomme"] },
  { id: "protection-arrestation-arbitraire", term_ar: "الحماية من الاعتقال التعسفي", term_fr: "Protection contre l'arrestation arbitraire", category: "قانون دستوري", law: "const", articles: [23],
    definition: "لا يجوز إلقاء القبض على أي شخص أو اعتقاله أو متابعته أو إدانته إلا في الحالات وطبقا للإجراءات التي ينص عليها القانون.",
    related: ["detention-preventive", "proces-equitable"] },
  { id: "vie-privee-dustur", term_ar: "حماية الحياة الخاصة", term_fr: "Protection de la vie privée", category: "قانون دستوري", law: "const", articles: [24],
    definition: "لكل شخص الحق في حماية حياته الخاصة، ولا تنتهك حرمة المنزل، وتتمتع السرية والمراسلات بالحماية القانونية.",
    related: ["liberte-publique", "droit-information"] },
  { id: "liberte-expression", term_ar: "حرية التعبير", term_fr: "Liberté d'expression", category: "قانون دستوري", law: "const", articles: [25],
    definition: "حرية الفكر والرأي والتعبير مكفولة بكل أشكالها، مع ضمان حرية الإبداع والنشر والعرض في الأدب والفن والبحث العلمي.",
    related: ["liberte-presse-dustur", "liberte-publique"] },
  { id: "droit-information", term_ar: "الحق في الحصول على المعلومات", term_fr: "Droit à l'information", category: "قانون دستوري", law: "const", articles: [27],
    definition: "حق المواطنات والمواطنين في الحصول على المعلومات الموجودة في حوزة الإدارة العمومية والمؤسسات المنتخبة والهيئات المكلفة بمهام المرفق العام.",
    related: ["service-public", "liberte-expression"] },
  { id: "liberte-presse-dustur", term_ar: "حرية الصحافة", term_fr: "Liberté de la presse", category: "قانون دستوري", law: "const", articles: [28],
    definition: "مضمونة ولا يمكن تقييدها بأي شكل من أشكال الرقابة القبلية، وللجميع حق التعبير ونشر الأخبار بكل حرية.",
    related: ["liberte-expression", "droit-information"] },
  { id: "liberte-reunion-greve", term_ar: "حرية التجمع وحق الإضراب", term_fr: "Liberté de réunion et de grève", category: "قانون دستوري", law: "const", articles: [29],
    definition: "حريات الاجتماع والتجمهر والتظاهر السلمي وتأسيس الجمعيات والانتماء النقابي والسياسي مضمونة، وحق الإضراب مضمون.",
    related: ["greve", "syndicat", "liberte-publique"] },
  { id: "suffrage-dustur", term_ar: "حق التصويت والترشح", term_fr: "Droit de vote et de candidature", category: "قانون دستوري", law: "const", articles: [30],
    definition: "لكل مواطنة ومواطن الحق في التصويت والترشح للانتخابات عند بلوغ سن الرشد القانونية والتمتع بالحقوق المدنية والسياسية.",
    related: ["electeur", "candidat", "elections-libres-nizihates"] },
  { id: "famille-cellule-base", term_ar: "الأسرة الخلية الأساسية للمجتمع", term_fr: "Famille, cellule de base de la société", category: "قانون دستوري", law: "const", articles: [32],
    definition: "الأسرة القائمة على علاقة الزواج الشرعي هي الخلية الأساسية للمجتمع، وتعمل الدولة على ضمان حمايتها الحقوقية والاجتماعية والثقافية.",
    related: ["mariage", "san-ahliyya-zawaj"] },
  { id: "droit-propriete-dustur", term_ar: "حق الملكية", term_fr: "Droit de propriété", category: "قانون دستوري", law: "const", articles: [35],
    definition: "يضمنه القانون، ويمكن الحد من نطاقه وممارسته بموجب القانون لمتطلبات التنمية، ولا نزع للملكية إلا لمقتضى المنفعة العامة مع تعويض عادل ومنصف.",
    related: ["droit-reel", "expropriation"] },
  { id: "roi-chef-etat", term_ar: "الملك رئيس الدولة", term_fr: "Roi, chef de l'État", category: "قانون دستوري", law: "const", articles: [42],
    definition: "الملك رئيس الدولة وممثلها الأسمى، ورمز وحدة الأمة، وضامن دوام الدولة واستمرارها، والحكم الأسمى بين مؤسساتها.",
    related: ["monarchie-constitutionnelle", "separation-pouvoirs-constitution"] },
  { id: "nomination-chef-gouvernement", term_ar: "تعيين رئيس الحكومة", term_fr: "Nomination du chef du gouvernement", category: "قانون دستوري", law: "const", articles: [47],
    definition: "يعين الملك رئيس الحكومة من الحزب السياسي الذي تصدر انتخابات أعضاء مجلس النواب وعلى أساس نتائجها، ويعين أعضاء الحكومة باقتراح منه.",
    related: ["roi-chef-etat", "vote-confiance"] },
  { id: "dissolution-parlement", term_ar: "حل البرلمان", term_fr: "Dissolution du Parlement", category: "قانون دستوري", law: "const", articles: [51],
    definition: "حق الملك في حل مجلسي البرلمان أو أحدهما بظهير، طبق الشروط والمقتضيات المحددة في فصول الدستور.",
    related: ["parlement", "roi-chef-etat"] },
  { id: "parlement-bicameral", term_ar: "البرلمان ثنائي المجلسين", term_fr: "Parlement bicaméral", category: "قانون دستوري", law: "const", articles: [60],
    definition: "يتكون البرلمان من مجلسي مجلس النواب ومجلس المستشارين، ويستمد أعضاؤه نيابتهم من الأمة، وحقهم في التصويت حق شخصي لا يمكن إقصاؤهم منه إلا بالشروط المحددة.",
    related: ["parlement", "opposition-parlementaire"] },
  { id: "domaine-loi-dustur", term_ar: "اختصاص القانون بالتشريع", term_fr: "Domaine de la loi", category: "قانون دستوري", law: "const", articles: [71],
    definition: "يختص القانون بالتشريع في ميادين محددة، منها الحقوق والحريات الأساسية والوضعيات والحريات العامة والمواطنة والتشريع التنظيمي.",
    related: ["loi-organique", "hierarchy-lois"] },
  { id: "loi-finances", term_ar: "قانون المالية", term_fr: "Loi de finances", category: "قانون دستوري", law: "const", articles: [75],
    definition: "قانون يودع بالأولوية لدى مجلس النواب ويصوت عليه البرلمان طبق الشروط والأجل المحددين في الدستور، ويرافقه مشروع الميزانية الفرعية للحزب.",
    related: ["parlement", "loi-organique"] },
  { id: "initiative-legislative-parlement", term_ar: "حق التقدم باقتراح القوانين", term_fr: "Droit d'initiative législative", category: "قانون دستوري", law: "const", articles: [78],
    definition: "لرئيس الحكومة ولأعضاء البرلمان على السواء حق التقدم باقتراح القوانين، وتودع مشاريع القوانين بالأولوية لدى الحكومة.",
    related: ["parlement", "initiative-legislative-citoyenne"] },
  { id: "vote-confiance", term_ar: "التصويت على الثقة", term_fr: "Vote de confiance", category: "قانون دستوري", law: "const", articles: [103],
    definition: "حق رئيس الحكومة في ربط مواصلة الحكومة تحمل مسؤوليتها بتصويت يمنح الثقة لدى مجلس النواب، بشأن تصريح عن السياسة العامة أو نص معروض.",
    related: ["motion-censure", "nomination-chef-gouvernement"] },
  { id: "motion-censure-dustur", term_ar: "ملتمس الرقابة", term_fr: "Motion de censure", category: "قانون دستوري", law: "const", articles: [105],
    definition: "أداة مجلس النواب لمعارضة مواصلة الحكومة تحمل مسؤوليتها؛ لا يقبل إلا بتوقيع خُمس الأعضاء ولا يصوت إلا بعد ثلاثة أيام من إيداعه.",
    related: ["motion-censure", "vote-confiance"] },
  { id: "independance-judiciaire", term_ar: "استقلال السلطة القضائية", term_fr: "Indépendance du pouvoir judiciaire", category: "قانون دستوري", law: "const", articles: [107],
    definition: "السلطة القضائية مستقلة عن السلطة التشريعية وعن السلطة التنفيذية، والملك هو الضامن لاستقلالها.",
    related: ["separation-pouvoirs-constitution", "juridiction"] },
  { id: "presomption-innocence", term_ar: "مبدأ البراءة", term_fr: "Présomption d'innocence", category: "قانون دستوري", law: "const", articles: [119],
    definition: "يُعتبر كل مشتبه فيه أو متهم بارتكاب جريمة بريئا إلى أن تثبت إدانته بمقرر قضائي مكتسب لقوة الشيء المقضي به.",
    related: ["prevenu", "proces-equitable"] },
  { id: "proces-equitable", term_ar: "الحق في المحاكمة العادلة", term_fr: "Droit à un procès équitable", category: "قانون دستوري", law: "const", articles: [120],
    definition: "لكل شخص الحق في محاكمة عادلة وفي حكم يصدر داخل أجل معقول، وحقوق الدفاع مضمونة أمام جميع المحاكم.",
    related: ["presomption-innocence", "protection-arrestation-arbitraire"] },
  { id: "controle-constitutionnalite", term_ar: "الرقابة على دستورية القوانين", term_fr: "Contrôle de constitutionnalité", category: "قانون دستوري", law: "const", articles: [131, 132, 133],
    definition: "اختصاص المحكمة الدستورية في مطابقة النصوص لأحكام الدستور، والبت في الدفوع المتعلقة بعدم دستورية قانون أثير أثناء النظر في قضية.",
    related: ["cour-constitutionnelle", "hierarchy-lois", "loi-organique"] },

  // ===================== 9 مصطلحات: مدونة الأسرة =====================
  { id: "san-ahliyya-zawaj", term_ar: "سن الأهلية للزواج", term_fr: "Âge de capacité matrimoniale", category: "مدونة الأسرة", law: "fam", articles: [19, 20],
    definition: "تكتمل أهلية الزواج بإتمام الفتى والفتاة ثمان عشرة سنة شمسية كاملة، مع إمكانية الإذن بزواج من دونها بمقرر معلل يبين المصلحة والأسباب المبررة.",
    related: ["mariage", "wilaya"] },
  { id: "zawaj-tafwid", term_ar: "زواج التفويض", term_fr: "Mariage par délégation (tafwid)", category: "مدونة الأسرة", law: "fam", articles: [25, 27],
    definition: "عقد زواج يتفوض فيه الطرفان للقاضي تحديد الصداق؛ إن لم يتراضيا بعد البناء على قدره، فله أن يحدده في حدود المعقول.",
    related: ["sadaq", "mariage"] },
  { id: "wikalaya-zawaj", term_ar: "التوكيل في عقد الزواج", term_fr: "Procuration au mariage (wikala)", category: "مدونة الأسرة", law: "fam", articles: [17],
    definition: "يجوز التوكيل على إبرام عقد الزواج بإذن من قاضي الأسرة المكلف بالزواج وفق شروط خاصة، منها وجود ظروف لا يتأتى معها حضور الطرفين.",
    related: ["mariage", "san-ahliyya-zawaj"] },
  { id: "tatliq", term_ar: "التطليق", term_fr: "Tatliq (divorce judiciaire)", category: "مدونة الأسرة", law: "fam", articles: [94],
    definition: "الطلاق القضائي بطلب أحد الزوجين، أهمه تطليق الزوجة على زوجها بسبب الشقاق أو إخلال الزوج بالتزامات الزوجية، بعد محاولة إصلاح ذات البين.",
    related: ["chiqaq", "mut-a-zawj", "divorce"] },
  { id: "mut-a-zawj", term_ar: "المتعة", term_fr: "Mut'a (indemnité conjugale)", category: "مدونة الأسرة", law: "fam", articles: [84],
    definition: "مبلغ من مستحقات الزوجة عند الطلاق، يراعى في تقديره فترة الزواج والوضعية المالية للزوج وأسباب الطلاق ومدى تعسف الزوج في توقيعه.",
    related: ["tatliq", "sadaq", "pension-alimentaire"] },
  { id: "tadabir-mu-aqqata", term_ar: "التدابير المؤقتة في نزاع الزوجين", term_fr: "Mesures provisoires (litige conjugal)", category: "مدونة الأسرة", law: "fam", articles: [121],
    definition: "إجراءات تأمر بها المحكمة تلقائيا أو بطلب عند تعذر المساكنة بين الزوجين، منها اختيار سكن وتأمين نفقة، تنفذ فورا في انتظار الحكم.",
    related: ["tatliq", "pension-alimentaire"] },
  { id: "istilhaq", term_ar: "الاستلحاق", term_fr: "Istilhaq (reconnaissance)", category: "مدونة الأسرة", law: "fam", articles: [160],
    definition: "إقرار الأب ببنوة ولد مجهول النسب بشروط محددة؛ يثبت به النسب وتترتب عنه آثار البنوة الشرعية في حدود الشروط المقررة.",
    related: ["filiation", "wali"] },
  { id: "wasiyya-wajiba", term_ar: "الوصية الواجبة", term_fr: "Héritage obligatoire (wasiyya wajiba)", category: "مدونة الأسرة", law: "fam", articles: [369, 370],
    definition: "حصة جبرية لأحفاد ابن أو بنت ماتا قبل أصلهما، بمقدار ما كان يورثه أبوهم أو أمهم، في حدود ثلث التركة.",
    related: ["succession", "testament"] },
  { id: "ta-sib", term_ar: "التعصيب", term_fr: "T'a'sib (succession aux résidus)", category: "مدونة الأسرة", law: "fam", articles: [348],
    definition: "طريق من طرق الإرث يأخذ به الوارث جميع التركة أو ما بقي منها بعد ذوي الفروض؛ العصبة ثلاثة أنواع: بالنفس وبالغير ومع الغير.",
    related: ["succession", "wasiyya-wajiba"] },
];

const terms = JSON.parse(await readFile(LEX, "utf8"));
const existingIds = new Set(terms.map((t) => t.id));
const termArById = new Map(terms.map((t) => [t.id, t.term_ar]));

// تحقق: معرّفات المصطلحات المرتبطة يجب أن توجد (موجودة أصلا أو ضمن هذه الدفعة)
const allAfter = new Set([...existingIds, ...TERMS.map((t) => t.id)]);
for (const s of TERMS) {
  for (const r of s.related) {
    if (!allAfter.has(r)) throw new Error(`مصطلح مرتبط مفقود: ${r} (لدى ${s.id})`);
  }
}

function buildSource(lawKey, articleNumbers) {
  const law = lawKey === "const" ? CONSTITUTION : FAMILY_CODE;
  const articles = articleNumbers.map((n) => {
    const text = law.map[n];
    if (!text) throw new Error(`نص مفقود: ${law.short} ${law.label} ${n}`);
    return {
      number: String(n),
      phrase: `${law.short}، ${law.label} ${n}`,
      article_number: String(n),
      quotation: excerpt(text),
      quotation_type: "excerpt",
    };
  });
  return {
    code_ar: law.code_ar,
    code_short: law.code_short,
    code_fr: law.code_fr,
    articles,
    source_url: SGG,
    last_verified: REVIEWED,
  };
}

for (const s of TERMS) termArById.set(s.id, s.term_ar);

const newEntries = TERMS.map((s) => {
  const compareId = s.related.find((r) => r !== s.id);
  const compareTerm = compareId ? (termArById.get(compareId) ?? compareId) : s.term_ar;
  const frDef = `« ${s.term_fr} » : notion de droit marocain en ${s.category === "قانون دستوري" ? "droit constitutionnel" : "droit de la famille"}, définie dans la fiche arabe de Mizan.`;
  return {
    id: s.id,
    term_ar: s.term_ar,
    term_fr: s.term_fr,
    definition: s.definition,
    category: s.category,
    legal_sources: [buildSource(s.law, s.articles)],
    canonical_url: "", // يُملأ بعد حساب slugs القائمة الكاملة
    last_reviewed: REVIEWED,
    review_status: "internal_review",
    enrichment_source: "auto",
    simple_explanation: `بعبارة بسيطة: ${s.definition}`,
    simple_explanation_fr: frDef,
    examples: [
      `عند مراجعة «${s.term_ar}» تُقرأ الإحالة الواردة في البيانات من ${s.law === "const" ? "دستور 2011" : "مدونة الأسرة"}.`,
      `تمرين: قارن بين «${s.term_ar}» و«${compareTerm}» مع بيان الأثر العملي لكل منهما في فرضية واقعية.`,
      `في امتحان ${s.category}: أعد صياغة تعريف «${s.term_ar}» في جملة واحدة قبل حفظه.`,
    ],
    examples_fr: [
      `Pour « ${s.term_fr} », vérifier l'article cité dans la fiche.`,
      `Exercice : distinguer « ${s.term_fr} » et en tirer la conséquence pratique.`,
    ],
    exam_keywords: [
      `تعريف ${s.term_ar}`,
      `${s.term_ar} في القانون المغربي`,
      s.term_fr,
      `${s.term_ar} ${s.category}`,
      `أمثلة عن ${s.term_ar}`,
      s.law === "const" ? `${s.term_ar} دستور 2011` : `${s.term_ar} مدونة الأسرة`,
    ].slice(0, 6),
    related_terms: s.related,
  };
});

// حساب slugs للقائمة الكاملة (250 + الجديدة) بنفس خوارزمية prerender
const builtById = new Map(newEntries.map((e) => [e.id, e]));
// السكربت idempotent: المواصفات الموجودة تُعاد بنائها في مكانها (بنفس الترتيب)،
// والمواصفات الجديدة تُضاف في النهاية.
const out = terms.map((t) => builtById.get(t.id) ?? t);
for (const s of TERMS) {
  if (!existingIds.has(s.id)) out.push(builtById.get(s.id));
}
const slugs = lexiconSlugMap(out);
// نكتب canonical_url للمواصفات فقط؛ الروابط القائمة لا تُمسّ.
for (const e of out) {
  if (builtById.has(e.id)) e.canonical_url = `${DOMAIN}/lexicon/${slugs.get(e.id)}`;
}

await writeFile(LEX, `${JSON.stringify(out, null, 2)}\n`, "utf8");
const added = TERMS.length - newEntries.filter((e) => existingIds.has(e.id)).length;
console.log(`✓ ${added > 0 ? `أُضيف ${added} مصطلحا جديدا` : "عُادت بناء المواصفات الأربع والخمسين"} إلى lexicon.json — المجموع: ${out.length}.`);
console.log("  شغّل: node scripts/generate-lexicon-client-data.mjs");
