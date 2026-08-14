import { ArrowRight, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCatalogIcon } from '../catalog/icons';
import { effectivePrice, priceLabel } from '../catalog/format';
import { useCart } from '../cart/CartContext';

export default function ServiceCatalogCard({ service }) {
  const Icon = getCatalogIcon(service.icon);
  const { addItem } = useCart();
  const canOrder = service.priceType === 'fixed' && effectivePrice(service) > 0;
  const features = (service.features || []).map(feature => typeof feature === 'string' ? feature : feature.name).filter(Boolean);
  return <article className="catalog-service-card">
    <div className="icon-box"><Icon strokeWidth={1.9} aria-hidden="true" /></div>
    {service.categoryTitle && <span className="package-category">{service.categoryTitle}</span>}
    <h3>{service.title}</h3>
    <p>{service.shortDescription}</p>
    <strong className="catalog-price">{priceLabel(service)}</strong>
    {canOrder && <><div className="package-facts package-facts--card">{service.pagesIncluded && <span><b>{service.pagesIncluded}</b> Pages</span>}{service.deliveryTime && <span><b>{service.deliveryTime}</b> Delivery</span>}{service.revisions && <span><b>{service.revisions}</b> Revisions</span>}</div>{features.length > 0 && <ul className="package-feature-list">{features.slice(0, 5).map(feature => <li key={feature}>{feature}</li>)}</ul>}</>}
    <div className="catalog-card-actions">{canOrder ? <><Link to={`/services/${service.slug}`} className="button button--secondary button--small">Customize</Link><button type="button" className="button button--small" onClick={() => addItem(service)}><ShoppingCart size={16} /> Add to Cart</button></> : <><Link to={`/services/${service.slug}`} className="text-link">View Details <ArrowRight size={16} /></Link><Link to={`/contact?service=${service.slug}`} className="catalog-quote-link">Request Quote</Link></>}</div>
  </article>;
}
