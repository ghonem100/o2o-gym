import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { checkGymActive } from '../../middleware/gym-status.middleware';
import {
  createMemberHandler,
  listMembersHandler,
  getMemberHandler,
  getMemberProfileHandler,
  updateMemberHandler,
  getMemberByBarcodeHandler,
} from './members.controller';
import { getFaceDescriptors, enrollFace } from './faces.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../types';
import { NotFoundError } from './members.service';

const router = Router();

router.use(authenticate);
router.use(checkGymActive);

// Face recognition endpoints (must precede /:id routes)
router.get('/face-descriptors', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const descriptors = await getFaceDescriptors(req.user!.gymId);
    sendSuccess(res, descriptors);
  } catch (err) {
    next(err);
  }
});

const enrollSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    descriptor: z.string().min(1),
    photoUrl: z.string().url().optional(),
  }),
});

router.post('/:id/face', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { params, body } = enrollSchema.parse({ params: req.params, body: req.body });
    await enrollFace(req.user!.gymId, req.user!.userId, params.id, body.descriptor, body.photoUrl, req);
    sendSuccess(res, null, 'Face enrolled successfully', 201);
  } catch (err) {
    if (err instanceof NotFoundError) {
      sendError(res, err.message, 404);
      return;
    }
    next(err);
  }
});

router.get('/', listMembersHandler);
router.post('/', createMemberHandler);
router.get('/barcode/:barcode', getMemberByBarcodeHandler);
router.get('/:id', getMemberHandler);
router.get('/:id/profile', getMemberProfileHandler);
router.put('/:id', updateMemberHandler);

export default router;
