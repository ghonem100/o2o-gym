'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiResponse } from '@/types';

export interface PaymentRow {
  id: string;
  referenceNumber: string;
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  isRefunded: boolean;
  member: { fullName: string; memberNumber: string };
  collector: { fullName: string };
  subscription: { plan: { name: string; planType: string } } | null;
}

export interface PaymentsResult {
  payments: PaymentRow[];
  summary: { totalAmount: number; transactionCount: number };
}

export interface StaffMember {
  id: string;
  fullName: string;
  role: string;
}

export interface PaymentFilters {
  page?: number;
  method?: string;
  collectedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function usePayments(filters: PaymentFilters) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const { data } = await api.get<ApiResponse<PaymentsResult>>('/payments', { params });
      return data;
    },
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<StaffMember[]>>('/settings/staff');
      return data.data;
    },
  });
}

export function useRefundPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, refundReason }: { id: string; refundReason: string }) => {
      const { data } = await api.post<ApiResponse<unknown>>(`/payments/${id}/refund`, { refundReason });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}

// ── Expenses ──
export interface ExpenseRow {
  id: string;
  description: string;
  category: string;
  amount: string;
  paymentMethod: string | null;
  expenseDate: string;
  adder: { fullName: string };
}

export function useExpenses(filters: { page?: number; category?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const { data } = await api.get<ApiResponse<{ expenses: ExpenseRow[]; totalAmount: number }>>(
        '/expenses',
        { params }
      );
      return data;
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post<ApiResponse<unknown>>('/expenses', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
