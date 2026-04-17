'use client';

import Link from 'next/link';
import { ShoppingCart, Search, Menu, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Category } from '@/lib/types/database';

interface Props {
  tenantSlug: string;
  storeName: string;
  categories: Category[];
}

export function StorefrontHeader({ tenantSlug, storeName, categories }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="border-b"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
        position: 'var(--header-position, relative)' as 'relative',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-6">
          <Link
            href={`/${tenantSlug}`}
            className="text-xl font-bold shrink-0"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-foreground)' }}
          >
            {storeName}
          </Link>

          {categories.length > 0 && (
            <nav className="hidden md:flex items-center gap-1 flex-1">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${tenantSlug}/category/${cat.slug}`}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{ color: 'var(--color-muted-foreground)' }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.color = 'var(--color-foreground)';
                    (e.target as HTMLElement).style.backgroundColor = 'var(--color-muted)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.color = 'var(--color-muted-foreground)';
                    (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <Search size={18} />
            </button>

            <Link
              href={`/${tenantSlug}/cart`}
              className="p-2 rounded-lg transition-colors relative"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <ShoppingCart size={18} />
            </Link>

            <button
              className="md:hidden p-2 rounded-lg"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && categories.length > 0 && (
        <div
          className="md:hidden border-t py-4 px-4"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <nav className="space-y-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${tenantSlug}/category/${cat.slug}`}
                className="block px-3 py-2 rounded-lg text-sm font-medium"
                style={{ color: 'var(--color-foreground)' }}
                onClick={() => setMobileOpen(false)}
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
