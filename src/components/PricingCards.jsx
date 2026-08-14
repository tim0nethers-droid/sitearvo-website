import { Check, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../catalog/CatalogContext';
import { effectivePrice, priceLabel } from '../catalog/format';
import { useCart } from '../cart/CartContext';

const fallbackPlans = [
  { slug: 'starter', title: 'Starter', shortDescription: 'Best for small businesses.', priceType: 'custom_quote', features: ['Up to 5 pages', 'Responsive design', 'Contact form', 'WhatsApp integration', 'Basic SEO', 'Social links'] },
  { slug: 'business', title: 'Business', shortDescription: 'For ambitious, growing brands.', priceType: 'custom_quote', isFeatured: true, features: ['Up to 10 pages', 'Premium UI', 'Responsive design', 'Advanced contact forms', 'SEO setup', 'Speed optimization'] },
  { slug: 'custom', title: 'Custom', shortDescription: 'For advanced requirements.', priceType: 'custom_quote', features: ['Custom functionality', 'React development', 'API integrations', 'E-commerce', 'Advanced UI/UX'] },
];

export default function PricingCards({ limit = 6, categoryId = '' }) {
  const { services, usingFallback } = useCatalog();
  const { addItem } = useCart();
  const configured = services.filter(service => (!categoryId || String(service.categoryId) === String(categoryId)) && service.isActive !== false && (service.priceType === 'fixed' || service.priceType === 'starting_from') && (service.isFeatured || service.basePrice !== null)).slice(0, limit);
  const plans = configured.length ? configured : fallbackPlans;
  return <div className="pricing-grid">{plans.map(plan => {
    const features = (plan.features || []).map(feature => typeof feature === 'string' ? feature : feature.name);
    const canOrder = configured.length > 0 && plan.priceType === 'fixed' && effectivePrice(plan) > 0;
    return <article key={plan.id || plan.slug} className={`pricing-card ${plan.isFeatured ? 'popular' : ''}`}>
      {plan.isFeatured && <span className="popular-label">Featured</span>}
      {plan.categoryTitle && <span className="package-category">{plan.categoryTitle}</span>}
      <h3>{plan.title}</h3><p>{plan.shortDescription}</p>
      <div className="price">{priceLabel(plan)}</div>
      {canOrder && <div className="package-facts package-facts--card">{plan.pagesIncluded && <span><b>{plan.pagesIncluded}</b> Pages</span>}{plan.deliveryTime && <span><b>{plan.deliveryTime}</b> Delivery</span>}{plan.revisions && <span><b>{plan.revisions}</b> Revisions</span>}</div>}
      <ul>{features.slice(0, 8).map(feature => <li key={feature}><Check size={17} />{feature}</li>)}</ul>
      <div className="pricing-card-actions">{canOrder ? <><Link to={`/services/${plan.slug}`} className="button button--secondary">Customize</Link><button type="button" className="button" onClick={() => addItem(plan)}><ShoppingCart size={17} /> Add to Cart</button></> : <Link to={configured.length ? `/services/${plan.slug}` : '/contact'} className={`button ${plan.isFeatured ? '' : 'button--secondary'}`}>{configured.length ? (plan.priceType === 'starting_from' ? 'Request Quote' : 'View Package') : 'Request Quote'}</Link>}</div>
    </article>;
  })}{usingFallback && <span className="sr-only">Live package pricing will appear after the catalog API is configured.</span>}</div>;
}
