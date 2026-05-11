'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/currency';

export default function BillingSuccessPage() {
  const search = useSearchParams();
  const sessionId = search.get('session_id');
  const router = useRouter();
  const [state, setState] = useState<'polling' | 'success' | 'failed' | 'pending'>('polling');
  const [details, setDetails] = useState<{ amount?: number; tenantSlug?: string; plan?: string; currency?: string } | null>(null);

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
          setDetails({
            amount: data.amount_total / 100,
            tenantSlug: data.metadata?.tenant_slug,
            plan: data.metadata?.plan,
            currency: data.currency,
          });
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
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="max-w-md text-center" data-testid="billing-success-page">
        {state === 'polling' && (
          <>
            <Loader2 size={48} className="mx-auto mb-4 animate-spin text-sky-400" />
            <h1 className="text-2xl font-bold mb-2">Confirming your subscription…</h1>
            <p className="text-slate-400 text-sm">Hang tight while we activate your plan.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle2 size={56} className="mx-auto mb-4 text-emerald-400" />
            <h1 className="text-2xl font-bold mb-2 capitalize">{details?.plan} plan activated</h1>
            <p className="text-slate-400 text-sm mb-6">
              Thanks for upgrading. Your plan is now live, and we&apos;ve charged{' '}
              <strong>{formatPrice(details?.amount ?? 0, (details?.currency ?? 'USD').toUpperCase())}</strong> for this month.
            </p>
            {details?.tenantSlug ? (
              <Button asChild className="bg-sky-500 hover:bg-sky-400 text-white">
                <Link href={`/store/${details.tenantSlug}/admin/billing`}>Back to billing</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/">Back to dashboard</Link>
              </Button>
            )}
          </>
        )}
        {state === 'pending' && (
          <>
            <Loader2 size={48} className="mx-auto mb-4 text-amber-400" />
            <h1 className="text-2xl font-bold mb-2">Still processing…</h1>
            <p className="text-slate-400 text-sm mb-6">
              Your payment is taking longer than usual. We&apos;ll email you once it&apos;s done.
            </p>
          </>
        )}
        {state === 'failed' && (
          <>
            <AlertCircle size={56} className="mx-auto mb-4 text-red-400" />
            <h1 className="text-2xl font-bold mb-2">Payment not confirmed</h1>
            <p className="text-slate-400 text-sm mb-6">
              We couldn&apos;t confirm your payment. If you were charged, please contact support.
            </p>
            <Button asChild variant="outline">
              <Link href="/">Back home</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
