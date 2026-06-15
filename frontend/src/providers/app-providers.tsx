'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { I18nextProvider } from 'react-i18next';
import i18n, { applyLanguage, Language } from '@/lib/i18n';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    const saved = (localStorage.getItem('o2o-lang') as Language) || 'ar';
    applyLanguage(saved);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </I18nextProvider>
    </QueryClientProvider>
  );
}
