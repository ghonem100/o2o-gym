'use client';

import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { applyLanguage, Language } from '@/lib/i18n';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language as Language;

  const toggle = () => {
    applyLanguage(current === 'ar' ? 'en' : 'ar');
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-2">
      <Languages className="h-4 w-4" />
      {current === 'ar' ? 'English' : 'العربية'}
    </Button>
  );
}
