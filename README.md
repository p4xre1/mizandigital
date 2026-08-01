# ⚖️ Mizan Digital Platform | منصة ميزان الرقمية

**Mizan Digital** ([www.mizan.page](https://www.mizan.page)) is an institutional-grade legal technology and digital archive platform for researchers, lawyers, and legal scholars in Morocco and across the MENA region. Built with React, TypeScript, Tailwind CSS, Supabase, and Cloudflare, it delivers localized legal search, editorial tooling, monetization, and protected administrative workflows.

---

## 🌟 Key Features

* 🌐 **Multilingual & RTL/LTR Native Architecture:** Arabic (`ar`), English (`en`), French (`fr`), and Spanish (`es`) with direction-aware rendering and localized SEO.
* 🎓 **Moroccan FSJES University Archives:** Faculty and semester-aware archives for legal research and academic reference.
* 📝 **Custom Admin CMS:** Article drafting, publishing, moderation, and user management flows.
* 🔐 **Role-Based Access Control:** Multi-tier roles powered by Supabase Auth, RLS, and client-side guards.
* 📺 **Ads & Analytics:** AdSense, GTM, GA4, and CSP-aware tracking helpers.
* 📱 **Mobile-First UI:** Touch-optimized layouts, responsive navigation, and PWA support.
* 🧪 **E2E Coverage:** Playwright configuration and browser tests for auth, CMS publishing, and member interactions.

---

## 🛠️ Tech Stack

| Category | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React, Vite, React Router |
| **Language & Types** | TypeScript |
| **Styling & UI** | Tailwind CSS, Radix UI, Lucide React Icons |
| **Backend & Auth** | Supabase (PostgreSQL, Auth, RLS) |
| **Testing** | Vitest, Playwright |
| **Edge Infrastructure** | Cloudflare Pages / Workers |

---

## 📂 Project Structure

```plaintext
mizandigital/
├── .env
├── .env.example
├── .env.local
├── .github/
├── .gitignore
├── .npmrc
├── .vscode/
├── ATTRIBUTIONS.md
├── README.md
├── content-schema/
├── functions/
├── guidelines/
├── index.html
├── package.json
├── packages/
│   └── database/
├── playwright.config.ts
├── postcss.config.mjs
├── public/
├── scripts/
├── security/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── page.tsx
│   ├── routes.tsx
│   ├── components/
│   ├── config/
│   ├── constants/
│   ├── context/
│   ├── data/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   │   ├── adminAuth.ts
│   │   ├── adminStore.ts
│   │   ├── analytics.ts
│   │   ├── blog-service.ts
│   │   ├── d1.ts
│   │   ├── i18n.tsx
│   │   ├── interaction-i18n.ts
│   │   ├── jsonld.ts
│   │   ├── legal-disclaimer.ts
│   │   ├── navigation.ts
│   │   ├── query-client.ts
│   │   ├── r2Storage.ts
│   │   ├── sanitizer/
│   │   ├── security-i18n.ts
│   │   ├── security.ts
│   │   ├── seo.ts
│   │   ├── seoScore.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── locales/
│   ├── pages/
│   │   ├── admin/
│   │   ├── documents/
│   │   ├── fields/
│   │   └── schools/
│   ├── styles/
│   ├── types/
│   └── vite-env.d.ts
├── supabase/
│   ├── functions/
│   ├── migrations/
│   ├── policies/
│   ├── triggers/
│   └── seed files
├── tailwind.config.js
├── tests/
│   ├── e2e/
│   │   ├── auth-flow.spec.ts
│   │   ├── cms-publish-flow.spec.ts
│   │   └── member-interactions.spec.ts
│   ├── geo/
│   ├── security/
│   └── seo/
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── wrangler.json
```

## ⚙️ Configuration Map

| File | Purpose |
| :--- | :--- |
| `package.json` | App scripts, dependency graph, Playwright e2e commands, and workspace metadata |
| `vite.config.ts` | Vite aliases, dev proxy, and production build settings |
| `playwright.config.ts` | Browser test runner setup for the `tests/e2e/` suite |
| `postcss.config.mjs` | Tailwind/PostCSS processing pipeline |
| `tailwind.config.js` | Tailwind tokens, content scanning, and design system wiring |
| `tsconfig.json` | TypeScript compiler rules and path aliases |
| `vitest.config.ts` | Unit and integration test configuration |
| `wrangler.json` | Cloudflare Pages and Workers deployment config |
| `src/lib/supabase.ts` | Supabase client, helpers, and content query utilities |
| `src/lib/query-client.ts` | Shared TanStack Query client used by the app shell |
| `src/routes.tsx` | Public, protected, admin, and writer route definitions |
