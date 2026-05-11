'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/lib/cart/use-cart';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CheckoutSuccessPage() {
  const params = useParams<{ tenantSlug: string }>();
  const search = useSearchParams();
  const sessionId = search.get('session_id');
  const tenantSlug = params.tenantSlug;
  const { clear } = useCart(tenantSlug);
  const [state, setState] = useState<'polling' | 'success' | 'failed' | 'pending'>('polling');
  const [details, setDetails] = useState<{ amount?: number; currency?: string } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setState('failed');
      return;
    }
    let attempts = 0;
    let timer: any;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/payments/status/${sessionId}`);
        const data = await res.json();
        if (data.payment_status === 'paid') {
          setState('success');
          setDetails({ amount: data.amount_total / 100, currency: data.currency });
          clear();
          return;
        }
        if (data.status === 'expired') {
          setState('failed');
          return;
        }
        if (attempts >= 8) {
          setState('pending');
          return;
        }
        timer = setTimeout(poll, 2000);
      } catch {
        if (attempts >= 8) setState('failed');
        else timer = setTimeout(poll, 2000);
      }
    };
    poll();
    return () => timer && clearTimeout(timer);
  }, [sessionId, clear]);

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center" data-testid="checkout-success-page">
      {state === 'polling' && (
        <>
          <Loader2 size={48} className="mx-auto mb-4 animate-spin text-sky-500" />
          <h1 className="text-2xl font-bold mb-2">Confirming your payment…</h1>
          <p className="text-muted-foreground text-sm">Hang tight, this usually takes a few seconds.</p>
        </>
      )}
      {state === 'success' && (
        <>
          <CheckCircle2 size={56} className="mx-auto mb-4 text-emerald-500" data-testid="success-icon" />
          <h1 className="text-2xl font-bold mb-2">Thank you for your order!</h1>
          <p className="text-muted-foreground text-sm mb-6">
            We&apos;ve received your payment of{' '}
            <strong>
              ${details?.amount?.toFixed(2)} {details?.currency?.toUpperCase()}
            </strong>
            . You&apos;ll get a confirmation email shortly.
          </p>
          <Button asChild>
            <Link href={`/${tenantSlug}`}>Continue shopping</Link>
          </Button>
        </>
      )}
      {state === 'pending' && (
        <>
          <Loader2 size={48} className="mx-auto mb-4 text-amber-500" />
          <h1 className="text-2xl font-bold mb-2">Still processing…</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Your payment is taking a little longer than usual. You&apos;ll receive an email once it&apos;s
            confirmed.
          </p>
          <Button asChild variant="outline">
            <Link href={`/${tenantSlug}`}>Back to store</Link>
          </Button>
        </>
      )}
      {state === 'failed' && (
        <>
          <AlertCircle size={56} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Payment not confirmed</h1>
          <p className="text-muted-foreground text-sm mb-6">
            We couldn&apos;t verify your payment. If you were charged, please contact support.
          </p>
          <Button asChild variant="outline">
            <Link href={`/${tenantSlug}/cart`}>Back to cart</Link>
          </Button>
        </>
      )}
    </div>
  );
}
