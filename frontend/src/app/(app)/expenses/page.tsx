'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Trash2, Receipt, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AuthGuard } from '@/components/layout/auth-guard';
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/use-finance';
import { getApiErrorMessage } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';

const CATEGORIES = ['rent', 'electricity', 'water', 'salaries', 'maintenance', 'marketing', 'equipment', 'other'];

export default function ExpensesPage() {
  return (
    <AuthGuard allowedRoles={['owner']}>
      <ExpensesContent />
    </AuthGuard>
  );
}

function ExpensesContent() {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<{ page: number; category?: string; dateFrom?: string; dateTo?: string }>({ page: 1 });
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ category: 'other', description: '', amount: '', expenseDate: format(new Date(), 'yyyy-MM-dd') });

  const { data, isLoading } = useExpenses(filters);
  const create = useCreateExpense();
  const del = useDeleteExpense();

  const expenses = data?.data.expenses ?? [];
  const total = data?.data.totalAmount ?? 0;
  const pagination = data?.pagination;

  const setFilter = (key: string, value: string) =>
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { category: form.category, description: form.description, amount: Number(form.amount), expenseDate: form.expenseDate },
      {
        onSuccess: () => {
          toast.success(t('expenses.addSuccess'));
          setAddOpen(false);
          setForm({ category: 'other', description: '', amount: '', expenseDate: format(new Date(), 'yyyy-MM-dd') });
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('expenses.confirmDelete'))) return;
    del.mutate(id, {
      onSuccess: () => toast.success(t('expenses.deleteSuccess')),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('expenses.title')}</h1>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('expenses.addExpense')}
        </Button>
      </div>

      {/* Total */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <Receipt className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('expenses.monthlyTotal')}</p>
            <p className="text-3xl font-bold">
              {formatCurrency(total, i18n.language)} <span className="text-base font-normal text-muted-foreground">{t('common.egp')}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label className="text-xs">{t('expenses.category')}</Label>
            <Select value={filters.category ?? 'all'} onValueChange={(v) => setFilter('category', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder={t('expenses.allCategories')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('expenses.allCategories')}</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`expenses.categories.${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('payments.dateFrom')}</Label>
            <Input type="date" className="w-40" value={filters.dateFrom ?? ''} onChange={(e) => setFilter('dateFrom', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('payments.dateTo')}</Label>
            <Input type="date" className="w-40" value={filters.dateTo ?? ''} onChange={(e) => setFilter('dateTo', e.target.value)} />
          </div>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setFilters({ page: 1 })}>
            <X className="h-4 w-4" />
            {t('payments.clearFilters')}
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : expenses.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t('common.noData')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('expenses.description')}</TableHead>
                  <TableHead>{t('expenses.category')}</TableHead>
                  <TableHead>{t('expenses.amount')}</TableHead>
                  <TableHead>{t('expenses.date')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell className="font-medium">{ex.description}</TableCell>
                    <TableCell><Badge variant="secondary">{t(`expenses.categories.${ex.category}`)}</Badge></TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(ex.amount), i18n.language)} {t('common.egp')}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(ex.expenseDate, i18n.language)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(ex.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
          <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>{t('common.back')}</Button>
          <span className="text-sm text-muted-foreground">{filters.page} / {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={filters.page >= pagination.totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>{t('common.add')}</Button>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('expenses.addExpense')}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('expenses.category')}</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`expenses.categories.${c}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('expenses.description')}</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('expenses.amount')}</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>{t('expenses.date')}</Label>
                <Input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
