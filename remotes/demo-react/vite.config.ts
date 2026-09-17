import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// TODO: build .env for each app
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

/**
 * Local `pnpm dev` — standalone (base `/`, `/api` proxy).
 * `pnpm build` — federation assets under `/r/demo-react/` for gateway/prod.
 */
export default defineConfig(({ command }) => ({
  // TODO: should move /r/demo-react/ to package constant to avoid dupplicated
  base: command === 'build' ? '/r/demo-react/' : '/',

  plugins: [
    react(),
    federation({
      name: 'productReact',
      filename: 'remoteEntry.js',
      exposes: {
        './Product': './src/exposes/product.tsx',
        './Article': './src/exposes/article.tsx',
      },
      manifest: true,
      dts: true,
      // remoteHmr proxies /@react-refresh without getRefreshReg (breaks
      // @vitejs/plugin-react ≥4.7). Standalone / same-origin HMR uses Vite's
      // native refresh; shell↔remote fine-grained HMR stays off until MF fixes.
      dev: {
        remoteHmr: false,
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.3.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.3.0',
        },
        '@mfe/sdk': {
          singleton: true,
          requiredVersion: '^0.1.0',
        },
        'react-hook-form': {
          singleton: true,
          requiredVersion: '^7.88.0',
        },
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.0.0',
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^6.1.0',
        },
        '@emotion/react': {
          singleton: true,
          requiredVersion: '^11.13.0',
        },
        '@emotion/styled': {
          singleton: true,
          requiredVersion: '^11.13.0',
        },
      },
    }),
  ],

  server: {
    host: true,
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
    fs: {
      allow: ['../../packages/mfe-sdk', '../../packages/mfe-ui', '.'],
    },
  },
}));
