"""يولّد docs/pitch/MIZAN-PITCH-AR.pptx (عرض المستثمرين بالعربية، 13 شريحة، RTL)."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from pathlib import Path

NAVY = RGBColor(0x0B, 0x12, 0x20)
GOLD = RGBColor(0xC9, 0xA2, 0x27)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREY = RGBColor(0xB8, 0xC0, 0xCC)
DARK = RGBColor(0x1A, 0x1F, 0x2B)
FONT = "Cairo"

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]
W = 13.333


def bg(slide, color=NAVY):
    f = slide.background.fill
    f.solid()
    f.fore_color.rgb = color


def rtl(p):
    p._p.get_or_add_pPr().set("rtl", "1")


def text(slide, x, y, w, h, s, size=18, bold=False, color=WHITE, align=PP_ALIGN.RIGHT):
    """x يُقاس من الحافة اليمنى (RTL)."""
    tb = slide.shapes.add_textbox(Inches(W - x - w), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    lines = s if isinstance(s, list) else [s]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        rtl(p)
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = color
        r.font.name = FONT
        p.space_after = Pt(6)
    return tb


def header(slide, title, num):
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
    bar.fill.solid(); bar.fill.fore_color.rgb = GOLD; bar.line.fill.background()
    text(slide, 0.6, 0.35, 11, 0.9, title, 32, True, WHITE)
    text(slide, 12.0, 6.9, 1.0, 0.4, f"{num:02d}", 12, False, GREY, PP_ALIGN.LEFT)
    text(slide, 0.6, 6.9, 5, 0.4, "ميزان الرقمية · mizan.page · سرّي", 11, False, GREY)


def bullets(slide, items, x=0.7, y=1.5, w=12, size=20):
    text(slide, x, y, w, 5, [f"•  {i}" for i in items], size)


def card(slide, x, y, w, h, title, body, tsize=16, bsize=13):
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(W - x - w), Inches(y), Inches(w), Inches(h))
    sh.fill.solid(); sh.fill.fore_color.rgb = DARK; sh.line.color.rgb = GOLD
    text(slide, x + 0.2, y + 0.15, w - 0.4, 0.5, title, tsize, True, GOLD)
    text(slide, x + 0.2, y + 0.65, w - 0.4, h - 0.8, body.split("\n"), bsize, False, WHITE)


def table(slide, rows, x, y, w, col_w=None, size=13):
    """الأعمدة تُعطى بالترتيب المنطقي (الأول = الأيمن)؛ نعكسها فعلياً لتظهر RTL."""
    rows = [list(reversed(r)) for r in rows]
    if col_w:
        col_w = list(reversed(col_w))
    nrows, ncols = len(rows), len(rows[0])
    t = slide.shapes.add_table(nrows, ncols, Inches(W - x - w), Inches(y), Inches(w), Inches(0.4 * nrows)).table
    if col_w:
        for i, cw in enumerate(col_w):
            t.columns[i].width = Inches(cw)
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = t.cell(r, c)
            cell.text = str(val)
            cell.fill.solid()
            cell.fill.fore_color.rgb = GOLD if r == 0 else DARK
            for p in cell.text_frame.paragraphs:
                p.alignment = PP_ALIGN.RIGHT
                rtl(p)
                for run in p.runs:
                    run.font.size = Pt(size)
                    run.font.bold = r == 0
                    run.font.name = FONT
                    run.font.color.rgb = NAVY if r == 0 else WHITE


# 1 — الغلاف
s = prs.slides.add_slide(BLANK); bg(s)
text(s, 0.8, 2.0, 11.5, 1.2, "ميزان الرقمية  ·  Mizan Digital", 54, True, GOLD)
text(s, 0.8, 3.2, 11.5, 1.2, ["المنصة ثنائية اللغة التي تساعد طلبة القانون بالمغرب", "على المراجعة واجتياز الامتحانات وبدء مسارهم المهني."], 24)
text(s, 0.8, 5.0, 11.5, 0.6, "تكنولوجيا قانونية / تعليمية  ·  مرحلة ما قبل البذرة  ·  www.mizan.page", 16, False, GREY)
text(s, 0.8, 5.5, 11.5, 0.6, "أكتوبر 2026", 14, False, GREY)

# 2 — المشكلة
s = prs.slides.add_slide(BLANK); bg(s); header(s, "المشكلة", 2)
bullets(s, [
    "نحو 120 ألف طالب قانون بالمغرب في 21 كلية عمومية — ونسبة رسوب في S1–S2 تتجاوز 50٪ غالباً.",
    "محتوى مراجعة مشتّت: ملفات PDF على واتساب، مطبوعات غير مؤرخة، ملخصات متفاوتة الجودة.",
    "قانون ثنائي اللغة (دروس بالعربية، نصوص واجتهاد بالفرنسية) بلا أداة تجسر الفجوة.",
    "لا مسار متكامل: الدروس ← الامتحانات ← المباريات (القضاء، الأمن الوطني، التوثيق، المحاماة) ← الوظيفة.",
    "إصلاحات جارية (مدونة الأسرة، المسطرة الجنائية): الطلبة يراجعون على نسخ قديمة.",
])

# 3 — الحل
s = prs.slides.add_slide(BLANK); bg(s); header(s, "الحل: ميزان", 3)
card(s, 0.6, 1.5, 3.9, 2.3, "المراجعة", "ملخصات S1→S6، أرشيف القوانين والجريدة الرسمية، مقالات منهجية.")
card(s, 4.7, 1.5, 3.9, 2.3, "الفهم", "معجم قانوني عربي/فرنسي: 250 مصطلحاً مع التعريف والأمثلة والمصادر.")
card(s, 8.8, 1.5, 3.9, 2.3, "التدريب", "اختبارات بأربعة مسارات (الجامعة، الثقافة، المباريات بمؤقّت، المقابلات) + نقاط خبرة ورتب وأوسمة.")
card(s, 0.6, 4.0, 3.9, 2.3, "التوجيه", "دليل 21 كلية و14 بطاقة مهنة مفصّلة (المباريات، الرواتب، المراحل).")
card(s, 4.7, 4.0, 8.0, 2.3, "الممارسة — أدوات Pro (اشتراك)", "مقارن نسخ النصوص · خريطة الإحالات القانونية · حالات عملية مصحّحة · حاسبة الآجال · تنبيهات التعديلات · مساحة بحث خاصة.")

# 4 — المنتج
s = prs.slides.add_slide(BLANK); bg(s); header(s, "المنتج مبني فعلاً وفي الإنتاج", 4)
bullets(s, [
    "موقع مباشر، نحو 35 صفحة عمومية، عرض ثابت مُولَّد مسبقاً، PWA، وضع داكن/فاتح.",
    "224 سؤال QCM محرَّر · 250 مصطلحاً · 21 كلية · 14 مهنة · أرشيف قوانين متزامن.",
    "حسابات مستخدمين، بروفايلات عامة قابلة للمشاركة (mizan.page/u/…)، لوحة تحكم CMS كاملة.",
    "دفع Stripe مدمج، صفحة أسعار، 6 أدوات Pro مع بوابة اشتراك.",
    "طبقة ذكاء اصطناعي/SEO: schema.org، llms.txt، نقطة MCP ← ميزان مصدراً تستشهد به المحركات والمساعدات الذكية.",
    "بنية Cloudflare + Supabase: تكلفة حدية لكل مستخدم ≈ 0، هامش إجمالي > 85٪.",
])

# 5 — الجذب
s = prs.slides.add_slide(BLANK); bg(s); header(s, "الجذب والأهداف", 5)
card(s, 0.6, 1.5, 3.9, 2.0, "اليوم", "~443 زيارة / شهر\n100٪ عضوي، 0 درهم تسويق\nقبل أول موسم امتحانات")
card(s, 4.7, 1.5, 3.9, 2.0, "6 أشهر", "5,000 زيارة / شهر\n1,000 حساب\n100 مشترك Pro")
card(s, 8.8, 1.5, 3.9, 2.0, "12 شهراً", "25,000 زيارة / شهر\n6,000 حساب\n600 مشترك Pro")
bullets(s, [
    "الرافعة الرئيسية: SEO عربي طويل الذيل قائم فعلاً؛ ذروة البحث في دجنبر–يناير وماي–يونيو.",
    "دفعة جديدة من الطلبة كل سنة = سوق متجدّد.",
], y=4.0, size=18)

# 6 — السوق
s = prs.slides.add_slide(BLANK); bg(s); header(s, "السوق", 6)
table(s, [
    ["", "الحجم", "الفرضية"],
    ["TAM", "~120,000 طالب قانون + ~40,000 مترشح للمباريات سنوياً + الممارسون", "المغرب"],
    ["SAM", "~60,000 طالب نشط في المراجعة الرقمية", "عربية / فرنسية"],
    ["SOM (3 سنوات)", "6,000 مشترك × 200 درهم/سنة ≈ 1.2 مليون درهم ARR", "10٪ من SAM"],
], 0.6, 1.6, 12.1, [2.0, 7.1, 3.0], 15)
bullets(s, [
    "توسع طبيعي: الجزائر، تونس، موريتانيا (قانون مدني ثنائي اللغة).",
    "قطاعات B2B: الكليات، مراكز التحضير للمباريات، مكاتب المحاماة التي توظّف.",
], y=4.2)

# 7 — النموذج الاقتصادي
s = prs.slides.add_slide(BLANK); bg(s); header(s, "النموذج الاقتصادي: مجاني + Pro", 7)
table(s, [
    ["الخطة", "السعر المستهدف", "الفئة"],
    ["شهري", "39 درهم", "التجربة / فترة الامتحانات"],
    ["سداسي", "129 درهم", "الخطة الرئيسية، موازية لـ S1/S2"],
    ["سنوي", "229 درهم", "الطلبة المنتظمون، مترشحو المباريات"],
], 0.6, 1.6, 7.0, [2.0, 2.0, 3.0], 15)
card(s, 8.0, 1.6, 4.7, 3.6, "إيرادات تكميلية", "• حزم المباريات (الأمن الوطني، القضاء)\n• تراخيص B2B للكليات / المراكز\n• شراكات دور النشر القانونية\n• عروض مكاتب المحاماة الموظِّفة")
bullets(s, ["محتوى المراجعة مجاني = محرك الاستقطاب؛ أدوات Pro = التحويل.",
            "الدفع: Stripe + CMI / دفع محلي + تفعيل يدوي (تحويل، وفاكاش)."], y=4.6, size=17)

# 8 — الوصول إلى السوق
s = prs.slides.add_slide(BLANK); bg(s); header(s, "استراتيجية الوصول إلى السوق", 8)
bullets(s, [
    "SEO عربي طويل الذيل: مقال / اختبار لكل مادة قبل كل دورة امتحانات.",
    "المجتمعات: مجموعات واتساب / فيسبوك / تيليغرام حسب الكلية، سفراء طلبة (Pro مجاني).",
    "الانتشار داخل المنتج: مشاركة نتائج الاختبارات والبروفايل العام على واتساب وإنستغرام وتيك توك.",
    "الشراكات: مكاتب الطلبة، الأساتذة، مراكز التحضير، العيادات القانونية.",
    "التوقيت: حملات مركّزة في دجنبر–يناير وماي–يونيو.",
])

# 9 — المنافسة
s = prs.slides.add_slide(BLANK); bg(s); header(s, "المنافسة", 9)
table(s, [
    ["الفاعل", "الحدود"],
    ["مجموعات واتساب / فيسبوك، ملفات PDF متداولة", "غير منظّمة، غير متحقَّق منها، غير مؤرخة"],
    ["مواقع الدروس العامة", "بلا أدوات، بلا اختبارات، محتوى مغربي قليل ونادراً محيَّن"],
    ["البوابات الرسمية (SGG، عدالة)", "مرجعية لكن غير تربوية، بلا تدريب"],
    ["Doctrine / Lexis / Dalloz", "أسعار باهظة، قانون فرنسي، للممارسين"],
], 0.6, 1.6, 12.1, [5.0, 7.1], 15)
text(s, 0.7, 4.5, 12, 1.5, "ميزة ميزان: الفاعل الوحيد الذي يجمع محتوى مغربياً ثنائي اللغة متحقَّقاً منه + تدريباً مُلعَّباً + أدوات Pro، على قاعدة تقنية جاهزة للتوسع.", 20, True, GOLD)

# 10 — لماذا الآن
s = prs.slides.add_slide(BLANK); bg(s); header(s, "لماذا الآن", 10)
bullets(s, [
    "إصلاحات تشريعية كبرى (مدونة الأسرة، المسطرة الجنائية، مدونة الشغل) ← حاجة إلى نصوص محيّنة ومقارنات.",
    "رقمنة التعليم العالي ونسبة انتشار الهاتف الذكي لدى الطلبة تفوق 90٪.",
    "محركات البحث والمساعدات الذكية تبحث عن مصادر عربية منظّمة: مكانة المرجع تُحجز الآن.",
])

# 11 — الفريق
s = prs.slides.add_slide(BLANK); bg(s); header(s, "الفريق", 11)
card(s, 0.6, 1.6, 6.0, 3.2, "المؤسس", "التصميم والتطوير الكامل للمنصة: الواجهة، لوحة التحكم، الدفع، SEO/AEO، الإنتاج التحريري.\n\nقدرة تنفيذ مثبتة: منتج كامل أُنجز فردياً.")
card(s, 6.9, 1.6, 5.8, 3.2, "التوظيفات ذات الأولوية", "• مسؤول(ة) محتوى قانوني (باحث دكتوراه / محامٍ)\n• مسؤول(ة) مجتمع طلابي\n• لجنة مراجعة من الأساتذة")

# 12 — الجولة
s = prs.slides.add_slide(BLANK); bg(s); header(s, "الجولة: 600,000 درهم في مرحلة ما قبل البذرة", 12)
table(s, [
    ["البند", "الحصة", "التفاصيل"],
    ["المحتوى والبيداغوجيا", "40٪", "محرّرون قانونيون، مراجعة، 2,000 سؤال، ملخصات S1–S6، حزم المباريات"],
    ["النمو", "30٪", "سفراء الحرم الجامعي، فيديو قصير، حملات الامتحانات، شراكات"],
    ["المنتج والتقنية", "20٪", "الدفع المحلي، تطبيق الهاتف، مساعد مراجعة بالذكاء الاصطناعي، Pro v2"],
    ["القانوني والعمليات", "10٪", "SARL، الشروط العامة، المحاسبة، البنية التحتية"],
], 0.6, 1.5, 12.1, [3.0, 1.2, 7.9], 14)
text(s, 0.7, 4.3, 12, 2, [
    "الأداة: BSA-AIR / SAFE أو حصة ~10–15٪  ·  المدة: 18 شهراً",
    "الأهداف خلال 18 شهراً: 25,000 زيارة/شهر · 6,000 حساب · 600 مشترك Pro · ≈ 120,000 درهم ARR · شراكتان B2B",
    "← الشروط مكتملة لجولة بذرة من 3 إلى 5 ملايين درهم.",
], 17, False, WHITE)

# 13 — الخاتمة
s = prs.slides.add_slide(BLANK); bg(s)
text(s, 0.8, 1.6, 11.5, 1.2, ["أن نصبح المرجع الرقمي للقانون المغربي —", "للطلبة أولاً، ثم للممارسين."], 30, True, GOLD)
bullets(s, [
    "سوق ضعيف الخدمة، متجدّد (دفعة جديدة كل سنة)، قابل للتوسع مغاربياً.",
    "منتج مبني فعلاً: رأس المال يذهب إلى النمو لا إلى التطوير الأولي.",
    "تكاليف شبه منعدمة، هامش برمجي > 85٪.",
], y=3.4, size=20)
text(s, 0.8, 5.8, 11.5, 0.8, "contact@mizan.page  ·  www.mizan.page", 18, False, GREY)

out = Path(__file__).with_name("MIZAN-PITCH-AR.pptx")
prs.save(out)
print("saved", out)
