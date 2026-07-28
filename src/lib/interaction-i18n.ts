// noinspection SpellCheckingInspection
// Mizan Platform — interaction & account UI payload (4-language, RTL/LTR aware)
// Sync targets: Supabase tables `interaction_ui_elements`, `account_management_elements`

export type Lang = "ar" | "fr" | "en" | "es";

export type LocalizedText = Record<Lang, string>;

// noinspection SpellCheckingInspection
export const interactionUIElements = {
  article_actions: {
    like_active: { ar: "إلغاء الإعجاب", fr: "Aimé", en: "Liked", es: "Me Gusta" },
    like_inactive: { ar: "إعجاب", fr: "J'aime", en: "Like", es: "Dar me gusta" },
    save_active: { ar: "المحفوظات", fr: "Enregistré", en: "Saved", es: "Guardado" },
    save_inactive: { ar: "حفظ للمراجعة", fr: "Enregistrer", en: "Bookmark", es: "Guardar Artículo" },
    share: { ar: "مشاركة", fr: "Partager", en: "Share", es: "Compartir" },
  },
} as const satisfies Record<string, Record<string, LocalizedText>>;

// noinspection SpellCheckingInspection
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