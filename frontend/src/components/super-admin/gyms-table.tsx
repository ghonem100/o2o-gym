'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Eye, Play, Pause, ExternalLink } from 'lucide-react';
import { useTenantGyms, useSetTenantStatus, TenantStatus } from '@/hooks/use-super-admin';
import { getApiErrorMessage } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatCurrency } from '@/lib/utils';

export const STATUS_META: Record<TenantStatus, { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }> = {
  trial: { label: 'تجريبي', variant: 'warning' },
  active: { label: 'نشط', variant: 'success' },
  suspended: { label: 'موقوف', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'secondary' },
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function GymsTable() {
  const { i18n } = useTranslation();
  const { data: gyms, isLoading } = useTenantGyms();
  const setStatus = useSetTenantStatus();

  const toggle = (id: string, current: TenantStatus) => {
    const action = current === 'suspended' ? 'activate' : 'suspend';
    setStatus.mutate(
      { id, action },
      {
        onSuccess: () => toast.success(action === 'suspend' ? 'تم إيقاف الجيم' : 'تم تفعيل الجيم'),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !gyms || gyms.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">لا توجد جيمات بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الجيم</TableHead>
                <TableHead>الرابط</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الأعضاء</TableHead>
                <TableHead>نهاية الاشتراك</TableHead>
                <TableHead>الرسوم الشهرية</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gyms.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    {g.nameAr || g.name}
                    {g.city && <span className="block text-xs text-muted-foreground">{g.city}</span>}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/gym/${g.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      dir="ltr"
                    >
                      /gym/{g.slug}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell><TenantStatusBadge status={g.subscriptionStatus} /></TableCell>
                  <TableCell>{g.membersCount}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {g.subscriptionEndsAt ? formatDate(g.subscriptionEndsAt, i18n.language) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {g.monthlyFee ? `${formatCurrency(Number(g.monthlyFee), i18n.language)} ج.م` : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" asChild title="التفاصيل">
                        <Link href={`/super-admin/gyms/${g.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {g.subscriptionStatus === 'suspended' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-success"
                          disabled={setStatus.isPending}
                          onClick={() => toggle(g.id, g.subscriptionStatus)}
                        >
                          <Play className="h-4 w-4" />
                          تفعيل
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive"
                          disabled={setStatus.isPending}
                          onClick={() => toggle(g.id, g.subscriptionStatus)}
                        >
                          <Pause className="h-4 w-4" />
                          إيقاف
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
