"""يولّد هجرة البذر لحالات «من الواقعة إلى الحل» من data/cases/cases.json.

- يتحقق من: الـ slug الفريد وصيغته، الخيارات الأربعة المختلفة، فهرس الجواب،
  وجود المواد في ملفات القوانين، وملف الصورة.
- يملأ نص كل مادة مرجعية من ملف القانون حرفياً (لا يكتبه يدوياً).
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(ROOT, "..", ".."))
SRC = os.path.join(ROOT, "cases.json")
OUT = os.path.join(REPO, "supabase", "migrations", "20261012000400_legal_cases_seed.sql")
LAW_FILES = {
    "mudawana-70-03": os.path.join(REPO, "data", "laws", "mudawana-70-03.articles.json"),
    "constitution-2011": os.path.join(REPO, "data", "laws", "constitution-2011.articles.json"),
}
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
DIFFS = {"easy", "medium", "hard"}

laws = {}
for code, path in LAW_FILES.items():
    arts = json.load(open(path, encoding="utf-8"))["articles"]
    # ملفات المستودع تستعمل "number"، والتصديرات الأقدم "article"
    laws[code] = {int(a["number"] if "number" in a else a["article"]): a["text"] for a in arts}

data = json.load(open(SRC, encoding="utf-8"))
cases = data["cases"]
errors = []
seen = set()

def sql(s):
    assert "$q$" not in s
    return "$q$" + s + "$q$"

rows = []
for c in cases:
    slug = c["slug"]
    where = slug
    if not SLUG_RE.match(slug) or not (3 <= len(slug) <= 120):
        errors.append(f"{where}: slug غير صالح")
    if slug in seen:
        errors.append(f"{where}: slug مكرر")
    seen.add(slug)
    if c["law_code"] not in laws:
        errors.append(f"{where}: قانون غير معروف")
    if c["difficulty"] not in DIFFS:
        errors.append(f"{where}: صعوبة غير معروفة")
    opts = [o.strip() for o in c["options"]]
    if len(opts) != 4 or len(set(opts)) != 4 or any(len(o) < 2 for o in opts):
        errors.append(f"{where}: يجب أن تكون أربعة خيارات مختلفة")
    if not (0 <= c["answer_index"] <= 3):
        errors.append(f"{where}: فهرس الجواب خارج النطاق")
    if not c["articles"]:
        errors.append(f"{where}: لا توجد مواد مرجعية")
    refs = []
    for ref in c["articles"]:
        law = laws.get(ref["law"])
        if law is None or ref["article"] not in law:
            errors.append(f"{where}: المادة {ref['article']} غير موجودة في {ref['law']}")
            continue
        refs.append({"law": ref["law"], "article": ref["article"], "text": law[ref["article"]]})
    image_url = ""
    if c.get("image"):
        image_url = "/cases/" + c["image"]
        if not os.path.exists(os.path.join(REPO, "public", "cases", c["image"])):
            errors.append(f"{where}: ملف الصورة غير موجود")
    rows.append((c, opts, refs, image_url))

if errors:
    print("\n".join(errors))
    sys.exit(1)

values = []
for c, opts, refs, image_url in rows:
    values.append(
        "  (" + ", ".join([
            sql(c["slug"]), sql(c["title"]), sql(c["law_code"]), sql(c["difficulty"]),
            sql(c["story"]), sql(c["question"]),
            sql(json.dumps(opts, ensure_ascii=False)) + "::jsonb",
            str(c["answer_index"]), sql(c["hint"]), sql(c["explanation"]),
            sql(json.dumps(refs, ensure_ascii=False)) + "::jsonb",
            sql(image_url), sql(c.get("image_alt", "")),
            "true", sql(data["reviewed_by"]), f"DATE {sql(data['reviewed_on'])}",
        ]) + ")"
    )

out = [
    "-- بذر حالات «من الواقعة إلى الحل». مولّدة من data/cases/cases.json",
    "-- بواسطة data/cases/build_cases_seed.py. نصوص المواد مأخوذة من ملفات القوانين حرفياً.",
    "-- إدراج آمن عند الإعادة: ON CONFLICT (slug) يترك الحالات الموجودة كما هي.",
    "",
    "INSERT INTO public.legal_cases (slug, title, law_code, difficulty, story, question, options, answer_index, hint, explanation, articles, image_url, image_alt, published, reviewed_by, reviewed_on)",
    "VALUES",
    ",\n".join(values),
    "ON CONFLICT (slug) DO NOTHING;",
    "",
]
open(OUT, "w", encoding="utf-8").write("\n".join(out))
print("cases", len(rows), "->", os.path.relpath(OUT, REPO))
