'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, ScanFace, Wallet, TrendingUp, UserPlus, AlertTriangle, Percent } from 'lucide-react';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { useDashboard, useRevenueReport, useAttendanceStats, useMembersStats } from '@/hooks/use-api';
import { AuthGuard } from '@/components/layout/auth-guard';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { PeakHoursHeatmap } from '@/components/dashboard/peak-hours-heatmap';
import { DailyCashSummary } from '@/components/dashboard/daily-cash-summary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  return (
    <AuthGuard allowedRoles={['owner']}>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { t, i18n } = useTranslation();

  const now = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));
  const monthRange = {
    from: format(sixMonthsAgo, 'yyyy-MM-dd'),
    to: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
  const last30 = {
    from: format(subMonths(now, 1), 'yyyy-MM-dd'),
    to: format(now, 'yyyy-MM-dd'),
  };

  const dashboard = useDashboard();
  const revenue = useRevenueReport(monthRange.from, monthRange.to);
  const attendance = useAttendanceStats(last30.from, last30.to);
  const membersStats = useMembersStats();

  const kpi = dashboard.data;

  // Aggregate daily revenue → monthly
  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    // seed last 6 months so empty months show as 0
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      map.set(format(m, 'yyyy-MM'), 0);
    }
    revenue.data?.dailyRevenue.forEach((d) => {
      const key = d.date.slice(0, 7);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + d.revenue);
    });
    return Array.from(map.entries()).map(([ym, rev]) => ({
      month: format(new Date(ym + '-01'), 'MMM', { locale: undefined }),
      revenue: rev,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revenue.data]);

  // Retention proxy: active / total members
  const retention =
    kpi && kpi.totalMembers > 0 ? (kpi.activeMembers / kpi.totalMembers) * 100 : 0;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{kpi ? format(now, 'EEEE, d MMMM yyyy') : ''}</p>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t('dashboard.activeMembers')}
          value={kpi?.activeMembers ?? 0}
          icon={Users}
          accent="primary"
        />
        <KpiCard
          title={t('dashboard.todayCheckIns')}
          value={kpi?.todayCheckIns ?? 0}
          icon={ScanFace}
          accent="success"
        />
        <KpiCard
          title={t('dashboard.todayRevenue')}
          value={formatCurrency(kpi?.todayRevenue ?? 0, i18n.language)}
          suffix={t('common.egp')}
          icon={Wallet}
          accent="primary"
        />
        <KpiCard
          title={t('dashboard.monthRevenue')}
          value={formatCurrency(kpi?.monthRevenue ?? 0, i18n.language)}
          suffix={t('common.egp')}
          icon={TrendingUp}
          trend={kpi?.revenueGrowth}
          accent="success"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t('dashboard.netProfit')}
          value={formatCurrency(kpi?.netProfit ?? 0, i18n.language)}
          suffix={t('common.egp')}
          icon={Wallet}
          accent={kpi && kpi.netProfit >= 0 ? 'success' : 'destructive'}
        />
        <KpiCard
          title={t('dashboard.retentionRate')}
          value={retention.toFixed(0)}
          suffix="%"
          icon={Percent}
          accent="primary"
        />
        <KpiCard
          title={t('dashboard.newMembersMonth')}
          value={kpi?.newMembersThisMonth ?? 0}
          icon={UserPlus}
          trend={membersStats.data?.growthRate}
          accent="success"
        />
        <KpiCard
          title={t('dashboard.expiringMembers')}
          value={kpi?.expiringCount ?? 0}
          icon={AlertTriangle}
          accent="warning"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueChart data={monthlyRevenue} />
        <DailyCashSummary />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PeakHoursHeatmap data={attendance.data?.byHour ?? []} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.peakHours')}</CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.data?.peakHour ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-5xl font-bold text-primary">
                  {attendance.data.peakHour.hour}:00
                </p>
                <p className="mt-2 text-muted-foreground">
                  {attendance.data.peakHour.count} {t('dashboard.todayCheckIns')}
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  {t('dashboard.checkInsByHour')} · {attendance.data.avgDailyCheckIns.toFixed(1)} / {t('common.date')}
                </p>
              </div>
            ) : (
              <p className="py-12 text-center text-muted-foreground">{t('common.noData')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
