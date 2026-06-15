import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/response';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { AuthRequest } from '../../types';

const router = Router();
router.use(authenticate);

export interface NotificationSettings {
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  daysBeforeExpiry: number;
  messageTemplate: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  whatsappEnabled: true,
  smsEnabled: false,
  daysBeforeExpiry: 3,
  messageTemplate:
    'عزيزي {memberName}، اشتراكك في O2O Gym سينتهي بتاريخ {endDate}. يرجى التجديد في أقرب وقت. 📞 اتصل بنا على {gymPhone}',
};

// ── Staff list (owner + receptionist) — for "collected by" filters ──
router.get('/staff', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.user.findMany({
      where: { gymId: req.user!.gymId, isActive: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: 'asc' },
    });
    sendSuccess(res, staff);
  } catch (err) {
    next(err);
  }
});

// ── Gym info (owner only) ──
router.get('/gym', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const gym = await prisma.gym.findUniqueOrThrow({
      where: { id: req.user!.gymId },
      select: {
        id: true, name: true, nameAr: true, phone: true,
        whatsappNumber: true, city: true, currency: true, settings: true,
      },
    });
    const settings = (gym.settings as Record<string, unknown>) ?? {};
    sendSuccess(res, {
      ...gym,
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(settings.notifications as Partial<NotificationSettings> ?? {}),
      },
    });
  } catch (err) {
    next(err);
  }
});

const updateGymSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    nameAr: z.string().min(2).max(100).optional(),
    phone: z.string().max(20).optional(),
    whatsappNumber: z.string().max(20).optional(),
  }),
});

router.put('/gym', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { body } = updateGymSchema.parse({ body: req.body });
    const gym = await prisma.gym.update({ where: { id: req.user!.gymId }, data: body });
    await createAuditLog({
      gymId: req.user!.gymId, userId: req.user!.userId,
      action: 'update', entityType: 'gym', entityId: gym.id,
      newValues: body as Record<string, unknown>, req,
    });
    sendSuccess(res, gym, 'Gym info updated');
  } catch (err) {
    next(err);
  }
});

// ── Notification settings (owner only) ──
const notificationSchema = z.object({
  body: z.object({
    whatsappEnabled: z.boolean(),
    smsEnabled: z.boolean(),
    daysBeforeExpiry: z.number().int().min(1).max(30),
    messageTemplate: z.string().min(10).max(1000),
  }),
});

router.put('/notifications', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { body } = notificationSchema.parse({ body: req.body });
    const gym = await prisma.gym.findUniqueOrThrow({ where: { id: req.user!.gymId }, select: { settings: true } });
    const current = (gym.settings as Record<string, unknown>) ?? {};
    const updated = await prisma.gym.update({
      where: { id: req.user!.gymId },
      data: { settings: { ...current, notifications: body } },
    });
    await createAuditLog({
      gymId: req.user!.gymId, userId: req.user!.userId,
      action: 'update', entityType: 'notification_settings', newValues: body, req,
    });
    sendSuccess(res, updated.settings, 'Notification settings updated');
  } catch (err) {
    next(err);
  }
});

export default router;
