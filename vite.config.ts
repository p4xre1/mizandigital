import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // 1. CRITICAL: Absolute root path ensures scripts load correctly on dynamic routes (e.g. /ar/news/schools)
  base: '/',

  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Force Vite to deduplicate core React packages across chunks
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },

  // 2. Production console stripping
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },

  build: {
    target: 'es2020',
    cssCodeSplit: true,
    // Ensures clean manifest generation for PWA & asset tracking
    manifest: true,
    rollupOptions: {
      output: {
        // Standardize output file naming for predictable server caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group core React framework modules safely
            if (
              id.includes('react/') ||
              id.includes('react-dom/') ||
              id.includes('react-router') ||
              id.includes('react-router-dom')
            ) {
              return 'framework';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            return 'vendor';
          }
        },
      },
    },
  },
});