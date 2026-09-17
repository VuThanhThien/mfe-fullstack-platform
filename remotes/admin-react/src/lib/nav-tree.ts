import type { MfeNavItemDto, ReorderMfeNavItemEntry } from './types';

/** Mirrors backend `MFE_NAV_MAX_DEPTH`; UX prefers ≤ 3. */
export const NAV_MAX_DEPTH = 5;

export interface FlatNavNode {
  item: MfeNavItemDto;
  /** 1-based; roots are 1. */
  depth: number;
  siblings: MfeNavItemDto[];
  index: number;
}

export function flattenNavTree(
  nodes: MfeNavItemDto[],
  depth = 1,
): FlatNavNode[] {
  const out: FlatNavNode[] = [];
  nodes.forEach((item, index) => {
    const children = item.children ?? [];
    out.push({ item: { ...item, children }, depth, siblings: nodes, index });
    if (children.length > 0) {
      out.push(...flattenNavTree(children, depth + 1));
    }
  });
  return out;
}

/** Self + descendants — invalid parents when reparenting this node. */
export function collectBlockedParentIds(item: MfeNavItemDto): Set<string> {
  const ids = new Set<string>([item.id]);
  for (const child of item.children ?? []) {
    for (const id of collectBlockedParentIds(child)) {
      ids.add(id);
    }
  }
  return ids;
}

/** Only `group` nodes may have children; depth is 1-based (roots = 1). */
export function canAddChild(
  depth: number,
  type: MfeNavItemDto['type'] = 'group',
): boolean {
  return type === 'group' && depth < NAV_MAX_DEPTH;
}

export function moveSibling(
  siblings: MfeNavItemDto[],
  itemId: string,
  direction: -1 | 1,
): ReorderMfeNavItemEntry[] | null {
  const index = siblings.findIndex((sibling) => sibling.id === itemId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= siblings.length) return null;

  const ordered = [...siblings];
  const [moved] = ordered.splice(index, 1);
  ordered.splice(next, 0, moved);

  return ordered.map((item, sortOrder) => ({
    id: item.id,
    parentId: item.parentId ?? null,
    sortOrder,
  }));
}
