import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/response';
import {
  createSubscriptionSchema,
  listSubscriptionsSchema,
  subscriptionIdSchema,
  updateSubscriptionStatusSchema,
  createPlanSchema,
  updatePlanSchema,
} from './subscriptions.schema';
import * as SubService from './subscriptions.service';
import { NotFoundError } from '../members/members.service';

export async function createSubscriptionHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = createSubscriptionSchema.parse({ body: req.body });
    const result = await SubService.createSubscription(req.user!.gymId, req.user!.userId, body, req);
    sendSuccess(res, result, 'Subscription created successfully', 201);
  } catch (err) {
    if (err instanceof NotFoundError) { sendError(res, err.message, 404); return; }
    next(err);
  }
}

export async function listSubscriptionsHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query } = listSubscriptionsSchema.parse({ query: req.query });
    const { subscriptions, pagination } = await SubService.listSubscriptions(req.user!.gymId, query);
    sendSuccess(res, subscriptions, undefined, 200, pagination);
  } catch (err) { next(err); }
}

export async function getExpiringHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 3;
    const expiring = await SubService.getExpiringSubscriptions(req.user!.gymId, days);
    sendSuccess(res, expiring);
  } catch (err) { next(err); }
}

export async function updateStatusHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params, body } = updateSubscriptionStatusSchema.parse({ params: req.params, body: req.body });
    const updated = await SubService.updateSubscriptionStatus(req.user!.gymId, params.id, req.user!.userId, body.status, body.notes, req);
    sendSuccess(res, updated, 'Status updated successfully');
  } catch (err) {
    if (err instanceof NotFoundError) { sendError(res, err.message, 404); return; }
    if (err instanceof Error && err.message.startsWith('Cannot')) { sendError(res, err.message, 400); return; }
    next(err);
  }
}

export async function listPlansHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true' && req.user!.role === 'owner';
    const plans = await SubService.listPlans(req.user!.gymId, includeInactive);
    sendSuccess(res, plans);
  } catch (err) { next(err); }
}

export async function createPlanHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = createPlanSchema.parse({ body: req.body });
    const plan = await SubService.createPlan(req.user!.gymId, req.user!.userId, body, req);
    sendSuccess(res, plan, 'Plan created successfully', 201);
  } catch (err) { next(err); }
}

export async function updatePlanHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params, body } = updatePlanSchema.parse({ params: req.params, body: req.body });
    const plan = await SubService.updatePlan(req.user!.gymId, params.id, req.user!.userId, body, req);
    sendSuccess(res, plan, 'Plan updated successfully');
  } catch (err) {
    if (err instanceof NotFoundError) { sendError(res, err.message, 404); return; }
    next(err);
  }
}
