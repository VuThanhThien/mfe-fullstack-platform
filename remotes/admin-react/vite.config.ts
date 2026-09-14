import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

// Docker sets CHOKIDAR_USEPOLLING. Type-hints opens ws://127.0.0.1:16322 from the
// browser — unreachable when Vite runs inside a container. Host hybrid only.
const enableMfTypeHints = process.env.CHOKIDAR_USEPOLLING !== 'true';

export default defineConfig({
  base: '/r/admin-react/',

  plugins: [
    react(),
    federation({
      name: 'adminReact',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/expose.tsx',
      },
      manifest: true,
      dts: enableMfTypeHints,
      dev: {
        remoteHmr: true,
        disableDynamicRemoteTypeHints: !enableMfTypeHints,
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
          // Singleton: one in-memory access token shared with the shell.
          // axios lives inside the SDK and is deliberately NOT shared.
          singleton: true,
          requiredVersion: '^0.1.0',
        },
        // Declared so the shell and any form-using remote negotiate ONE
        // react-hook-form instance. zod / @hookform/resolvers stay per-app.
        'react-hook-form': {
          singleton: true,
          requiredVersion: '^7.88.0',
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
    port: 5176,
    strictPort: true,
    origin: 'http://localhost:8080',
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      clientPort: 8080,
    },
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    fs: {
      allow: ['../../packages/mfe-sdk', '../../packages/mfe-ui', '.'],
    },
  },

  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
