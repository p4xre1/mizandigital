import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) { 
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        // 🌟 Granular chunk splitting to eliminate the 900kB+ single vendor file
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'framework';
            }
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui-ui';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'radix-ui';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts';
            }
            if (id.includes('motion')) {
              return 'animations';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            return 'vendor-common';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})