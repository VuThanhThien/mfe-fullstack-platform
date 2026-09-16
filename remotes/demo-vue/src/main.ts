/**
 * Standalone entry — dual-mode SessionGate + local LoginForm (Spec A parity).
 * Hosted MF uses exposes/app.ts `mount` only (no gate).
 */
import { createApp } from 'vue';
import { safeStandalonePath, setRedirect, setRedirectPolicy } from '@mfe/sdk';
import StandaloneRoot from './StandaloneRoot.vue';

setRedirectPolicy('standalone');

setRedirect((url) => {
  const next = new URL(url, window.location.origin).searchParams.get('next');
  // Reload the sanitized path in place so SessionGate can re-bootstrap;
  // do not map onto `/?next=` (nothing consumes that query on this SPA).
  window.location.assign(safeStandalonePath(next, '/'));
});

createApp(StandaloneRoot).mount('#app');
