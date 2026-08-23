-- =====================================================================
-- 1) إضافة أعمدة السيو لجدول "news"
--    تُستخدم من src/pages/admin/NewsManagementPage.tsx (أداة SEO Injection)
--    ومن صفحتي العرض src/pages/public/NewsPage.tsx / ArticlePage.tsx
--
-- 2) إنشاء جدول "trending_topics" (الاتجاهات القانونية الرائجة)
--    يُستخدم من صفحة الإدارة الجديدة src/pages/admin/TrendingTopicsPage.tsx
--    لتدوين المواضيع القانونية الرائجة (يدوياً أو انطلاقاً من روابط بحث خارجية)
--    وتحويلها بسرعة إلى مقال/خبر جديد بكلمة مفتاحية جاهزة.
--
-- طريقة التنفيذ: افتح Supabase Dashboard -> SQL Editor -> الصق هذا
-- الملف بالكامل ثم اضغط Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) أعمدة السيو الإضافية لجدول الأخبار
-- ---------------------------------------------------------------------
alter table public.news
  add column if not exists target_keyword  text,
  add column if not exists meta_title      text,
  add column if not exists meta_description text;

comment on column public.news.target_keyword  is 'الكلمة المفتاحية المستهدفة لتحسين محركات البحث لهذا الخبر';
comment on column public.news.meta_title      is 'عنوان السيو (Meta Title) المخصص لهذا الخبر — إن ترك فارغاً يُستخدم العنوان الأساسي';
comment on column public.news.meta_description is 'وصف السيو (Meta Description) المخصص لهذا الخبر — إن ترك فارغاً يُستخدم الموجز';

-- ---------------------------------------------------------------------
-- 2) جدول الاتجاهات القانونية الرائجة
-- ---------------------------------------------------------------------
create table if not exists public.trending_topics (
  id            uuid primary key default gen_random_uuid(),
  topic         text not null,
  notes         text,
  category      text,                                   -- يستعمل نفس تصنيفات src/lib/seo/keywords.ts (اختياري)
  status        text not null default 'new'              -- new | in_progress | published | archived
                  check (status in ('new', 'in_progress', 'published', 'archived')),
  priority      text not null default 'medium'           -- low | medium | high
                  check (priority in ('low', 'medium', 'high')),
  source_note   text,                                     -- مصدر الرصد اليدوي (Google Trends / X / صحيفة...)
  linked_article_id uuid references public.articles(id) on delete set null,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists trending_topics_status_idx on public.trending_topics (status);
create index if not exists trending_topics_priority_idx on public.trending_topics (priority);

create or replace function public.set_trending_topics_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_trending_topics_updated_at on public.trending_topics;
create trigger trg_trending_topics_updated_at
  before update on public.trending_topics
  for each row execute function public.set_trending_topics_updated_at();

alter table public.trending_topics enable row level security;

-- الرصد والإدارة الكاملة متاحة فقط للمستخدمين المسجّلين (فريق التحرير)
drop policy if exists "trending_topics_admin_select" on public.trending_topics;
create policy "trending_topics_admin_select"
  on public.trending_topics for select
  to authenticated
  using (true);

drop policy if exists "trending_topics_admin_insert" on public.trending_topics;
create policy "trending_topics_admin_insert"
  on public.trending_topics for insert
  to authenticated
  with check (true);

drop policy if exists "trending_topics_admin_update" on public.trending_topics;
create policy "trending_topics_admin_update"
  on public.trending_topics for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "trending_topics_admin_delete" on public.trending_topics;
create policy "trending_topics_admin_delete"
  on public.trending_topics for delete
  to authenticated
  using (true);
