import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  body: z.object({
    memberId: z.string().uuid(),
    planId: z.string().uuid(),
    startDate: z.string().date(),
    discountId: z.string().uuid().optional(),
    notes: z.string().max(500).optional(),
    paymentMethod: z.enum([
      'cash', 'visa', 'mastercard', 'vodafone_cash',
      'instapay', 'bank_transfer', 'other',
    ]),
    paymentMethodNote: z.string().optional(),
  }),
});

export const listSubscriptionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    memberId: z.string().uuid().optional(),
    status: z.enum(['active', 'expired', 'frozen', 'cancelled']).optional(),
    expiringInDays: z.coerce.number().int().min(0).max(30).optional(),
  }),
});

export const subscriptionIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const updateSubscriptionStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['frozen', 'cancelled']),
    notes: z.string().max(500).optional(),
  }),
});

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    nameAr: z.string().min(2).max(50).optional(),
    planType: z.enum(['daily', 'half_month', 'monthly', 'quarterly', 'session']),
    durationDays: z.number().int().min(1).optional(),
    sessionsCount: z.number().int().min(1).optional(),
    price: z.number().positive(),
  }),
});

export const updatePlanSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    nameAr: z.string().min(2).max(50).optional(),
    price: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>['body'];
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsSchema>['query'];
export type CreatePlanInput = z.infer<typeof createPlanSchema>['body'];
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>['body'];
