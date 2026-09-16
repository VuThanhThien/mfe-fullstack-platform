import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { federation } from '@module-federation/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

/**
 * Local `pnpm dev` — standalone (base `/`, `/api` proxy).
 * `pnpm build` — federation assets under `/r/demo-vue/` for gateway/prod.
 */
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/r/demo-vue/' : '/',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  plugins: [
    vue(),
    tailwindcss(),
    federation({
      name: 'demoVue',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/exposes/app.ts',
      },
      manifest: true,
      dts: true,
      dev: {
        remoteHmr: false,
      },
      shared: {
        vue: {
          singleton: true,
          requiredVersion: '^3.5.0',
        },
        'vue-router': {
          singleton: true,
          requiredVersion: '^4.2.0',
        },
        pinia: {
          singleton: true,
          requiredVersion: '^3.0.0',
        },
        '@mfe/sdk': {
          // Singleton: host shell's in-memory token wins. Keep a local fallback
          // factory (do not set import:false) so mf-manifest.json ships share
          // assets — empty assets have broken host share matching at register.
          singleton: true,
          requiredVersion: '^0.1.0',
        },
      },
    }),
  ],

  server: {
    host: true,
    port: 5177,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
    fs: {
      allow: ['../../packages/mfe-sdk', '.'],
    },
  },
}));
