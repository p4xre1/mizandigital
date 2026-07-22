import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // ⚡ Force Vite to deduplicate core React and React Router packages
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  build: {
    target: 'es2020', // ⚡ Modern JS target for faster parsing on smartphones
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router')
            ) {
              return 'framework';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // Group all other npm modules into vendor to avoid circular references
            return 'vendor';
          }
        },
      },
    },
  },
});