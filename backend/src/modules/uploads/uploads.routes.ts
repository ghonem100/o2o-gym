import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../types';
import { uploadImage, isCloudinaryConfigured } from '../../lib/cloudinary';

const router = Router();
router.use(authenticate);

const uploadSchema = z.object({
  body: z.object({
    image: z
      .string()
      .startsWith('data:image/', 'Must be a base64 image data URL')
      .max(8_000_000, 'Image too large (max ~6MB)'),
  }),
});

router.post('/image', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isCloudinaryConfigured()) {
      sendError(res, 'Image uploads are not configured on the server', 503);
      return;
    }
    const { body } = uploadSchema.parse({ body: req.body });
    const url = await uploadImage(body.image);
    sendSuccess(res, { url }, 'Image uploaded');
  } catch (err) {
    next(err);
  }
});

export default router;
