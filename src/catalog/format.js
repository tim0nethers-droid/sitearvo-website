export const formatPrice = value => {
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) : '';
};

export function priceLabel(item) {
  if (!item) return '';
  if (item.priceType === 'custom_quote' || item.price_type === 'custom_quote') return 'Custom Quote';
  const sale = item.salePrice ?? item.sale_price;
  const base = item.basePrice ?? item.base_price;
  const price = sale !== '' && sale !== null && sale !== undefined ? sale : base;
  if (price === null || price === undefined || price === '') return 'Price to be configured';
  const prefix = (item.priceType || item.price_type) === 'starting_from' ? 'Starting from ' : '';
  return `${prefix}${formatPrice(price)}`;
}

export const effectivePrice = item => {
  const sale = item?.salePrice ?? item?.sale_price;
  const base = item?.basePrice ?? item?.base_price ?? item?.price;
  return Number(sale !== '' && sale !== null && sale !== undefined ? sale : (base ?? 0));
};
