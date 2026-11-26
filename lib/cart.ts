export interface CartItem {
  templateId: string;
  name: string;
  price: number;
  thumbnailUrl: string;
  categoryName?: string;
  slug: string;
}

const CART_KEY = 'helpot_cart_items';

export function getLocalCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToLocalCart(item: CartItem): CartItem[] {
  const current = getLocalCart();
  if (current.some(c => c.templateId === item.templateId)) {
    return current; // already in cart
  }
  const updated = [...current, item];
  localStorage.setItem(CART_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('cart-updated'));
  return updated;
}

export function removeFromLocalCart(templateId: string): CartItem[] {
  const current = getLocalCart();
  const updated = current.filter(c => c.templateId !== templateId);
  localStorage.setItem(CART_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('cart-updated'));
  return updated;
}

export function clearLocalCart(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event('cart-updated'));
}

export function calculateCartTotal(items: CartItem[], promoCode?: string): { subtotal: number; discount: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  let discount = 0;
  if (promoCode && promoCode.toUpperCase() === 'WELCOME10') {
    discount = subtotal * 0.10; // 10% off
  } else if (promoCode && promoCode.toUpperCase() === 'HELPOT20') {
    discount = subtotal * 0.20; // 20% off
  }
  return {
    subtotal,
    discount,
    total: Math.max(0, subtotal - discount)
  };
}
