import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

/**
 * Public slug → gym resolver used by the frontend on page load.
 * Deliberately exposes only display-safe fields (no revenue, no counts).
 */
router.get('/slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = String(req.params.slug ?? '').toLowerCase();
    if (!/^[a-z0-9-]{2,50}$/.test(slug)) {
      sendError(res, 'Gym not found', 404);
      return;
    }

    const gym = await prisma.gym.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        nameAr: true,
        isActive: true,
        subscriptionStatus: true,
      },
    });

    if (!gym || !gym.isActive) {
      sendError(res, 'Gym not found', 404);
      return;
    }

    sendSuccess(res, {
      gymId: gym.id,
      gymName: gym.name,
      gymNameAr: gym.nameAr,
      isActive: gym.isActive,
      subscriptionStatus: gym.subscriptionStatus,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
