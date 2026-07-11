import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { checkGymActive } from '../../middleware/gym-status.middleware';
import { requireOwner } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../types';
import { sendExpiryReminders, listNotifications } from './notifications.service';
import { createAuditLog } from '../../utils/audit';

const router = Router();
router.use(authenticate);
router.use(checkGymActive);

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    type: z.enum(['expiry_reminder', 'expired', 'welcome', 'other']).optional(),
    status: z.enum(['sent', 'failed', 'pending']).optional(),
  }),
});

// Manual trigger — Owner only
router.post('/send-reminders', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await sendExpiryReminders(req.user!.gymId);
    await createAuditLog({
      gymId: req.user!.gymId,
      userId: req.user!.userId,
      action: 'send_reminders',
      entityType: 'notification',
      newValues: { sent: summary.sent, failed: summary.failed, skipped: summary.skipped },
      req,
    });
    sendSuccess(res, summary, `${summary.sent} reminders sent`);
  } catch (err) {
    next(err);
  }
});

// History — Owner only
router.get('/', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query } = listSchema.parse({ query: req.query });
    const { logs, pagination } = await listNotifications(req.user!.gymId, query);
    sendSuccess(res, logs, undefined, 200, pagination);
  } catch (err) {
    next(err);
  }
});

export default router;
