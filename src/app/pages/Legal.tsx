import { useEffect } from "react";
import { useParams } from "react-router";
import { Shield, FileText, AlertTriangle, ScrollText } from "lucide-react";
import { useI18n, serifFont, sansFont, type Lang } from "../lib/i18n";
import { useSeo } from "../lib/seo";
import { setLegalArticleSchema, clearSchema } from "../lib/jsonld";

type Section = { h: Record<Lang, string>; p: Record<Lang, string> };
type Doc = {
  icon: React.ReactNode;
  titleKey: string;
  updated: string;
  intro: Record<Lang, string>;
  sections: Section[];
};

const s = (ar: string, fr: string, en: string, es: string) => ({ ar, fr, en, es });

const DOCS: Record<string, Doc> = {
  privacy: {
    icon: <Shield size={22} />,
    titleKey: "privacy",
    updated: "2026-07-01",
    intro: s(
      "تحترم منصة ميزان خصوصيتك وتلتزم بحماية بياناتك الشخصية وفقاً للقانون رقم 09-08 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي.",
      "La Plateforme Mizan respecte votre vie privée conformément à la loi n° 09-08 relative à la protection des données personnelles.",
      "Mizan Platform respects your privacy in accordance with Law No. 09-08 on the protection of personal data.",
      "La Plataforma Mizan respeta su privacidad conforme a la Ley n.º 09-08 sobre protección de datos personales."
    ),
    sections: [
      {
        h: s("البيانات التي نجمعها", "Données collectées", "Data We Collect", "Datos recopilados"),
        p: s(
          "نجمع البريد الإلكتروني، الاسم، الملفات المرفوعة، وبيانات الاستخدام التحليلية (Google Analytics).",
          "Nous collectons l'e-mail, le nom, les fichiers téléchargés et les données d'usage.",
          "We collect email, name, uploaded files, and analytics usage data.",
          "Recopilamos correo, nombre, archivos y datos de uso."
        ),
      },
      {
        h: s("استخدام البيانات", "Utilisation", "Use of Data", "Uso de datos"),
        p: s(
          "تُستخدم بياناتك لتشغيل حسابك، تخصيص المحتوى القانوني، وتحسين المنصة. لا نبيع بياناتك لأي طرف ثالث.",
          "Vos données servent à gérer votre compte et améliorer la plateforme. Aucune vente à des tiers.",
          "Your data operates your account and improves the platform. We never sell it.",
          "Sus datos operan su cuenta y mejoran la plataforma. Nunca los vendemos."
        ),
      },
      {
        h: s("حقوقك", "Vos droits", "Your Rights", "Sus derechos"),
        p: s(
          "لك الحق في الوصول إلى بياناتك وتصحيحها وحذفها نهائياً عبر 'منطقة الخطر' في ملفك الشخصي، مع حذف متتالٍ لجميع الملفات المرتبطة.",
          "Vous pouvez accéder, corriger et supprimer vos données via la « Zone de danger ».",
          "You may access, correct, and permanently delete your data via the Danger Zone.",
          "Puede acceder, corregir y eliminar sus datos en la Zona de peligro."
        ),
      },
    ],
  },
  terms: {
    icon: <FileText size={22} />,
    titleKey: "terms",
    updated: "2026-07-01",
    intro: s(
      "باستخدامك لمنصة ميزان فإنك توافق على شروط الاستخدام التالية التي تحكم علاقتك بالمنصة ومحتواها الأكاديمي.",
      "En utilisant la Plateforme Mizan, vous acceptez les présentes conditions d'utilisation.",
      "By using Mizan Platform, you agree to the following Terms of Use.",
      "Al usar la Plataforma Mizan, acepta los presentes Términos de uso."
    ),
    sections: [
      {
        h: s("الملكية الفكرية", "Propriété intellectuelle", "Intellectual Property", "Propiedad intelectual"),
        p: s(
          "المحتوى القانوني والمقالات ملك لأصحابها ويُنشر لأغراض تعليمية. يُمنع إعادة النشر التجاري دون إذن.",
          "Le contenu est protégé et destiné à un usage éducatif.",
          "Content is protected and intended for educational use.",
          "El contenido está protegido para uso educativo."
        ),
      },
      {
        h: s("سلوك المستخدم", "Conduite", "User Conduct", "Conducta"),
        p: s(
          "يلتزم المستخدم بعدم رفع محتوى مخالف للقانون أو ينتهك حقوق الغير.",
          "L'utilisateur s'engage à ne pas publier de contenu illicite.",
          "Users must not upload unlawful content.",
          "Los usuarios no deben subir contenido ilícito."
        ),
      },
      {
        h: s("إنهاء الحساب", "Résiliation", "Termination", "Terminación"),
        p: s(
          "يحق للمنصة تعليق الحسابات المخالفة. يمكنك حذف حسابك في أي وقت.",
          "La plateforme peut suspendre les comptes non conformes.",
          "The platform may suspend non-compliant accounts.",
          "La plataforma puede suspender cuentas."
        ),
      },
    ],
  },
  disclaimer: {
    icon: <AlertTriangle size={22} />,
    titleKey: "disclaimer",
    updated: "2026-07-01",
    intro: s(
      "المحتوى المقدم على منصة ميزان هو لأغراض تعليمية وإعلامية عامة فقط، ولا يشكل استشارة قانونية رسمية.",
      "Le contenu de Mizan est fourni à titre éducatif et ne constitue pas un conseil juridique.",
      "Content on Mizan is for educational purposes only and does not constitute legal advice.",
      "El contenido de Mizan es solo educativo y no constituye asesoramiento jurídico."
    ),
    sections: [
      {
        h: s("عدم وجود علاقة محاماة", "Absence de relation", "No Attorney Relationship", "Sin relación"),
        p: s(
          "لا ينشأ عن استخدام المنصة أي علاقة محامٍ-موكل. استشر محامياً مرخصاً للحالات الفعلية.",
          "Aucune relation avocat-client n'est créée. Consultez un avocat agréé.",
          "No attorney-client relationship is formed. Consult a licensed lawyer.",
          "No se crea relación abogado-cliente. Consulte a un abogado."
        ),
      },
      {
        h: s("دقة المعلومات", "Exactitude", "Accuracy", "Exactitud"),
        p: s(
          "رغم حرصنا على الدقة، قد تتغير القوانين. لا تضمن المنصة اكتمال أو حداثة كل محتوى.",
          "Les lois évoluent ; l'exactitude n'est pas garantie.",
          "Laws change; accuracy is not guaranteed.",
          "Las leyes cambian; no se garantiza exactitud."
        ),
      },
      {
        h: s("حدود المسؤولية", "Limitation", "Limitation of Liability", "Limitación"),
        p: s(
          "لا تتحمل منصة ميزان أي مسؤولية عن قرارات اتُّخذت بناءً على محتواها.",
          "Mizan décline toute responsabilité pour les décisions prises.",
          "Mizan disclaims liability for decisions based on its content.",
          "Mizan no asume responsabilidad por decisiones tomadas."
        ),
      },
    ],
  },
};

export default function Legal() {
  const { doc } = useParams();
  const { lang, dir, t } = useI18n();
  const activeDocKey = doc && DOCS[doc] ? doc : "privacy";
  const data = DOCS[activeDocKey];

  useSeo(
    {
      title: t(data.titleKey),
      description: data.intro[lang],
      path: `/legal/${activeDocKey}`,
      lang,
    },
    [lang, activeDocKey, data, t]
  );

  useEffect(() => {
    setLegalArticleSchema({
      headline: t(data.titleKey),
      description: data.intro[lang],
      slug: `/legal/${activeDocKey}`,
      lang,
      datePublished: data.updated,
    });
    return () => clearSchema("ld-legal");
  }, [data, activeDocKey, lang, t]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12" dir={dir}>
      <div className="flex items-center gap-3 mb-2 text-primary">
        {data.icon}
        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: serifFont(lang) }}
        >
          {t(data.titleKey)}
        </h1>
      </div>

      <p className="text-xs text-muted-foreground font-mono mb-8 flex items-center gap-1.5">
        <ScrollText size={12} /> {lang === "ar" ? "آخر تحديث" : "Updated"}: {data.updated}
      </p>

      <p
        className="text-base leading-relaxed text-foreground mb-10 pb-6 border-b border-border"
        style={{ fontFamily: sansFont(lang) }}
      >
        {data.intro[lang]}
      </p>

      <div className="space-y-8">
        {data.sections.map((sec, i) => (
          <section key={i}>
            <h2
              className="text-lg font-bold text-foreground mb-2 flex items-center gap-2"
              style={{ fontFamily: serifFont(lang) }}
            >
              <span className="text-primary font-mono text-sm">
                {String(i + 1).padStart(2, "0")}
              </span>
              {sec.h[lang]}
            </h2>
            <p
              className="text-sm leading-relaxed text-muted-foreground"
              style={{ fontFamily: sansFont(lang) }}
            >
              {sec.p[lang]}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}