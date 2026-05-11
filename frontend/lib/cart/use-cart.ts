'use client';

import { useEffect, useState, useCallback } from 'react';

export type CartItem = {
  product_id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
};

type CartState = { [tenantSlug: string]: CartItem[] };

const STORAGE_KEY = 'shopstack_cart_v1';

function readAll(): CartState {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(state: CartState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('cart-changed'));
}

export function useCart(tenantSlug: string) {
  const [items, setItems] = useState<CartItem[]>([]);

  const refresh = useCallback(() => {
    const all = readAll();
    setItems(all[tenantSlug] ?? []);
  }, [tenantSlug]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener('cart-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('cart-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [refresh]);

  const add = useCallback(
    (item: Omit<CartItem, 'quantity'>, qty = 1) => {
      const all = readAll();
      const list = [...(all[tenantSlug] ?? [])];
      const idx = list.findIndex((i) => i.product_id === item.product_id);
      if (idx >= 0) list[idx] = { ...list[idx], quantity: list[idx].quantity + qty };
      else list.push({ ...item, quantity: qty });
      all[tenantSlug] = list;
      writeAll(all);
    },
    [tenantSlug]
  );

  const setQty = useCallback(
    (product_id: string, qty: number) => {
      const all = readAll();
      let list = all[tenantSlug] ?? [];
      if (qty <= 0) list = list.filter((i) => i.product_id !== product_id);
      else list = list.map((i) => (i.product_id === product_id ? { ...i, quantity: qty } : i));
      all[tenantSlug] = list;
      writeAll(all);
    },
    [tenantSlug]
  );

  const remove = useCallback(
    (product_id: string) => setQty(product_id, 0),
    [setQty]
  );

  const clear = useCallback(() => {
    const all = readAll();
    delete all[tenantSlug];
    writeAll(all);
  }, [tenantSlug]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, add, setQty, remove, clear, total, count };
}
