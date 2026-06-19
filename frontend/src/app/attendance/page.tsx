'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Dumbbell, Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api, getApiErrorMessage } from '@/lib/api';
import { ApiResponse, CheckInResult } from '@/types';
import { useFaceCheckIn, useBarcodeCheckIn, useManualCheckIn, useTodayAttendance } from '@/hooks/use-api';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { base64ToDescriptor, LabeledDescriptor } from '@/lib/face-engine';
import { FaceCamera } from '@/components/attendance/face-camera';
import { CheckInResultOverlay } from '@/components/attendance/check-in-result';
import { ManualCheckInDialog } from '@/components/attendance/manual-check-in-dialog';
import { BarcodeCheckIn } from '@/components/attendance/barcode-check-in';
import { QuickSellPanel } from '@/components/attendance/quick-sell-panel';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { formatTime } from '@/lib/utils';

interface FaceDescriptorDTO {
  memberId: string;
  descriptor: string;
}

export default function AttendanceKioskPage() {
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const faceCheckIn = useFaceCheckIn();
  const barcodeCheckIn = useBarcodeCheckIn();
  const manualCheckIn = useManualCheckIn();
  const today = useTodayAttendance();

  // Load member face descriptors for local matching
  const { data: descriptors } = useQuery({
    queryKey: ['face-descriptors'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<FaceDescriptorDTO[]>>('/members/face-descriptors');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const candidates: LabeledDescriptor[] = useMemo(() => {
    if (!descriptors) return [];
    return descriptors.map((d) => ({
      memberId: d.memberId,
      descriptor: base64ToDescriptor(d.descriptor),
    }));
  }, [descriptors]);

  const busy = faceCheckIn.isPending || barcodeCheckIn.isPending || manualCheckIn.isPending || !!result;

  const handleFaceMatch = useCallback(
    (memberId: string, confidence: number) => {
      if (busy) return;
      faceCheckIn.mutate(
        { memberId, confidence },
        {
          onSuccess: (res) => setResult(res),
          onError: (err) => toast.error(getApiErrorMessage(err)),
        }
      );
    },
    [busy, faceCheckIn]
  );

  const handleBarcode = useCallback(
    (barcode: string) => {
      if (busy) return;
      barcodeCheckIn.mutate(
        { barcode },
        {
          onSuccess: (res) => setResult(res),
          onError: (err) => toast.error(getApiErrorMessage(err)),
        }
      );
    },
    [busy, barcodeCheckIn]
  );

  // Global window-level scanner is a fallback for when focus leaves the visible
  // barcode field; the visible input handles the common case. Disabled while a
  // dialog or result overlay is showing.
  useBarcodeScanner(handleBarcode, !manualOpen && !result);

  const handleManual = (memberId: string, notes?: string) => {
    manualCheckIn.mutate(
      { memberId, notes },
      {
        onSuccess: (res) => {
          setResult(res);
          setManualOpen(false);
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-primary/10 via-background to-accent/20">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-card/80 px-8 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('attendance.kioskTitle')}</h1>
            <p className="text-sm text-muted-foreground">{formatTime(new Date(), i18n.language)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
            <Users className="h-5 w-5" />
            <span className="font-bold">{today.data?.totalToday ?? 0}</span>
            <span className="text-sm">{t('attendance.todayCheckIns')}</span>
          </div>
          <LanguageToggle />
          <Button variant="ghost" size="icon" asChild>
            <Link href="/members" title={t('nav.members')}>
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main kiosk area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.4fr,1fr]">
          {/* Camera */}
          <div className="lg:row-span-2">
            <FaceCamera candidates={candidates} onMatch={handleFaceMatch} paused={busy} />
            <p className="mt-3 text-center text-muted-foreground">
              {candidates.length === 0 && t('attendance.useBarcodeManual')}
            </p>
          </div>

          {/* Check-in controls */}
          <div className="space-y-4">
            <BarcodeCheckIn onScan={handleBarcode} loading={barcodeCheckIn.isPending} autoFocus={!manualOpen && !result} />

            <Button
              size="xl"
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => setManualOpen(true)}
              disabled={busy}
            >
              <Users className="h-6 w-6" />
              {t('attendance.manualMode')}
            </Button>
          </div>

          {/* Quick-sell */}
          <div className="lg:col-start-2">
            <QuickSellPanel />
          </div>
        </div>
      </div>

      {result && <CheckInResultOverlay result={result} onDismiss={() => setResult(null)} />}

      <ManualCheckInDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onConfirm={handleManual}
        loading={manualCheckIn.isPending}
      />
    </div>
  );
}
