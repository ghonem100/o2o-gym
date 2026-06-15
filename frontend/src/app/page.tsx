'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Dumbbell } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace('/login');
    else router.replace(user.role === 'owner' ? '/dashboard' : '/attendance');
  }, [user, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Dumbbell className="h-12 w-12 animate-pulse text-primary" />
    </div>
  );
}
