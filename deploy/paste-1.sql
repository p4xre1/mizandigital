-- deploy/paste-1.sql — الحزمة الأولى (142 KB تقريباً)
-- طبق هذا الملف أولاً في Supabase SQL Editor
-- يحتوي على: payments + reactions + جزء من governance
-- ملاحظة: لا يحتوي على 20260920000000_protect_progression_and_quiz_answers.sql (يحتاج frontend أولاً)

\i '../supabase/migrations/20260921000000_payments_and_credits.sql'
\i '../supabase/migrations/20260922000000_reactions.sql'

-- في حال كان \i غير مدعوم في Dashboard، انسخ محتوى الملفات يدوياً:
-- 1) افتح supabase/migrations/20260921000000_payments_and_credits.sql وانسخه كاملاً ثم Run
-- 2) افتح supabase/migrations/20260922000000_reactions.sql وانسخه كاملاً ثم Run

-- للنسخ السريع، المحتوى الكامل مضمن أدناه عند التصدير — هذا الملف هو مرجع فقط
-- استعمل الملفات الأصلية في supabase/migrations/ مباشرة
