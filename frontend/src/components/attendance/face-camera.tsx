'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ScanFace } from 'lucide-react';
import {
  loadFaceModels,
  detectDescriptor,
  findBestMatch,
  LabeledDescriptor,
} from '@/lib/face-engine';

interface Props {
  candidates: LabeledDescriptor[];
  onMatch: (memberId: string, confidence: number) => void;
  paused: boolean;
}

export function FaceCamera({ candidates, onMatch, paused }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const loopRef = useRef<number | null>(null);
  const cooldownRef = useRef(0);

  const scanLoop = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    if (paused || Date.now() < cooldownRef.current) return;

    try {
      const descriptor = await detectDescriptor(videoRef.current);
      if (descriptor && candidates.length > 0) {
        const match = findBestMatch(descriptor, candidates);
        if (match) {
          cooldownRef.current = Date.now() + 6000; // prevent duplicate scans
          onMatch(match.memberId, match.confidence);
        }
      }
    } catch {
      // detection error — keep scanning
    }
  }, [candidates, onMatch, paused]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function init() {
      try {
        await loadFaceModels();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('ready');
        loopRef.current = window.setInterval(scanLoop, 1000);
      } catch {
        setStatus('error');
      }
    }
    init();

    return () => {
      cancelled = true;
      if (loopRef.current) clearInterval(loopRef.current);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep scanLoop fresh
  useEffect(() => {
    if (loopRef.current) clearInterval(loopRef.current);
    if (status === 'ready') {
      loopRef.current = window.setInterval(scanLoop, 1000);
    }
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [scanLoop, status]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-black shadow-2xl">
      <video
        ref={videoRef}
        muted
        playsInline
        className="h-full w-full -scale-x-100 object-cover"
      />

      {/* Scanning frame overlay */}
      {status === 'ready' && !paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-64 w-64 rounded-full border-4 border-primary/70">
            <div className="absolute inset-0 animate-pulse-ring rounded-full border-4 border-primary" />
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p>{t('attendance.loadingModels')}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-destructive text-white">
          <ScanFace className="h-10 w-10" />
          <p>{t('attendance.cameraError')}</p>
        </div>
      )}

      {status === 'ready' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-6 py-2 text-white">
          {paused ? t('attendance.scanning') : t('attendance.scanFace')}
        </div>
      )}
    </div>
  );
}
