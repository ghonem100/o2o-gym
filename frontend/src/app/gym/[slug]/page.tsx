'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useGymContext } from '@/providers/slug-context';

export default function GymRootPage() {
  const router = useRouter();
  const { slug } = useGymContext();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const base = `/gym/${slug}`;
    if (!user || user.gymSlug !== slug) {
      router.replace(`${base}/login`);
    } else {
      router.replace(user.role === 'receptionist' ? `${base}/attendance` : `${base}/dashboard`);
    }
  }, [user, slug, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Dumbbell className="h-12 w-12 animate-pulse text-primary" />
    </div>
  );
}
