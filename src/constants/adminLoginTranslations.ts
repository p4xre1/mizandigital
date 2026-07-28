/* cSpell:disable */
/* eslint-disable */

export type SupportedLang = "ar" | "fr" | "en" | "es";

export function getRateLimitMessage(lang: string, sec: number): string {
    switch (lang) {
        case "ar":
            return `⚠️ تم تجاوز حد المحاولات. يرجى الانتظار ${sec} ثانية`;
        case "fr":
            return `⚠️ Limite de tentatives dépassée. Attendez ${sec}s`;
        case "es":
            return `⚠️ Límite de intentos superado. Espere ${sec}s`;
        default:
            return `⚠️ Rate limit exceeded. Standby ${sec}s`;
    }
}

export const ADMIN_TRANSLATIONS = {
    ar: {
        seoTitle: "بوابة الإدارة المشفرة | منصة ميزان القانونية",
        seoDesc: "بوابة الدخول الآمنة للوحة التحكم والإدارة لمنصة ميزان الرقمية.",
        securityZone: "منطقة أمنية :: المستوى 4",
        sysStatus: "النظام محمي",
        gatewayTitle: "لوحة تحكم الإدارة",
        gatewaySubtitle: "بوابة ميزان المشفرة لإدارة المحتوى والأمن",
        identityPlaceholder: "معرف المشغل / البريد / اسم المستخدم",
        identityLabel: "اسم المستخدم أو البريد الإلكتروني",
        passPlaceholder: "مفتاح المرور المشفر",
        passLabel: "كلمة المرور",
        loginBtn: "تسجيل الدخول الآمن",
        authenticating: "جاري المصادقة والتشفير...",
        emptyFieldsErr: "يرجى تقديم بيانات الاعتماد كاملة والصالحة.",
        authFailedErr: "فشل في المصادقة. البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        permVerifyErr: "فشل في التحقق من صلاحيات المشغل.",
        accountFrozenErr: "هذا الحساب مجمد حالياً. يرجى مراجعة مسؤول الأمن السيبراني.",
        accessDeniedErr: "عذراً، لا تملك الصلاحيات الإدارية المطلوبة للوصول.",
        systemErrorErr: "حدث خطأ غير متوقع في النظام. حاول لاحقاً.",
        footerRestricted: "وصول مقيد · للأشخاص المصرح لهم فقط",
        footerMonitored: "جميع محاولات الدخول مسجلة ومراقبة بأعلى درجات التشفير",
        backToSite: "العودة للموقع الرئيسي",
    },
    fr: {
        seoTitle: "Portail d'Administration Chiffré | Plateforme Mizan",
        seoDesc: "Portail de connexion sécurisé pour le panneau d'administration Mizan.",
        securityZone: "ZONE SEC :: NIVEAU-4",
        sysStatus: "SYS_OK",
        gatewayTitle: "Panneau d'Administration",
        gatewaySubtitle: "PASSERELLE CMS CHIFFRÉE MIZAN",
        identityPlaceholder: "ID OPÉRATEUR / EMAIL / USERNAME",
        identityLabel: "Identifiant ou E-mail",
        passPlaceholder: "CLÉ D'ACCÈS / MOT DE PASSE",
        passLabel: "Mot de passe",
        loginBtn: "CONNEXION SÉCURISÉE",
        authenticating: "AUTHENTIFICATION EN COURS...",
        emptyFieldsErr: "Veuillez fournir des identifiants valides.",
        authFailedErr: "Échec d'authentification. Identifiants invalides.",
        permVerifyErr: "Impossible de vérifier les autorisations du compte.",
        accountFrozenErr: "Le compte est suspendu. Contactez le support système.",
        accessDeniedErr: "Accès refusé. Privilèges administratifs requis.",
        systemErrorErr: "Une erreur système inattendue s'est produite.",
        footerRestricted: "ACCÈS RESTREINT · PERSONNEL AUTORISÉ UNIQUEMENT",
        footerMonitored: "TOUTES LES TENTATIVES DE CONNEXION SONT ENREGISTRÉES",
        backToSite: "Retour au site principal",
    },
    en: {
        seoTitle: "Encrypted Admin Gateway | Mizan Legal Platform",
        seoDesc: "Secure administrative login portal for Mizan Digital System.",
        securityZone: "SEC-ZONE :: LEVEL-4",
        sysStatus: "SYS_OK",
        gatewayTitle: "Admin Control Center",
        gatewaySubtitle: "MIZAN ENCRYPTED CMS GATEWAY",
        identityPlaceholder: "OPERATOR_ID / EMAIL / USERNAME",
        identityLabel: "Username or Email",
        passPlaceholder: "ACCESS_KEY / PASSWORD",
        passLabel: "Password",
        loginBtn: "SECURE LOGIN",
        authenticating: "AUTHENTICATING...",
        emptyFieldsErr: "Please provide valid credentials.",
        authFailedErr: "Authentication failure. Invalid credentials.",
        permVerifyErr: "Failed to verify account permissions.",
        accountFrozenErr: "Account is frozen. Contact system administrator.",
        accessDeniedErr: "Access denied. Administrative privileges required.",
        systemErrorErr: "An unexpected system error occurred.",
        footerRestricted: "RESTRICTED ACCESS · AUTHORIZED PERSONNEL ONLY",
        footerMonitored: "ALL LOGIN ATTEMPTS ARE LOGGED & MONITORED",
        backToSite: "Back to main site",
    },
    es: {
        seoTitle: "Portal de Administración Cifrado | Plataforma Mizan",
        seoDesc: "Portal de inicio de sesión seguro para la administración de Mizan.",
        securityZone: "ZONA-SEC :: NIVEL-4",
        sysStatus: "SISTEMA_OK",
        gatewayTitle: "Panel de Administración",
        gatewaySubtitle: "PASARELA CMS CIFRADA MIZAN",
        identityPlaceholder: "ID OPERADOR / CORREO / USUARIO",
        identityLabel: "Usuario o Correo Electrónico",
        passPlaceholder: "CLAVE DE ACCESO / CONTRASEÑA",
        passLabel: "Contraseña",
        loginBtn: "INICIAR SESIÓN SEGURA",
        authenticating: "AUTENTICANDO...",
        emptyFieldsErr: "Por favor proporcione credenciales válidas.",
        authFailedErr: "Fallo de autenticación. Credenciales inválidas.",
        permVerifyErr: "No se pudieron verificar los permisos de la cuenta.",
        accountFrozenErr: "Cuenta congelada. Contacte al administrador del sistema.",
        accessDeniedErr: "Acceso denegado. Se requieren privilegios administrativos.",
        systemErrorErr: "Ocurrió un error inesperado en el sistema.",
        footerRestricted: "ACCESO RESTRINGIDO · SÓLO PERSONAL AUTORIZADO",
        footerMonitored: "TODOS LOS INTENTOS SON REGISTRADOS Y MONITOREADOS",
        backToSite: "Volver al sitio principal",
    },
} as const;

export default ADMIN_TRANSLATIONS;