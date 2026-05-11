'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart/use-cart';
import { ShoppingCart, Check } from 'lucide-react';

interface Props {
  tenantSlug: string;
  productId: string;
  name: string;
  price: number;
  image?: string;
}

export function AddToCartButton({ tenantSlug, productId, name, price, image }: Props) {
  const { add } = useCart(tenantSlug);
  const [added, setAdded] = useState(false);
  const [, startTransition] = useTransition();

  function handle() {
    startTransition(() => {
      add({ product_id: productId, name, price, image }, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 1400);
    });
  }

  return (
    <Button
      onClick={handle}
      size="sm"
      className="gap-1.5 bg-sky-600 hover:bg-sky-500 text-white"
      data-testid={`add-to-cart-${productId}`}
    >
      {added ? (
        <>
          <Check size={14} /> Added
        </>
      ) : (
        <>
          <ShoppingCart size={14} /> Add
        </>
      )}
    </Button>
  );
}
