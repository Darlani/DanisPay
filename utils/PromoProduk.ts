/**
 * PUSAT DATA PROMO & BADGE
 * Fokus: Menampilkan label promo pada item yang tersedia.
 */
export const PROMO_DATA = {
  // Item dengan label DISKON
  discounts: [
    { id: 'ml-344', label: 'DISKON 5%' },
  ],

  // Item dengan label PROMO / POPULER
  promos: [
    { id: 'ml-28', label: 'HOT 🔥' },
    { id: 'pln-token', label: 'PROMO' },
  ],
};

export const getPromoLabel = (itemId: string): string | null => {
  const discount = PROMO_DATA.discounts.find(d => d.id === itemId);
  if (discount) return discount.label;

  const promo = PROMO_DATA.promos.find(p => p.id === itemId);
  if (promo) return promo.label;

  return null;
};