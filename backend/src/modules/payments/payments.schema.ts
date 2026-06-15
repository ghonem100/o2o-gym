import { z } from 'zod';

export const listPaymentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    memberId: z.string().uuid().optional(),
    collectedBy: z.string().uuid().optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    method: z.enum(['cash', 'visa', 'mastercard', 'vodafone_cash', 'instapay', 'bank_transfer', 'other']).optional(),
  }),
});

export const refundPaymentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    refundReason: z.string().min(5, 'Refund reason is required (min 5 chars)').max(500),
  }),
});

export type ListPaymentsQuery = z.infer<typeof listPaymentsSchema>['query'];
