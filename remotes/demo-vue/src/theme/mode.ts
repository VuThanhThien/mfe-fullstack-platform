/**
 * Theme preference bridge — mirrors packages/mfe-ui/src/mode.ts constants.
 * Do NOT import @mfe/ui (React/MUI peers). Keep keys lockstep with @mfe/ui.
 * Preference only — never auth tokens.
 */
export type ThemeMode = 'light' | 'dark';

export const MODE_KEY = 'mfe-ui-mode';
export const MODE_EVENT = 'mfe-ui:mode';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function getMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === null) return 'light';
    return isThemeMode(raw) ? raw : 'light';
  } catch {
    return 'light';
  }
}

/** Apply Tailwind `dark` class on the remote mount element (scoped). */
export function applyModeToEl(el: HTMLElement, mode: ThemeMode): void {
  el.classList.toggle('dark', mode === 'dark');
}

/**
 * Subscribe to shell theme toggles (same-tab CustomEvent + cross-tab storage).
 * Returns unsubscribe.
 */
export function subscribeMode(cb: (mode: ThemeMode) => void): () => void {
  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (isThemeMode(detail)) cb(detail);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== MODE_KEY) return;
    cb(isThemeMode(event.newValue) ? event.newValue : 'light');
  };
  window.addEventListener(MODE_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(MODE_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

/** Bind mount element to shell theme for the lifetime of the remote. */
export function bindThemeToEl(el: HTMLElement): () => void {
  applyModeToEl(el, getMode());
  return subscribeMode((mode) => applyModeToEl(el, mode));
}
