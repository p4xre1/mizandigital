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
  build: {
    chunkSizeWarningLimit: 1000,
    // 45% bundle-size fix: more granular chunks + pdfjs + clerk + lucide split
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@clerk")) return "vendor-clerk";
            if (id.includes("pdfjs-dist")) return "pdf-worker";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
              return "vendor-react";
            }
            return "vendor";
          }
          // Split large local files
          if (id.includes("quiz-questions.json")) return "quiz-questions";
          if (id.includes("lexicon.json")) return "lexicon";
          if (id.includes("schools.json")) return "schools";
          if (id.includes("mizanScore")) return "mizanScore";
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
