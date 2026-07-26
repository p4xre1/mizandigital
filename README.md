# ⚖️ Mizan Digital Platform | منصة ميزان الرقمية

**Mizan Digital** ([www.mizan.page](https://www.mizan.page)) is an institutional-grade, high-performance legal technology and digital archive platform designed for researchers, lawyers, and legal scholars in Morocco and across the MENA region. Built with React, TypeScript, Tailwind CSS, and Supabase, it delivers localized legal database queries, dynamic monetization models, university archives, and credit rewards over Cloudflare's global edge network.

---

## 🌟 Key Features

* 🌐 **Multilingual & RTL/LTR Native Architecture:** Native support for Arabic (`ar`), English (`en`), French (`fr`), and Spanish (`es`) with dynamic text direction handling, localized SEO tags, and custom typography (*Readex Pro*, *Plus Jakarta Sans*).
* 🎓 **Moroccan FSJES University Archives:** Dedicated archives filtered by law faculties (Rabat Agdal, Casablanca Ain Chock, Oujda, Marrakech Cadi Ayyad) and academic semesters (`S1` through `S6`).
* 📝 **Custom Admin CMS:** Complete CRUD interface for creating, editing, categorizing, and assigning legal documents, jurisprudence, and decrees directly to faculties and semesters.
* 🔐 **Role-Based Access Control (RBAC):** Multi-tier authorization (`root`, `security_admin`, `admin`, `marketer`, `writer`, `member`, `guest`) powered by Supabase Auth, Row-Level Security (RLS), and custom React hooks (`useRole`).
* 💳 **Dynamic Monetization & Gated Content:** Paywall preview overlays, blurred legal documents for unpaid tiers, and referral credit reward systems.
* 📺 **AdSense & Analytics Integration:** Integrated Google AdSense injection, CSP-secured ad containers, Google Tag Manager (`GTM`), Google Analytics 4 (`GA4`), and Cloudflare Insights.
* 📱 **Mobile & OLED Optimized:** Responsive touch-first UI, high-contrast dark mode, mobile drawer navigation, and 16px iOS auto-zoom prevention.
* ⚡ **Ultra-Fast Edge Deployment:** Zero-latency Single Page Application (SPA) delivery optimized for Cloudflare Pages and Workers (`wrangler.json`).

---

## 🛠️ Tech Stack

| Category | Technologies Used |
| :--- | :--- |
| **Official Domain** | [https://www.mizan.page](https://www.mizan.page) |
| **Repository** | [https://github.com/p4xre1/mizandigital](https://github.com/p4xre1/mizandigital) |
| **Frontend Framework** | React 19, Vite, React Router v6 |
| **Language & Types** | TypeScript 5 (Strict Mode enabled) |
| **Styling & UI Components**| Tailwind CSS, Radix UI Primitives, Lucide React Icons |
| **Backend & Authentication**| Supabase (PostgreSQL, Row-Level Security, Realtime, Auth Client) |
| **Edge Infrastructure** | Cloudflare Pages / Workers (`wrangler.json`) |
| **Analytics & Monetization**| Google Analytics 4 (`GA4`), Google Tag Manager (`GTM`), Google AdSense |

---

## 📂 Project Structure

```plaintext
mizandigital/
├── .env.local              # Local environment variables (Git-ignored)
├── index.html              # HTML shell with AdSense scripts, preconnects & CSP
├── package.json            # Dependencies & build scripts
├── pnpm-workspace.yaml     # Monorepo / workspace setup
├── wrangler.json           # Cloudflare Pages deployment configuration
├── packages/
│   └── database/           # Shared database package & migrations
├── public/                 # Static assets, manifests, robots.txt & OpenGraph images
├── scripts/                # Build, routing, and sitemap generation tools
├── supabase/               # SQL migrations, seed files & edge functions
└── src/
    ├── App.tsx             # Application root component
    ├── main.tsx            # Application entry point
    ├── routes.tsx          # Application routing configuration
    ├── vite-env.d.ts       # Vite environment declarations
    ├── components/         # Reusable UI components
    │   ├── ads/            # Google AdSense wrappers & ad containers
    │   ├── auth/           # Authentication modals, guards & forms
    │   ├── common/         # Rich text editor, comments, share bar & header
    │   ├── layout/         # Header, Footer, Hero, Layout wrappers & Navbars
    │   ├── legal/          # Code reader components
    │   ├── monetization/   # Paywalls & monetization wrappers
    │   ├── navigation/     # Court drawers & navigation logic
    │   ├── pwa/            # Offline indicators & PWA utilities
    │   ├── seo/            # Dynamic SEO head injection
    │   └── ui/             # Radix UI & primitive design system components
    ├── context/            # React context providers (UIContext)
    ├── data/               # Static dataset definitions (Court rulings, law schools)
    ├── hooks/              # Custom React hooks (useRole, useMobile, useNoIndex)
    ├── lib/                # Supabase client, security, analytics & i18n helpers
    ├── pages/              # Application pages
    │   ├── admin/          # CMS Admin Dashboard & security management
    │   ├── documents/      # Cassation rulings, decrees, legal texts & journals
    │   ├── fields/         # Administrative, Commercial, Criminal, Family laws
    │   └── schools/        # University-specific page handlers
    ├── styles/             # Global CSS stylesheets, typography & Tailwind imports
    └── types/              # Supabase database models, UI interfaces & index exports