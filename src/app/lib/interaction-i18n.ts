// Mizan Platform — interaction & account UI payload (4-language, RTL/LTR aware)
// Sync targets: Supabase tables `interaction_ui_elements`, `account_management_elements`

export type Lang = "ar" | "fr" | "en" | "es";

export const LANG_DIR: Record<Lang, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
  es: "ltr",
};

export const interactionUIElements = {
  article_actions: {
    like_active: { ar: "إلغاء الإعجاب", fr: "Aimé", en: "Liked", es: "Me Gusta" },
    save_active: { ar: "المحفوظات", fr: "Enregistré", en: "Saved", es: "Guardado" },
    save_inactive: { ar: "حفظ للمراجعة", fr: "Enregistrer", en: "Bookmark Article", es: "Guardar Artículo" },
  },
} as const;

export const accountManagementElements = {
  edit_profile_modal: {
    edit_username_label: { ar: "اسم المستخدم", fr: "Nom d'utilisateur", en: "Username", es: "Nombre de usuario" },
    edit_bio_label: { ar: "نبذة شخصية (Bio)", fr: "Biographie", en: "Short Bio", es: "Biografía" },
    change_pic_button: { ar: "تغيير الصورة الشخصية", fr: "Changer la photo de profil", en: "Change Profile Picture", es: "Cambiar foto de perfil" },
    update_success: { ar: "تم تحديث البيانات بنجاح!", fr: "Profil mis à jour avec succès !", en: "Profile updated successfully!", es: "¡Perfil actualizado con éxito!" },
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
  },
} as const;

export const backendActionTriggers = {
  supabase_storage_bucket: "profile-pictures",
  supabase_edge_function_trigger: "deleteUserAccount Cascade",
} as const;
