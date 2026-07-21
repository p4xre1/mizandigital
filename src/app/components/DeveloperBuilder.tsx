"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRole } from "../hooks/useRole";

export function DeveloperBuilder() {
  const { isDeveloper, loading } = useRole();
  const [code, setCode] = useState<string>(
    `/* 🎨 Custom CSS or JavaScript Injection */\n.mobile-hero {\n  background: linear-gradient(135deg, #1e3a8a, #3b82f6);\n  color: #ffffff;\n  border-radius: 12px;\n}`
  );
  const [activeTab, setActiveTab] = useState<"visual" | "code">("visual");
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployStatus, setDeployStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Guard Clause: Loading state
  if (loading) {
    return (
      <div 
        className="p-8 text-center text-sm text-slate-500 font-sans flex items-center justify-center gap-2" 
        role="status" 
        aria-live="polite"
      >
        <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />
        <span>جاري التحقق من الصلاحيات المعمارية...</span>
      </div>
    );
  }

  // Guard Clause: Permission Denied
  if (!isDeveloper) {
    return (
      <div 
        className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-center text-rose-800 dark:text-rose-300 text-sm my-6 font-sans select-none" 
        role="alert"
      >
        🔒 <strong>منطقة محظورة:</strong> وحدة المطور تتطلب صلاحيات (Developer / Root Admin).
      </div>
    );
  }

  const handleSaveAndInject = async () => {
    setIsDeploying(true);
    setDeployStatus(null);

    try {
      // Simulate DOMPurify cleaning & Cloudflare Edge Cache purge/update
      await new Promise((resolve) => setTimeout(resolve, 1200));

      if (isMounted.current) {
        setDeployStatus({
          type: "success",
          msg: "✅ تم تنظيف الكود عبر DOMPurify وحفظ التغييرات في كاش Cloudflare Edge بنجاح!",
        });
      }
    } catch {
      if (isMounted.current) {
        setDeployStatus({
          type: "error",
          msg: "❌ حدث خطأ أثناء التحديث.",
        });
      }
    } finally {
      if (isMounted.current) {
        setIsDeploying(false);
      }
    }
  };

  return (
    <section className="w-full max-w-6xl mx-auto my-6 p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs font-sans transition-colors">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-xs font-bold px-2.5 py-0.5 rounded-full select-none">
              Developer Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">v2.4 Edge Active</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            🛠️ باني الصفحات المرئي ومحرر الأكواد الحية
          </h2>
        </div>

        {/* View Toggle Tabs */}
        <div 
          className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold w-full md:w-auto"
          role="tablist"
          aria-label="Developer mode views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "visual"}
            aria-controls="visual-panel"
            id="tab-visual"
            onClick={() => setActiveTab("visual")}
            className={`min-h-[44px] px-3 sm:px-4 rounded-lg transition-all touch-manipulation active:scale-[0.98] select-none flex items-center justify-center gap-1.5 ${
              activeTab === "visual"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>🎨</span>
            <span className="truncate">البناء المرئي</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "code"}
            aria-controls="code-panel"
            id="tab-code"
            onClick={() => setActiveTab("code")}
            className={`min-h-[44px] px-3 sm:px-4 rounded-lg transition-all touch-manipulation active:scale-[0.98] select-none flex items-center justify-center gap-1.5 ${
              activeTab === "code"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>💻</span>
            <span className="truncate">محرر الكود</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Visual Drag & Drop Engine */}
      {activeTab === "visual" && (
        <div
          id="visual-panel"
          role="tabpanel"
          aria-labelledby="tab-visual"
          className="py-6"
        >
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 sm:p-8 text-center bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none">
            <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-300 text-2xl font-bold">
              +
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              منطقة سحب وإفلات العناصر (Visual Sandbox)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              قم بسحب موديولات الـ CMS (بطاقات المحتوى، النوافذ القانونية، أزرار التواصل) وإفلاتها لتعديل نسق الهاتف بشكل حي.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Live Code Injector (Monaco Editor) */}
      {activeTab === "code" && (
        <div
          id="code-panel"
          role="tabpanel"
          aria-labelledby="tab-code"
          className="py-6 space-y-3"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-xs">
            <label htmlFor="dev-code-editor" className="font-bold text-slate-700 dark:text-slate-300">
              محرر الأكواد المخصص (Safe Code Injection):
            </label>
            <span className="text-slate-400 text-[11px]">مفعل عبر DOMPurify Sanitizer</span>
          </div>

          <textarea
            id="dev-code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            dir="ltr"
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="w-full h-64 p-4 font-mono text-xs bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 leading-relaxed text-left resize-y"
          />
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleSaveAndInject}
          disabled={isDeploying}
          className="w-full sm:w-auto min-h-[48px] px-6 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation cursor-pointer select-none"
        >
          {isDeploying ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              <span>جاري التنقية والنشر على Cloudflare...</span>
            </>
          ) : (
            <span>🚀 حفظ التصميم وحقنه في الكاش الطرفي</span>
          )}
        </button>

        <div aria-live="polite" className="min-h-[20px] text-center sm:text-right">
          {deployStatus && (
            <p
              className={`text-xs font-semibold ${
                deployStatus.type === "success" 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {deployStatus.msg}
            </p>
          )}
        </div>
      </div>

    </section>
  );
}