# Agentic Browsing pass — ai-catalog media types + first-paint CLS

**Repository:** `p4xre1/mizandigital`<br>
**Branch:** `arena/f8986492-mizandigital`<br>
**Date:** 2026-10-07<br>
**Scope:** the PageSpeed Insights **Agentic Browsing** report supplied by the owner for <https://www.mizan.page/> (mobile): 3/4 audits — formatted accessibility tree, llms.txt recommendations and `ai-catalog.json` schema validity passed; the stability metric **CLS 0.186** is the failing item, with 19 **Low**-severity rows reading *“Media type 'X' is not one of standard discovery types”*. The three *Not applicable* rows are the WebMCP audits.<br>
**Status:** implemented and build-verified in this checkout. **Not deployed** — production numbers can only be confirmed by re-running PSI after a deploy.

> The PSI API could not be reached from the build sandbox (HTTP 429, daily quota 0) and no browser is available, so there is no local Lighthouse reproduction in this document. Everything below is either source-verified against Lighthouse itself or measured on the built `dist/` in this checkout.

---

## 1. What the audit actually checks (source-verified)

| Fact | Source |
|---|---|
| The audit is `core/audits/agentic/ard-schema.js`; it delegates to `third-party/ard/ard.js` (`ConformanceTester`), a direct port of the official ARD conformance tester | `GoogleChrome/lighthouse` @ `main` |
| Media-type warning fires when `entry.type` is **not** string-equal to one of nine values | `third-party/ard/ard.js` |
| Any warning ⇒ audit score **0.9**; any error ⇒ **0**; no catalog signal ⇒ *Not applicable* | `core/audits/agentic/ard-schema.js` |

The accepted list (verbatim, exact match — `Array.includes`):

```
application/ai-catalog+json          application/agent-skills+zip
application/agent-card+json          application/agent-skills+gzip
application/a2a-agent-card+json      text/markdown; profile="urn:air:agent-skills"
application/mcp-server-card+json     application/ai-registry
                                     application/ai-registry+json
```

**Trap:** `application/agent-skills+json` (the type the site used for its skills index) *is* defined in [ADR-0014](https://github.com/Agent-Card/ai-catalog/blob/main/adr/0014-media-type-to-type.md) — but it is absent from the validator's list, so it warns. The validator's list is what the report measures against.

**WebMCP rows:** the home page registers no tool (`useWebMCPTool` is used by `/archive`, `/lexicon` and the admin pages only) and contains **0 `<form>` elements**, so the three *Not applicable* rows are expected and need no action.

---

## 2. Catalog changes — 21 entries → 3

`public/.well-known/ai-catalog.json` and `ard.json` now list only genuine **agentic** resources (byte-identical, as before):

| # | `identifier` | `type` | `url` |
|---|---|---|---|
| 1 | `urn:air:mizan.page:mcp:server-card` | `application/mcp-server-card+json` | `/.well-known/mcp/server-card.json` |
| 2 | `urn:air:mizan.page:a2a:agent-card` | `application/a2a-agent-card+json` | `/.well-known/agent-card.json` |
| 3 | `urn:air:mizan.page:skill:index` | `text/markdown; profile="urn:air:agent-skills"` | `/.well-known/agent-skills/index.md` **(new)** |

The 18 removed entries pointed at HTML pages, XML sitemaps, the RSS feed, `llms.txt`, `index.md`, `auth.md`, `openapi.json`, the API linkset and the reference hub — none of them is an AI artifact, and none of them has a type inside the standard list. Nothing was dropped from discovery: every one of those resources is still declared in `llms.txt` / `llms-full.txt`, `ai.txt`, `robots.txt`, `sitemap.xml`, `ai-sitemap.xml`, `openapi.json`, `.well-known/api-catalog`, and the `Link` headers on `/`. `/reference/index.json` keeps its own declaration checks in `tests/reference-content.test.ts`.

New artifacts:

- `public/.well-known/agent-skills/index.md` (3,506 B) — the human/agent-readable skills index (scope, coverage, canonical URLs, citation rules); the machine-readable `index.json` stays as-is and stays advertised by the `Link` header.
- `public/_headers` — explicit `Content-Type: text/markdown; charset=utf-8` for that path.
- `tests/ai-catalog.test.ts` — regression gate: every `entry.type` must be one of the nine standard discovery types (list quoted from the validator with a link to its source).

Expected effect: **19 warnings → 0**, audit score 0.9 → 1.0.

---

## 3. CLS 0.186 — cause and fix

**Cause.** The stylesheet is deliberately non-render-blocking (`<link rel="preload" as="style" data-mizan-async-css>` flipped to `stylesheet` by the theme bootstrap; decision of 2026-09-29 in `scripts/nonblocking-css.mjs`). On a throttled mobile load the browser therefore paints the prerendered HTML **unstyled**, then restyles it when the 186 KB stylesheet lands — the header height, the hero's font sizes, leading and padding all change at once, which is exactly the shape of a 0.19 CLS. The GitHub-side lab run of 2026-09-27 measured 0.001 because it did not exercise the same delivery under throttling.

**Fix.** A small `<style data-mizan-critical-css>` block is inlined into the documents that carry the prerendered shell:

- Extracted **from the built stylesheet itself** by `scripts/lib/critical-css.mjs` — geometry-bearing declarations only (`display`/position/box metrics/spacing/flex/grid/typography/transform), interaction states (`:hover`, `:focus`, `[aria-expanded]`) and redundant `@supports` fallbacks dropped, `@media`/`@supports` context preserved, `@property` registrations inlined for any `--tw-*` variable it keeps (without them `translate:var(--tw-translate-x) …` would be inert until the full sheet arrives). The shell is “the header + the nearest sectioning ancestor (`section`/`article`/`main`) of the page's first heading”, so the home hero and the lexicon `<article>` are both covered.
- **Guards:** `MAX_CRITICAL_BYTES` 8,192 and ≤35 % of the document; a page is skipped when the addition would push its text/HTML ratio below `MIN_RATIO_AFTER` 0.06 (the historical failure band was 0.02–0.05, see the 2026-09-29 decision); `dist/index.html` **must** carry the block or the build fails.
- Unchanged: the full stylesheet is still non-render-blocking, there is no new request, `script-src` hashes are untouched and `<style>` needs no hash because `style-src` already allows `'unsafe-inline'`.

Measured on this build: home block **7,632 B** (147 rules) — home document 41,398 → 49,069 B, text/HTML **0.165 → 0.139**; 186 documents carry the block, 182 are skipped by the ratio guard and the smallest ratio among the ones that carry it is exactly 0.060 (404/app/admin/lexicon shells keep ≥ 0.031, unchanged).

**Considered and left alone** (all measured, none of them moves visible content): below-the-fold home sections fill after `load`+idle but insert *below* the first viewport (and the section carries `contain-intrinsic-size:800px`); the only static image has explicit 36×36 dimensions; the cookie banner is `position:fixed`; the font `swap` cannot change line heights because every shell text class pins a pixel `line-height`; `main.tsx` uses `createRoot` (not `hydrateRoot`), but the prerendered header/hero markup is byte-for-byte what React renders, so replacing it is layout-neutral.

---

## 4. Verification in this checkout

| Check | Result |
|---|---|
| `npm run build` | ✓ 355 routes / 368 HTML / 553 records; `[nonblocking-css] 186 critical blocks, 182 skipped, 0 over cap` |
| `npm run typecheck` | ✓ 0 errors |
| `npm test` | ✓ 61 files / **1,108 tests** (incl. the new `critical-css` suite and the catalog type gate) |
| `npm run links:check` | ✓ 16,003 links / 368 pages |
| `node scripts/validate-data.mjs` · `npm run doctor` | ✓ / ✨ |
| `npm run seo:audit` | **98/100** (unchanged; `aiDiscovery` 100/100, catalog JSON valid) |
| Artifact checks | `ard.json == ai-catalog.json`; 3/3 entry types standard; new `index.md` in `dist`; CSP unchanged |

## 5. Remaining

1. **Deploy, then re-run PSI** (mobile) on <https://www.mizan.page/>: the 19 media-type warnings should be gone, and CLS should drop. Note that the current production build is *not* this checkout — the live document ships `/assets/index-CFjOmVqq.css` while this build emits `index-CXMsMFAy.css` — so compare PSI against the new deploy, not against the numbers above.
2. If a *thin* page (skipped for ratio) still shows a material CLS, the lever is `MIN_RATIO_AFTER` in `scripts/nonblocking-css.mjs`, or a mobile-scoped variant of the block (`@media (max-width:47.99rem)` wrapper) — both were prototyped during this pass and left out to keep the ratio policy simple.
3. If the deployed report still lists an ai-catalog warning, check whether the audit resolved `/.well-known/ai-catalog.json` (current) or `/.well-known/ard.json` (the ARD successor path it also honours) — both files are served and identical.
