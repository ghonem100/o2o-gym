import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { NotFoundError } from './members.service';
import { Request } from 'express';

/**
 * Returns all active member face descriptors for the gym, encoded as base64.
 * Used by the attendance kiosk to perform in-browser face matching.
 */
export async function getFaceDescriptors(
  gymId: string
): Promise<{ memberId: string; descriptor: string }[]> {
  const faces = await prisma.memberFace.findMany({
    where: {
      isActive: true,
      member: { gymId, status: 'active' },
    },
    select: { memberId: true, faceEncoding: true },
  });

  return faces.map((f) => ({
    memberId: f.memberId,
    descriptor: Buffer.from(f.faceEncoding).toString('base64'),
  }));
}

/**
 * Enrolls (or replaces) a member's face encoding.
 * Accepts a base64-encoded Float32Array (128-D descriptor).
 */
export async function enrollFace(
  gymId: string,
  userId: string,
  memberId: string,
  descriptorBase64: string,
  photoUrl: string | undefined,
  req: Request
): Promise<void> {
  const member = await prisma.member.findFirst({ where: { id: memberId, gymId } });
  if (!member) throw new NotFoundError('Member not found');

  const encoding = Buffer.from(descriptorBase64, 'base64');

  await prisma.memberFace.upsert({
    where: { memberId },
    create: { memberId, faceEncoding: encoding, photoUrl, isActive: true },
    update: { faceEncoding: encoding, photoUrl, isActive: true },
  });

  await createAuditLog({
    gymId,
    userId,
    action: 'enroll_face',
    entityType: 'member_face',
    entityId: memberId,
    req,
  });
}
