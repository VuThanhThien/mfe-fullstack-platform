/**
 * Standalone entry — Mode C redirect stub.
 * No Vue LoginForm. UI DX = shell at :8080/app/vue.
 */
import {
  refresh,
  setRedirectPolicy,
  sanitizeNextForPolicy,
} from '@mfe/sdk';
import { mountStandalone } from './exposes/app';

setRedirectPolicy('standalone');

const loginBase =
  import.meta.env.VITE_PUBLIC_LOGIN_URL ?? 'http://localhost:8080/login';

function redirectToLogin(): void {
  const next = sanitizeNextForPolicy(window.location.pathname + window.location.search);
  const url = new URL(loginBase, window.location.origin);
  url.searchParams.set('next', next);
  window.location.assign(url.toString());
}

async function boot(): Promise<void> {
  const el = document.getElementById('app');
  if (!el) return;

  try {
    await refresh();
    mountStandalone(el, {
      basePath: '/',
      routeName: 'vue',
    });
  } catch {
    redirectToLogin();
  }
}

void boot();
