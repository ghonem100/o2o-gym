import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/rbac.middleware';
import {
  createSubscriptionHandler,
  listSubscriptionsHandler,
  getExpiringHandler,
  updateStatusHandler,
  listPlansHandler,
  createPlanHandler,
  updatePlanHandler,
} from './subscriptions.controller';

const router = Router();

router.use(authenticate);

router.get('/', listSubscriptionsHandler);
router.post('/', createSubscriptionHandler);
router.get('/expiring', getExpiringHandler);
router.put('/:id/status', updateStatusHandler);

// Plans management (owner only for create/update)
router.get('/plans', listPlansHandler);
router.post('/plans', requireOwner, createPlanHandler);
router.put('/plans/:id', requireOwner, updatePlanHandler);

export default router;
