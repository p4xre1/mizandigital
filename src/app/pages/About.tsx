import { Scale, BookOpen, GraduationCap, Globe, Award } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../lib/i18n";
import { useSeo } from "../lib/seo";

export default function About() {
  const { lang, dir } = useI18n();

  useSeo(
    {
      title:
        lang === "ar"
          ? "من نحن"
          : lang === "fr"
          ? "À propos de nous"
          : lang === "es"
          ? "Sobre nosotros"
          : "About Us",
      description:
        "منصة ميزان هي المجلة القانونية الرقمية الأولى المتخصصة في توثيق وأرشفة المحتوى القانوني المغربي.",
      path: "/about",
      lang,
    },
    [lang]
  );

  const TEAM = [
    {
      name:
        lang === "ar"
          ? "د. محمد العلوي"
          : lang === "fr"
          ? "Dr. Mohamed Al-Alawi"
          : lang === "es"
          ? "Dr. Mohamed Al-Alawi"
          : "Dr. Mohamed Al-Alawi",
      role:
        lang === "ar"
          ? "رئيس التحرير"
          : lang === "fr"
          ? "Rédacteur en chef"
          : lang === "es"
          ? "Editor en jefe"
          : "Editor-in-Chief",
      specialty:
        lang === "ar"
          ? "أستاذ القانون الخاص — جامعة محمد الخامس"
          : lang === "fr"
          ? "Professeur de droit privé — Université Mohammed V"
          : lang === "es"
          ? "Profesor de Derecho Privado — Universidad Mohammed V"
          : "Professor of Private Law — Mohammed V University",
    },
    {
      name:
        lang === "ar"
          ? "ذ. سارة بنعلي"
          : lang === "fr"
          ? "Me. Sarah Benali"
          : lang === "es"
          ? "Sra. Sarah Benali"
          : "Ms. Sarah Benali",
      role:
        lang === "ar"
          ? "مديرة الأرشيف"
          : lang === "fr"
          ? "Directrice des archives"
          : lang === "es"
          ? "Directora de Archivos"
          : "Archive Director",
      specialty:
        lang === "ar"
          ? "دكتوراه في القانون الجنائي — جامعة الحسن الثاني"
          : lang === "fr"
          ? "Doctorat en droit pénal — Université Hassan II"
          : lang === "es"
          ? "Doctora en Derecho Penal — Universidad Hassan II"
          : "Ph.D. in Criminal Law — Hassan II University",
    },
    {
      name:
        lang === "ar"
          ? "ذ. يوسف الإدريسي"
          : lang === "fr"
          ? "Me. Youssef El Idrissi"
          : lang === "es"
          ? "Sr. Youssef El Idrissi"
          : "Mr. Youssef El Idrissi",
      role:
        lang === "ar"
          ? "محرر أول"
          : lang === "fr"
          ? "Éditeur sénior"
          : lang === "es"
          ? "Editor Senior"
          : "Senior Editor",
      specialty:
        lang === "ar"
          ? "ماستر في القانون الدولي — جامعة القاضي عياض"
          : lang === "fr"
          ? "Master en droit international — Université Cadi Ayyad"
          : lang === "es"
          ? "Máster en Derecho Internacional — Universidad Cadi Ayyad"
          : "Master in International Law — Cadi Ayyad University",
    },
    {
      name:
        lang === "ar"
          ? "ذ. أمينة الزهراء"
          : lang === "fr"
          ? "Me. Amina Az-Zahra"
          : lang === "es"
          ? "Sra. Amina Az-Zahra"
          : "Ms. Amina Az-Zahra",
      role:
        lang === "ar"
          ? "مسؤولة المحتوى الجامعي"
          : lang === "fr"
          ? "Responsable du contenu universitaire"
          : lang === "es"
          ? "Responsable de Contenido Universitario"
          : "Academic Content Manager",
      specialty:
        lang === "ar"
          ? "دكتورة في القانون الإداري — جامعة محمد الأول"
          : lang === "fr"
          ? "Doctorat en droit administratif — Université Mohammed Ier"
          : lang === "es"
          ? "Doctora en Derecho Administrativo — Universidad Mohammed I"
          : "Ph.D. in Administrative Law — Mohammed I University",
    },
  ];

  const PARTNERS = [
    lang === "ar" ? "جامعة محمد الخامس — الرباط" : "Université Mohammed V — Rabat",
    lang === "ar" ? "جامعة الحسن الثاني — الدار البيضاء" : "Université Hassan II — Casablanca",
    lang === "ar" ? "جامعة القاضي عياض — مراكش" : "Université Cadi Ayyad — Marrakech",
    lang === "ar" ? "جامعة محمد الأول — وجدة" : "Université Mohammed Ier — Oujda",
    lang === "ar" ? "جامعة ابن طفيل — القنيطرة" : "Université Ibn Tofail — Kénitra",
    lang === "ar" ? "جامعة عبد المالك السعدي — تطوان" : "Université Abdelmalek Essaâdi — Tétouan",
  ];

  const VALUES = [
    {
      icon: <Scale size={22} aria-hidden="true" />,
      title:
        lang === "ar"
          ? "الدقة القانونية"
          : lang === "fr"
          ? "Rigueur juridique"
          : lang === "es"
          ? "Rigor jurídico"
          : "Legal Rigor",
      desc:
        lang === "ar"
          ? "كل وثيقة تخضع لمراجعة أكاديمية دقيقة قبل نشرها."
          : lang === "fr"
          ? "Chaque document fait l'objet d'une révision académique rigoureuse avant sa publication."
          : lang === "es"
          ? "Cada documento se somete a una rigurosa revisión académica antes de su publicación."
          : "Every document undergoes thorough academic review before publication.",
    },
    {
      icon: <BookOpen size={22} aria-hidden="true" />,
      title:
        lang === "ar"
          ? "الوصول المفتوح"
          : lang === "fr"
          ? "Accès libre"
          : lang === "es"
          ? "Acceso abierto"
          : "Open Access",
      desc:
        lang === "ar"
          ? "نؤمن بأن المعرفة القانونية حق للجميع، لا امتياز لأقلية."
          : lang === "fr"
          ? "Nous croyons que le savoir juridique est un droit pour tous, non un privilège pour quelques-uns."
          : lang === "es"
          ? "Creemos que el conocimiento jurídico es un derecho para todos, no un privilegio."
          : "We believe legal knowledge is a universal right, not a minority privilege.",
    },
    {
      icon: <GraduationCap size={22} aria-hidden="true" />,
      title:
        lang === "ar"
          ? "الدعم الأكاديمي"
          : lang === "fr"
          ? "Soutien académique"
          : lang === "es"
          ? "Apoyo académico"
          : "Academic Support",
      desc:
        lang === "ar"
          ? "نرافق الطالب من السنة الأولى حتى أطروحة الدكتوراه."
          : lang === "fr"
          ? "Nous accompagnons l'étudiant de la première année jusqu'à la thèse de doctorat."
          : lang === "es"
          ? "Acompañamos al estudiante desde el primer año hasta la tesis doctoral."
          : "We guide students from their first year through to their doctoral dissertation.",
    },
    {
      icon: <Globe size={22} aria-hidden="true" />,
      title:
        lang === "ar"
          ? "التعددية اللغوية"
          : lang === "fr"
          ? "Multilinguisme"
          : lang === "es"
          ? "Multilingüismo"
          : "Multilingualism",
      desc:
        lang === "ar"
          ? "محتوى بالعربية، الفرنسية، والإسبانية لاستيعاب الباحثين المغاربة."
          : lang === "fr"
          ? "Contenu en arabe, français et espagnol pour répondre aux besoins des chercheurs."
          : lang === "es"
          ? "Contenido en árabe, francés y español para responder a las necesidades de los investigadores."
          : "Content in Arabic, French, and Spanish to serve diverse researchers.",
    },
  ];

  const STATS = [
    [
      "12,400+",
      lang === "ar"
        ? "وثيقة قانونية"
        : lang === "fr"
        ? "Documents juridiques"
        : lang === "es"
        ? "Documentos legales"
        : "Legal Documents",
    ],
    [
      "18",
      lang === "ar"
        ? "جامعة شريكة"
        : lang === "fr"
        ? "Universités partenaires"
        : lang === "es"
        ? "Universidades socias"
        : "Partner Universities",
    ],
    [
      "28,000+",
      lang === "ar"
        ? "باحث مسجّل"
        : lang === "fr"
        ? "Chercheurs inscrits"
        : lang === "es"
        ? "Investigadores registrados"
        : "Registered Researchers",
    ],
    [
      "2018",
      lang === "ar"
        ? "سنة التأسيس"
        : lang === "fr"
        ? "Année de fondation"
        : lang === "es"
        ? "Año de fundación"
        : "Founded In",
    ],
  ];

  const getInitial = (name: string) => {
    if (lang === "ar") {
      return name.replace(/^(د\.|ذ\.)\s*/, "").charAt(0);
    }
    return name.replace(/^(Dr\.|Me\.|Sra\.|Sr\.|Ms\.|Mr\.)\s*/, "").charAt(0);
  };

  return (
    <div className="bg-background transition-colors duration-200" dir={dir}>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20 text-center">
          <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Scale size={32} className="text-white" aria-hidden="true" />
          </div>
          <h1
            className="text-3xl md:text-4xl font-extrabold mb-4"
            style={{ fontFamily: serifFont(lang) }}
          >
            {lang === "ar" && "من نحن — منصة ميزان"}
            {lang === "fr" && "À propos de nous — Plateforme Mizan"}
            {lang === "en" && "About Us — Mizan Platform"}
            {lang === "es" && "Sobre nosotros — Plataforma Mizan"}
          </h1>
          <p
            className="text-blue-100/90 text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: sansFont(lang) }}
          >
            {lang === "ar" &&
              "منصة ميزان هي المجلة القانونية الرقمية الأولى المتخصصة في توثيق وأرشفة المحتوى القانوني المغربي، وتخدم الطلاب والباحثين والمهنيين في مجال الحقوق."}
            {lang === "fr" &&
              "Mizan est la première revue juridique numérique spécialisée dans la documentation et l'archivage du contenu juridique marocain, au service des étudiants, chercheurs et professionnels du droit."}
            {lang === "en" &&
              "Mizan is the leading digital legal journal dedicated to documenting and archiving Moroccan legal content, serving students, researchers, and legal professionals."}
            {lang === "es" &&
              "Mizan es la primera revista jurídica digital especializada en documentar y archivar el contenido jurídico marroquí, al servicio de estudiantes, investigadores y profesionales del derecho."}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(([val, label]) => (
            <div key={label}>
              <div className="text-3xl font-extrabold text-primary mb-1 font-mono">{val}</div>
              <div
                className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium"
                style={{ fontFamily: sansFont(lang) }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission & Values */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <h2
          className="text-2xl font-bold text-foreground mb-8 text-center"
          style={{ fontFamily: serifFont(lang) }}
        >
          {lang === "ar" && "رسالتنا وقيمنا"}
          {lang === "fr" && "Notre mission et nos valeurs"}
          {lang === "en" && "Our Mission & Values"}
          {lang === "es" && "Nuestra misión y valores"}
        </h2>
        <div className="grid md:grid-cols-2 gap-5">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="bg-card border border-border rounded-xl p-5 flex gap-4 hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                {v.icon}
              </div>
              <div>
                <h3
                  className="font-bold text-foreground mb-1 text-base"
                  style={{ fontFamily: serifFont(lang) }}
                >
                  {v.title}
                </h3>
                <p
                  className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {v.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Editorial Team */}
      <section id="team" className="bg-muted/40 border-t border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h2
            className="text-2xl font-bold text-foreground mb-2 text-center"
            style={{ fontFamily: serifFont(lang) }}
          >
            {lang === "ar" && "هيئة التحرير"}
            {lang === "fr" && "Comité de rédaction"}
            {lang === "en" && "Editorial Board"}
            {lang === "es" && "Comité Editorial"}
          </h2>
          <p
            className="text-center text-sm text-slate-600 dark:text-slate-400 mb-10 max-w-lg mx-auto"
            style={{ fontFamily: sansFont(lang) }}
          >
            {lang === "ar" && "نخبة من أساتذة القانون والباحثين الأكاديميين المغاربة"}
            {lang === "fr" && "Une élite de professeurs de droit et de chercheurs académiques marocains"}
            {lang === "en" && "A distinguished group of Moroccan law professors and academic researchers"}
            {lang === "es" && "Una élite de profesores de derecho e investigadores académicos marroquíes"}
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {TEAM.map((m) => (
              <div
                key={m.name}
                className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <div
                  className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0"
                  style={{ fontFamily: serifFont(lang) }}
                >
                  {getInitial(m.name)}
                </div>
                <div>
                  <div
                    className="font-bold text-foreground text-sm"
                    style={{ fontFamily: serifFont(lang) }}
                  >
                    {m.name}
                  </div>
                  <div
                    className="text-xs text-primary font-semibold mt-0.5"
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    {m.role}
                  </div>
                  <div
                    className="text-xs text-slate-500 dark:text-slate-400 mt-1"
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    {m.specialty}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="max-w-5xl mx-auto px-6 py-14">
        <h2
          className="text-2xl font-bold text-foreground mb-2 text-center"
          style={{ fontFamily: serifFont(lang) }}
        >
          {lang === "ar" && "شركاؤنا الأكاديميون"}
          {lang === "fr" && "Nos partenaires académiques"}
          {lang === "en" && "Academic Partners"}
          {lang === "es" && "Nuestros socios académicos"}
        </h2>
        <p
          className="text-center text-sm text-slate-600 dark:text-slate-400 mb-10 max-w-lg mx-auto"
          style={{ fontFamily: sansFont(lang) }}
        >
          {lang === "ar" && "نتعاون مع أبرز كليات الحقوق في المملكة المغربية"}
          {lang === "fr" && "En collaboration avec les principales facultés de droit du Royaume du Maroc"}
          {lang === "en" && "Partnering with leading law faculties across the Kingdom of Morocco"}
          {lang === "es" && "En colaboración con las principales facultades de derecho del Reino de Marruecos"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {PARTNERS.map((p) => (
            <div
              key={p}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/40 transition-colors"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Award size={16} className="text-primary" aria-hidden="true" />
              </div>
              <span
                className="text-xs md:text-sm font-medium text-foreground"
                style={{ fontFamily: sansFont(lang) }}
              >
                {p}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}