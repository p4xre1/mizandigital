-- ============================================================
-- Mizan Platform — Supabase Schema (Updated & Secured)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- 1. Profiles Table (إدارة المستخدمين والرتب)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text default 'user' check (role in ('user', 'admin')),
  tier text default 'free',
  updated_at timestamptz default now()
);

-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_fr text,
  slug text unique not null,
  description text,
  icon text,
  count integer default 0
);

-- Universities
create table if not exists universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  slug text unique not null
);

-- Articles
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_fr text,
  slug text unique not null,
  content text,
  excerpt text,
  category text not null, -- يمكن ربطها لاحقاً بـ references categories(slug)
  tags text[],
  author text,
  university text,
  semester text,
  year integer,
  pdf_url text,
  views integer default 0,
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contact messages
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz default now()
);

-- ── RLS Security & Policies ──────────────────────────────────

alter table public.profiles enable row level security;
alter table articles enable row level security;
alter table categories enable row level security;
alter table universities enable row level security;
alter table contacts enable row level security;

-- دالة مساعدة للتحقق هل المستخدم الحالي هو أدمن أم لا
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- سياسات جدول الـ Profiles
create policy "Public read profiles" on public.profiles for select using (true);
create policy "Admins can update profiles" on public.profiles for update using (public.is_admin());

-- سياسات القراءة العامة (للجميع)
create policy "Public read articles" on articles for select using (true);
create policy "Public read categories" on categories for select using (true);
create policy "Public read universities" on universities for select using (true);

-- سياسات التحكم الكامل للأدمن (إضافة، تعديل، حذف)
create policy "Admins full access to articles" on articles for all using (public.is_admin());
create policy "Admins full access to categories" on categories for all using (public.is_admin());
create policy "Admins full access to universities" on universities for all using (public.is_admin());

-- سياسة الرسائل (أي شخص يرسل، والأدمن فقط يقرأ ويحذف)
create policy "Public insert contacts" on contacts for insert with check (true);
create policy "Admins full access to contacts" on contacts for all using (public.is_admin());

-- ── Automated Triggers ────────────────────────────────────────

-- دالة لإنشاء بروفايل تلقائياً لأي مستخدم جديد يسجل بالموقع
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, tier)
  values (new.id, 'user', 'free');
  return new;
end;
$$ language plpgsql security definer;

-- تشغيل التريجر عند التسجيل
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Functions ────────────────────────────────────────────────

-- Increment article views
create or replace function increment_views(article_id uuid)
returns void as $$
  update articles set views = views + 1 where id = article_id;
$$ language sql security definer;

-- ── Indexes ───────────────────────────────────────────────────

create index if not exists articles_slug_idx on articles(slug);
create index if not exists articles_category_idx on articles(category);
create index if not exists articles_semester_idx on articles(semester);
create index if not exists articles_university_idx on articles(university);
create index if not exists articles_featured_idx on articles(is_featured);

-- ── Sample seed data ─────────────────────────────────────────

insert into categories (name, name_fr, slug, count) values
  ('قانون الأسرة', 'Droit de la famille', 'family-law', 120),
  ('القانون الجنائي', 'Droit pénal', 'criminal-law', 95),
  ('القانون التجاري', 'Droit commercial', 'commercial-law', 88),
  ('القانون الإداري', 'Droit administratif', 'administrative-law', 74),
  ('القانون الدستوري', 'Droit constitutionnel', 'constitutional-law', 56)
on conflict (slug) do nothing;

insert into universities (name, city, slug) values
  ('جامعة محمد الخامس', 'الرباط', 'um5'),
  ('جامعة الحسن الثاني', 'الدار البيضاء', 'uh2'),
  ('جامعة القاضي عياض', 'مراكش', 'uqa'),
  ('جامعة محمد الأول', 'وجدة', 'umo'),
  ('جامعة ابن طفيل', 'القنيطرة', 'usa')
on conflict (slug) do nothing;

insert into articles (title, slug, excerpt, category, university, semester, year, views, is_featured, tags) values
  (
    'أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026',
    'family-law-s1-2026',
    'نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة.',
    'قانون الأسرة', 'محمد الخامس — الرباط', 's1', 2026, 4200, true,
    ARRAY['S1', '2026', 'مدوّنة الأسرة', 'الزواج', 'الطلاق']
  ),
  (
    'مستجدات قانون المسطرة الجنائية — تعديلات 2025',
    'criminal-procedure-2025',
    'تحليل معمّق للتعديلات الأخيرة على قانون المسطرة الجنائية المغربي.',
    'القانون الجنائي', null, null, 2025, 2800, false,
    ARRAY['المسطرة الجنائية', '2025']
  )
on conflict (slug) do nothing;