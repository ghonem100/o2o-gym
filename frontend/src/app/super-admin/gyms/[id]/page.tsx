'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowRight, Loader2, Save, Wallet, Play, Pause, ExternalLink, Users as UsersIcon,
} from 'lucide-react';
import {
  useTenantGym, useUpdateTenantGym, useSetTenantStatus, useRecordTenantPayment,
} from '@/hooks/use-super-admin';
import { TenantStatusBadge } from '@/components/super-admin/gyms-table';
import { getApiErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function TenantGymDetailPage() {
  const { i18n } = useTranslation();
  const params = useParams();
  const id = String(params.id ?? '');
  const { data: gym, isLoading } = useTenantGym(id);
  const update = useUpdateTenantGym();
  const setStatus = useSetTenantStatus();
  const recordPayment = useRecordTenantPayment();

  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState({ amount: '', month: format(new Date(), 'yyyy-MM'), notes: '' });

  useEffect(() => {
    if (gym) {
      setFee(gym.monthlyFee ? String(Number(gym.monthlyFee)) : '');
      setNotes(gym.tenantNotes ?? '');
    }
  }, [gym]);

  if (isLoading || !gym) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const saveInfo = () => {
    update.mutate(
      { id, monthlyFee: fee ? Number(fee) : null, notes: notes || null },
      {
        onSuccess: () => toast.success('تم الحفظ'),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  const toggleStatus = () => {
    const action = gym.subscriptionStatus === 'suspended' ? 'activate' : 'suspend';
    setStatus.mutate(
      { id, action },
      {
        onSuccess: () => toast.success(action === 'suspend' ? 'تم إيقاف الجيم' : 'تم تفعيل الجيم'),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    recordPayment.mutate(
      { id, amount: Number(payment.amount), month: payment.month, notes: payment.notes || undefined },
      {
        onSuccess: () => {
          toast.success('تم تسجيل الدفعة وتمديد الاشتراك 30 يوم');
          setPayment((p) => ({ ...p, amount: '', notes: '' }));
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/super-admin">
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Link>
      </Button>

      {/* Header card */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h1 className="text-2xl font-bold">{gym.nameAr || gym.name}</h1>
            <a
              href={`/gym/${gym.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              dir="ltr"
            >
              /gym/{gym.slug}
              <ExternalLink className="h-3 w-3" />
            </a>
            <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="h-4 w-4" />
                {gym.membersCount} عضو
              </span>
              {gym.subscriptionEndsAt && (
                <span>ينتهي: {formatDate(gym.subscriptionEndsAt, i18n.language)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TenantStatusBadge status={gym.subscriptionStatus} />
            {gym.subscriptionStatus === 'suspended' ? (
              <Button className="gap-2" variant="success" disabled={setStatus.isPending} onClick={toggleStatus}>
                <Play className="h-4 w-4" />
                تفعيل
              </Button>
            ) : (
              <Button className="gap-2" variant="destructive" disabled={setStatus.isPending} onClick={toggleStatus}>
                <Pause className="h-4 w-4" />
                إيقاف
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Record payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              تسجيل دفعة شهرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المبلغ (ج.م) *</Label>
                  <Input
                    type="number" min="1" required
                    value={payment.amount}
                    onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الشهر *</Label>
                  <Input
                    type="month" dir="ltr" required
                    value={payment.month}
                    onChange={(e) => setPayment((p) => ({ ...p, month: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Input value={payment.notes} onChange={(e) => setPayment((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                تسجيل الدفعة (+30 يوم)
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Fee + notes */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات الاشتراك</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>الرسوم الشهرية (ج.م)</Label>
              <Input type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات خاصة (لا يراها الجيم)</Label>
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button onClick={saveInfo} disabled={update.isPending} className="gap-2">
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Staff */}
      <Card>
        <CardHeader><CardTitle>مستخدمو الجيم</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>اسم المستخدم</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>آخر دخول</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gym.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell dir="ltr">{u.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.role === 'owner' ? 'مالك' : 'موظف استقبال'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt, i18n.language) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments history */}
      <Card>
        <CardHeader><CardTitle>سجل الدفعات</CardTitle></CardHeader>
        <CardContent className="p-0">
          {gym.tenantPayments.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">لا توجد دفعات بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشهر</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ الدفع</TableHead>
                  <TableHead>ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gym.tenantPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell dir="ltr" className="text-start font-mono">{p.month}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(Number(p.amount), i18n.language)} ج.م
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(p.paidAt, i18n.language)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.notes ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
