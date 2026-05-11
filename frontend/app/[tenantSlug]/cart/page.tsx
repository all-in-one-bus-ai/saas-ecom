'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart/use-cart';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, Minus, Plus, Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CartPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const { items, setQty, remove, total, count } = useCart(tenantSlug);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function checkout() {
    setError(null);
    if (!email) {
      setError('Email is required for order confirmation.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/payments/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          customer_email: email,
          origin_url: window.location.origin,
          items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create checkout');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || 'Checkout failed');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="cart-page">
      <Link
        href={`/${tenantSlug}`}
        className="inline-flex items-center gap-1.5 text-sm mb-6 hover:opacity-80"
        style={{ color: 'var(--color-muted-foreground)' }}
      >
        <ArrowLeft size={14} /> Continue shopping
      </Link>

      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-foreground)' }}
      >
        Your cart
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-muted-foreground)' }}>
        {count === 0 ? 'No items yet' : `${count} item${count > 1 ? 's' : ''}`}
      </p>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingCart size={56} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>
            Your cart is empty
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-muted-foreground)' }}>
            Browse products to add to your cart.
          </p>
          <Button asChild>
            <Link href={`/${tenantSlug}`}>Browse store</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3" data-testid="cart-items">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center gap-4 rounded-xl border p-4"
                style={{ borderColor: 'var(--color-border)' }}
                data-testid={`cart-item-${item.product_id}`}
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden flex items-center justify-center bg-muted/30 shrink-0">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={20} className="text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--color-foreground)' }}>
                    {item.name}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    ${item.price.toFixed(2)} each
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-md border" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    onClick={() => setQty(item.product_id, item.quantity - 1)}
                    className="p-2 hover:opacity-70"
                    data-testid={`qty-dec-${item.product_id}`}
                  >
                    <Minus size={12} />
                  </button>
                  <span className="px-2 text-sm font-medium tabular-nums w-6 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => setQty(item.product_id, item.quantity + 1)}
                    className="p-2 hover:opacity-70"
                    data-testid={`qty-inc-${item.product_id}`}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <p className="font-semibold text-sm tabular-nums w-20 text-right">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
                <button
                  onClick={() => remove(item.product_id)}
                  className="p-1.5 rounded hover:bg-red-50 text-red-600"
                  aria-label="Remove"
                  data-testid={`remove-${item.product_id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl border p-6 h-fit"
            style={{ borderColor: 'var(--color-border)' }}
            data-testid="cart-summary"
          >
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-foreground)' }}>
              Order summary
            </h3>

            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-muted-foreground)' }}>Subtotal</span>
                <span className="tabular-nums">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-muted-foreground)' }}>Shipping</span>
                <span style={{ color: 'var(--color-muted-foreground)' }}>Calculated at checkout</span>
              </div>
              <div
                className="flex justify-between pt-3 border-t font-semibold"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span>Total</span>
                <span className="tabular-nums" data-testid="cart-total">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="email" className="text-xs">
                Email for order confirmation
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1"
                data-testid="checkout-email"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 mb-3" data-testid="checkout-error">
                {error}
              </div>
            )}

            <Button
              onClick={checkout}
              disabled={loading || items.length === 0}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white"
              data-testid="checkout-button"
            >
              {loading ? 'Redirecting…' : `Checkout · $${total.toFixed(2)}`}
            </Button>
            <p className="text-[11px] text-center mt-3" style={{ color: 'var(--color-muted-foreground)' }}>
              Secure payment by Stripe
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
