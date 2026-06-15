'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, UserX } from 'lucide-react';
import { CheckInResult } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Props {
  result: CheckInResult;
  onDismiss: () => void;
}

export function CheckInResultOverlay({ result, onDismiss }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDismiss, result.alert ? 7000 : 4000);
    return () => clearTimeout(timer);
  }, [result, onDismiss]);

  const isAlert = result.alert === 'expired' || result.alert === 'no_subscription';
  const isWarning = result.alert === 'expiring_soon';

  const theme = isAlert
    ? { bg: 'bg-destructive', icon: result.alert === 'no_subscription' ? UserX : XCircle }
    : isWarning
      ? { bg: 'bg-warning', icon: AlertTriangle }
      : { bg: 'bg-success', icon: CheckCircle2 };

  const Icon = theme.icon;

  const daysRemaining = result.subscription?.endDate
    ? Math.ceil((new Date(result.subscription.endDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onDismiss}
    >
      <div
        className={cn(
          'relative mx-4 flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl p-12 text-center text-white shadow-2xl',
          theme.bg
        )}
      >
        <Icon className="h-24 w-24" strokeWidth={1.5} />

        <Avatar className="h-32 w-32 border-4 border-white/40">
          {result.member.photoUrl && <AvatarImage src={result.member.photoUrl} alt={result.member.fullName} />}
          <AvatarFallback className="bg-white/20 text-3xl text-white">
            {result.member.fullName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div>
          <h2 className="text-4xl font-bold">{result.member.fullName}</h2>
          <p className="mt-1 text-lg opacity-90">#{result.member.memberNumber}</p>
        </div>

        {!result.alert && (
          <p className="text-2xl font-semibold">{t('attendance.checkInSuccess')} ✓</p>
        )}

        {result.alert === 'expired' && (
          <div className="space-y-1">
            <p className="text-3xl font-bold">{t('attendance.subscriptionExpired')}</p>
            <p className="text-xl">{t('attendance.renewNow')}</p>
          </div>
        )}

        {result.alert === 'no_subscription' && (
          <p className="text-3xl font-bold">{t('attendance.noSubscription')}</p>
        )}

        {result.alert === 'expiring_soon' && daysRemaining !== null && (
          <div className="space-y-1">
            <p className="text-3xl font-bold">{t('attendance.subscriptionExpiring')}</p>
            <p className="text-xl">
              {daysRemaining} {t('attendance.daysRemaining')}
            </p>
          </div>
        )}

        {result.subscription?.planType === 'session' &&
          result.subscription.sessionsRemaining !== null && (
            <p className="text-xl font-semibold">
              {result.subscription.sessionsRemaining} {t('attendance.sessionsRemaining')}
            </p>
          )}
      </div>
    </div>
  );
}
