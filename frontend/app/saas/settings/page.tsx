import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireSuperAdmin } from '@/lib/auth/get-session';
import { getPlatformSettings, updatePlatformSettings } from '@/lib/actions/platform-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Key, Database, Mail } from 'lucide-react';

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

  async function save(formData: FormData) {
    'use server';
    await updatePlatformSettings(formData);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'not configured';
  const supabaseHost = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

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

      <form action={save} className="rounded-xl border bg-card shadow-sm p-6 space-y-5 mb-6" data-testid="platform-settings-form">
        <h3 className="font-semibold text-foreground">General</h3>

        <div>
          <Label htmlFor="platform_name">Platform name</Label>
          <Input
            id="platform_name"
            name="platform_name"
            defaultValue={settings.platform_name}
            maxLength={100}
            required
            className="mt-1.5"
            data-testid="setting-platform-name"
          />
          <p className="text-xs text-muted-foreground mt-1">Shown in page titles and the sidebar.</p>
        </div>

        <div>
          <Label htmlFor="support_email">Support email</Label>
          <Input
            id="support_email"
            name="support_email"
            type="email"
            defaultValue={settings.support_email}
            placeholder="support@yourplatform.com"
            className="mt-1.5"
            data-testid="setting-support-email"
          />
        </div>

        <div>
          <Label htmlFor="default_plan">Default plan for new tenants</Label>
          <select
            id="default_plan"
            name="default_plan"
            defaultValue={settings.default_plan}
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="setting-default-plan"
          >
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div className="border-t pt-5 space-y-4">
          <h3 className="font-semibold text-foreground">Access control</h3>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allow_signups" className="text-sm font-medium">Allow new sign-ups</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Turn off to block public /register endpoint.</p>
            </div>
            <Switch id="allow_signups" name="allow_signups" defaultChecked={settings.allow_signups} data-testid="setting-allow-signups" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenance_mode" className="text-sm font-medium">Maintenance mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When enabled, show a maintenance banner on storefronts.</p>
            </div>
            <Switch id="maintenance_mode" name="maintenance_mode" defaultChecked={settings.maintenance_mode} data-testid="setting-maintenance" />
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white gap-2" data-testid="save-settings">
            <Save size={16} /> Save settings
          </Button>
        </div>
      </form>

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
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${process.env.STRIPE_SECRET_KEY ? 'bg-emerald-50' : 'bg-slate-100'}`}>
              <Mail size={16} className={process.env.STRIPE_SECRET_KEY ? 'text-emerald-600' : 'text-slate-500'} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Stripe</p>
              <p className="text-xs text-muted-foreground">Payment processing for tenant subscriptions & checkout</p>
            </div>
          </div>
          <span className={`rounded-md text-xs px-2 py-0.5 font-medium ${process.env.STRIPE_SECRET_KEY ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}
          </span>
        </div>
      </div>
    </div>
  );
}
