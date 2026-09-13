import { describe, it, expect } from 'vitest';
import { safeNext } from './next.js';

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
    expect(safeNext('/app/demo-react/nested/path')).toBe('/app/demo-react/nested/path');
  });

  it('preserves /app/ (trailing slash)', () => {
    expect(safeNext('/app/')).toBe('/app/');
  });

  it('returns /app for /application (must match ^/app(/.*)?$)', () => {
    expect(safeNext('/application')).toBe('/app');
  });
});
