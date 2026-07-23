import React, { useState } from "react";
import { AdminGuard } from "./AdminGuard"; // <--- Updated import
import { adminLogout } from "../lib/adminAuth";

interface AdminWrapperProps {
  title?: string;
  children: React.ReactNode;
}

export function AdminWrapper({ title = "لوحة التحكم", children }: AdminWrapperProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    adminLogout();
    window.location.replace("/ar/admin/login");
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col dir-rtl">
        {/* Mobile Header */}
        <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 bg-slate-800 text-slate-300 rounded-lg md:hidden hover:bg-slate-700"
              aria-label="القائمة"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-bold text-lg text-slate-100">{title}</h1>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-semibold rounded-lg hover:bg-red-600 hover:text-white transition-all"
          >
            خروج
          </button>
        </header>

        {/* Mobile Nav Drawer */}
        {menuOpen && (
          <nav className="bg-slate-900 border-b border-slate-800 p-4 space-y-2 md:hidden">
            <a href="/ar/admin/users" className="block px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-200">
              المستخدمون
            </a>
            <a href="/ar/admin/articles" className="block px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-200">
              المقالات
            </a>
            <a href="/ar/admin/seo" className="block px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-200">
              SEO
            </a>
          </nav>
        )}

        {/* Responsive Content Container */}
        <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-x-auto">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}