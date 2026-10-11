#!/usr/bin/env python3
"""يولّد بنك أسئلة وأجوبة مدونة الأسرة (70.03) من النص المصدر.

- يقرأ data/laws/mudawana-70-03.ar.md
- يقسم النص إلى مواد ويكتب data/laws/mudawana-70-03.articles.json
  (399 مادة؛ المادة 383 فارغة في النص المصدر ولا تُولَّد لها أسئلة)
- يبني supabase/migrations/20261012000200_family_code_quiz_and_help.sql:
  * سؤال اختيار من أربعة لكل مادة (يقتبس الجملة الأولى ويسأل أي مادة تنص عليها)
  * إدخال مساعدة لكل مادة: "ماذا تنص المادة N؟" مع النص الكامل (يُقسّم إن تجاوز 1500)

القواعد:
- الاقتباسات حرفية من النص المصدر (يُتحقق منها في نهاية السكربت).
- لا < ولا > في نصوص help_qa (قاعدة plain_text في القاعدة).
- ساق السؤال لا ينتهي بنقطتين ولا بفاصلة، وبحد 260 حرفا.
- البذرة idempotent: quiz عبر ON CONFLICT (slug)، و help عبر حذف البذرة السابقة
  بتعليمة keywords تحمل علامة seed:family-code-70-03.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/laws/mudawana-70-03.ar.md"
OUT_ARTICLES = ROOT / "data/laws/mudawana-70-03.articles.json"
OUT_SQL = ROOT / "supabase/migrations/20261012000200_family_code_quiz_and_help.sql"

ARTICLE_RE = re.compile(r"^المادة (\d+)$")
HEADING_RE = re.compile(r"^(الباب|القسم|الفرع|الكتاب)\b")
SEED_MARK = "seed:family-code-70-03"
SRC_URL = "/pro-tools/references"
SRC_TITLE = "مدونة الأسرة (القانون 70.03)"
MIN_NUM, MAX_NUM = 1, 400


def q(s: str) -> str:
    return s.replace("'", "''")


def split_articles(text: str):
    lines = text.splitlines()
    articles = []
    current = None
    for line in lines:
        m = ARTICLE_RE.match(line.strip())
        if m:
            if current is not None:
                articles.append(current)
            current = {"number": int(m.group(1)), "lines": []}
        elif current is not None:
            current["lines"].append(line)
    if current is not None:
        articles.append(current)

    out = []
    for art in articles:
        body_lines = art["lines"]
        while body_lines and (not body_lines[0].strip() or HEADING_RE.match(body_lines[0].strip())):
            body_lines = body_lines[1:]
        text_ = " ".join(l.strip() for l in body_lines if l.strip())
        text_ = re.sub(r"\s+", " ", text_).strip()
        out.append({"number": art["number"], "text": text_})
    return out


def first_paragraph(text: str) -> str:
    m = re.search(r"\.{1}(?=\s|$)", text[20:])
    if m and m.start() + 20 >= 40:
        return text[: m.start() + 20 + 1].strip()
    return text


def build_stem(text: str) -> str:
    para = first_paragraph(text)
    if len(para) < 40 or para.rstrip().endswith("،"):
        para = text
    stem = para
    if len(stem) > 260:
        cut = stem[:260]
        sp = cut.rfind(" ")
        if sp > 120:
            cut = cut[:sp]
        stem = cut
    stem = stem.rstrip("،؛. ")
    if stem.endswith(":"):
        stem = stem[:-1].rstrip()
    return stem


def clean_for_help(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def help_chunks(text: str, limit: int = 1500):
    if len(text) <= limit:
        return [text]
    chunks = []
    buf = ""
    for part in re.split(r"(?<=[؟.!؛])\s+", text):
        if len(part) > limit:
            if buf:
                chunks.append(buf.strip())
                buf = ""
            while len(part) > limit:
                cut = part[:limit]
                sp = cut.rfind(" ")
                if sp > limit // 2:
                    cut = cut[:sp]
                chunks.append(cut.strip())
                part = part[len(cut):].strip()
            continue
        if len(buf) + len(part) + 1 > limit:
            chunks.append(buf.strip())
            buf = part
        else:
            buf = (buf + " " + part).strip()
    if buf.strip():
        chunks.append(buf.strip())
    return [c for c in chunks if c]


def quiz_row(n: int, text: str):
    stem = build_stem(text)
    assert len(stem) >= 12, f"article {n}: stem too short"
    cands = [n - 1, n, n + 1, n + 2]
    seen, opts = set(), []
    for c in cands:
        if c < MIN_NUM or c > MAX_NUM or c in seen:
            continue
        seen.add(c)
        opts.append(c)
    extra = 3
    while len(opts) < 4:
        extra += 1
        if extra > MAX_NUM or extra in seen:
            continue
        seen.add(extra)
        opts.append(extra)
    opts = opts[:4]
    correct = opts.index(n)
    options = [f"المادة {c}" for c in opts]
    question = f"أي مادة من مدونة الأسرة (70.03) تنص على: «{stem}»؟"
    explanation = f"المادة {n} من مدونة الأسرة تنص على: «{clean_for_help(text)}»"
    slug = f"mdf-art-{n:03d}"
    return slug, question, json.dumps(options, ensure_ascii=False), correct, explanation, f"مدونة الأسرة، المادة {n}"


def main():
    text = SRC.read_text(encoding="utf-8")
    articles = split_articles(text)
    numbers = [a["number"] for a in articles]
    expected = list(range(MIN_NUM, MAX_NUM + 1))
    assert numbers == expected, f"markers not 1..400 in order: first mismatch {next((x, y) for x, y in zip(numbers, expected) if x != y)}"
    nonempty = [a for a in articles if a["text"]]
    empty = [a["number"] for a in articles if not a["text"]]
    assert empty == [383], f"unexpected empty articles: {empty}"
    assert len(nonempty) == 399

    OUT_ARTICLES.write_text(
        json.dumps(
            {
                "law": "mudawana-70-03",
                "title": "مدونة الأسرة (القانون رقم 70.03)",
                "source": "ظهير شريف رقم 1.04.22 بتنفيذه القانون رقم 70.03",
                "note": "المادة 383 فارغة في النص المصدر؛ عدد المواد المُولَّدة أسئلتها 399",
                "articleCount": len(nonempty),
                "articles": nonempty,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    quiz_values = []
    help_values = []
    for a in nonempty:
        n, text_ = a["number"], a["text"]
        slug, question, options, correct, explanation, reference = quiz_row(n, text_)
        quiz_values.append(
            f"  ('{q(slug)}', 'general', 'family-code-70-03', 'general', 'medium', "
            f"'{q(question)}', '{q(options)}'::jsonb, {correct}, '{q(explanation)}', '{q(reference)}', true)"
        )
        clean = clean_for_help(text_)
        src_flat = re.sub(r"\s+", " ", text)
        assert re.sub(r"\s+", " ", clean) in src_flat, f"article {n}: text not verbatim"
        assert "<" not in clean and ">" not in clean, f"article {n}: angle brackets"
        for i, chunk in enumerate(help_chunks(clean)):
            assert 4 <= len(chunk) <= 1500, f"article {n} chunk {i}: length {len(chunk)}"
            if i == 0:
                question = f"ماذا تنص المادة {n} من مدونة الأسرة؟"
            else:
                question = f"ماذا تنص المادة {n} من مدونة الأسرة؟ (الجزء {i + 1})"
            kw_items = ", ".join(f"'{q(k)}'" for k in [SEED_MARK, "مدونة الأسرة", f"المادة {n}", "70.03"])
            help_values.append(
                f"  ('{q(question)}', '{q(chunk)}', ARRAY[{kw_items}], "
                f"'{q(SRC_URL)}', '{q(SRC_TITLE)}', true)"
            )

    quiz_block = ",\n".join(quiz_values)
    help_block = ",\n".join(help_values)
    sql = f"""-- =====================================================================
-- بنك مدونة الأسرة (70.03): {len(quiz_values)} سؤال اختبار + {len(help_values)} إدخال مساعدة.
-- مولّد آليا من data/laws/mudawana-70-03.ar.md عبر
-- data/laws/build_family_code_bank.py — الاقتباسات حرفية من النص المصدر.
-- المادة 383 فارغة في النص المصدر (لا أسئلة لها).
-- البذرة idempotent (quiz: ON CONFLICT (slug)، help: حذف بذرة سابقة بنفس العلامة).
-- =====================================================================
BEGIN;

INSERT INTO public.quiz_questions
  (slug, tier, module, body, difficulty, question, options, answer, explanation, reference, is_published)
VALUES
{quiz_block}
ON CONFLICT (slug) DO NOTHING;

DELETE FROM public.help_qa WHERE keywords @> ARRAY['{SEED_MARK}'];

INSERT INTO public.help_qa
  (question, answer, keywords, source_url, source_title, published)
VALUES
{help_block};

COMMIT;
"""
    OUT_SQL.write_text(sql, encoding="utf-8")
    print(f"articles: {len(nonempty)} (empty: {empty})  quiz: {len(quiz_values)}  help: {len(help_values)}")
    print(f"wrote {OUT_ARTICLES.relative_to(ROOT)} and {OUT_SQL.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
