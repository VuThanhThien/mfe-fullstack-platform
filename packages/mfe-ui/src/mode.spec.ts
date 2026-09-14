import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MODE_EVENT,
  MODE_KEY,
  getMode,
  setMode,
  subscribeMode,
} from './mode.js';

const store = new Map<string, string>();

function mockLocalStorage() {
  store.clear();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal('localStorage', localStorageMock);
}

function mockWindow() {
  const listeners = new Map<string, Set<EventListener>>();
  const win = {
    addEventListener: (type: string, listener: EventListener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener: (type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((l) => l(event));
      return true;
    },
  };
  vi.stubGlobal('window', win);
  vi.stubGlobal('CustomEvent', class CustomEvent<T> extends Event {
    detail: T;
    constructor(type: string, init?: CustomEventInit<T>) {
      super(type, init);
      this.detail = init?.detail as T;
    }
  });
  return { listeners, win };
}

afterEach(() => {
  vi.unstubAllGlobals();
  store.clear();
});

describe('getMode / setMode', () => {
  it('defaults to light when missing', () => {
    mockLocalStorage();
    mockWindow();
    expect(getMode()).toBe('light');
  });

  it('defaults to light when invalid', () => {
    mockLocalStorage();
    mockWindow();
    store.set(MODE_KEY, 'purple');
    expect(getMode()).toBe('light');
  });

  it('round-trips light and dark', () => {
    mockLocalStorage();
    mockWindow();
    setMode('dark');
    expect(getMode()).toBe('dark');
    expect(store.get(MODE_KEY)).toBe('dark');
    setMode('light');
    expect(getMode()).toBe('light');
  });

  it('ignores invalid setMode', () => {
    mockLocalStorage();
    mockWindow();
    setMode('dark');
    // @ts-expect-error intentional invalid
    setMode('nope');
    expect(getMode()).toBe('dark');
  });
});

describe('subscribeMode', () => {
  it('notifies on setMode and stops after unsubscribe', () => {
    mockLocalStorage();
    mockWindow();
    const cb = vi.fn();
    const unsub = subscribeMode(cb);
    setMode('dark');
    expect(cb).toHaveBeenCalledWith('dark');
    unsub();
    cb.mockClear();
    setMode('light');
    expect(cb).not.toHaveBeenCalled();
  });

  it('dispatches MODE_EVENT', () => {
    mockLocalStorage();
    const { listeners } = mockWindow();
    const seen: string[] = [];
    listeners.set(
      MODE_EVENT,
      new Set([
        ((e: Event) => {
          seen.push(String((e as CustomEvent).detail));
        }) as EventListener,
      ]),
    );
    setMode('dark');
    expect(seen).toContain('dark');
  });
});
