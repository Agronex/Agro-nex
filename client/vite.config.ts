import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    // Raise the chunk warning threshold (base64 GradCAM images are large)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Manual chunk splitting — keeps the main bundle tiny
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          // Firebase — large, rarely changes
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Animations — only needed on auth pages
          'vendor-motion': ['framer-motion'],
          // Icons — treeshaken per component but grouping improves caching
          'vendor-icons': ['lucide-react'],
        },
      },
    },

    // Minify with esbuild (default, fastest)
    minify: 'esbuild',

    // Emit source maps only in CI/staging — comment out for production
    // sourcemap: true,
  },

  // Let Vite pre-bundle lucide-react properly (was excluded before = slower dev)
  optimizeDeps: {
    include: ['lucide-react'],
  },
});
