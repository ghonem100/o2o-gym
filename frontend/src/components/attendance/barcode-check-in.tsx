'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanLine, Loader2, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  onScan: (barcode: string) => void;
  loading: boolean;
  /** When true the input keeps grabbing focus (kiosk idle state). */
  autoFocus: boolean;
}

/**
 * Visible barcode field that works with both a USB scanner (types fast + Enter)
 * and manual keyboard entry. Stays focused so a scan always lands here.
 */
export function BarcodeCheckIn({ onScan, loading, autoFocus }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  const focus = () => inputRef.current?.focus();

  // Keep focus on the field while idle so scans are always captured.
  useEffect(() => {
    if (!autoFocus) return;
    focus();
    const onWindowFocus = () => focus();
    window.addEventListener('focus', onWindowFocus);
    const interval = window.setInterval(() => {
      if (document.activeElement !== inputRef.current && !loading) focus();
    }, 1500);
    return () => {
      window.removeEventListener('focus', onWindowFocus);
      clearInterval(interval);
    };
  }, [autoFocus, loading]);

  const submit = () => {
    const code = value.trim();
    if (code.length >= 3) {
      onScan(code);
      setValue('');
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          {!loading && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          )}
          <span className={cn('relative inline-flex h-3 w-3 rounded-full', loading ? 'bg-warning' : 'bg-success')} />
        </span>
        <p className="font-semibold text-foreground">
          {loading ? t('attendance.scanning') : t('attendance.barcodeReady')}
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            onBlur={() => autoFocus && setTimeout(focus, 100)}
            placeholder={t('attendance.barcodeManualEntry')}
            className="h-12 ps-10 text-lg"
            inputMode="numeric"
            autoComplete="off"
            disabled={loading}
          />
        </div>
        <Button size="lg" className="h-12 gap-2" onClick={submit} disabled={loading || value.trim().length < 3}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
          {t('attendance.barcodeSubmit')}
        </Button>
      </div>
    </div>
  );
}
