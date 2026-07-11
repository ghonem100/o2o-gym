'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Search, UserCheck, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useMembers, usePlans, useCreateSubscription } from '@/hooks/use-api';
import { getApiErrorMessage } from '@/lib/api';
import { Member, SubscriptionPlan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, cn } from '@/lib/utils';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'subscriptions.cash' },
  { value: 'visa', label: 'subscriptions.visa' },
  { value: 'vodafone_cash', label: 'subscriptions.vodafoneCash' },
  { value: 'instapay', label: 'subscriptions.instapay' },
];

export default function NewSubscriptionPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const { data: membersData } = useMembers({ search, status: 'active' });
  const { data: plans } = usePlans();
  const createSub = useCreateSubscription();

  const members = (membersData?.data ?? []) as Member[];
  const selectedPlan = useMemo(
    () => plans?.find((p) => p.id === planId),
    [plans, planId]
  );

  const handleSubmit = () => {
    if (!selectedMember || !planId) {
      toast.error(t('common.error'));
      return;
    }
    createSub.mutate(
      {
        memberId: selectedMember.id,
        planId,
        startDate,
        paymentMethod,
      },
      {
        onSuccess: () => {
          toast.success(t('subscriptions.createSuccess'));
          setSelectedMember(null);
          setPlanId('');
          setSearch('');
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <h1 className="text-2xl font-bold">{t('subscriptions.newSubscription')}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1: Member */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">1</span>
              {t('subscriptions.selectMember')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedMember ? (
              <div className="flex items-center gap-3 rounded-lg border bg-accent/40 p-4">
                <Avatar>
                  {selectedMember.photoUrl && <AvatarImage src={selectedMember.photoUrl} />}
                  <AvatarFallback>{selectedMember.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{selectedMember.fullName}</p>
                  <p className="text-sm text-muted-foreground">#{selectedMember.memberNumber}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                  {t('common.edit')}
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('members.searchPlaceholder')}
                    className="ps-9"
                  />
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-start hover:bg-accent"
                    >
                      <Avatar className="h-8 w-8">
                        {m.photoUrl && <AvatarImage src={m.photoUrl} />}
                        <AvatarFallback>{m.fullName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">#{m.memberNumber}</p>
                      </div>
                      <UserCheck className="h-4 w-4 text-primary" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Plan + Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">2</span>
              {t('subscriptions.selectPlan')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {plans?.map((plan: SubscriptionPlan) => (
                <button
                  key={plan.id}
                  onClick={() => setPlanId(plan.id)}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3 text-start transition-colors',
                    planId === plan.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  )}
                >
                  <div>
                    <p className="font-medium">{i18n.language === 'ar' ? plan.nameAr || plan.name : plan.name}</p>
                    <Badge variant="outline" className="mt-1">
                      {t(`subscriptions.plans.${plan.planType}`)}
                    </Badge>
                  </div>
                  <p className="font-bold text-primary">
                    {formatCurrency(Number(plan.price), i18n.language)} {t('common.egp')}
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">{t('subscriptions.startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('subscriptions.paymentMethod')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      {t(pm.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary + submit */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-sm text-muted-foreground">{t('subscriptions.price')}</p>
            <p className="text-3xl font-bold text-primary">
              {selectedPlan ? formatCurrency(Number(selectedPlan.price), i18n.language) : '—'}{' '}
              <span className="text-base font-normal">{t('common.egp')}</span>
            </p>
          </div>
          <Button
            size="xl"
            className="gap-2"
            disabled={!selectedMember || !planId || createSub.isPending}
            onClick={handleSubmit}
          >
            {createSub.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            {t('subscriptions.newSubscription')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
