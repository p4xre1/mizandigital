/**
 * Meaningful homepage feed content emitted into the prerendered HTML.
 *
 * These sections use the same generated article routes, local event records,
 * and legal-term source data as the homepage's client-side feeds. Keeping the
 * renderer pure makes it testable without a browser: AI crawlers and no-JS
 * visitors get the text directly in #root.
 */

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeInternalPath = (value) => {
  const path = String(value ?? "").trim();
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/\s/.test(path)
    ? path
    : "";
};

const dateValue = (value) => {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, 10) : "";
};

/**
 * Same date sort and round-robin category selection used by HomePage's
 * diversifyByCategory helper. Only the first four are printed, matching the
 * number of article cards currently shown on the homepage.
 */
function diversifyArticles(items, limit) {
  const sorted = [...items].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );
  const buckets = new Map();

  for (const item of sorted) {
    const key = item.category || "عام";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }

  const categories = [...buckets.keys()];
  const selected = [];
  let cursor = 0;
  let safety = 0;
  const maxSafety = sorted.length * 2 + 10;

  while (selected.length < limit && categories.length > 0 && safety < maxSafety) {
    const category = categories[cursor % categories.length];
    const bucket = buckets.get(category);
    if (bucket.length > 0) selected.push(bucket.shift());
    cursor += 1;
    safety += 1;
    if (categories.every((name) => buckets.get(name).length === 0)) break;
  }

  return selected;
}

function renderArticleSection(articles) {
  const rows = articles
    .map(
      (article) => `
        <li>
          <article>
            <h3><a href="${escapeHtml(article.path)}">${escapeHtml(article.title)}</a></h3>
            ${article.summary ? `<p>${escapeHtml(article.summary)}</p>` : ""}
            ${article.category ? `<p><strong>التصنيف:</strong> ${escapeHtml(article.category)}</p>` : ""}
          </article>
        </li>`,
    )
    .join("\n");

  return `
    <section aria-labelledby="home-latest-articles" data-home-server-rendered="articles">
      <h2 id="home-latest-articles">أحدث المقالات القانونية</h2>
      <p>مقالات ومنهجيات قانونية تساعد طلبة الحقوق على تنظيم المراجعة وفهم النصوص وتحليل المسائل.</p>
      ${rows ? `<ul>${rows}\n      </ul>` : "<p>تصفّح المقالات المنشورة والمنهجيات القانونية في ميزان الرقمية.</p>"}
      <p><a href="/articles">عرض جميع المقالات القانونية</a></p>
    </section>`;
}

function renderEventSection(events) {
  const rows = events
    .map((event) => {
      const date = dateValue(event.date);
      const meta = [
        event.city ? `<span>${escapeHtml(event.city)}</span>` : "",
        date ? `<time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time>` : "",
        event.organizer ? `<span>${escapeHtml(event.organizer)}</span>` : "",
      ].filter(Boolean);

      return `
        <li>
          <article>
            <h3><a href="${escapeHtml(event.path)}">${escapeHtml(event.title)}</a></h3>
            ${event.summary ? `<p>${escapeHtml(event.summary)}</p>` : ""}
            ${meta.length ? `<p>${meta.join(" — ")}</p>` : ""}
          </article>
        </li>`;
    })
    .join("\n");

  return `
    <section aria-labelledby="home-latest-events" data-home-server-rendered="events">
      <h2 id="home-latest-events">الفعاليات والندوات القانونية</h2>
      <p>بطاقات للندوات واللقاءات الأكاديمية والقانونية، مع موضوع الفعالية ومعلومات الجهة المنظمة عند توفرها.</p>
      ${rows ? `<ul>${rows}\n      </ul>` : "<p>تصفّح أرشيف الندوات والفعاليات الأكاديمية والقانونية.</p>"}
      <p><a href="/events">عرض جميع الفعاليات والندوات</a></p>
    </section>`;
}

function renderLexiconSection(terms) {
  const rows = terms
    .map((term) => {
      const slug = String(term.slug ?? "").trim();
      const path = slug ? safeInternalPath(`/lexicon/${slug}`) : "";
      if (!path || !term.term_ar) return "";
      return `
        <li>
          <article>
            <h3><a href="${escapeHtml(path)}">${escapeHtml(term.term_ar)}</a></h3>
            ${term.term_fr ? `<p><strong>المقابل بالفرنسية:</strong> ${escapeHtml(term.term_fr)}</p>` : ""}
            ${term.category ? `<p><strong>التصنيف:</strong> ${escapeHtml(term.category)}</p>` : ""}
            ${term.definition ? `<p>${escapeHtml(term.definition)}</p>` : ""}
          </article>
        </li>`;
    })
    .filter(Boolean)
    .join("\n");

  return `
    <section aria-labelledby="home-lexicon-title" data-home-server-rendered="lexicon">
      <h2 id="home-lexicon-title">مصطلحات من القاموس القانوني</h2>
      <p>مصطلحات قانونية بالعربية والفرنسية مع تعريفات مختصرة وتصنيفات تساعد على فهم المفاهيم الأساسية.</p>
      ${rows ? `<ul>${rows}\n      </ul>` : "<p>افتح القاموس للبحث في المصطلحات القانونية وإحالاتها.</p>"}
      <p><a href="/lexicon">تصفح القاموس القانوني كاملاً</a></p>
    </section>`;
}

/**
 * @param {{
 *   articles?: Array<{ title: string, path: string, summary?: string, category?: string, date?: string }>,
 *   events?: Array<{ title: string, path: string, summary?: string, city?: string, date?: string, organizer?: string }>,
 *   terms?: Array<{ slug: string, term_ar: string, term_fr?: string, definition?: string, category?: string, legal_sources?: unknown[] }>,
 * }} input
 */
export function renderHomeServerRenderedContent({ articles = [], events = [], terms = [] } = {}) {
  const safeArticles = articles
    .map((article) => ({
      ...article,
      path: safeInternalPath(article.path),
      title: String(article.title ?? "").trim(),
    }))
    .filter((article) => article.path && article.title);
  const recentArticles = diversifyArticles(safeArticles, 4);

  const recentEvents = events
    .map((event) => ({
      ...event,
      path: safeInternalPath(event.path),
      title: String(event.title ?? "").trim(),
    }))
    .filter((event) => event.path && event.title)
    .slice(0, 4);

  // HomePage uses pickTreeTerms(): the first seven terms with at least one
  // legal source, in the same source-data order.
  const treeTerms = terms
    .filter((term) => Array.isArray(term.legal_sources) && term.legal_sources.length > 0)
    .slice(0, 7);

  return [
    renderArticleSection(recentArticles),
    renderEventSection(recentEvents),
    renderLexiconSection(treeTerms),
  ].join("\n");
}
