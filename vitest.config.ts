import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(rootDir, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@sentry")) return "vendor-sentry";
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
              return "vendor-react";
            }
            return "vendor"; // All other npm dependencies
          }
        },
      },
    },
    chunkSizeWarningLimit: 800, // Raises warning threshold slightly to stay clean
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
  },
});