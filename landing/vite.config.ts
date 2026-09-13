import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,
    port: 5173,
    // Tell browser assets come from :8080 (Caddy gateway) — fixes HMR through proxy
    origin: 'http://localhost:8080',
    hmr: {
      clientPort: 8080,
    },
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    fs: {
      // Allow resolving @mfe/sdk from the packages directory
      allow: ['..'],
    },
  },
  optimizeDeps: {
    include: ['@mfe/sdk'],
  },
});
