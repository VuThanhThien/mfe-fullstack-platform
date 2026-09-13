import { describe, expect, it } from 'vitest';
import { decodeJwtScopes } from './jwt-scopes';

/** Build an unverified JWT-shaped string with the given payload. */
function fakeJwt(payload: unknown): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${body}.sig`;
}

describe('decodeJwtScopes', () => {
  it('returns [] for null / malformed tokens', () => {
    expect(decodeJwtScopes(null)).toEqual([]);
    expect(decodeJwtScopes('not-a-jwt')).toEqual([]);
    expect(decodeJwtScopes('a.b')).toEqual([]);
  });

  it('reads scopes from a valid payload', () => {
    expect(decodeJwtScopes(fakeJwt({ scopes: ['ADMIN', 'DASHBOARD'] }))).toEqual([
      'ADMIN',
      'DASHBOARD',
    ]);
  });

  it('returns [] when scopes is missing or not an array', () => {
    expect(decodeJwtScopes(fakeJwt({}))).toEqual([]);
    expect(decodeJwtScopes(fakeJwt({ scopes: 'ADMIN' }))).toEqual([]);
  });

  it('filters non-string scope entries', () => {
    expect(decodeJwtScopes(fakeJwt({ scopes: ['ADMIN', 1, null, 'X'] }))).toEqual([
      'ADMIN',
      'X',
    ]);
  });
});
