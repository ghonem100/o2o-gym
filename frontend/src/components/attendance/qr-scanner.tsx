'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  onScan: (code: string) => void;
  paused: boolean;
}

type CameraStatus = 'loading' | 'ready' | 'error';

export function QrScanner({ onScan, paused }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastCodeRef = useRef<string>('');
  const lastCodeTimeRef = useRef<number>(0);
  const [status, setStatus] = useState<CameraStatus>('loading');
  const [flash, setFlash] = useState(false);

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setStatus('loading');
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('ready');
    } catch {
      // Fallback: try any camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }
  }, [stopStream]);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || paused) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code?.data) {
          const now = Date.now();
          const isDuplicate =
            code.data === lastCodeRef.current && now - lastCodeTimeRef.current < 3000;
          if (!isDuplicate) {
            lastCodeRef.current = code.data;
            lastCodeTimeRef.current = now;
            setFlash(true);
            setTimeout(() => setFlash(false), 300);
            onScan(code.data);
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, [onScan, paused]);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  useEffect(() => {
    if (status === 'ready') {
      rafRef.current = requestAnimationFrame(scanLoop);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [status, scanLoop]);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-black shadow-xl">
      {/* Live video */}
      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full object-cover"
        style={{ aspectRatio: '4/3', display: 'block' }}
      />
      {/* Hidden canvas for jsQR */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash on scan */}
      {flash && (
        <div className="pointer-events-none absolute inset-0 animate-ping rounded-2xl bg-primary/30" />
      )}

      {/* Viewfinder overlay */}
      {status === 'ready' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'relative h-64 w-64 transition-all duration-200',
              paused && 'opacity-30'
            )}
          >
            {/* Corner brackets */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
              <span
                key={corner}
                className={cn(
                  'absolute h-10 w-10 border-primary',
                  corner === 'tl' && 'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
                  corner === 'tr' && 'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
                  corner === 'bl' && 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
                  corner === 'br' && 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl'
                )}
              />
            ))}

            {/* Animated scan line */}
            {!paused && (
              <div
                className="absolute inset-x-2 h-0.5 rounded-full bg-primary shadow-[0_0_8px_2px] shadow-primary/60"
                style={{ animation: 'qr-scan 2s ease-in-out infinite' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm">جارٍ تشغيل الكاميرا…</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 p-6 text-white">
          <Camera className="h-12 w-12 text-destructive" />
          <p className="text-center font-semibold">تعذر تشغيل الكاميرا</p>
          <p className="text-center text-sm text-white/60">
            تأكد من منح الإذن للمتصفح ثم أعد المحاولة
          </p>
          <Button variant="secondary" size="sm" onClick={startCamera} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Paused overlay */}
      {paused && status === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-black/60 px-6 py-3">
            <p className="text-sm font-medium text-white">جارٍ المعالجة…</p>
          </div>
        </div>
      )}

      {/* Bottom label */}
      {status === 'ready' && !paused && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center">
          <div className="rounded-full bg-black/60 px-5 py-2 text-sm text-white backdrop-blur-sm">
            وجّه الكاميرا نحو QR Code الخاص بالعضو
          </div>
        </div>
      )}

      {/* Keyframe animation — injected once */}
      <style>{`
        @keyframes qr-scan {
          0%   { top: 8px;   }
          50%  { top: calc(100% - 10px); }
          100% { top: 8px;   }
        }
      `}</style>
    </div>
  );
}
