import { api } from '@mfe/sdk';
import type {
  CreateMfeNavItemBody,
  MfeNavItemDto,
  ReorderMfeNavItemEntry,
  UpdateMfeNavItemBody,
} from '../types';

export async function listNavItems(configId: string): Promise<MfeNavItemDto[]> {
  const { data } = await api.get<MfeNavItemDto[]>(
    `/api/v1/mfe-configs/${configId}/nav-items`,
  );
  return data;
}

export async function createNavItem(
  configId: string,
  body: CreateMfeNavItemBody,
): Promise<MfeNavItemDto> {
  const { data } = await api.post<MfeNavItemDto>(
    `/api/v1/mfe-configs/${configId}/nav-items`,
    body,
  );
  return data;
}

export async function updateNavItem(
  configId: string,
  itemId: string,
  body: UpdateMfeNavItemBody,
): Promise<MfeNavItemDto> {
  const { data } = await api.patch<MfeNavItemDto>(
    `/api/v1/mfe-configs/${configId}/nav-items/${itemId}`,
    body,
  );
  return data;
}

export async function deleteNavItem(
  configId: string,
  itemId: string,
): Promise<void> {
  await api.delete(`/api/v1/mfe-configs/${configId}/nav-items/${itemId}`);
}

export async function reorderNavItems(
  configId: string,
  items: ReorderMfeNavItemEntry[],
): Promise<MfeNavItemDto[]> {
  const { data } = await api.patch<MfeNavItemDto[]>(
    `/api/v1/mfe-configs/${configId}/nav-items/reorder`,
    { items },
  );
  return data;
}
