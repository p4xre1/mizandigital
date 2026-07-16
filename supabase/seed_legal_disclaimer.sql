-- ============================================================
-- Mizan Platform — site_legal_documents seed: disclaimer node
-- ============================================================

create table if not exists site_legal_documents (
  node text primary key,
  ar_title text, fr_title text, en_title text, es_title text,
  ar_content_html text, fr_content_html text, en_content_html text, es_content_html text,
  updated_at timestamptz default now()
);

alter table site_legal_documents enable row level security;
create policy "Public read legal docs" on site_legal_documents for select using (true);

insert into site_legal_documents (node, ar_title, fr_title, en_title, es_title, ar_content_html, fr_content_html, en_content_html, es_content_html) values
(
  'disclaimer',
  'إخلاء المسؤولية',
  'Clause de Non-Responsabilité',
  'Legal Disclaimer',
  'Exención de Responsabilidad',
  '<h2>طبيعة المحتوى الأكاديمي</h2><p>تُقدَّم جميع المواد ونماذج الامتحانات من الفصل الأول (S1) إلى الفصل السادس (S6) والتعليقات القانونية المنشورة على منصة ميزان لأغراض تعليمية وإعلامية بحتة، في إطار الموارد الأكاديمية المساعدة للطلبة والباحثين.</p><h2>حدود الضمان</h2><ul><li>لا تضمن منصة ميزان التحديث المطلق للنصوص القانونية والمراسيم والقرارات الرسمية.</li><li>لا تضمن المنصة خلوّ المحتوى من الأخطاء أو السهو.</li><li>قد تطرأ تعديلات تشريعية لاحقة لا تظهر فوراً في المحتوى المنشور.</li></ul><h2>عدم اعتباره استشارة قانونية</h2><p>لا يشكّل أي محتوى منشور على هذه المنصة استشارة قانونية رسمية، ولا تنشأ عنه أي علاقة بين محامٍ وموكّل. تبقى المسؤولية القانونية الكاملة على عاتق المستخدم عند الاعتماد على هذه المواد.</p><h2>المصدر الملزم</h2><p>يُنصح المستخدمون بالرجوع إلى <strong>الجريدة الرسمية</strong> للمملكة المغربية للاطلاع على النصوص التشريعية والتنظيمية الملزمة والمعتمدة رسمياً.</p>',
  '<h2>Nature du contenu académique</h2><p>L''ensemble des supports, des modèles d''examen du premier au sixième semestre (S1 à S6) et des commentaires juridiques publiés sur la Plateforme Mizan sont fournis strictement à des fins éducatives et informatives, dans le cadre de ressources académiques destinées aux étudiants et chercheurs.</p><h2>Limites de garantie</h2><ul><li>Mizan ne garantit pas la mise à jour absolue des textes juridiques, décrets et décisions officielles.</li><li>La plateforme ne garantit pas l''absence d''erreurs ou d''omissions dans le contenu.</li><li>Des modifications législatives ultérieures peuvent ne pas être immédiatement reflétées.</li></ul><h2>Absence de conseil juridique</h2><p>Aucun contenu publié sur cette plateforme ne constitue un conseil juridique officiel et n''établit aucune relation avocat-client. L''utilisateur demeure seul responsable de l''usage de ces supports.</p><h2>Source contraignante</h2><p>Il est recommandé aux utilisateurs de consulter le <strong>Bulletin Officiel</strong> du Royaume du Maroc pour les textes législatifs et réglementaires contraignants et officiellement adoptés.</p>',
  '<h2>Nature of Academic Content</h2><p>All materials, exam models from the first through sixth semester (S1 to S6), and legal commentaries published on the Mizan Platform are provided strictly for educational and informational purposes, as academic support resources for students and researchers.</p><h2>Limitations of Warranty</h2><ul><li>Mizan does not guarantee that official texts, decrees, and rulings are fully up to date.</li><li>The platform does not guarantee that content is free of errors or omissions.</li><li>Subsequent legislative amendments may not be immediately reflected in published content.</li></ul><h2>Not Legal Advice</h2><p>No content published on this platform constitutes formal legal advice, and no attorney-client relationship is created. Users bear sole responsibility for any reliance placed on these materials.</p><h2>Binding Source</h2><p>Users are advised to consult the <strong>Official Bulletin</strong> (Bulletin Officiel) of the Kingdom of Morocco for binding and officially adopted statutory and regulatory texts.</p>',
  '<h2>Naturaleza del contenido académico</h2><p>Todos los materiales, modelos de examen del primer al sexto semestre (S1 a S6) y comentarios jurídicos publicados en la Plataforma Mizan se proporcionan estrictamente con fines educativos e informativos, como recursos académicos de apoyo para estudiantes e investigadores.</p><h2>Límites de la garantía</h2><ul><li>Mizan no garantiza la actualización absoluta de los textos jurídicos, decretos y resoluciones oficiales.</li><li>La plataforma no garantiza que el contenido esté libre de errores u omisiones.</li><li>Las modificaciones legislativas posteriores pueden no reflejarse de inmediato en el contenido publicado.</li></ul><h2>No constituye asesoramiento jurídico</h2><p>Ningún contenido publicado en esta plataforma constituye asesoramiento jurídico oficial, ni crea relación alguna entre abogado y cliente. El usuario asume la responsabilidad exclusiva del uso de estos materiales.</p><h2>Fuente vinculante</h2><p>Se recomienda a los usuarios consultar el <strong>Boletín Oficial</strong> del Reino de Marruecos para los textos legislativos y reglamentarios vinculantes y oficialmente adoptados.</p>'
)
on conflict (node) do update set
  ar_title=excluded.ar_title, fr_title=excluded.fr_title, en_title=excluded.en_title, es_title=excluded.es_title,
  ar_content_html=excluded.ar_content_html, fr_content_html=excluded.fr_content_html,
  en_content_html=excluded.en_content_html, es_content_html=excluded.es_content_html,
  updated_at=now();
