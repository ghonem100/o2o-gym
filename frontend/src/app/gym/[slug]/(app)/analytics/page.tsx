'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { TrendingUp, Percent, Users, Wallet } from 'lucide-react';
import { AuthGuard } from '@/components/layout/auth-guard';
import { useRevenueReport, useAttendanceStats, useMembersStats } from '@/hooks/use-api';
import {
  useNewMembers, useRetentionTrend, useInactiveMembers,
  useRevenueBreakdown, useAttendancePatterns, useProfitability,
} from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PeakHoursHeatmap } from '@/components/dashboard/peak-hours-heatmap';
import { formatCurrency, formatDate } from '@/lib/utils';

const CHART_COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899'];

export default function AnalyticsPage() {
  return (
    <AuthGuard allowedRoles={['owner']}>
      <AnalyticsContent />
    </AuthGuard>
  );
}

function AnalyticsContent() {
  const { t } = useTranslation();
  const now = new Date();
  const year = { from: format(startOfMonth(subMonths(now, 11)), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
  const last30 = { from: format(subDays(now, 30), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>
      <Tabs defaultValue="revenue">
        <TabsList className="flex-wrap">
          <TabsTrigger value="revenue">{t('analytics.tabRevenue')}</TabsTrigger>
          <TabsTrigger value="members">{t('analytics.tabMembers')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('analytics.tabAttendance')}</TabsTrigger>
          <TabsTrigger value="profit">{t('analytics.tabProfitability')}</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue"><RevenueTab range={year} /></TabsContent>
        <TabsContent value="members"><MembersTab range={year} /></TabsContent>
        <TabsContent value="attendance"><AttendanceTab range={last30} /></TabsContent>
        <TabsContent value="profit"><ProfitTab range={year} /></TabsContent>
      </Tabs>
    </div>
  );
}

const tooltipStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--popover-foreground))',
};

// ── TAB 1: Revenue ──
function RevenueTab({ range }: { range: { from: string; to: string } }) {
  const { t, i18n } = useTranslation();
  const revenue = useRevenueReport(range.from, range.to);
  const breakdown = useRevenueBreakdown(range.from, range.to);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 11; i >= 0; i--) map.set(format(subMonths(new Date(), i), 'yyyy-MM'), 0);
    revenue.data?.dailyRevenue.forEach((d) => {
      const key = d.date.slice(0, 7);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + d.revenue);
    });
    return Array.from(map.entries()).map(([ym, rev]) => ({ month: format(new Date(ym + '-01'), 'MMM yy'), revenue: rev }));
  }, [revenue.data]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t('analytics.monthlyRevenue')}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="rev12" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={60} tickFormatter={(v) => formatCurrency(v, i18n.language)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${formatCurrency(v, i18n.language)} ${t('common.egp')}`} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#rev12)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownTable title={t('analytics.byType')} rows={(breakdown.data?.byPlanType ?? []).map((r) => ({ label: t(`subscriptions.plans.${r.type}`, r.type), amount: r.amount }))} />
        <BreakdownTable title={t('analytics.byMethod')} rows={(breakdown.data?.byMethod ?? []).map((r) => ({ label: r.method, amount: r.amount }))} />
      </div>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: { label: string; amount: number }[] }) {
  const { t, i18n } = useTranslation();
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell className="text-center text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className="font-medium">{r.label}</TableCell>
                <TableCell className="text-end">{formatCurrency(r.amount, i18n.language)} {t('common.egp')}</TableCell>
                <TableCell className="text-end text-muted-foreground">{total > 0 ? ((r.amount / total) * 100).toFixed(0) : 0}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── TAB 2: Members ──
function MembersTab({ range }: { range: { from: string; to: string } }) {
  const { t, i18n } = useTranslation();
  const newMembers = useNewMembers(12);
  const retention = useRetentionTrend(6);
  const stats = useMembersStats();
  const inactive = useInactiveMembers(30);

  const newData = (newMembers.data ?? []).map((d) => ({ month: format(new Date(d.month + '-01'), 'MMM'), count: d.count }));
  const retData = (retention.data ?? []).map((d) => ({ month: format(new Date(d.month + '-01'), 'MMM'), retention: Math.round(d.retention) }));
  const pieData = stats.data?.byPlan ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('analytics.newMembersPerMonth')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={newData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('analytics.retentionTrend')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={retData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="retention" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('analytics.typeDistribution')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="plan" cx="50%" cy="50%" outerRadius={90} label>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('analytics.inactiveMembers')}</CardTitle></CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('members.fullName')}</TableHead>
                  <TableHead>{t('analytics.lastVisit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(inactive.data ?? []).length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
                {(inactive.data ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.fullName}<span className="block text-xs text-muted-foreground">#{m.memberNumber}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.lastVisit ? formatDate(m.lastVisit, i18n.language) : <Badge variant="warning">{t('analytics.neverVisited')}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── TAB 3: Attendance ──
function AttendanceTab({ range }: { range: { from: string; to: string } }) {
  const { t } = useTranslation();
  const stats = useAttendanceStats(range.from, range.to);
  const patterns = useAttendancePatterns(range.from, range.to);
  const weekdays = t('analytics.weekdays', { returnObjects: true }) as string[];

  const peakDays = (patterns.data?.byWeekday ?? []).map((d) => ({ day: weekdays[d.day] ?? String(d.day), count: d.count }));
  const dailySeries = (patterns.data?.dailySeries ?? []).map((d) => ({ date: d.date.slice(5), count: d.count }));

  return (
    <div className="space-y-6">
      <PeakHoursHeatmap data={stats.data?.byHour ?? []} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('analytics.peakDays')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={peakDays}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('analytics.dailyAverage')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {t('analytics.dailyAverage')}: <span className="font-semibold text-foreground">{(patterns.data?.avgDaily ?? 0).toFixed(1)}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── TAB 4: Profitability ──
function ProfitTab({ range }: { range: { from: string; to: string } }) {
  const { t, i18n } = useTranslation();
  const revenue = useRevenueReport(range.from, range.to);
  const profit = useProfitability(range.from, range.to);

  // Monthly revenue vs expenses — revenue from report, expenses approximated evenly is not ideal,
  // so we show period totals as a comparison bar plus per-month revenue line.
  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 11; i >= 0; i--) map.set(format(subMonths(new Date(), i), 'yyyy-MM'), 0);
    revenue.data?.dailyRevenue.forEach((d) => {
      const key = d.date.slice(0, 7);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + d.revenue);
    });
    return Array.from(map.entries()).map(([ym, rev]) => ({ month: format(new Date(ym + '-01'), 'MMM'), revenue: rev }));
  }, [revenue.data]);

  const comparison = [
    { name: t('analytics.revenue'), value: profit.data?.totalRevenue ?? 0 },
    { name: t('analytics.expenses'), value: profit.data?.totalExpenses ?? 0 },
    { name: t('analytics.netProfit'), value: profit.data?.netProfit ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={t('analytics.revenue')} value={formatCurrency(profit.data?.totalRevenue ?? 0, i18n.language)} suffix={t('common.egp')} icon={Wallet} accent="success" />
        <KpiCard title={t('analytics.netProfit')} value={formatCurrency(profit.data?.netProfit ?? 0, i18n.language)} suffix={t('common.egp')} icon={TrendingUp} accent={profit.data && profit.data.netProfit >= 0 ? 'success' : 'destructive'} />
        <KpiCard title={t('analytics.arpm')} value={formatCurrency(profit.data?.arpm ?? 0, i18n.language)} suffix={t('common.egp')} icon={Users} accent="primary" />
        <KpiCard title={t('analytics.profitMargin')} value={(profit.data?.profitMargin ?? 0).toFixed(1)} suffix="%" icon={Percent} accent="primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('analytics.revenueVsExpenses')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={60} tickFormatter={(v) => formatCurrency(v, i18n.language)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${formatCurrency(v, i18n.language)} ${t('common.egp')}`} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {comparison.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('analytics.netProfitTrend')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={60} tickFormatter={(v) => formatCurrency(v, i18n.language)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${formatCurrency(v, i18n.language)} ${t('common.egp')}`} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
