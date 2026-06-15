import { Prisma, PlanType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPagination } from '../../utils/response';
import {
  CreateSubscriptionInput,
  ListSubscriptionsQuery,
  CreatePlanInput,
  UpdatePlanInput,
} from './subscriptions.schema';
import { Request } from 'express';
import { NotFoundError } from '../members/members.service';
import { nanoid } from 'nanoid';

const PLAN_DURATIONS: Record<string, number> = {
  daily: 1,
  half_month: 15,
  monthly: 30,
  quarterly: 90,
};

function generatePaymentRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = nanoid(6).toUpperCase();
  return `PAY-${ts}-${rand}`;
}

export async function createSubscription(
  gymId: string,
  userId: string,
  data: CreateSubscriptionInput,
  req: Request
) {
  const [member, plan] = await Promise.all([
    prisma.member.findFirst({ where: { id: data.memberId, gymId } }),
    prisma.subscriptionPlan.findFirst({ where: { id: data.planId, gymId, isActive: true } }),
  ]);

  if (!member) throw new NotFoundError('Member not found');
  if (!plan) throw new NotFoundError('Subscription plan not found');

  let discountAmount = 0;
  let discountId: string | undefined;

  if (data.discountId) {
    const discount = await prisma.discount.findFirst({
      where: { id: data.discountId, gymId, isActive: true },
    });
    if (!discount) throw new NotFoundError('Discount not found or inactive');
    const now = new Date();
    if (
      (discount.validFrom && discount.validFrom > now) ||
      (discount.validUntil && discount.validUntil < now)
    ) {
      throw new Error('Discount is not valid at this time');
    }
    discountId = discount.id;
    if (discount.discountType === 'percentage') {
      discountAmount = Number(plan.price) * (Number(discount.value) / 100);
    } else {
      discountAmount = Math.min(Number(discount.value), Number(plan.price));
    }
  }

  const originalPrice = Number(plan.price);
  const pricePaid = Math.max(0, originalPrice - discountAmount);

  const startDate = new Date(data.startDate);
  let endDate: Date | null = null;
  let sessionsTotal: number | null = null;
  let sessionsRemaining: number | null = null;

  if (plan.planType === 'session') {
    sessionsTotal = plan.sessionsCount ?? 10;
    sessionsRemaining = sessionsTotal;
  } else {
    const duration = PLAN_DURATIONS[plan.planType] ?? plan.durationDays ?? 30;
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration - 1);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { memberId: data.memberId, gymId, status: 'active' },
      data: { status: 'expired' },
    });

    const subscription = await tx.subscription.create({
      data: {
        gymId,
        memberId: data.memberId,
        planId: data.planId,
        startDate,
        endDate,
        sessionsTotal,
        sessionsRemaining,
        originalPrice,
        pricePaid,
        discountAmount,
        discountId,
        notes: data.notes,
        createdBy: userId,
      },
      include: { plan: true, member: { select: { fullName: true, memberNumber: true } } },
    });

    const payment = await tx.payment.create({
      data: {
        gymId,
        memberId: data.memberId,
        subscriptionId: subscription.id,
        referenceNumber: generatePaymentRef(),
        amount: pricePaid,
        paymentMethod: data.paymentMethod,
        paymentMethodNote: data.paymentMethodNote,
        paymentDate: startDate,
        collectedBy: userId,
      },
    });

    return { subscription, payment };
  });

  await createAuditLog({
    gymId,
    userId,
    action: 'create',
    entityType: 'subscription',
    entityId: result.subscription.id,
    newValues: {
      memberId: data.memberId,
      planId: data.planId,
      pricePaid,
      startDate: data.startDate,
    },
    req,
  });

  return result;
}

export async function listSubscriptions(gymId: string, query: ListSubscriptionsQuery) {
  const { page, limit, memberId, status, expiringInDays } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.SubscriptionWhereInput = { gymId };
  if (memberId) where.memberId = memberId;
  if (status) where.status = status as never;
  if (expiringInDays !== undefined) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + expiringInDays);
    where.status = 'active';
    where.endDate = { lte: threshold, gte: new Date() };
  }

  const [subscriptions, total] = await prisma.$transaction([
    prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { name: true, nameAr: true, planType: true } },
        member: { select: { fullName: true, memberNumber: true, phone: true } },
        discount: { select: { name: true, value: true, discountType: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ]);

  return { subscriptions, pagination: buildPagination(page, limit, total) };
}

export async function getExpiringSubscriptions(gymId: string, days = 3) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);

  return prisma.subscription.findMany({
    where: {
      gymId,
      status: 'active',
      endDate: { lte: threshold, gte: new Date() },
    },
    include: {
      member: { select: { fullName: true, fullNameAr: true, phone: true, memberNumber: true } },
      plan: { select: { name: true, planType: true } },
    },
    orderBy: { endDate: 'asc' },
  });
}

export async function updateSubscriptionStatus(
  gymId: string,
  subscriptionId: string,
  userId: string,
  status: 'frozen' | 'cancelled',
  notes: string | undefined,
  req: Request
) {
  const existing = await prisma.subscription.findFirst({
    where: { id: subscriptionId, gymId },
  });
  if (!existing) throw new NotFoundError('Subscription not found');
  if (existing.status !== 'active') {
    throw new Error(`Cannot change status of a ${existing.status} subscription`);
  }

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status, notes: notes ?? existing.notes },
  });

  await createAuditLog({
    gymId,
    userId,
    action: 'update_status',
    entityType: 'subscription',
    entityId: subscriptionId,
    oldValues: { status: existing.status },
    newValues: { status },
    req,
  });

  return updated;
}

export async function listPlans(gymId: string, includeInactive = false) {
  return prisma.subscriptionPlan.findMany({
    where: { gymId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ planType: 'asc' }, { price: 'asc' }],
  });
}

export async function createPlan(gymId: string, userId: string, data: CreatePlanInput, req: Request) {
  if (data.planType === 'session' && !data.sessionsCount) {
    throw new Error('sessionsCount is required for session plans');
  }
  if (data.planType !== 'session' && !data.durationDays) {
    data.durationDays = PLAN_DURATIONS[data.planType];
  }

  const plan = await prisma.subscriptionPlan.create({
    data: { gymId, ...data },
  });

  await createAuditLog({ gymId, userId, action: 'create', entityType: 'subscription_plan', entityId: plan.id, newValues: data as Record<string, unknown>, req });
  return plan;
}

export async function updatePlan(gymId: string, planId: string, userId: string, data: UpdatePlanInput, req: Request) {
  const existing = await prisma.subscriptionPlan.findFirst({ where: { id: planId, gymId } });
  if (!existing) throw new NotFoundError('Plan not found');

  const updated = await prisma.subscriptionPlan.update({ where: { id: planId }, data });
  await createAuditLog({ gymId, userId, action: 'update', entityType: 'subscription_plan', entityId: planId, oldValues: { price: Number(existing.price), isActive: existing.isActive }, newValues: data as Record<string, unknown>, req });
  return updated;
}
