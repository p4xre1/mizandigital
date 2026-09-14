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
    host: true,
    // إعداد خادم التطوير فقط: يسمح بفتح الموقع من مضيفات المعاينة
    // (مثل *.e2b.app المستعملة في بيئات التطوير السحابية) بدل رفض الطلب
    // بـ HTTP 403 "Blocked request". لا أثر له على بناء الإنتاج.
    allowedHosts: [".e2b.app", ".arena.ai", "localhost"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase")) return "vendor-supabase";

            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router")
            ) {
              return "vendor-react";
            }
            return "vendor";
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
  },
});