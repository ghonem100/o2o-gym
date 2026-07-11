'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiResponse } from '@/types';

export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

export interface TenantGym {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  city: string | null;
  subscriptionStatus: TenantStatus;
  subscriptionEndsAt: string | null;
  monthlyFee: string | null;
  tenantNotes: string | null;
  createdAt: string;
  membersCount: number;
  usersCount: number;
}

export interface TenantGymDetail extends Omit<TenantGym, 'membersCount' | 'usersCount'> {
  phone: string | null;
  isActive: boolean;
  membersCount: number;
  subscriptionsCount: number;
  users: { id: string; username: string; fullName: string; role: string; isActive: boolean; lastLoginAt: string | null }[];
  tenantPayments: { id: string; amount: string; month: string; paidAt: string; notes: string | null }[];
}

export interface PlatformStats {
  totalGyms: number;
  activeGyms: number;
  trialGyms: number;
  suspendedGyms: number;
  totalRevenueThisMonth: number;
  gymsExpiringSoon: Pick<TenantGym, 'id' | 'name' | 'slug' | 'subscriptionStatus' | 'subscriptionEndsAt' | 'monthlyFee'>[];
}

export interface CreateGymPayload {
  gymName: string;
  gymNameAr?: string;
  slug: string;
  ownerUsername: string;
  ownerPassword: string;
  ownerFullName: string;
  ownerPhone?: string;
  city?: string;
  monthlyFee?: number;
}

export interface CreateGymResult {
  gym: TenantGym;
  owner: { id: string; username: string; fullName: string; password: string };
  loginUrl: string;
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['sa-stats'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PlatformStats>>('/super-admin/stats');
      return data.data;
    },
    refetchInterval: 60000,
  });
}

export function useTenantGyms() {
  return useQuery({
    queryKey: ['sa-gyms'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TenantGym[]>>('/super-admin/gyms');
      return data.data;
    },
  });
}

export function useTenantGym(id: string) {
  return useQuery({
    queryKey: ['sa-gym', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TenantGymDetail>>(`/super-admin/gyms/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['sa-gyms'] });
    qc.invalidateQueries({ queryKey: ['sa-stats'] });
    if (id) qc.invalidateQueries({ queryKey: ['sa-gym', id] });
  };
}

export function useCreateTenantGym() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: CreateGymPayload) => {
      const { data } = await api.post<ApiResponse<CreateGymResult>>('/super-admin/gyms', payload);
      return data.data;
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTenantGym() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.patch<ApiResponse<TenantGym>>(`/super-admin/gyms/${id}`, payload);
      return data.data;
    },
    onSuccess: (_d, vars) => invalidate(vars.id),
  });
}

export function useSetTenantStatus() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'suspend' | 'activate' }) => {
      const { data } = await api.patch<ApiResponse<TenantGym>>(`/super-admin/gyms/${id}/${action}`, {});
      return data.data;
    },
    onSuccess: (_d, vars) => invalidate(vars.id),
  });
}

export function useRecordTenantPayment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; amount: number; month: string; notes?: string; extendDays?: number }) => {
      const { data } = await api.post<ApiResponse<unknown>>(`/super-admin/gyms/${id}/payment`, payload);
      return data.data;
    },
    onSuccess: (_d, vars) => invalidate(vars.id),
  });
}
