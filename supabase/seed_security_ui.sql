-- ============================================================
-- Mizan Platform — security_ui_elements seed (Secured)
-- ============================================================

-- ملاحظة تنظيمية: يُفضل مستقبلاً نقل الـ CREATE TABLE إلى ملف schema.sql الأساسي
create table if not exists security_ui_elements (
  key text primary key,
  node text not null,
  ar text, fr text, en text, es text
);

alter table security_ui_elements enable row level security;

-- 1. حماية السياسات من التكرار عند إعادة التشغيل
drop policy if exists "Public read security ui" on security_ui_elements;
drop policy if exists "Admins full access to security ui" on security_ui_elements;

-- 2. سياسة القراءة العامة (لجميع الزوار والموقع)
create policy "Public read security ui" on security_ui_elements for select using (true);

-- 3. سياسة التحكم الكامل للأدمن (تعديل وتحديث العناصر من الـ CMS)
create policy "Admins full access to security ui" on security_ui_elements for all using (public.is_admin());

-- 4. إدخال وتحديث البيانات بشكل آمن
insert into security_ui_elements (key, node, ar, fr, en, es) values
  ('encryption_badge', 'encryption_status_labels',
    'تشفير عسكري نشط (AES-256)', 'Chiffrement Militaire Actif (AES-256)',
    'Military-Grade Encryption Active (AES-256)', 'Cifrado Grado Militar Activo (AES-256)'),
    
  ('hash_status', 'encryption_status_labels',
    'حماية كلمة المرور: مشفرة ومحمية (Argon2 / bcrypt)', 'Protection du mot de passe : Haché (Argon2 / bcrypt)',
    'Password Protection: Securely Hashed (Argon2 / bcrypt)', 'Protección de Contraseña: Hash Seguro (Argon2 / bcrypt)'),
    
  ('data_privacy_heading', 'security_dashboard_texts',
    'حماية البيانات والخصوصية المشددة', 'Protection des Données & Haute Sécurité',
    'Data Protection & High Security', 'Protección de Datos y Alta Seguridad'),
    
  ('security_description', 'security_dashboard_texts',
    'يتم تشفير جميع ملفات السيرة الذاتية (Resumes) والوثائق المرفوعة على منصة ميزان تلقائياً باستخدام بروتوكول AES-256 قبل تخزينها in Cloudflare D1 وSupabase Storage. كلمات المرور يتم تحويلها إلى هاش مشفر غير قابل للتراجع، مما يضمن أماناً مطلقاً لحسابك.',
    'Tous vos CV (Resumes) et documents téléchargés sur Mizan sont automatiquement chiffrés via AES-256 avant stockage sur Cloudflare D1 et Supabase Storage. Les mots de passe sont hachés de manière irréversible, garantissant une sécurité absolue.',
    'All resumes and legal documents uploaded to Mizan are automatically encrypted using AES-256 before being stored in Cloudflare D1 and Supabase Storage. Passwords are irreversibly hashed, ensuring absolute security for your account.',
    'Todos los currículums (Resumes) y documentos subidos a Mizan se cifran automáticamente mediante AES-256 antes de guardarse en Cloudflare D1 y Supabase Storage. Las contraseñas se procesan con hash irreversible.')
on conflict (key) do update set 
  node = excluded.node, -- تم إضافة تحديث الـ node لضمان مرونة الهيكلة مستقبلاً
  ar = excluded.ar, 
  fr = excluded.fr, 
  en = excluded.en, 
  es = excluded.es;