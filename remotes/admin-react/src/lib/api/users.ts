import { api } from '@mfe/sdk';
// Request bodies reuse the form schema types — those schemas mirror the Nest DTOs.
import type { CreateUserForm, UpdateUserForm } from '../../schemas/user';
import type { OffsetPage, UserDto } from '../types';

export async function listUsers(page = 1, limit = 20): Promise<OffsetPage<UserDto>> {
  const { data } = await api.get<OffsetPage<UserDto>>('/api/v1/users', {
    params: { page, limit },
  });
  return data;
}

export async function getMe(): Promise<UserDto> {
  const { data } = await api.get<UserDto>('/api/v1/users/me');
  return data;
}

export async function getUser(id: string): Promise<UserDto> {
  const { data } = await api.get<UserDto>(`/api/v1/users/${id}`);
  return data;
}

export async function createUser(body: CreateUserForm): Promise<UserDto> {
  const { data } = await api.post<UserDto>('/api/v1/users', body);
  return data;
}

export async function updateUser(
  id: string,
  body: UpdateUserForm,
): Promise<UserDto> {
  const { data } = await api.patch<UserDto>(`/api/v1/users/${id}`, body);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/api/v1/users/${id}`);
}
