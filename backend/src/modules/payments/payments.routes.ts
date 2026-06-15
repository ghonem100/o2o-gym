import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/rbac.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { listPaymentsSchema, refundPaymentSchema } from './payments.schema';
import * as PaymentsService from './payments.service';
import { AuthRequest } from '../../types';
import { NotFoundError } from '../members/members.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query } = listPaymentsSchema.parse({ query: req.query });
    const result = await PaymentsService.listPayments(req.user!.gymId, query);
    sendSuccess(res, result, undefined, 200, result.pagination);
  } catch (err) { next(err); }
});

router.get('/daily-summary', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rawDate = req.query.date;
    const date = Array.isArray(rawDate) ? String(rawDate[0]) : typeof rawDate === 'string' ? rawDate : undefined;
    const summary = await PaymentsService.getDailySummary(req.user!.gymId, date);
    sendSuccess(res, summary);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paymentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const payment = await PaymentsService.getPaymentById(req.user!.gymId, paymentId);
    sendSuccess(res, payment);
  } catch (err) {
    if (err instanceof NotFoundError) { sendError(res, err.message, 404); return; }
    next(err);
  }
});

router.post('/:id/refund', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { params, body } = refundPaymentSchema.parse({ params: req.params, body: req.body });
    const payment = await PaymentsService.refundPayment(req.user!.gymId, params.id, req.user!.userId, body.refundReason, req);
    sendSuccess(res, payment, 'Payment refunded successfully');
  } catch (err) {
    if (err instanceof NotFoundError) { sendError(res, err.message, 404); return; }
    if (err instanceof Error && err.message.includes('already refunded')) { sendError(res, err.message, 400); return; }
    next(err);
  }
});

export default router;
