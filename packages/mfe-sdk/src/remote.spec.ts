/**
 * Remote loader spec
 *
 * MF runtime is mocked — do NOT load @module-federation/enhanced in Node unit tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLoadRemote = vi.fn();
const mockRegisterRemotes = vi.fn();

vi.mock('@module-federation/enhanced/runtime', () => ({
  registerRemotes: mockRegisterRemotes,
  loadRemote: mockLoadRemote,
}));

import { registerRemotes, loadRemote, toRuntimeEntry } from './remote.js';

const REMOTE_REF = {
  remoteEntry: 'http://localhost:8080/r/demo-react/remoteEntry.js',
  remoteName: 'productReact',
  exposedModule: './Product',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toRuntimeEntry()', () => {
  it('rewrites remoteEntry.js to mf-manifest.json', () => {
    expect(toRuntimeEntry('http://localhost:8080/r/demo-react/remoteEntry.js')).toBe(
      'http://localhost:8080/r/demo-react/mf-manifest.json',
    );
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

  it('throws if mount is missing', async () => {
    mockLoadRemote.mockResolvedValue({ unmount: vi.fn() });
    await expect(loadRemote(REMOTE_REF)).rejects.toThrow(/mount/i);
  });

  it('throws if unmount is missing', async () => {
    mockLoadRemote.mockResolvedValue({ mount: vi.fn() });
    await expect(loadRemote(REMOTE_REF)).rejects.toThrow(/unmount/i);
  });

  it('throws if module is null', async () => {
    mockLoadRemote.mockResolvedValue(null);
    await expect(loadRemote(REMOTE_REF)).rejects.toThrow();
  });

  it('calls loadRemote with correct moduleId (strips ./ prefix)', async () => {
    mockLoadRemote.mockResolvedValue({ mount: vi.fn(), unmount: vi.fn() });
    await loadRemote(REMOTE_REF);
    expect(mockLoadRemote).toHaveBeenCalledWith('productReact/Product');
  });
});
