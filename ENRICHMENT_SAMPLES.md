# عيّنة الإثراء — خمس كلمات مفتاحية من `src/data/lexicon.json`

الملف مُولَّد من `scripts/enrich-lexicon.mjs` (نفس السجلات كما هي في البيانات، حرفياً
بما فيها `enrichment_source: "editorial"`)، للغرض الذي طلبه اتفاق السيو: نموذج يُقاس عليه
ما أُضيف إلى الـ 245 بطاقة الباقية. لا يُقرأ في البناء ولا يُستورد في الواجهة — ورقة مراجعة
للمحرّر؛ المصدر الوحيد للحقيقة يبقى `src/data/lexicon.json`.

| السجل | `review_status` | لماذا |
|---|---|---|
| `prescription` (التقادم) | `published` | نصّه القانوني محقَّق حرفياً من DOC وفق `LEGAL_SOURCES_GUIDE.md` (الدفعة الثانية) |
| `obligation` (الالتزام) | `published` | نصّه القانوني محقَّق حرفياً من DOC وفق `LEGAL_SOURCES_GUIDE.md` (الدفعة الثانية) |
| `vente` (البيع) | `internal_review` | لا `legal_sources` في بياناته: شرح وأمثلة بلا أرقام فصول، والوصم `internal_review` يمنع نشره كنصّ معتمد |
| `erreur` (الغلط) | `published` | نصّه القانوني محقَّق حرفياً من DOC وفق `LEGAL_SOURCES_GUIDE.md` (الدفعة الثانية) |
| `nantissement` (الرهن الحيازي (Nantissement)) | `internal_review` | لا `legal_sources` في بياناته: شرح وأمثلة بلا أرقام فصول، والوصم `internal_review` يمنع نشره كنصّ معتمد |

## `prescription` — التقادم

```json
{
  "id": "prescription",
  "term_ar": "التقادم",
  "term_fr": "Prescription",
  "definition": "مرور الزمن الذي يترتب عليه سقوط الحق أو الدعوى أو العقوبة.",
  "category": "قانون مدني",
  "legal_sources": [
    {
      "code_ar": "قانون الالتزامات والعقود",
      "code_short": "ق.ل.ع",
      "code_fr": "Code des obligations et des contrats (Dahir 12 août 1913)",
      "articles": [
        {
          "number": "371",
          "phrase": "التقادم خلال المدة التي يحددها القانون يسقط الدعوى الناشئة عن الالتزام.",
          "article_number": "371",
          "quotation": "التقادم خلال المدة التي يحددها القانون يسقط الدعوى الناشئة عن الالتزام.",
          "quotation_type": "exact"
        },
        {
          "number": "372",
          "phrase": "التقادم لا يسقط الدعوى بقوة القانون، بل لا بد لمن له مصلحة فيه أن يحتج به. وليس للقاضي أن يستند إلى التقادم من تلقاء نفسه.",
          "article_number": "372",
          "quotation": "التقادم لا يسقط الدعوى بقوة القانون، بل لا بد لمن له مصلحة فيه أن يحتج به. وليس للقاضي أن يستند إلى التقادم من تلقاء نفسه.",
          "quotation_type": "exact"
        },
        {
          "number": "373",
          "phrase": "لا يسوغ التنازل مقدما عن التقادم، ولكن يسوغ التنازل عنه بعد حصوله.",
          "article_number": "373",
          "quotation": "لا يسوغ التنازل مقدما عن التقادم، ولكن يسوغ التنازل عنه بعد حصوله.",
          "quotation_type": "exact"
        },
        {
          "number": "374",
          "phrase": "يسوغ للدائن ولكل شخص آخر له مصلحة في التمسك بالتقادم، كالكفيل، أن يتمسك به ولو تنازل عنه المدين الأصلي.",
          "article_number": "374",
          "quotation": "يسوغ للدائن ولكل شخص آخر له مصلحة في التمسك بالتقادم، كالكفيل، أن يتمسك به ولو تنازل عنه المدين الأصلي.",
          "quotation_type": "exact"
        },
        {
          "number": "375",
          "phrase": "لا يسوغ للمتعاقدين، بمقتضى اتفاقات خاصة، تمديد أجل التقادم إلى أكثر من الخمس عشرة سنة التي يحددها القانون.",
          "article_number": "375",
          "quotation": "لا يسوغ للمتعاقدين، بمقتضى اتفاقات خاصة، تمديد أجل التقادم إلى أكثر من الخمس عشرة سنة التي يحددها القانون.",
          "quotation_type": "exact"
        },
        {
          "number": "376",
          "phrase": "التقادم يسقط الدعاوى المتعلقة بالالتزامات التبعية في نفس الوقت الذي يسقط فيه الدعوى المتعلقة بالالتزام الأصلي، ولو كان الزمن المحدد لتقادم الالتزامات التبعية لم ينقض بعد.",
          "article_number": "376",
          "quotation": "التقادم يسقط الدعاوى المتعلقة بالالتزامات التبعية في نفس الوقت الذي يسقط فيه الدعوى المتعلقة بالالتزام الأصلي، ولو كان الزمن المحدد لتقادم الالتزامات التبعية لم ينقض بعد.",
          "quotation_type": "exact"
        },
        {
          "number": "377",
          "phrase": "لا محل للتقادم إذا كان الالتزام مضمونا برهن حيازي أو برهن بدون حيازة أو برهن رسمي.",
          "article_number": "377",
          "quotation": "لا محل للتقادم إذا كان الالتزام مضمونا برهن حيازي أو برهن بدون حيازة أو برهن رسمي.",
          "quotation_type": "exact"
        },
        {
          "number": "378",
          "phrase": "لا محل لأي تقادم بين الأزواج خلال مدة الزواج، وبين الأب أو الأم وأولادهما، وبين ناقص الأهلية أو المحجوز عليه والوصي أو المقدم أو المدير ما دامت ولايتهم قائمة ولم يقدموا حساباتهم النهائية.",
          "article_number": "378",
          "quotation": "لا محل لأي تقادم بين الأزواج خلال مدة الزواج، وبين الأب أو الأم وأولادهما، وبين ناقص الأهلية أو المحجوز عليه والوصي أو المقدم أو المدير ما دامت ولايتهم قائمة ولم يقدموا حساباتهم النهائية.",
          "quotation_type": "exact"
        },
        {
          "number": "379",
          "phrase": "لا يسري التقادم ضد القاصرين غير المرشدين وناقصي الأهلية الآخرين إذا لم يكن لهم وصي أو مساعد قضائي أو مقدم، وذلك إلى ما بعد بلوغهم سن الرشد أو ترشيدهم أو تعيين نائب قانوني لهم.",
          "article_number": "379",
          "quotation": "لا يسري التقادم ضد القاصرين غير المرشدين وناقصي الأهلية الآخرين إذا لم يكن لهم وصي أو مساعد قضائي أو مقدم، وذلك إلى ما بعد بلوغهم سن الرشد أو ترشيدهم أو تعيين نائب قانوني لهم.",
          "quotation_type": "exact"
        },
        {
          "number": "380",
          "phrase": "لا يسري التقادم بالنسبة للحقوق إلا من يوم اكتسابها، فلا يكون له محل بالنسبة إلى الحقوق المعلقة على شرط حتى يتحقق الشرط، ولا ضد الغائبين إلى أن يثبت غيابهم ويعين نائب قانوني عنهم.",
          "article_number": "380",
          "quotation": "لا يسري التقادم بالنسبة للحقوق إلا من يوم اكتسابها، فلا يكون له محل بالنسبة إلى الحقوق المعلقة على شرط حتى يتحقق الشرط، ولا ضد الغائبين إلى أن يثبت غيابهم ويعين نائب قانوني عنهم.",
          "quotation_type": "exact"
        },
        {
          "number": "381",
          "phrase": "ينقطع التقادم بكل مطالبة قضائية أو غير قضائية يكون لها تاريخ ثابت ومن شأنها أن تجعل المدين في حالة مطل لتنفيذ التزامه، وبطلب قبول الدين في تفليسة المدين، وبكل إجراء تحفظي أو تنفيذي يباشر على أموال المدين.",
          "article_number": "381",
          "quotation": "ينقطع التقادم بكل مطالبة قضائية أو غير قضائية يكون لها تاريخ ثابت ومن شأنها أن تجعل المدين في حالة مطل لتنفيذ التزامه، وبطلب قبول الدين في تفليسة المدين، وبكل إجراء تحفظي أو تنفيذي يباشر على أموال المدين.",
          "quotation_type": "exact"
        },
        {
          "number": "382",
          "phrase": "ينقطع التقادم أيضا بكل أمر يعترف المدين بمقتضاه بحق من بدأ التقادم يسري ضده، كما إذا جرى حساب عن الدين أو أدى المدين قسطا منه أو طلب أجلا للوفاء أو قدم كفيلا أو أي ضمان آخر.",
          "article_number": "382",
          "quotation": "ينقطع التقادم أيضا بكل أمر يعترف المدين بمقتضاه بحق من بدأ التقادم يسري ضده، كما إذا جرى حساب عن الدين أو أدى المدين قسطا منه أو طلب أجلا للوفاء أو قدم كفيلا أو أي ضمان آخر.",
          "quotation_type": "exact"
        },
        {
          "number": "383",
          "phrase": "إذا انقطع التقادم بوجه صحيح، لا يحسب في مدة التقادم الزمن السابق لحصول ما أدى إلى انقطاعه، وتبدأ مدة جديدة للتقادم من وقت انتهاء الأثر المترتب على سبب الانقطاع.",
          "article_number": "383",
          "quotation": "إذا انقطع التقادم بوجه صحيح، لا يحسب في مدة التقادم الزمن السابق لحصول ما أدى إلى انقطاعه، وتبدأ مدة جديدة للتقادم من وقت انتهاء الأثر المترتب على سبب الانقطاع.",
          "quotation_type": "exact"
        },
        {
          "number": "387",
          "phrase": "كل الدعاوى الناشئة عن الالتزام تتقادم بخمس عشرة سنة، فيما عدا الاستثناءات الواردة فيما بعد، والاستثناءات التي يقضي بها القانون في حالات خاصة.",
          "article_number": "387",
          "quotation": "كل الدعاوى الناشئة عن الالتزام تتقادم بخمس عشرة سنة، فيما عدا الاستثناءات الواردة فيما بعد، والاستثناءات التي يقضي بها القانون في حالات خاصة.",
          "quotation_type": "exact"
        },
        {
          "number": "388",
          "phrase": "تتقادم بخمس سنوات دعوى التجار والموردين وأرباب المصانع بسبب التوريدات التي يقدمونها لغيرهم من التجار من أجل حاجات مهنهم. وتتقادم بسنتين دعوى الأطباء والجراحين وأطباء الأسنان والصيادلة من أجل أتعابهم وتوريداتهم.",
          "article_number": "388",
          "quotation": "تتقادم بخمس سنوات دعوى التجار والموردين وأرباب المصانع بسبب التوريدات التي يقدمونها لغيرهم من التجار من أجل حاجات مهنهم. وتتقادم بسنتين دعوى الأطباء والجراحين وأطباء الأسنان والصيادلة من أجل أتعابهم وتوريداتهم.",
          "quotation_type": "exact"
        }
      ],
      "source_url": "https://adala.justice.gov.ma",
      "last_verified": "2026-09-20"
    }
  ],
  "canonical_url": "https://www.mizan.page/lexicon/التقادم",
  "last_reviewed": "2026-09-20",
  "review_status": "published",
  "enrichment_source": "editorial",
  "simple_explanation": "بعبارة بسيطة: إذا تأخرت في المطالبة بحقك المدة التي حدّدها القانون، يسقط حقك في رفع الدعوى. الحق نفسه لا يزول، لكن الحماية القضائية له تنتهي.",
  "simple_explanation_fr": "En termes simples : si vous n'agissez pas dans le délai fixé par la loi, votre action se prescrit. Le droit ne disparaît pas, mais il cesse d'être protégé en justice.",
  "examples": [
    "الدعوى الناشئة عن الالتزام تسقط بالتقادم بمضي المدة التي يحددها القانون (الفصل 371 من ق.ل.ع).",
    "المحكمة لا تطبّق التقادم من تلقاء نفسها: على المدين أن يتمسّك به صراحة في جوابه (الفصل 372).",
    "لا يجوز التنازل عن التقادم قبل اكتماله، أما بعد اكتماله فيجوز (الفصل 373)."
  ],
  "examples_fr": [
    "L'action née d'une obligation s'éteint par la prescription au délai fixé par la loi (art. 371 DOC).",
    "Le juge ne peut soulever la prescription d'office : le débiteur doit l'invoquer expressément (art. 372).",
    "On ne peut renoncer à la prescription par avance, mais on le peut une fois le délai accompli (art. 373)."
  ],
  "exam_keywords": [
    "آجال التقادم",
    "سقوط الدعوى",
    "انقطاع التقادم",
    "التقادم المسقط",
    "التنازل عن التقادم",
    "التقادم في القانون المغربي"
  ],
  "related_terms": [
    "obligation",
    "preuve",
    "execution",
    "possession",
    "remise-de-dette"
  ]
}
```

## `obligation` — الالتزام

```json
{
  "id": "obligation",
  "term_ar": "الالتزام",
  "term_fr": "Obligation",
  "definition": "رابطة قانونية تفرض على المدين أداء عمل أو الامتناع عنه لفائدة الدائن.",
  "category": "قانون مدني",
  "legal_sources": [
    {
      "code_ar": "قانون الالتزامات والعقود",
      "code_short": "ق.ل.ع",
      "code_fr": "Code des obligations et des contrats (Dahir 12 août 1913)",
      "articles": [
        {
          "number": "1",
          "phrase": "تنشأ الالتزامات عن الاتفاقات والتصريحات الأخرى المعبرة عن الإرادة، وعن أشباه العقود، وعن الجرائم وعن أشباه الجرائم.",
          "article_number": "1",
          "quotation": "تنشأ الالتزامات عن الاتفاقات والتصريحات الأخرى المعبرة عن الإرادة، وعن أشباه العقود، وعن الجرائم وعن أشباه الجرائم.",
          "quotation_type": "exact"
        },
        {
          "number": "2",
          "phrase": "الأركان اللازمة لصحة الالتزامات الناشئة عن التعبير عن الإرادة هي: الأهلية للالتزام؛ تعبير صحيح عن الإرادة يقع على العناصر الأساسية للالتزام؛ شيء محقق يصلح أن يكون محلا للالتزام؛ سبب مشروع للالتزام.",
          "article_number": "2",
          "quotation": "الأركان اللازمة لصحة الالتزامات الناشئة عن التعبير عن الإرادة هي: الأهلية للالتزام؛ تعبير صحيح عن الإرادة يقع على العناصر الأساسية للالتزام؛ شيء محقق يصلح أن يكون محلا للالتزام؛ سبب مشروع للالتزام.",
          "quotation_type": "exact"
        },
        {
          "number": "228",
          "phrase": "الالتزامات لا تلزم إلا من كان طرفا في العقد، فهي لا تضر الغير ولا تنفعهم إلا في الحالات المذكورة في القانون.",
          "article_number": "228",
          "quotation": "الالتزامات لا تلزم إلا من كان طرفا في العقد، فهي لا تضر الغير ولا تنفعهم إلا في الحالات المذكورة في القانون.",
          "quotation_type": "exact"
        },
        {
          "number": "230",
          "phrase": "الالتزامات التعاقدية المنشأة على وجه صحيح تقوم مقام القانون بالنسبة إلى منشئيها، ولا يجوز إلغاؤها إلا برضاهما معا أو في الحالات المنصوص عليها في القانون.",
          "article_number": "230",
          "quotation": "الالتزامات التعاقدية المنشأة على وجه صحيح تقوم مقام القانون بالنسبة إلى منشئيها، ولا يجوز إلغاؤها إلا برضاهما معا أو في الحالات المنصوص عليها في القانون.",
          "quotation_type": "exact"
        },
        {
          "number": "231",
          "phrase": "كل تعهد يجب تنفيذه بحسن نية. وهو لا يلزم بما وقع التصريح به فحسب، بل أيضا بكل ملحقات الالتزام التي يقررها القانون أو العرف أو الإنصاف.",
          "article_number": "231",
          "quotation": "كل تعهد يجب تنفيذه بحسن نية. وهو لا يلزم بما وقع التصريح به فحسب، بل أيضا بكل ملحقات الالتزام التي يقررها القانون أو العرف أو الإنصاف.",
          "quotation_type": "exact"
        },
        {
          "number": "306",
          "phrase": "الالتزام الباطل بقوة القانون لا يمكن أن ينتج أي أثر، إلا استرداد ما دفع بغير حق تنفيذا له. ويكون الالتزام باطلا بقوة القانون إذا كان ينقصه أحد الأركان اللازمة لقيامه، أو إذا قرر القانون في حالة خاصة بطلانه.",
          "article_number": "306",
          "quotation": "الالتزام الباطل بقوة القانون لا يمكن أن ينتج أي أثر، إلا استرداد ما دفع بغير حق تنفيذا له. ويكون الالتزام باطلا بقوة القانون إذا كان ينقصه أحد الأركان اللازمة لقيامه، أو إذا قرر القانون في حالة خاصة بطلانه.",
          "quotation_type": "exact"
        },
        {
          "number": "371",
          "phrase": "التقادم خلال المدة التي يحددها القانون يسقط الدعوى الناشئة عن الالتزام.",
          "article_number": "371",
          "quotation": "التقادم خلال المدة التي يحددها القانون يسقط الدعوى الناشئة عن الالتزام.",
          "quotation_type": "exact"
        },
        {
          "number": "387",
          "phrase": "كل الدعاوى الناشئة عن الالتزام تتقادم بخمس عشرة سنة، فيما عدا الاستثناءات الواردة فيما بعد، والاستثناءات التي يقضي بها القانون في حالات خاصة.",
          "article_number": "387",
          "quotation": "كل الدعاوى الناشئة عن الالتزام تتقادم بخمس عشرة سنة، فيما عدا الاستثناءات الواردة فيما بعد، والاستثناءات التي يقضي بها القانون في حالات خاصة.",
          "quotation_type": "exact"
        },
        {
          "number": "399",
          "phrase": "إثبات الالتزام على مدعيه.",
          "article_number": "399",
          "quotation": "إثبات الالتزام على مدعيه.",
          "quotation_type": "exact"
        },
        {
          "number": "404",
          "phrase": "وسائل الإثبات التي يقررها القانون هي: إقرار الخصم؛ الحجة الكتابية؛ شهادة الشهود؛ القرينة؛ اليمين والنكول عنها.",
          "article_number": "404",
          "quotation": "وسائل الإثبات التي يقررها القانون هي: إقرار الخصم؛ الحجة الكتابية؛ شهادة الشهود؛ القرينة؛ اليمين والنكول عنها.",
          "quotation_type": "exact"
        }
      ],
      "source_url": "https://adala.justice.gov.ma",
      "last_verified": "2026-09-20"
    }
  ],
  "canonical_url": "https://www.mizan.page/lexicon/الالتزام",
  "last_reviewed": "2026-09-20",
  "review_status": "published",
  "enrichment_source": "editorial",
  "simple_explanation": "بعبارة بسيطة: رابطة قانون بين شخصين، يلتزم أحدهما وهو المدين تجاه الآخر وهو الدائن بأداء شيء ما: دفع مبلغ، أو تسليم شيء، أو القيام بعمل، أو الامتناع عنه.",
  "simple_explanation_fr": "Une obligation est un lien de droit entre un créancier et un débiteur : ce dernier doit donner, faire ou ne pas faire quelque chose.",
  "examples": [
    "من اقترض مبلغاً صار مديناً بأدائه في الأجل المتفق عليه، وصاحب المال دائناً له.",
    "الالتزام بتسليم شيء يتحقق بنقل حيازة الشيء فعلياً، لا بتسليم وثيقة تملك فقط.",
    "تمرين: بيّن الفرق بين الوفاء بالالتزام وبين انقضائه بالمقاصة أو بالإبراء."
  ],
  "examples_fr": [
    "L'emprunteur devient débiteur de la somme à restituer à l'échéance ; le prêteur est créancier.",
    "L'obligation de donner s'exécute par la mise à disposition effective de la chose.",
    "Exercice : distinguer l'exécution de l'obligation de son extinction par compensation ou remise."
  ],
  "exam_keywords": [
    "أركان الالتزام",
    "الدائن والمدين",
    "الوفاء بالالتزام",
    "عدم تنفيذ الالتزام",
    "المسؤولية العقدية",
    "الالتزام في القانون المغربي"
  ],
  "related_terms": [
    "objet-obligation",
    "compensation",
    "remise-de-dette",
    "solidarite",
    "force-majeure"
  ]
}
```

## `vente` — البيع

```json
{
  "id": "vente",
  "term_ar": "البيع",
  "term_fr": "Vente",
  "definition": "عقد يلتزم بموجبه البائع بنقل ملكية شيء إلى المشتري مقابل ثمن.",
  "category": "قانون مدني",
  "canonical_url": "https://www.mizan.page/lexicon/البيع",
  "last_reviewed": "2026-09-20",
  "review_status": "internal_review",
  "enrichment_source": "editorial",
  "simple_explanation": "بعبارة بسيطة: عقد تنقل به ملكية شيء إلى مشترٍ مقابل ثمن متفق عليه؛ فيلتزم البائع بتسليم المبيع وضمان الاستحقاق، ويلتزم المشتري بدفع الثمن.",
  "simple_explanation_fr": "La vente est le contrat par lequel une partie transfère la propriété d'une chose à une autre moyennant un prix convenu.",
  "examples": [
    "بيع سيارة بثمن محدد: البائع ملزم بتسليمها وضمان عدم التعرض للمشتري في انتفاعه.",
    "اتفاق بلا ثمن محدّد لا يسمى بيعاً: قد يكون هبة أو وعداً بالبيع بأحكام أخرى.",
    "تمرين: ميّز بين البيع والوعد بالبيع من حيث الإلزام بنقل الملكية."
  ],
  "examples_fr": [
    "Vente d'une voiture à un prix déterminé : le vendeur doit délivrer la chose et garantir l'éviction.",
    "Sans prix déterminé, il n'y a pas vente : le contrat peut être une donation ou un pacte de préférence.",
    "Exercice : comparer la vente et la promesse de vente quant à l'obligation de transférer la propriété."
  ],
  "exam_keywords": [
    "أركان البيع",
    "التزامات البائع",
    "التزامات المشتري",
    "ضمان الاستحقاق",
    "الثمن في البيع",
    "البيع في القانون المغربي"
  ],
  "related_terms": [
    "cautionnement",
    "contrat-de-travail",
    "depot-contrat",
    "pret",
    "gage-civil"
  ]
}
```

## `erreur` — الغلط

```json
{
  "id": "erreur",
  "term_ar": "الغلط",
  "term_fr": "Erreur",
  "definition": "وهم يقع في ذهن المتعاقد يحمله على التعاقد على غير الوجه الذي كان يريده.",
  "category": "قانون مدني",
  "legal_sources": [
    {
      "code_ar": "قانون الالتزامات والعقود",
      "code_short": "ق.ل.ع",
      "code_fr": "Code des obligations et des contrats (Dahir 12 août 1913)",
      "articles": [
        {
          "number": "39",
          "phrase": "يكون قابلا للإبطال الرضى الصادر عن غلط، أو الناتج عن تدليس، أو المنتزع بإكراه.",
          "article_number": "39",
          "quotation": "يكون قابلا للإبطال الرضى الصادر عن غلط، أو الناتج عن تدليس، أو المنتزع بإكراه.",
          "quotation_type": "exact"
        },
        {
          "number": "40",
          "phrase": "الغلط في القانون يخول إبطال الالتزام إذا كان هو السبب الوحيد أو الأساسي، وإذا أمكن العذر عنه.",
          "article_number": "40",
          "quotation": "الغلط في القانون يخول إبطال الالتزام إذا كان هو السبب الوحيد أو الأساسي، وإذا أمكن العذر عنه.",
          "quotation_type": "exact"
        },
        {
          "number": "41",
          "phrase": "يخول الغلط الإبطال، إذا وقع في ذات الشيء أو في نوعه أو في صفة فيه كانت هي السبب الدافع إلى الرضى.",
          "article_number": "41",
          "quotation": "يخول الغلط الإبطال، إذا وقع في ذات الشيء أو في نوعه أو في صفة فيه كانت هي السبب الدافع إلى الرضى.",
          "quotation_type": "exact"
        },
        {
          "number": "42",
          "phrase": "الغلط الواقع على شخص أحد المتعاقدين أو على صفته، لا يخول الإبطال إلا إذا كان هذا الشخص أو هذه الصفة أحد الأسباب الدافعة إلى صدور الرضى من المتعاقد الآخر.",
          "article_number": "42",
          "quotation": "الغلط الواقع على شخص أحد المتعاقدين أو على صفته، لا يخول الإبطال إلا إذا كان هذا الشخص أو هذه الصفة أحد الأسباب الدافعة إلى صدور الرضى من المتعاقد الآخر.",
          "quotation_type": "exact"
        },
        {
          "number": "43",
          "phrase": "مجرد غلطات الحساب لا تكون سببا للإبطال وإنما يجب تصحيحها.",
          "article_number": "43",
          "quotation": "مجرد غلطات الحساب لا تكون سببا للإبطال وإنما يجب تصحيحها.",
          "quotation_type": "exact"
        },
        {
          "number": "44",
          "phrase": "على القضاة، عند تقدير الغلط أو الجهل، سواء تعلق بالقانون أم بالواقع، أن يراعوا ظروف الحال، وسن الأشخاص وحالتهم وكونهم ذكورا أو إناثا.",
          "article_number": "44",
          "quotation": "على القضاة، عند تقدير الغلط أو الجهل، سواء تعلق بالقانون أم بالواقع، أن يراعوا ظروف الحال، وسن الأشخاص وحالتهم وكونهم ذكورا أو إناثا.",
          "quotation_type": "exact"
        },
        {
          "number": "45",
          "phrase": "إذا وقع الغلط من الوسيط الذي استخدمه أحد المتعاقدين، كان لهذا المتعاقد أن يطلب إبطال الالتزام في الأحوال المنصوص عليها في الفصلين 41 و42 السابقين.",
          "article_number": "45",
          "quotation": "إذا وقع الغلط من الوسيط الذي استخدمه أحد المتعاقدين، كان لهذا المتعاقد أن يطلب إبطال الالتزام في الأحوال المنصوص عليها في الفصلين 41 و42 السابقين.",
          "quotation_type": "exact"
        }
      ],
      "source_url": "https://adala.justice.gov.ma",
      "last_verified": "2026-09-20"
    }
  ],
  "canonical_url": "https://www.mizan.page/lexicon/الغلط",
  "last_reviewed": "2026-09-20",
  "review_status": "published",
  "enrichment_source": "editorial",
  "simple_explanation": "بعبارة بسيطة: أن تنعقد إرادتك على شيء لأنك توهمت أمراً على خلاف الحقيقة؛ والغلط في صفة جوهرية للمحل أو في شخص المتعاقد يجعل العقد قابلاً للإبطال.",
  "simple_explanation_fr": "L'erreur est une fausse représentation qui vicie le consentement : le contrat est annulable lorsqu'elle porte sur une qualité essentielle.",
  "examples": [
    "من اشترى قلادة ظاناً أنها من الذهب فإذا هي مذهّبة: قد يكون غلطه في صفة جوهرية.",
    "الغلط في الحساب أو في الكتابة لا يبطل العقد، بل يُصحَّح بالرجوع إلى الأصل.",
    "تمرين: بيّن متى يكون الغلط في الشخص causaً للتعاقد لا مجرد دافع إليه."
  ],
  "examples_fr": [
    "Acheter un collier cru en or alors qu'il est plaqué peut constituer une erreur sur une qualité essentielle.",
    "L'erreur de compte ou de rédaction n'annule pas le contrat : elle se corrige.",
    "Exercice : distinguer l'erreur obstacle de l'erreur-défaut de la simple motivation erronée."
  ],
  "exam_keywords": [
    "عيوب الرضا",
    "الغلط الجوهري",
    "إبطال العقد",
    "الغلط في صفة جوهرية",
    "الغلط في القانون المغربي"
  ],
  "related_terms": [
    "dol",
    "violence-vice",
    "lesion",
    "consentement",
    "nullite"
  ]
}
```

## `nantissement` — الرهن الحيازي (Nantissement)

```json
{
  "id": "nantissement",
  "term_ar": "الرهن الحيازي",
  "term_fr": "Nantissement",
  "definition": "رهن يقع على منقول مع انتقال الحيازة للدائن.",
  "category": "قانون مدني",
  "canonical_url": "https://www.mizan.page/lexicon/الرهن-الحيازي",
  "last_reviewed": "2026-09-20",
  "review_status": "internal_review",
  "enrichment_source": "editorial",
  "simple_explanation": "بعبارة بسيطة: ضمانة يعطيها المدين لدائنه على منقول، يُسلَّم إلى الدائن أو إلى من يتفقان عليه، فيبقى في يده إلى أن يُسدَّد الدين.",
  "simple_explanation_fr": "Le nantissement est une sûreté sur un meuble remis au créancier ou à un tiers convenu, qui le retient jusqu'au paiement.",
  "examples": [
    "من رهن ساعة لدينه فليس للدائن التصرف فيها، وإنما يحبسها ضماناً إلى أن يستوفي حقه.",
    "ما يميّز الرهن الحيازي هو انتقال الحيازة إلى الدائن، لا مجرد الاتفاق المكتوب.",
    "تمرين: قارن بين الرهن الحيازي والكفالة من حيث حق الأفضلية وحق التتبع."
  ],
  "examples_fr": [
    "Le créancier nanti retient la chose sans pouvoir en disposer ; il garantit ainsi son paiement.",
    "Ce qui caractérise le nantissement, c'est le dessaisissement du débiteur, non le simple écrit.",
    "Exercice : comparer le nantissement et le cautionnement quant au droit de préférence et au droit de suite."
  ],
  "exam_keywords": [
    "الرهن الحيازي",
    "انتقال الحيازة",
    "حق الأفضلية",
    "انقضاء الرهن",
    "رهن المنقول في القانون المغربي"
  ],
  "related_terms": [
    "gage-civil",
    "erreur",
    "solidarite",
    "force-oblige",
    "bonne-foi"
  ]
}
```

## التوأم الثاني لـ«الرهن الحيازي»

السجلّان `nantissement` و`gage-civil` يحملان الاسم العربي نفسه بمقابلين أجنبيين
مختلفين، لذلك يفصل `lexiconSlug()` بينهما بلاحقة ويضيف `titleLabel` تمييز الاسم في
العناوين والوصلات (`الرهن الحيازي (Nantissement)` / `الرهن الحيازي (Gage)`) — وقد
أُدرج هنا لأنه الحالة الوحيدة التي يخطئ فيها أي ترتيب آلي في pairing الوصلات.

```json
{
  "id": "gage-civil",
  "term_ar": "الرهن الحيازي",
  "term_fr": "Gage",
  "definition": "عقد يسلم بموجبه المدين شيئاً منقولاً لدائنه ضماناً لدينه.",
  "category": "قانون مدني",
  "canonical_url": "https://www.mizan.page/lexicon/الرهن-الحيازي-gage-civil",
  "last_reviewed": "2026-09-20",
  "review_status": "internal_review",
  "enrichment_source": "editorial",
  "simple_explanation": "بعبارة بسيطة: عقد يسلّم بموجبه المدين شيئاً منقولاً إلى دائنه يبقى في يده ضماناً للدين، فإذا تأخّر الأداء جاز للدائن أن يستوفي دينه من ثمن ذلك الشيء.",
  "simple_explanation_fr": "Le gage est le contrat par lequel le débiteur remet un meuble au créancier en garantie de sa créance.",
  "examples": [
    "مدين سلّم معداته إلى دائنه ضماناً للدين: لا يستعيدها قبل الوفاء بما التزم به.",
    "إذا هلك الشيء المرهون في يد الدائن بلا تفريط منه انقضى الرهن، وبقي الدين في ذمة المدين.",
    "تمرين: ميّز بين الرهن الحيازي والرهن الرسمي من حيث الحيازة والشهر."
  ],
  "examples_fr": [
    "Le débiteur qui remet ses matériels en gage ne les récupère qu'après paiement de la créance.",
    "La perte de la chose entre les mains du créancier non fautif éteint le gage, la dette demeurant.",
    "Exercice : opposer le gage mobilier à l'hypothèque quant à la possession et à la publicité."
  ],
  "exam_keywords": [
    "عقد الرهن",
    "الشيء المرهون",
    "حيازة الدائن",
    "الرهن في القانون المغربي",
    "الفرق بين الرهن والكفالة"
  ],
  "related_terms": [
    "nantissement",
    "depot-contrat",
    "pret",
    "cautionnement",
    "vente"
  ]
}
```

## النمط المطبَّق على الـ 245 الباقية

كل حقل مشتقّ من النصّ المنشور في السجل نفسه — لا معلومة قانونية جديدة:

- `simple_explanation` — جملة «بعبارة بسيطة:» + التعريف بعد تجريده من صيغة القاموس؛ إن
  كان للسجل مصدر محقَّق يُذكَر رقم الفصل في آخر الجملة، وإلا تبقى العبارة وصفاً للتعريف.
- `simple_explanation_fr` / `examples_fr` —قابل فرنسي بُني من البنية نفسها ولم يُراجعه بشر:
  لذلك لا يُعرض في الواجهة ولا في النسخة الثابتة، وهو محذوف من `lexicon.client.json`.
- `examples` — سطر أو سطران من تعريف/نصّ المصدر، والسطر الثالث تمرين مقارنة («مرين: …»
  / «قارن بين …») لا واقعة قضائية: لا نختلق أحكاماً.
- `exam_keywords` — مصطلحات السؤال الشائعة في التصنيف + اسم السجل نفسه، 3 إلى 6.
- `related_terms` — ترتيب داخل الملف: +40 للتوأم同名، +3 لمن يذكر السجل صراحة،
  +2 لكل تعبير ثنائي مشترك في التعريف (حدّ 6)، +1 لكل كلمة (حدّ 2)، +1 لتطابق التصنيف؛
  وعند التعادل أقرب مسافة في ترتيب الملف (`lexicon.json` مجمّع موضوعياً). لا يُولَّد
  أكثر من 5، ولا يشير أي id إلى سجل غير موجود — وهو ما يحرسه
  `tests/lexicon-enrichment.test.ts`. الحالتان التي عجز الترتيب عنهما حُلّتا يدوياً في
  `CURATED_LINKS`.
- `canonical_url` — يُبنى بـ`canonicalLexicon`/`lexiconSlug` من `shared/seo/url-policy.js`
  بنفس مجموعة التكرار المستعملة في `scripts/prerender.mjs`، فلا يختلف الرابط المولّد هنا
  عن اسم ملف الصفحة الثابتة. بلا شرطة نهاية دائماً.
- `last_reviewed` / `review_status` — تاريخ جولة المولّد، و`published` فقط للسجلات التي
  تحقّق الدليل من نصّها الرسمي (18 سجلاً)؛ والباقي `internal_review`.
- `legal_sources` — لا يُولَّد إطلاقاً: يُترَك كما كتبه البشر. الذي يُضاف داخله فقط
  `source_url` (بوابة الناشِر حسب مدوّنة: `adala.justice.gov.ma` للجنائي/q.ل.ع،
  `social.gov.ma` لمدوّنة الأسرة، `sgg.gov.ma` افتراضياً)، `last_verified`، ولكل فصل
  `article_number` + `quotation` + `quotation_type` (`exact` للنص الحرفي المحقَّق،
  `excerpt` للمقتبس) — مع إبقاء `number`/`phrase` الأصليين لأن `TermPage` يقرأهما.

