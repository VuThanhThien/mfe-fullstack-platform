import { describe, expect, it } from 'vitest';
import { createConfigSchema } from './config';
import {
  navItemSchema,
  toCreateNavItemBody,
  toUpdateNavItemBody,
} from './nav-item';

const validRoute = {
  type: 'route' as const,
  title: 'List',
  path: 'list',
  iconUrl: '',
  parentId: '',
  scopeNames: ['DASHBOARD'],
};

describe('navItemSchema', () => {
  it('accepts a route with a relative path', () => {
    expect(navItemSchema.safeParse(validRoute).success).toBe(true);
  });

  it('accepts a route with empty path (app index)', () => {
    expect(
      navItemSchema.safeParse({ ...validRoute, path: '' }).success,
    ).toBe(true);
  });

  it('rejects a leading slash and http icon URLs', () => {
    expect(
      navItemSchema.safeParse({ ...validRoute, path: '/list' }).success,
    ).toBe(false);
    expect(
      navItemSchema.safeParse({
        ...validRoute,
        iconUrl: 'http://example.com/x.png',
      }).success,
    ).toBe(false);
  });

  it('forbids path on group and requires at least one scope', () => {
    expect(
      navItemSchema.safeParse({
        ...validRoute,
        type: 'group',
        path: 'nope',
      }).success,
    ).toBe(false);
    expect(
      navItemSchema.safeParse({
        type: 'group',
        title: 'Folder',
        path: '',
        iconUrl: '',
        parentId: '',
        scopeNames: [],
      }).success,
    ).toBe(false);
    expect(
      navItemSchema.safeParse({
        type: 'group',
        title: 'Folder',
        path: '',
        iconUrl: 'https://example.com/folder.png',
        parentId: '',
        scopeNames: ['ADMIN'],
      }).success,
    ).toBe(true);
  });
});

describe('nav item payloads', () => {
  it('omits path/parent/icon on create when unset', () => {
    expect(
      toCreateNavItemBody({ ...validRoute, type: 'group', path: '' }, 2),
    ).toEqual({
      type: 'group',
      title: 'List',
      scopeNames: ['DASHBOARD'],
      sortOrder: 2,
    });
  });

  it('clears path and icon on group update', () => {
    expect(
      toUpdateNavItemBody({
        ...validRoute,
        type: 'group',
        path: 'stale',
        iconUrl: '',
        parentId: '',
      }),
    ).toEqual({
      type: 'group',
      title: 'List',
      path: null,
      iconUrl: null,
      parentId: null,
      scopeNames: ['DASHBOARD'],
    });
  });
});

describe('createConfigSchema iconUrl', () => {
  const base = {
    remoteEntry: 'http://localhost:8080/r/x/mf-manifest.json',
    remoteName: 'x',
    exposedModule: './App',
    routeName: 'demo',
    title: 'Demo',
    framework: 'react' as const,
    scopeNames: ['DASHBOARD'],
  };

  it('allows empty or https and rejects http', () => {
    expect(createConfigSchema.safeParse({ ...base, iconUrl: '' }).success).toBe(
      true,
    );
    expect(
      createConfigSchema.safeParse({
        ...base,
        iconUrl: 'https://example.com/i.png',
      }).success,
    ).toBe(true);
    expect(
      createConfigSchema.safeParse({
        ...base,
        iconUrl: 'http://example.com/i.png',
      }).success,
    ).toBe(false);
  });
});
