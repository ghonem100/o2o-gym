'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useLogout } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'super_admin') {
      router.replace('/');
      return;
    }
    setChecked(true);
  }, [user, router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Building2 className="h-10 w-10 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold">لوحة إدارة المنصة</p>
              <p className="text-xs text-muted-foreground">{user?.fullName}</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link href="/super-admin">
                <LayoutDashboard className="h-4 w-4" />
                الرئيسية
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link href="/super-admin/gyms/new">
                <Plus className="h-4 w-4" />
                جيم جديد
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => logout.mutate()}
            >
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
