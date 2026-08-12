import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(rootDir, "./src") },
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    manifest: true,
    chunkSizeWarningLimit: 500,
  },
});
