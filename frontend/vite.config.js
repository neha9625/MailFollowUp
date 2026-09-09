import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy lets the frontend call `/api` on the same origin;
// in production Express serves the built app from the same origin too.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Allow preview/proxy hosts (e.g. *.e2b.app) in hosted dev environments
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
