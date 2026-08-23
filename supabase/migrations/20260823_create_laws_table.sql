-- =====================================================================
-- إنشاء جدول "laws" (الأرشيف القانوني/النصوص التشريعية العامة)
-- يُستخدم من صفحة الإدارة src/pages/admin/LawsPage.tsx
-- وصفحة العرض العامة src/pages/public/ArchivePage.tsx
--
-- طريقة التنفيذ: افتح Supabase Dashboard -> SQL Editor -> الصق هذا
-- الملف بالكامل ثم اضغط Run.
-- =====================================================================

create table if not exists public.laws (
  id                        uuid primary key default gen_random_uuid(),
  title                     text not null,
  law_number                text,
  description               text,
  official_gazette_number   text,
  publication_date          date,
  pdf_url                   text,
  slug                      text not null unique,
  category_id               uuid references public.categories(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists laws_category_id_idx on public.laws (category_id);
create index if not exists laws_slug_idx on public.laws (slug);

-- تحديث updated_at تلقائياً عند كل تعديل
create or replace function public.set_laws_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_laws_updated_at on public.laws;
create trigger trg_laws_updated_at
  before update on public.laws
  for each row execute function public.set_laws_updated_at();

-- تفعيل Row Level Security
alter table public.laws enable row level security;

-- القراءة متاحة للجميع (الموقع العام يعرض النصوص القانونية لكل الزوار)
drop policy if exists "laws_public_read" on public.laws;
create policy "laws_public_read"
  on public.laws for select
  using (true);

-- الإضافة/التعديل/الحذف متاحة فقط للمستخدمين المسجّلين (لوحة التحكم)
drop policy if exists "laws_admin_insert" on public.laws;
create policy "laws_admin_insert"
  on public.laws for insert
  to authenticated
  with check (true);

drop policy if exists "laws_admin_update" on public.laws;
create policy "laws_admin_update"
  on public.laws for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "laws_admin_delete" on public.laws;
create policy "laws_admin_delete"
  on public.laws for delete
  to authenticated
  using (true);

-- =====================================================================
-- إضافة عمود "legal_sources" لجدول "lexicon_terms"
-- يخزّن "الشجرة القانونية" لكل مصطلح: القوانين/المدونات التي يرد فيها،
-- مع أرقام الفصول/المواد والمقتضى القانوني لكل واحدة منها.
-- يُستخدم من صفحة الإدارة src/pages/admin/lexicon/LexiconPage.tsx
-- وصفحة العرض العامة src/pages/public/TermPage.tsx
-- =====================================================================

alter table public.lexicon_terms
  add column if not exists legal_sources jsonb not null default '[]'::jsonb;

comment on column public.lexicon_terms.legal_sources is
  'شجرة قانونية: مصفوفة كائنات { code_ar, code_short?, code_fr?, articles: [{ number, phrase }] }';
