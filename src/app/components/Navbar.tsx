"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRole } from "../hooks/useRole";
import { AuthModal } from "../components/AuthModal";
import { User, LogOut, LogIn } from "lucide-react";

export function Navbar() {
  const { role, isDeveloper, isAdmin, loading } = useRole();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Check for saved user session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mizan_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("mizan_user");
    } catch {
      // Ignore storage remove errors
    }
    setUser(null);
    window.location.reload();
  };

  return (
    <header className="w-full font-sans border-b border-slate-200 bg-white sticky top-0 z-50">
      {/* 1. Top Disclaimer Banner */}
      <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-xs sm:text-sm text-amber-950 font-semibold">
        <span>
          ⚠️ <strong>تنويه هام:</strong> محتوى هذه المنصة تعليمي وتثقيفي بالكامل ولا يعتبر استشارة مهنية أو قانونية.
        </span>
      </div>

      {/* 2. Top Utility Bar */}
      <div className="bg-slate-900 text-white px-4 py-1.5 flex justify-between items-center text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="hidden sm:inline text-slate-100">المنصة تعمل عبر خوادم Cloudflare Edge</span>
          <span className="sm:hidden text-slate-100">Cloudflare Edge</span>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-2">
          <span className="text-slate-200 font-medium">الصلاحية:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isDeveloper
                ? "bg-purple-700 text-white"
                : isAdmin
                ? "bg-rose-700 text-white"
                : "bg-blue-700 text-white"
            }`}
          >
            {loading ? "..." : role}
          </span>
        </div>
      </div>

      {/* 3. Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 space-x-reverse">
          <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm">
            M
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Mizan Digital
            </h1>
            <p className="text-xs text-slate-600 font-medium hidden sm:block">
              Modern Hybrid CMS
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links & Auth Trigger */}
        <div className="hidden md:flex items-center gap-6">
          <nav aria-label="القائمة الرئيسية" className="flex items-center gap-6 text-sm font-semibold text-slate-800">
            <Link href="/" className="hover:text-blue-900 transition-colors py-2">
              الرئيسية
            </Link>
            <Link href="/courses" className="hover:text-blue-900 transition-colors py-2">
              المحتوى التعليمي
            </Link>

            {isDeveloper && (
              <Link
                href="/dev-builder"
                className="text-purple-800 font-bold hover:text-purple-950 transition-colors py-2 flex items-center gap-1"
              >
                🛠️ باني المطور (Builder)
              </Link>
            )}

            <Link
              href="/disclaimer"
              className="text-slate-700 hover:text-slate-950 transition-colors py-2"
            >
              إخلاء المسؤولية
            </Link>
          </nav>

          {/* Desktop User / Auth Button */}
          <div className="border-r border-slate-200 pr-6 mr-2 flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  <User size={14} className="text-amber-600" />
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition cursor-pointer"
              >
                <LogIn size={14} />
                <span>تسجيل الدخول</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "إغلاق القائمة الرئيسية" : "فتح القائمة الرئيسية"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          className="md:hidden min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg bg-slate-100 text-slate-900 active:bg-slate-200 transition-colors cursor-pointer"
        >
          {isMobileMenuOpen ? (
            <span className="text-2xl font-bold" aria-hidden="true">✕</span>
          ) : (
            <span className="text-2xl font-bold" aria-hidden="true">☰</span>
          )}
        </button>
      </div>

      {/* 4. Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div 
          id="mobile-navigation" 
          className="md:hidden bg-slate-50 border-t border-slate-200 px-4 pt-2 pb-6 space-y-2"
        >
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 rounded-lg text-slate-900 font-semibold hover:bg-slate-200/60"
          >
            🏠 الرئيسية
          </Link>
          <Link
            href="/courses"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 rounded-lg text-slate-900 font-semibold hover:bg-slate-200/60"
          >
            🎓 المحتوى التعليمي
          </Link>

          {isDeveloper && (
            <Link
              href="/dev-builder"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center min-h-[48px] px-3 rounded-lg text-purple-950 bg-purple-100/90 font-bold"
            >
              🛠️ وحدة المطور (Visual & Code Engine)
            </Link>
          )}

          <Link
            href="/disclaimer"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 rounded-lg text-slate-800 font-semibold hover:bg-slate-200/60"
          >
            ⚖️ الشروط وإخلاء المسؤولية
          </Link>

          {/* Mobile Auth Button */}
          <div className="pt-2 border-t border-slate-200">
            {user ? (
              <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <User size={16} className="text-amber-600" />
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold text-red-600 flex items-center gap-1 py-1 px-2 rounded hover:bg-red-50"
                >
                  <LogOut size={14} />
                  خروج
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAuthOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 min-h-[48px] px-3 rounded-lg bg-amber-600 text-white font-bold"
              >
                <LogIn size={16} />
                <span>تسجيل الدخول / إنشاء حساب</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal Portal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        lang="ar"
        dir="rtl"
        onSuccess={() => {
          try {
            const stored = localStorage.getItem("mizan_user");
            if (stored) setUser(JSON.parse(stored));
          } catch {
            // Ignore error
          }
        }}
      />
    </header>
  );
}