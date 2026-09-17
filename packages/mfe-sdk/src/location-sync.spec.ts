/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  runWithoutLocationNotify,
  subscribeLocationChange,
} from './location-sync.js';

describe('location-sync', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/app/start');
  });

  afterEach(() => {
    // Drop listeners from prior tests (patch stays for process lifetime).
  });

  it('notifies on pushState to a different URL', () => {
    const spy = vi.fn();
    const unsub = subscribeLocationChange(spy);
    window.history.pushState(null, '', '/app/other');
    expect(spy).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('does not notify on same-URL pushState', () => {
    const spy = vi.fn();
    const unsub = subscribeLocationChange(spy);
    window.history.pushState(null, '', '/app/start');
    expect(spy).not.toHaveBeenCalled();
    unsub();
  });

  it('does not notify on same-URL replaceState', () => {
    const spy = vi.fn();
    const unsub = subscribeLocationChange(spy);
    window.history.replaceState(null, '', '/app/start');
    expect(spy).not.toHaveBeenCalled();
    unsub();
  });

  it('suppresses notify inside runWithoutLocationNotify', () => {
    const spy = vi.fn();
    const unsub = subscribeLocationChange(spy);
    runWithoutLocationNotify(() => {
      window.history.pushState(null, '', '/app/suppressed');
    });
    expect(spy).not.toHaveBeenCalled();
    unsub();
  });

  it('notifies multiple listeners', () => {
    const a = vi.fn();
    const b = vi.fn();
    const ua = subscribeLocationChange(a);
    const ub = subscribeLocationChange(b);
    window.history.pushState(null, '', '/app/multi');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    ua();
    ub();
  });

  it('unsubscribe stops further notifies', () => {
    const spy = vi.fn();
    const unsub = subscribeLocationChange(spy);
    unsub();
    window.history.pushState(null, '', '/app/after-unsub');
    expect(spy).not.toHaveBeenCalled();
  });

  it('notifies on popstate', () => {
    const spy = vi.fn();
    const unsub = subscribeLocationChange(spy);
    window.history.pushState(null, '', '/app/a');
    spy.mockClear();
    window.history.pushState(null, '', '/app/b');
    spy.mockClear();
    window.history.back();
    // jsdom may apply back synchronously or via event — dispatch if needed
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
    unsub();
  });
});
