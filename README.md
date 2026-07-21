# ⚖️ Mizan Digital Platform | منصة ميزان الرقمية

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3FCF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages%20%26%20Workers-F38020?style=flat&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)

**Mizan Digital** (ميزان الرقمية) is an institutional-grade, high-performance legal technology and digital archive platform designed for researchers, lawyers, and legal scholars in Morocco and across the MENA region. Built with React 19, TypeScript, Tailwind CSS v4, and Supabase, it delivers localized legal database queries, dynamic monetization models, and credit rewards over Cloudflare's global edge network.

---

## 🌟 Key Features

* 🌐 **Multilingual & RTL/LTR Native Architecture:** Native support for Arabic (`ar`), English (`en`), French (`fr`), and Spanish (`es`) with dynamic text direction handling, font loading (`Noto Serif Arabic`, `Playfair Display`, `Inter`), and localized SEO tags.
* 🔐 **Role-Based Access Control (RBAC):** Multi-tier user authorization (`guest`, `member`, `premium_member`, `writer`, `security_admin`, `root`) powered by Supabase Auth and React hooks.
* 💳 **Dynamic Monetization & Gated Content:** Paywall preview overlays, blurred legal documents for unpaid tiers, and seamless subscription upgrades (`free`, `premium`, `enterprise`).
* 📺 **Ad Rewards & Monetization:** Integrated Google AdSense injection, click-fraud mitigation, and rewarded ad viewing mechanisms for extra research credits.
* 📱 **Mobile & OLED Optimized:** Responsive touch-first UI, high-contrast Obsidian dark mode (`#0a0f1a`), and 16px iOS auto-zoom prevention.
* ⚡ **Ultra-Fast Edge Deployment:** Zero-latency Single Page Application (SPA) delivery optimized for Cloudflare Pages and Workers (`wrangler`).

---

## 🛠️ Tech Stack

| Category | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite, React Router |
| **Language & Types** | TypeScript 5 (Strict Mode enabled) |
| **Styling & Design System** | Tailwind CSS v4, Lucide React, Shadcn UI / Radix UI Primitives |
| **Backend & Authentication** | Supabase (PostgreSQL, Row-Level Security, Auth Client) |
| **Edge Hosting & Infrastructure** | Cloudflare Pages / Workers (`wrangler.json`) |
| **Analytics & Monetization** | Google Analytics (GA4), Cloudflare Insights, Google AdSense |

---

## 📂 Project Structure

```text
mizandigital/
├── public/                 # Static assets & OpenGraph images
├── src/
│   ├── app/                # Feature modules & route wrappers
│   ├── components/         # Reusable UI & Shadcn components
│   ├── hooks/              # Custom React hooks (Auth, RBAC, Credits)
│   ├── lib/                # Supabase client & third-party integrations
│   ├── styles/             # Tailwind CSS v4, CSS variables & typography
│   │   ├── fonts.css       # Font imports (Arabic/English serif & sans)
│   │   ├── globals.css     # Global CSS resets & root variables
│   │   ├── tailwind.css    # Tailwind v4 engine directive & sources
│   │   ├── theme.css       # Institutional Ivy League theme tokens
│   │   └── index.css       # Master stylesheet import cascade
│   ├── types/              # Database models (`database.ts`) & UI interfaces
│   ├── main.tsx            # Application entry point
│   └── vite-env.d.ts       # Strictly-typed Vite environment declarations
├── .env.local              # Local environment variables (Git-ignored)
├── index.html              # HTML shell with mobile preconnects & CSP
├── package.json            # Scripts & project dependencies
└── wrangler.json           # Cloudflare Pages deployment configuration