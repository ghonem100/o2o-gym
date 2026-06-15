import { Prisma, CheckInMethod } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPagination } from '../../utils/response';
import { FaceCheckInInput, BarcodeCheckInInput, ManualCheckInInput, ListAttendanceQuery } from './attendance.schema';
import { NotFoundError } from '../members/members.service';
import { Request } from 'express';

const FACE_CONFIDENCE_THRESHOLD = 0.6;

export interface CheckInResult {
  success: boolean;
  member: {
    id: string;
    fullName: string;
    memberNumber: string;
    photoUrl: string | null;
  };
  subscription: {
    status: string;
    endDate: Date | null;
    sessionsRemaining: number | null;
    planName: string;
    planType: string;
  } | null;
  alert: 'expired' | 'expiring_soon' | 'no_subscription' | null;
  attendanceId: string;
}

async function performCheckIn(
  gymId: string,
  memberId: string,
  method: CheckInMethod,
  userId: string | undefined,
  notes: string | undefined,
  req: Request
): Promise<CheckInResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendanceLog.findFirst({
    where: {
      memberId,
      gymId,
      checkInDate: today,
    },
  });

  if (existing) {
    throw new AlreadyCheckedInError('Member already checked in today');
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: { id: true, fullName: true, memberNumber: true, photoUrl: true, status: true },
  });

  if (!member) throw new NotFoundError('Member not found');
  if (member.status === 'suspended') throw new Error('Member account is suspended');

  const activeSubscription = await prisma.subscription.findFirst({
    where: { memberId, gymId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    include: { plan: { select: { name: true, planType: true } } },
  });

  let alert: CheckInResult['alert'] = null;
  let subscriptionId: string | undefined;

  if (!activeSubscription) {
    alert = 'no_subscription';
  } else {
    subscriptionId = activeSubscription.id;

    if (activeSubscription.endDate) {
      const daysRemaining = Math.ceil(
        (activeSubscription.endDate.getTime() - Date.now()) / 86400000
      );
      if (daysRemaining <= 0) {
        alert = 'expired';
      } else if (daysRemaining <= 3) {
        alert = 'expiring_soon';
      }
    }

    if (activeSubscription.plan.planType === 'session') {
      if (!activeSubscription.sessionsRemaining || activeSubscription.sessionsRemaining <= 0) {
        alert = 'expired';
      } else {
        await prisma.subscription.update({
          where: { id: activeSubscription.id },
          data: {
            sessionsRemaining: { decrement: 1 },
            status: activeSubscription.sessionsRemaining - 1 <= 0 ? 'expired' : 'active',
          },
        });
      }
    }
  }

  const attendance = await prisma.attendanceLog.create({
    data: {
      gymId,
      memberId,
      subscriptionId: subscriptionId ?? null,
      checkInMethod: method,
      checkInDate: today,
      verifiedBy: method === 'manual' ? userId ?? null : null,
      notes: notes ?? null,
    },
  });

  await createAuditLog({
    gymId,
    userId,
    action: 'check_in',
    entityType: 'attendance',
    entityId: attendance.id,
    newValues: { memberId, method, date: today.toISOString() },
    req,
  });

  return {
    success: true,
    member: {
      id: member.id,
      fullName: member.fullName,
      memberNumber: member.memberNumber,
      photoUrl: member.photoUrl,
    },
    subscription: activeSubscription
      ? {
          status: alert === 'expired' ? 'expired' : activeSubscription.status,
          endDate: activeSubscription.endDate,
          sessionsRemaining: activeSubscription.sessionsRemaining,
          planName: activeSubscription.plan.name,
          planType: activeSubscription.plan.planType,
        }
      : null,
    alert,
    attendanceId: attendance.id,
  };
}

export async function faceCheckIn(
  gymId: string,
  userId: string,
  data: FaceCheckInInput,
  req: Request
): Promise<CheckInResult> {
  if (data.confidence < FACE_CONFIDENCE_THRESHOLD) {
    throw new Error(`Face confidence ${data.confidence} below threshold ${FACE_CONFIDENCE_THRESHOLD}`);
  }
  return performCheckIn(gymId, data.memberId, 'face', userId, undefined, req);
}

export async function barcodeCheckIn(
  gymId: string,
  userId: string,
  data: BarcodeCheckInInput,
  req: Request
): Promise<CheckInResult> {
  const member = await prisma.member.findFirst({
    where: { barcode: data.barcode, gymId },
    select: { id: true },
  });
  if (!member) throw new NotFoundError('No member found with this barcode');
  return performCheckIn(gymId, member.id, 'barcode', userId, undefined, req);
}

export async function manualCheckIn(
  gymId: string,
  userId: string,
  data: ManualCheckInInput,
  req: Request
): Promise<CheckInResult> {
  return performCheckIn(gymId, data.memberId, 'manual', userId, data.notes, req);
}

export async function listAttendance(gymId: string, query: ListAttendanceQuery) {
  const { page, limit, memberId, date, dateFrom, dateTo, method } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.AttendanceLogWhereInput = { gymId };
  if (memberId) where.memberId = memberId;
  if (method) where.checkInMethod = method as CheckInMethod;
  if (date) {
    const d = new Date(date);
    where.checkInDate = d;
  } else if (dateFrom || dateTo) {
    where.checkInDate = {};
    if (dateFrom) (where.checkInDate as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) (where.checkInDate as Prisma.DateTimeFilter).lte = new Date(dateTo);
  }

  const [logs, total] = await prisma.$transaction([
    prisma.attendanceLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { checkInTime: 'desc' },
      include: {
        member: { select: { fullName: true, memberNumber: true, photoUrl: true } },
        verifier: { select: { fullName: true } },
        subscription: { select: { plan: { select: { name: true, planType: true } } } },
      },
    }),
    prisma.attendanceLog.count({ where }),
  ]);

  return { logs, pagination: buildPagination(page, limit, total) };
}

export async function getTodayAttendance(gymId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [logs, count] = await prisma.$transaction([
    prisma.attendanceLog.findMany({
      where: { gymId, checkInDate: today },
      orderBy: { checkInTime: 'desc' },
      include: {
        member: { select: { fullName: true, memberNumber: true, photoUrl: true } },
      },
      take: 50,
    }),
    prisma.attendanceLog.count({ where: { gymId, checkInDate: today } }),
  ]);

  return { logs, totalToday: count };
}

export class AlreadyCheckedInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlreadyCheckedInError';
  }
}
