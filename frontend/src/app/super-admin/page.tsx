'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Building2, CheckCircle2, Clock, PauseCircle, Wallet, AlertTriangle, Plus } from 'lucide-react';
import { usePlatformStats } from '@/hooks/use-super-admin';
import { GymsTable, TenantStatusBadge } from '@/components/super-admin/gyms-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SuperAdminDashboard() {
  const { i18n } = useTranslation();
  const { data: stats } = usePlatformStats();

  const kpis = [
    { label: 'إجمالي الجيمات', value: stats?.totalGyms ?? 0, icon: Building2, cls: 'bg-primary/10 text-primary' },
    { label: 'نشط', value: stats?.activeGyms ?? 0, icon: CheckCircle2, cls: 'bg-success/10 text-success' },
    { label: 'تجريبي', value: stats?.trialGyms ?? 0, icon: Clock, cls: 'bg-warning/10 text-warning' },
    { label: 'موقوف', value: stats?.suspendedGyms ?? 0, icon: PauseCircle, cls: 'bg-destructive/10 text-destructive' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <Button asChild className="gap-2">
          <Link href="/super-admin/gyms/new">
            <Plus className="h-4 w-4" />
            جيم جديد
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold">{k.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${k.cls}`}>
                <k.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">إيراد الشهر</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(stats?.totalRevenueThisMonth ?? 0, i18n.language)}
                <span className="ms-1 text-sm font-normal text-muted-foreground">ج.م</span>
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring soon */}
      {stats && stats.gymsExpiringSoon.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              اشتراكات تنتهي خلال 7 أيام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.gymsExpiringSoon.map((g) => (
              <Link
                key={g.id}
                href={`/super-admin/gyms/${g.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <span className="font-medium">{g.name}</span>
                <div className="flex items-center gap-3">
                  <TenantStatusBadge status={g.subscriptionStatus} />
                  <span className="text-sm text-muted-foreground">
                    {g.subscriptionEndsAt ? formatDate(g.subscriptionEndsAt, i18n.language) : ''}
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All gyms */}
      <div>
        <h2 className="mb-3 text-lg font-bold">كل الجيمات</h2>
        <GymsTable />
      </div>
    </div>
  );
}
