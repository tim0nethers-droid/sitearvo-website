import { ArrowRight, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackAnalyticsEvent } from './Analytics';
import { AppIcon, getCatalogIcon } from '../catalog/icons';
import { effectivePrice, hasValidPrice, priceLabel } from '../catalog/format';
import { useCart } from '../cart/CartContext';

export default function ServiceCatalogCard({ service }) {
  const Icon = getCatalogIcon(service.icon);
  const { addItem } = useCart();
  const canOrder = service.priceType === 'fixed' && hasValidPrice(service) && service.addToCartEnabled !== false && service.add_to_cart_enabled !== false;
  const regularPrice = Number(service.regularPrice ?? service.regular_price ?? null);
  const salePrice = effectivePrice(service);
  const hasDiscount = Number.isFinite(regularPrice) && regularPrice > salePrice;
  const customizeLabel = salePrice === 0 ? 'Customize Free Website' : 'Customize';
  const features = (service.features || []).map(feature => typeof feature === 'string' ? feature : feature.name).filter(Boolean);
  return <article className="catalog-service-card">
    <div className="icon-box"><AppIcon icon={Icon} size={20} /></div>
    {service.categoryTitle && <span className="package-category">{service.categoryTitle}</span>}
    <h3>{service.title}</h3>
    <p>{service.shortDescription}</p>
    <div className="catalog-price-wrap">
      {hasDiscount && <span className="catalog-price-old">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(regularPrice)}</span>}
      <strong className="catalog-price">{priceLabel(service)}</strong>
      {hasDiscount && <span className="catalog-price-save">Save {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(regularPrice - salePrice)}</span>}
      {salePrice === 0 && <span className="free-starter-badge">FREE STARTER</span>}
    </div>
    {canOrder && <><div className="package-facts package-facts--card">{service.pagesIncluded && <span><b>{service.pagesIncluded}</b> Pages</span>}{service.deliveryTime && <span><b>{service.deliveryTime}</b> Delivery</span>}{service.revisions && <span><b>{service.revisions}</b> Revisions</span>}</div>{features.length > 0 && <ul className="package-feature-list">{features.slice(0, 5).map(feature => <li key={feature}>{feature}</li>)}</ul>}</>}
    <div className="catalog-card-actions">{canOrder ? <><Link to={`/services/${service.slug}`} className="button button--secondary button--small">{customizeLabel}</Link><button type="button" className="button button--small" onClick={() => addItem(service)}><ShoppingCart size={16} /> Add to Cart</button></> : <><Link to={`/services/${service.slug}`} className="text-link">View Details <ArrowRight size={16} /></Link><Link to={`/contact?service=${service.slug}`} className="catalog-quote-link" onClick={() => trackAnalyticsEvent('quote_requested', { service_id: service.id, service_slug: service.slug, service_name: service.title })}>Request Quote</Link></>}</div>
  </article>;
}
