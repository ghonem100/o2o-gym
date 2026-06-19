import { Prisma, MemberStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPagination } from '../../utils/response';
import { CreateMemberInput, UpdateMemberInput, ListMembersQuery } from './members.schema';
import { Request } from 'express';
import { PaginationMeta } from '../../types';

function generateMemberNumber(gymId: string, count: number): string {
  const prefix = gymId.slice(0, 4).toUpperCase();
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
}

function generateBarcode(memberNumber: string): string {
  // Keep only digits so the barcode equals the numeric member number,
  // e.g. memberNumber "6591F3D900001" -> barcode "659100001".
  return memberNumber.replace(/[^0-9]/g, '');
}

export async function createMember(
  gymId: string,
  userId: string,
  data: CreateMemberInput,
  req: Request
) {
  const count = await prisma.member.count({ where: { gymId } });
  const memberNumber = generateMemberNumber(gymId, count);

  const member = await prisma.member.create({
    data: {
      gymId,
      memberNumber,
      fullName: data.fullName,
      fullNameAr: data.fullNameAr,
      phone: normalizePhone(data.phone),
      gender: data.gender,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      photoUrl: data.photoUrl,
      notes: data.notes,
      createdBy: userId,
    },
  });

  const barcode = generateBarcode(memberNumber);
  const updated = await prisma.member.update({
    where: { id: member.id },
    data: { barcode },
  });

  await createAuditLog({
    gymId,
    userId,
    action: 'create',
    entityType: 'member',
    entityId: member.id,
    newValues: { fullName: data.fullName, phone: data.phone, memberNumber },
    req,
  });

  return updated;
}

export async function listMembers(
  gymId: string,
  query: ListMembersQuery
): Promise<{ members: unknown[]; pagination: PaginationMeta }> {
  const { page, limit, search, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.MemberWhereInput = { gymId };
  if (status) where.status = status as MemberStatus;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { fullNameAr: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { memberNumber: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [members, total] = await prisma.$transaction([
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        face: { select: { isActive: true } },
        subscriptions: {
          where: { status: 'active' },
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { plan: { select: { name: true, planType: true } } },
        },
      },
    }),
    prisma.member.count({ where }),
  ]);

  return {
    members: members.map((m) => ({
      ...m,
      activeSubscription: m.subscriptions[0] ?? null,
      hasFace: !!m.face?.isActive,
      subscriptions: undefined,
      face: undefined,
    })),
    pagination: buildPagination(page, limit, total),
  };
}

export async function getMemberById(gymId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: {
      face: { select: { isActive: true, createdAt: true } },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 3 } },
      },
      attendanceLogs: {
        orderBy: { checkInDate: 'desc' },
        take: 10,
      },
    },
  });

  if (!member) throw new NotFoundError('Member not found');
  return member;
}

export async function getMemberByBarcode(gymId: string, barcode: string) {
  const member = await prisma.member.findFirst({
    where: { barcode, gymId },
    include: {
      subscriptions: {
        where: { status: 'active' },
        take: 1,
        include: { plan: true },
      },
    },
  });

  if (!member) throw new NotFoundError('Member not found');
  return member;
}

export async function updateMember(
  gymId: string,
  memberId: string,
  userId: string,
  data: UpdateMemberInput,
  req: Request
) {
  const existing = await prisma.member.findFirst({
    where: { id: memberId, gymId },
  });
  if (!existing) throw new NotFoundError('Member not found');

  if (data.phone) data.phone = normalizePhone(data.phone);

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    },
  });

  await createAuditLog({
    gymId,
    userId,
    action: 'update',
    entityType: 'member',
    entityId: memberId,
    oldValues: { fullName: existing.fullName, phone: existing.phone, status: existing.status },
    newValues: data as Record<string, unknown>,
    req,
  });

  return updated;
}

export async function getMemberProfile(gymId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: {
      face: { select: { isActive: true, createdAt: true, photoUrl: true } },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
          payments: { orderBy: { createdAt: 'desc' } },
          discount: true,
        },
      },
      attendanceLogs: {
        orderBy: { checkInDate: 'desc' },
        take: 30,
        include: { verifier: { select: { fullName: true } } },
      },
    },
  });

  if (!member) throw new NotFoundError('Member not found');

  const activeSubscription = member.subscriptions.find((s) => s.status === 'active') ?? null;
  const today = new Date();
  const daysRemaining =
    activeSubscription?.endDate
      ? Math.max(0, Math.ceil((activeSubscription.endDate.getTime() - today.getTime()) / 86400000))
      : null;

  return {
    ...member,
    activeSubscription,
    hasFace: !!member.face?.isActive,
    daysRemaining,
    subscriptionAlert:
      daysRemaining !== null && daysRemaining <= 3 ? 'expiring_soon' :
      activeSubscription?.status === 'expired' ? 'expired' : null,
  };
}

function normalizePhone(phone: string): string {
  return phone.replace(/^(\+20|0)/, '0');
}

export class NotFoun