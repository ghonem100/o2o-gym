'use client';

import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailySummary } from '@/hooks/use-api';
import { formatCurrency } from '@/lib/utils';

const METHOD_META: Record<string, { label: string; icon: typeof Banknote }> = {
  cash: { label: 'subscriptions.cash', icon: Banknote },
  visa: { label: 'subscriptions.visa', icon: CreditCard },
  mastercard: { label: 'subscriptions.visa', icon: CreditCard },
  vodafone_cash: { label: 'subscriptions.vodafoneCash', icon: Smartphone },
  instapay: { label: 'subscriptions.instapay', icon: Smartphone },
};

export function DailyCashSummary() {
  const { t, i18n } = useTranslation();
  const { data } = useDailySummary();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t('dashboard.dailyCashSummary')}</CardTitle>
        <Wallet className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-primary/10 p-4 text-center">
          <p className="text-sm text-muted-foreground">{t('dashboard.todayRevenue')}</p>
          <p className="text-3xl font-bold text-primary">
            {formatCurrency(data?.totalRevenue ?? 0, i18n.language)}
            <span className="ms-1 text-base font-normal">{t('common.egp')}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data?.transactionCount ?? 0} {t('common.total')}
          </p>
        </div>

        <div className="space-y-2">
          {Object.entries(data?.byMethod ?? {}).map(([method, amount]) => {
            const meta = METHOD_META[method] ?? { label: method, icon: Wallet };
            const Icon = meta.icon;
            return (
              <div key={method} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t(meta.label)}</span>
                </div>
                <span className="font-semibold">
                  {formatCurrency(amount, i18n.language)} {t('common.egp')}
                </span>
              </div>
            );
          })}
          {Object.keys(data?.byMethod ?? {}).length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">{t('common.noData')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
