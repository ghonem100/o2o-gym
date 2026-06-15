import { Request } from 'express';
import { prisma } from '../lib/prisma';
import logger from './logger';

interface AuditEntry {
  gymId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  req?: Request;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        gymId: entry.gymId,
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        oldValues: entry.oldValues ? JSON.parse(JSON.stringify(entry.oldValues)) : undefined,
        newValues: entry.newValues ? JSON.parse(JSON.stringify(entry.newValues)) : undefined,
        ipAddress: entry.req
          ? (entry.req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            entry.req.socket.remoteAddress ||
            null
          : null,
        userAgent: entry.req?.headers['user-agent'] ?? null,
      },
    });
  } catch (err) {
    logger.error('Failed to create audit log', { err, entry });
  }
}
