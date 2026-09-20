// shared/seo/technical-checks.js
//
// ─────────────────────────────────────────────────────────────────────────────
// فحوص السيو التقنية — دوال نقية بلا أي وصول لنظام الملفات
// ─────────────────────────────────────────────────────────────────────────────
// مكتوبة بـ JavaScript نقي (بلا اعتماديات) حتى يستعملها ثلاثة مستهلكين من نفس
// المصدر، فلا تنحرف النتائج بينهم:
//   1) scripts/seo-audit.mjs       → بوابة CI / وقت البناء (Node)
//   2) src/lib/seo/scoring/*       → لوحة التحكم في المتصفح (عبر Vite)
//   3) tests/seo-technical.test.ts → الاختبارات (vitest)
//
// كل دالة تُرجع { pass, score, issues, details } — نفس الشكل في كل الفحوص.

/**
 * @typedef {object} CheckResult
 * @property {boolean} pass
 * @property {number} score 0-100
 * @property {string[]} issues
 * @property {string[]} details
 */

/** @returns {CheckResult} */
function result(pass, score, issues = [], details = []) {
  return { pass, score: Math.max(0, Math.min(100, Math.round(score))), issues, details }
}

import { isIndexablePath } from "./url-policy.js"

const URL_RE = /https?:\/\/[^\s"'<>)]+/g

/** استخراج كل الوسوم من HTML بشكل تقريبي لكنه كافٍ للفحوص. */
function findTags(html, tagName) {
  const re = new RegExp(`<${tagName}\\b[^>]*>`, "gi")
  return html.match(re) || []
}

function attr(tag, name) {
  const match = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)
  if (!match) return null
  return (match[2] ?? match[3] ?? match[4] ?? "").trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// Crawlability / Indexability
// ─────────────────────────────────────────────────────────────────────────────

/** فحص robots.txt: يسمح بالزحف، يشير إلى خريطة الموقع، ولا يحجب مسارات حرجة. */
export function checkRobots(content, { siteUrl = "", criticalPaths = [] } = {}) {
  const text = content || ""
  const issues = []
  const details = []

  if (!text.trim()) return result(false, 0, ["ملف robots.txt فارغ أو مفقود."], [])

  const disallows = [...text.matchAll(/^\s*Disallow:\s*(\S+)/gim)].map((m) => m[1])
  const sitemaps = [...text.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((m) => m[1])

  details.push(`${disallows.length} قاعدة Disallow، ${sitemaps.length} خريطة موقع`)

  if (sitemaps.length === 0) issues.push("لا توجد تعليمة Sitemap: — الزواحف تكتشف الخريطة أبطأ.")
  else if (siteUrl && !sitemaps.some((s) => s.startsWith(siteUrl))) {
    issues.push(`رابط خريطة الموقع ليس مطلقاً على ${siteUrl}: ${sitemaps.join(", ")}`)
  }

  if (disallows.includes("/")) issues.push("القاعدة Disallow: / تحجب الموقع بالكامل.")

  const blocked = criticalPaths.filter((p) => disallows.some((d) => d !== "/" && p.startsWith(d)))
  if (blocked.length) issues.push(`مسارات مهمة محجوبة في robots.txt: ${blocked.join(", ")}`)

  const score = 100 - issues.length * 25
  return result(issues.length === 0, score, issues, details)
}

/**
 * فحص خريطة الموقع: روابط مطلقة، بلا تكرار، كل المسارات مغطاة.
 * @param {string} xml محتوى sitemap.xml
 * @param {string[]} expectedRoutes المسارات التي يجب أن تظهر
 */
export function checkSitemap(xml, expectedRoutes = [], { siteUrl = "" } = {}) {
  const text = xml || ""
  const issues = []
  const details = []

  if (!text.trim()) return result(false, 0, ["sitemap.xml فارغ أو مفقود."], [])

  const locs = [...text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])
  details.push(`${locs.length} رابط في الخريطة`)

  if (locs.length === 0) issues.push("لا توجد وسوم <loc> في الخريطة.")

  const relative = locs.filter((l) => !/^https?:\/\//.test(l))
  if (relative.length) issues.push(`${relative.length} رابط نسبي في الخريطة — يجب أن تكون مطلقة (مثال: ${relative[0]})`)

  if (siteUrl) {
    const wrongHost = locs.filter((l) => /^https?:\/\//.test(l) && !l.startsWith(siteUrl))
    if (wrongHost.length) issues.push(`${wrongHost.length} رابط على نطاق مختلف عن ${siteUrl} (مثال: ${wrongHost[0]})`)
  }

  const set = new Set(locs)
  if (set.size !== locs.length) issues.push(`${locs.length - set.size} رابط مكرر في الخريطة — يهدر ميزانية الزحف.`)

  // شرطة النهاية في sitemap ليست تفصيلاً جمالياً: أي رابط هنا بشكل
  // /schools/x/ يجعل الزاحف يضيف نسخة ثانية من الصفحة نفسها إلى الطابور،
  // فتُزحف مرتين وتُفهرس مرتين بقنونة مختلفة. القاعدة: لا شرطة نهاية.
  // القاعدة صارمة حتى على الجذر: https://www.mizan.page لا https://www.mizan.page/
  const slashed = locs.filter((l) => /\/$/.test(l))
  if (slashed.length) {
    issues.push(`${slashed.length} رابط بشرطة نهاية في الخريطة (النطاق القانوني بلا شرطة): ${slashed.slice(0, 3).join(", ")}`)
  }

  const wrongHost = locs.filter((l) => /^https?:\/\/(?:www\.)?mizan\.page/i.test(l) && !l.startsWith(siteUrl || "https://www.mizan.page"))
  if (wrongHost.length) {
    issues.push(`${wrongHost.length} رابط على نطاق غير النطاق القانوني (mizan.page بلا www؟): ${wrongHost.slice(0, 2).join(", ")}`)
  }

  // النسخ المزدوجة: /x و /x/ معاً في الخريطة نفسها
  const withoutSlash = new Set()
  const duplicated = []
  for (const loc of locs) {
    const key = loc.replace(/\/$/, "")
    if (withoutSlash.has(key)) duplicated.push(key)
    withoutSlash.add(key)
  }
  if (duplicated.length) {
    issues.push(`${duplicated.length} مسار مكرر بسبب شرطة النهاية: ${duplicated.slice(0, 3).join(", ")}`)
  }

  const paths = new Set(locs.map((l) => {
    try { return new URL(l).pathname.replace(/\/$/, "") || "/" } catch { return l }
  }))
  const missing = expectedRoutes.filter((r) => !paths.has(r.replace(/\/$/, "") || "/"))
  if (missing.length) issues.push(`${missing.length} مسار غير موجود في الخريطة: ${missing.slice(0, 8).join(", ")}`)

  const hasLastmod = /<lastmod>/.test(text)
  if (!hasLastmod) issues.push("لا توجد وسوم <lastmod> — تُضعف إشارات الحداثة.")

  const score = 100 - issues.length * 20
  return result(issues.length === 0, score, issues, details)
}

/**
 * سياسة الروابط القانونية لصفحة واحدة: وسم canonical واحد، مطابق تماماً
 * لرابط الصفحة، بلا شرطة نهاية، وعلى النطاق القانوني.
 *
 * لماذا فحص مستقل مع وجود checkHtmlHead؟ لأن checkHtmlHead كان يقارن
 * بعد إزالة شرطة النهاية من الطرفين — أي أن الخطأ الذي يفترض أن يُمسك
 * كان يُطبَّع قبل المقارنة، فيمرّ الموقع في CI وفيه canonical بنسخ متعددة.
 * هذا الفحص لا يطبّع شيئاً: المطابقة حرفية.
 *
 * @param {string} html محتوى الصفحة
 * @param {{ url?: string, siteUrl?: string }} options رابط الصفحة المتوقّع
 */
export function checkCanonicalPolicy(html, { url = "", siteUrl = "https://www.mizan.page" } = {}) {
  const text = html || ""
  const issues = []
  const details = []

  const tags = findTags(text, "link").filter((tag) => /rel\s*=\s*["']canonical["']/i.test(tag))
  details.push(`${tags.length} وسم canonical`)

  const robotsContent = attr(
    findTags(text, "meta").find((t) => /name\s*=\s*["']robots["']/i.test(t)) || "",
    "content"
  )

  if (tags.length === 0) {
    // الهيكل التطبيقية (login، /u/<username>، لوحة التحكم) لا تُفهرس ولا تحتاج
    // canonical؛ مطالبتها واحداً كانت تجبرنا على canonical كاذب يشير للرئيسية.
    if (/noindex/i.test(robotsContent)) {
      return result(true, 100, [], [...details, "noindex: لا canonical مطلوب"])
    }
    return result(false, 0, ["لا يوجد وسم canonical — الصفحات تُقرأ كنسخ متعددة."], details)
  }

  if (tags.length > 1) {
    issues.push(`${tags.length} وسوم canonical في صفحة واحدة — المحرك يختار واحداً ويعتبر الباقي تشويشاً.`)
  }

  const canonical = attr(tags[0], "href") || ""

  if (!canonical) issues.push("وسم canonical بلا href.")
  else {
    if (!/^https?:\/\//.test(canonical)) issues.push(`canonical ليس مطلقاً: ${canonical}`)
    if (/[?#]/.test(canonical)) issues.push(`canonical يحمل معاملات أو حزاماً: ${canonical} — النسخة القابلة للفهرسة هي المسار النظيف.`)
    if (/\/$/.test(canonical)) issues.push(`canonical ينتهي بشرطة مائلة: ${canonical} — السياسة بلا شرطة.`)
    if (siteUrl && !canonical.startsWith(siteUrl)) {
      issues.push(`canonical خارج النطاق القانوني ${siteUrl}: ${canonical}`)
    }
    if (url) {
      const expected = siteUrl && url.startsWith("http") ? url : `${siteUrl}${url === "/" ? "" : url}`
      if (canonical !== expected) {
        issues.push(`canonical (${canonical}) لا يطابق رابط الصفحة حرفياً (${expected}).`)
      }
    }
  }

  // og:url يجب أن يساوي canonical، وإلا تشارك الشبكات نسخة وتفهرس نسخة أخرى
  const ogUrl = attr(
    findTags(text, "meta").find((t) => /property\s*=\s*["']og:url["']/i.test(t)) || "",
    "content"
  )
  if (ogUrl && canonical && ogUrl !== canonical) {
    issues.push(`og:url (${ogUrl}) لا يساوي canonical (${canonical}).`)
  }

  // البيانات المهيكلة تحمل روابط الصفحة أيضاً: عقدة تقول «/x/» ووسم
  // canonical يقول «/x» = نسختان في نظر المحرك رغم تطابق الوسم. الفحص
  // يشمل url الداخلي بأي عقدة، ومطابقة عقدة الصفحة نفسها (@id#...).
  const ldBlocks = [
    ...text.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ].map((m) => m[1])

  if (ldBlocks.length) details.push(`${ldBlocks.length} كتلة JSON-LD`)

  for (const block of ldBlocks) {
    for (const match of block.matchAll(/"url"\s*:\s*"([^"]+)"/g)) {
      const value = match[1]
      if (!siteUrl || !value.startsWith(siteUrl)) continue
      if (value.endsWith("/")) issues.push(`url في JSON-LD ينتهي بشرطة مائلة: ${value}`)
      if (/[?#]/.test(value)) issues.push(`url في JSON-LD يحمل معاملات أو حزاماً: ${value}`)
    }

    let parsed = null
    try {
      parsed = JSON.parse(block)
    } catch {
      parsed = null
    }
    if (!parsed) continue

    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      if (!node || typeof node !== "object") continue
      const id = String(node["@id"] || "")
      if (canonical && id.startsWith(`${canonical}#`) && typeof node.url === "string" && node.url !== canonical) {
        issues.push(`url في JSON-LD (${node.url}) لا يطابق canonical الصفحة (${canonical}).`)
      }
    }
  }

  const score = issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 34)
  return result(issues.length === 0, score, issues, details)
}

/**
 * تغطية خريطة الموقع: كل <loc> يجب أن يقابله ملف مُولَّد، وكل صفحة مولَّدة
 * قابلة للفهرسة يجب أن تكون في الخريطة.
 *
 * الفحصان معاً يسدّان الثغرة التي أبقَت 13 رابطاً ميتاً داخل sitemap
 * (روابط معجم/ملفات بمعرّفات لم يولّدها prerender يوماً). رابط ميت في
 * الخريطة أسوأ من غياب الرابط: يستهلك ميزانية الزحف ويعلّم المحرك أن
 * الموقع مهمل.
 *
 * @param {string[]} locs روابط الخريطة كما هي
 * @param {string[]} builtRoutes مسارات الصفحات المولَّدة (مثل /schools/x، و / للجذر)
 */
export function checkSitemapCoverage(locs = [], builtRoutes = [], { siteUrl = "" } = {}) {
  const issues = []
  const normalize = (p) => {
    const path = String(p || "").replace(/^https?:\/\/[^/]+/i, "").replace(/[?#].*$/, "").replace(/\/+$/, "")
    return path === "" ? "/" : path
  }

  const built = new Set(builtRoutes.map(normalize))
  const decoded = (value) => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  const missing = []
  for (const loc of locs) {
    const route = decoded(normalize(loc.replace(siteUrl, "") || "/"))
    if (!built.has(route)) missing.push(loc)
  }

  if (missing.length) {
    issues.push(`${missing.length} رابط في الخريطة بلا صفحة مولَّدة (404 للزاحف): ${missing.slice(0, 4).join(", ")}`)
  }

  const locSet = new Set(locs.map((loc) => decoded(normalize(loc.replace(siteUrl, "") || "/"))))
  const unlisted = [...built].filter((route) => !locSet.has(route))
  if (unlisted.length) {
    issues.push(`${unlisted.length} صفحة مولَّدة غير مذكورة في الخريطة: ${unlisted.slice(0, 4).join(", ")}`)
  }

  const score = issues.length === 0 ? 100 : Math.max(0, 100 - missing.length * 10 - unlisted.length)
  return result(issues.length === 0, score, issues, [
    `${locs.length} رابط في الخريطة، ${built.size} صفحة مولَّدة`,
    `${missing.length} رابط ميت، ${unlisted.length} صفحة خارج الخريطة`,
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// Head / Meta / Social
// ─────────────────────────────────────────────────────────────────────────────

/** فحص وسوم الرأس: title، description، canonical، robots، og، twitter، hreflang. */
export function checkHtmlHead(html, { url = "" } = {}) {
  const text = html || ""
  const issues = []
  const details = []
  let earned = 0
  const total = 8

  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text)?.[1]?.trim() || ""
  if (!title) issues.push("وسم <title> مفقود.")
  else if (title.length < 20 || title.length > 65) issues.push(`طول <title> = ${title.length} — النطاق المثالي 20-65 حرفاً.`)
  else earned++
  details.push(`title: "${title.slice(0, 60)}" (${title.length})`)

  const description = attr(
    findTags(text, "meta").find((t) => /name\s*=\s*["']description["']/i.test(t)) || "",
    "content"
  )
  if (!description) issues.push("وسم meta description مفقود.")
  else if (description.length < 70 || description.length > 165) issues.push(`طول meta description = ${description.length} — النطاق المثالي 70-165.`)
  else earned++

  const headRobots = attr(
    findTags(text, "meta").find((t) => /name\s*=\s*["']robots["']/i.test(t)) || "",
    "content"
  )
  const headNoindex = /noindex/i.test(headRobots)

  const canonical = attr(findTags(text, "link").find((t) => /rel\s*=\s*["']canonical["']/i.test(t)) || "", "href")
  // صفحة خارج الفهرسة لا تحتاج canonical: لا نسخة مكرَّرة تُخشى أصلًا.
  if (!canonical && headNoindex) details.push("canonical غير مطلوب (noindex)")
  else if (!canonical) issues.push("وسم canonical مفقود — خطر محتوى مكرر.")
  else if (!/^https?:\/\//.test(canonical)) issues.push(`canonical ليس رابطاً مطلقاً: ${canonical}`)
  else if (url && canonical.replace(/\/$/, "") !== url.replace(/\/$/, "")) issues.push(`canonical (${canonical}) لا يطابق رابط الصفحة (${url}).`)
  else earned++

  const robotsMeta = attr(findTags(text, "meta").find((t) => /name\s*=\s*["']robots["']/i.test(t)) || "", "content")
  if (robotsMeta && /noindex/i.test(robotsMeta)) {
    // لاindex مقصود على مسار غير فهرس أصلاً (تسجيل دخول، لوحة تحكم، 404،
    // ملف بحث) ليس عيباً: هو بالضبط ما يمنع فهرسة صفحة فارغة للمستخدم
    // المسجَّل فقط. العيب أن تحمل one من هذه الصفحات وسم index.
    if (url && !isIndexablePath(url)) {
      details.push(`noindex مقصود (${url})`)
      earned++
    } else {
      issues.push(`الصفحة تحمل noindex (${robotsMeta}) — لن تُفهرس.`)
    }
  } else earned++

  const ogTags = ["og:title", "og:description", "og:image", "og:url", "og:type", "og:locale"]
  const presentOg = ogTags.filter((tag) =>
    findTags(text, "meta").some((t) => new RegExp(`property\\s*=\\s*["']${tag}["']`, "i").test(t))
  )
  if (presentOg.length < ogTags.length) issues.push(`وسوم Open Graph ناقصة: ${ogTags.filter((t) => !presentOg.includes(t)).join(", ")}`)
  else earned++
  details.push(`og: ${presentOg.length}/${ogTags.length}`)

  const twitterTags = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]
  const presentTw = twitterTags.filter((tag) =>
    findTags(text, "meta").some((t) => new RegExp(`name\\s*=\\s*["']${tag}["']`, "i").test(t))
  )
  if (presentTw.length < twitterTags.length) issues.push(`وسوم Twitter/X Cards ناقصة: ${twitterTags.filter((t) => !presentTw.includes(t)).join(", ")}`)
  else earned++
  details.push(`twitter: ${presentTw.length}/${twitterTags.length}`)

  if (!/<html[^>]*\blang\s*=/i.test(text)) issues.push("وسم <html> بلا خاصية lang — يؤثر على الفهرسة الدولية والوصولية.")
  else earned++

  if (!/name\s*=\s*["']viewport["']/i.test(text)) issues.push("وسم viewport مفقود — الصفحة ليست صديقة للجوال.")
  else earned++

  return result(issues.length === 0, Math.round((earned / total) * 100), issues, details)
}

/**
 * فحص hreflang: كل وسم يشير إلى رابط مطلق، ويوجد x-default، والتبادل متناظر.
 * @param {string[]} hreflangs القيم المستخرجة من الصفحة
 */
export function checkHreflang(hreflangs = [], { expectSingleLanguage = true } = {}) {
  const issues = []
  const details = [`${hreflangs.length} وسم hreflang`]

  if (hreflangs.length === 0) {
    if (expectSingleLanguage) {
      // موقع بلغة واحدة: غياب hreflang صحيح، لكن يجب تأكيد ذلك صراحة
      return result(true, 100, [], ["موقع بلغة واحدة — hreflang غير مطلوب."])
    }
    return result(false, 0, ["لا توجد وسوم hreflang رغم تعدد اللغات."], details)
  }

  const relative = hreflangs.filter((h) => !/^https?:\/\//.test(h))
  if (relative.length) issues.push(`${relative.length} hreflang بروابط نسبية — يجب أن تكون مطلقة.`)
  if (!hreflangs.some((h) => h === "x-default")) issues.push("لا يوجد hreflang=\"x-default\".")

  return result(issues.length === 0, issues.length ? 40 : 100, issues, details)
}

/** فحص البيانات المنظمة: JSON-LD صالح، أنواع كافية، بلا أخطاء بنيوية. */
export function checkStructuredData(html) {
  const text = html || ""
  const issues = []
  const details = []
  const types = []
  let valid = 0
  let invalid = 0

  // ⚠️ يجب التقاط **محتوى** الوسم كاملاً (فتح + جسم + إغلاق). التقاط وسم
  // الفتح فقط كان خطأً سابقاً جعل كل صفحات الموقع تُقرأ كأنها بلا بيانات
  // منظمة، رغم وجودها فعلاً في dist/index.html.
  const blockRe = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const match of text.matchAll(blockRe)) {
    const inner = (match[1] || "").trim()
    if (!inner) continue
    try {
      const parsed = JSON.parse(inner)
      valid++
      const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed]
      for (const item of items) if (item?.["@type"]) types.push(String(item["@type"]))
    } catch {
      invalid++
    }
  }

  details.push(`${valid} كتلة JSON-LD صالحة، الأنواع: ${[...new Set(types)].join(", ") || "(لا شيء)"}`)
  if (invalid > 0) issues.push(`${invalid} كتلة JSON-LD غير صالحة (JSON غير قابل للتحليل) — تُتجاهل بالكامل من المحركات.`)
  if (valid === 0) issues.push("لا توجد بيانات منظمة (JSON-LD) في الصفحة.")

  const unique = [...new Set(types)]
  if (valid && unique.length < 2) issues.push("نوع واحد فقط من البيانات المنظمة — أضف BreadcrumbList وFAQPage حيث يناسب.")

  const score = valid === 0 ? 0 : invalid > 0 ? 40 : unique.length >= 3 ? 100 : 75
  return result(issues.length === 0, score, issues, details)
}

// ─────────────────────────────────────────────────────────────────────────────
// Links
// ─────────────────────────────────────────────────────────────────────────────

/**
 * فحص الروابط في صفحة: داخلية/خارجية، نسبية سليمة، بلا http غير آمن.
 * @returns {{ internal: string[], external: string[], issues: string[] }}
 */
export function extractLinks(html, { origin = "" } = {}) {
  const text = html || ""
  const internal = []
  const external = []
  const issues = []

  for (const tag of findTags(text, "a")) {
    const href = attr(tag, "href")
    if (!href) continue
    if (/^(?:#|mailto:|tel:|javascript:)/i.test(href)) {
      if (/^javascript:/i.test(href)) issues.push(`رابط javascript: خطير: ${href}`)
      continue
    }
    if (/^https?:\/\//i.test(href)) {
      if (href.startsWith("http://")) issues.push(`رابط غير آمن (http): ${href}`)
      if (origin && href.startsWith(origin)) internal.push(href)
      else external.push(href)
    } else {
      internal.push(href)
    }
  }

  return { internal: [...new Set(internal)], external: [...new Set(external)], issues }
}

/**
 * كشف الصفحات اليتيمة: مسارات معرّفة في التطبيق لكن لا رابط داخلي يشير إليها.
 * @param {string[]} knownRoutes كل المسارات القابلة للفهرسة
 * @param {string[]} linkedPaths كل المسارات المرتبطة داخلياً عبر الموقع
 */
export function findOrphanPages(knownRoutes, linkedPaths) {
  const decode = (value) => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  // الروابط في HTML مرمَّزة (%D8%B5...) ومسارات الخريطة مفكوكة الترميز؛
  // بلا تفكيك على الطرفين تظهر كل صفحة عربية «يتيمة» كذباً.
  const normalize = (p) => decode(p || "/").replace(/\/+$/, "") || "/"
  const linked = new Set(linkedPaths.map(normalize))
  const orphans = knownRoutes.filter((route) => !linked.has(normalize(route)))
  return {
    orphans,
    pass: orphans.length === 0,
    score: knownRoutes.length ? Math.round(((knownRoutes.length - orphans.length) / knownRoutes.length) * 100) : 100,
    issues: orphans.length ? [`صفحات يتيمة (بلا رابط داخلي): ${orphans.slice(0, 12).join(", ")}`] : [],
    details: [`${orphans.length}/${knownRoutes.length} صفحة يتيمة`],
  }
}

/**
 * فحص بنية الروابط: قصيرة، بأحرف لاتينية صغيرة، بشرطات، بلا معاملات زائدة.
 *
 * ⚠️ يجب فكّ الترميز (percent-decoding) قبل الفحص. الروابط العربية تصل
 * مُرمَّزة (%D8%B5…)، وفحصها قبل فك الترميز كان يُبلّغ خطأً عن "أحرف كبيرة"
 * بسبب أحرف الستّ عشرية الكبيرة في الترميز.
 *
 * ملاحظة: الروابط العربية ليست خطأً تقنياً، لكنها تُرمَّز إلى سلسلة طويلة
 * جداً في شريط العنوان وعند المشاركة — لذلك تُبلَّغ كتوصية (penalty أخف)،
 * لا كخطأ.
 */
export function checkUrlStructure(routes) {
  const issues = []
  let bad = 0
  let softWarn = 0
  const badExamples = []

  for (const route of routes) {
    if (route === "/") continue

    let decoded = route
    try {
      decoded = decodeURIComponent(route)
    } catch {
      bad++
      if (badExamples.length < 8) badExamples.push(`${route} (ترميز غير صالح)`)
      continue
    }

    const problems = []
    const soft = []

    // شرطة النهاية = نسخة مكررة من الصفحة نفسها، فهي مخالفة صارمة لا توصية.
    if (decoded.length > 1 && decoded.endsWith("/")) problems.push("شرطة نهاية زائدة")

    if (/[A-Z]/.test(decoded)) problems.push("أحرف كبيرة")
    if (/_/.test(decoded)) problems.push("تسطير بدل شرطة")
    if (/\?.*=/.test(decoded)) problems.push("معاملات استعلام")
    if (/\/{2,}/.test(decoded.replace(/^https?:\/\//, ""))) problems.push("شرطات مائلة مكررة")
    if (/[^\x00-\x7F]/.test(decoded)) soft.push("رابط غير لاتيني (يُرمَّز طويلاً عند المشاركة)")
    // الطول يُقاس على النص المفكوك، لا على الترميز
    if (decoded.length > 75) soft.push("طويل جداً")

    if (problems.length) {
      bad++
      if (badExamples.length < 8) badExamples.push(`${decoded} (${problems.join("، ")})`)
    } else if (soft.length) {
      softWarn++
    }
  }

  if (bad) issues.push(`${bad} رابط ببنية غير مثالية: ${badExamples.join(" | ")}`)
  const details = [`${bad}/${routes.length} رابط مخالف`]
  if (softWarn) details.push(`${softWarn} رابط برابط غير لاتيني/طويل — يعمل لكنه يُرمَّز طويلاً عند المشاركة`)

  // المخالفات الصارمة تُخصم كاملاً، والروابط العربية الطويلة نصف خصم
  const penalty = bad + softWarn * 0.5
  const score = routes.length ? Math.round(((routes.length - penalty) / routes.length) * 100) : 100
  return result(bad === 0, Math.max(0, score), issues, details)
}

// ─────────────────────────────────────────────────────────────────────────────
// Images / Accessibility / Security
// ─────────────────────────────────────────────────────────────────────────────

/**
 * فحص الصور: نص بديل، أبعاد، ترميز حديث، أسماء ملفات وصفية.
 * Image SEO + Image Optimization Test.
 */
export function checkImages(html) {
  const tags = findTags(html || "", "img")
  const issues = []
  const details = [`${tags.length} صورة`]
  if (tags.length === 0) return result(true, 100, [], details)

  let missingAlt = 0
  let emptyAltOnContent = 0
  let missingDimensions = 0
  let lazyMissing = 0
  let heavyFormat = 0

  for (const tag of tags) {
    const alt = attr(tag, "alt")
    const src = attr(tag, "src") || ""
    const isDecorative = /aria-hidden\s*=\s*["']true["']/i.test(tag) || /\brole\s*=\s*["']presentation["']/i.test(tag)
    const isIcon = /(icon|logo|badge|arrow|spinner)/i.test(src)

    if (alt === null) missingAlt++
    else if (alt === "" && !isDecorative && !isIcon) emptyAltOnContent++

    if (!/width\s*=/.test(tag) || !/height\s*=/.test(tag)) missingDimensions++
    if (!/loading\s*=\s*["']lazy["']/i.test(tag) && !/fetchpriority/i.test(tag)) lazyMissing++
    if (/\.(png|jpe?g)(\?|$)/i.test(src) && !/\.(webp|avif)/i.test(src)) heavyFormat++
  }

  if (missingAlt) issues.push(`${missingAlt} صورة بلا خاصية alt — يؤثر على وصولية القارئات الشاشية وعلى فهرسة الصور.`)
  if (emptyAltOnContent) issues.push(`${emptyAltOnContent} صورة محتوى بـ alt فارغ.`)
  if (missingDimensions) issues.push(`${missingDimensions} صورة بلا width/height — تسبب إزاحة تخطيط (CLS) تضرّ Core Web Vitals.`)
  if (lazyMissing) issues.push(`${lazyMissing} صورة بلا loading="lazy" — يؤخر LCP.`)
  if (heavyFormat) issues.push(`${heavyFormat} صورة بصيغة PNG/JPEG بدل WebP/AVIF — حجم أكبر بلا داعٍ.`)

  const penalties = missingAlt * 6 + emptyAltOnContent * 4 + missingDimensions * 3 + lazyMissing * 2 + heavyFormat * 2
  return result(issues.length === 0, 100 - penalties, issues, details)
}

/** فحص الوصولية الأساسي: lang، تباين العناوين، تسميات الحقول، landmarks. */
export function checkAccessibility(html) {
  const text = html || ""
  const issues = []
  const details = []
  let earned = 0
  const total = 5

  if (/<html[^>]*\blang\s*=/i.test(text)) earned++
  else issues.push("وسم <html> بلا lang.")

  if (/<main[\s>]/i.test(text) && /<header[\s>]/i.test(text)) earned++
  else issues.push("لا توجد معالم (landmarks) <main>/<header> — تصعّب التنقل بلوحة المفاتيح.")

  const headings = ["h1", "h2", "h3"].flatMap((h) => findTags(text, h))
  const h1s = findTags(text, "h1")
  if (h1s.length === 1) earned++
  else issues.push(`عدد وسوم H1 = ${h1s.length} — يجب أن يكون واحداً بالضبط.`)
  details.push(`${headings.length} عنوان`)

  const inputs = findTags(text, "input").filter((t) => !/type\s*=\s*["']hidden["']/i.test(t))
  const unlabelled = inputs.filter((t) => {
    const hasAria = /aria-label\s*=/.test(t)
    const hasId = /\bid\s*=/.test(t)
    const hasPlaceholder = /placeholder\s*=/.test(t)
    return !hasAria && !hasId && !hasPlaceholder
  })
  if (unlabelled.length === 0) earned++
  else issues.push(`${unlabelled.length} حقل إدخال بلا تسمية يمكن الوصول إليها.`)

  if (/<img(?![^>]*\balt\s*=)/i.test(text) === false) earned++
  else issues.push("توجد صور بلا خاصية alt.")

  return result(issues.length === 0, Math.round((earned / total) * 100), issues, details)
}

/** فحص أمان الترويسات من محتوى ملف _headers. */
export function checkSecurityHeaders(headersFile) {
  const text = headersFile || ""
  const issues = []
  const required = [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "Permissions-Policy",
  ]
  const present = required.filter((h) => new RegExp(`^\\s*${h}\\s*:`,"im").test(text))
  const missing = required.filter((h) => !present.includes(h))

  if (missing.length) issues.push(`ترويسات أمان ناقصة: ${missing.join(", ")}`)
  if (!/frame-ancestors/i.test(text)) issues.push("CSP لا يحتوي frame-ancestors — حماية التأطير ناقصة.")

  // تحذير لا يفشل الفحص
  const details = [`${present.length}/${required.length} ترويسة أمان`]
  if (/script-src[^;\n]*'unsafe-inline'/.test(text)) {
    details.push("تحذير: script-src يحتوي 'unsafe-inline' — يُضعف CSP (يتطلب nonces لإزالته).")
  }

  const score = Math.round((present.length / required.length) * 100)
  return result(missing.length === 0, score, issues, details)
}

// ─────────────────────────────────────────────────────────────────────────────
// AI discovery files
// ─────────────────────────────────────────────────────────────────────────────

/**
 * فحص ملفات اكتشاف الذكاء الاصطناعي.
 * @param {{path:string, content:string}[]} files الملفات الموجودة
 */
export function checkAiDiscoveryFiles(files = []) {
  const issues = []
  const details = []
  const byPath = new Map(files.map((f) => [f.path.replace(/^\/+/, ""), f.content || ""]))

  const llms = byPath.get("llms.txt")
  if (llms === undefined) issues.push("ملف /llms.txt مفقود.")
  else {
    // خطأ حقيقي وقع في هذا المستودع: الملف كان يحتوي كود JavaScript بدل Markdown
    if (/^\s*(?:import|export|const|require\(|function)\b/m.test(llms) && !/^#/m.test(llms)) {
      issues.push("ملف /llms.txt يحتوي كود مصدر بدل Markdown — يُقدَّم للزوار والنماذج كنص برمجي.")
    } else if (!/^#/m.test(llms)) {
      issues.push("ملف /llms.txt لا يحتوي عنواناً بـ Markdown (#) — بنيته غير متوقعة للقارئات الآلية.")
    }
    if (!/https?:\/\//.test(llms || "")) issues.push("ملف /llms.txt لا يحتوي أي رابط مطلق.")
    details.push(`llms.txt: ${(llms || "").length} حرف`)
  }

  for (const path of [".well-known/ai-catalog.json", ".well-known/agent-card.json"]) {
    const content = byPath.get(path)
    if (content === undefined) {
      issues.push(`الملف /${path} مفقود.`)
      continue
    }
    try {
      JSON.parse(content)
      details.push(`${path}: JSON صالح`)
    } catch {
      issues.push(`الملف /${path} ليس JSON صالحاً.`)
    }
  }

  return result(issues.length === 0, Math.max(0, 100 - issues.length * 20), issues, details)
}

/**
 * هل يسمح robots.txt لزواحف الذكاء الاصطناعي؟
 * يحجب بعضها المحتوى عمداً؛ الفحص يكشف القرار لا يفرض سياسة.
 */
export function checkRobotsAiAccess(content) {
  const text = content || ""
  const aiBots = ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot", "CCBot", "anthropic-ai"]
  const blocked = aiBots.filter((bot) =>
    new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?Disallow:\\s*/\\s*(?:\\n|$)`, "i").test(text)
  )
  return {
    allows: blocked.length === 0,
    blocked,
    details: [blocked.length ? `محجوب: ${blocked.join(", ")}` : "كل زواحف الذكاء الاصطناعي مسموحة"],
  }
}

/** تجميع كل النتائج في نتيجة تقنية واحدة 0-100. */
export function aggregateTechnical(results = {}) {
  const entries = Object.entries(results).filter(([, value]) => value && typeof value.score === "number")
  if (entries.length === 0) return result(true, 0, [], ["لا توجد فحوص"])

  const weights = {
    robots: 8,
    sitemap: 12,
    head: 16,
    structuredData: 14,
    images: 10,
    accessibility: 10,
    securityHeaders: 10,
    urlStructure: 8,
    orphanPages: 6,
    aiDiscovery: 6,
  }

  let weighted = 0
  let totalWeight = 0
  const issues = []
  for (const [key, value] of entries) {
    const weight = weights[key] ?? 5
    weighted += value.score * weight
    totalWeight += weight
    for (const issue of value.issues || []) issues.push(issue)
  }

  const score = totalWeight ? Math.round(weighted / totalWeight) : 0
  return result(issues.length === 0, score, issues, entries.map(([k, v]) => `${k}=${v.score}`))
}

export { result as makeCheckResult, URL_RE }
