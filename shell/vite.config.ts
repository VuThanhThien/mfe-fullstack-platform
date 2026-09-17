import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Docker sets CHOKIDAR_USEPOLLING. Type-hints opens ws://127.0.0.1:16322 from the
// browser — unreachable when Vite runs inside a container. Host hybrid only.
const enableMfTypeHints = process.env.CHOKIDAR_USEPOLLING !== 'true';

export default defineConfig({
  base: '/app/',

  plugins: [
    react(),
    federation({
      name: 'shell',
      // Remotes intentionally empty — registered at runtime from /api/v1/mfe-configs/accessible
      remotes: {},
      // Keep host init in index.html (default). Do NOT use "entry" — it breaks
      // default exports when App.tsx is incorrectly treated as the JS entry.
      hostInitInjectLocation: 'html',
      dts: enableMfTypeHints,
      dev: {
        disableDynamicRemoteTypeHints: !enableMfTypeHints,
      },
      shared: {
        '@mfe/sdk': {
          // Singleton keeps ONE in-memory access token across shell + remotes.
          // axios lives inside the SDK and is deliberately NOT shared.
          singleton: true,
          requiredVersion: '^0.1.0',
        },
        // Singleton so the shell and every remote share one form registry.
        // zod and @hookform/resolvers stay per-app (never share their subpaths).
        'react-hook-form': {
          singleton: true,
          requiredVersion: '^7.88.0',
        },
        react: {
          singleton: true,
          requiredVersion: '^18.3.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.3.0',
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^6.0.0',
        },
        '@emotion/react': {
          singleton: true,
          requiredVersion: '^11.0.0',
        },
        '@emotion/styled': {
          singleton: true,
          requiredVersion: '^11.0.0',
        },
      },
    }),
  ],

  server: {
    host: true,
    port: 5174,
    // All browser requests go through Caddy at :8080 — this is the gateway origin
    //TODO: use .env
    origin: 'http://localhost:8080',
    hmr: {
      clientPort: 8080,
    },
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    fs: {
      // Allow resolving @mfe/sdk and @mfe/ui from file: dependencies
      allow: ['..', '../packages/mfe-sdk', '../packages/mfe-ui'],
    },
  },
});
