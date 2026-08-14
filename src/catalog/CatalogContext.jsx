import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { serviceCategories as legacyCategories } from '../data/services';
import { apiFetch } from './api';

const CatalogContext = createContext(null);

const normalizeService = (service, category) => ({
  ...service,
  id: service.id || service.slug,
  name: service.name || service.title,
  title: service.title || service.name,
  categoryId: service.categoryId || service.category_id || category?.id,
  categoryTitle: service.categoryTitle || category?.title || category?.name,
  categorySlug: service.categorySlug || service.category_slug || category?.slug || category?.id,
  shortDescription: service.shortDescription || service.short_description || service.short || '',
  description: service.description || service.full_description || '',
  priceType: service.priceType || service.price_type || 'custom_quote',
  basePrice: (service.basePrice ?? service.base_price) === '' ? null : (service.basePrice ?? service.base_price ?? null),
  salePrice: (service.salePrice ?? service.sale_price) === '' ? null : (service.salePrice ?? service.sale_price ?? null),
  pagesIncluded: service.pagesIncluded ?? service.pages_included ?? null,
  deliveryTime: service.deliveryTime || service.delivery_time || '',
  ctaText: service.ctaText || service.cta_text || 'View Service',
  isFeatured: Boolean(service.isFeatured ?? service.is_featured),
  isActive: service.isActive === undefined && service.is_active === undefined ? true : Boolean(service.isActive ?? service.is_active),
  capabilities: service.capabilities || service.features?.map(feature => feature.name || feature) || [],
  features: service.features || (service.capabilities || []).map((name, index) => ({ id: `${service.slug}-${index}`, name, display_order: index + 1 })),
  addons: service.addons || [],
  seoTitle: service.seoTitle || service.seo_title || `${service.title || service.name} | SiteArvo`,
  seoDescription: service.seoDescription || service.seo_description || service.short_description || service.shortDescription || '',
});

const fallbackCategories = legacyCategories.map((category, categoryIndex) => ({
  ...category,
  name: category.title,
  slug: category.id,
  shortTitle: category.shortTitle,
  shortDescription: category.description,
  displayOrder: categoryIndex + 1,
  isActive: true,
  services: category.services.map(service => normalizeService(service, category)),
}));

const normalizeCategory = category => {
  const normalized = {
    ...category,
    title: category.title || category.name,
    shortTitle: category.shortTitle || category.short_title || category.name,
    shortDescription: category.shortDescription || category.short_description || '',
    description: category.description || category.long_description || category.short_description || '',
    isActive: category.isActive === undefined && category.is_active === undefined ? true : Boolean(category.isActive ?? category.is_active),
    isFeatured: Boolean(category.isFeatured ?? category.is_featured),
    displayOrder: category.displayOrder ?? category.display_order ?? 0,
  };
  normalized.services = (category.services || []).map(service => normalizeService(service, normalized));
  return normalized;
};

export function CatalogProvider({ children }) {
  const [categories, setCategories] = useState(fallbackCategories);
  const [settings, setSettings] = useState({ page_explanation: 'One unique website URL/page counts as one page, such as Home, About, Services or Contact.' });
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/catalog');
      if (!Array.isArray(data.categories)) throw new Error('The live catalog API is not available.');
      setCategories((data.categories || []).map(normalizeCategory));
      setSettings(data.settings || {});
      setUsingFallback(false);
      setError('');
    } catch (requestError) {
      setUsingFallback(true);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const services = useMemo(() => categories.flatMap(category => category.services || []), [categories]);
  const value = useMemo(() => ({ categories, services, settings, loading, usingFallback, error, refresh }), [categories, services, settings, loading, usingFallback, error, refresh]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside CatalogProvider.');
  return value;
}
