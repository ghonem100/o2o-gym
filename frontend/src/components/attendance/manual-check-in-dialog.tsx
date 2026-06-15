'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, UserCheck } from 'lucide-react';
import { useMembers } from '@/hooks/use-api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (memberId: string, notes?: string) => void;
  loading: boolean;
}

export function ManualCheckInDialog({ open, onOpenChange, onConfirm, loading }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useMembers({ search, status: 'active' });

  const members = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('attendance.manualMode')}</DialogTitle>
          <DialogDescription>{t('members.searchPlaceholder')}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('members.searchPlaceholder')}
            className="ps-9"
            autoFocus
          />
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && members.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">{t('common.noData')}</p>
          )}
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => onConfirm(m.id)}
              disabled={loading}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-start transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Avatar>
                {m.photoUrl && <AvatarImage src={m.photoUrl} />}
                <AvatarFallback>{m.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  #{m.memberNumber} · {m.phone}
                </p>
              </div>
              <UserCheck className="h-5 w-5 text-primary" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
