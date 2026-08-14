import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useCatalog } from '../catalog/CatalogContext';
import { effectivePrice } from '../catalog/format';

const CartContext = createContext(null);
const storageKey = 'sitearvo-service-cart-v2';
const legacyStorageKey = 'sitearvo-service-cart-v1';

const readStoredCart = () => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) return JSON.parse(stored);

    const legacy = sessionStorage.getItem(legacyStorageKey);
    if (legacy) {
      const migrated = JSON.parse(legacy);
      localStorage.setItem(storageKey, JSON.stringify(migrated));
      sessionStorage.removeItem(legacyStorageKey);
      return migrated;
    }
  } catch {
    return [];
  }
  return [];
};

export function CartProvider({ children }) {
  const { services, loading: catalogLoading, usingFallback } = useCatalog();
  const [items, setItems] = useState(readStoredCart);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* Storage can be unavailable in privacy mode. */ }
  }, [items]);

  // Stored data represents selections only. Once the API is ready, refresh every
  // package and add-on snapshot so browser storage never becomes the price authority.
  useEffect(() => {
    if (catalogLoading || usingFallback || !services.length) return;
    setItems(current => {
      const refreshed = current.map(item => {
        const liveService = services.find(service => String(service.id) === String(item.serviceId) || service.slug === item.slug);
        if (!liveService) return item;
        const addons = (item.addons || []).map(selection => {
          const liveAddon = (liveService.addons || []).find(addon => String(addon.id) === String(selection.addon?.id));
          return liveAddon ? { addon: liveAddon, quantity: Math.max(1, Number(selection.quantity) || 1) } : null;
        }).filter(Boolean);
        return { ...item, serviceId: liveService.id, slug: liveService.slug, service: liveService, quantity: Math.max(1, Number(item.quantity) || 1), addons };
      });
      return JSON.stringify(refreshed) === JSON.stringify(current) ? current : refreshed;
    });
  }, [catalogLoading, services, usingFallback]);

  const addItem = (service, selectedAddons = [], quantity = 1) => {
    if (!service || service.priceType !== 'fixed' || effectivePrice(service) <= 0) return false;
    setItems(current => {
      const nextItem = {
        serviceId: service.id,
        slug: service.slug,
        service,
        quantity: Math.max(1, Number(quantity) || 1),
        addons: selectedAddons,
      };
      if (!current.length || current.some(item => String(item.serviceId) === String(service.id))) return [nextItem];
      if (!window.confirm('Replace your current primary service package?')) return current;
      return [nextItem];
    });
    return true;
  };

  const removeItem = serviceId => setItems(current => current.filter(item => String(item.serviceId) !== String(serviceId)));
  const updateQuantity = (serviceId, quantity) => setItems(current => current.map(item => String(item.serviceId) === String(serviceId) ? { ...item, quantity: Math.max(1, Number(quantity) || 1) } : item));
  const updateAddons = (serviceId, addons) => setItems(current => current.map(item => String(item.serviceId) === String(serviceId) ? { ...item, addons } : item));
  const clearCart = () => setItems([]);

  const totals = useMemo(() => items.reduce((result, item) => {
    const packageQuantity = Math.max(1, Number(item.quantity) || 1);
    result.subtotal += effectivePrice(item.service) * packageQuantity;
    result.addonsTotal += (item.addons || []).reduce((sum, selection) => sum + effectivePrice(selection.addon) * Math.max(1, Number(selection.quantity) || 1), 0);
    return result;
  }, { subtotal: 0, addonsTotal: 0 }), [items]);
  const grandTotal = totals.subtotal + totals.addonsTotal;
  const cartCount = items.reduce((count, item) => count + Math.max(1, Number(item.quantity) || 1), 0);

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    cartCount,
    subtotal: totals.subtotal,
    addonsTotal: totals.addonsTotal,
    grandTotal,
    // Backward-compatible names used by the existing checkout and detail pages.
    addService: addItem,
    removeService: removeItem,
    updateAddons,
    clear: clearCart,
    total: grandTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider.');
  return value;
};
