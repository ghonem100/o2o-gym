'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { useCreateTenantGym, CreateGymResult } from '@/hooks/use-super-admin';
import { getApiErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const SLUG_REGEX = /^[a-z0-9-]+$/;

export default function NewGymPage() {
  const create = useCreateTenantGym();
  const [created, setCreated] = useState<CreateGymResult | null>(null);
  const [form, setForm] = useState({
    gymName: '',
    gymNameAr: '',
    slug: '',
    city: '',
    monthlyFee: '200',
    ownerFullName: '',
    ownerUsername: '',
    ownerPassword: '',
    ownerPhone: '',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const slugValid = form.slug === '' || SLUG_REGEX.test(form.slug);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!SLUG_REGEX.test(form.slug)) {
      toast.error('الرابط يجب أن يكون حروف إنجليزية صغيرة وأرقام وشرطات فقط');
      return;
    }
    create.mutate(
      {
        gymName: form.gymName,
        gymNameAr: form.gymNameAr || undefined,
        slug: form.slug,
        city: form.city || undefined,
        monthlyFee: form.monthlyFee ? Number(form.monthlyFee) : undefined,
        ownerFullName: form.ownerFullName,
        ownerUsername: form.ownerUsername,
        ownerPassword: form.ownerPassword,
        ownerPhone: form.ownerPhone || undefined,
      },
      {
        onSuccess: (result) => setCreated(result),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  const copyCredentials = () => {
    if (!created) return;
    const text = `رابط الدخول: ${window.location.origin}/gym/${created.gym.slug}\nاسم المستخدم: ${created.owner.username}\nكلمة المرور: ${created.owner.password}`;
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ بيانات الدخول');
  };

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-success/50">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-9 w-9 text-success" />
            </div>
            <h1 className="text-xl font-bold">تم إنشاء الجيم بنجاح 🎉</h1>
            <div className="w-full space-y-2 rounded-lg bg-muted p-4 text-start text-sm">
              <p><span className="text-muted-foreground">الرابط:</span> <span dir="ltr" className="font-mono">/gym/{created.gym.slug}</span></p>
              <p><span className="text-muted-foreground">اسم المستخدم:</span> <span dir="ltr" className="font-mono">{created.owner.username}</span></p>
              <p><span className="text-muted-foreground">كلمة المرور:</span> <span dir="ltr" className="font-mono">{created.owner.password}</span></p>
              <p className="text-xs text-warning">⚠️ احفظ كلمة المرور الآن — لن تظهر مرة أخرى</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyCredentials} className="gap-2">
                <Copy className="h-4 w-4" />
                نسخ البيانات
              </Button>
              <Button variant="outline" asChild>
                <Link href="/super-admin">رجوع للوحة</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/super-admin">
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>إنشاء جيم جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>اسم الجيم (إنجليزي) *</Label>
                <Input value={form.gymName} onChange={set('gymName')} required />
              </div>
              <div className="space-y-2">
                <Label>اسم الجيم (عربي)</Label>
                <Input value={form.gymNameAr} onChange={set('gymNameAr')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>الرابط (slug) *</Label>
                <Input
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                  placeholder="iron-gym-cairo"
                  className={!slugValid ? 'border-destructive' : ''}
                  required
                />
                <p className="text-xs text-muted-foreground" dir="ltr">
                  /gym/{form.slug || 'iron-gym-cairo'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>المدينة</Label>
                <Input value={form.city} onChange={set('city')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الرسوم الشهرية (ج.م)</Label>
              <Input type="number" min="0" value={form.monthlyFee} onChange={set('monthlyFee')} className="w-40" />
            </div>

            <hr />
            <h3 className="font-bold">حساب مالك الجيم</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>الاسم الكامل *</Label>
                <Input value={form.ownerFullName} onChange={set('ownerFullName')} required />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input dir="ltr" value={form.ownerPhone} onChange={set('ownerPhone')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>اسم المستخدم *</Label>
                <Input dir="ltr" value={form.ownerUsername} onChange={set('ownerUsername')} required minLength={3} />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور *</Label>
                <Input dir="ltr" value={form.ownerPassword} onChange={set('ownerPassword')} required minLength={8} />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إنشاء الجيم'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
