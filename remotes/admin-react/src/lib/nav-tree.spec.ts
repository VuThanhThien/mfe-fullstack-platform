import { describe, expect, it } from 'vitest';
import {
  canAddChild,
  collectBlockedParentIds,
  flattenNavTree,
  moveSibling,
  NAV_MAX_DEPTH,
} from './nav-tree';
import type { MfeNavItemDto } from './types';

function node(
  partial: Pick<MfeNavItemDto, 'id' | 'title'> & Partial<MfeNavItemDto>,
): MfeNavItemDto {
  return {
    type: 'route',
    path: partial.id,
    iconUrl: null,
    parentId: null,
    sortOrder: 0,
    scopeNames: ['DASHBOARD'],
    children: [],
    ...partial,
  };
}

describe('flattenNavTree', () => {
  it('walks depth-first and records siblings', () => {
    const tree = [
      node({
        id: 'a',
        title: 'A',
        type: 'group',
        path: null,
        children: [
          node({ id: 'a1', title: 'A1', parentId: 'a' }),
          node({ id: 'a2', title: 'A2', parentId: 'a' }),
        ],
      }),
      node({ id: 'b', title: 'B' }),
    ];

    const rows = flattenNavTree(tree);
    expect(rows.map((row) => [row.item.id, row.depth, row.index])).toEqual([
      ['a', 1, 0],
      ['a1', 2, 0],
      ['a2', 2, 1],
      ['b', 1, 1],
    ]);
    expect(rows[1]?.siblings.map((s) => s.id)).toEqual(['a1', 'a2']);
  });
});

describe('collectBlockedParentIds', () => {
  it('includes self and all descendants', () => {
    const root = node({
      id: 'root',
      title: 'Root',
      type: 'group',
      path: null,
      children: [
        node({
          id: 'child',
          title: 'Child',
          parentId: 'root',
          type: 'group',
          path: null,
          children: [node({ id: 'leaf', title: 'Leaf', parentId: 'child' })],
        }),
      ],
    });
    expect([...collectBlockedParentIds(root)].sort()).toEqual([
      'child',
      'leaf',
      'root',
    ]);
  });
});

describe('moveSibling', () => {
  const siblings = [
    node({ id: 'a', title: 'A', sortOrder: 0, parentId: null }),
    node({ id: 'b', title: 'B', sortOrder: 1, parentId: null }),
    node({ id: 'c', title: 'C', sortOrder: 2, parentId: null }),
  ];

  it('swaps with the neighbour and reindexes sortOrder', () => {
    expect(moveSibling(siblings, 'b', -1)).toEqual([
      { id: 'b', parentId: null, sortOrder: 0 },
      { id: 'a', parentId: null, sortOrder: 1 },
      { id: 'c', parentId: null, sortOrder: 2 },
    ]);
  });

  it('returns null at the ends', () => {
    expect(moveSibling(siblings, 'a', -1)).toBeNull();
    expect(moveSibling(siblings, 'c', 1)).toBeNull();
  });
});

describe('canAddChild', () => {
  it('stops at the server depth cap for groups', () => {
    expect(canAddChild(NAV_MAX_DEPTH - 1, 'group')).toBe(true);
    expect(canAddChild(NAV_MAX_DEPTH, 'group')).toBe(false);
  });

  it('rejects route nodes even when depth allows', () => {
    expect(canAddChild(1, 'route')).toBe(false);
  });
});
