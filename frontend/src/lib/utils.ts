import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, lang = 'ar'): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, lang = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatTime(date: string | Date, lang = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
