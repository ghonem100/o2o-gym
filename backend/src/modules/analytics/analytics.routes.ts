import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/rbac.middleware';
import { sendSuccess } from '../../utils/response';
import * as AnalyticsService from './analytics.service';
import { AuthRequest } from '../../types';

const dateRangeSchema = z.object({
  query: z.object({
    dateFrom: z.string().date(),
    dateTo: z.string().date(),
  }),
});

const router = Router();
router.use(authenticate, requireOwner);

router.get('/dashboard', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const kpis = await AnalyticsService.getDashboardKPIs(req.user!.gymId);
    sendSuccess(res, kpis);
  } catch (err) { next(err); }
});

router.get('/revenue', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query } = dateRangeSchema.parse({ query: req.query });
    const report = await AnalyticsService.getRevenueReport(req.user!.gymId, query.dateFrom, query.dateTo);
    sendSuccess(res, report);
  } catch (err) { next(err); }
});

router.get('/members-stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await AnalyticsService.getMembersStats(req.user!.gymId);
    sendSuccess(res, stats);
  } catch (err) { next(err); }
});

router.get('/attendance-stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query } = dateRangeSchema.parse({ query: req.query });
    const stats = await AnalyticsService.getAttendanceStats(req.user!.gymId, query.dateFrom, query.dateTo);
    sendSuccess(res, stats);
  } catch (err) { next(err); }
});

router.get('/profitability', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query } = dateRangeSchema.parse({ query: req.query });
    const report = await AnalyticsService.getProfitabilityReport(req.user!.gymId, query.dateFrom, query.dateTo);
    sendSuccess(res, report);
  } catch (err) { next(err); }
});

router.get('/new-members', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const months = req.query.months ? parseInt(req.query.months as string) : 12;
    const data = await AnalyticsService.getNewMembersByMonth(req.user!.gymId, months);
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.get('/retention-trend', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const months = req.query.months ? parseInt(req.query.months as string) : 6;
    const data = await AnalyticsService.getRetentionTrend(req.user!.gymId, months);
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.get('/inactive-members', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const data = await AnalyticsService.getInactiveMembers(req.user!.gymId, days);
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.get('/revenue-breakdown', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query } = dateRangeSchema.parse({ query: req.query });
    const data = await AnalyticsService.getRevenueBreakdown(req.user!.gymId, query.dateFrom, query.dateTo);
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.get('/attendance-patterns', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query } = dateRangeSchema.parse({ query: req.query });
    const data = await AnalyticsService.getAttendancePatterns(req.user!.gymId, query.dateFrom, query.dateTo);
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

export default router;
