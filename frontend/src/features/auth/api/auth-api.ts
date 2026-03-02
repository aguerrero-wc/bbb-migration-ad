import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '@/types';
import { api } from '@/shared/lib/api';

export async function loginApi(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await api.post<{ data: AuthResponse }>('/auth/login', credentials);
  return response.data.data;
}

export async function registerApi(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await api.post<{ data: AuthResponse }>('/auth/register', credentials);
  return response.data.data;
}

export async function refreshApi(refreshToken: string): Promise<AuthResponse> {
  const response = await api.post<{ data: AuthResponse }>('/auth/refresh', { refreshToken });
  return response.data.data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

export async function getProfileApi(): Promise<User> {
  const response = await api.get<{ data: User }>('/auth/me');
  return response.data.data;
}
