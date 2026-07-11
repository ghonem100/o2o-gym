import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.middleware';
import { requireSuperAdmin } from '../../middleware/super-admin.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../types';
import {
  createGymSchema,
  updateGymSchema,
  gymIdSchema,
  recordPaymentSchema,
} from './super-admin.schema';
import * as SA from './super-admin.service';

const router = Router();

// Stricter limit for platform-management endpoints
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests' },
  })
);

router.use(authenticate, requireSuperAdmin);

function handleKnown(err: unknown, res: Response): boolean {
  if (err instanceof SA.ConflictError) {
    sendError(res, err.message, 409);
    return true;
  }
  if (err instanceof SA.NotFoundError) {
    sendError(res, err.message, 404);
    return true;
  }
  return false;
}

router.post('/gyms', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { body } = createGymSchema.parse({ body: req.body });
    const result = await SA.createGym(req.user!.userId, body, req);
    sendSuccess(res, result, 'Gym created', 201);
  } catch (err) {
    if (!handleKnown(err, res)) next(err);
  }
});

router.get('/gyms', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await SA.listGyms());
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await SA.getPlatformStats());
  } catch (err) {
    next(err);
  }
});

router.get('/gyms/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { params } = gymIdSchema.parse({ params: req.params });
    sendSuccess(res, await SA.getGymDetail(params.id));
  } catch (err) {
    if (!handleKnown(err, res)) next(err);
  }
});

router.patch('/gyms/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { params, body } = updateGymSchema.parse({ params: req.params, body: req.body });
    sendSuccess(res, await SA.updateGym(req.user!.userId, params.id, body, req), 'Gym updated');
  } catch (err) {
    if (!handleKnown(err, res)) next(err);
  }
});

router.patch('/gyms/:id/suspend', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { params } = gymIdSchema.parse({ params: req.params });
    sendSuccess(res, await SA.setGymStatus(req.user!.userId, params.id, 'suspended', req), 'Gym suspended');
  } catch (err) {
    if (!handleKnown(err, res)) next(err);
  }
});

router.patch('/gyms/:id/activate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { params } = gymIdSchema.parse({ params: req.params });
    sendSuccess(res, await SA.setGymStatus(req.user!.userId, params.id, 'active', req), 'Gym activated');
  } catch (err) {
    if (!handleKnown(err, res)) next(err);
  }
});

router.post('/gyms/:id/payment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { params, body } = recordPaymentSchema.parse({ params: req.params, body: req.body });
    sendSuccess(res, await SA.recordPayment(req.user!.userId, params.id, body, req), 'Payment recorded', 201);
  } catch (err) {
    if (!handleKnown(err, res)) next(err);
  }
});

export default router;
