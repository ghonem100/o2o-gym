'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, QrCode, Barcode as BarcodeIcon } from 'lucide-react';
import QRCodeSVG from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const svgEl = document.getElementById('member-qr-svg')?.querySelector('svg');
      if (!svgEl) return;
      const xml = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([xml], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, 180, 180);
        setQrDataUrl(canvas.toDataURL('image/png'));
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }, 500);
    return () => clearTimeout(timer);
  }, [barcode]);

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=420,height=680');
    if (!win) return;
    const barcodeSvg = document.getElementById('member-barcode-svg')?.innerHTML ?? '';
    const gymTitle = gymName ?? 'الصالة الرياضية';
    const photoHtml = photoUrl
      ? '<img class="photo" src="' + photoUrl + '" />'
      : '<div class="photo-fallback">' + fullName.charAt(0) + '</div>';
    const qrHtml = qrDataUrl ? '<img src="' + qrDataUrl + '" style="width:90px;height:90px" />' : '';
    const html = '<!doctype html><html><head>'
      + '<title>' + t('members.membershipCard') + ' - ' + memberNumber + '</title>'
      + '<meta charset="utf-8" />'
      + '<style>'
      + '* { margin:0; padding:0; box-sizing:border-box; font-family: Arial, Helvetica, sans-serif; }'
      + 'body { display:flex; align-items:center; justify-content:center; min-height:100vh; background:#fff; }'
      + '.card { width:340px; border:2px solid #16a34a; border-radius:16px; padding:24px; text-align:center; }'
      + '.gym { color:#16a34a; font-weight:700; font-size:18px; margin-bottom:16px; }'
      + '.photo { width:110px; height:110px; border-radius:50%; object-fit:cover; border:3px solid #16a34a22; margin:0 auto 12px; display:block; }'
      + '.photo-fallback { width:110px; height:110px; border-radius:50%; background:#16a34a22; color:#16a34a; display:flex; align-items:center; justify-content:center; font-size:42px; font-weight:700; margin:0 auto 12px; }'
      + '.name { font-size:20px; font-weight:700; margin-bottom:4px; }'
      + '.num { color:#666; font-size:14px; margin-bottom:16px; }'
      + '.codes { display:flex; align-items:center; justify-content:center; gap:16px; margin-top:8px; }'
      + '.divider { width:1px; height:80px; background:#ddd; }'
      + '.label { font-size:10px; color:#999; margin-top:4px; }'
      + '</style></head><body>'
      + '<div class="card">'
      + '<div class="gym">' + gymTitle + '</div>'
      + photoHtml
      + '<div class="name">' + fullName + '</div>'
      + '<div class="num">#' + memberNumber + '</div>'
      + '<div class="codes">'
      + '<div><div>' + qrHtml + '</div><div class="label">QR Code</div></div>'
      + '<div class="divider"></div>'
      + '<div>' + barcodeSvg + '<div class="label">Barcode</div></div>'
      + '</div></div>'
      + '<script>window.onload=function(){setTimeout(function(){window.print();window.close();},300);};<\/script>'
      + '</body></html>';
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
      <Tabs defaultValue="qr" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="qr" className="flex-1 gap-1.5">
            <QrCode className="h-3.5 w-3.5" />
            QR Code
          </TabsTrigger>
          <TabsTrigger value="barcode" className="flex-1 gap-1.5">
            <BarcodeIcon className="h-3.5 w-3.5" />
            Barcode
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qr" className="mt-3 flex justify-center">
          <div id="member-qr-svg" className="rounded-lg bg-white p-2">
            <QRCodeSVG
              value={barcode}
              size={160}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
        </TabsContent>

        <TabsContent value="barcode" className="mt-3 flex justify-center">
          <div id="member-barcode-svg">
            <Barcode
              value={barcode}
              format="CODE128"
              width={1.8}
              height={56}
              fontSize={14}
              margin={0}
            />
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">#{memberNumber}</p>

      <Button variant="outline" size="sm" className="w-full gap-2" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        {t('members.printCard')}
      </Button>
    </div>
  );
}
