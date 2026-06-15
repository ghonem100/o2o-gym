'use client';

import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function PagePlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Construction className="h-12 w-12" />
          <p>Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
