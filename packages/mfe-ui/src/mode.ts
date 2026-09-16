/**
 * Theme preference only — never store auth tokens here.
 * Access = memory; refresh = HttpOnly cookie.
 */
export type ThemeMode = 'light' | 'dark';

export const MODE_KEY = 'mfe-ui-mode';
export const MODE_EVENT = 'mfe-ui:mode';

/** In-memory fallback when localStorage is unavailable. */
let memoryMode: ThemeMode = 'light';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function writeStorage(mode: ThemeMode): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // private mode / blocked — memory + event still work
    if (typeof console !== 'undefined') {
      console.warn(
        '[@mfe/ui] localStorage unavailable; theme mode is session-only',
      );
    }
  }
}

export function getMode(): ThemeMode {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(MODE_KEY);
      if (raw === null) {
        return memoryMode;
      }
      if (isThemeMode(raw)) {
        memoryMode = raw;
        return raw;
      }
      // corrupt value → light
      memoryMode = 'light';
      return 'light';
    }
  } catch {
    // blocked — fall through to memory
  }
  return memoryMode;
}

export function setMode(mode: ThemeMode): void {
  if (!isThemeMode(mode)) return;
  memoryMode = mode;
  writeStorage(mode);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: mode }));
  }
}

/**
 * Subscribe to theme mode changes (same-tab CustomEvent + cross-tab storage).
 * Returns unsubscribe.
 */
export function subscribeMode(cb: (mode: ThemeMode) => void): () => void {
  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!isThemeMode(detail)) return;
    try {
      cb(detail);
    } catch {
      // isolate subscriber failures
    }
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== MODE_KEY) return;
    const next = isThemeMode(event.newValue) ? event.newValue : getMode();
    try {
      cb(next);
    } catch {
      // isolate subscriber failures
    }
  };

  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener(MODE_EVENT, onCustom);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(MODE_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
