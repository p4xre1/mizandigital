import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router"; // أو react-router-dom حسب النسخة لديك
import { router } from "./imports/routes";
import { I18nProvider } from "./app/lib/i18n"; // 👈 استيراد موفر اللغة هنا
import "./styles/index.css"; // أو ملف الـ CSS الرئيسي الخاص بك

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* 🚀 تغليف التطبيق بالكامل هنا يضمن عمل الترجمة في كل المسارات دون استثناء */}
    <I18nProvider> 
      <RouterProvider router={router} />
    </I18nProvider>
  </React.StrictMode>
);