import { api } from '@mfe/sdk';
// Request bodies reuse the form schema types — those schemas mirror the Nest DTOs.
import type { CreateConfigForm, UpdateConfigForm } from '../../schemas/config';
import type { MfeConfigDto, OffsetPage } from '../types';

/** Empty form icon → omit on create; `null` on update so the field can clear. */
function withIconUrl<T extends { iconUrl?: string }>(
  body: T,
  emptyAs: 'omit' | 'null',
): T | (Omit<T, 'iconUrl'> & { iconUrl?: string | null }) {
  const trimmed = body.iconUrl?.trim();
  if (trimmed) return { ...body, iconUrl: trimmed };
  if (emptyAs === 'omit') {
    const next = { ...body };
    delete next.iconUrl;
    return next;
  }
  return { ...body, iconUrl: null };
}

export async function listConfigs(
  page = 1,
  limit = 50,
): Promise<OffsetPage<MfeConfigDto>> {
  const { data } = await api.get<OffsetPage<MfeConfigDto>>(
    '/api/v1/mfe-configs',
    {
      params: { page, limit },
    },
  );
  return data;
}

export async function getConfig(id: string): Promise<MfeConfigDto> {
  const { data } = await api.get<MfeConfigDto>(`/api/v1/mfe-configs/${id}`);
  return data;
}

export async function createConfig(
  body: CreateConfigForm,
): Promise<MfeConfigDto> {
  const { data } = await api.post<MfeConfigDto>(
    '/api/v1/mfe-configs',
    withIconUrl(body, 'omit'),
  );
  return data;
}

export async function updateConfig(
  id: string,
  body: UpdateConfigForm,
): Promise<MfeConfigDto> {
  const { data } = await api.patch<MfeConfigDto>(
    `/api/v1/mfe-configs/${id}`,
    withIconUrl(body, 'null'),
  );
  return data;
}

export async function deleteConfig(id: string): Promise<void> {
  await api.delete(`/api/v1/mfe-configs/${id}`);
}
