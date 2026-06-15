import { z } from 'zod';

const phoneEgypt = z
  .string()
  .regex(/^(\+20|0)?1[0125]\d{8}$/, 'Invalid Egyptian phone number');

export const createMemberSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100),
    fullNameAr: z.string().min(2).max(100).optional(),
    phone: phoneEgypt,
    gender: z.enum(['male', 'female', 'other']).optional(),
    birthDate: z.string().datetime().optional().or(z.string().date().optional()),
    photoUrl: z.string().url().optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const updateMemberSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    fullNameAr: z.string().min(2).max(100).optional(),
    phone: phoneEgypt.optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    birthDate: z.string().optional(),
    photoUrl: z.string().url().optional(),
    notes: z.string().max(500).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }),
});

export const memberIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listMembersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>['body'];
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>['body'];
export type ListMembersQuery = z.infer<typeof listMembersSchema>['query'];
