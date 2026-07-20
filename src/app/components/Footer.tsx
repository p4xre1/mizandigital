"use client";

import React from "react";

export interface FooterProps {
  lang?: string;
  dir?: "rtl" | "ltr";
}

export function Footer({ lang = "ar", dir = "rtl" }: FooterProps) {
  const isAr = lang === "ar";

  return (
    <footer
      dir={dir}
      className="bg-slate-900 text-slate-200 pt-10 pb-8 px-4 border-t border-slate-800 text-xs sm:text-sm font-sans mt-auto"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        
        {/* Column 1: Educational Disclaimer */}
        <div>
          <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
            ⚖️ {isAr ? "إخلاء المسؤولية القانوني" : "Legal Disclaimer"}
          </h2>
          <p className="text-slate-300 leading-relaxed text-xs">
            {isAr
              ? "كافة المواد والأكواد المنشورة على منصة Mizan Digital هي لأغراض تعليمية وتثقيفية فقط. لا نتحمل أي مسؤولية عن أي استخدامات خاطئة أو قرارات مبنية على المحتوى."
              : "All content published on Mizan Digital is for educational and informational purposes only. We hold no liability for improper usage or decisions based on this content."}
          </p>
        </div>

        {/* Column 2: Legal Links (48px touch targets for mobile) */}
        <div>
          <h2 className="text-white font-bold text-base mb-3">
            {isAr ? "السياسات والأحكام" : "Policies & Terms"}
          </h2>
          <nav aria-label={isAr ? "روابط السياسات" : "Policy Links"}>
            <ul className="space-y-1">
              <li>
                <a
                  href="#privacy"
                  className="text-slate-300 hover:text-white transition-colors flex items-center min-h-[48px]"
                >
                  🔒 {isAr ? "سياسة الخصوصية وحماية البيانات" : "Privacy & Data Protection Policy"}
                </a>
              </li>
              <li>
                <a
                  href="#terms"
                  className="text-slate-300 hover:text-white transition-colors flex items-center min-h-[48px]"
                >
                  📝 {isAr ? "شروط الخدمة والاستخدام" : "Terms of Service & Use"}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Column 3: Tech Stack Badges */}
        <div>
          <h2 className="text-white font-bold text-base mb-3">
            {isAr ? "البنية التحتية والتقنيات" : "Infrastructure & Tech Stack"}
          </h2>
          <p className="text-slate-300 text-xs leading-relaxed mb-3">
            {isAr
              ? "مؤمنة بواسطة Supabase RLS ومسرعة عبر شبكة خوادم Cloudflare Edge الطرفية."
              : "Secured with Supabase RLS and accelerated via Cloudflare Edge servers network."}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700 font-medium">
              Vite + React SPA
            </span>
            <span className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700 font-medium">
              Supabase RLS
            </span>
            <span className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700 font-medium">
              Cloudflare Edge
            </span>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-800 pt-6 text-center text-slate-400 text-xs">
        {isAr
          ? `جميع الحقوق محفوظة © ${new Date().getFullYear()} — منصة ميزان الرقمية (${lang})`
          : `All rights reserved © ${new Date().getFullYear()} — Mizan Digital Platform (${lang})`}
      </div>
    </footer>
  );
}