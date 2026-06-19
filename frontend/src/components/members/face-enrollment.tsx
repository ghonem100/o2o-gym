'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check, Loader2, RefreshCw, ScanFace, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadFaceModels,
  detectDescriptor,
  averageDescriptors,
  descriptorToBase64,
} from '@/lib/face-engine';
import { useEnrollFace } from '@/hooks/use-enroll-face';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOTAL_SHOTS = 3;

interface Props {
  memberId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export function FaceEnrollment({ memberId, onComplete, onSkip }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camStatus, setCamStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [captures, setCaptures] = useState<Float32Array[]>([]);
  const [capturing, setCapturing] = useState(false);
  const enroll = useEnrollFace();

  const promptKey = ['lookStraight', 'lookSlightlyLeft', 'lookSlightlyRight'][captures.length] ?? 'lookStraight';

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        // Request camera BEFORE loading models so user-gesture stays active.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        await loadFaceModels();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCamStatus('ready');
      } catch {
        setCamStatus('error');
      }
    }
    init();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);
    try {
      const descriptor = await detectDescriptor(videoRef.current);
      if (!descriptor) {
        toast.error(t('enrollment.noFaceDetected'));
        return;
      }
      setCaptures((prev) => [...prev, descriptor]);
    } catch {
      toast.error(t('enrollment.noFaceDetected'));
    } finally {
      setCapturing(false);
    }
  };

  const handleSave = () => {
    const averaged = averageDescriptors(captures);
    enroll.mutate(
      { memberId, descriptor: descriptorToBase64(averaged) },
      {
        onSuccess: () => {
          toast.success(t('enrollment.enrollSuccess'));
          stopCamera();
          onComplete();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  const complete = captures.length >= TOTAL_SHOTS;

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">{t('enrollment.instructions')}</p>

      <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />

        {camStatus === 'ready' && !complete && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-56 rounded-full border-4 border-primary/70" />
          </div>
        )}

        {camStatus === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">{t('attendance.loadingModels')}</p>
          </div>
        )}

        {camStatus === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-destructive text-white">
            <X className="h-8 w-8" />
            <p className="text-sm">{t('attendance.cameraError')}</p>
          </div>
        )}

        {camStatus === 'ready' && !complete && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white">
            {t(`enrollment.${promptKey}`)}
          </div>
        )}

        {complete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-success/90 text-white">
            <Check className="h-12 w-12" />
            <p className="font-semibold">{captures.length} / {TOTAL_SHOTS}</p>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-3">
        {Array.from({ length: TOTAL_SHOTS }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold',
              i < captures.length
                ? 'border-success bg-success text-success-foreground'
                : 'border-muted-foreground/30 text-muted-foreground'
            )}
          >
            {i < captures.length ? <Check className="h-4 w-4" /> : i + 1}
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t('enrollment.step')} {Math.min(captures.length + 1, TOTAL_SHOTS)} {t('enrollment.of')} {TOTAL_SHOTS}
      </p>

      <div className="flex flex-col gap-2">
        {!complete ? (
          <Button
            size="lg"
            onClick={handleCapture}
            disabled={camStatus !== 'ready' || capturing}
            className="gap-2"
          >
            {capturing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            {t('enrollment.captureButton')}
          </Button>
        ) : (
          <Button size="lg" onClick={handleSave} disabled={enroll.isPending} className="gap-2">
            {enroll.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanFace className="h-5 w-5" />}
            {t('enrollment.saveEnrollment')}
          </Button>
        )}

        <div className="flex gap-2">
          {captures.length > 0 && (
            <Button variant="outline" className="flex-1 gap-2" onClick={() => setCaptures([])}>
              <RefreshCw className="h-4 w-4" />
              {t('enrollment.retake')}
            </Button>
          )}
          {onSkip && (
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                stopCamera();
                onSkip();
              }}
            >
              {t('enrollment.skip')}
   