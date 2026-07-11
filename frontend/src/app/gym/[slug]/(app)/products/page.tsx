'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, Package, Save, History } from 'lucide-react';
import { toast } from 'sonner';
import { AuthGuard } from '@/components/layout/auth-guard';
import { useProducts, useCreateProduct, useUpdateProduct, useProductSales, Product } from '@/hooks/use-products';
import { useAuthStore } from '@/lib/store';
import { getApiErrorMessage } from '@/lib/api';
import { QuickSellPanel } from '@/components/attendance/quick-sell-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

export default function ProductsPage() {
  return (
    <AuthGuard allowedRoles={['owner', 'receptionist']}>
      <ProductsContent />
    </AuthGuard>
  );
}

function ProductsContent() {
  const { t, i18n } = useTranslation();
  const isOwner = useAuthStore((s) => s.isOwner());
  const { data: products, isLoading } = useProducts(isOwner);
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const [addOpen, setAddOpen] = useState(false);
  const [edits, setEdits] = useState<Record<string, { price?: string; stock?: string }>>({});
  const [form, setForm] = useState({ name: '', nameAr: '', price: '', stockQuantity: '' });

  const productName = (p: Product) => (i18n.language === 'ar' ? p.nameAr || p.name : p.name);

  const saveRow = (p: Product) => {
    const edit = edits[p.id];
    if (!edit) return;
    const payload: { id: string; price?: number; stockQuantity?: number } = { id: p.id };
    if (edit.price !== undefined && edit.price !== '') payload.price = Number(edit.price);
    if (edit.stock !== undefined && edit.stock !== '') payload.stockQuantity = Number(edit.stock);
    updateProduct.mutate(payload, {
      onSuccess: () => {
        toast.success(t('products.updateSuccess'));
        setEdits((e) => { const { [p.id]: _, ...rest } = e; return rest; });
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  const toggleActive = (p: Product, isActive: boolean) => {
    updateProduct.mutate({ id: p.id, isActive }, {
      onSuccess: () => toast.success(t('products.updateSuccess')),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate(
      { name: form.name, nameAr: form.nameAr || undefined, price: Number(form.price), stockQuantity: Number(form.stockQuantity || 0) },
      {
        onSuccess: () => {
          toast.success(t('products.createSuccess'));
          setAddOpen(false);
          setForm({ name: '', nameAr: '', price: '', stockQuantity: '' });
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('products.title')}</h1>
        {isOwner && (
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('products.addProduct')}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick sell (both roles) */}
        <QuickSellPanel />

        {/* Owner stock management OR receptionist read-only list */}
        {isOwner ? (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />{t('products.manageProducts')}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('products.name')}</TableHead>
                      <TableHead>{t('products.price')}</TableHead>
                      <TableHead>{t('products.stock')}</TableHead>
                      <TableHead>{t('products.active')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(products ?? []).map((p) => {
                      const edit = edits[p.id];
                      const dirty = edit && (edit.price !== undefined || edit.stock !== undefined);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{productName(p)}</TableCell>
                          <TableCell>
                            <Input type="number" min="0" step="0.5" className="w-24"
                              defaultValue={Number(p.price)}
                              onChange={(e) => setEdits((s) => ({ ...s, [p.id]: { ...s[p.id], price: e.target.value } }))} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0" className="w-20"
                              defaultValue={p.stockQuantity}
                              onChange={(e) => setEdits((s) => ({ ...s, [p.id]: { ...s[p.id], stock: e.target.value } }))} />
                          </TableCell>
                          <TableCell><Switch checked={p.isActive} onCheckedChange={(c) => toggleActive(p, c)} /></TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" disabled={!dirty || updateProduct.isPending} onClick={() => saveRow(p)}>
                              <Save className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          <ReceptionistProductList products={products ?? []} productName={productName} />
        )}
      </div>

      <SalesHistory />

      {/* Add product dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('products.addProduct')}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('products.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus />
            </div>
            <div className="space-y-2">
              <Label>{t('products.nameAr')}</Label>
              <Input dir="rtl" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('products.price')}</Label>
                <Input type="number" min="0" step="0.5" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>{t('products.stock')}</Label>
                <Input type="number" min="0" value={form.stockQuantity} onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('products.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceptionistProductList({ products, productName }: { products: Product[]; productName: (p: Product) => string }) {
  const { t, i18n } = useTranslation();
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />{t('products.title')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('products.name')}</TableHead>
              <TableHead>{t('products.price')}</TableHead>
              <TableHead>{t('products.stock')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{productName(p)}</TableCell>
                <TableCell>{formatCurrency(Number(p.price), i18n.language)} {t('common.egp')}</TableCell>
                <TableCell>
                  <Badge variant={p.stockQuantity <= 0 ? 'destructive' : p.stockQuantity <= 5 ? 'warning' : 'secondary'}>
                    {p.stockQuantity}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SalesHistory() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProductSales({ page });
  const sales = data?.data.sales ?? [];
  const pagination = data?.pagination;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />{t('products.salesHistory')}</CardTitle>
        <span className="text-sm text-muted-foreground">
          {t('products.productRevenue')}: <span className="font-semibold text-foreground">{formatCurrency(data?.data.summary.totalRevenue ?? 0, i18n.language)} {t('common.egp')}</span>
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : sales.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">{t('common.noData')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('products.product')}</TableHead>
                <TableHead>{t('products.quantity')}</TableHead>
                <TableHead>{t('products.total')}</TableHead>
                <TableHead>{t('payments.method')}</TableHead>
                <TableHead>{t('products.soldBy')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{i18n.language === 'ar' ? s.product.nameAr || s.product.name : s.product.name}</TableCell>
                  <TableCell>×{s.quantity}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(Number(s.totalPrice), i18n.language)} {t('common.egp')}</TableCell>
                  <TableCell><Badge variant="outline">{s.paymentMethod}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{s.seller.fullName}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(s.createdAt, i18n.language)} · {formatTime(s.createdAt, i18n.language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('common.back')}</Button>
            <span className="text-sm text-muted-foreground">{page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>{t('common.add')}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
