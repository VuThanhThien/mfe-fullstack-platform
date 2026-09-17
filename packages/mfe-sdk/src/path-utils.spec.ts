import { describe, expect, it } from 'vitest';
import {
  normPath,
  shellPathFromWindow,
  stripBasePath,
} from './path-utils.js';

describe('path-utils', () => {
  it('normPath strips trailing slash except root', () => {
    expect(normPath('/')).toBe('/');
    expect(normPath('/app/')).toBe('/app');
    expect(normPath('/app/x')).toBe('/app/x');
  });

  it('stripBasePath returns relative path', () => {
    expect(stripBasePath('/app/product', '/app/product')).toBe('/');
    expect(stripBasePath('/app/product', '/app/product/list')).toBe('/list');
    expect(stripBasePath('/app/product/', '/app/product/a/b')).toBe('/a/b');
    expect(stripBasePath('/app/product', '/elsewhere')).toBe('/');
  });

  it('shellPathFromWindow strips /app basename', () => {
    expect(shellPathFromWindow('/app')).toBe('/');
    expect(shellPathFromWindow('/app/')).toBe('/');
    expect(shellPathFromWindow('/app/admin/users')).toBe('/admin/users');
    expect(shellPathFromWindow('/login')).toBeNull();
  });
});
