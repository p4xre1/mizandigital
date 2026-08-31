import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distFile = join(root, "dist", "schools", "index.html");
const dataFile = join(root, "src", "data", "schools.json");
const DOMAIN = "https://www.mizan.page";
const SITE = "ميزان الرقمية";
const REVIEWED = "2026-08-31";

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
const schools = JSON.parse(await readFile(dataFile, "utf8"));

const items = schools.map((s, i) => {
  const slug = s.slug || s.id;
  const name = s.name || s.name_ar || "مؤسسة جامعية";
  const areas = Array.isArray(s.studyAreas) ? s.studyAreas : [];
  const official = s.officialUrl || "";
  return `<article><h2><a href="/schools/${esc(slug)}">${esc(name)}</a></h2><p><strong>الجامعة:</strong> ${esc(s.university || "غير محدد")} — <strong>المدينة:</strong> ${esc(s.city || "المغرب")}</p>${s.foundedYear ? `<p><strong>سنة التأسيس:</strong> ${esc(s.foundedYear)}</p>` : ""}${s.synopsis ? `<p>${esc(s.synopsis)}</p>` : ""}${areas.length ? `<p><strong>مجالات الدراسة:</strong> ${areas.map(esc).join("، ")}</p>` : ""}${official ? `<p><a href="${esc(official)}" rel="nofollow noopener" target="_blank">الموقع الرسمي للمؤسسة</a></p>` : ""}<p><a href="/schools/${esc(slug)}">عرض بطاقة الكلية ومعلوماتها</a></p></article>`;
}).join("");

const schema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "دليل كليات الحقوق والجامعات المغربية",
  "description": `دليل مؤسسات العلوم القانونية والاقتصادية والاجتماعية بالمغرب، ويضم ${schools.length} مؤسسة في البيانات المنشورة.`,
  "numberOfItems": schools.length,
  "itemListElement": schools.map((s, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "item": {
      "@type": "EducationalOrganization",
      "name": s.name || s.name_ar,
      "url": `${DOMAIN}/schools/${s.slug || s.id}`,
      "address": { "@type": "PostalAddress", "addressLocality": s.city || "المغرب", "addressCountry": "MA" },
      ...(s.university ? { "parentOrganization": { "@type": "CollegeOrUniversity", "name": s.university } } : {}),
      ...(s.officialUrl ? { "sameAs": s.officialUrl } : {})
    }
  }))
};

const html = await readFile(distFile, "utf8");
const body = `<main dir="rtl"><article><h1>دليل كليات الحقوق والجامعات المغربية</h1><p><strong>يقدم دليل ميزان الرقمية معلومات تعريفية عن كليات العلوم القانونية والاقتصادية والاجتماعية والمؤسسات الجامعية في المغرب.</strong> تشمل البيانات اسم المؤسسة، الجامعة، المدينة، سنة التأسيس، مجالات الدراسة والرابط الرسمي عندما يكون متاحاً.</p><p>عدد المؤسسات المدرجة في البيانات المنشورة حالياً: <strong>${schools.length}</strong>. آخر مراجعة تحريرية: <time datetime="${REVIEWED}">${REVIEWED}</time>.</p><h2>ما هي كليات الحقوق التي يمكن البحث عنها في المغرب؟</h2><p>يمكن للطالب والباحث تصفح المؤسسات حسب المدينة والجامعة، ثم فتح الصفحة الخاصة بكل كلية للوصول إلى معلومات أكثر تفصيلاً وروابطها الرسمية.</p><h2>كيف أتحقق من معلومات الكلية والتسجيل؟</h2><p>المعلومات التعريفية في ميزان الرقمية تساعد على الوصول والتنظيم، لكن مواعيد التسجيل وشروط الولوج والإعلانات الجامعية قد تتغير. لذلك ينبغي دائماً التحقق من الموقع الرسمي للجامعة أو الكلية قبل اتخاذ أي إجراء.</p><h2>قائمة كليات الحقوق والمؤسسات الجامعية</h2>${items}<h2>ما مصدر المعلومات؟</h2><p>تعتمد القائمة على البيانات المنشورة في المنصة، مع روابط إلى المواقع الرسمية للمؤسسات عند توفرها. لا تعتبر هذه الصفحة بديلاً عن إعلان جامعي رسمي.</p><p><a href="/schools">العودة إلى دليل الكليات</a> · <a href="/search?q=${encodeURIComponent("كليات الحقوق بالمغرب")}">البحث في جميع محتويات ميزان الرقمية</a></p></article></main>`;

const replaced = html.replace(/<main[^>]*>[\s\S]*?<\/main>/i, body);
const withSchema = replaced.includes('"@type":"ItemList"') ? replaced : replaced.replace("</head>", `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script></head>`);
await writeFile(distFile, withSchema, "utf8");
console.log(`Enhanced ${distFile} with ${schools.length} prerendered schools.`);
