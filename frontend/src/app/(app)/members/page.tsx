'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Loader2, ScanFace, AlertTriangle } from 'lucide-react';
import { useMembers } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddMemberDialog } from '@/components/members/add-member-dialog';
import { Member } from '@/types';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'success' | 'secondary' | 'destructive'> = {
  active: 'success',
  inactive: 'secondary',
  suspended: 'destructive',
};

export default function MembersPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const { data, isLoading } = useMembers({ search, page });

  const members = (data?.data ?? []) as Member[];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('members.title')}</h1>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('members.addMember')}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('members.searchPlaceholder')}
          className="ps-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t('common.noData')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('members.fullName')}</TableHead>
                  <TableHead>{t('members.memberNumber')}</TableHead>
                  <TableHead>{t('members.phone')}</TableHead>
                  <TableHead>{t('subscriptions.plan')}</TableHead>
                  <TableHead>{t('enrollment.title')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('members.memberSince')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/members/${m.id}`} className="flex items-center gap-3 hover:text-primary">
                        <Avatar className="h-9 w-9">
                          {m.photoUrl && <AvatarImage src={m.photoUrl} />}
                          <AvatarFallback>{m.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{m.fullName}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">#{m.memberNumber}</TableCell>
                    <TableCell dir="ltr" className="text-start">{m.phone}</TableCell>
                    <TableCell>
                      {m.activeSubscription ? (
                        <Badge variant="outline">{m.activeSubscription.plan.name}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.hasFace ? (
                        <Badge variant="success" className="gap-1">
                          <ScanFace className="h-3 w-3" />
                          {t('enrollment.enrolled')}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t('enrollment.notEnrolled')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[m.status]}>{t(`members.${m.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(m.createdAt, i18n.language)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t('common.back')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('common.add')}
          </Button>
        </div>
      )}

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
