'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiResponse } from '@/types';

export interface NotificationLog {
  id: string;
  type: string;
  channel: string;
  message: string;
  status: string;
  sentAt: string;
  member: { fullName: string; memberNumber: string; phone: string };
}

export interface ReminderSummary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<NotificationLog[]>>('/notifications', {
        params: { page },
      });
      return data;
    },
  });
}

export function useSendReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<ReminderSummary>>('/notifications/send-reminders');
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
