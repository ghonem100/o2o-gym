'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ApiResponse, User } from '@/types';
import { useRouter } from 'next/navigation';

interface LoginResponse {
  token: string;
  user: User;
}

/** Post-login landing page for a user, slug-aware. */
export function homePathFor(user: User): string {
  if (user.role === 'super_admin') return '/super-admin';
  const base = user.gymSlug ? `/gym/${user.gymSlug}` : '';
  return user.role === 'receptionist' ? `${base}/attendance` : `${base}/dashboard`;
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: { username: string; password: string; gymSlug?: string }) => {
      const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
      return data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      router.push(homePathFor(data.user));
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      try {
        await api.post('/auth/logout');
      } catch {
        // ignore network errors on logout
      }
    },
    onSettled: () => {
      const target = user?.gymSlug ? `/gym/${user.gymSlug}/login` : '/login';
      clearAuth();
      router.push(target);
    },
  });
}
