import { Request, Response, NextFunction } from 'express';
import { loginSchema, changePasswordSchema } from './auth.schema';
import * as AuthService from './auth.service';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/response';

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = loginSchema.parse({ body: req.body });
    const result = await AuthService.login(body.username, body.password, req, body.gymSlug);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    if (err instanceof AuthService.UnauthorizedError) {
      sendError(res, err.message, 401);
      return;
    }
    next(err);
  }
}

export async function logoutHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await AuthService.logout(req.user!.userId, req.user!.gymId, req);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

export async function getMeHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await AuthService.getMe(req.user!.userId);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function changePasswordHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = changePasswordSchema.parse({ body: req.body });
    await AuthService.changePassword(
      req.user!.userId,
      req.user!.gymId,
      body.currentPassword,
      body.newPassword,
      req
    );
    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    if (err instanceof AuthService.UnauthorizedError) {
      sendError(res, err.message, 401);
      return;
    }
    next(err);
  }
}
