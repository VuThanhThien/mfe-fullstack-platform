/**
 * Remote loader spec
 *
 * MF runtime is injected — do NOT load @module-federation/enhanced in Node unit tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearMfRuntime,
  loadRemote,
  registerRemotes,
  setMfRuntime,
  toRuntimeEntry,
} from './remote.js';

const mockLoadRemote = vi.fn();
const mockRegisterRemotes = vi.fn();

const REMOTE_REF = {
  remoteEntry: 'http://localhost:8080/r/demo-react/remoteEntry.js',
  remoteName: 'productReact',
  exposedModule: './Product',
};

beforeEach(() => {
  vi.clearAllMocks();
  setMfRuntime({
    registerRemotes: mockRegisterRemotes,
    loadRemote: mockLoadRemote,
  });
});

afterEach(() => {
  clearMfRuntime();
});

describe('toRuntimeEntry()', () => {
  it('rewrites remoteEntry.js to mf-manifest.json', () => {
    expect(
      toRuntimeEntry('http://localhost:8080/r/demo-react/remoteEntry.js'),
    ).toBe('http://localhost:8080/r/demo-react/mf-manifest.json');
  });

  it('leaves mf-manifest.json unchanged', () => {
    const url = 'http://localhost:8080/r/demo-react/mf-manifest.json';
    expect(toRuntimeEntry(url)).toBe(url);
  });
});

describe('registerRemotes()', () => {
  it('maps to ESM manifest entry and force-registers on host APIs', async () => {
    await registerRemotes([REMOTE_REF]);
    expect(mockRegisterRemotes).toHaveBeenCalledWith(
      [
        {
          name: 'productReact',
          entry: 'http://localhost:8080/r/demo-react/mf-manifest.json',
          type: 'module',
        },
      ],
      { force: true },
    );
  });

  it('dedupes by remoteName when multiple configs share a bundle', async () => {
    await registerRemotes([
      REMOTE_REF,
      {
        ...REMOTE_REF,
        exposedModule: './Article',
      },
    ]);
    expect(mockRegisterRemotes).toHaveBeenCalledTimes(1);
    expect(mockRegisterRemotes.mock.calls[0][0]).toHaveLength(1);
  });

  it('throws when runtime was never injected', async () => {
    clearMfRuntime();
    await expect(registerRemotes([REMOTE_REF])).rejects.toThrow(
      /MF runtime not set/,
    );
  });
});

describe('loadRemote()', () => {
  it('returns module when { mount, unmount } are present', async () => {
    const mod = { mount: vi.fn(), unmount: vi.fn(), extra: 'ok' };
    mockLoadRemote.mockResolvedValue(mod);

    const result = await loadRemote(REMOTE_REF);
    expect(result.mount).toBe(mod.mount);
    expect(result.unmount).toBe(mod.unmount);
  });

  it('force-registers before loadRemote', async () => {
    mockLoadRemote.mockResolvedValue({ mount: vi.fn(), unmount: vi.fn() });
    await loadRemote(REMOTE_REF);
    expect(mockRegisterRemotes).toHaveBeenCalledWith(
      [
        {
          name: 'productReact',
          entry: 'http://localhost:8080/r/demo-react/mf-manifest.json',
          type: 'module',
        },
      ],
      { force: true },
    );
  });

  it('rejects when mount/unmount missing', async () => {
    mockLoadRemote.mockResolvedValue({ foo: 1 });
    await expect(loadRemote(REMOTE_REF)).rejects.toThrow(
      /must export \{ mount, unmount \}/,
    );
  });
});
