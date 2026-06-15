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

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
      return data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      router.push(data.user.role === 'owner' ? '/dashboard' : '/attendance');
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
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
      clearAuth();
      router.push('/login');
    },
  });
}
