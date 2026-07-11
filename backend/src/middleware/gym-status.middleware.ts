import { Response, NextFunction } from 'express';
import { TenantStatus } from '@prisma/client';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { getCache, setCache, deleteCache } from '../lib/redis';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

const CACHE_TTL_SECONDS = 300; // 5 minutes
const redisKey = (gymId: string) => `gym:status:${gymId}`;

interface GymStatusInfo {
  status: TenantStatus;
  endsAt: string | null; // ISO string (JSON-safe for Redis)
}

// In-memory fallback so the check works even when Redis is unavailable.
const memCache = new Map<string, { info: GymStatusInfo; expiresAt: number }>();

async function readGymStatus(gymId: string): Promise<GymStatusInfo | null> {
  const now = Date.now();

  const mem = memCache.get(gymId);
  if (mem && mem.expiresAt > now) return mem.info;

  try {
    const cached = await getCache<GymStatusInfo>(redisKey(gymId));
    if (cached) {
      memCache.set(gymId, { info: cached, expiresAt: now + CACHE_TTL_SECONDS * 1000 });
      return cached;
    }
  } catch {
    // Redis unavailable — fall through to DB
  }

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { subscriptionStatus: true, subscriptionEndsAt: true },
  });
  if (!gym) return null;

  const info: GymStatusInfo = {
    status: gym.subscriptionStatus,
    endsAt: gym.subscriptionEndsAt ? gym.subscriptionEndsAt.toISOString() : null,
  };

  memCache.set(gymId, { info, expiresAt: now + CACHE_TTL_SECONDS * 1000 });
  try {
    await setCache(redisKey(gymId), info, CACHE_TTL_SECONDS);
  } catch {
    // best effort
  }
  return info;
}

/** Call whenever the super admin changes a gym's status. */
export async function invalidateGymStatus(gymId: string): Promise<void> {
  memCache.delete(gymId);
  try {
    await deleteCache(redisKey(gymId));
  } catch {
    // best effort
  }
}

const SUSPENDED_MESSAGE =
  'اشتراك الصالة في المنصة موقوف. يرجى التواصل مع المزود لتجديد الاشتراك. 📞 01017975972';

/**
 * Blocks requests from gyms whose platform subscription is suspended/cancelled
 * (HTTP 402). Expired trials are auto-suspended. Super admins pass through.
 * Must run AFTER authenticate.
 */
export async function checkGymActive(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role === 'super_admin' || !user.gymId) {
      next();
      return;
    }

    const info = await readGymStatus(user.gymId);
    if (!info) {
      sendError(res, 'Gym not found', 402);
      return;
    }

    let status = info.status;

    // Auto-suspend expired trials
    if (status === 'trial' && info.endsAt && new Date(info.endsAt) < new Date()) {
      status = 'suspended';
      await prisma.gym.update({
        where: { id: user.gymId },
        data: { subscriptionStatus: 'suspended' },
      });
      await invalidateGymStatus(user.gymId);
      logger.info('Trial expired — gym auto-suspended', { gymId: user.gymId });
    }

    if (status === 'suspended' || status === 'cancelled') {
      sendError(res, SUSPENDED_MESSAGE, 402);
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
