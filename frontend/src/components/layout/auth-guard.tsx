'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : null;
  const user = useAuthStore((s) => s.user);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const base = slug ? `/gym/${slug}` : '';

    if (!user) {
      router.replace(slug ? `${base}/login` : '/login');
      return;
    }

    // A gym user must match the slug they are visiting
    if (slug && user.role !== 'super_admin' && user.gymSlug !== slug) {
      router.replace(`${base}/login`);
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === 'super_admin') {
        router.replace('/super-admin');
      } else {
        router.replace(user.role === 'owner' ? `${base}/dashboard` : `${base}/attendance`);
      }
      return;
    }
    setChecked(true);
  }, [user, allowedRoles, router, slug]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Dumbbell className="h-10 w-10 animate-pulse text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
