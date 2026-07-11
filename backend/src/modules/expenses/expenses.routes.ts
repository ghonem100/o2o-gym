import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { checkGymActive } from '../../middleware/gym-status.middleware';
import { requireOwner } from '../../middleware/rbac.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPagination } from '../../utils/response';
import { AuthRequest } from '../../types';
import { Prisma } from '@prisma/client';

const createExpenseSchema = z.object({
  body: z.object({
    category: z.enum(['rent', 'electricity', 'water', 'salaries', 'maintenance', 'marketing', 'equipment', 'other']),
    description: z.string().min(3).max(500),
    amount: z.number().positive(),
    paymentMethod: z.string().optional(),
    expenseDate: z.string().date(),
    receiptUrl: z.string().url().optional(),
  }),
});

const listExpensesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: z.string().optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
  }),
});

const router = Router();
router.use(authenticate);
router.use(checkGymActive);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query } = listExpensesSchema.parse({ query: req.query });
    const { page, limit, category, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.ExpenseWhereInput = { gymId: req.user!.gymId };
    if (category) where.category = category as never;
    if (dateFrom || dateTo) {
      where.expenseDate = {};
      if (dateFrom) (where.expenseDate as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.expenseDate as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }
    const [expenses, total, summary] = await prisma.$transaction([
      prisma.expense.findMany({ where, skip, take: limit, orderBy: { expenseDate: 'desc' }, include: { adder: { select: { fullName: true } } } }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);
    sendSuccess(res, { expenses, totalAmount: Number(summary._sum.amount ?? 0) }, undefined, 200, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

router.post('/', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { body } = createExpenseSchema.parse({ body: req.body });
    const expense = await prisma.expense.create({
      data: { gymId: req.user!.gymId, addedBy: req.user!.userId, ...body, expenseDate: new Date(body.expenseDate) },
    });
    await createAuditLog({ gymId: req.user!.gymId, userId: req.user!.userId, action: 'create', entityType: 'expense', entityId: expense.id, newValues: body as Record<string, unknown>, req });
    sendSuccess(res, expense, 'Expense added successfully', 201);
  } catch (err) { next(err); }
});

router.delete('/:id', requireOwner, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const expenseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const expense = await prisma.expense.findFirst({ where: { id: expenseId, gymId: req.user!.gymId } });
    if (!expense) { sendError(res, 'Expense not found', 404); return; }
    await prisma.expense.delete({ where: { id: expenseId } });
    await createAuditLog({ gymId: req.user!.gymId, userId: req.user!.userId, action: 'delete', entityType: 'expense', entityId: expenseId, oldValues: { amount: Number(expense.amount), description: expense.description }, req });
    sendSuccess(res, null, 'Expense deleted');
  } catch (err) { next(err); }
});

export default router;
