import type { MfeNavNode } from '@mfe/sdk';

/** Strip leading/trailing slashes so hrefs match basename-relative paths. */
export function normalizeNavPath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

/**
 * Leaf href under BrowserRouter basename `/app`.
 * Empty `path` = app index → `/{routeName}`.
 */
export function leafHref(routeName: string, path: string): string {
  const normalized = normalizeNavPath(path);
  return normalized ? `/${routeName}/${normalized}` : `/${routeName}`;
}

/**
 * Longest path-prefix match among `route` leaves.
 * `pathname` is react-router's (basename already stripped).
 * Index leaves (`path` empty) match `/{routeName}` and nested detail URLs.
 */
export function matchActiveLeafId(
  nodes: MfeNavNode[],
  routeName: string,
  pathname: string,
): string | null {
  let bestId: string | null = null;
  let bestLen = -1;

  function walk(list: MfeNavNode[]) {
    for (const node of list) {
      if (node.type === 'route') {
        const href = leafHref(routeName, node.path ?? '');
        const matches =
          pathname === href ||
          pathname === `${href}/` ||
          pathname.startsWith(`${href}/`);
        if (matches && href.length > bestLen) {
          bestLen = href.length;
          bestId = node.id;
        }
      }
      if (node.children.length > 0) walk(node.children);
    }
  }

  walk(nodes);
  return bestId;
}
