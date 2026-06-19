import { Prisma, PaymentMethod } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPagination } from '../../utils/response';
import { ListPaymentsQuery } from './payments.schema';
import { NotFoundError } from '../members/members.service';
import { Request } from 'express';

export async function listPayments(gymId: string, query: ListPaymentsQuery) {
  const { page, limit, memberId, collectedBy, dateFrom, dateTo, method } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.PaymentWhereInput = { gymId };
  if (memberId) where.memberId = memberId;
  if (collectedBy) where.collectedBy = collectedBy;
  if (method) where.paymentMethod = method as PaymentMethod;
  if (dateFrom || dateTo) {
    where.paymentDate = {};
    if (dateFrom) (where.paymentDate as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) (where.paymentDate as Prisma.DateTimeFilter).lte = new Date(dateTo);
  }

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { paymentTime: 'desc' },
      include: {
        member: { select: { fullName: true, memberNumber: true } },
        collector: { select: { fullName: true } },
        subscription: { include: { plan: { select: { name: true, planType: true } } } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  const totals = await prisma.payment.aggregate({
    where: { ...where, isRefunded: false },
    _sum: { amount: true },
    _count: true,
  });

  return {
    payments,
    pagination: buildPagination(page, limit, total),
    summary: {
      totalAmount: Number(totals._sum.amount ?? 0),
      transactionCount: totals._count,
    },
  };
}

export async function getPaymentById(gymId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, gymId },
    include: {
      member: { select: { fullName: true, memberNumber: true, phone: true } },
      collector: { select: { fullName: true } },
      refunder: { select: { fullName: true } },
      subscription: { include: { plan: true } },
    },
  });
  if (!payment) throw new NotFoundError('Payment not found');
  return payment;
}

export async function refundPayment(
  gymId: string,
  paymentId: string,
  userId: string,
  refundReason: string,
  req: Request
) {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, gymId } });
  if (!payment) throw new NotFoundError('Payment not found');
  if (payment.isRefunded) throw new Error('Payment is already refunded');

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      isRefunded: true,
      refundReason,
      refundedBy: userId,
      refundedAt: new Date(),
    },
  });

  await createAuditLog({
    gymId,
    userId,
    action: 'refund',
    entityType: 'payment',
    entityId: paymentId,
    oldValues: { isRefunded: false },
    newValues: { isRefunded: true, refundReason },
    req,
  });

  return updated;
}

export async function getDailySummary(gymId: string, date?: string) {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const [payments, expensesSummary, productSales] = await prisma.$transaction([
    prisma.payment.findMany({
      where: { gymId, paymentDate: targetDate, isRefunded: false },
      include: {
        member: { select: { fullName: true, memberNumber: true } },
        subscription: { include: { plan: { select: { name: true } } } },
      },
    }),
    prisma.expense.aggregate({
      where: { gymId, expenseDate: targetDate },
      _sum: { amount: true },
    }),
    prisma.productSale.findMany({
      where: { gymId, createdAt: { gte: targetDate, lte: dayEnd } },
      select: { paymentMethod: true, totalPrice: true },
    }),
  ]);

  const subscriptionRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const productRevenue = productSales.reduce((sum, s) => sum + Number(s.totalPrice), 0);
  const totalRevenue = subscriptionRevenue + productRevenue;
  const totalExpenses = Number(expensesSummary._sum.amount ?? 0);

  // Combine subscription + product revenue per payment method
  const byMethod: Record<string, number> = {};
  for (const p of payments) {
    byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] ?? 0) + Number(p.amount);
  }
  for (const s of productSales) {
    byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] ?? 0) + Number(s.totalPrice);
  }

  return {
    date: targetDate,
    payments,
    totalRevenue,
    subscriptionRevenue,
    productRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    byMethod,
    transactionCount: payments.length + productSales.length,
  };
}
