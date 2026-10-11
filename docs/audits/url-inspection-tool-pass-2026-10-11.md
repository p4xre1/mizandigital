# URL Inspection tool pass — indexability, canonicals, structured data

**Repository:** `p4xre1/mizandigital`<br>
**Branch:** `arena/228fe5ee-mizandigital`<br>
**Date:** 2026-10-11<br>
**Scope:** the Google Search Console **URL Inspection tool** help page (`support.google.com/webmasters/answer/9012289`) supplied by the owner. Every "Crawl allowed? / Indexing allowed? / canonical / live test / structured data / sitemap / request indexing" item was checked against the built site (`dist/`) and the edge layer (`public/_redirects` + `functions/[[path]].js`), and everything that would mislead the report was fixed in this checkout.<br>
**Status:** implemented, build-verified and test-verified locally. **Not deployed.** Nothing is committed on this branch yet.

> The tool's live test uses the **Google-InspectionTool** crawler, follows redirects silently, and does **not** check sitemaps, duplicate/alternate status or manual actions — so each of those was verified directly against `dist/` and the Cloudflare Pages emulator instead.

---

## 1. What the tool asks, and what the site answers now

| URL Inspection item | Where it is answered | Verified state |
|---|---|---|
| **Crawl allowed?** | `public/robots.txt` — `Allow: /` for `*` + 34 bot groups, one `Sitemap:` line | valid allow-all; `Content-Signal` and `Agentmap` stay commented out on purpose (comments in file explain the validity cost) |
| **Indexing allowed?** | `<meta name="robots">` per page; noindex policy in `shared/seo/url-policy.js`; app shells get `X-Robots-Tag: noindex, follow` from `functions/[[path]].js:272` | 427 indexable pages `index, follow, …`; 14 noindex pages, **all** absent from the sitemap |
| **User-declared canonical** | `<link rel="canonical">` written per page by `scripts/prerender.mjs:3588` and re-derived in the SPA by `src/components/seo/SEOHead.tsx` from the same policy | audit `canonical 100/100` (441 pages, single canonical, no trailing slash) |
| **Google-selected canonical / duplicates** | duplicate lexicon records merged (325 → 323 terms), hreflang trio self-referential, `*.html` served as 308 → clean path by Pages, trailing slash 301 in `functions/[[path]].js:147-154` | audit `canonical` + `hreflang` + `sitemapCoverage` 100/100 |
| **Live test fetch + render** | 428 prerendered routes; `Google-InspectionTool` UA returns `200 text/html` with the real `<title>`; hydrated head now equals the static head (see § 2.1) | verified against the local `wrangler pages dev` emulator |
| **Structured data / Enhancements** | JSON-LD per page; exactly one `WebPage` node per URL with a unique `@id`, site graph (`EducationalOrganization` / `Organization` / `WebSite`) on every page | 0 duplicate `@id`s across all 441 built pages (§ 2.2) |
| **Redirects (followed silently)** | `public/_redirects` (18 declared rules; the build appends 24 generated legacy-ID 301s → 42 on the built site) + function-level trailing-slash 301 | retired lexicon/news/article/event slugs 301 to live URLs; unknown paths return a real `404` |
| **Sitemaps** (not read by the live test) | `dist/sitemap.xml` — 427 URLs, **416 with `<lastmod>`**, no noindex URLs | audit `sitemap`, `sitemapCoverage`, `head` 100/100 |
| **Request indexing quota** | `<lastmod>` now present on all 324 lexicon URLs, using each term's visible «آخر مراجعة تحريرية» date | new in this pass (§ 2.4) |
| **Screenshot (successful live test only)** | static CSS is inlined/flipped by `scripts/nonblocking-css.mjs`; CSP hashes regenerated per build | no render-blocking or CSP-blocked assets in `dist/` |

---

## 2. Findings fixed in this pass

### 2.1 The rendered `<title>` drifted from the static `<title>` on 323 lexicon pages

`scripts/prerender.mjs` appended the brand itself (`` `${label} في القانون المغربي | ميزان الرقمية` ``) while the SPA passed the bare title to `SEOHead`, which only appended the brand for titles shorter than 20 chars. Measured on the built site: **304 of 323** term pages would show a different `<title>` in the rendered DOM than in the served HTML — exactly what the URL Inspection *live test* vs *indexed* comparison exposes.

* Fix: one rule, one place — `brandTitle(input, options)` in `shared/seo/meta-copy.js:108` (append `| ميزان الرقمية` when absent, then run `fitTitle`), re-exported through `src/lib/seo/description.ts` and `scripts/lib/meta-description.mjs`, and now used by **both** `src/components/seo/SEOHead.tsx:72` and `scripts/prerender.mjs:3559`.
* Result: title multiset over `dist/lexicon/*.html` vs the SPA rule → **0 mismatches** (was 304).

### 2.2 Duplicate / misplaced `WebPage` structured data

* The template `index.html` declared `WebPage` `https://www.mizan.page/#webpage` **inside the shared `@graph`**, so every one of the 441 pages shipped a WebPage entity describing the homepage; on the homepage it collided with the page's own injected WebPage — the same `@id` twice.
* Fix: the template node was removed from `index.html` (graph now `EducationalOrganization` / `Organization` / `WebSite`), and `renderPage` injects a per-page WebPage node when the page does not declare one — `scripts/prerender.mjs:3676-3703` (`@id: <page-canonical>#webpage`, `url`, `name`, `description`).
* Result: **0 pages with duplicate `@id`**; every page except the `app.html` shell carries exactly one WebPage node whose `url` is its own canonical.

### 2.3 Stale lexicon totals shipped in indexed copy and structured data

* `index.html` still said **250 مصطلح** in the meta description, OG/Twitter description **and** in two `@graph` descriptions — the graph block is copied into all **441** pages, so the sentence «قاموس قانوني 250 مصطلح» was in the structured data of the whole site.
* Six public pages and seven admin modules still said **325** (About, FAQ, Lexicon, Home, Pricing, Terms + admin dashboards), i.e. the pre-merge number.
* Fix: the template now carries the real number, and every public page derives it from the build-generated `src/data/counts.json` (`${counts.lexicon}` — `AboutPage.tsx:35/62`, `FAQPage.tsx:55`, `HomePage.tsx:256/324`, `LexiconPage.tsx:179`, `PricingPage.tsx:8`, `TermsPage.tsx:40`). A new guard, `tests/counts-claims.test.ts`, fails the suite if any file under `shared/`, `src/components`, `src/content/legal`, `src/pages` or `index.html` claims a lexicon total (≥ 50) that differs from `counts.json`.
* Result: `grep -rl "250 مصطلح" dist --include=*.html` → **0 files** (was 441).

### 2.4 Sitemap `<lastmod>` coverage — the "request indexing" path

The tool's guidance is explicit: for bulk re-crawls use a sitemap with `<lastmod>`. The generator deliberately avoided a fake "today" fallback, which left the 323 lexicon pages with no date at all (93/427 URLs had one).

* Fix: `scripts/generate-sitemap.mjs:220-227` now emits `lastmod: dateOf(item, ["last_reviewed", …])` for lexicon entries — the same date the page prints as «آخر مراجعة تحريرية» (`scripts/prerender.mjs:3183-3187`), so the signal is honest rather than generated.
* Result: **416/427** URLs carry `<lastmod>`; `/lexicon` 324/324 (was 1/324).

### 2.5 Miscellaneous

* `tests/help-assistant.test.ts:138-142` asserted a hard-coded `325` lexicon entries count and was the only failing test after the data merge; it now derives the expected number from `src/data/lexicon.client.json` with the same predicate as `shared/help/knowledge.js`.
* Retired duplicate-term URLs (`…-separation-pouvoirs-constitution`, `…-motion-censure-dustur`) are 301-redirected to the merged terms and no longer exist as files or internal links (checked in `dist/`).

---

## 3. Verification run (this checkout)

```
pnpm build                 → exit 0 · 428 routes · 323 term pages · sitemap 427/479 kept · 441 HTML
node scripts/seo-audit.mjs → exit 0 · 98/100 technical · 0 critical failures
                             100/100: robots, sitemap, canonical (441 pages),
                             sitemapCoverage (427/427, 0 dead, 0 outside), head,
                             serverRenderedContent (427/427 H1 + ≥25 words),
                             metaCopy (439 pages / 439 unique),
                             hreflang, structuredData, images, siteIcons,
                             accessibility, securityHeaders, orphanPages (0/427),
                             aiDiscovery
                             61/100: urlStructure (0/427 violations, 336 long
                             Arabic URLs — informational, pre-existing)
pnpm typecheck             → exit 0
pnpm test                  → 149 files · 2169 tests · all passing
```

One audit warning deserves a note: `securityHeaders` prints *"script-src contains 'unsafe-inline'"*, but that string only appears in the explanatory **comments** at the top of `public/_headers`. The real directive (line 47 of `dist/_headers`) is `script-src 'self' 'sha256-…' https://www.googletagmanager.com …` — no `'unsafe-inline'` for scripts, and the build substitutes the inline theme-bootstrap hash so nothing is blocked at render time.

Edge behaviour on `wrangler pages dev dist --port 8799` (fresh build):

| Request | Result |
|---|---|
| `/` | 200 `text/html`, title `ميزان الرقمية – منصة طلبة الحقوق في المغرب` (Google-InspectionTool UA: 200, same title) |
| `/about.html` · `/index.html` | **308** → `/about` · `/` (no duplicate page URL) |
| `/about/` | **301** → `/about` |
| `/lexicon/المحكمة` | 200, canonical + hreflang `ar-MA`/`ar`/`x-default` all point to the page itself |
| `/lexicon/…-separation-pouvoirs-constitution` | **301** → `/lexicon/فصل-السلط` |
| `/news/news-cpc-58-25-entry-into-force` | **301** → the live Arabic slug |
| `/nonexistent-xyz` | **404** (real 404 page, noindex) |
| `/pro-tools/law/x` | 200 app shell + `X-Robots-Tag: noindex, follow` |
| `/robots.txt` · `/sitemap.xml` | 200 |
| `Accept: text/markdown` on `/` | 200 `text/markdown` (`Vary: Accept`) — Google-InspectionTool sends `text/html`, so the rendered test is unaffected |

---

## 4. Remaining notes (no action taken)

* **Supabase side:** if the `lexicon_terms` table still contains the two merged duplicate records, the live client merge (`TermPage` / `LexiconPage` read the table first) will keep offering them even though the static build no longer publishes those pages. The table should be checked against `src/data/lexicon.json` (323 terms) at the next deploy.
* `docs/SEO-URL-POLICY.md` and `docs/SEO-AEO-AI-REPORT.md` still quote older baselines (e.g. 95/100, 330 pages) — worth a refresh after deploy.
* `urlStructure 61/100` is the audit's note about 336 long, non-Latin (percent-encoded) URLs. The Arabic slugs are an intentional product decision; the finding is informational, not a crawl or indexing problem.
* **Follow-up (same branch):** the "Request indexing / sitemap freshness" item now has a runtime layer — `functions/sitemap.xml.js` merges CMS rows published after the last build into the served XML, `functions/[[path]].js` serves those slugs with correct head tags instead of 404, and `functions/api/revalidate.js` lets a Supabase webhook trigger a full rebuild. See `docs/CMS-URL-ARCHITECTURE.md`.
