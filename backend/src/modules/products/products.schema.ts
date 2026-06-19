import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    nameAr: z.string().min(1).max(100).optional(),
    price: z.number().positive(),
    stockQuantity: z.number().int().min(0).default(0),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    nameAr: z.string().min(1).max(100).optional(),
    price: z.number().positive().optional(),
    stockQuantity: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const listProductsSchema = z.object({
  query: z.object({
    includeInactive: z.coerce.boolean().optional(),
  }),
});

export const sellProductSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().min(1),
        })
      )
      .min(1, 'At least one item is required'),
    memberId: z.string().uuid().optional(),
    paymentMethod: z.enum([
      'cash', 'visa', 'mastercard', 'vodafone_cash',
      'instapay', 'bank_transfer', 'other',
    ]),
  }),
});

export const listSalesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type SellProductInput = z.infer<typeof sellProductSchema>['body'];
export type ListSalesQuery = z.infer<typeof listSalesSchema>['query'];
