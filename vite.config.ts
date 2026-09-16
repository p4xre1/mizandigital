import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(rootDir, "./src") },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".e2b.app", ".arena.ai", "localhost", ".e2b.dev"],
    headers: {
      "X-Frame-Options": "ALLOWALL",
    },
    cors: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: [".e2b.app", ".arena.ai", "localhost", ".e2b.dev"],
    headers: {
      "X-Frame-Options": "ALLOWALL",
      "Content-Security-Policy": "frame-ancestors *",
    },
    cors: true,
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        // ── لماذا advancedChunks بدل manualChunks ────────────────────────────
        // مع manualChunks كان Rolldown يضع الوحدة المشتركة الصغيرة
        // "vite/preload-helper" داخل أول chunk ضخم يستعملها (vendor-clerk ثم
        // pdf-worker). النتيجة: entry الصفحة الرئيسية كان يستورد رمزاً واحداً
        // صغيراً من chunk حجمه 428KB، فيُحمَّل pdfjs + Clerk (655KB) ويحلَّل
        // في الخيط الرئيسي على أول زيارة دون أي استعمال — وهو بالضبط ما
        // رصده Lighthouse في "unused JavaScript ≈ 467 KiB" و TBT/main-thread.
        // مجموعة preload-helper ذات الأولوية الأعلى تعزله في ملف ~1KB.
        advancedChunks: {
          groups: [
            { name: "preload-helper", test: /vite\/preload-helper/, priority: 100 },
            { name: "vendor-lucide", test: /lucide-react/, priority: 90 },
            { name: "vendor-react", test: /node_modules\/(?:react|react-dom|scheduler|react-router|react-router-dom)\//, priority: 80 },
            { name: "vendor-supabase", test: /@supabase/, priority: 70 },
            { name: "vendor-clerk", test: /@clerk/, priority: 60 },
            { name: "vendor-pdfjs", test: /pdfjs-dist/, priority: 50 },
            { name: "quiz-questions", test: /quiz-questions\.json/, priority: 40 },
            { name: "lexicon", test: /lexicon\.json/, priority: 40 },
            { name: "schools", test: /schools\.json/, priority: 40 },
            { name: "mizanScore", test: /mizanScore/, priority: 40 },
            { name: "vendor", test: /node_modules/, priority: 10 },
          ],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "lucide-react"],
    exclude: ["@clerk/clerk-react", "@supabase/supabase-js", "pdfjs-dist"],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
  },
});
