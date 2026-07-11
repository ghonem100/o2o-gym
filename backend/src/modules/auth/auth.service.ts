import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { AuthPayload } from '../../types';
import { createAuditLog } from '../../utils/audit';
import { Request } from 'express';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const BCRYPT_ROUNDS = 12;

export async function login(
  username: string,
  password: string,
  req: Request,
  gymSlug?: string
): Promise<{ token: string; user: SafeUser }> {
  const gymSelect = {
    select: { id: true, name: true, isActive: true, slug: true, subscriptionStatus: true },
  };

  let user;
  if (gymSlug) {
    // Gym-scoped login: resolve the slug first, then the user within that gym.
    const gym = await prisma.gym.findUnique({ where: { slug: gymSlug }, select: { id: true } });
    if (!gym) throw new UnauthorizedError('Invalid credentials');
    user = await prisma.user.findFirst({
      where: { username, gymId: gym.id },
      include: { gym: gymSelect },
    });
  } else {
    // No slug: prefer the platform super admin, fall back to legacy gym login.
    user = await prisma.user.findFirst({
      where: { username, role: 'super_admin' },
      include: { gym: gymSelect },
    });
    if (!user) {
      user = await prisma.user.findFirst({
        where: { username },
        include: { gym: gymSelect },
      });
    }
  }

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (user.role !== 'super_admin') {
    if (!user.gym || !user.gym.isActive) {
      throw new UnauthorizedError('Gym account is inactive');
    }
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    throw new UnauthorizedError(
      `Account locked. Try again in ${minutesLeft} minutes`
    );
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    const newFailedAttempts = user.failedAttempts + 1;
    const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: newFailedAttempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
          : null,
      },
    });

    if (shouldLock) {
      throw new UnauthorizedError(
        `Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes`
      );
    }

    const remaining = MAX_FAILED_ATTEMPTS - newFailedAttempts;
    throw new UnauthorizedError(
      `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const payload: AuthPayload = {
    userId: user.id,
    gymId: user.gymId ?? '',
    role: user.role,
    username: user.username,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '8h',
  });

  if (user.gymId) {
    await createAuditLog({
      gymId: user.gymId,
      userId: user.id,
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      req,
    });
  }

  const safeUser: SafeUser = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    fullNameAr: user.fullNameAr,
    role: user.role,
    gymId: user.gymId ?? '',
    gymName: user.gym?.name ?? 'المنصة',
    gymSlug: user.gym?.slug ?? null,
  };

  return { token, user: safeUser };
}

export async function logout(
  userId: string,
  gymId: string,
  req: Request
): Promise<void> {
  if (!gymId) return; // super admin — no gym-scoped audit log
  await createAuditLog({
    gymId,
    userId,
    action: 'logout',
    entityType: 'user',
    entityId: userId,
    req,
  });
}

export async function changePassword(
  userId: string,
  gymId: string,
  currentPassword: string,
  newPassword: string,
  req: Request
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash, updatedAt: new Date() },
  });

  await createAuditLog({
    gymId,
    userId,
    action: 'change_password',
    entityType: 'user',
    entityId: userId,
    req,
  });
}

export async function getMe(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { gym: { select: { id: true, name: true, slug: true } } },
  });

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    fullNameAr: user.fullNameAr,
    role: user.role,
    gymId: user.gymId ?? '',
    gymName: user.gym?.name ?? 'المنصة',
    gymSlug: user.gym?.slug ?? null,
  };
}

export interface SafeUser {
  id: string;
  username: string;
  fullName: string;
  fullNameAr: string | null;
  role: string;
  gymId: string;
  gymName: string;
  gymSlug: string | null;
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
