'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiResponse } from '@/types';

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await fileToDataUrl(file);
      const { data } = await api.post<ApiResponse<{ url: string }>>('/uploads/image', { image: dataUrl });
      return data.data.url;
    },
  });
}
