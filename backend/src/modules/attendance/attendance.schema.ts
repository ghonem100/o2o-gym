import { z } from 'zod';

export const faceCheckInSchema = z.object({
  body: z.object({
    memberId: z.string().uuid(),
    confidence: z.number().min(0).max(1),
  }),
});

export const barcodeCheckInSchema = z.object({
  body: z.object({
    barcode: z.string().min(1),
  }),
});

export const manualCheckInSchema = z.object({
  body: z.object({
    memberId: z.string().uuid(),
    notes: z.string().max(500).optional(),
  }),
});

export const listAttendanceSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    memberId: z.string().uuid().optional(),
    date: z.string().date().optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    method: z.enum(['face', 'barcode', 'manual']).optional(),
  }),
});

export type FaceCheckInInput = z.infer<typeof faceCheckInSchema>['body'];
export type BarcodeCheckInInput = z.infer<typeof barcodeCheckInSchema>['body'];
export type ManualCheckInInput = z.infer<typeof manualCheckInSchema>['body'];
export type ListAttendanceQuery = z.infer<typeof listAttendanceSchema>['query'];
