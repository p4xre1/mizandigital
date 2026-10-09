import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import articles from "../src/data/articles.json"
import events from "../src/data/events.json"
import lexicon from "../src/data/lexicon.json"
import quizQuestions from "../src/data/quiz-questions.json"
import { diversifyByCategory } from "../src/lib/utils/diversify"
import { renderHomeServerRenderedContent } from "../scripts/lib/home-static-content.mjs"
import {
  articleSlug,
  canonicalArticle,
  canonicalEvent,
  eventSlug,
  lexiconSlug,
  pathOfUrl,
  isIndexablePath,
} from "../shared/seo/url-policy.js"
import { checkServerRenderedContent } from "../shared/seo/technical-checks.js"

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")

const articleCards = (articles as Array<Record<string, any>>).map((article) => ({
  title: article.title,
  path: pathOfUrl(canonicalArticle(articleSlug(article))),
  summary: article.excerpt,
  category: article.category,
  date: article.publishedAt,
}))

const eventCards = (events as Array<Record<string, any>>).map((event) => ({
  title: event.title,
  path: pathOfUrl(canonicalEvent(eventSlug(event))),
  summary: event.excerpt,
  city: event.city,
  date: event.eventDate || event.date,
  organizer: event.organizer,
}))

type LexiconTestTerm = {
  id: string
  term_ar: string
  term_fr?: string
  definition?: string
  category?: string
  legal_sources?: unknown[]
  [key: string]: any
}

const takenSlugs = new Set<string>()
const termCards: Array<LexiconTestTerm & { slug: string }> = (lexicon as LexiconTestTerm[]).map((term) => ({
  ...term,
  slug: lexiconSlug(term, takenSlugs),
}))

const staticHomeSections = renderHomeServerRenderedContent({
  articles: articleCards,
  events: eventCards,
  terms: termCards,
})

describe("server-rendered homepage content", () => {
  test("renders article titles and excerpts in the same category-diverse order as the client feed", () => {
    const expected = diversifyByCategory(articleCards, 8).slice(0, 4)

    expect(expected.length).toBeGreaterThan(0)
    for (const article of expected) {
      expect(staticHomeSections).toContain(`href="${article.path}"`)
      expect(staticHomeSections).toContain(article.title)
      if (article.summary) expect(staticHomeSections).toContain(article.summary)
    }
    expect(staticHomeSections).toContain("أحدث المقالات القانونية")
    expect(staticHomeSections).toContain('href="/articles"')
  })

  test("renders event summaries and bilingual legal terms without waiting for client imports", () => {
    const homePage = read("src/pages/public/HomePage.tsx")
    expect(homePage).toContain("latestArticles.slice(0, 4).map")
    expect(homePage).toContain("latestEvents.slice(0, 4).map")
    expect(homePage).toContain("slug: feedSlug(item)")
    expect(homePage).toContain("slug: feedSlug(e)")
    expect(homePage).not.toContain("filter((a) => !!a.image")
    expect(homePage).not.toContain("filter((e) => !!e.image")

    for (const event of eventCards.slice(0, 4)) {
      expect(staticHomeSections).toContain(`href="${event.path}"`)
      expect(staticHomeSections).toContain(event.title)
      if (event.summary) expect(staticHomeSections).toContain(event.summary)
    }

    const treeTerms = termCards
      .filter((term) => Array.isArray(term.legal_sources) && term.legal_sources.length > 0)
      .slice(0, 7)
    expect(treeTerms.length).toBeGreaterThan(0)
    for (const term of treeTerms) {
      expect(staticHomeSections).toContain(`href="/lexicon/${term.slug}"`)
      expect(staticHomeSections).toContain(term.term_ar)
      if (term.term_fr) expect(staticHomeSections).toContain(term.term_fr)
      if (term.definition) expect(staticHomeSections).toContain(term.definition)
    }

    expect(staticHomeSections).not.toContain("<script")
  })

  test("the prerender inserts these data-backed sections inside #root before client JavaScript", () => {
    const prerender = read("scripts/prerender.mjs")
    expect(prerender).toContain("renderHomeServerRenderedContent({")
    expect(prerender).toContain("${homeServerRenderedContentHtml}")

    const rawHtml = `<!doctype html><html><body><div id="root"><main dir="rtl"><h1>ميزان الرقمية</h1>${staticHomeSections}</main></div><script type="module">document.querySelector('#root').textContent = 'client-only phrase'</script></body></html>`
    const result = checkServerRenderedContent(rawHtml)

    expect(result.pass).toBe(true)
    expect(result.details[0]).toMatch(/كلمة نصية داخل #root قبل JavaScript/)
    expect(staticHomeSections).not.toContain("client-only phrase")
  })

  test("does not count text available only inside scripts or an empty SPA root", () => {
    const html = '<div id="root"></div><script>document.querySelector("#root").innerHTML = "هذا نص لا يظهر إلا بعد تشغيل جافاسكريبت"</script>'
    const result = checkServerRenderedContent(html)

    expect(result.pass).toBe(false)
    expect(result.score).toBe(0)
    expect(result.issues.join(" ")).toContain("0 كلمة فقط")
  })

  test("the static homepage includes the training-question statistic shown by the client", () => {
    const prerender = read("scripts/prerender.mjs")
    expect(quizQuestions.length).toBe(224)
    expect(prerender).toContain("<strong>${statistics.quiz} سؤالاً قانونياً</strong>")
  })

  test("server-rendered hero no longer claims fictional social proof", () => {
    const prerender = read("scripts/prerender.mjs")
    expect(prerender).toContain("انزل إلى الأسفل، ستجد رابط مجتمع ميزان على واتساب.")
    expect(prerender).not.toContain("500+ طالب يثقون بنا")
    expect(prerender).not.toContain("4.9 - محتوى أساسي مجاني")
  })

  test("the content audit is limited to indexable routes, not private or app shells", () => {
    expect(isIndexablePath("/")).toBe(true)
    expect(isIndexablePath("/login")).toBe(false)
    expect(isIndexablePath("/admin")).toBe(false)
    expect(isIndexablePath("/app")).toBe(false)

    const audit = read("scripts/seo-audit.mjs")
    expect(audit).toContain("if (isIndexablePath(route))")
    expect(audit).toContain("serverRenderedScores.push({ path: route, ...checkServerRenderedContent(html) })")
  })
})

describe("server-rendered content audit", () => {
  test("checks the raw root only and reports heading plus word count", () => {
    const html = `
      <div id="root">
        <main><h1>عنوان صفحة مفيد</h1>
          <p>هذا نص عربي مفيد موجود مباشرة في HTML الثابت قبل تشغيل جافاسكريبت. ${"محتوى قانوني للطلبة. ".repeat(8)}</p>
        </main>
      </div>
      <script>const hidden = "not part of the server-rendered text"</script>
    `
    const result = checkServerRenderedContent(html)

    expect(result.pass).toBe(true)
    expect(result.score).toBe(100)
    expect(result.details[0]).toMatch(/\d+ كلمة نصية داخل #root قبل JavaScript/)
  })

  test("ignores prose outside #root and fails when a public page ships only an empty client shell", () => {
    const html = `<title>عنوان الصفحة</title><p>${"نص خارج الجذر لا يكفي للفهرسة. ".repeat(12)}</p><div id="root"></div>`
    const result = checkServerRenderedContent(html)

    expect(result.pass).toBe(false)
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("لا يوجد عنوان <h1>"),
      expect.stringContaining("0 كلمة فقط"),
    ]))
  })
})
