import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { buildPagination } from '../../utils/response';
import { sendWhatsApp, sendSMS } from './providers';
import logger from '../../utils/logger';

const DEFAULT_WINDOW_DAYS = 3;
const DEFAULT_TEMPLATE =
  'عزيزي {memberName}، اشتراكك في O2O Gym سينتهي بتاريخ {endDate}. يرجى التجديد في أقرب وقت. 📞 اتصل بنا على {gymPhone}';

interface NotificationSettings {
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  daysBeforeExpiry: number;
  messageTemplate: string;
}

interface ReminderSummary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  details: { memberName: string; phone: string; status: string }[];
}

/** Fills the configured template with member/gym values. */
function buildExpiryMessage(
  template: string,
  memberName: string,
  endDate: Date,
  gymPhone: string
): string {
  const formattedDate = new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(endDate);

  return template
    .replace(/\{memberName\}/g, memberName)
    .replace(/\{endDate\}/g, formattedDate)
    .replace(/\{gymPhone\}/g, gymPhone);
}

/**
 * Finds subscriptions expiring within the window and sends a renewal reminder
 * to each member. Prevents duplicate sends per member per day.
 */
export async function sendExpiryReminders(gymId: string): Promise<ReminderSummary> {
  const gym = await prisma.gym.findUniqueOrThrow({
    where: { id: gymId },
    select: { phone: true, whatsappNumber: true, settings: true },
  });
  const gymPhone = gym.phone || gym.whatsappNumber || '';

  const settings = ((gym.settings as Record<string, unknown>)?.notifications ??
    {}) as Partial<NotificationSettings>;
  const windowDays = settings.daysBeforeExpiry ?? DEFAULT_WINDOW_DAYS;
  const template = settings.messageTemplate ?? DEFAULT_TEMPLATE;
  const whatsappEnabled = settings.whatsappEnabled ?? true;
  const smsEnabled = settings.smsEnabled ?? false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + windowDays);

  const expiring = await prisma.subscription.findMany({
    where: {
      gymId,
      status: 'active',
      endDate: { gte: today, lte: windowEnd },
    },
    include: {
      member: { select: { id: true, fullName: true, fullNameAr: true, phone: true } },
    },
  });

  const summary: ReminderSummary = {
    total: expiring.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  for (const sub of expiring) {
    const { member } = sub;
    if (!sub.endDate) continue;

    // Dedup: skip if a reminder already went to this member today
    const alreadySent = await prisma.notificationLog.findFirst({
      where: {
        gymId,
        memberId: member.id,
        type: 'expiry_reminder',
        sentAt: { gte: today },
      },
    });

    if (alreadySent) {
      summary.skipped += 1;
      summary.details.push({ memberName: member.fullName, phone: member.phone, status: 'skipped' });
      continue;
    }

    const name = member.fullNameAr || member.fullName;
    const message = buildExpiryMessage(template, name, sub.endDate, gymPhone);

    // Try enabled channels: WhatsApp first, then SMS fallback
    let result = { success: false, error: 'No channel enabled' } as { success: boolean; error?: string };
    let channel: 'whatsapp' | 'sms' = 'whatsapp';

    if (whatsappEnabled) {
      result = await sendWhatsApp(member.phone, message);
      channel = 'whatsapp';
    }
    if (!result.success && smsEnabled) {
      const smsResult = await sendSMS(member.phone, message);
      if (smsResult.success) {
        result = smsResult;
        channel = 'sms';
      }
    }

    await prisma.notificationLog.create({
      data: {
        gymId,
        memberId: member.id,
        type: 'expiry_reminder',
        channel,
        message,
        status: result.success ? 'sent' : 'failed',
      },
    });

    if (result.success) {
      summary.sent += 1;
      summary.details.push({ memberName: name, phone: member.phone, status: 'sent' });
    } else {
      summary.failed += 1;
      summary.details.push({ memberName: name, phone: member.phone, status: 'failed' });
    }
  }

  logger.info('Expiry reminders processed', {
    gymId,
    total: summary.total,
    sent: summary.sent,
    failed: summary.failed,
    skipped: summary.skipped,
  });

  return summary;
}

/** Runs reminders for every active gym (used by the daily cron). */
export async function sendExpiryRemindersAllGyms(): Promise<void> {
  const gyms = await prisma.gym.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  for (const gym of gyms) {
    try {
      await sendExpiryReminders(gym.id);
    } catch (err) {
      logger.error('Failed sending reminders for gym', { gymId: gym.id, err });
    }
  }
}

export async function listNotifications(
  gymId: string,
  query: { page: number; limit: number; type?: string; status?: string }
) {
  const { page, limit, type, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationLogWhereInput = { gymId };
  if (type) where.type = type as never;
  if (status) where.status = status as never;

  const [logs, total] = await prisma.$transaction([
    prisma.notificationLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sentAt: 'desc' },
      include: {
        member: { select: { fullName: true, memberNumber: true, phone: true } },
      },
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return { logs, pagination: buildPagination(page, limit, total) };
}
