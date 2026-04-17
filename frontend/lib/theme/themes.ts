import type { ThemeConfig } from '@/lib/types/database';

export const THEMES: Record<string, ThemeConfig> = {
  minimal: {
    colors: {
      primary: '#0f172a',
      primary_foreground: '#f8fafc',
      secondary: '#f1f5f9',
      secondary_foreground: '#0f172a',
      accent: '#0ea5e9',
      accent_foreground: '#ffffff',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f8fafc',
      muted_foreground: '#64748b',
      border: '#e2e8f0',
      card: '#ffffff',
      card_foreground: '#0f172a',
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    radius: '0.375rem',
    layout: {
      header_sticky: true,
      show_announcement_bar: false,
      product_grid_cols: 3,
      show_product_quick_view: true,
    },
  },
  bold: {
    colors: {
      primary: '#dc2626',
      primary_foreground: '#ffffff',
      secondary: '#fef2f2',
      secondary_foreground: '#dc2626',
      accent: '#f97316',
      accent_foreground: '#ffffff',
      background: '#ffffff',
      foreground: '#111827',
      muted: '#f9fafb',
      muted_foreground: '#6b7280',
      border: '#e5e7eb',
      card: '#ffffff',
      card_foreground: '#111827',
    },
    fonts: { heading: 'Montserrat', body: 'Inter' },
    radius: '0.125rem',
    layout: {
      header_sticky: true,
      show_announcement_bar: true,
      product_grid_cols: 4,
      show_product_quick_view: false,
    },
  },
  classic: {
    colors: {
      primary: '#292524',
      primary_foreground: '#fafaf9',
      secondary: '#fafaf9',
      secondary_foreground: '#292524',
      accent: '#b45309',
      accent_foreground: '#ffffff',
      background: '#fffbf5',
      foreground: '#1c1917',
      muted: '#f5f5f4',
      muted_foreground: '#78716c',
      border: '#d6d3d1',
      card: '#ffffff',
      card_foreground: '#1c1917',
    },
    fonts: { heading: 'Playfair Display', body: 'Lora' },
    radius: '0.25rem',
    layout: {
      header_sticky: false,
      show_announcement_bar: true,
      product_grid_cols: 3,
      show_product_quick_view: true,
    },
  },
};

export function buildCSSVariables(config: ThemeConfig): string {
  const { colors, fonts, radius } = config;
  return `
    --color-primary: ${colors.primary};
    --color-primary-foreground: ${colors.primary_foreground};
    --color-secondary: ${colors.secondary};
    --color-secondary-foreground: ${colors.secondary_foreground};
    --color-accent: ${colors.accent};
    --color-accent-foreground: ${colors.accent_foreground};
    --color-background: ${colors.background};
    --color-foreground: ${colors.foreground};
    --color-muted: ${colors.muted};
    --color-muted-foreground: ${colors.muted_foreground};
    --color-border: ${colors.border};
    --color-card: ${colors.card};
    --color-card-foreground: ${colors.card_foreground};
    --font-heading: '${fonts.heading}', sans-serif;
    --font-body: '${fonts.body}', sans-serif;
    --radius: ${radius};
  `.trim();
}

export function mergeThemeConfig(base: ThemeConfig, overrides: Partial<ThemeConfig>): ThemeConfig {
  return {
    colors: { ...base.colors, ...(overrides.colors ?? {}) },
    fonts: { ...base.fonts, ...(overrides.fonts ?? {}) },
    radius: overrides.radius ?? base.radius,
    layout: { ...base.layout, ...(overrides.layout ?? {}) },
  };
}
