'use client';

import { useState, useTransition } from 'react';
import { Check, Eye, Palette } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import type { Theme, TenantTheme } from '@/lib/types/database';
import type { ThemeConfig } from '@/lib/types/database';
import { THEMES, buildCSSVariables } from '@/lib/theme/themes';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface ThemeSelectorProps {
  themes: Theme[];
  activeTheme: (TenantTheme & { themes: Theme }) | null;
  tenantSlug: string;
  tenantId: string;
}

const THEME_PREVIEWS: Record<string, { accent: string; bg: string; text: string; header: string }> = {
  minimal: { accent: '#0ea5e9', bg: '#ffffff', text: '#0f172a', header: '#0f172a' },
  bold: { accent: '#f97316', bg: '#ffffff', text: '#111827', header: '#dc2626' },
  classic: { accent: '#b45309', bg: '#fffbf5', text: '#1c1917', header: '#292524' },
};

function ThemePreviewCard({
  theme,
  isActive,
  onSelect,
}: {
  theme: Theme;
  isActive: boolean;
  onSelect: () => void;
}) {
  const preview = THEME_PREVIEWS[theme.slug] ?? THEME_PREVIEWS['minimal'];

  return (
    <div
      className={`relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isActive ? 'border-sky-500 shadow-sky-100 shadow-md' : 'border-border hover:border-sky-300'
      }`}
      onClick={onSelect}
    >
      {isActive && (
        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center shadow-sm">
          <Check size={13} className="text-white" />
        </div>
      )}
      <div
        className="h-32 relative"
        style={{ backgroundColor: preview.bg }}
      >
        <div
          className="h-8 w-full flex items-center px-4 gap-2"
          style={{ backgroundColor: preview.header }}
        >
          <div className="w-3 h-3 rounded bg-white opacity-60" />
          <div className="h-1.5 w-16 rounded bg-white opacity-40" />
          <div className="ml-auto flex gap-2">
            <div className="h-1.5 w-8 rounded bg-white opacity-30" />
            <div className="h-1.5 w-8 rounded bg-white opacity-30" />
          </div>
        </div>
        <div className="p-4">
          <div className="h-2 w-24 rounded mb-2" style={{ backgroundColor: preview.text, opacity: 0.8 }} />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded overflow-hidden border" style={{ borderColor: preview.accent + '33' }}>
                <div className="h-8 bg-muted/30" />
                <div className="p-1.5">
                  <div className="h-1 rounded" style={{ backgroundColor: preview.text, opacity: 0.5, width: '70%' }} />
                  <div className="h-1 rounded mt-1" style={{ backgroundColor: preview.accent, opacity: 0.7, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 bg-background border-t">
        <p className="font-semibold text-sm text-foreground">{theme.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
      </div>
    </div>
  );
}

export function ThemeSelector({ themes, activeTheme, tenantSlug, tenantId }: ThemeSelectorProps) {
  const [selectedSlug, setSelectedSlug] = useState(
    (activeTheme?.themes as Theme)?.slug ?? 'minimal'
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseBrowserClient();

  const handleApplyTheme = async () => {
    const selectedTheme = themes.find((t) => t.slug === selectedSlug);
    if (!selectedTheme) return;

    startTransition(async () => {
      await supabase
        .from('tenant_themes')
        .update({ is_active: false })
        .eq('tenant_id', tenantId);

      const { error } = await supabase
        .from('tenant_themes')
        .upsert({
          tenant_id: tenantId,
          theme_id: selectedTheme.id,
          config: {},
          is_active: true,
        }, { onConflict: 'tenant_id,theme_id' });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Theme applied!', description: `${selectedTheme.name} theme is now active on your storefront.` });
        router.refresh();
      }
    });
  };

  const currentActive = (activeTheme?.themes as Theme)?.slug;
  const hasChanges = selectedSlug !== currentActive;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Palette size={16} /> Choose a Theme
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <ThemePreviewCard
              key={theme.id}
              theme={theme}
              isActive={selectedSlug === theme.slug}
              onSelect={() => setSelectedSlug(theme.slug)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {hasChanges
              ? `Apply the "${themes.find((t) => t.slug === selectedSlug)?.name}" theme to your storefront`
              : 'Your theme is up to date'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Theme changes apply immediately to your public storefront without reload.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/${tenantSlug}`} target="_blank" className="gap-1.5">
              <Eye size={14} /> Preview
            </a>
          </Button>
          <Button
            onClick={handleApplyTheme}
            disabled={!hasChanges || isPending}
            size="sm"
            className="bg-sky-600 hover:bg-sky-500 text-white"
          >
            {isPending ? 'Applying...' : 'Apply Theme'}
          </Button>
        </div>
      </div>
    </div>
  );
}
