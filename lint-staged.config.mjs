import path from 'node:path';

/**
 * Run eslint + prettier from the owning package so each app's flat config resolves.
 * @param {string} pkgDir package directory relative to repo root
 * @param {string[]} filenames absolute paths from lint-staged
 * @param {'pnpm' | 'npm'} pm package manager inside that package
 */
function lintFix(pkgDir, filenames, pm = 'pnpm') {
  const rel = filenames.map((f) => path.relative(pkgDir, f)).join(' ');
  const exec = pm === 'npm' ? 'npx' : 'pnpm exec';
  return [
    `cd ${pkgDir} && ${exec} eslint --fix ${rel}`,
    `cd ${pkgDir} && ${exec} prettier --write ${rel}`,
  ];
}

export default {
  'backend/**/*.{ts,js}': (filenames) => lintFix('backend', filenames),
  'landing/**/*.{ts,tsx}': (filenames) => lintFix('landing', filenames, 'npm'),
  'shell/**/*.{ts,tsx}': (filenames) => lintFix('shell', filenames),
  'remotes/demo-react/**/*.{ts,tsx}': (filenames) =>
    lintFix('remotes/demo-react', filenames),
  'remotes/admin-react/**/*.{ts,tsx}': (filenames) =>
    lintFix('remotes/admin-react', filenames),
  'remotes/demo-vue/**/*.{ts,tsx,vue}': (filenames) =>
    lintFix('remotes/demo-vue', filenames),
  'packages/mfe-sdk/**/*.{ts,tsx}': (filenames) =>
    lintFix('packages/mfe-sdk', filenames),
  'packages/mfe-ui/**/*.{ts,tsx}': (filenames) =>
    lintFix('packages/mfe-ui', filenames),
};
