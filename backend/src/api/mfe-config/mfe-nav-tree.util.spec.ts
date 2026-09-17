import { Uuid } from '@/common/types/common.type';
import { MfeNavItemType } from './mfe-nav-item.constants';
import {
  filterAccessibleNavTree,
  graphHasCycle,
  type NavItemForTree,
} from './mfe-nav-tree.util';

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}` as Uuid;

const item = (
  overrides: Partial<NavItemForTree> & Pick<NavItemForTree, 'id' | 'title'>,
): NavItemForTree => ({
  type: MfeNavItemType.Route,
  sortOrder: 0,
  parentId: null,
  scopes: [{ name: 'DASHBOARD' }],
  ...overrides,
});

describe('filterAccessibleNavTree', () => {
  it('keeps nodes with ANY-overlap and drops the rest', () => {
    const tree = filterAccessibleNavTree(
      [
        item({
          id: id(1),
          title: 'Dash',
          path: 'dash',
          scopes: [{ name: 'DASHBOARD' }],
        }),
        item({
          id: id(2),
          title: 'Admin',
          path: 'admin',
          scopes: [{ name: 'ADMIN' }],
        }),
      ],
      ['DASHBOARD'],
    );

    expect(tree.map((n) => n.title)).toEqual(['Dash']);
  });

  it('drops children when the parent fails the filter', () => {
    const tree = filterAccessibleNavTree(
      [
        item({
          id: id(1),
          title: 'Admin tools',
          type: MfeNavItemType.Group,
          scopes: [{ name: 'ADMIN' }],
        }),
        item({
          id: id(2),
          title: 'Import',
          path: 'import',
          parentId: id(1),
          scopes: [{ name: 'DASHBOARD' }],
        }),
      ],
      ['DASHBOARD'],
    );

    expect(tree).toEqual([]);
  });

  it('drops empty groups after children are filtered out', () => {
    const tree = filterAccessibleNavTree(
      [
        item({
          id: id(1),
          title: 'Catalog',
          type: MfeNavItemType.Group,
          scopes: [{ name: 'DASHBOARD' }],
        }),
        item({
          id: id(2),
          title: 'Import',
          path: 'import',
          parentId: id(1),
          scopes: [{ name: 'ADMIN' }],
        }),
      ],
      ['DASHBOARD'],
    );

    expect(tree).toEqual([]);
  });

  it('keeps a group that still has a visible route child', () => {
    const tree = filterAccessibleNavTree(
      [
        item({
          id: id(1),
          title: 'Catalog',
          type: MfeNavItemType.Group,
          scopes: [{ name: 'DASHBOARD' }],
        }),
        item({
          id: id(2),
          title: 'List',
          path: 'list',
          parentId: id(1),
          sortOrder: 1,
          scopes: [{ name: 'DASHBOARD' }],
        }),
        item({
          id: id(3),
          title: 'Import',
          path: 'import',
          parentId: id(1),
          sortOrder: 0,
          scopes: [{ name: 'ADMIN' }],
        }),
      ],
      ['DASHBOARD'],
    );

    expect(tree).toHaveLength(1);
    expect(tree[0].title).toBe('Catalog');
    expect(tree[0].children.map((c) => c.title)).toEqual(['List']);
  });

  it('sorts siblings by sortOrder', () => {
    const tree = filterAccessibleNavTree(
      [
        item({
          id: id(1),
          title: 'B',
          path: 'b',
          sortOrder: 2,
        }),
        item({
          id: id(2),
          title: 'A',
          path: 'a',
          sortOrder: 0,
        }),
      ],
      ['DASHBOARD'],
    );

    expect(tree.map((n) => n.title)).toEqual(['A', 'B']);
  });

  it('returns the full tree when the user holds every node scope', () => {
    const tree = filterAccessibleNavTree(
      [
        item({
          id: id(1),
          title: 'Dash',
          path: 'dash',
          scopes: [{ name: 'DASHBOARD' }],
        }),
        item({
          id: id(2),
          title: 'Admin',
          path: 'admin',
          scopes: [{ name: 'ADMIN' }],
        }),
      ],
      ['DASHBOARD', 'ADMIN'],
    );

    expect(tree.map((n) => n.title)).toEqual(['Dash', 'Admin']);
  });
});

describe('graphHasCycle', () => {
  it('detects a self-parent', () => {
    expect(graphHasCycle([{ id: id(1), parentId: id(1) }])).toBe(true);
  });

  it('detects a two-node cycle', () => {
    expect(
      graphHasCycle([
        { id: id(1), parentId: id(2) },
        { id: id(2), parentId: id(1) },
      ]),
    ).toBe(true);
  });

  it('accepts a well-formed tree', () => {
    expect(
      graphHasCycle([
        { id: id(1), parentId: null },
        { id: id(2), parentId: id(1) },
      ]),
    ).toBe(false);
  });
});
