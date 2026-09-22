# 🛠️ Mizan Digital - Terminal Commands Reference

Quick guide for all development, testing, validation, and build commands for `mizan.page`.

---

## 🚀   Development & Local Server

> ⚠️ `pnpm dev` و`pnpm preview` **لا يقرآن `public/_headers`**، فلا تُطبَّق سياسة
> CSP محلياً. ولهذا لا تظهر أعطال CSP (مثل حجب حزمة التطبيق) إلا على الإنتاج.
> للمعاينة بالترويسات الحقيقية: `pnpm build && pnpm preview:prod` — ثم افتح
> وحدة التحكم: أي مخالفة CSP تظهر هناك قبل النشر.

* **Start Development Server:**
  ```bash
  pnpm dev