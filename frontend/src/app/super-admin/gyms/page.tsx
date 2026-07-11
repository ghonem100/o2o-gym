'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { GymsTable } from '@/components/super-admin/gyms-table';
import { Button } from '@/components/ui/button';

export default function SuperAdminGymsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">كل الجيمات</h1>
        <Button asChild className="gap-2">
          <Link href="/super-admin/gyms/new">
            <Plus className="h-4 w-4" />
            جيم جديد
          </Link>
        </Button>
      </div>
      <GymsTable />
    </div>
  );
}
