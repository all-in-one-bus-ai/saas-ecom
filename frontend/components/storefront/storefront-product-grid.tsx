'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { AddToCartButton } from './add-to-cart-button';
import { formatPrice, DEFAULT_CURRENCY } from '@/lib/currency';
import type { ProductImage } from '@/lib/types/database';

interface ProductWithVariants {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  images: unknown;
  is_featured: boolean;
  categories: { name: string } | null;
  product_variants: { id: string; stock_qty: number; price_override: number | null }[] | null;
}

interface Props {
  products: ProductWithVariants[];
  tenantSlug: string;
  currency?: string;
}

function ProductCard({ product, tenantSlug, currency }: { product: ProductWithVariants; tenantSlug: string; currency: string }) {
  const images = product.images as ProductImage[] | null;
  const image = images?.[0];
  const variants = product.product_variants ?? [];
  const totalStock = variants.reduce((s, v) => s + (v.stock_qty ?? 0), 0);
  const isOutOfStock = totalStock === 0;
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  return (
    <div
      className="group block rounded-xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      data-testid={`product-card-${product.id}`}
    >
      <Link href={`/${tenantSlug}/products/${product.slug}`} className="block">
        <div className="relative overflow-hidden aspect-square bg-muted/30">
          {image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={image.alt || product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={40} className="text-muted-foreground/30" />
            </div>
          )}

          {hasDiscount && (
            <div
              className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-xs font-bold"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
            >
              -{discountPct}%
            </div>
          )}

          {product.is_featured && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500 text-white">
              Featured
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-sm font-semibold text-muted-foreground">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        {product.categories && (
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-accent)' }}
          >
            {product.categories.name}
          </p>
        )}
        <Link href={`/${tenantSlug}/products/${product.slug}`}>
          <h3
            className="font-semibold text-sm leading-tight mb-2 line-clamp-2 transition-colors hover:opacity-80"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-card-foreground)' }}
          >
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: 'var(--color-foreground)' }}>
              {formatPrice(product.price, currency)}
            </span>
            {hasDiscount && (
              <span className="text-sm line-through" style={{ color: 'var(--color-muted-foreground)' }}>
                {formatPrice(product.compare_at_price!, currency)}
              </span>
            )}
          </div>
          {!isOutOfStock && (
            <AddToCartButton
              tenantSlug={tenantSlug}
              productId={product.id}
              name={product.name}
              price={product.price}
              image={image?.url}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function StorefrontProductGrid({ products, tenantSlug, currency = DEFAULT_CURRENCY }: Props) {
  if (products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Package size={48} className="mx-auto mb-4 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>
          No products yet
        </h2>
        <p style={{ color: 'var(--color-muted-foreground)' }}>Check back soon for new arrivals.</p>
      </div>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-foreground)' }}
          >
            Our Products
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {products.length} items available
          </p>
        </div>
      </div>

      <div
        className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        data-testid="product-grid"
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} tenantSlug={tenantSlug} currency={currency} />
        ))}
      </div>
    </section>
  );
}
