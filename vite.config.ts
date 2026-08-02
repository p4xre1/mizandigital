import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',

  plugins: [react()],

  // ⚡ CORS PROXY: Routes local /api requests to production without CORS errors
  server: {
    proxy: {
      '/api': {
        target: 'https://www.mizan.page',
        changeOrigin: true,
        secure: true,
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },

  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },

  build: {
    target: 'es2022',
    cssCodeSplit: true,
    manifest: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // ⚡ OPTIMIZED CHUNKING: Isolates React core and UI icon library to minimize TBT
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'react-core';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'lucide-icons';
          }
        },
      },
    },
  },
});