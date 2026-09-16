/**
 * Produce Vite production assets without invoking a package.json "build" script.
 * Usage: node scripts/vite-prod.mjs <app-dir>
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(process.argv[2] || '.');
const require = createRequire(path.join(appDir, 'package.json'));

// Resolve vite from the target app so plugin deps match.
const { build } = require('vite');

process.chdir(appDir);
const result = await build({
  root: appDir,
  configFile: path.join(appDir, 'vite.config.ts'),
  logLevel: 'info',
});

console.log('vite-prod done', appDir, Array.isArray(result) ? result.length : 'ok');
