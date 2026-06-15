'use client';

import { useEffect, useRef } from 'react';

/**
 * Listens for USB barcode scanner input. These devices emulate a keyboard,
 * typing characters rapidly and ending with Enter. We detect a burst of
 * keystrokes (< 50ms apart) terminated by Enter.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void, enabled = true) {
  const buffer = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const now = Date.now();
      if (now - lastKeyTime.current > 100) {
        buffer.current = '';
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        if (buffer.current.length >= 3) {
          onScan(buffer.current);
        }
        buffer.current = '';
        return;
      }

      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onScan, enabled]);
}
