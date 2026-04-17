'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, CheckCircle2 } from 'lucide-react';
import { updatePlatformSettings, type PlatformSettings } from '@/lib/actions/platform-settings';

export function PlatformSettingsForm({ initial }: { initial: PlatformSettings }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updatePlatformSettings(fd);
      if (res?.error) setResult({ error: res.error });
      else setResult({ ok: true });
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border bg-card shadow-sm p-6 space-y-5 mb-6"
      data-testid="platform-settings-form"
    >
      <h3 className="font-semibold text-foreground">General</h3>

      <div>
        <Label htmlFor="platform_name">Platform name</Label>
        <Input
          id="platform_name"
          name="platform_name"
          defaultValue={initial.platform_name}
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
          defaultValue={initial.support_email}
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
          defaultValue={initial.default_plan}
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
          <Switch id="allow_signups" name="allow_signups" defaultChecked={initial.allow_signups} data-testid="setting-allow-signups" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="maintenance_mode" className="text-sm font-medium">Maintenance mode</Label>
            <p className="text-xs text-muted-foreground mt-0.5">When enabled, show a maintenance banner on storefronts.</p>
          </div>
          <Switch id="maintenance_mode" name="maintenance_mode" defaultChecked={initial.maintenance_mode} data-testid="setting-maintenance" />
        </div>
      </div>

      {result?.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700" data-testid="settings-error">
          {result.error}
        </div>
      )}
      {result?.ok && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 flex items-center gap-2" data-testid="settings-success">
          <CheckCircle2 size={14} /> Settings saved.
        </div>
      )}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-sky-600 hover:bg-sky-500 text-white gap-2"
          data-testid="save-settings"
        >
          <Save size={16} /> {isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
