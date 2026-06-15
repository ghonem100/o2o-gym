'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiResponse } from '@/types';

export function useEnrollFace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { memberId: string; descriptor: string; photoUrl?: string }) => {
      const { data } = await api.post<ApiResponse<null>>(
        `/members/${payload.memberId}/face`,
        { descriptor: payload.descriptor, photoUrl: payload.photoUrl }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['face-descriptors'] });
    },
  });
}
