'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  ApiResponse,
  Member,
  SubscriptionPlan,
  CheckInResult,
  DashboardKPIs,
  AttendanceStats,
  RevenueReport,
  MembersStats,
} from '@/types';

// ── Members ──
export function useMembers(params: { page?: number; search?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['members', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Member[]>>('/members', { params });
      return data;
    },
  });
}

export function useMemberProfile(id: string) {
  return useQuery({
    queryKey: ['member', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Member>>(`/members/${id}/profile`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Member>) => {
      const { data } = await api.post<ApiResponse<Member>>('/members', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

// ── Plans ──
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SubscriptionPlan[]>>('/subscriptions/plans');
      return data.data;
    },
  });
}

// ── Subscriptions ──
export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post<ApiResponse<unknown>>('/subscriptions', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

// ── Attendance ──
export function useFaceCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { memberId: string; confidence: number }) => {
      const { data } = await api.post<ApiResponse<CheckInResult>>('/attendance/face', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-today'] }),
  });
}

export function useBarcodeCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { barcode: string }) => {
      const { data } = await api.post<ApiResponse<CheckInResult>>('/attendance/barcode', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-today'] }),
  });
}

export function useManualCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { memberId: string; notes?: string }) => {
      const { data } = await api.post<ApiResponse<CheckInResult>>('/attendance/manual', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-today'] }),
  });
}

export function useTodayAttendance() {
  return useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ logs: unknown[]; totalToday: number }>>('/attendance/today');
      return data.data;
    },
    refetchInterval: 15000,
  });
}

// ── Analytics ──
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardKPIs>>('/analytics/dashboard');
      return data.data;
    },
    refetchInterval: 60000,
  });
}

export function useRevenueReport(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['revenue', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<RevenueReport>>('/analytics/revenue', {
        params: { dateFrom, dateTo },
      });
      return data.data;
    },
  });
}

export function useAttendanceStats(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['attendance-stats', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AttendanceStats>>('/analytics/attendance-stats', {
        params: { dateFrom, dateTo },
      });
      return data.data;
    },
  });
}

export function useMembersStats() {
  return useQuery({
    queryKey: ['members-stats'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MembersStats>>('/analytics/members-stats');
      return data.data;
    },
  });
}

export function useDailySummary() {
  return useQuery({
    queryKey: ['daily-summary'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        byMethod: Record<string, number>;
        transactionCount: number;
      }>>('/payments/daily-summary');
      return data.data;
    },
    refetchInterval: 60000,
  });
}
