'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Send, Loader2, MessageCircle, Smartphone, Save, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { AuthGuard } from '@/components/layout/auth-guard';
import { useNotifications, useSendReminders } from '@/hooks/use-notifications';
import { useGymInfo, useUpdateGym, useUpdateNotificationSettings, useAllPlans, useUpdatePlan, NotificationSettings } from '@/hooks/use-settings';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';

export default function SettingsPage() {
  return (
    <AuthGuard allowedRoles={['owner']}>
      <SettingsContent />
    </AuthGuard>
  );
}

function SettingsContent() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
      <Tabs defaultValue="plans">
        <TabsList className="flex-wrap">
          <TabsTrigger value="plans">{t('settingsExt.plansTab')}</TabsTrigger>
          <TabsTrigger value="gym">{t('settingsExt.gymTab')}</TabsTrigger>
          <TabsTrigger value="notif">{t('settingsExt.notificationsTab')}</TabsTrigger>
          <TabsTrigger value="history">{t('settingsExt.historyTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="plans"><PlansTab /></TabsContent>
        <TabsContent value="gym"><GymTab /></TabsContent>
        <TabsContent value="notif"><NotificationsTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Plans ──
function PlansTab() {
  const { t, i18n } = useTranslation();
  const { data: plans, isLoading } = useAllPlans();
  const updatePlan = useUpdatePlan();
  const [prices, setPrices] = useState<Record<string, string>>({});

  const savePrice = (id: string) => {
    const price = Number(prices[id]);
    if (!price || price <= 0) return;
    updatePlan.mutate({ id, price }, {
      onSuccess: () => toast.success(t('settingsExt.priceUpdated')),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  const toggleActive = (id: string, isActive: boolean) => {
    updatePlan.mutate({ id, isActive }, {
      onSuccess: () => toast.success(t('settingsExt.planToggled')),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />{t('settingsExt.plansTab')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settingsExt.planName')}</TableHead>
                <TableHead>{t('settingsExt.planType')}</TableHead>
                <TableHead>{t('settingsExt.price')}</TableHead>
                <TableHead>{t('settingsExt.active')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{i18n.language === 'ar' ? p.nameAr || p.name : p.name}</TableCell>
                  <TableCell><Badge variant="outline">{t(`subscriptions.plans.${p.planType}`)}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-28"
                        defaultValue={Number(p.price)}
                        onChange={(e) => setPrices((s) => ({ ...s, [p.id]: e.target.value }))}
                      />
                      <Button size="sm" variant="outline" disabled={updatePlan.isPending || !prices[p.id]} onClick={() => savePrice(p.id)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={p.isActive} onCheckedChange={(c) => toggleActive(p.id, c)} />
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

// ── Gym Info ──
function GymTab() {
  const { t } = useTranslation();
  const { data: gym } = useGymInfo();
  const update = useUpdateGym();
  const [form, setForm] = useState({ name: '', phone: '', whatsappNumber: '' });

  useEffect(() => {
    if (gym) setForm({ name: gym.name, phone: gym.phone ?? '', whatsappNumber: gym.whatsappNumber ?? '' });
  }, [gym]);

  const save = () => {
    update.mutate(form, {
      onSuccess: () => toast.success(t('settingsExt.gymSaved')),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{t('settingsExt.gymTab')}</CardTitle></CardHeader>
      <CardContent className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label>{t('settingsExt.gymName')}</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('settingsExt.gymPhone')}</Label>
          <Input dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('settingsExt.whatsappNumber')}</Label>
          <Input dir="ltr" value={form.whatsappNumber} onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))} />
        </div>
        <Button onClick={save} disabled={update.isPending} className="gap-2">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('settingsExt.saveGym')}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Notification Settings ──
function NotificationsTab() {
  const { t } = useTranslation();
  const { data: gym } = useGymInfo();
  const update = useUpdateNotificationSettings();
  const [settings, setSettings] = useState<NotificationSettings>({
    whatsappEnabled: true, smsEnabled: false, daysBeforeExpiry: 3, messageTemplate: '',
  });

  useEffect(() => {
    if (gym?.notificationSettings) setSettings(gym.notificationSettings);
  }, [gym]);

  const save = () => {
    update.mutate(settings, {
      onSuccess: () => toast.success(t('settingsExt.notificationsSaved')),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />{t('settingsExt.notificationsTab')}</CardTitle></CardHeader>
      <CardContent className="max-w-2xl space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /><Label>{t('settingsExt.whatsappEnabled')}</Label></div>
          <Switch checked={settings.whatsappEnabled} onCheckedChange={(c) => setSettings((s) => ({ ...s, whatsappEnabled: c }))} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /><Label>{t('settingsExt.smsEnabled')}</Label></div>
          <Switch checked={settings.smsEnabled} onCheckedChange={(c) => setSettings((s) => ({ ...s, smsEnabled: c }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('settingsExt.daysBeforeExpiry')}</Label>
          <Input type="number" min={1} max={30} className="w-32" value={settings.daysBeforeExpiry}
            onChange={(e) => setSettings((s) => ({ ...s, daysBeforeExpiry: Number(e.target.value) }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('settingsExt.messageTemplate')}</Label>
          <Textarea rows={4} value={settings.messageTemplate} onChange={(e) => setSettings((s) => ({ ...s, messageTemplate: e.target.value }))} />
          <p className="text-xs text-muted-foreground">{t('settingsExt.templateHint')}</p>
        </div>
        <Button onClick={save} disabled={update.isPending} className="gap-2">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('settingsExt.saveNotifications')}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Notification History ──
function HistoryTab() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page);
  const sendReminders = useSendReminders();
  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  const handleSend = () => {
    sendReminders.mutate(undefined, {
      onSuccess: (summary) => toast.success(t('notifications.remindersSent', { count: summary.sent })),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />{t('settings.notificationHistory')}</CardTitle>
        <Button onClick={handleSend} disabled={sendReminders.isPending} className="gap-2">
          {sendReminders.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t('notifications.sendReminders')}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{t('common.noData')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('notifications.member')}</TableHead>
                <TableHead>{t('notifications.channel')}</TableHead>
                <TableHead>{t('notifications.message')}</TableHead>
                <TableHead>{t('notifications.status')}</TableHead>
                <TableHead>{t('notifications.sentAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <p className="font-medium">{log.member.fullName}</p>
                    <p className="text-xs text-muted-foreground">#{log.member.memberNumber}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {log.channel === 'whatsapp' ? <MessageCircle className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                      {t(`notifications.${log.channel === 'whatsapp' ? 'whatsapp' : 'sms'}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md"><p className="truncate text-sm text-muted-foreground" title={log.message}>{log.message}</p></TableCell>
                  <TableCell><Badge variant={log.status === 'sent' ? 'success' : 'destructive'}>{t(`notifications.${log.status === 'sent' ? 'sent' : 'failed'}`)}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(log.sentAt, i18n.language)} · {formatTime(log.sentAt, i18n.language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('common.back')}</Button>
            <span className="text-sm text-muted-foreground">{page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>{t('common.add')}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
