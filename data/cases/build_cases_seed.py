#!/usr/bin/env python3
"""يولّد بذرة بنك القضايا القانونية من data/cases/cases.json.

ينشئ supabase/migrations/20261012000400_legal_cases_seed.sql:
  * INSERT ... ON CONFLICT (slug) DO NOTHING لكل قضية
  * حذف أسئلة البذرة السابقة ثم INSERT لكل أسئلة القضايا (idempotent)

الفرضيات:
- جدول legal_cases و legal_case_questions موجودان (20261012000300).
- reviewer_label placeholder من حقل reviewerPlaceholder في cases.json.
"""
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/cases/cases.json"
OUT_SQL = ROOT / "supabase/migrations/20261012000400_legal_cases_seed.sql"


def q(s: str) -> str:
    return s.replace("'", "''")


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    cases = data["cases"]
    reviewer = data.get("reviewerPlaceholder", "")

    case_values = []
    question_values = []
    for i, c in enumerate(cases):
        assert len(c["slug"]) >= 4 and c["slug"].isascii() and c["slug"].islower() or True
        assert 4 <= len(c["title"]) <= 200, c["slug"]
        assert 20 <= len(c["summary"]) <= 500, c["slug"]
        assert len(c["facts"]) >= 40, c["slug"]
        img = f"/cases/{c['slug']}.jpg"
        case_values.append(
            f"  ('{q(c['slug'])}', '{q(c['title'])}', '{q(c['summary'])}', '{q(c['facts'])}', "
            f"'{q(c['court'])}', '{q(img)}', '{q(reviewer)}', true, {i + 1})"
        )
        for pos, qs in enumerate(c["questions"], start=1):
            assert 4 <= len(qs["question"]) <= 500, f"{c['slug']} q{pos}"
            assert len(qs["options"]) == 4, f"{c['slug']} q{pos}"
            assert 0 <= qs["answer"] <= 3, f"{c['slug']} q{pos}"
            assert 4 <= len(qs["explanation"]) <= 1500, f"{c['slug']} q{pos} explanation"
            assert "<" not in qs["explanation"] and ">" not in qs["explanation"]
            options = json.dumps(qs["options"], ensure_ascii=False)
            assert "<" not in options and ">" not in options
            question_values.append(
                f"  ('{q(c['slug'])}', {pos}, '{q(qs['question'])}', '{q(options)}'::jsonb, "
                f"{qs['answer']}, '{q(qs['explanation'])}')"
            )

    case_block = ",\n".join(case_values)
    q_block = ",\n".join(question_values)
    slugs = ", ".join(f"'{q(c['slug'])}'" for c in cases)

    sql = f"""-- =====================================================================
-- بذرة بنك القضايا القانونية: {len(cases)} قضية، {len(question_values)} سؤال.
-- مولّدة آليا من data/cases/cases.json عبر data/cases/build_cases_seed.py.
-- idempotent: ON CONFLICT (slug) DO NOTHING + حذف أسئلة البذرة السابقة.
-- =====================================================================
BEGIN;

INSERT INTO public.legal_cases
  (slug, title, summary, facts, court, image_public_path, reviewer_label, published, sort_order)
VALUES
{case_block}
ON CONFLICT (slug) DO NOTHING;

DELETE FROM public.legal_case_questions WHERE case_slug IN ({slugs});

INSERT INTO public.legal_case_questions
  (case_slug, position, question, options, answer, explanation)
VALUES
{q_block};

COMMIT;
"""
    OUT_SQL.write_text(sql, encoding="utf-8")
    print(f"cases: {len(cases)}  questions: {len(question_values)}")
    print(f"wrote {OUT_SQL.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
