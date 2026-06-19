'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Loader2,
  ScanFace,
  AlertTriangle,
  Phone,
  CalendarClock,
  CreditCard,
} from 'lucide-react';
import { useMemberProfile } from '@/hooks/use-api';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FaceEnrollment } from '@/components/members/face-enrollment';
import { MemberBarcodeCard } from '@/components/members/member-barcode-card';
import { formatDate, formatCurrency } from '@/lib/utils';

interface ProfileData {
  id: string;
  fullName: string;
  memberNumber: string;
  phone: string;
  barcode: string | null;
  photoUrl: string | null;
  status: string;
  createdAt: string;
  hasFace?: boolean;
  daysRemaining: number | null;
  subscriptionAlert: string | null;
  activeSubscription: {
    plan: { name: string };
    endDate: string | null;
    pricePaid: string;
  } | null;
  subscriptions: {
    id: string;
    plan: { name: string };
    startDate: string;
    endDate: string | null;
    pricePaid: string;
    status: string;
  }[];
  attendanceLogs: {
    id: string;
    checkInDate: string;
    checkInMethod: string;
  }[];
}

export default function MemberProfilePage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const isOwner = useAuthStore((s) => s.isOwner());
  const gymName = useAuthStore((s) => s.user?.gymName);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const { data, isLoading, refetch } = useMemberProfile(id);
  const member = data as unknown as ProfileData | undefined;

  if (isLoading || !member) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/members">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('members.title')}
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <Avatar className="h-28 w-28 border-4 border-primary/10">
              {member.photoUrl && <AvatarImage src={member.photoUrl} />}
              <AvatarFallback className="text-3xl">{member.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{member.fullName}</h2>
              <p className="text-sm text-muted-foreground">#{member.memberNumber}</p>
            </div>

            <div className="flex items-center gap-2 text-sm" dir="ltr">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {member.phone}
            </div>

            {member.hasFace ? (
              <Badge variant="success" className="gap-1">
                <ScanFace className="h-3 w-3" />
                {t('enrollment.enrolled')}
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('enrollment.notEnrolled')}
              </Badge>
            )}

            {isOwner && (
              <Button variant="outline" className="w-full gap-2" onClick={() => setEnrollOpen(true)}>
                <ScanFace className="h-4 w-4" />
                {member.hasFace ? t('enrollment.reEnroll') : t('enrollment.captureFace')}
              </Button>
            )}

            {member.barcode && (
              <MemberBarcodeCard
                barcode={member.barcode}
                fullName={member.fullName}
                memberNumber={member.memberNumber}
                photoUrl={member.photoUrl}
                gymName={gymName}
              />
            )}

            <p className="text-xs text-muted-foreground">
              {t('members.memberSince')} {formatDate(member.createdAt, i18n.language)}
            </p>
          </CardContent>
        </Card>

        {/* Subscription + activity */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                {t('subscriptions.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {member.activeSubscription ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-accent/40 p-4">
                  <div>
                    <Badge>{member.activeSubscription.plan.name}</Badge>
                    {member.activeSubscription.endDate && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t('subscriptions.endDate')}:{' '}
                        {formatDate(member.activeSubscription.endDate, i18n.language)}
                      </p>
                    )}
                  </div>
                  {member.daysRemaining !== null && (
                    <Badge
                      variant={
                        member.subscriptionAlert === 'expired'
                          ? 'destructive'
                          : member.subscriptionAlert === 'expiring_soon'
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {member.daysRemaining} {t('attendance.daysRemaining')}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="py-4 text-center text-muted-foreground">
                  {t('attendance.noSubscription')}
                </p>
              )}

              {member.subscriptions.length > 0 && (
                <div className="mt-4 space-y-2">
                  {member.subscriptions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between border-b py-2 text-sm last:border-0"
                    >
                      <span>{s.plan.name}</span>
                      <span className="text-muted-foreground">
                        {formatDate(s.startDate, i18n.language)}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <CreditCard className="h-3 w-3" />
                        {formatCurrency(Number(s.pricePaid), i18n.language)} {t('common.egp')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('nav.attendance')}</CardTitle>
            </CardHeader>
            <CardContent>
              {member.attendanceLogs.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">{t('common.noData')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {member.attendanceLogs.slice(0, 15).map((log) => (
                    <Badge key={log.id} variant="outline" className="gap-1">
                      {formatDate(log.checkInDate, i18n.language)}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Re-enroll dialog (Owner) */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <Dial