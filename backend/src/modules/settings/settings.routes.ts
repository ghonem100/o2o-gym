import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate } from '../../middleware/auth.middleware';
import { checkGymActive } from '../../middleware/gym-status.middleware';
import { requireOwner } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/response';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { AuthRequest } from '../../types';

const router = Router();
router.use(authenticate);
router.use(checkGymActive);

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

// ══════════════════════════════════════════════════════
//  USERS MANAGEMENT (owner only)
// ══════════════════════════════════════════════════════

// GET /settings/users — list all gym staff
router.get('/users', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { gymId: req.user!.gymId },
      select: {
        id: true, username: true, fullName: true, fullNameAr: true,
        role: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true,
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
    sendSuccess(res, users);
  } catch (err) { next(err); }
});

const createUserSchema = z.object({
  body: z.object({
    username:   z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscore only'),
    password:   z.string().min(6).max(100),
    fullName:   z.string().min(2).max(100),
    fullNameAr: z.string().min(2).max(100).optional(),
    role:       z.enum(['owner', 'receptionist']),
    phone:      z.string().max(20).optional(),
  }),
});

// POST /settings/users — create staff user
router.post('/users', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { body } = createUserSchema.parse({ body: req.body });

    const existing = await prisma.user.findFirst({
      where: { gymId: req.user!.gymId, username: body.username },
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'Username already exists in this gym' });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        gymId: req.user!.gymId,
        username: body.username,
        passwordHash,
        fullName: body.fullName,
        fullNameAr: body.fullNameAr,
        role: body.role,
        phone: body.phone,
      },
      select: {
        id: true, username: true, fullName: true, fullNameAr: true,
        role: true, phone: true, isActive: true, createdAt: true,
      },
    });

    await createAuditLog({
      gymId: req.user!.gymId, userId: req.user!.userId,
      action: 'create', entityType: 'user', entityId: user.id,
      newValues: { username: user.username, role: user.role }, req,
    });

    sendSuccess(res, user, 'User created', 201);
  } catch (err) { next(err); }
});

const updateUserSchema = z.object({
  body: z.object({
    fullName:   z.string().min(2).max(100).optional(),
    fullNameAr: z.string().min(2).max(100).optional(),
    role:       z.enum(['owner', 'receptionist']).optional(),
    phone:      z.string().max(20).optional().nullable(),
  }),
});

// PUT /settings/users/:id — update user info
router.put('/users/:id', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { body } = updateUserSchema.parse({ body: req.body });
    const id = String(req.params['id']);

    const existing = await prisma.user.findFirst({
      where: { id, gymId: req.user!.gymId },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: {
        id: true, username: true, fullName: true, fullNameAr: true,
        role: true, phone: true, isActive: true, lastLoginAt: true,
      },
    });

    await createAuditLog({
      gymId: req.user!.gymId, userId: req.user!.userId,
      action: 'update', entityType: 'user', entityId: id,
      newValues: body as Record<string, unknown>, req,
    });

    sendSuccess(res, user, 'User updated');
  } catch (err) { next(err); }
});

// PUT /settings/users/:id/toggle-active — activate / deactivate
router.put('/users/:id/toggle-active', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params['id']);

    // Prevent owner from deactivating themselves
    if (id === req.user!.userId) {
      res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { id, gymId: req.user!.gymId },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: !existing.isActive },
      select: { id: true, username: true, isActive: true },
    });

    await createAuditLog({
      gymId: req.user!.gymId, userId: req.user!.userId,
      action: 'update', entityType: 'user', entityId: id,
      newValues: { isActive: user.isActive }, req,
    });

    sendSuccess(res, user, user.isActive ? 'User activated' : 'User deactivated');
  } catch (err) { next(err); }
});

// POST /settings/users/:id/reset-password — reset to a new password
router.post('/users/:id/reset-password', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params['id']);
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { id, gymId: req.user!.gymId },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash, failedAttempts: 0, lockedUntil: null },
    });

    await createAuditLog({
      gymId: req.user!.gymId, userId: req.user!.userId,
      action: 'update', entityType: 'user', entityId: id,
      newValues: { passwordReset: true }, req,
    });

    sendSuccess(res, { id }, 'Password reset successfully');
  } catch (err) { next(err); }
});

export default router;
