'use client';

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number | null;
  suffix?: string;
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
}

export function KpiCard({ title, value, icon: Icon, trend, suffix, accent = 'primary' }: Props) {
  const accentMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">
            {value}
            {suffix && <span className="ms-1 text-base font-normal text-muted-foreground">{suffix}</span>}
          </p>
          {trend !== undefined && trend !== null && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend >= 0 ? 'text-success' : 'text-destructive'
              )}
            >
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', accentMap[accent])}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}
