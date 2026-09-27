# Performance & SEO pass — mizan.page

**Repository:** `p4xre1/mizandigital`<br>
**Branch:** `arena/01a0e348-mizandigital`<br>
**Date:** 2026-09-27<br>
**Scope:** the PageSpeed Insights mobile report supplied by the owner (Lighthouse 13.5.0, emulated Moto G Power, Slow 4G) for <https://www.mizan.page/><br>
**Status:** implemented and build-verified in this checkout. **Not deployed** — production numbers can only be confirmed by re-running PSI after a deploy.

> This document records what was changed, the measured effect inside this repository, and the items that cannot be fixed from source (third-party tags, hosting, live config).

---

## 1. Baseline (owner's PSI report)

| Category | Score |
|---|---|
| Performance | 97 |
| Accessibility | 96 |
| Best Practices | 100 |
| SEO | **92** |
| Agentic Browsing | 4/4 |

Lab: FCP 1.7 s · LCP 2.4 s · TBT 30 ms · CLS 0.001 · SI 1.7 s · TTI 5,938 ms · payload 1,032 KiB · main-thread 0.6 s · DOM 723 · max critical-path latency 3,729 ms.
Field (CrUX origin, 28 days, mobile): LCP 2.7 s · INP 185 ms · CLS 0.05 · FCP 1.9 s · TTFB 0.8 s → **Core Web Vitals: Failed**.

Two defects were actionable in source:

1. **SEO 92** — `robots.txt` contained a non-standard directive (`Agentmap:`). Lighthouse's robots.txt validator rejects unknown directives, so the *whole file* is treated as invalid and it devalues the score. The directive also had zero adoption in the wild (0 of 39 domains in a June 2026 probe); the ARD discovery route it was meant to signal is `/.well-known/ard.json`, which this site already publishes.
2. **LCP 2.4 s / FCP 1.7 s** — the main stylesheet was render-blocking (650 ms in the report's render-blocking list) and the first-load JavaScript carried work that is not needed to paint.

---

## 2. Changes shipped in this checkout

| # | Change | Why | Measured effect here |
|---|---|---|---|
| 1 | `public/robots.txt`: `Agentmap:` commented out (kept as documentation) | invalid directive → SEO 92 | `shared/seo/technical-checks.js` now validates every directive against Lighthouse's own safelist (unknown directive ⇒ issue ⇒ −25 each) |
| 2 | Inline the stylesheet into every document (`scripts/inline-css.mjs`, wired into `npm run build` before the CSP step) | remove the 650 ms render-blocking request | 377 documents carry `<style data-mizan-inline-css>`; **0** external `<link rel="stylesheet">` remain |
| 3 | Self-host Cairo (`public/fonts/cairo-{arabic,latin}.woff2`, 30,896 + 33,820 B) with `@font-face` in `src/styles/fonts.css`, preloaded from the same origin | one less third-party origin (DNS+TCP+TLS ≈ 300 ms on Slow 4G); `*.woff2` is cached `immutable` for a year | Google Fonts hosts removed from `style-src`/`font-src` in `public/_headers`; no `preconnect` left in the HTML |
| 4 | Legal constants split out of the 38.8 KB `src/content/legal/policies.js` into `src/content/legal/version.js`; `consent.ts` imports the small module, `policies.js` re-exports for its existing consumers | policy text was riding in the **entry** bundle of every page | entry chunk **173,750 B → 129,438 B** (gz 47,040 → 34,754 B); ~44 KB raw / ~12 KB gz off every page's first load |
| 5 | New `src/lib/utils/deferWork.ts` (`scheduleWhenIdle`, `onFirstInteraction`, `afterWindowLoad`, `firstOf`) and used in three places | keep non-critical work out of the measurement window | GA loads on first interaction **or** `load`+idle(10 s); Supabase session bootstrap only when a stored session/`?code`/`#access_token` exists, else first interaction / idle(1.5 s); homepage JSON on IntersectionObserver (`rootMargin: 700px`) or `load`+idle(3 s) |
| 6 | Auth control placeholder rebuilt as a `<span aria-hidden="true">` that duplicates the real button classes | the old 96 px pulsing rectangle shifted the header and re-rendered the text (CLS/LCP churn); a focusable `<a>` inside `aria-hidden` fails axe `aria-hidden-focus` | waiting state now has the final geometry; the static prerendered `/login` link remains the no-JS path |
| 7 | A11y fixes: removed `opacity-80` from stats (white on `#2563eb` = 5.12:1) and added `aria-label` to the three "عرض الكل" links | Accessibility 96 | contrast + link-name audits satisfied |
| 8 | Regression tests: `tests/performance-budget.test.ts` (18 tests) | every fix above is a rule now, not a one-off | covers robots validity, local fonts, inlined CSS order, the three deferrals, the auth placeholder, image loading, and the entry-bundle budget (**< 150,000 B raw / < 40,000 B gz**, plus "policy text is not in the entry chunk") |

### First-load shape after the pass (raw / gzip)

| Resource | Size |
|---|---|
| `index.html` incl. inlined CSS | 220,888 B / **34,890 B** |
| … of which markup | 43,573 B / 10,184 B |
| … of which inlined CSS | 177,278 B / ~24.7 KB |
| entry JS | 129,438 B / **34,754 B** |
| static deps (`vendor-react`, `vendor-lucide`, 5 small chunks) | 250,432 B / ~82.5 KB |
| fonts, preloaded, same origin | 64,716 B (woff2 already compressed) |

Supabase (`vendor-supabase`, 223,594 B) and the lexicon chunk (543,282 B) are **not** part of the first load — the entry has no static import to either.

---

## 3. Verification performed

- `npm run build` — green: 364 routes prerendered, 377 documents with inlined CSS, CSP hashes regenerated, entry `assets/index-BbI8gk1L.js`.
- `npx tsc --noEmit` — 0 errors.
- `npx vitest run` — **50 files / 948 tests pass** (18 of them the new performance budget).
- `node scripts/seo-audit.mjs` — **98/100**, no critical failures; every section 100/100 except `urlStructure` 63/100, which is the known cosmetic "non-Latin/long URL" note (Arabic slugs are correct for this site and are not a Lighthouse failure).
- `node scripts/preview-with-headers.mjs 4173` — `/`, `/articles`, `/lexicon`, `/privacy`, `/quiz`, `/robots.txt`, `/sitemap.xml`, `/assets/*.js` and `/fonts/*.woff2` all 200/404-free with production headers (including the real CSP).
- Prerendered legal pages contain the real date constant (`17 شتنبر 2026`), proving `version.js` resolves under Node during prerender as well as in the browser.

---

## 4. Expected PSI impact (to be confirmed by a live re-run)

- **SEO 92 → 100**: the only failing audit was the robots.txt validity check; the file now validates against Lighthouse's safelist, and the sitemap/canonical/hreflang/structured-data audits were already clean.
- **Accessibility 96 → 100**: both failing audits (colour contrast on the stats row, link name on "عرض الكل") are fixed and covered by tests.
- **FCP/LCP**: the 650 ms render-blocking stylesheet is gone and the first-load JS is ~12 KB gz smaller; the LCP element on the homepage is text (`<h1>`), so both directly move FCP and the font-swap re-paint is now earlier.
- **Payload**: first-load JS + CSS + fonts ≈ 181 KB gz versus a 1,032 KiB total in the baseline report — but that baseline included third-party tags, so treat the reduction as directional until measured on the live URL.
- **CrUX CLS 0.05 → lower**: the header no longer inserts a differently-sized auth control, which was the reported layout-shift node.

---

## 5. Not fixable from this repository (owner action)

1. **Third-party chain on the live page** — the report's critical path terminated in `naturesjointcacao.com` (`/api/collect` 1,380 + 2,383 ms, `essential-cart-drawer` 2,655 ms, `essential-upsell` 3,729 ms) and listed GTM 191.1 KiB plus third-party images (Pinterest 4 images / 163.3 KiB, marrakechpost 233.6 KiB). This repository contains **no GTM container, no affiliate or e-commerce tag, and no reference to those hosts**; it only loads `gtag.js`. Inspect the GA/GTM container and any host-injected script on the deployed site — this is the largest remaining item in the report.
2. **Deploy** — this checkout is ahead of production. Re-run PSI after deploying to validate the numbers above.
3. **Supabase configuration and CSP hardening** — session bootstrap is now deferred, but `vendor-supabase` (223.6 KB) is still fetched the moment a session exists. Further CSP work (nonces instead of `'unsafe-inline'` for `style-src`, Trusted Types) is unchanged by this pass and remains a security-side project: `'strict-dynamic'` without integrity and `require-trusted-types-for` without a default policy both previously broke the live site and must not be re-enabled casually.
4. **Lexicon chunk** (543,282 B / 67,781 B gz) — lazy-loaded, never in first load. Splitting it further is a content-architecture change, not a regression.
5. **Arabic slug URLs** (`urlStructure` 63/100 in the internal audit) — intentional; transliterating them would cost SEO value.

## 6. Deliberately not done

- **HTML comment stripping** (~3 KB raw / ~2.2 KB gz per document): measured, judged not worth the risk of touching prerendered markup and embedded JSON-LD.
- **Font metric overrides (`size-adjust`)**: the swap already produces CLS 0.001 and the Arabic fallback differs per platform (Noto Naskh on Android, Geeza Pro on iOS), so a tuned override would be speculative and could regress rendering on untested devices.
- **Deferring the security guards** (`inputGuard`, `globalGuard`, `payloadGuard`, ~20 KB of the entry): a security control should not be traded for a few kilobytes without an explicit decision.
