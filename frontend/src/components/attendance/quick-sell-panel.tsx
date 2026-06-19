'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useProducts, useSellProducts, Product } from '@/hooks/use-products';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, cn } from '@/lib/utils';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'subscriptions.cash' },
  { value: 'visa', label: 'subscriptions.visa' },
  { value: 'vodafone_cash', label: 'subscriptions.vodafoneCash' },
  { value: 'instapay', label: 'subscriptions.instapay' },
];

export function QuickSellPanel() {
  const { t, i18n } = useTranslation();
  const { data: products } = useProducts();
  const sell = useSellProducts();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const active = (products ?? []).filter((p) => p.isActive);
  const productMap = useMemo(() => new Map(active.map((p) => [p.id, p])), [active]);

  const addToCart = (p: Product) => {
    const current = cart[p.id] ?? 0;
    if (current >= p.stockQuantity) {
      toast.error(t('products.outOfStock'));
      return;
    }
    setCart((c) => ({ ...c, [p.id]: current + 1 }));
  };

  const changeQty = (id: string, delta: number) => {
    setCart((c) => {
      const next = (c[id] ?? 0) + delta;
      if (next <= 0) {
        const { [id]: _, ...rest } = c;
        return rest;
      }
      const stock = productMap.get(id)?.stockQuantity ?? 0;
      return { ...c, [id]: Math.min(next, stock) };
    });
  };

  const removeItem = (id: string) =>
    setCart((c) => {
      const { [id]: _, ...rest } = c;
      return rest;
    });

  const cartEntries = Object.entries(cart);
  const total = cartEntries.reduce((sum, [id, qty]) => sum + Number(productMap.get(id)?.price ?? 0) * qty, 0);

  const checkout = () => {
    const items = cartEntries.map(([productId, quantity]) => ({ productId, quantity }));
    sell.mutate(
      { items, paymentMethod },
      {
        onSuccess: () => {
          toast.success(t('products.saleSuccess'));
          setCart({});
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  };

  const productName = (p: Product) => (i18n.language === 'ar' ? p.nameAr || p.name : p.name);

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <ShoppingCart className="h-5 w-5 text-primary" />
          {t('products.quickSell')}
        </h3>
        {cartEntries.length > 0 && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setCart({})}>
            <Trash2 className="h-4 w-4" />
            {t('products.clearCart')}
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Package className="h-8 w-8" />
          <p className="text-sm">{t('products.noProducts')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {active.map((p) => {
            const out = p.stockQuantity <= 0;
            return (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={out}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition-colors',
                  out ? 'opacity-50' : 'hover:border-primary hover:bg-primary/5'
                )}
              >
                <span className="line-clamp-1 text-sm font-medium">{productName(p)}</span>
                <span className="font-bold text-primary">
                  {formatCurrency(Number(p.price), i18n.language)} {t('common.egp')}
                </span>
                <Badge variant={out ? 'destructive' : p.stockQuantity <= 5 ? 'warning' : 'secondary'} className="text-[10px]">
                  {out ? t('products.outOfStock') : `${t('products.stock')}: ${p.stockQuantity}`}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* Cart */}
      {cartEntries.length > 0 && (
        <div className="mt-4 space-y-3 border-t pt-4">
          {cartEntries.map(([id, qty]) => {
            const p = productMap.get(id);
            if (!p) return null;
            return (
              <div key={id} className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm">{productName(p)}</span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQty(id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{qty}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQty(id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="w-20 text-end text-sm font-semibold">
                  {formatCurrency(Number(p.price) * qty, i18n.language)}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}

          <div className="flex items-center justify-between border-t pt-3">
            <span className="font-semibold">{t('products.total')}</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(total, i18n.language)} {t('common.egp')}
            </span>
          </div>

          <div className="flex gap-2">
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{t(m.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="flex-1 gap-2" onClick={checkout} disabled={sell.isPending}>
              {sell.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {t('products.checkout')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
