import { api } from '@mfe/sdk';
// Request bodies reuse the form schema types — those schemas mirror the Nest DTOs.
import type { CreateScopeForm, UpdateScopeForm } from '../../schemas/scope';
import type { OffsetPage, ScopeDto } from '../types';

export async function listScopes(
  page = 1,
  limit = 100,
): Promise<OffsetPage<ScopeDto>> {
  const { data } = await api.get<OffsetPage<ScopeDto>>('/api/v1/scopes', {
    params: { page, limit },
  });
  return data;
}

export async function getScope(id: string): Promise<ScopeDto> {
  const { data } = await api.get<ScopeDto>(`/api/v1/scopes/${id}`);
  return data;
}

export async function createScope(body: CreateScopeForm): Promise<ScopeDto> {
  const { data } = await api.post<ScopeDto>('/api/v1/scopes', body);
  return data;
}

export async function updateScope(
  id: string,
  body: UpdateScopeForm,
): Promise<ScopeDto> {
  const { data } = await api.patch<ScopeDto>(`/api/v1/scopes/${id}`, body);
  return data;
}

export async function deleteScope(id: string): Promise<void> {
  await api.delete(`/api/v1/scopes/${id}`);
}
