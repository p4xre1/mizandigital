const MARKDOWN = `# ميزان الرقمية

منصة مغربية للمعرفة القانونية والأكاديمية لطلبة الحقوق والباحثين.

## الموارد

- القانون المغربي والموارد التشريعية
- ملخصات ودروس ومحاضرات القانون
- المعجم القانوني المغربي
- المستجدات والأخبار القانونية المغربية
- دليل كليات الحقوق بالمغرب
- الأرشيف والموارد التعليمية وملفات PDF
- الندوات والفعاليات الأكاديمية

## التحقق القانوني

ميزان الرقمية منصة تعليمية وبحثية وليست مصدراً رسمياً للتشريع. عند الاستشهاد بنص قانوني يجب التحقق من النص النافذ عبر المصدر الرسمي.

## مصادر رسمية

- بوابة عدالة: https://adala.justice.gov.ma/
- الأمانة العامة للحكومة: https://www.sgg.gov.ma/
- الجريدة الرسمية: https://www.sgg.gov.ma/arabe/JournalOfficiel.aspx
- وزارة التعليم العالي والبحث العلمي والابتكار: https://www.enssup.gov.ma/

## الأقسام

- https://www.mizan.page/articles
- https://www.mizan.page/news
- https://www.mizan.page/lexicon
- https://www.mizan.page/schools
- https://www.mizan.page/archive
- https://www.mizan.page/events
`;

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const accept = request.headers.get("Accept") || "";

  // Content negotiation for agent-friendly Markdown on the homepage.
  if (url.pathname === "/" && accept.toLowerCase().includes("text/markdown")) {
    return new Response(MARKDOWN, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600, must-revalidate",
        "Vary": "Accept",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // Preserve the normal Cloudflare Pages static-site behavior for every other request.
  return context.env.ASSETS.fetch(request);
}
