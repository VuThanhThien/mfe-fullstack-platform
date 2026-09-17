export interface ScopeDto {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  bio?: string;
  image?: string;
  scopes?: ScopeDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MfeConfigDto {
  id: string;
  remoteEntry: string;
  remoteName: string;
  exposedModule: string;
  routeName: string;
  title: string;
  framework: string;
  iconUrl?: string | null;
  scopes?: ScopeDto[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Admin nav DTOs — local mirrors of backend res/req until `@mfe/sdk` exports
 * them (phase 02). Prefer SDK types when they land; do not import axios.
 */
export type MfeNavItemType = 'group' | 'route';

export interface MfeNavItemDto {
  id: string;
  type: MfeNavItemType;
  title: string;
  path?: string | null;
  iconUrl?: string | null;
  parentId?: string | null;
  sortOrder: number;
  scopeNames: string[];
  children: MfeNavItemDto[];
}

export interface CreateMfeNavItemBody {
  type: MfeNavItemType;
  title: string;
  path?: string;
  iconUrl?: string;
  parentId?: string;
  sortOrder?: number;
  scopeNames: string[];
}

export interface UpdateMfeNavItemBody {
  type?: MfeNavItemType;
  title?: string;
  path?: string | null;
  iconUrl?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  scopeNames?: string[];
}

export interface ReorderMfeNavItemEntry {
  id: string;
  parentId?: string | null;
  sortOrder: number;
}

export interface OffsetPagination {
  limit: number;
  currentPage: number;
  nextPage?: number;
  previousPage?: number;
  totalRecords: number;
  totalPages: number;
}

export interface OffsetPage<T> {
  data: T[];
  pagination: OffsetPagination;
}
