import { z } from 'zod';

export const SLUG_REGEX = /^[a-z0-9-]+$/;

export const createGymSchema = z.object({
  body: z.object({
    gymName: z.string().min(2).max(100),
    gymNameAr: z.string().min(2).max(100).optional(),
    slug: z.string().min(2).max(50).regex(SLUG_REGEX, 'Slug must be lowercase letters, numbers and hyphens only'),
    ownerUsername: z.string().min(3).max(50),
    ownerPassword: z.string().min(8, 'Owner password must be at least 8 characters'),
    ownerFullName: z.string().min(2).max(100),
    ownerPhone: z.string().max(20).optional(),
    city: z.string().max(50).optional(),
    monthlyFee: z.number().min(0).optional(),
  }),
});

export const updateGymSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    gymName: z.string().min(2).max(100).optional(),
    gymNameAr: z.string().min(2).max(100).optional(),
    slug: z.string().min(2).max(50).regex(SLUG_REGEX).optional(),
    subscriptionStatus: z.enum(['trial', 'active', 'suspended', 'cancelled']).optional(),
    subscriptionEndsAt: z.string().datetime().optional().nullable(),
    monthlyFee: z.number().min(0).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }),
});

export const gymIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const recordPaymentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    amount: z.number().positive(),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    notes: z.string().max(500).optional(),
    // How many days of service this payment buys (default one month)
    extendDays: z.number().int().min(1).max(366).default(30),
  }),
});

export type CreateGymInput = z.infer<typeof createGymSchema>['body'];
export type UpdateGymInput = z.infer<typeof updateGymSchema>['body'];
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>['body'];
