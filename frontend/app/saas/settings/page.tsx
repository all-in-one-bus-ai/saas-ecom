import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireSuperAdmin } from '@/lib/auth/get-session';
import { getPlatformSettings } from '@/lib/actions/platform-settings';
import { Key, Database, CreditCard } from 'lucide-react';
import { PlatformSettingsForm } from './settings-form';

export const metadata = { title: 'Platform Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const settings = await getPlatformSettings();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'not configured';
  const supabaseHost = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasStripe = !!process.env.STRIPE_SECRET_KEY;

  return (
    <div className="animate-in max-w-3xl" data-testid="saas-settings-page">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Platform Settings</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure global options and view integration status
          </p>
        </div>
      </div>

      <PlatformSettingsForm initial={settings} />

      <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Integrations</h3>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Database size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Supabase</p>
              <p className="text-xs text-muted-foreground font-mono">{supabaseHost}</p>
            </div>
          </div>
          <span className="rounded-md bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 font-medium">Connected</span>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${hasServiceKey ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <Key size={16} className={hasServiceKey ? 'text-emerald-600' : 'text-amber-600'} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Service role key</p>
              <p className="text-xs text-muted-foreground">Required for admin user management</p>
            </div>
          </div>
          <span className={`rounded-md text-xs px-2 py-0.5 font-medium ${hasServiceKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {hasServiceKey ? 'Configured' : 'Missing'}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${hasStripe ? 'bg-emerald-50' : 'bg-slate-100'}`}>
              <CreditCard size={16} className={hasStripe ? 'text-emerald-600' : 'text-slate-500'} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Stripe</p>
              <p className="text-xs text-muted-foreground">Payment processing for tenant subscriptions &amp; checkout</p>
            </div>
          </div>
          <span className={`rounded-md text-xs px-2 py-0.5 font-medium ${hasStripe ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {hasStripe ? 'Configured' : 'Not configured'}
          </span>
        </div>
      </div>
    </div>
  );
}
