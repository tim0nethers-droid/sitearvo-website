import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, ShoppingCart, X } from 'lucide-react';
import { useCatalog } from '../catalog/CatalogContext';
import { effectivePrice, formatPrice, hasValidPrice, priceLabel } from '../catalog/format';
import { getCatalogIcon } from '../catalog/icons';
import { useCart } from '../cart/CartContext';
import { starterCatalogProducts } from '../data/starterCatalog';
import { serviceCategories as legacyCategories } from '../data/services';
import WebsiteConfigurator from './WebsiteConfigurator';
import ProjectMockup from './ProjectMockup';
import SectionTitle from './SectionTitle';

const fallbackCategoryTitles = new Map(legacyCategories.map(category => [String(category.id), category.title]));

const previewByCategory = {
  'web-development': { visual: 'dashboard', tone: 'amber' },
  'mobile-app-development': { visual: 'delivery', tone: 'blue', device: 'mobile' },
  'cms-ecommerce-development': { visual: 'commerce', tone: 'violet' },
  'desktop-application-development': { visual: 'admin', tone: 'teal' },
  'digital-marketing': { visual: 'portfolio', tone: 'mint' },
  'industry-solutions': { visual: 'property', tone: 'rose' },
  'specialized-development': { visual: 'agency', tone: 'orange' },
};

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = event => setMatches(event.matches);
    if (typeof media.addEventListener === 'function') media.addEventListener('change', listener);
    else media.addListener(listener);
    setMatches(media.matches);
    return () => {
      if (typeof media.removeEventListener === 'function') media.removeEventListener('change', listener);
      else media.removeListener(listener);
    };
  }, [query]);
  return matches;
}

function normalizeProduct(product, categoriesBySlug) {
  const categorySlug = String(product.categorySlug || product.category_slug || '').toLowerCase();
  const category = categoriesBySlug.get(categorySlug);
  const features = Array.isArray(product.features) ? product.features : Array.isArray(product.capabilities) ? product.capabilities : [];
  return {
    ...product,
    id: product.id || product.slug,
    slug: product.slug,
    title: product.title || product.name || '',
    name: product.name || product.title || '',
    categorySlug: product.categorySlug || product.category_slug || categorySlug,
    categoryTitle: product.categoryTitle || category?.title || fallbackCategoryTitles.get(product.category_slug) || fallbackCategoryTitles.get(product.categorySlug) || '',
    shortDescription: product.shortDescription || product.short_description || product.short || '',
    description: product.description || '',
    priceType: product.priceType || product.price_type || 'custom_quote',
    basePrice: product.basePrice ?? product.base_price ?? null,
    salePrice: product.salePrice ?? product.sale_price ?? null,
    billingType: product.billingType || product.billing_type || 'one-time',
    pagesIncluded: product.pagesIncluded ?? product.pages_included ?? null,
    deliveryTime: product.deliveryTime || product.delivery_time || '',
    revisions: product.revisions || '',
    isFeatured: Boolean(product.isFeatured ?? product.is_featured),
    isActive: product.isActive === undefined && product.is_active === undefined ? true : Boolean(product.isActive ?? product.is_active),
    addToCartEnabled: product.addToCartEnabled ?? product.add_to_cart_enabled ?? null,
    displayOrder: Number(product.displayOrder ?? product.display_order ?? 0) || 0,
    serviceType: product.serviceType || product.service_type || 'package',
    image: product.image || '',
    features,
    capabilities: Array.isArray(product.capabilities) ? product.capabilities : features.map(entry => (typeof entry === 'string' ? entry : entry?.name)).filter(Boolean),
  };
}

function previewConfig(product) {
  const category = previewByCategory[product.categorySlug] || previewByCategory['specialized-development'];
  return {
    slug: product.slug,
    title: product.title,
    code: product.pagesIncluded ? `${product.pagesIncluded}P` : String(product.categoryTitle || 'SA').slice(0, 2).toUpperCase(),
    industry: product.categoryTitle || 'SiteArvo',
    tone: category.tone,
    visual: category.visual,
    device: category.device || 'desktop',
  };
}

function ProductCard({ product, onCustomize, onQuickAdd, onRequestQuote }) {
  const hasConfiguredPrice = product.priceType !== 'custom_quote' && hasValidPrice(product);
  const canQuickAdd = product.priceType === 'fixed' && hasConfiguredPrice && product.addToCartEnabled !== false;
  const isDemoPrice = Boolean(product.isDemoPrice || product.is_demo_price);
  const displayPrice = product.priceType === 'fixed' && !hasConfiguredPrice ? 'Price Not Set' : priceLabel(product);
  const regularPrice = Number(product.regularPrice ?? product.regular_price ?? null);
  const salePrice = Number(effectivePrice(product));
  const hasDiscount = Number.isFinite(regularPrice) && regularPrice > salePrice;
  const customizeLabel = salePrice === 0 ? 'Customize Free Website' : 'Customize';
  const features = (product.features || []).map(entry => (typeof entry === 'string' ? entry : entry?.name)).filter(Boolean).slice(0, 3);
  const preview = previewConfig(product);
  const Icon = getCatalogIcon(product.icon);

  return (
    <article className="marketplace-card">
      <div className="marketplace-card__preview">
        {product.image ? (
          <img src={product.image} alt={product.title} loading="lazy" />
        ) : (
          <ProjectMockup project={preview} device={preview.device} />
        )}
        <span className="marketplace-card__preview-badge"><Icon size={14} /> {product.categoryTitle || 'SiteArvo'}</span>
      </div>
      <div className="marketplace-card__body">
        <div className="marketplace-card__topline">
          <span className="marketplace-card__category">{product.categoryTitle || 'Package'}</span>
          <span className={`marketplace-card__price-type ${product.priceType}`}>{displayPrice}</span>
        </div>
        {isDemoPrice && <span className="marketplace-card__demo-note">Development Demo Price</span>}
        {salePrice === 0 && <span className="free-starter-badge">FREE STARTER</span>}
        {hasDiscount && (
          <div className="marketplace-card__price-comparison">
            <del>{formatPrice(regularPrice)}</del>
            <strong>{priceLabel(product)}</strong>
            <small>Save {formatPrice(regularPrice - salePrice)}</small>
          </div>
        )}
        <h3>{product.title}</h3>
        <p>{product.shortDescription}</p>
        <div className="marketplace-card__facts">
          {product.pagesIncluded ? <span>{product.pagesIncluded} Pages</span> : null}
          {product.deliveryTime ? <span>{product.deliveryTime}</span> : null}
          {product.billingType && product.billingType !== 'one-time' ? <span>{product.billingType === 'monthly' ? 'Monthly Billing' : 'Yearly Billing'}</span> : null}
          {product.priceType === 'fixed' && hasConfiguredPrice ? <span>Fixed Price</span> : null}
        </div>
        {!!features.length && (
          <div className="marketplace-card__feature-tags">{features.map(feature => <span key={feature}>{feature}</span>)}</div>
        )}
        <div className="marketplace-card__actions">
          {canQuickAdd ? (
            <>
              <button type="button" className="button button--secondary" onClick={() => onCustomize(product)}>{customizeLabel}</button>
              <button type="button" className="button" onClick={() => onQuickAdd(product)}><ShoppingCart size={16} /> Add to Cart</button>
            </>
          ) : (
            <>
              <button type="button" className="button button--secondary" onClick={() => onCustomize(product)}>View Details</button>
              <Link to={`/contact?service=${product.slug}`} className="button" onClick={onRequestQuote}>Request Quote</Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function HomeMarketplace() {
  const { categories, services } = useCatalog();
  const { addItem } = useCart();
  const isMobile = useMediaQuery('(max-width: 820px)');
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const categoriesBySlug = useMemo(() => new Map((categories || []).map(category => [String(category.slug || category.id).toLowerCase(), category])), [categories]);

  const products = useMemo(() => {
    const liveProducts = (services || [])
      .filter(product => String(product.serviceType || product.service_type || '').toLowerCase() === 'package')
      .map(product => normalizeProduct(product, categoriesBySlug));
    const source = liveProducts.length ? liveProducts : starterCatalogProducts.map(product => normalizeProduct(product, categoriesBySlug));
    return source
      .filter(product => product.isActive !== false)
      .sort((a, b) => {
        const aFixed = a.priceType === 'fixed' && hasValidPrice(a);
        const bFixed = b.priceType === 'fixed' && hasValidPrice(b);
        if (aFixed !== bFixed) return Number(bFixed) - Number(aFixed);
        const aPrice = Number(effectivePrice(a));
        const bPrice = Number(effectivePrice(b));
        if (aPrice !== bPrice) return aPrice - bPrice;
        if (b.isFeatured !== a.isFeatured) return Number(b.isFeatured) - Number(a.isFeatured);
        return a.displayOrder - b.displayOrder || String(a.title).localeCompare(String(b.title));
      });
  }, [categoriesBySlug, services]);

  const availableCategories = useMemo(() => {
    const counts = new Map();
    for (const product of products) {
      const key = String(product.categorySlug || '').toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const categoryList = (categories || [])
      .map(category => ({
        id: String(category.slug || category.id).toLowerCase(),
        title: category.shortTitle || category.title,
        count: counts.get(String(category.slug || category.id).toLowerCase()) || 0,
      }))
      .filter(category => category.count > 0);
    return [{ id: 'all', title: 'All', count: products.length }, ...categoryList];
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter(product => {
      const matchesCategory = activeCategory === 'all' || String(product.categorySlug || '').toLowerCase() === activeCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      const searchable = [
        product.title,
        product.shortDescription,
        product.categoryTitle,
        product.description,
        ...(product.capabilities || []),
        ...(product.features || []).map(entry => (typeof entry === 'string' ? entry : entry?.name)).filter(Boolean),
      ].join(' ').toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [activeCategory, products, query]);

  const visibleProducts = useMemo(() => {
    if (showAll) return filteredProducts;
    const featured = filteredProducts.filter(product => product.isFeatured);
    return (featured.length ? featured : filteredProducts).slice(0, 8);
  }, [filteredProducts, showAll]);

  useEffect(() => {
    setShowAll(false);
  }, [activeCategory, query]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 5400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const openConfigurator = product => {
    setSelectedPackage(product);
    setDrawerOpen(true);
  };

  const closeConfigurator = () => {
    setDrawerOpen(false);
    window.setTimeout(() => setSelectedPackage(null), 200);
  };

  const handleQuickAdd = product => {
    if (product.priceType !== 'fixed' || !hasValidPrice(product) || product.addToCartEnabled === false) return;
    addItem(product);
    setToast({
      title: product.title,
      price: priceLabel(product),
      message: 'Added to Cart',
      link: '/cart',
    });
  };

  const handleConfiguratorAdded = snapshot => {
    const summary = snapshot.summary;
    const price = summary.requiresQuote ? 'Contact for Price' : `${formatPrice(summary.oneTimeTotal)}${summary.recurringTotal ? ` + ${formatPrice(summary.recurringTotal)} recurring` : ''}`;
    setDrawerOpen(false);
    setToast({
      title: summary.configurationTitle || selectedPackage?.title || 'Customized Website',
      price,
      message: 'Added to Cart',
      link: '/cart',
      checkoutLink: '/checkout',
    });
  };

  return (
    <section className="section section--alt marketplace-section">
      <div className="container">
        <SectionTitle eyebrow="Our Packages" title="Choose the solution that fits your business." description="Browse live packages from the database-backed catalog, filter by category and open the configurator without leaving the homepage." />

        <div className="marketplace-toolbar">
          <div className="marketplace-search">
            <Search size={18} aria-hidden="true" />
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search services, packages or technology..." aria-label="Search services and packages" />
          </div>
          <div className="marketplace-toolbar__meta">
            <span>{filteredProducts.length} result{filteredProducts.length === 1 ? '' : 's'}</span>
            <button type="button" className="text-link" onClick={() => { setShowAll(false); setQuery(''); setActiveCategory('all'); }}>Reset Filters</button>
          </div>
        </div>

        <div className="marketplace-tabs" role="tablist" aria-label="Filter SiteArvo packages by category">
          {availableCategories.map(category => (
            <button key={category.id} type="button" className={activeCategory === category.id ? 'is-active' : ''} aria-pressed={activeCategory === category.id} onClick={() => setActiveCategory(category.id)}>
              {category.title}
              <span>{category.count}</span>
            </button>
          ))}
        </div>

        {!products.length && <div className="builder-loading">Loading the latest packages...</div>}
        {!!products.length && filteredProducts.length === 0 && (
          <div className="portfolio-empty">
            <h2>No products match your search.</h2>
            <p>Try another category or search term, or browse the full catalog again.</p>
            <button type="button" className="button button--secondary" onClick={() => { setActiveCategory('all'); setQuery(''); setShowAll(false); }}>Reset Filters</button>
          </div>
        )}
        {!!products.length && filteredProducts.length > 0 && (
          <>
            <div className="marketplace-grid">
              {visibleProducts.map(product => <ProductCard key={product.slug} product={product} onCustomize={openConfigurator} onQuickAdd={handleQuickAdd} onRequestQuote={() => setToast(null)} />)}
            </div>
            {!showAll && filteredProducts.length > visibleProducts.length && (
              <div className="marketplace-more">
                <button type="button" className="button button--secondary" onClick={() => setShowAll(true)}>View All Products <ArrowRight size={18} /></button>
              </div>
            )}
          </>
        )}
      </div>

      {drawerOpen && selectedPackage && (
        <div className="marketplace-drawer" role="dialog" aria-modal="true" aria-label={`Customize ${selectedPackage.title}`}>
          <button type="button" className="marketplace-drawer__backdrop" aria-label="Close configurator" onClick={closeConfigurator} />
          <div className={`marketplace-drawer__panel ${isMobile ? 'is-mobile' : ''}`}>
            <div className="marketplace-drawer__header">
              <div>
                <span className="eyebrow">Customize Your Website</span>
                <h2>{selectedPackage.title}</h2>
                <p>{priceLabel(selectedPackage)} — Configure your website and see the total instantly.</p>
              </div>
              <button type="button" className="marketplace-drawer__close" onClick={closeConfigurator} aria-label="Close configurator"><X size={18} /></button>
            </div>
            <div className="marketplace-drawer__body">
              <WebsiteConfigurator
                className="marketplace-drawer__configurator"
                presetPackage={selectedPackage}
                compact={isMobile}
                autoNavigateToCart={false}
                onAddedToCart={handleConfiguratorAdded}
                onEditComplete={closeConfigurator}
              />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="marketplace-toast" role="status" aria-live="polite">
          <div>
            <span>{toast.message}</span>
            <b>{toast.title}</b>
            <small>{toast.price}</small>
          </div>
          <div className="marketplace-toast__actions">
            <Link className="button button--secondary" to={toast.link}>{toast.link === '/cart' ? 'View Cart' : 'Continue'}</Link>
            {toast.checkoutLink && <Link className="button" to={toast.checkoutLink}>Checkout</Link>}
          </div>
        </div>
      )}
    </section>
  );
}
