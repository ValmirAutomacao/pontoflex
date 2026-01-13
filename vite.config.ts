import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-ui': ['lucide-react', 'framer-motion', 'react-router-dom'],
          'vendor-utils': ['jspdf', 'html2canvas', '@supabase/supabase-js'],
          'vendor-biometria': ['face-api.js'],
        },
      },
    },
  },
});
