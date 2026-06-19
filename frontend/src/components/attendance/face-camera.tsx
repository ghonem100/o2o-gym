'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Camera, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  loadFaceModels,
  detectDescriptor,
  findBestMatch,
  LabeledDescriptor,
} from '@/lib/face-engine';
import { Button } from '@/components/ui/button';

const CAMERA_STORAGE_KEY = 'o2o-camera-id';

interface Props {
  candidates: LabeledDescriptor[];
  onMatch: (memberId: string, confidence: number) => void;
  paused: boolean;
}

type CamStatus = 'loading' | 'ready' | 'error';
type CamErrorKind = 'permission' | 'notfound' | 'inuse' | 'generic';

export function FaceCamera({ candidates, onMatch, paused }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const cooldownRef = useRef(0);

  const [status, setStatus] = useState<CamStatus>('loading');
  const [errorKind, setErrorKind] = useState<CamErrorKind>('generic');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');

  const scanLoop = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    if (paused || Date.now() < cooldownRef.current) return;
    try {
      const descriptor = await detectDescriptor(videoRef.current);
      if (descriptor && candidates.length > 0) {
        const match = findBestMatch(descriptor, candidates);
        if (match) {
          cooldownRef.current = Date.now() + 6000;
          onMatch(match.memberId, match.confidence);
        }
      }
    } catch {
      // keep scanning on detection errors
    }
  }, [candidates, onMatch, paused]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async (preferredId?: string) => {
    setStatus('loading');
    stopStream();
    try {
      // ⚠️ getUserMedia MUST be called BEFORE any await (loadFaceModels)
      // so it executes while the user-gesture activation is still valid.
      // Browsers (Edge/Chrome) silently deny camera access if the gesture
      // has expired — which happens when we await model loading first.

      // Build constraints: prefer a specific device, else front-facing.
      const constraints: MediaStreamConstraints = {
        video: preferredId
          ? { deviceId: { exact: preferredId }, width: 640, height: 480 }
          : { facingMode: 'user', width: 640, height: 480 },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // If the exact device is gone, fall back to any camera.
        if (preferredId && (err as DOMException)?.name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } else {
          throw err;
        }
      }

      // Load face models AFTER camera access is granted (no gesture needed here).
      await loadFaceModels();

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Labels are only available after permission is granted.
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter((d) => d.kind === 'videoinput');
      setDevices(cams);

      // Track the device actually in use.
      const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId || preferredId || '';
      if (activeId) {
        setDeviceId(activeId);
        localStorage.setItem(CAMERA_STORAGE_KEY, activeId);
      }

      setStatus('ready');
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') setErrorKind('permission');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setErrorKind('notfound');
      else if (name === 'NotReadableError' || name === 'AbortError') setErrorKind('inuse');
      else setErrorKind('generic');
      setStatus('error');
    }
  }, [stopStream]);

  // Mount: start with the remembered camera if any.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(CAMERA_STORAGE_KEY) || undefined : undefined;
    startStream(saved);
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the scan loop running with a fresh closure while ready.
  useEffect(() => {
    if (loopRef.current) clearInterval(loopRef.current);
    if (status === 'ready') loopRef.current = window.setInterval(scanLoop, 1000);
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [scanLoop, status]);

  const handleSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setDeviceId(id);
    startStream(id);
  };

  const errorMessage = {
    permission: t('attendance.cameraPermissionDenied'),
    notfound: t('attendance.cameraNotFound'),
    inuse: t('attendance.cameraInUse'),
    generic: t('attendance.cameraGeneric'),
  }[errorKind];

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-black shadow-2xl">
      <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />

      {/* Camera selector — shown whenever we have ≥1 labelled device */}
      {status === 'ready' && devices.length > 0 && (
        <div className="absolute end-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white backdrop-blur">
          <Camera className="h-4 w-4 shrink-0" />
          <select
            value={deviceId}
            onChange={handleSwitch}
            className="max-w-[180px] cursor-pointer truncate bg-transparent text-white outline-none [&>option]:text-black"
            aria-label={t('attendance.selectCamera')}
          >
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `${t('attendance.builtInCamera')} ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card/95 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-warning">
            <AlertTriangle className="h-9 w-9" />
          </div>
          <p className="max-w-sm text-sm text-foreground">{errorMessage}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => startStream(deviceId || undefined)} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('attendance.retryCamera')}
            </Button>
            {devices.length > 0 && (
              <select
                value={deviceId}
                onChange={handleSwitch}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                aria-label={t('attendance.selectCamera')}
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `${t('attendance.builtInCamera')} ${i + 1}`}
      