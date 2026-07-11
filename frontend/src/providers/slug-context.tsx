'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneCall, Ban, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ApiResponse } from '@/types';

export interface ResolvedGym {
  gymId: string;
  gymName: string;
  gymNameAr: string | null;
  isActive: boolean;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
}

interface SlugContextValue extends ResolvedGym {
  slug: string;
}

const SlugContext = createContext<SlugContextValue | null>(null);

export function useGymContext(): SlugContextValue {
  const ctx = useContext(SlugContext);
  if (!ctx) throw new Error('useGymContext must be used inside SlugProvider');
  return ctx;
}

export function SlugProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const router = useRouter();
  const [gym, setGym] = useState<ResolvedGym | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound' | 'suspended'>('loading');

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      try {
        const { data } = await api.get<ApiResponse<ResolvedGym>>(`/gyms/slug/${slug}`);
        if (cancelled) return;
        const g = data.data;
        setGym(g);
        localStorage.setItem('o2o-slug', slug);
        if (g.subscriptionStatus === 'suspended' || g.subscriptionStatus === 'cancelled') {
          setState('suspended');
        } else {
          setState('ok');
        }
      } catch {
        if (!cancelled) setState('notfound');
      }
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (state === 'notfound') router.replace('/');
  }, [state, router]);

  if (state === 'loading' || state === 'notfound') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'suspended') {
    return <SuspendedScreen gymName={gym?.gymNameAr || gym?.gymName || ''} />;
  }

  return (
    <SlugContext.Provider value={{ slug, ...(gym as ResolvedGym) }}>
      {children}
    </SlugContext.Provider>
  );
}

function SuspendedScreen({ gymName }: { gymName: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border bg-card p-10 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <Ban className="h-10 w-10 text-destructive" />
        </div>
        {gymName && <p className="mb-2 text-sm text-muted-foreground">{gymName}</p>}
        <h1 className="mb-3 text-2xl font-bold">الحساب موقوف مؤقتاً</h1>
        <p className="mb-6 leading-relaxed text-muted-foreground">
          عذراً، تم إيقاف حساب الصالة الرياضية مؤقتاً.
          <br />
          يرجى التواصل مع المزود لتجديد الاشتراك.
        </p>
        <a
          href="https://wa.me/201017975972"
          className="inline-flex items-center gap-2 rounded-lg bg-success px-6 py-3 font-semibold text-success-foreground transition-opacity hover:opacity-90"
        >
          <PhoneCall className="h-5 w-5" />
          <span dir="ltr">01017975972</span>
        </a>
      </div>
    </div>
  );
}
