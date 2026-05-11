'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/use-cart';
import { ShoppingCart } from 'lucide-react';

export function CartIcon({ tenantSlug }: { tenantSlug: string }) {
  const { count } = useCart(tenantSlug);
  return (
    <Link
      href={`/${tenantSlug}/cart`}
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5"
      data-testid="cart-icon"
      aria-label="Cart"
    >
      <ShoppingCart size={18} />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-sky-600 text-white text-[10px] font-semibold flex items-center justify-center px-1"
          data-testid="cart-count"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
