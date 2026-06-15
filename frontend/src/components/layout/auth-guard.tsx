'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Role } from '@/types';
import { Dumbbell } from 'lucide-react';

export function AuthGuard({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(user.role === 'owner' ? '/dashboard' : '/attendance');
      return;
    }
    setChecked(true);
  }, [user, allowedRoles, router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Dumbbell className="h-10 w-10 animate-pulse text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
