'use client';

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  data: { hour: number; count: number }[];
}

// Gym operating hours window
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 → 23:00

export function PeakHoursHeatmap({ data }: Props) {
  const { t } = useTranslation();

  const countByHour = new Map(data.map((d) => [d.hour, d.count]));
  const max = Math.max(1, ...data.map((d) => d.count));

  const intensity = (count: number): string => {
    if (count === 0) return 'bg-muted';
    const ratio = count / max;
    if (ratio > 0.75) return 'bg-primary';
    if (ratio > 0.5) return 'bg-primary/70';
    if (ratio > 0.25) return 'bg-primary/45';
    return 'bg-primary/25';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.peakHours')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-2">
          {HOURS.map((hour) => {
            const count = countByHour.get(hour) ?? 0;
            return (
              <div key={hour} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-12 w-full items-center justify-center rounded-md text-xs font-semibold transition-colors',
                    intensity(count),
                    count / max > 0.5 ? 'text-primary-foreground' : 'text-foreground'
                  )}
                  title={`${hour}:00 — ${count}`}
                >
                  {count > 0 ? count : ''}
                </div>
                <span className="text-[10px] text-muted-foreground">{hour}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>{t('common.noData')}</span>
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded bg-muted" />
            <div className="h-3 w-3 rounded bg-primary/25" />
            <div className="h-3 w-3 rounded bg-primary/45" />
            <div className="h-3 w-3 rounded bg-primary/70" />
            <div className="h-3 w-3 rounded bg-primary" />
          </div>
          <span>{t('dashboard.peakHours')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
