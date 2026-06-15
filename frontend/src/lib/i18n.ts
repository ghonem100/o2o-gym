'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '@/locales/ar.json';
import en from '@/locales/en.json';

export const LANGUAGES = {
  ar: { label: 'العربية', dir: 'rtl' as const },
  en: { label: 'English', dir: 'ltr' as const },
};

export type Language = keyof typeof LANGUAGES;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export function applyLanguage(lang: Language): void {
  i18n.changeLanguage(lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = LANGUAGES[lang].dir;
    localStorage.setItem('o2o-lang', lang);
  }
}

export default i18n;
