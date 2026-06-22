'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiResponse, SubscriptionPlan } from '@/types';

export interface NotificationSettings {
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  daysBeforeExpiry: number;
  messageTemplate: string;
}

export interface GymInfo {
  id: string;
  name: string;
  nameAr: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  city: string | null;
  currency: string;
  notificationSettings: NotificationSettings;
}

export function useGymInfo() {
  return useQuery({
    queryKey: ['gym-info'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<GymInfo>>('/settings/gym');
      return data.data;
    },
  });
}

export function useUpdateGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Pick<GymInfo, 'name' | 'phone' | 'whatsappNumber'>>) => {
      const { data } = await api.put<ApiResponse<unknown>>('/settings/gym', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gym-info'] }),
  });
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NotificationSettings) => {
      const { data } = await api.put<ApiResponse<unknown>>('/settings/notifications', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gym-info'] }),
  });
}

// ── Plans management ──
export function useAllPlans() {
  return useQuery({
    queryKey: ['plans', 'all'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SubscriptionPlan[]>>('/subscriptions/plans', {
        params: { includeInactive: true },
      });
      return data.data;
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; price?: number; isActive?: boolean }) => {
      const { data } = await api.put<ApiResponse<unknown>>(`/subscriptions/plans/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

// ══════════════════════════════════════════════════════
//  USERS MANAGEMENT
// ══════════════════════════════════════════════════════

export interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  fullNameAr?: string;
  role: 'owner' | 'receptionist';
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export function useStaffUsers() {
  return useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<StaffUser[]>>('/settings/users');
      return data.data;
    },
  });
}

export function useCreateStaffUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      username: string; password: string;
      fullName: string; fullNameAr?: string;
      role: 'owner' | 'receptionist'; phone?: string;
    }) => {
      const { data } = await api.post<ApiResponse<StaffUser>>('/settings/users', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-users'] }),
  });
}

export function useUpdateStaffUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string; fullName?: string; fullNameAr?: string;
      role?: 'owner' | 'receptionist'; phone?: string;
    }) => {
      const { data } = await api.put<ApiResponse<StaffUser>>(`/settings/users/${id}`, payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-users'] }),
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put<ApiResponse<StaffUser>>(`/settings/users/${id}/toggle-active`, {});
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-users'] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const { data } = await api.post<ApiResponse<unknown>>(`/settings/users/${id}/reset-password`, { newPassword });
      return data.data;
    },
  });
}
