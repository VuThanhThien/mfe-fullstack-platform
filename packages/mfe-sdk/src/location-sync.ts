/**
 * Single window.history patch shared by shell + remotes.
 * Nested routers must not each wrap pushState — last wrapper wins and breaks others.
 *
 * Listeners must be re-entry safe: history mutations from a listener notify again.
 * Same-URL push/replace is a no-op for listeners (React Router often replaceStates
 * the current URL after navigate — that must not re-enter sync loops).
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let patched = false;
/** Suppress nested notify while a listener is applying a history write. */
let depth = 0;

function hrefOf(url: string | URL | null | undefined): string {
  if (url == null || url === '') {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  if (typeof url === 'string') {
    try {
      const u = new URL(url, window.location.href);
      return `${u.pathname}${u.search}${u.hash}`;
    } catch {
      return url;
    }
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function currentHref(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function notify(): void {
  if (depth > 0) return;
  for (const listener of listeners) {
    listener();
  }
}

function ensurePatched(): void {
  if (patched || typeof window === 'undefined') return;
  patched = true;

  const { pushState, replaceState } = window.history;
  window.history.pushState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    const next = hrefOf(url);
    const same = next === currentHref();
    const result = pushState.call(this, data, unused, url);
    if (!same) notify();
    return result;
  };
  window.history.replaceState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    const next = hrefOf(url);
    const same = next === currentHref();
    const result = replaceState.call(this, data, unused, url);
    if (!same) notify();
    return result;
  };
  window.addEventListener('popstate', notify);
}

/**
 * Run `fn` without notifying location listeners (use when applying a sync write
 * that would otherwise echo back into the same listener).
 */
export function runWithoutLocationNotify(fn: () => void): void {
  depth += 1;
  try {
    fn();
  } finally {
    depth -= 1;
  }
}

/** Subscribe to pathname changes (pushState / replaceState / popstate). */
export function subscribeLocationChange(listener: Listener): () => void {
  ensurePatched();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
