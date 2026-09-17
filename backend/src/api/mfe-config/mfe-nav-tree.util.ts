import { Uuid } from '@/common/types/common.type';
import { MfeNavItemType } from './mfe-nav-item.constants';

export type NavItemForTree = {
  id: Uuid;
  type: MfeNavItemType;
  title: string;
  path?: string | null;
  iconUrl?: string | null;
  parentId?: Uuid | null;
  sortOrder: number;
  createdAt?: Date;
  scopes?: { name: string }[];
};

export type NavTreeNode<T> = T & { children: NavTreeNode<T>[] };

function sortSiblings<T extends NavItemForTree>(a: T, b: T): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  const aTime = a.createdAt?.getTime() ?? 0;
  const bTime = b.createdAt?.getTime() ?? 0;
  return aTime - bTime;
}

export function hasScopeOverlap(
  userScopeNames: string[],
  nodeScopeNames: string[],
): boolean {
  if (!userScopeNames.length || !nodeScopeNames.length) return false;
  const userSet = new Set(userScopeNames);
  return nodeScopeNames.some((name) => userSet.has(name));
}

/**
 * ANY-overlap filter, then drop nodes whose ancestor was dropped, then drop
 * groups with no remaining route descendants. Result is a sorted forest.
 */
export function filterAccessibleNavTree<T extends NavItemForTree>(
  items: T[],
  userScopeNames: string[],
): NavTreeNode<T>[] {
  const visible = items.filter((item) =>
    hasScopeOverlap(
      userScopeNames,
      item.scopes?.map((scope) => scope.name) ?? [],
    ),
  );
  const visibleIds = new Set(visible.map((item) => item.id));
  const byId = new Map(items.map((item) => [item.id, item]));

  const withAncestors = visible.filter((item) => {
    let parentId = item.parentId ?? null;
    const seen = new Set<string>();
    while (parentId) {
      if (seen.has(parentId)) return false; // corrupt cycle — do not hang
      seen.add(parentId);
      if (!visibleIds.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return true;
  });

  const childrenOf = (parentId: Uuid | null): T[] =>
    withAncestors
      .filter((item) => (item.parentId ?? null) === parentId)
      .sort(sortSiblings);

  const isUseful = (item: T): boolean => {
    if (item.type === MfeNavItemType.Route) return true;
    return childrenOf(item.id).some(isUseful);
  };

  const useful = withAncestors.filter(isUseful);
  const usefulIds = new Set(useful.map((item) => item.id));

  const nest = (parentId: Uuid | null): NavTreeNode<T>[] =>
    useful
      .filter(
        (item) =>
          (item.parentId ?? null) === parentId && usefulIds.has(item.id),
      )
      .sort(sortSiblings)
      .map((item) => ({ ...item, children: nest(item.id) }));

  return nest(null);
}

export function buildAdminNavTree<T extends NavItemForTree>(
  items: T[],
): NavTreeNode<T>[] {
  const nest = (parentId: Uuid | null): NavTreeNode<T>[] =>
    items
      .filter((item) => (item.parentId ?? null) === parentId)
      .sort(sortSiblings)
      .map((item) => ({ ...item, children: nest(item.id) }));

  return nest(null);
}

/** Depth of a node if attached under `parentId` (root = 1). */
export function depthIfParent(
  parentId: Uuid | null,
  byId: Map<Uuid, { parentId?: Uuid | null }>,
): number {
  let depth = 1;
  let current = parentId;
  const seen = new Set<Uuid>();
  while (current) {
    if (seen.has(current)) {
      throw new Error('CYCLE');
    }
    seen.add(current);
    depth += 1;
    current = byId.get(current)?.parentId ?? null;
  }
  return depth;
}

export function subtreeHeight(
  id: Uuid,
  childrenByParent: Map<Uuid | null, { id: Uuid }[]>,
): number {
  const children = childrenByParent.get(id) ?? [];
  if (!children.length) return 1;
  return (
    1 +
    Math.max(
      ...children.map((child) => subtreeHeight(child.id, childrenByParent)),
    )
  );
}

export function graphHasCycle(
  items: { id: Uuid; parentId?: Uuid | null }[],
): boolean {
  const byId = new Map(items.map((item) => [item.id, item]));
  const visiting = new Set<Uuid>();
  const visited = new Set<Uuid>();

  const dfs = (id: Uuid): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const item of items) {
      if ((item.parentId ?? null) === id && dfs(item.id)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  // Also catch a node pointing at itself or an ancestor via parent walk.
  for (const item of items) {
    if (dfs(item.id)) return true;
    let current = item.parentId ?? null;
    const seen = new Set<Uuid>([item.id]);
    while (current) {
      if (seen.has(current)) return true;
      if (!byId.has(current)) break;
      seen.add(current);
      current = byId.get(current)?.parentId ?? null;
    }
  }
  return false;
}
