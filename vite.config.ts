/// <reference types="vitest" />
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000,      // Custom port (change as needed)
    strictPort: true, // Exit if port is already in use
    hmr: {
      port: 24678, // Use a specific port for HMR in Gitpod
    },
    // open: true,       // Auto-open browser
  },
  preview: {
    host: '0.0.0.0', // For production preview
    port: 3000,
  },
  // @ts-expect-error - Vitest config extends Vite config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: true,
  },
});
