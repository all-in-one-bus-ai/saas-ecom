'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, CheckCircle2 } from 'lucide-react';
import { updateTenantSettings } from '@/lib/actions/tenant-settings';
import { SUPPORTED_CURRENCIES, formatPrice } from '@/lib/currency';

interface Props {
  tenantId: string;
  tenantSlug: string;
  initial: {
    name: string;
    description: string;
    currency: string;
  };
  effectiveCurrency: string;
}

export function TenantSettingsForm({ tenantId, tenantSlug, initial, effectiveCurrency }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [currency, setCurrency] = useState(initial.currency || effectiveCurrency);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const fd = new FormData();
    fd.set('tenant_id', tenantId);
    fd.set('tenant_slug', tenantSlug);
    fd.set('name', name);
    fd.set('description', description);
    fd.set('currency', currency);

    startTransition(async () => {
      const res = await updateTenantSettings(fd);
      if (res?.error) setResult({ error: res.error });
      else setResult({ ok: true });
    });
  }

  const sampleAmount = 49.99;
  const usingPlatformDefault = !initial.currency;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border bg-white shadow-sm p-6 space-y-5"
      data-testid="tenant-settings-form"
    >
      <h3 className="font-semibold text-foreground">Store profile</h3>

      <div>
        <Label htmlFor="name">Store name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          className="mt-1.5"
          data-testid="tenant-name-input"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1.5"
          data-testid="tenant-description-input"
        />
      </div>

      <div className="border-t pt-5">
        <h3 className="font-semibold text-foreground">Currency</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">
          Currency shoppers see in product cards, cart, checkout, and order receipts. Stripe
          processes payments in this currency.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="currency">Display currency</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              data-testid="tenant-currency-select"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.symbol} · {c.name}
                </option>
              ))}
            </select>
            {usingPlatformDefault && (
              <p className="text-xs text-amber-600 mt-1">
                Currently inheriting platform default ({effectiveCurrency}). Pick one above to lock
                your store&apos;s currency.
              </p>
            )}
          </div>
          <div className="rounded-md border bg-muted/30 p-3" data-testid="currency-preview">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Preview</p>
            <p className="text-lg font-semibold">{formatPrice(sampleAmount, currency)}</p>
          </div>
        </div>
      </div>

      {result?.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700" data-testid="tenant-settings-error">
          {result.error}
        </div>
      )}
      {result?.ok && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 flex items-center gap-2" data-testid="tenant-settings-success">
          <CheckCircle2 size={14} /> Settings saved.
        </div>
      )}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-sky-600 hover:bg-sky-500 text-white gap-2"
          data-testid="save-tenant-settings"
        >
          <Save size={16} /> {isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
