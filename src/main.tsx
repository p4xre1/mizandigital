import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router"; // أو react-router-dom حسب النسخة لديك
import { router } from "./imports/routes";
import { I18nProvider } from "./app/lib/i18n"; // 👈 استيراد موفر اللغة هنا
import "./styles/index.css"; // أو ملف الـ CSS الرئيسي الخاص بك

// 🚀 حقن بيانات Schema.org ديناميكياً لتجنب حظر الـ CSP وتحقيق أرشفة مثالية على الهواتف
const schemaData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Mizan Digital",
  "alternateName": "منصة ميزان",
  "url": "https://mizandigital.pages.dev/",
  "description": "المرجع الأول للباحثين القانونيين في المغرب - أرشيف جامعي شامل ووظائف تشريعية محدثة.",
  "inLanguage": ["ar", "en", "fr", "es"],
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://mizandigital.pages.dev/{lang}/archive?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

const script = document.createElement('script');
script.type = 'application/ld+json';
script.text = JSON.stringify(schemaData);
document.head.appendChild(script);

// تشغيل الـ React Root المعتاد الخاص بك
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* 🚀 تغليف التطبيق بالكامل هنا يضمن عمل الترجمة في كل المسارات دون استثناء */}
    <I18nProvider> 
      <RouterProvider router={router} />
    </I18nProvider>
  </React.StrictMode>
);