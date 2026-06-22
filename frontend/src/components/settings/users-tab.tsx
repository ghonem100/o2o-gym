'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserPlus, Pencil, KeyRound, ToggleLeft, ToggleRight, Loader2, ShieldCheck, User2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

import {
  useStaffUsers, useCreateStaffUser, useUpdateStaffUser,
  useToggleUserActive, useResetUserPassword, StaffUser,
} from '@/hooks/use-settings';
import { useAuthStore } from '@/lib/store';
import { getApiErrorMessage } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

type ModalMode = 'create' | 'edit' | 'reset-password' | null;

export function UsersTab() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const locale = isAr ? ar : enUS;
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: users = [], isLoading } = useStaffUsers();
  const createUser   = useCreateStaffUser();
  const updateUser   = useUpdateStaffUser();
  const toggleActive = useToggleUserActive();
  const resetPwd     = useResetUserPassword();

  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<StaffUser | null>(null);

  // Form state
  const [form, setForm] = useState({
    username: '', password: '', fullName: '', fullNameAr: '',
    role: 'receptionist' as 'owner' | 'receptionist', phone: '',
  });
  const [newPassword, setNewPassword] = useState('');

  const openCreate = () => {
    setForm({ username: '', password: '', fullName: '', fullNameAr: '', role: 'receptionist', phone: '' });
    setMode('create');
  };

  const openEdit = (u: StaffUser) => {
    setSelected(u);
    setForm({ username: u.username, password: '', fullName: u.fullName, fullNameAr: u.fullNameAr ?? '', role: u.role, phone: u.phone ?? '' });
    setMode('edit');
  };

  const openResetPwd = (u: StaffUser) => {
    setSelected(u);
    setNewPassword('');
    setMode('reset-password');
  };

  const handleSave = async () => {
    try {
      if (mode === 'create') {
        await createUser.mutateAsync({
          username: form.username, password: form.password,
          fullName: form.fullName, fullNameAr: form.fullNameAr || undefined,
          role: form.role, phone: form.phone || undefined,
        });
        toast.success('تم إضافة المستخدم');
      } else if (mode === 'edit' && selected) {
        await updateUser.mutateAsync({
          id: selected.id,
          fullName: form.fullName, fullNameAr: form.fullNameAr || undefined,
          role: form.role, phone: form.phone || undefined,
        });
        toast.success('تم تحديث المستخدم');
      }
      setMode(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleResetPwd = async () => {
    if (!selected || newPassword.length < 6) return;
    try {
      await resetPwd.mutateAsync({ id: selected.id, newPassword });
      toast.success('تم تغيير كلمة المرور');
      setMode(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleToggle = async (u: StaffUser) => {
    try {
      await toggleActive.mutateAsync(u.id);
      toast.success(u.isActive ? 'تم إيقاف تفعيل المستخدم' : 'تم تفعيل المستخدم');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">إدارة المستخدمين</h3>
            <p className="text-sm text-muted-foreground">{users.length} مستخدم مسجل</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <UserPlus className="h-4 w-4" />
            إضافة مستخدم
          </Button>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">اسم المستخدم</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
                <TableHead className="text-right">آخر دخول</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {u.role === 'owner' ? <ShieldCheck className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{isAr && u.fullNameAr ? u.fullNameAr : u.fullName}</p>
                        {u.id === currentUserId && (
                          <span className="text-xs text-muted-foreground">(أنت)</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{u.username}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'owner' ? 'default' : 'secondary'}>
                      {u.role === 'owner' ? 'مالك' : 'موظف استقبال'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.phone || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.lastLoginAt
                      ? format(new Date(u.lastLoginAt), 'dd MMM yyyy', { locale })
                      : 'لم يدخل بعد'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? 'success' : 'destructive'}>
                      {u.isActive ? 'فعّال' : 'موقوف'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" title="تعديل" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="تغيير كلمة المرور" onClick={() => openResetPwd(u)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {u.id !== currentUserId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title={u.isActive ? 'إيقاف تفعيل' : 'تفعيل'}
                          onClick={() => handleToggle(u)}
                          disabled={toggleActive.isPending}
                          className={u.isActive ? 'text-destructive hover:text-destructive' : 'text-green-600'}
                        >
                          {u.isActive
                            ? <ToggleRight className="h-4 w-4" />
                            : <ToggleLeft className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

      {/* Create / Edit Dialog */}
      <Dialog open={mode === 'create' || mode === 'edit'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'إضافة مستخدم جديد' : 'تعديل المستخدم'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {mode === 'create' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>اسم المستخدم *</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="receptionist1"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>كلمة المرور *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>الاسم بالعربية *</Label>
                <Input
                  value={form.fullNameAr}
                  onChange={(e) => setForm({ ...form, fullNameAr: e.target.value })}
                  placeholder="أحمد محمد"
                />
              </div>
              <div className="space-y-1.5">
                <Label>الاسم بالإنجليزية *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Ahmed Mohamed"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>الدور *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as 'owner' | 'receptionist' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">مالك</SelectItem>
                    <SelectItem value="receptionist">موظف استقبال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>رقم الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01012345678"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>إلغاء</Button>
            <Button
              onClick={handleSave}
              disabled={createUser.isPending || updateUser.isPending}
            >
              {(createUser.isPending || updateUser.isPending) && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={mode === 'reset-password'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>تغيير كلمة مرور — {selected?.fullNameAr || selected?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>كلمة المرور الجديدة (6 أحرف على الأقل)</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>إلغاء</Button>
            <Button
              onClick={handleResetPwd}
              disabled={newPassword.length < 6 || resetPwd.isPending}
            >
              {resetPwd.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              تغيير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
