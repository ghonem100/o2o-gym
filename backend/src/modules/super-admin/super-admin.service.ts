import { prisma } from '../../lib/prisma';
import { hashPassword } from '../auth/auth.service';
import { invalidateGymStatus } from '../../middleware/gym-status.middleware';
import { createAuditLog } from '../../utils/audit';
import { CreateGymInput, UpdateGymInput, RecordPaymentInput } from './super-admin.schema';
import { Request } from 'express';

const TRIAL_DAYS = 14;

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export async function createGym(superAdminId: string, data: CreateGymInput, req: Request) {
  const existingSlug = await prisma.gym.findUnique({ where: { slug: data.slug } });
  if (existingSlug) throw new ConflictError('Slug is already taken');

  const passwordHash = await hashPassword(data.ownerPassword);
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const gym = await tx.gym.create({
      data: {
        name: data.gymName,
        nameAr: data.gymNameAr,
        slug: data.slug,
        city: data.city,
        subscriptionStatus: 'trial',
        subscriptionEndsAt: trialEndsAt,
        monthlyFee: data.monthlyFee,
      },
    });

    const owner = await tx.user.create({
      data: {
        gymId: gym.id,
        username: data.ownerUsername,
        passwordHash,
        fullName: data.ownerFullName,
        phone: data.ownerPhone,
        role: 'owner',
      },
    });

    return { gym, owner };
  });

  await createAuditLog({
    gymId: result.gym.id,
    userId: superAdminId,
    action: 'tenant_create',
    entityType: 'gym',
    entityId: result.gym.id,
    newValues: { name: data.gymName, slug: data.slug, ownerUsername: data.ownerUsername },
    req,
  });

  return {
    gym: result.gym,
    owner: {
      id: result.owner.id,
      username: result.owner.username,
      fullName: result.owner.fullName,
      // Plaintext returned ONCE so the super admin can hand it to the gym owner
      password: data.ownerPassword,
    },
    loginUrl: `/gym/${result.gym.slug}`,
  };
}

export async function listGyms() {
  const gyms = await prisma.gym.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, nameAr: true, slug: true, city: true,
      subscriptionStatus: true, subscriptionEndsAt: true, monthlyFee: true,
      tenantNotes: true, createdAt: true,
      _count: { select: { members: true, users: true } },
    },
  });

  return gyms.map((g) => ({
    ...g,
    membersCount: g._count.members,
    usersCount: g._count.users,
    _count: undefined,
  }));
}

export async function getGymDetail(gymId: string) {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: {
      id: true, name: true, nameAr: true, slug: true, city: true, phone: true,
      subscriptionStatus: true, subscriptionEndsAt: true, monthlyFee: true,
      tenantNotes: true, createdAt: true, isActive: true,
      users: {
        select: { id: true, username: true, fullName: true, role: true, isActive: true, lastLoginAt: true },
        orderBy: { createdAt: 'asc' },
      },
      tenantPayments: { orderBy: { paidAt: 'desc' }, take: 24 },
      _count: { select: { members: true, subscriptions: true } },
    },
  });
  if (!gym) throw new NotFoundError('Gym not found');

  return {
    ...gym,
    membersCount: gym._count.members,
    subscriptionsCount: gym._count.subscriptions,
    _count: undefined,
  };
}

export async function updateGym(superAdminId: string, gymId: string, data: UpdateGymInput, req: Request) {
  const existing = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!existing) throw new NotFoundError('Gym not found');

  if (data.slug && data.slug !== existing.slug) {
    const taken = await prisma.gym.findUnique({ where: { slug: data.slug } });
    if (taken) throw new ConflictError('Slug is already taken');
  }

  const gym = await prisma.gym.update({
    where: { id: gymId },
    data: {
      name: data.gymName,
      nameAr: data.gymNameAr,
      slug: data.slug,
      subscriptionStatus: data.subscriptionStatus,
      subscriptionEndsAt:
        data.subscriptionEndsAt === undefined
          ? undefined
          : data.subscriptionEndsAt === null
            ? null
            : new Date(data.subscriptionEndsAt),
      monthlyFee: data.monthlyFee === undefined ? undefined : data.monthlyFee,
      tenantNotes: data.notes === undefined ? undefined : data.notes,
    },
  });

  await invalidateGymStatus(gymId);
  await createAuditLog({
    gymId, userId: superAdminId, action: 'tenant_update', entityType: 'gym', entityId: gymId,
    oldValues: { slug: existing.slug, subscriptionStatus: existing.subscriptionStatus },
    newValues: data as Record<string, unknown>, req,
  });

  return gym;
}

export async function setGymStatus(
  superAdminId: string,
  gymId: string,
  status: 'active' | 'suspended',
  req: Request
) {
  const existing = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!existing) throw new NotFoundError('Gym not found');

  const gym = await prisma.gym.update({
    where: { id: gymId },
    data: { subscriptionStatus: status },
  });

  await invalidateGymStatus(gymId);
  await createAuditLog({
    gymId, userId: superAdminId,
    action: status === 'suspended' ? 'tenant_suspend' : 'tenant_activate',
    entityType: 'gym', entityId: gymId,
    oldValues: { subscriptionStatus: existing.subscriptionStatus },
    newValues: { subscriptionStatus: status }, req,
  });

  return gym;
}

export async function recordPayment(
  superAdminId: string,
  gymId: string,
  data: RecordPaymentInput,
  req: Request
) {
  const existing = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!existing) throw new NotFoundError('Gym not found');

  // Extend from the later of (now, current end date) so early payments stack.
  const now = new Date();
  const base =
    existing.subscriptionEndsAt && existing.subscriptionEndsAt > now
      ? existing.subscriptionEndsAt
      : now;
  const newEndsAt = new Date(base.getTime() + data.extendDays * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.tenantPayment.create({
      data: { gymId, amount: data.amount, month: data.month, notes: data.notes },
    });
    const gym = await tx.gym.update({
      where: { id: gymId },
      data: { subscriptionStatus: 'active', subscriptionEndsAt: newEndsAt },
    });
    return { payment, gym };
  });

  await invalidateGymStatus(gymId);
  await createAuditLog({
    gymId, userId: superAdminId, action: 'tenant_payment', entityType: 'tenant_payment',
    entityId: result.payment.id,
    newValues: { amount: data.amount, month: data.month, newEndsAt: newEndsAt.toISOString() },
    req,
  });

  return result;
}

export async function getPlatformStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const soonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalGyms, activeGyms, trialGyms, suspendedGyms, revenueThisMonth, gymsExpiringSoon] =
    await prisma.$transaction([
      prisma.gym.count(),
      prisma.gym.count({ where: { subscriptionStatus: 'active' } }),
      prisma.gym.count({ where: { subscriptionStatus: 'trial' } }),
      prisma.gym.count({ where: { subscriptionStatus: 'suspended' } }),
      prisma.tenantPayment.aggregate({
        where: { paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.gym.findMany({
        where: {
          subscriptionStatus: { in: ['active', 'trial'] },
          subscriptionEndsAt: { gte: now, lte: soonThreshold },
        },
        select: {
          id: true, name: true, slug: true,
          subscriptionStatus: true, subscriptionEndsAt: true, monthlyFee: true,
        },
        orderBy: { subscriptionEndsAt: 'asc' },
      }),
    ]);

  return {
    totalGyms,
    activeGyms,
    trialGyms,
    suspendedGyms,
    totalRevenueThisMonth: Number(revenueThisMonth._sum.amount ?? 0),
    gymsExpiringSoon,
  };
}
