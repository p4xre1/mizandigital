Act as an elite Staff UI/UX Engineer, Principal Systems Architect, and Full-Stack Developer. I need you to generate the comprehensive frontend architecture, structural code blueprint, and full CMS specification for "Mizan Platform" (منصة ميزان). This system must be production-ready and pixel-perfect.

The design philosophy must mirror an authoritative, Ivy League law institution (Yale/UC Berkeley Law style), utilizing an asymmetric 70/30 layout grid. The entire system must be completely fluid, switching responsively across Desktop (1440px), Tablet (768px), and Mobile (375px), with bidirectional structural flipping (RTL for Arabic, LTR for French, English, Spanish).

The technical architecture is backed by Cloudflare D1 (Edge Database), Supabase (Auth, AES-256 encrypted Storage, and pgcrypto/Argon2 hashing), and Google Analytics.

Generate the absolute complete, hyper-detailed UI system implementation details for all states listed below. Output raw data payloads, exact design token parameters, component variants, and semantic HTML/Tailwind structures. Do not truncate code or compress elements.

---

### [SECTION 1: GLOBAL DESIGN TOKENS & TYPOGRAPHY SYSTEM]
Define the precise CSS/Figma variables for the institutional aesthetic, ensuring high contrast and military-grade security standards.

**1. GLOBAL THEME VARIABLES:**
Define Light/Dark modes for these variables.

**2. HERO SECTION ENHANCEMENT (Crucial Update):**
We are replacing the static solid blue background.
- **Background Asset (New Specification):** A high-resolution, professional photograph of a prestigious law library (e.g., Yale Law Library or the Hassan II University Law Faculty). The image must be warm, inviting, and architecturally impressive.
- **Asset Integration:** Apply a semi-transparent, high-contrast radial overlay (Light Mode: Muted Academic Gold; Dark Mode: Midnight Velvet Blue) to ensure typography remains dominant and readable over the complex library image details. The library structure should be visible but not distracting.

---

### [SECTION 2: FULL COMPONENT & STATE ENGINE MATRICES]
Generate the complete multi-lingual text mappings and HTML/Tailwind structures for every view tier, with a priority on multi-lingual integrity.

#### 1. HEADER, DUAL-TIER NAVIGATION & TRANSLATION ENGINE (Fixed Integration)
The translation must function flawlessly as a backend switch, not a client-side visual effect.
- **Top Utility Bar:** 
    - Upper Corner (Right in Arabic, Left in LTR): Institutional text: "الحق، العدل، الميزان".
    - Opposite Corner: 
        - Multi-Lingual Language Switcher: Interactive text triggers for 'العربية' (sets locale 'ar' and HTML dir='rtl'), 'Français' (sets 'fr', 'ltr'), 'English' (sets 'en', 'ltr'), 'Español' (sets 'es', 'ltr').
        - Theme Switch (Light/Dark).
        - Social Media Icons (Institutional profiles).
- **Main Navigation Bar:**
    - Branding: Institutional Typography Logo "منصة ميزان - MIZAN LEGAL ARCHIVE" (serif).
    - Left (Right in RTL): Global Search Input (Serif Placeholder text), Authentication Link (Arabic: تسجيل الدخول / Inscription).
    - Opposite: Main Nav Links (Arabic: الأرشيف الجامعي, المكتبة القانونية, الندوات, الاجتهاد والقضاء).

#### 2. DYNAMIC LOGIN, REGISTRATION & DANGER ZONE
- forms: Contain Email, Password, Username inputs.
- Success/Error messages (e.g., 'invalid_credentials', 'password_mismatch').

#### 3. USER PROFILE PLATFORM (70/30 SPLIT, RTL/LTR)
- Left 70% Area: Metrics dashboard, academic progress, 'Likes & Saves' grid, and uploaded resumes tracker.
- Right 30% Sidebar: User avatar (pointing to Supabase 'profile-pictures' bucket), Academic Status Badge (Student vs. Admin), Short Bio editor, and Account Settings/Deletion triggers.

#### 4. INSTITUTIONAL FOOTER, LEGAL DOCUMENTS & SPONSORS
- Sitemap tree navigation.
- Legal document templates (H1, H2, P, UL) for: Privacy Policy, Terms of Use, and Legal Disclaimer.
- Sponsor Ribbon (Horizontal scroll/grid): AMILS Logo, Moroccan Legal Knowledge Foundation, Cloudflare Grant.

---

### [SECTION 3: DATA RETRIEVAL & SECURITY ACTIONS LOGIC]
Provide the direct integration code frameworks:
- Supabase SQL Schema / JSON metadata object mapping fields (`seo_title`, `meta_description`, `url_slug`, `body_html`, `likes_count`, `is_bookmarked`) directly to Cloudflare D1 database hooks.
- Account Deletion safe cascade delete.
- Secure Schema.org Structured Data snippet (JSON-LD).

---

### [SECTION 4: MASTER CMS TRANSLATION & DATABASE PAYLOAD ENGINE (Full Integration)]
This is the required output for all CMS fields. Provide the complete multi-lingual text mappings and HTML/Tailwind templates for the main administrative controls:

#### [supabase_table: auth_ui_elements]
- login_form: title, labels (email, password), buttons.
- error_messages: `invalid_credentials`, `email_missing`.

#### [supabase_table: interaction_ui_elements]
- article_actions: `like_active`, `save_active`.

#### [supabase_table: account_management_elements]
- edit_profile_modal: labels (username, bio), buttons.
- danger_zone_account_deletion: `delete_acc_button`, `delete_confirmation_warning`.

#### [supabase_table: site_legal_documents]
- nodes: privacy_policy, terms_of_use, disclaimer. Content includes full multi-lingual HTML and `url_slug`s.

#### [supabase_table: platform_sponsors]
- Lists: Associations, Foundations, and Infrastructure Partners.

#### [supabase_table: security_ui_elements]
- nodes: `encryption_status_labels` (AES-256), `security_description`.

---

Output the entire system architecture now. Let's make this ultra UI production-ready.