'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowRight, CheckCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function OnboardingPage() {
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const handleSlugGenerate = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setStoreSlug(slug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeSlug.match(/^[a-z0-9-]+$/)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens.');
      return;
    }
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: storeName, slug: storeSlug, plan: 'free' })
      .select()
      .single();

    if (tenantError) {
      if (tenantError.code === '23505') {
        setError('That store URL is already taken. Try another one.');
      } else {
        setError(tenantError.message);
      }
      setLoading(false);
      return;
    }

    await supabase.from('tenant_memberships').insert({
      user_id: user.id,
      tenant_id: tenant.id,
      role: 'store_admin',
    });

    const { data: minimalTheme } = await supabase
      .from('themes')
      .select('id')
      .eq('slug', 'minimal')
      .maybeSingle();

    if (minimalTheme) {
      await supabase.from('tenant_themes').insert({
        tenant_id: tenant.id,
        theme_id: minimalTheme.id,
        config: {},
        is_active: true,
      });
    }

    router.push(`/store/${storeSlug}/admin`);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-sky-500 rounded-xl mb-4">
            <ShoppingBag size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set up your store</h1>
          <p className="text-slate-400 mt-1 text-sm">Just two things to get started</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="storeName" className="text-slate-300 text-sm">Store Name</Label>
              <Input
                id="storeName"
                type="text"
                placeholder="My Amazing Store"
                value={storeName}
                onChange={(e) => {
                  setStoreName(e.target.value);
                  handleSlugGenerate(e.target.value);
                }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storeSlug" className="text-slate-300 text-sm">Store URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm shrink-0">shopstack.com/</span>
                <Input
                  id="storeSlug"
                  type="text"
                  placeholder="my-store"
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value.toLowerCase())}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500"
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
              <p className="text-xs text-slate-500">
                Your public store URL. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !storeName || !storeSlug}
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold gap-2"
            >
              {loading ? 'Creating store...' : (
                <>Create My Store <ArrowRight size={16} /></>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
