import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/response';
import {
  createMemberSchema,
  updateMemberSchema,
  memberIdSchema,
  listMembersSchema,
} from './members.schema';
import * as MembersService from './members.service';

export async function createMemberHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = createMemberSchema.parse({ body: req.body });
    const member = await MembersService.createMember(
      req.user!.gymId,
      req.user!.userId,
      body,
      req
    );
    sendSuccess(res, member, 'Member created successfully', 201);
  } catch (err) {
    next(err);
  }
}

export async function listMembersHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { query } = listMembersSchema.parse({ query: req.query });
    const { members, pagination } = await MembersService.listMembers(
      req.user!.gymId,
      query
    );
    sendSuccess(res, members, undefined, 200, pagination);
  } catch (err) {
    next(err);
  }
}

export async function getMemberHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { params } = memberIdSchema.parse({ params: req.params });
    const member = await MembersService.getMemberById(req.user!.gymId, params.id);
    sendSuccess(res, member);
  } catch (err) {
    if (err instanceof MembersService.NotFoundError) {
      sendError(res, err.message, 404);
      return;
    }
    next(err);
  }
}

export async function getMemberProfileHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { params } = memberIdSchema.parse({ params: req.params });
    const profile = await MembersService.getMemberProfile(req.user!.gymId, params.id);
    sendSuccess(res, profile);
  } catch (err) {
    if (err instanceof MembersService.NotFoundError) {
      sendError(res, err.message, 404);
      return;
    }
    next(err);
  }
}

export async function updateMemberHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { params, body } = updateMemberSchema.parse({
      params: req.params,
      body: req.body,
    });
    const member = await MembersService.updateMember(
      req.user!.gymId,
      params.id,
      req.user!.userId,
      body,
      req
    );
    sendSuccess(res, member, 'Member updated successfully');
  } catch (err) {
    if (err instanceof MembersService.NotFoundError) {
      sendError(res, err.message, 404);
      return;
    }
    next(err);
  }
}

export async function getMemberByBarcodeHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const barcode = Array.isArray(req.params.barcode) ? req.params.barcode[0] : req.params.barcode;
    const member = await MembersService.getMemberByBarcode(req.user!.gymId, barcode);
    sendSuccess(res, member);
  } catch (err) {
    if (err instanceof MembersService.NotFoundError) {
      sendError(res, err.message, 404);
      return;
    }
    next(err);
  }
}
