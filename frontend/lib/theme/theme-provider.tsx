'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ThemeConfig } from '@/lib/types/database';
import { THEMES, buildCSSVariables, mergeThemeConfig } from './themes';

interface ThemeContextValue {
  themeSlug: string;
  config: ThemeConfig;
  setThemeSlug: (slug: string) => void;
  updateConfig: (overrides: Partial<ThemeConfig>) => void;
  isDirty: boolean;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface StorefrontThemeProviderProps {
  children: React.ReactNode;
  initialSlug: string;
  initialConfig?: Partial<ThemeConfig>;
}

export function StorefrontThemeProvider({
  children,
  initialSlug,
  initialConfig = {},
}: StorefrontThemeProviderProps) {
  const baseTheme = THEMES[initialSlug] ?? THEMES['minimal'];
  const [themeSlug, setThemeSlug] = useState(initialSlug);
  const [config, setConfig] = useState<ThemeConfig>(() =>
    mergeThemeConfig(baseTheme, initialConfig)
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const base = THEMES[themeSlug] ?? THEMES['minimal'];
    setConfig(mergeThemeConfig(base, initialConfig));
    setIsDirty(false);
  }, [themeSlug]);

  useEffect(() => {
    const vars = buildCSSVariables(config);
    const styleId = 'theme-css-vars';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `:root { ${vars} }`;

    if (config.fonts.heading !== 'Inter' || config.fonts.body !== 'Inter') {
      const fontFaces = [config.fonts.heading, config.fonts.body]
        .filter((f, i, arr) => f !== 'Inter' && arr.indexOf(f) === i)
        .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700`)
        .join('&');
      const linkId = 'theme-google-fonts';
      let linkEl = document.getElementById(linkId) as HTMLLinkElement | null;
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.id = linkId;
        linkEl.rel = 'stylesheet';
        document.head.appendChild(linkEl);
      }
      if (fontFaces) {
        linkEl.href = `https://fonts.googleapis.com/css2?${fontFaces}&display=swap`;
      }
    }
  }, [config]);

  const updateConfig = (overrides: Partial<ThemeConfig>) => {
    setConfig((prev) => mergeThemeConfig(prev, overrides));
    setIsDirty(true);
  };

  const resetTheme = () => {
    const base = THEMES[themeSlug] ?? THEMES['minimal'];
    setConfig(mergeThemeConfig(base, initialConfig));
    setIsDirty(false);
  };

  return (
    <ThemeContext.Provider value={{ themeSlug, config, setThemeSlug, updateConfig, isDirty, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useStorefrontTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useStorefrontTheme must be used within StorefrontThemeProvider');
  return ctx;
}
