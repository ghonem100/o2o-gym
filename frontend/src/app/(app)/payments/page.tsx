'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, FileSpreadsheet, RotateCcw, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { AuthGuard } from '@/components/layout/auth-guard';
import { usePayments, useStaff, useRefundPayment, PaymentRow, PaymentFilters } from '@/hooks/use-finance';
import { useAuthStore } from '@/lib/store';
import { getApiErrorMessage } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';

const METHODS = ['cash', 'visa', 'mastercard', 'vodafone_cash', 'instapay', 'bank_transfer', 'other'];
const METHOD_LABEL: Record<string, string> = {
  cash: 'subscriptions.cash', visa: 'subscriptions.visa', mastercard: 'subscriptions.visa',
  vodafone_cash: 'subscriptions.vodafoneCash', instapay: 'subscriptions.instapay',
};

export default function PaymentsPage() {
  return (
    <AuthGuard allowedRoles={['owner', 'receptionist']}>
      <PaymentsContent />
    </AuthGuard>
  );
}

function PaymentsContent() {
  const { t, i18n } = useTranslation();
  const isOwner = useAuthStore((s) => s.isOwner());
  const [filters, setFilters] = useState<PaymentFilters>({ page: 1 });
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const { data, isLoading } = usePayments(filters);
  const { data: staff } = useStaff();
  const refund = useRefundPayment();

  const payments = data?.data.payments ?? [];
  const summary = data?.data.summary;
  const pagination = data?.pagination;

  const setFilter = (key: keyof PaymentFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));

  const methodLabel = (m: string) => (METHOD_LABEL[m] ? t(METHOD_LABEL[m]) : m);

  const handleRefund = () => {
    if (!refundTarget) return;
    refund.mutate(
      { id: refundTarget.id, refundReason },
      {
        onSuccess: () => {
          toast.success(t('payments.refundSuccess'));
          setRefundTarget(null);
          setRefundReason('');
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  const exportExcel = () => {
    const rows = payments.map((p) => ({
      [t('payments.member')]: p.member.fullName,
      [t('payments.reference')]: p.referenceNumber,
      [t('payments.amount')]: Number(p.amount),
      [t('payments.method')]: methodLabel(p.paymentMethod),
      [t('payments.subscriptionType')]: p.subscription?.plan.name ?? '—',
      [t('payments.collectedBy')]: p.collector.fullName,
      [t('payments.date')]: formatDate(p.paymentDate, 'en'),
      [t('payments.refunded')]: p.isRefunded ? '✓' : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `o2o-payments-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('payments.title')}</h1>
        {isOwner && (
          <Button variant="outline" onClick={exportExcel} disabled={payments.length === 0} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {t('payments.exportExcel')}
          </Button>
        )}
      </div>

      {/* Total */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('payments.dailyTotal')}</p>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(summary?.totalAmount ?? 0, i18n.language)}{' '}
              <span className="text-base font-normal">{t('common.egp')}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {summary?.transactionCount ?? 0} {t('payments.transactions')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label className="text-xs">{t('payments.dateFrom')}</Label>
            <Input type="date" className="w-40" value={filters.dateFrom ?? ''} onChange={(e) => setFilter('dateFrom', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('payments.dateTo')}</Label>
            <Input type="date" className="w-40" value={filters.dateTo ?? ''} onChange={(e) => setFilter('dateTo', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('payments.filterByMethod')}</Label>
            <Select value={filters.method ?? 'all'} onValueChange={(v) => setFilter('method', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder={t('payments.allMethods')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('payments.allMethods')}</SelectItem>
                {METHODS.map((m) => <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('payments.filterByStaff')}</Label>
            <Select value={filters.collectedBy ?? 'all'} onValueChange={(v) => setFilter('collectedBy', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder={t('payments.allStaff')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('payments.allStaff')}</SelectItem>
                {staff?.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setFilters({ page: 1 })}>
            <X className="h-4 w-4" />
            {t('payments.clearFilters')}
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : payments.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t('common.noData')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('payments.member')}</TableHead>
                  <TableHead>{t('payments.amount')}</TableHead>
                  <TableHead>{t('payments.method')}</TableHead>
                  <TableHead>{t('payments.subscriptionType')}</TableHead>
                  <TableHead>{t('payments.collectedBy')}</TableHead>
                  <TableHead>{t('payments.date')}</TableHead>
                  {isOwner && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} className={p.isRefunded ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">
                      {p.member.fullName}
                      <span className="block text-xs text-muted-foreground">#{p.member.memberNumber}</span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(Number(p.amount), i18n.language)} {t('common.egp')}
                      {p.isRefunded && <Badge variant="destructive" className="ms-2">{t('payments.refunded')}</Badge>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{methodLabel(p.paymentMethod)}</Badge></TableCell>
                    <TableCell>{p.subscription?.plan.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.collector.fullName}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(p.paymentDate, i18n.language)}</TableCell>
                    {isOwner && (
                      <TableCell>
                        {!p.isRefunded && (
                          <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => setRefundTarget(p)}>
                            <RotateCcw className="h-4 w-4" />
                            {t('payments.refund')}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>{t('common.back')}</Button>
          <span className="text-sm text-muted-foreground">{filters.page ?? 1} / {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={(filters.page ?? 1) >= pagination.totalPages} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>{t('common.add')}</Button>
        </div>
      )}

      {/* Refund dialog */}
      <Dialog open={!!refundTarget} onOpenChange={(o) => !o && setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('payments.refundTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {refundTarget && (
              <p className="text-sm text-muted-foreground">
                {refundTarget.member.fullName} — {formatCurrency(Number(refundTarget.amount), i18n.language)} {t('common.egp')}
              </p>
            )}
            <div className="space-y-2">
              <Label>{t('payments.refundReason')}</Label>
              <Textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder={t('payments.refundReasonPlaceholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" disabled={refundReason.length < 5 || refund.isPending} onClick={handleRefund}>
              {refund.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('payments.confirmRefund')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
