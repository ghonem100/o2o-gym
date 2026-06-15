'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiResponse } from '@/types';

function get<T>(url: string, params?: Record<string, string>) {
  return async () => {
    const { data } = await api.get<ApiResponse<T>>(url, { params });
    return data.data;
  };
}

export function useNewMembers(months = 12) {
  return useQuery({
    queryKey: ['new-members', months],
    queryFn: get<{ month: string; count: number }[]>('/analytics/new-members', { months: String(months) }),
  });
}

export function useRetentionTrend(months = 6) {
  return useQuery({
    queryKey: ['retention-trend', months],
    queryFn: get<{ month: string; retention: number }[]>('/analytics/retention-trend', { months: String(months) }),
  });
}

export function useInactiveMembers(days = 30) {
  return useQuery({
    queryKey: ['inactive-members', days],
    queryFn: get<{ id: string; fullName: string; memberNumber: string; phone: string; photoUrl: string | null; lastVisit: string | null }[]>(
      '/analytics/inactive-members',
      { days: String(days) }
    ),
  });
}

export function useRevenueBreakdown(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['revenue-breakdown', dateFrom, dateTo],
    queryFn: get<{ byPlanType: { type: string; amount: number }[]; byMethod: { method: string; amount: number }[] }>(
      '/analytics/revenue-breakdown',
      { dateFrom, dateTo }
    ),
  });
}

export function useAttendancePatterns(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['attendance-patterns', dateFrom, dateTo],
    queryFn: get<{
      byWeekday: { day: number; count: number }[];
      dailySeries: { date: string; count: number }[];
      avgDaily: number;
    }>('/analytics/attendance-patterns', { dateFrom, dateTo }),
  });
}

export function useProfitability(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['profitability', dateFrom, dateTo],
    queryFn: get<{
      totalRevenue: number;
      totalExpenses: number;
      netProfit: number;
      profitMargin: number;
      arpm: number;
      activeMembers: number;
      expensesByCategory: { category: string; amount: number }[];
    }>('/analytics/profitability', { dateFrom, dateTo }),
  });
}
