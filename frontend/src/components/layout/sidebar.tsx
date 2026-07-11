'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ScanFace,
  Users,
  CreditCard,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Dumbbell,
  PlusCircle,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store';
import { useLogout } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from './language-toggle';
import { Role } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard, roles: ['owner'] },
  { href: '/attendance', label: 'nav.attendance', icon: ScanFace, roles: ['owner', 'receptionist'] },
  { href: '/members', label: 'nav.members', icon: Users, roles: ['owner', 'receptionist'] },
  { href: '/subscriptions/new', label: 'nav.newSubscription', icon: PlusCircle, roles: ['owner', 'receptionist'] },
  { href: '/products', label: 'nav.products', icon: ShoppingBag, roles: ['owner', 'receptionist'] },
  { href: '/payments', label: 'nav.payments', icon: CreditCard, roles: ['owner'] },
  { href: '/expenses', label: 'nav.expenses', icon: Receipt, roles: ['owner'] },
  { href: '/analytics', label: 'nav.analytics', icon: BarChart3, roles: ['owner'] },
  { href: '/settings', label: 'nav.settings', icon: Settings, roles: ['owner'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  if (!user) return null;

  const slug = typeof params?.slug === 'string' ? params.slug : user.gymSlug;
  const base = slug ? `/gym/${slug}` : '';
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="flex h-screen w-64 flex-col border-e bg-card">
      <div className="flex items-center gap-3 border-b p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Dumbbell className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold">{t('common.appName')}</p>
          <p className="truncate text-xs text-muted-foreground">{user.gymName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const href = `${base}${item.href}`;
          const active = pathname === href || pathname.startsWith(href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{t(item.label)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t p-3">
        <div className="px-2">
          <LanguageToggle />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {t(`nav.${user.role === 'owner' ? 'dashboard' : 'attendance'}`) && user.role}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive"
          onClick={() => logout.mutate()}
        >
          <LogOut className="h-5 w-5" />
          {t('auth.logout')}
        </Button>
      </div>
    </aside>
  );
}
