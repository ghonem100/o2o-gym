'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiResponse } from '@/types';

export interface Product {
  id: string;
  name: string;
  nameAr: string | null;
  price: string;
  stockQuantity: number;
  isActive: boolean;
}

export interface ProductSale {
  id: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  paymentMethod: string;
  createdAt: string;
  product: { name: string; nameAr: string | null };
  member: { fullName: string; memberNumber: string } | null;
  seller: { fullName: string };
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export function useProducts(includeInactive = false) {
  return useQuery({
    queryKey: ['products', { includeInactive }],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Product[]>>('/products', {
        params: includeInactive ? { includeInactive: true } : {},
      });
      return data.data;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; nameAr?: string; price: number; stockQuantity: number }) => {
      const { data } = await api.post<ApiResponse<Product>>('/products', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; price?: number; stockQuantity?: number; isActive?: boolean }) => {
      const { data } = await api.put<ApiResponse<Product>>(`/products/${id}`, payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useSellProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { items: CartItem[]; memberId?: string; paymentMethod: string }) => {
      const { data } = await api.post<ApiResponse<{ grandTotal: number }>>('/products/sell', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-sales'] });
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useProductSales(filters: { page?: number; dateFrom?: string; dateTo?: string } = {}) {
  return useQuery({
    queryKey: ['product-sales', filters],
    queryFn: async () => {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''));
      const { data } = await api.get<ApiResponse<{ sales: ProductSale[]; summary: { totalRevenue: number } }>>(
        '/products/sales',
        { params }
      );
      return data;
    },
  });
}
