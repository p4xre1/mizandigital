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
    target: 'es2020',
    cssCodeSplit: true,
    manifest: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // ⚡ SAFE CHUNKING: Isolates React core while letting Rollup resolve vendor TDZ dependencies safely
        manualChunks(id) {
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router')
          ) {
            return 'react-core';
          }
        },
      },
    },
  },
});