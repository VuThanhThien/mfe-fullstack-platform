import { afterEach, describe, expect, it } from 'vitest';
import {
  getRedirectPolicy,
  safeNext,
  safeStandalonePath,
  sanitizeNextForPolicy,
  setRedirectPolicy,
} from './next.js';

afterEach(() => {
  setRedirectPolicy('shell');
});

describe('safeNext', () => {
  it('returns /app for null', () => {
    expect(safeNext(null)).toBe('/app');
  });

  it('returns /app for undefined', () => {
    expect(safeNext(undefined)).toBe('/app');
  });

  it('returns /app for empty string', () => {
    expect(safeNext('')).toBe('/app');
  });

  it('returns /app for absolute evil URL', () => {
    expect(safeNext('https://evil.test')).toBe('/app');
  });

  it('returns /app for //evil.test (protocol-relative)', () => {
    expect(safeNext('//evil.test')).toBe('/app');
  });

  it('returns /app for /login', () => {
    expect(safeNext('/login')).toBe('/app');
  });

  it('returns /app for bare /', () => {
    expect(safeNext('/')).toBe('/app');
  });

  it('returns /app for /app without trailing slash or path (exact match)', () => {
    // /app itself is valid
    expect(safeNext('/app')).toBe('/app');
  });

  it('preserves /app/demo', () => {
    expect(safeNext('/app/demo')).toBe('/app/demo');
  });

  it('preserves /app/demo-react/nested/path', () => {
    expect(safeNext('/app/demo-react/nested/path')).toBe(
      '/app/demo-react/nested/path',
    );
  });

  it('preserves /app/ (trailing slash)', () => {
    expect(safeNext('/app/')).toBe('/app/');
  });

  it('returns /app for /application (must match ^/app(/.*)?$)', () => {
    expect(safeNext('/application')).toBe('/app');
  });
});

describe('safeStandalonePath', () => {
  it('returns fallback for null/undefined/empty', () => {
    expect(safeStandalonePath(null)).toBe('/');
    expect(safeStandalonePath(undefined)).toBe('/');
    expect(safeStandalonePath('')).toBe('/');
    expect(safeStandalonePath('', '/login')).toBe('/login');
  });

  it('allows same-origin relative paths', () => {
    expect(safeStandalonePath('/')).toBe('/');
    expect(safeStandalonePath('/login')).toBe('/login');
    expect(safeStandalonePath('/products')).toBe('/products');
    expect(safeStandalonePath('/products/42')).toBe('/products/42');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeStandalonePath('https://evil.test')).toBe('/');
    expect(safeStandalonePath('http://evil.test/x')).toBe('/');
    expect(safeStandalonePath('//evil.test')).toBe('/');
  });

  it('rejects backslash tricks', () => {
    expect(safeStandalonePath('/\\evil')).toBe('/');
  });
});

describe('setRedirectPolicy', () => {
  it('defaults to shell (safeNext)', () => {
    expect(getRedirectPolicy()).toBe('shell');
    expect(sanitizeNextForPolicy('/products')).toBe('/app');
    expect(sanitizeNextForPolicy('/app/demo')).toBe('/app/demo');
  });

  it('standalone uses safeStandalonePath', () => {
    setRedirectPolicy('standalone');
    expect(sanitizeNextForPolicy('/products')).toBe('/products');
    expect(sanitizeNextForPolicy('https://evil.test')).toBe('/');
    expect(sanitizeNextForPolicy('/login')).toBe('/login');
  });
});
