# ⚖️ Mizan Digital System & Development Guidelines

This document serves as the single source of truth for architectural standards, code quality, UI/UX consistency, SEO standards, and design tokens across the **Mizan Digital Platform** (`www.mizan.page`).

---

## 🌐 1. Multilingual & Bi-Directional (RTL/LTR) Rules

* **Multilingual Core Support:** Every UI component, page, or document **must** support all 4 platform languages (`ar`, `fr`, `en`, `es`) via the `useI18n()` hook and the translation dictionary (`T`).
* **Canonical Domain Reference:** Use `https://www.mizan.page` as the primary origin for all path calculations, schema generations, and share links.
* **Directional Layouts & Logical Properties:** Use CSS logical properties or conditional direction helpers. Avoid hardcoding `left-*` or `right-*` when positioning elements unless required.
  * **Correct Usage:** `ms-auto`, `me-2`, or conditional rotation `dir === 'rtl' ? 'rotate-180' : ''`.
* **Typography & Font Pairing:**
  * **Arabic Serif:** `'Noto Serif Arabic', serif`
  * **Latin Serif (FR, EN, ES):** `'Playfair Display', serif`
  * **Arabic Sans:** `'Noto Sans Arabic', sans-serif`
  * **Latin Sans (FR, EN, ES):** `'Inter', sans-serif`

---

## 🎨 2. Design Tokens & Styling (Tailwind CSS)

* **Design Tokens & Theme Consistency:** Always prefer semantic Tailwind color tokens:
  * **Backgrounds:** `bg-slate-50`, `dark:bg-slate-950`, `bg-white/90`, `dark:bg-slate-900/80`
  * **Royal Accents:** Emerald/Deep Slate paired with Royal Amber (`amber-500`, `amber-600`) for badges, borders, and active highlights.
  * **Foregrounds:** `text-slate-900`, `dark:text-slate-100`, `text-slate-600`, `dark:text-slate-400`
* **Responsive Layouts:**
  * Default to `flex` and `grid` for all responsive layouts.
  * Minimize absolute positioning (`absolute`) to prevent text wrapping/overflow issues across different languages.
* **Component Roundness:** Use `rounded-xl` for standard cards/buttons, and `rounded-2xl` for large feature containers, dialogs, and hero banners.

---

## 🔐 3. Authentication & Role-Based Access Control (RBAC)

* **Auth Hooks & Real-time Sync:** Use `useRole()` for tier and privilege checks (`isPremium`, `tier`) alongside local Supabase session listeners.
* **Type Safety & Type Narrowing:** Always verify that `userId` is non-null before invoking API calls or performing state updates (e.g., passing explicit `userId: string` to async callbacks).
* **Feature Gating & Premium Wall:**
  * Wrap subscription-only content or premium academic tools inside `<MonetizationWrapper lockFeature={true}>`.
  * Display an accessible blurred preview wall with a clear call-to-action (CTA) encouraging user sign-up or upgrade.

---

## 💰 4. Monetization, SEO & Traffic Attribution

* **Ad Hydration & Performance Protection:**
  * Dynamic loading of script tags on client side only (`typeof window !== 'undefined'`) via `requestIdleCallback`.
  * Automatically suppress ad slots for active Premium subscribers (`isPremium === true`).
* **Structured Data (Schema.org / JSON-LD):**
  * All pages must maintain Google Rich Result compliance using `setArticleSchema`, `setLegalArticleSchema`, and `setBreadcrumbSchema`.
  * Ensure `isAccessibleForFree` is strictly boolean for gated academic/legal content.
* **Attribution & Referral System:**
  * Track traffic source parameters (`utm_source`, `utm_medium`, `utm_campaign`) across all page transitions and share actions.

---

## ⚙️ 5. Component & Code Architecture

* **TypeScript Strictness:**
  * Avoid loose `any` types. Define explicit React prop interfaces (`interface Props`) for all reusable UI components.
  * Export explicit return types for library helpers and utility functions where applicable.
* **SSR / Prerender Readiness:**
  * Always safeguard browser-only APIs (`window`, `document`, `localStorage`, `sessionStorage`) with `typeof window !== 'undefined'` checks to ensure smooth static rendering and deployment.
* **Clean Code Structure:**
  * Maintain clean separation: Business logic and data stores in `lib/`, static datasets in `data/`, and presentation components in `components/`.

---

## 🚀 6. Cloudflare Edge & SPA Routing

* **Single Page App Routing:** Fallback route resolution is handled gracefully via `./dist/index.html` as configured in `wrangler.json` (`not_found_handling: "single-page-application"`).
* **Environment Variables:** Access client-side environment variables strictly through `import.meta.env.VITE_*`.