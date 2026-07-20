# ⚖️ Mizan Digital Platform | منصة ميزان الرقمية

**Mizan Digital** is a modern, high-performance, bilingual (Arabic & English) legal technology platform. Built with React, TypeScript, Tailwind CSS, and Supabase, it features role-based subscription tiers, dynamic monetization tools, credit rewards, and Cloudflare Edge hosting.

---

## 🌟 Key Features

* 🌐 **Bilingual & RTL/LTR Native:** Full support for Arabic and English with automated localized routing, dynamic font switching, and RTL direction handling.
* 🔐 **Role-Based Access Control (RBAC):** Tier-based access management (Free, Premium) powered by Supabase Auth and hooks.
* 💳 **Dynamic Monetization & Gated Content:** Feature locking for free users, dynamic preview blur walls, and premium conversion triggers.
* 📺 **Smart AdSense & Reward Systems:** Integrated Google AdSense injection, click-fraud detection, and rewarded ad watching for tool credits.
* ⚡ **Ultra-Fast Edge Deployment:** Optimized SPA configuration for Cloudflare Pages/Workers with pre-configured `wrangler.json`.
* 🎨 **Accessible UI Components:** Accessible, high-performance components built using Radix UI primitives and Tailwind CSS.

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | React 18+, TypeScript, Vite |
| **Styling** | Tailwind CSS, Lucide Icons |
| **UI Primitives** | Radix UI (Accordion, Modals, Triggers) |
| **Backend & Auth** | Supabase (Database, Auth, Credits System) |
| **Hosting & Edge** | Cloudflare Pages / Workers (`wrangler`) |
| **Analytics & Ads** | Google Analytics (GA4), Google AdSense |

---

## 🚀 Getting Started

### 1. Prerequisites

Ensure you have **Node.js** (v18 or higher) and `npm` installed on your development machine.

### 2. Environment Variables Setup

Create a `.env` file in the root directory and configure the required environment keys:

```env
# Supabase Configuration
VITE_SUPABASE_URL=[https://your-supabase-instance.supabase.co](https://your-supabase-instance.supabase.co)
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Analytics & AdSense (Optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_GOOGLE_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX