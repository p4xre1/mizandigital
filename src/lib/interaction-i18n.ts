// Mizan Platform — interaction & account UI payload (4-language, RTL/LTR aware)
// Sync targets: Supabase tables `interaction_ui_elements`, `account_management_elements`

export type Lang = "ar" | "fr" | "en" | "es";

export const LANG_DIR: Record<Lang, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
  es: "ltr",
};

export type LocalizedText = Record<Lang, string>;

export const interactionUIElements = {
  article_actions: {
    like_active: { ar: "إلغاء الإعجاب", fr: "Aimé", en: "Liked", es: "Me Gusta" },
    like_inactive: { ar: "إعجاب", fr: "J'aime", en: "Like", es: "Dar me gusta" },
    save_active: { ar: "المحفوظات", fr: "Enregistré", en: "Saved", es: "Guardado" },
    save_inactive: { ar: "حفظ للمراجعة", fr: "Enregistrer", en: "Bookmark", es: "Guardar Artículo" },
    share: { ar: "مشاركة", fr: "Partager", en: "Share", es: "Compartir" },
  },
} as const satisfies Record<string, Record<string, LocalizedText>>;

export const accountManagementElements = {
  edit_profile_modal: {
    edit_username_label: { ar: "اسم المستخدم", fr: "Nom d'utilisateur", en: "Username", es: "Nombre de usuario" },
    edit_bio_label: { ar: "نبذة شخصية (Bio)", fr: "Biographie", en: "Short Bio", es: "Biografía" },
    change_pic_button: { ar: "تغيير الصورة الشخصية", fr: "Changer la photo de profil", en: "Change Profile Picture", es: "Cambiar foto de perfil" },
    update_success: { ar: "تم تحديث البيانات بنجاح!", fr: "Profil mis à jour avec succès !", en: "Profile updated successfully!", es: "¡Perfil actualizado con éxito!" },
    save_changes_btn: { ar: "حفظ التعديلات", fr: "Enregistrer", en: "Save Changes", es: "Guardar cambios" },
    cancel_btn: { ar: "إلغاء", fr: "Annuler", en: "Cancel", es: "Cancelar" },
  },
  danger_zone_account_deletion: {
    delete_acc_button: { ar: "حذف الحساب نهائياً", fr: "Supprimer définitivement le compte", en: "Delete Account Permanently", es: "Eliminar cuenta permanentemente" },
    delete_confirmation_warning: {
      ar: "تحذير: هذا الإجراء سيؤدي إلى حذف جميع بياناتك، ملفاتك المحفوظة، وإعجاباتك نهائياً من منصة ميزان ولا يمكن التراجع عنه.",
      fr: "Attention : Cette action supprimera définitivement toutes vos données, documents enregistrés et mentions j'aime. Cette action est irréversible.",
      en: "Warning: This action will permanently erase all your data, saved documents, and likes from the Mizan Platform. This cannot be undone.",
      es: "Advertencia: Esta acción eliminará permanentemente todos sus datos, documentos guardados y me gusta. Esta acción es irreversible.",
    },
    confirm_delete_btn: { ar: "نعم، احذف حسابي", fr: "Oui, supprimer mon compte", en: "Yes, delete my account", es: "Sí, eliminar mi cuenta" },
    cancel_delete_btn: { ar: "تراجع", fr: "Annuler", en: "Cancel", es: "Cancelar" },
  },
} as const satisfies Record<string, Record<string, LocalizedText>>;

// 🚀 NEW: Role and Permission Management UI Elements based on `useRole` hook
export const roleManagementElements = {
  role_badges: {
    root: { ar: "المدير العام", fr: "Super Administrateur", en: "Root Admin", es: "Super Administrador" },
    security_admin: { ar: "مدير الأمن", fr: "Admin Sécurité", en: "Security Admin", es: "Admin de Seguridad" },
    admin: { ar: "مدير", fr: "Administrateur", en: "Admin", es: "Administrador" },
    marketer: { ar: "مسوق", fr: "Marketeur", en: "Marketer", es: "Especialista en Marketing" },
    writer: { ar: "كاتب", fr: "Rédacteur", en: "Writer", es: "Escritor" },
    member: { ar: "عضو", fr: "Membre", en: "Member", es: "Miembro" },
    guest: { ar: "زائر", fr: "Invité", en: "Guest", es: "Invitado" },
  },
  permissions: {
    is_staff: { ar: "طاقم العمل", fr: "Équipe", en: "Staff", es: "Equipo" },
    can_manage_users: { ar: "إدارة المستخدمين", fr: "Gérer les utilisateurs", en: "Manage Users", es: "Gestionar usuarios" },
    can_write_content: { ar: "إدارة المحتوى", fr: "Gérer le contenu", en: "Manage Content", es: "Gestionar contenido" },
  }
} as const satisfies Record<string, Record<string, LocalizedText>>;

export const backendActionTriggers = {
  supabase_storage_bucket: "profile-pictures",
  supabase_edge_function_trigger: "deleteUserAccount Cascade",
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely extracts localized string directly from a LocalizedText object
 * Fallbacks to Arabic, then English if the requested language is completely missing.
 */
export function getInteractionText(
  item: LocalizedText | { readonly [K in Lang]: string } | undefined,
  lang: Lang
): string {
  if (!item) return "";
  return item[lang] || item["ar"] || item["en"] || "";
}

/**
 * Safely resolves dot-notation paths (e.g. "role_badges.root" or "article_actions.like_active")
 * Returns the path itself if the translation is not found.
 */
export function getInteractionKey(path: string, lang: Lang): string {
  if (!path || typeof path !== "string") return "";

  const parts = path.split(".");
  if (parts.length !== 2) return path;

  const [category, key] = parts;

  // Type assertion since we know the structure of these objects
  const interactionScope = interactionUIElements as Record<string, Record<string, LocalizedText>>;
  const accountScope = accountManagementElements as Record<string, Record<string, LocalizedText>>;
  const roleScope = roleManagementElements as Record<string, Record<string, LocalizedText>>; // 👈 Added Role Scope

  // Search across all scopes
  const target = 
    interactionScope[category]?.[key] || 
    accountScope[category]?.[key] || 
    roleScope[category]?.[key]; // 👈 Integrated Role Scope

  if (target) {
    return getInteractionText(target, lang);
  }

  // Fallback: return the requested path so the developer spots the missing key
  return path;
}