'use client';

import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

// react-barcode uses jsbarcode (DOM) — load client-side only.
const Barcode = dynamic(() => import('react-barcode'), { ssr: false });

interface Props {
  barcode: string;
  fullName: string;
  memberNumber: string;
  photoUrl: string | null;
  gymName?: string;
}

export function MemberBarcodeCard({ barcode, fullName, memberNumber, photoUrl, gymName }: Props) {
  const { t } = useTranslation();

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=420,height=620');
    if (!win) return;

    // Grab the rendered barcode SVG so the print window is self-contained.
    const svg = document.getElementById('member-barcode-svg')?.innerHTML ?? '';

    win.document.write(`<!doctype html><html><head><title>${t('members.membershipCard')} - ${memberNumber}</title>
      <meta charset="utf-8" />
      <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family: Arial, Helvetica, sans-serif; }
        body { display:flex; align-items:center; justify-content:center; min-height:100vh; background:#fff; }
        .card { width:340px; border:2px solid #16a34a; border-radius:16px; padding:24px; text-align:center; }
        .gym { color:#16a34a; font-weight:700; font-size:18px; margin-bottom:16px; }
        .photo { width:110px; height:110px; border-radius:50%; object-fit:cover; border:3px solid #16a34a22; margin:0 auto 12px; display:block; }
        .photo-fallback { width:110px; height:110px; border-radius:50%; background:#16a34a22; color:#16a34a; display:flex; align-items:center; justify-content:center; font-size:42px; font-weight:700; margin:0 auto 12px; }
        .name { font-size:20px; font-weight:700; margin-bottom:4px; }
        .num { color:#666; font-size:14px; margin-bottom:16px; }
        .barcode { margin-top:8px; }
      </style></head><body>
      <div class="card">
        <div class="gym">${gymName ?? 'O2O Gym'}</div>
        ${photoUrl
          ? `<img class="photo" src="${photoUrl}" />`
          : `<div class="photo-fallback">${fullName.charAt(0)}</div>`}
        <div class="name">${fullName}</div>
        <div class="num">#${memberNumber}</div>
        <div class="barcode">${svg}</div>
      </div>
      <script>window.onload = function(){ setTimeout(function(){ window.print(); window.close(); }, 300); };<\/script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-lg border bg-white p-4">
      <p className="text-xs font-medium text-muted-foreground">{t('members.barcode')}</p>
      <div id="member-barcode-svg" className="flex justify-center">
        <Barcode value={barcode} format="CODE128" width={1.8} height={56} fontSize={14} margin={0} />
      </div>
      <Button variant="outline" size="sm" className="w-full gap-2" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        {t('members.printCard')}
      </Button>
    </div>
  );
}
