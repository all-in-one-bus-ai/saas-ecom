'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTenant } from '@/lib/actions/tenants';
import { Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTenantPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [plan, setPlan] = useState('free');

  const handleName = (v: string) => {
    setName(v);
    if (!slug || slug === suggest(name)) setSlug(suggest(v));
  };

  function suggest(n: string) {
    return n
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 50);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set('name', name);
    fd.set('slug', slug);
    fd.set('description', description);
    fd.set('plan', plan);

    startTransition(async () => {
      const res = await createTenant(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        router.push('/saas/tenants');
      }
    });
  }

  return (
    <div className="animate-in max-w-2xl" data-testid="new-tenant-page">
      <Link
        href="/saas/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        data-testid="back-to-tenants"
      >
        <ArrowLeft size={14} /> Back to tenants
      </Link>

      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Create new tenant</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Provision a new store on the platform
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border bg-card shadow-sm p-6 space-y-5"
        data-testid="new-tenant-form"
      >
        <div>
          <Label htmlFor="name">Store name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => handleName(e.target.value)}
            placeholder="Acme Outfitters"
            required
            minLength={2}
            maxLength={100}
            className="mt-1.5"
            data-testid="tenant-name-input"
          />
        </div>

        <div>
          <Label htmlFor="slug">URL slug</Label>
          <div className="mt-1.5 flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted/50 border-r">
              /
            </span>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="acme-outfitters"
              required
              minLength={2}
              maxLength={50}
              pattern="[a-z0-9\-]+"
              className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
              data-testid="tenant-slug-input"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Lowercase letters, numbers and hyphens only. Becomes the store URL: /{slug || 'your-slug'}
          </p>
        </div>

        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Premium outdoor gear for adventurers."
            maxLength={500}
            rows={3}
            className="mt-1.5"
            data-testid="tenant-description-input"
          />
        </div>

        <div>
          <Label htmlFor="plan">Plan</Label>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger id="plan" className="mt-1.5" data-testid="tenant-plan-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700" data-testid="form-error">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-sky-600 hover:bg-sky-500 text-white gap-2"
            data-testid="submit-tenant"
          >
            <Building2 size={16} />
            {isPending ? 'Creating…' : 'Create tenant'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/saas/tenants')}
            data-testid="cancel-tenant"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
