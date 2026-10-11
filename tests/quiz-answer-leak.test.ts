/**
 * حماية إجابات الاختبارات على الخادم فقط — quiz answers server-only.
 *
 * الثغرة السابقة: سياسة quiz_questions_public_read كانت تتيح لأي زائر قراءة
 * جدول quiz_questions كاملاً بما فيه عمود answer (الفهرس الصحيح).
 *
 * الضمانات الجديدة:
 *  1) الترقية 20261012000000 تسقط سياسة القراءة العامة على الجدول الأساس
 *     وتعيد بناء عرض quiz_questions_public بدون answer/explanation/reference.
 *  2) الواجهة تقرأ حصراً من العرض العام ولا تعرض إجابة سؤال مخفي قبل اختيار
 *     المستخدم، وتكشفها عبر دالة quiz_reveal_answer بعد اختيار صريح فقط.
 */
import { test, expect, describe, vi, beforeEach } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { mapCmsRow } from "../src/lib/quiz/repository"

const MIGRATION = resolve(__dirname, "../supabase/migrations/20261012000000_quiz_answers_server_only.sql")

function migrationSql(): string {
  expect(existsSync(MIGRATION), "الترقية 20261012000000 غير موجودة").toBe(true)
  return readFileSync(MIGRATION, "utf-8")
}

describe("الترقية: إسقاط التعرّض العام للإجابات", () => {
  test("تُسقط سياسة quiz_questions_public_read على الجدول الأساس", () => {
    const sql = migrationSql()
    expect(sql).toMatch(/DROP POLICY IF EXISTS\s+"?quiz_questions_public_read"?\s+ON\s+"?public"?\."?quiz_questions"?/i)
  })

  test("العرض العام لا يحمل أعمدة answer أو explanation أو reference", () => {
    const sql = migrationSql()
    // قسم تعريف العرض: من CREATE VIEW حتى الـ REVOKE التالي
    const viewStart = sql.search(/CREATE (?:OR REPLACE )?VIEW\s+"?public"?\."?quiz_questions_public"?(?!\w)/)
    expect(viewStart).toBeGreaterThan(-1)
    const viewEnd = sql.indexOf("REVOKE ALL", viewStart)
    const viewDef = sql.slice(viewStart, viewEnd)
    // لا أعمدة حساسة في قائمة SELECT
    expect(viewDef).not.toMatch(/\banswer\b/)
    expect(viewDef).not.toMatch(/\bexplanation\b/)
    expect(viewDef).not.toMatch(/\breference\b/)
    // يبقى security_invoker (docs/security-architecture.md) ويقرأ من دالة المصدر لا من الجدول
    expect(viewDef).toMatch(/security_invoker\s*=\s*true/i)
    expect(viewDef).toMatch(/FROM\s+"?public"?\."?quiz_questions_public_rows"?\(\)/)

    // دالة المصدر: الأسئلة المنشورة والأعمدة الآمنة فقط، بمسار بحث مثبّت
    const fnStart = sql.search(/CREATE OR REPLACE FUNCTION\s+"?public"?\."?quiz_questions_public_rows"?\(\)/)
    expect(fnStart).toBeGreaterThan(-1)
    const fnDef = sql.slice(fnStart, sql.indexOf("$$;", fnStart))
    expect(fnDef).not.toMatch(/\banswer\b/)
    expect(fnDef).not.toMatch(/\bexplanation\b/)
    expect(fnDef).not.toMatch(/\breference\b/)
    expect(fnDef).toMatch(/is_published = true/)
    expect(fnDef).toMatch(/SECURITY DEFINER/)
    expect(fnDef).toMatch(/SET search_path = ''/)
  })

  test("يُسقط العرض قبل إنشائه — OR REPLACE لا يحذف أعمدة (SQLSTATE 42P16)", () => {
    const sql = migrationSql()
    // عرض 20260920000000 يحمل explanation و reference؛ OR REPLACE يفشل بـ cannot drop columns from view
    expect(sql).not.toMatch(/CREATE OR REPLACE VIEW\s+"?public"?\."?quiz_questions_public"?(?!\w)/)
    const dropAt = sql.search(/DROP VIEW IF EXISTS\s+"?public"?\."?quiz_questions_public"?\s*;/)
    const createAt = sql.search(/CREATE VIEW\s+"?public"?\."?quiz_questions_public"?(?!\w)/)
    expect(dropAt).toBeGreaterThan(-1)
    expect(createAt).toBeGreaterThan(dropAt)
    // بلا CASCADE: اعتماد غير متوقع يوقف الترحيل بدل حذفه بصمت
    expect(sql).not.toMatch(/DROP VIEW[^;]*quiz_questions_public[^;]*CASCADE/i)
  })

  test("دالة الكشف تتطلب اختياراً ضمن 0..3 وتكشف الإجابة فقط عند وجوده", () => {
    const sql = migrationSql()
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION\s+"?public"?\."?quiz_reveal_answer"?\s*\(\s*p_slug text,\s*p_chosen integer/)
    expect(sql).toMatch(/p_chosen < 0 OR p_chosen > 3/)
    expect(sql).toMatch(/SECURITY DEFINER/)
  })

  test("التنفيذ مسموح للزوار والمستخدمين فقط (وليس PUBLIC)", () => {
    const sql = migrationSql()
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION\s+"?public"?\."?quiz_reveal_answer"?\(text, integer\) FROM PUBLIC/)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION\s+"?public"?\."?quiz_reveal_answer"?\(text, integer\) TO anon, authenticated/)
  })
})

describe("الواجهة: قراءة العرض العام فقط", () => {
  test("loadCmsQuestions يقرأ من quiz_questions_public ولا يطلب أعمدة الإجابة", () => {
    const src = readFileSync(resolve(__dirname, "../src/lib/quiz/repository.ts"), "utf-8")
    // الطلب على العرض العام
    expect(src).toMatch(/from\("quiz_questions_public"\)/)
    // لا طلب مباشر على جدول الإجابات في مسار القراءة
    expect(src).not.toMatch(/from\("quiz_questions"\)\s*\n?\s*\.select/)
    // قائمة الأعمدة لا تشمل answer/explanation/reference
    const selectMatch = src.match(/quiz_questions_public"\)\s*\n?\s*\.select\(\s*"([^"]+)"/)
    expect(selectMatch, "لم تُعثر على قائمة الأعمدة").toBeTruthy()
    const columns = selectMatch![1]
    expect(columns).not.toContain("answer")
    expect(columns).not.toContain("explanation")
    expect(columns).not.toContain("reference")
  })
})

describe("mapCmsRow: الإجابة غير الموجودة تصبح مخفية (-1 + answerHidden)", () => {
  test("صف بلا إجابة → answer: -1 و answerHidden: true", () => {
    const q = mapCmsRow({
      slug: "cms-hidden-01",
      tier: "general",
      semester: null,
      module: "constitution-2011",
      body: "general",
      track: null,
      difficulty: "medium",
      question: "أي فصل من دستور 2011 ينص على: «...»؟",
      options: ["الفصل 1", "الفصل 2", "الفصل 3", "الفصل 4"],
      created_at: null,
    })
    expect(q.answer).toBe(-1)
    expect(q.answerHidden).toBe(true)
    expect(q.explanation).toBe("")
    expect(q.source).toBe("cms")
  })

  test("صف قديم يحمل إجابة (نسخة مخزّنة قبل الترقية) → لا يُخفى", () => {
    const q = mapCmsRow({
      slug: "cms-legacy-01",
      tier: "general",
      semester: null,
      module: null,
      body: null,
      track: null,
      difficulty: "easy",
      question: "سؤال قديم؟",
      options: ["أ", "ب", "ج", "د"],
      answer: 2,
      explanation: "شرح قديم",
      reference: null,
      created_at: null,
    })
    expect(q.answer).toBe(2)
    expect(q.answerHidden).toBe(false)
    expect(q.explanation).toBe("شرح قديم")
  })

  test("إجابة خارج النطاق (0..3) تُعامل كإجابة مخفية", () => {
    const q = mapCmsRow({
      slug: "cms-bad-01",
      tier: "general",
      semester: null,
      module: null,
      body: null,
      track: null,
      difficulty: "easy",
      question: "سؤال؟",
      options: ["أ", "ب", "ج", "د"],
      answer: 9,
      explanation: "x",
      reference: null,
      created_at: null,
    })
    expect(q.answer).toBe(-1)
    expect(q.answerHidden).toBe(true)
  })
})

describe("revealQuizAnswer: الكشف بعد الاختيار فقط", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  test("اختيار خارج النطاق لا يصل إلى الخادم ويعيد revealed: false", async () => {
    const { revealQuizAnswer } = await import("../src/lib/quiz/attemptService")
    for (const chosen of [-1, 4, 99]) {
      const result = await revealQuizAnswer("any-slug", chosen)
      expect(result.revealed).toBe(false)
      expect(result.answer).toBeNull()
    }
  })

  test("فشل الاتصال يعيد revealed: false (تحتسب الإجابة خاطئة بلا كشف)", async () => {
    vi.doMock("../src/lib/supabase/client", () => ({
      supabase: {
        rpc: vi.fn().mockRejectedValue(new Error("network down")),
      },
    }))
    const { revealQuizAnswer } = await import("../src/lib/quiz/attemptService")
    const result = await revealQuizAnswer("cms-hidden-01", 1)
    expect(result.revealed).toBe(false)
    expect(result.answer).toBeNull()
    expect(result.explanation).toBeNull()
    expect(result.reference).toBeNull()
  })

  test("نجاح الكشف يعيد الفهرس الصحيح والشرح والسند", async () => {
    vi.doMock("../src/lib/supabase/client", () => ({
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          data: [{ revealed: true, answer: 2, explanation: "الفصل 3 ينص على...", reference: "دستور 2011، الفصل 3" }],
          error: null,
        }),
      },
    }))
    const { revealQuizAnswer } = await import("../src/lib/quiz/attemptService")
    const result = await revealQuizAnswer("cms-hidden-01", 1)
    expect(result.revealed).toBe(true)
    expect(result.answer).toBe(2)
    expect(result.explanation).toBe("الفصل 3 ينص على...")
    expect(result.reference).toBe("دستور 2011، الفصل 3")
  })

  test("استجابة revealed: false من الخادم (سؤال غير منشور) لا تكشف شيئاً", async () => {
    vi.doMock("../src/lib/supabase/client", () => ({
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          data: [{ revealed: false, answer: null, explanation: null, reference: null }],
          error: null,
        }),
      },
    }))
    const { revealQuizAnswer } = await import("../src/lib/quiz/attemptService")
    const result = await revealQuizAnswer("unknown-slug", 0)
    expect(result.revealed).toBe(false)
    expect(result.answer).toBeNull()
  })
})
