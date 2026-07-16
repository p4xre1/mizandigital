-- ============================================================
-- Mizan Platform — UI i18n payload seed (4-language)
-- Tables: interaction_ui_elements, account_management_elements,
--         user_interactions, user_settings
-- ============================================================

create table if not exists interaction_ui_elements (
  key text primary key,
  state text not null,
  ar text, fr text, en text, es text
);

create table if not exists account_management_elements (
  key text primary key,
  state text not null,
  ar text, fr text, en text, es text
);

-- Live user data tables synced from the app
create table if not exists user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  article_id uuid,
  interaction_type text not null check (interaction_type in ('like','save')),
  created_at timestamptz default now(),
  unique (user_id, article_id, interaction_type)
);

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  bio text,
  profile_picture_url text,
  preferred_lang text default 'ar' check (preferred_lang in ('ar','fr','en','es')),
  updated_at timestamptz default now()
);

-- ── interaction_ui_elements ──────────────────────────────────
insert into interaction_ui_elements (key, state, ar, fr, en, es) values
  ('like_active',   'article_actions', 'إلغاء الإعجاب', 'Aimé', 'Liked', 'Me Gusta'),
  ('save_active',   'article_actions', 'المحفوظات', 'Enregistré', 'Saved', 'Guardado'),
  ('save_inactive', 'article_actions', 'حفظ للمراجعة', 'Enregistrer', 'Bookmark Article', 'Guardar Artículo')
on conflict (key) do update set ar=excluded.ar, fr=excluded.fr, en=excluded.en, es=excluded.es;

-- ── account_management_elements ──────────────────────────────
insert into account_management_elements (key, state, ar, fr, en, es) values
  ('edit_username_label', 'edit_profile_modal', 'اسم المستخدم', 'Nom d''utilisateur', 'Username', 'Nombre de usuario'),
  ('edit_bio_label', 'edit_profile_modal', 'نبذة شخصية (Bio)', 'Biographie', 'Short Bio', 'Biografía'),
  ('change_pic_button', 'edit_profile_modal', 'تغيير الصورة الشخصية', 'Changer la photo de profil', 'Change Profile Picture', 'Cambiar foto de perfil'),
  ('update_success', 'edit_profile_modal', 'تم تحديث البيانات بنجاح!', 'Profil mis à jour avec succès !', 'Profile updated successfully!', '¡Perfil actualizado con éxito!'),
  ('delete_acc_button', 'danger_zone_account_deletion', 'حذف الحساب نهائياً', 'Supprimer définitivement le compte', 'Delete Account Permanently', 'Eliminar cuenta permanentemente'),
  ('delete_confirmation_warning', 'danger_zone_account_deletion',
    'تحذير: هذا الإجراء سيؤدي إلى حذف جميع بياناتك، ملفاتك المحفوظة، وإعجاباتك نهائياً من منصة ميزان ولا يمكن التراجع عنه.',
    'Attention : Cette action supprimera définitivement toutes vos données, documents enregistrés et mentions j''aime. Cette action est irréversible.',
    'Warning: This action will permanently erase all your data, saved documents, and likes from the Mizan Platform. This cannot be undone.',
    'Advertencia: Esta acción eliminará permanentemente todos sus datos, documentos guardados y me gusta. Esta acción es irreversible.'),
  ('confirm_delete_btn', 'danger_zone_account_deletion', 'نعم، احذف حسابي', 'Oui, supprimer mon compte', 'Yes, delete my account', 'Sí, eliminar mi cuenta')
on conflict (key) do update set ar=excluded.ar, fr=excluded.fr, en=excluded.en, es=excluded.es;

-- ── RLS ──────────────────────────────────────────────────────
alter table interaction_ui_elements enable row level security;
alter table account_management_elements enable row level security;
alter table user_interactions enable row level security;
alter table user_settings enable row level security;

create policy "Public read interaction ui" on interaction_ui_elements for select using (true);
create policy "Public read account ui" on account_management_elements for select using (true);

create policy "Users manage own interactions" on user_interactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
