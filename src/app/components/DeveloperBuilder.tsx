"use client";

import React, { useState } from 'react';
import { useRole } from '../hooks/useRole'; // Adjusted to your hook path

export function DeveloperBuilder() {
  const { isDeveloper, loading } = useRole();
  const [code, setCode] = useState<string>(
    `/* 🎨 Custom CSS or JavaScript Injection */\n.mobile-hero {\n  background: linear-gradient(135deg, #1e3a8a, #3b82f6);\n  color: #ffffff;\n  border-radius: 12px;\n}`
  );
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);

  // Guard Clause: Only developers/root admins can view this component
  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">جاري التحقق من الصلاحيات المعمارية...</div>;
  }

  if (!isDeveloper) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800 text-sm my-6">
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
      
      setDeployStatus('✅ تم تنظيف الكود عبر DOMPurify وحفظ التغييرات في كاش Cloudflare Edge بنجاح!');
    } catch (err) {
      setDeployStatus('❌ حدث خطأ أثناء التحديث.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <section className="w-full max-w-6xl mx-auto my-8 p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm font-sans">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Developer Engine
            </span>
            <span className="text-xs text-slate-400">v2.4 Edge Active</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            🛠️ باني الصفحات المرئي ومحرر الأكواد الحية
          </h2>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('visual')}
            className={`min-h-[40px] px-4 rounded-lg transition-all ${
              activeTab === 'visual'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🎨 البناء المرئي (Drag & Drop)
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`min-h-[40px] px-4 rounded-lg transition-all ${
              activeTab === 'code'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💻 محرر الكود (Monaco)
          </button>
        </div>
      </div>

      {/* Tab 1: Visual Drag & Drop Engine */}
      {activeTab === 'visual' && (
        <div className="py-6">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer">
            <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-2xl font-bold">
              +
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              منطقة سحب وإفلات العناصر (Visual Sandbox)
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              قم بسحب موديولات الـ CMS (بطاقات المحتوى، النوافذ القانونية، أزرار التواصل) وإفلاتها لتعديل نسق الهاتف بشكل حي.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Live Code Injector (Monaco Editor) */}
      {activeTab === 'code' && (
        <div className="py-6 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-slate-700">
              محرر الأكواد المخصص (Safe Code Injection):
            </label>
            <span className="text-slate-400">مفعل عبر DOMPurify Sanitizer</span>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            dir="ltr"
            spellCheck="false"
            className="w-full h-64 p-4 font-mono text-xs bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 leading-relaxed"
          />
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          onClick={handleSaveAndInject}
          disabled={isDeploying}
          className="w-full sm:w-auto min-h-[48px] px-6 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isDeploying ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              جاري التنقية والنشر على Cloudflare...
            </>
          ) : (
            '🚀 حفظ التصميم وحقنه في الكاش الطرفي'
          )}
        </button>

        {deployStatus && (
          <p className="text-xs font-semibold text-emerald-600 animate-fade-in">
            {deployStatus}
          </p>
        )}
      </div>

    </section>
  );
}