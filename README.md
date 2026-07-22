⚖️ Mizan Digital Platform | منصة ميزان الرقميةMizan Digital (ميزان الرقمية - www.mizan.page) is an institutional-grade, high-performance legal technology and digital archive platform designed for researchers, lawyers, and legal scholars in Morocco and across the MENA region. Built with React 19, TypeScript, Tailwind CSS v4, and Supabase, it delivers localized legal database queries, dynamic monetization models, university archives, and credit rewards over Cloudflare's global edge network.🌟 Key Features🌐 Multilingual & RTL/LTR Native Architecture: Native support for Arabic (ar), English (en), French (fr), and Spanish (es) with dynamic text direction handling, localized SEO tags, and custom typography (Readex Pro, Plus Jakarta Sans).🎓 Moroccan FSJES University Archives: Dedicated archives filtered by law faculties (Rabat Agdal, Casablanca Ain Chock, Oujda, Marrakech Cadi Ayyad) and university semesters (S1 through S6).📝 Custom Admin CMS: Complete CRUD interface for creating, editing, categorizing, and assigning legal documents, jurisprudence, and decrees directly to faculties and semesters.🔐 Role-Based Access Control (RBAC): Multi-tier authorization (guest, member, premium_member, writer, security_admin, root) powered by Supabase Auth, Row-Level Security (RLS), and custom React hooks.💳 Dynamic Monetization & Gated Content: Paywall preview overlays, blurred legal documents for unpaid tiers, and seamless subscription tiering (free, premium, enterprise).📺 AdSense & Monetization: Integrated Google AdSense injection, CSP-secured ad containers, and rewarded ad viewing mechanisms for extra research credits.📱 Mobile & OLED Optimized: Responsive touch-first UI, high-contrast dark mode, mobile drawer navigation, and 16px iOS auto-zoom prevention.⚡ Ultra-Fast Edge Deployment: Zero-latency Single Page Application (SPA) delivery optimized for Cloudflare Pages and Workers (wrangler.json).🛠️ Tech StackCategoryTechnologies UsedOfficial Domainhttps://www.mizan.pageFrontend FrameworkReact 19, Vite, React Router v6Language & TypesTypeScript 5 (Strict Mode enabled)Styling & IconsTailwind CSS v4, Lucide React IconsBackend & AuthenticationSupabase (PostgreSQL, Row-Level Security, Realtime, Auth Client)Edge InfrastructureCloudflare Pages / Workers (wrangler.json)Analytics & MonetizationGoogle Analytics (GA4), Cloudflare Insights, Google AdSense📂 Project StructurePlaintextmizandigital/
├── public/                 # Static assets & OpenGraph images
├── src/
│   ├── app/                # Feature modules & route wrappers
│   ├── components/         # Reusable UI components
│   │   ├── ads/            # Google AdSense wrappers & ad containers
│   │   ├── auth/           # Authentication modals & forms
│   │   └── layout/         # Header, Footer, UtilityBar, MegaMenu (Layout.tsx)
│   ├── hooks/              # Custom React hooks (useRole, useI18n, useLocalizedPath)
│   ├── lib/                # Supabase client, analytics, navigation & i18n helpers
│   ├── pages/              # Application pages
│   │   ├── admin/          # CMS Admin Dashboard (CmsAdmin.tsx)
│   │   ├── archive/        # University archives & semester filters
│   │   ├── jurisprudence/  # Court decisions & rulings
│   │   └── library/        # Legal texts, decrees & codes
│   ├── styles/             # Tailwind CSS v4, font declarations & theme tokens
│   ├── types/              # Database models & UI interfaces
│   ├── main.tsx            # Application entry point
│   └── vite-env.d.ts       # Vite environment declarations
├── .env.local              # Local environment variables (Git-ignored)
├── index.html              # HTML shell with AdSense scripts, preconnects & CSP
├── package.json            # Dependencies & build scripts
└── wrangler.json           # Cloudflare Pages deployment configuration