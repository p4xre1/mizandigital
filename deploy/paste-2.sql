-- deploy/paste-2.sql — الحزمة الثانية (5 KB)
-- طبق هذا الملف ثانياً في Supabase SQL Editor، منفصل عن paste-1
-- السبب: الجمع بينهما قد يفشل بسبب "unsafe use of new value member of enum type user_role"

\i '../supabase/migrations/20260923000000_governance_and_reports.sql'

-- للنسخ السريع: افتح supabase/migrations/20260923000000_governance_and_reports.sql وانسخه كاملاً ثم Run
-- لا تطبق 20260920000000_protect_progression_and_quiz_answers.sql إلا بعد نشر الواجهة الأمامية الجديدة
