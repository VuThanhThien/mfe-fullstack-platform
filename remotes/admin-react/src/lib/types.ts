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
  scopes?: ScopeDto[];
  createdAt?: string;
  updatedAt?: string;
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
