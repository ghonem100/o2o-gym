import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/response';
import {
  faceCheckInSchema,
  barcodeCheckInSchema,
  manualCheckInSchema,
  listAttendanceSchema,
} from './attendance.schema';
import * as AttendanceService from './attendance.service';
import { NotFoundError } from '../members/members.service';

export async function faceCheckInHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = faceCheckInSchema.parse({ body: req.body });
    const result = await AttendanceService.faceCheckIn(req.user!.gymId, req.user!.userId, body, req);
    const statusCode = result.alert === 'no_subscription' || result.alert === 'expired' ? 200 : 200;
    sendSuccess(res, result, result.alert ? `Alert: ${result.alert}` : 'Check-in successful', statusCode);
  } catch (err) {
    if (err instanceof AttendanceService.AlreadyCheckedInError) { sendError(res, err.message, 409); return; }
    if (err instanceof NotFoundError) { sendError(res, err.message, 404); return; }
    next(err);
  }
}

export async function barcodeCheckInHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = barcodeCheckInSchema.parse({ body: req.body });
    const result = await AttendanceService.barcodeCheckIn(req.user!.gymId, req.user!.userId, body, req);
    sendSuccess(res, result, result.alert ? `Alert: ${result.alert}` : 'Check-in successful');
  } catch (err) {
    if (err instanceof AttendanceService.AlreadyCheckedInError) { sendError(res, err.message, 409); return; }
    if (err instanceof NotFoundError) { sendError(res, err.message, 404); return; }
    next(err);
  }
}

export async function manualCheckInHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = manualCheckInSchema.parse({ body: req.body });
    const result = await AttendanceService.manualCheckIn(req.user!.gymId, req.user!.userId, body, req);
    sendSuccess(res, result, result.alert ? `Alert: ${result.alert}` : 'Check-in successful');
  } catch (err) {
    if (err instanceof AttendanceService.AlreadyCheckedInError) { sendError(res, err.message, 409); return; }
    if (err instanceof NotFoundError) { sendError(res, err.message, 404); return; }
    next(err);
  }
}

export async function listAttendanceHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query } = listAttendanceSchema.parse({ query: req.query });
    const { logs, pagination } = await AttendanceService.listAttendance(req.user!.gymId, query);
    sendSuccess(res, logs, undefined, 200, pagination);
  } catch (err) { next(err); }
}

export async function todayAttendanceHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await AttendanceService.getTodayAttendance(req.user!.gymId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}
