"use client";

import React, { useState } from "react";
import { useRole } from "../hooks/useRole";

export function Navbar() {
  const { role, isDeveloper, isAdmin, loading } = useRole();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="w-full font-sans border-b border-slate-200 bg-white sticky top-0 z-50">
      {/* 1. Mandatory Top Disclaimer Banner */}
      <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 text-center text-xs sm:text-sm text-amber-900 font-medium">
        <span>
          ⚠️ <strong>تنويه هام:</strong> محتوى هذه المنصة تعليمي وتثقيفي بالكامل ولا يعتبر استشارة مهنية أو قانونية.
        </span>
      </div>

      {/* 2. Top Utility Bar */}
      <div className="bg-blue-900 text-white px-4 py-1.5 flex justify-between items-center text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="hidden sm:inline">المنصة تعمل عبر خوادم Cloudflare Edge</span>
          <span className="sm:hidden">Cloudflare Edge</span>
        </div>

        {/* Dynamic Role Badge */}
        <div className="flex items-center gap-2">
          <span className="text-blue-200">الصلاحية:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isDeveloper
                ? "bg-purple-600 text-white"
                : isAdmin
                ? "bg-rose-600 text-white"
                : "bg-blue-700 text-white"
            }`}
          >
            {loading ? "..." : role}
          </span>
        </div>
      </div>

      {/* 3. Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm">
            M
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Mizan Digital
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Modern Hybrid CMS
            </p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
          <a href="#dashboard" className="hover:text-blue-900 transition-colors py-2">
            الرئيسية
          </a>
          <a href="#courses" className="hover:text-blue-900 transition-colors py-2">
            المحتوى التعليمي
          </a>

          {isDeveloper && (
            <a
              href="#dev-builder"
              className="text-purple-700 font-bold hover:text-purple-900 transition-colors py-2 flex items-center gap-1"
            >
              🛠️ باني المطور (Builder)
            </a>
          )}

          <a
            href="#disclaimer"
            className="text-slate-500 hover:text-slate-800 transition-colors py-2"
          >
            إخلاء المسؤولية
          </a>
        </nav>

        {/* Mobile Hamburger (Strict 48px touch target) */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="القائمة الرئيسية"
          className="md:hidden min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors cursor-pointer"
        >
          {isMobileMenuOpen ? (
            <span className="text-2xl font-bold">✕</span>
          ) : (
            <span className="text-2xl font-bold">☰</span>
          )}
        </button>
      </div>

      {/* 4. Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-50 border-t border-slate-200 px-4 pt-2 pb-6 space-y-2">
          <a
            href="#dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 rounded-lg text-slate-800 font-medium hover:bg-slate-200/60"
          >
            🏠 الرئيسية
          </a>
          <a
            href="#courses"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 rounded-lg text-slate-800 font-medium hover:bg-slate-200/60"
          >
            🎓 المحتوى التعليمي
          </a>

          {isDeveloper && (
            <a
              href="#dev-builder"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center min-h-[48px] px-3 rounded-lg text-purple-900 bg-purple-100/80 font-bold"
            >
              🛠️ وحدة المطور (Visual & Code Engine)
            </a>
          )}

          <a
            href="#disclaimer"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 rounded-lg text-slate-600 font-medium hover:bg-slate-200/60"
          >
            ⚖️ الشروط وإخلاء المسؤولية
          </a>
        </div>
      )}
    </header>
  );
}