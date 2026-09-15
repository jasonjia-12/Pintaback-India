"use client";

export type CartItem = { sku: string; qty: number };

function key(siteId: string) {
  return `ptb_cart_${siteId}`;
}

export function getCart(siteId: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(siteId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((i: CartItem) => i && typeof i.sku === "string" && Number.isFinite(i.qty))
      : [];
  } catch {
    return [];
  }
}

function save(siteId: string, items: CartItem[]) {
  window.localStorage.setItem(key(siteId), JSON.stringify(items));
  window.dispatchEvent(new Event("ptb-cart-changed"));
}

export function addToCart(siteId: string, sku: string, qty = 1) {
  const items = getCart(siteId);
  const hit = items.find((i) => i.sku === sku);
  if (hit) hit.qty += qty;
  else items.push({ sku, qty });
  save(siteId, items);
}

export function setCartItemQty(siteId: string, sku: string, qty: number) {
  const items = getCart(siteId);
  if (qty <= 0) save(siteId, items.filter((i) => i.sku !== sku));
  else {
    const hit = items.find((i) => i.sku === sku);
    if (hit) hit.qty = qty;
    else items.push({ sku, qty });
    save(siteId, items);
  }
}

export function clearCart(siteId: string) {
  save(siteId, []);
}

export function cartCount(siteId: string): number {
  return getCart(siteId).reduce((s, i) => s + i.qty, 0);
}
