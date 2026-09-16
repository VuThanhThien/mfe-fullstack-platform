import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Local `npm run dev` — API proxy for backend-only DX. Docker/prod uses static build + gateway. */
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    include: ['@mfe/sdk', '@mfe/ui'],
  },
});
