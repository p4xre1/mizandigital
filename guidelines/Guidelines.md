# ⚖️ Mizan Digital System & Development Guidelines

This document serves as the single source of truth for architectural standards, code quality, UI/UX consistency, and design tokens across the **Mizan Digital Platform**.

---

## 🌐 1. Internationalization & Bi-Directional (RTL/LTR) Rules

* **Native Bilingual First:** Every new UI component or page **must** support both Arabic (`ar`) and English (`en`) via `useI18n()`.
* **Directional Layouts:** Use CSS logical properties or conditional direction helpers. Avoid hardcoding `left-*` or `right-*` when positioning elements unless necessary.
  * **Correct:** `ms-auto`, `me-2`, or conditional rotation `dir === 'rtl' ? 'rotate-180' : ''`.
* **Typography Pairing:**
  * **Arabic Headings:** `'Noto Serif Arabic', serif`
  * **English Headings:** `'Playfair Display', serif`
  * **Body Text:** Standard responsive sans-serif font stack configured via CSS variables.

---

## 🎨 2. Design Tokens & Styling (Tailwind CSS)

* **Design Tokens over Arbitrary Colors:** Always use Tailwind semantic color tokens:
  * Backgrounds: `bg-background`, `bg-card`, `bg-muted`
  * Foregrounds: `text-foreground`, `text-muted-foreground`, `text-primary`
  * Borders: `border-border`
* **Layouts:**
  * Default to `flex` and `grid` for all responsive layouts.
  * Minimize absolute positioning (`absolute`) to prevent overlap issues in bilingual text wrapping.
* **Component Roundness:** Use `rounded-xl` for standard cards and buttons, and `rounded-2xl` for large feature containers or modal dialogs.

---

## 🔐 3. Authentication & Role-Based Access Control (RBAC)

* **Auth Hooks:** Use `useRole()` for tier checks (`isPremium`, `tier`) and local Supabase session listeners for real-time auth sync.
* **Type Narrowing:** Always verify `userId` is non-null before invoking API calls or state updates (e.g., passing explicit `activeUserId: string` to async callbacks).
* **Feature Gating:**
  * Wrap subscription-only tools or downloads inside `<MonetizationWrapper lockFeature={true}>`.
  * Display a blurred preview wall with a clear call-to-action (CTA) to upgrade to Premium.

---

## 💰 4. Monetization & Ad Standards

* **Fraud Protection & Ad Hydration:**
  * Only load AdSense scripts dynamically on client-side (`typeof window !== 'undefined'`) using `requestIdleCallback` to protect performance.
  * Automatically hide display ad slots for Premium users (`isPremium === true`).
* **Credit Rewards System:**
  * Ensure rewarded actions (e.g., watching video ads for bonus credits) update credit state gracefully with clear UI progress feedback.

---

## ⚙️ 5. Component & Code Architecture

* **TypeScript Strictness:**
  * Avoid using loose `any` types except when bypassing complex third-party discriminated union spread issues (e.g., Radix primitives wrappers).
  * Always define explicit React prop interfaces (`interface Props`) for UI components.
* **Radix UI Primitives:** Wrap low-level components (Accordion, Dialog, Tooltip) with `React.forwardRef` and ensure accessible ARIA attributes are retained.
* **Clean Code & Refactoring:**
  * Keep file sizes small. Extract helper functions into `lib/` and reusable UI components into `components/ui/`.
  * Remove redundant declarations or duplicated variables before committing code.

---

## 🚀 6. Cloudflare & SPA Edge Rules

* **Single Page App Routing:** All routing logic must gracefully resolve via `./dist/index.html` as defined in `wrangler.json` (`not_found_handling: "single-page-application"`).
* **Environment Variables:** Access client-side env variables exclusively via `import.meta.env.VITE_*`.