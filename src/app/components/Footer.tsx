"use client";

import React from "react";

export interface FooterProps {
  lang?: string;
  dir?: "rtl" | "ltr";
}

export function Footer({ lang = "ar", dir = "rtl" }: FooterProps) {
  return (
    <footer
      dir={dir}
      className="bg-slate-900 text-slate-300 pt-10 pb-8 px-4 border-t border-slate-800 text-xs sm:text-sm font-sans mt-auto"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        
        {/* Column 1: Educational Disclaimer */}
        <div>
          <h3 className="text-white font-bold text-base mb-3 flex items-center gap-2">
            ⚖️ إخلاء المسؤولية القانوني
          </h3>
          <p className="text-slate-400 leading-relaxed text-xs">
            كافة المواد والأكواد المنشورة على منصة Mizan Digital هي لأغراض تعليمية وتثقيفية فقط. لا نتحمل أي مسؤولية عن أي استخدامات خاطئة أو قرارات مهنية مبنية على المحتوى.
          </p>
        </div>

        {/* Column 2: Legal Links (48px touch targets for mobile) */}
        <div>
          <h3 className="text-white font-bold text-base mb-3">السياسات والأحكام</h3>
          <ul className="space-y-1">
            <li>
              <a
                href="#privacy"
                className="hover:text-white transition-colors flex items-center min-h-[48px]"
              >
                🔒 سياسة الخصوصية وحماية البيانات
              </a>
            </li>
            <li>
              <a
                href="#terms"
                className="hover:text-white transition-colors flex items-center min-h-[48px]"
              >
                📝 شروط الخدمة والاستخدام
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Tech Stack Badges */}
        <div>
          <h3 className="text-white font-bold text-base mb-3">البنية التحتية والتقنيات</h3>
          <p className="text-slate-400 text-xs leading-relaxed mb-3">
            مؤمنة بواسطة Supabase RLS ومسرعة عبر شبكة خوادم Cloudflare Edge الطرفية.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-1 rounded border border-slate-700">
              Vite + React SPA
            </span>
            <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-1 rounded border border-slate-700">
              Supabase RLS
            </span>
            <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-1 rounded border border-slate-700">
              Cloudflare Edge
            </span>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-800 pt-6 text-center text-slate-500 text-xs">
        جميع الحقوق محفوظة © {new Date().getFullYear()} — Mizan Digital Platform ({lang})
      </div>
    </footer>
  );
}