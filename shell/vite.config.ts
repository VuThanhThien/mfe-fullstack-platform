import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Docker sets CHOKIDAR_USEPOLLING. Type-hints opens ws://127.0.0.1:16322 from the
// browser — unreachable when Vite runs inside a container. Host hybrid only.
const enableMfTypeHints = process.env.CHOKIDAR_USEPOLLING !== 'true';

/**
 * @module-federation/vite@1.16.6 `rewriteEsmProxyConsumers` rewrites CJS-proxy
 * aliases after minify, using the proxy chunk's local (`Be`) while the host
 * body still uses Rollup's minified `commonjsGlobal` (`$`). That yields
 * `import { c as Be }` colliding with react-router-dom `var Be` (SyntaxError)
 * and `$&&$.__createBinding` as a free var (ReferenceError). Rebind colliding
 * unused import locals onto the `__createBinding` identifier; else drop them.
 */
function deconflictMfImportLocals(): Plugin {
  return {
    name: 'deconflict-mf-import-locals',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        const next = stripCollidingUnusedImportLocals(output.code);
        if (next !== output.code) output.code = next;
      }
    },
  };
}

function stripCollidingUnusedImportLocals(code: string): string {
  const createBinding = /([A-Za-z_$][\w$]*)&&\1\.__createBinding/.exec(code);
  const freeGlobal = createBinding?.[1] ?? null;
  const importRe = /import\s*\{([^}]+)\}\s*from\s*(["'][^"']+["'])\s*;?/g;
  const replacements: { start: number; end: number; replacement: string }[] =
    [];
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(code)) !== null) {
    const specs = match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const kept: string[] = [];
    let changed = false;
    for (const spec of specs) {
      const parts = spec.split(/\s+as\s+/);
      const imported = parts[0].trim();
      const local = (parts[1] || parts[0]).trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(local)) {
        kept.push(spec);
        continue;
      }
      const ident = local.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const decl = new RegExp(
        `(?:^|[\\n;{}])\\s*(?:const|let|var|class|function)\\s+${ident}(?![A-Za-z0-9_$])`,
      ).exec(code);
      if (!decl || decl.index < match.index) {
        kept.push(spec);
        continue;
      }
      const uses = [
        ...code.matchAll(
          new RegExp(`(?<![A-Za-z0-9_$])${ident}(?![A-Za-z0-9_$])`, 'g'),
        ),
      ];
      const importStart = match.index;
      const importEnd = importStart + match[0].length;
      const usesBeforeDecl = uses.filter(
        (u) =>
          u.index < decl.index &&
          (u.index < importStart || u.index >= importEnd),
      );
      if (usesBeforeDecl.length > 0) {
        kept.push(spec);
        continue;
      }
      changed = true;
      if (
        freeGlobal &&
        freeGlobal !== local &&
        /^[A-Za-z_$][\w$]*$/.test(freeGlobal)
      ) {
        kept.push(
          imported === freeGlobal ? imported : `${imported} as ${freeGlobal}`,
        );
      }
    }
    if (!changed) continue;
    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      replacement: kept.length
        ? `import{${kept.join(',')}}from${match[2]};`
        : '',
    });
  }
  let result = code;
  for (const r of replacements.reverse()) {
    result = result.slice(0, r.start) + r.replacement + result.slice(r.end);
  }
  return result;
}

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
    deconflictMfImportLocals(),
  ],

  server: {
    host: true,
    port: 5174,
    // All browser requests go through Caddy at :8080 — this is the gateway origin
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
