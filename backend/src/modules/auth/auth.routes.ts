import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.middleware';
import {
  loginHandler,
  logoutHandler,
  getMeHandler,
  changePasswordHandler,
} from './auth.controller';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, loginHandler);
router.post('/logout', authenticate, logoutHandler);
router.get('/me', authenticate, getMeHandler);
router.put('/change-password', authenticate, changePasswordHandler);

export default router;
